import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.source import LogSource
from app.database.session import SessionLocal

client = TestClient(app)


@pytest.fixture
def test_source():
    with TestClient(app) as client:
        db = SessionLocal()
        source = LogSource(
            name="Test Auth Service",
            source_type="REST_API",
            service_name="test-auth-svc",
            status="active",
            ingestion_enabled=True,
        )
        db.add(source)
        db.commit()
        db.refresh(source)
        source_id = source.id
        db.close()
        yield source_id, client
        # Cleanup
        db = SessionLocal()
        db.query(LogSource).filter(LogSource.id == source_id).delete()
        db.commit()
        db.close()


def test_token_lifecycle_create_and_verify(test_source):
    source_id, client = test_source
    # 1. Create Token
    resp = client.post(
        f"/api/v1/log-sources/{source_id}/tokens",
        json={"name": "Primary Ingest Token", "expires_in_days": 30},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "token" in data
    raw_token = data["token"]
    assert raw_token.startswith("lp_live_")
    assert data["token_prefix"] == raw_token[:12]
    token_id = data["id"]

    # 2. List tokens (safe metadata: plaintext token and token_hash must NOT be present)
    list_resp = client.get(f"/api/v1/log-sources/{source_id}/tokens")
    assert list_resp.status_code == 200
    tokens = list_resp.json()
    assert len(tokens) >= 1
    found = next(t for t in tokens if t["id"] == token_id)
    assert found["name"] == "Primary Ingest Token"
    assert "token" not in found
    assert "token_hash" not in found
    assert found["is_active"] is True

    # 3. Ingest with valid token
    ingest_resp = client.post(
        "/api/v1/ingest/logs",
        headers={"Authorization": f"Bearer {raw_token}"},
        json={
            "event_id": "test-evt-01",
            "severity": "INFO",
            "service": "test-auth-svc",
            "message": "User login succeeded",
        },
    )
    assert ingest_resp.status_code == 202
    assert ingest_resp.json()["status"] == "ACCEPTED"

    # 4. Ingest with invalid token
    bad_resp = client.post(
        "/api/v1/ingest/logs",
        headers={"Authorization": "Bearer lp_live_invalidtoken1234567890abcdef"},
        json={"severity": "INFO", "message": "Test"},
    )
    assert bad_resp.status_code == 401

    # 5. Rotate token
    rotate_resp = client.post(f"/api/v1/log-sources/{source_id}/tokens/{token_id}/rotate")
    assert rotate_resp.status_code == 200
    rotated_data = rotate_resp.json()
    new_raw_token = rotated_data["token"]
    assert new_raw_token != raw_token

    # Old token should now fail
    old_use_resp = client.post(
        "/api/v1/ingest/logs",
        headers={"Authorization": f"Bearer {raw_token}"},
        json={"severity": "INFO", "message": "Test with revoked token"},
    )
    assert old_use_resp.status_code == 401

    # New token should succeed
    new_use_resp = client.post(
        "/api/v1/ingest/logs",
        headers={"Authorization": f"Bearer {new_raw_token}"},
        json={"severity": "INFO", "message": "Test with rotated token"},
    )
    assert new_use_resp.status_code == 202

    # 6. Revoke token
    new_token_id = rotated_data["id"]
    revoke_resp = client.post(f"/api/v1/log-sources/{source_id}/tokens/{new_token_id}/revoke")
    assert revoke_resp.status_code == 200
    assert revoke_resp.json()["is_active"] is False

    revoked_use = client.post(
        "/api/v1/ingest/logs",
        headers={"Authorization": f"Bearer {new_raw_token}"},
        json={"severity": "INFO", "message": "Should fail after revocation"},
    )
    assert revoked_use.status_code == 401


def test_disabled_source_rejects_ingestion(test_source):
    source_id, client = test_source
    # Create token
    resp = client.post(
        f"/api/v1/log-sources/{source_id}/tokens",
        json={"name": "Temp Token"},
    )
    raw_token = resp.json()["token"]

    # Disable ingestion
    patch_resp = client.patch(
        f"/api/v1/log-sources/{source_id}/ingestion-status?enabled=false"
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["ingestion_enabled"] is False

    # Ingestion should return 403 Forbidden
    ingest_resp = client.post(
        "/api/v1/ingest/logs",
        headers={"Authorization": f"Bearer {raw_token}"},
        json={"severity": "INFO", "message": "Ingest while disabled"},
    )
    assert ingest_resp.status_code == 403
