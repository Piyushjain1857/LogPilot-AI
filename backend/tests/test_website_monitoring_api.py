import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import SessionLocal, init_db
from app.models.website import MonitoredWebsite, WebsiteCheckResult, WebsiteSDKEvent

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    init_db()
    yield


def test_create_website_and_ssrf_safety():
    # 1. Test SSRF block on cloud metadata IP
    bad_res = client.post(
        "/api/v1/websites",
        json={
            "name": "Cloud Metadata Exploit",
            "url": "http://169.254.169.254/latest/meta-data/",
            "interval_seconds": 30,
        },
    )
    assert bad_res.status_code == 400
    assert "SSRF" in bad_res.json()["detail"] or "Invalid" in bad_res.json()["detail"]

    # 2. Test valid website creation
    res = client.post(
        "/api/v1/websites",
        json={
            "name": "Test Storefront API",
            "url": "http://127.0.0.1:8000/api/v1/health",
            "interval_seconds": 30,
            "check_ssl": False,
            "check_dns": True,
            "expected_status_code": 200,
            "timeout_seconds": 5.0,
            "github_repo": "acme/storefront",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Test Storefront API"
    assert data["ingestion_key"].startswith("lp_live_")
    assert data["status"] == "active"
    site_id = data["id"]

    # 3. List websites
    list_res = client.get("/api/v1/websites")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total_count"] >= 1
    assert any(s["id"] == site_id for s in list_data["websites"])

    # 4. Get website detail
    detail_res = client.get(f"/api/v1/websites/{site_id}")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["id"] == site_id

    # 5. Pause & Resume
    pause_res = client.post(f"/api/v1/websites/{site_id}/pause")
    assert pause_res.status_code == 200
    assert pause_res.json()["status"] == "paused"

    resume_res = client.post(f"/api/v1/websites/{site_id}/resume")
    assert resume_res.status_code == 200
    assert resume_res.json()["status"] == "active"

    # 6. Manual Check Trigger
    check_res = client.post(f"/api/v1/websites/{site_id}/check")
    assert check_res.status_code == 200
    check_data = check_res.json()
    assert check_data["website_id"] == site_id
    assert check_data["status"] in ("up", "degraded", "down")


def test_sdk_telemetry_ingestion_and_sanitization():
    # Create website first
    create_res = client.post(
        "/api/v1/websites",
        json={
            "name": "Telemetry App",
            "url": "http://127.0.0.1:8000/api/v1/health",
            "interval_seconds": 60,
        },
    )
    assert create_res.status_code == 201
    site = create_res.json()
    key = site["ingestion_key"]
    site_id = site["id"]

    # Ingest batch of telemetry events with sensitive credentials
    ingest_res = client.post(
        "/api/v1/websites/ingest",
        headers={"X-LogPilot-Key": key},
        json={
            "events": [
                {
                    "event_type": "error",
                    "severity": "CRITICAL",
                    "message": "DatabaseConnectionError: pool exhausted (max=100)",
                    "source_file": "src/db/connectionPool.js",
                    "line_number": 88,
                    "stack_trace": "Error: DatabaseConnectionError\n    at Pool.connect (src/db/connectionPool.js:88)",
                    "metadata": {
                        "user_id": "usr_9421",
                        "password": "SuperSecretPassword123!",
                        "api_key": "sk_live_999888777",
                        "authorization": "Bearer eyJhbGciOi...",
                    },
                },
                {
                    "event_type": "api_failure",
                    "severity": "ERROR",
                    "message": "Failed to fetch /api/v1/orders: HTTP 500",
                    "url": "https://store.example.com/checkout",
                    "metadata": {
                        "status": 500,
                        "session_token": "token_abc_xyz",
                    },
                },
            ],
        },
    )
    assert ingest_res.status_code == 200
    assert ingest_res.json()["ingested_count"] == 2

    # Verify sensitive data was redacted in database
    db = SessionLocal()
    try:
        events = db.query(WebsiteSDKEvent).filter(WebsiteSDKEvent.website_id == site_id).all()
        assert len(events) >= 2
        top = [e for e in events if "pool exhausted" in e.message][0]
        meta = top.metadata_json
        assert "SuperSecretPassword123!" not in meta
        assert "sk_live_999888777" not in meta
        assert "[REDACTED]" in meta
    finally:
        db.close()

    # Test AI Troubleshooting synthesis
    ai_res = client.post(f"/api/v1/websites/{site_id}/ai-troubleshoot")
    assert ai_res.status_code == 200
    ai_data = ai_res.json()
    assert ai_data["website_id"] == site_id
    assert ai_data["severity"] in ("CRITICAL", "ERROR", "WARNING", "INFO")
    assert len(ai_data["supporting_evidence"]) >= 1
    assert "suggested_solution" in ai_data
    assert "suggested_code_patch" in ai_data

    # Test GitHub code patch generation
    patch_res = client.post(f"/api/v1/websites/{site_id}/github/patch")
    assert patch_res.status_code == 200
    patch_data = patch_res.json()
    assert "diff --git" in patch_data["diff"]
    assert patch_data["is_review_only"] is True

    # Delete website
    del_res = client.delete(f"/api/v1/websites/{site_id}")
    assert del_res.status_code == 204
