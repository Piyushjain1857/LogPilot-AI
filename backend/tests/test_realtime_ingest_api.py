import time
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.source import LogSource
from app.models.log import LogEntry
from app.database.session import SessionLocal

client = TestClient(app)


@pytest.fixture
def ingest_fixture():
    with TestClient(app) as client:
        db = SessionLocal()
        source = LogSource(
            name="Payment Cluster",
            source_type="REST_API",
            service_name="payment-service",
            status="active",
            ingestion_enabled=True,
        )
        db.add(source)
        db.commit()
        db.refresh(source)
        source_id = source.id
        db.close()

        # Create token
        resp = client.post(f"/api/v1/log-sources/{source_id}/tokens", json={"name": "Test Token"})
        token = resp.json()["token"]

        yield source_id, token, client

        # Cleanup
        db = SessionLocal()
        db.query(LogEntry).filter(LogEntry.source_id == source_id).delete()
        db.query(LogSource).filter(LogSource.id == source_id).delete()
        db.commit()
        db.close()


def test_single_log_ingestion_and_idempotency(ingest_fixture):
    source_id, token, client = ingest_fixture

    event_id = f"evt-uniq-{int(time.time() * 1000)}"

    # 1. Send single record with event_id
    payload = {
        "event_id": event_id,
        "timestamp": "2026-11-25T10:00:00Z",
        "severity": "ERROR",
        "service": "payment-service",
        "message": "Bearer eyJhbGciOiJIUzI1NiJ9.test secret token with password=SecretPassword123",
        "trace_id": "tr-pay-01",
        "metadata": {"duration_ms": 450, "api_key": "secret-key-abc"},
    }

    resp = client.post(
        "/api/v1/ingest/logs",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )
    assert resp.status_code == 202
    data = resp.json()
    assert data["status"] == "ACCEPTED"
    assert data["source_id"] == source_id

    # Wait for background worker to persist by polling stream status
    entry = None
    for _ in range(20):
        client.get("/api/v1/stream/status")
        time.sleep(0.1)
        db = SessionLocal()
        entry = db.query(LogEntry).filter(
            LogEntry.source_id == source_id,
            LogEntry.external_event_id == event_id,
        ).first()
        db.close()
        if entry:
            break

    assert entry is not None
    assert entry.severity == "ERROR"
    # Check sensitive data was redacted
    assert "[REDACTED_PASSWORD]" in entry.message or "[REDACTED" in entry.message
    assert "SecretPassword123" not in entry.message
    assert entry.template_id is not None

    # 2. Retry the EXACT same event_id (idempotency check)
    resp2 = client.post(
        "/api/v1/ingest/logs",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )
    assert resp2.status_code == 202

    client.get("/api/v1/stream/status")
    time.sleep(0.3)

    # Ensure duplicate record was NOT created in DB
    db = SessionLocal()
    count = db.query(LogEntry).filter(
        LogEntry.source_id == source_id,
        LogEntry.external_event_id == event_id,
    ).count()
    assert count == 1
    db.close()


def test_batch_ingestion_api(ingest_fixture):
    source_id, token, client = ingest_fixture

    batch_payload = {
        "batch_id": "batch-101",
        "logs": [
            {
                "event_id": f"batch-evt-1-{time.time()}",
                "severity": "INFO",
                "service": "payment-service",
                "message": "Authorization successful",
                "trace_id": "tr-batch-1",
            },
            {
                "event_id": f"batch-evt-2-{time.time()}",
                "severity": "WARNING",
                "service": "payment-service",
                "message": "Payment gateway latency elevated (1200ms)",
                "trace_id": "tr-batch-1",
            },
            {
                "event_id": f"batch-evt-3-{time.time()}",
                "severity": "ERROR",
                "service": "payment-service",
                "message": "Database query timeout after 5000ms",
                "trace_id": "tr-batch-2",
            },
        ],
    }

    resp = client.post(
        "/api/v1/ingest/batch",
        headers={"Authorization": f"Bearer {token}"},
        json=batch_payload,
    )
    assert resp.status_code == 202
    data = resp.json()
    assert data["total_records"] == 3
    assert data["accepted_records"] == 3
    assert data["rejected_records"] == 0
    batch_record_id = data["batch_id"]

    # Verify batch status endpoint
    b_data = None
    for _ in range(15):
        time.sleep(0.2)
        status_resp = client.get(f"/api/v1/ingest/batches/{batch_record_id}")
        assert status_resp.status_code == 200
        b_data = status_resp.json()
        if b_data.get("status") in {"COMPLETED", "PARTIALLY_COMPLETED"}:
            break

    assert b_data is not None
    assert b_data["id"] == batch_record_id
    assert b_data["total_records"] == 3
