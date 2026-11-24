import pytest
from fastapi.testclient import TestClient
from app.models.log import LogEntry
from app.models.source import LogSource
from app.models.incident import Incident
from datetime import datetime, timezone


def test_service_matrix_endpoint(client: TestClient, db_session):
    """Test retrieving real-time microservice health matrix."""
    # Seed LogSource
    source = LogSource(
        id="test-src-1",
        name="Order Service Cluster",
        source_type="CONTAINER",
        service_name="order-service",
    )
    db_session.add(source)
    db_session.flush()

    # Seed a log entry for order-service
    log = LogEntry(
        source_id="test-src-1",
        service_name="order-service",
        severity="ERROR",
        message="Order processing failed due to database timeout",
        raw_message="Order processing failed due to database timeout",
        timestamp=datetime.now(timezone.utc),
    )
    db_session.add(log)
    db_session.commit()

    res = client.get("/api/v1/overview/service-matrix")
    assert res.status_code == 200
    data = res.json()
    assert "services" in data
    assert len(data["services"]) >= 7

    order_svc = next((s for s in data["services"] if s["service_name"] == "order-service"), None)
    assert order_svc is not None
    assert order_svc["log_count"] >= 1
    assert order_svc["error_count"] >= 1
    assert order_svc["health"] in ("DEGRADED", "CRITICAL")


def test_command_center_telemetry_endpoint(client: TestClient):
    """Test retrieving consolidated AIOps command center telemetry."""
    res = client.get("/api/v1/overview/command-center")
    assert res.status_code == 200
    data = res.json()
    assert "system_health_index" in data
    assert 0 <= data["system_health_index"] <= 100
    assert data["system_status"] in ("HEALTHY", "DEGRADED", "CRITICAL")
    assert "events_per_second" in data
    assert "errors_per_minute" in data


def test_notifications_lifecycle(client: TestClient):
    """Test notification retrieval, read toggle, and clear all."""
    res = client.get("/api/v1/notifications")
    assert res.status_code == 200
    notifs = res.json()
    assert len(notifs) >= 1

    first_id = notifs[0]["id"]

    # Mark as read
    res_read = client.post(f"/api/v1/notifications/{first_id}/read")
    assert res_read.status_code == 200
    assert res_read.json()["is_read"] is True

    # Clear all
    res_clear = client.post("/api/v1/notifications/clear")
    assert res_clear.status_code == 200
    assert res_clear.json()["status"] == "success"

    # Query unread only
    res_unread = client.get("/api/v1/notifications?unread_only=true")
    assert res_unread.status_code == 200
    assert len(res_unread.json()) == 0
