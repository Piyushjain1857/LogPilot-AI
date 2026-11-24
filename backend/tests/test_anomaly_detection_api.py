import pytest
import datetime
import json
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.log import LogEntry
from app.models.source import LogSource
from app.models.anomaly import Anomaly, ServiceBaseline


def test_anomaly_configuration_endpoints(client: TestClient):
    """Test reading and updating detection configuration thresholds."""
    # 1. Read default config
    resp = client.get("/api/v1/anomalies/configuration")
    assert resp.status_code == 200
    data = resp.json()
    assert "z_score_threshold" in data
    assert data["z_score_threshold"] == 3.0
    assert "MAD" in data["enabled_algorithms"]

    # 2. Update threshold
    patch_resp = client.patch(
        "/api/v1/anomalies/configuration",
        json={"z_score_threshold": 2.5, "mad_threshold": 3.0},
    )
    assert patch_resp.status_code == 200
    patched = patch_resp.json()
    assert patched["z_score_threshold"] == 2.5
    assert patched["mad_threshold"] == 3.0

    # 3. Read again to ensure persistence
    get_resp = client.get("/api/v1/anomalies/configuration")
    assert get_resp.status_code == 200
    assert get_resp.json()["z_score_threshold"] == 2.5


def test_anomaly_detection_and_lifecycle(client: TestClient, db_session: Session):
    """
    Seed log records with a simulated error spike, trigger detection, and test anomaly lifecycle.
    """
    # 1. Create a log source
    src = LogSource(
        name="Checkout Service",
        source_type="file",
        service_name="checkout-service",
        status="active",
    )
    db_session.add(src)
    db_session.commit()
    db_session.refresh(src)

    base_time = datetime.datetime.utcnow() - datetime.timedelta(minutes=30)

    # Seed 10 normal logs across previous window
    for i in range(10):
        msg = f"Order step {i} executed smoothly"
        entry = LogEntry(
            source_id=src.id,
            service_name="checkout-service",
            severity="INFO",
            message=msg,
            raw_message=msg,
            timestamp=base_time + datetime.timedelta(minutes=i),
            metadata_json=json.dumps({"duration_ms": 45.0 + i, "status_code": 200}),
        )
        db_session.add(entry)

    # Seed 10 severe error spike logs in the next window
    spike_time = base_time + datetime.timedelta(minutes=15)
    for i in range(10):
        err_msg = f"Database deadlocked on order processing error {i}"
        entry = LogEntry(
            source_id=src.id,
            service_name="checkout-service",
            severity="CRITICAL",
            message=err_msg,
            raw_message=err_msg,
            timestamp=spike_time + datetime.timedelta(seconds=i * 10),
            metadata_json=json.dumps({"duration_ms": 3500.0, "status_code": 500}),
            trace_id=f"tr-deadlock-{i}",
        )
        db_session.add(entry)

    db_session.commit()

    # 2. Trigger Anomaly Detection
    trigger_resp = client.post(
        "/api/v1/anomalies/detect",
        json={
            "start_time": (base_time - datetime.timedelta(minutes=5)).isoformat(),
            "end_time": (spike_time + datetime.timedelta(minutes=10)).isoformat(),
            "window_minutes": 5,
            "service_name": "checkout-service",
            "algorithm": "ALL",
        },
    )
    assert trigger_resp.status_code == 200
    run_data = trigger_resp.json()
    assert run_data["status"] == "COMPLETED"
    assert run_data["anomalies_detected"] > 0

    # 3. List anomalies
    list_resp = client.get("/api/v1/anomalies?service=checkout-service&status=ACTIVE")
    assert list_resp.status_code == 200
    anomalies = list_resp.json()["items"]
    assert len(anomalies) > 0

    first_anomaly = anomalies[0]
    anomaly_id = first_anomaly["id"]
    assert first_anomaly["service_name"] == "checkout-service"
    assert first_anomaly["status"] == "ACTIVE"
    assert first_anomaly["severity"] in ("CRITICAL", "HIGH", "MEDIUM")

    # 4. Get Anomaly Detail
    detail_resp = client.get(f"/api/v1/anomalies/{anomaly_id}")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["id"] == anomaly_id
    assert "surrounding_logs" in detail
    assert len(detail["surrounding_logs"]) > 0

    # 5. Lifecycle status transition: ACKNOWLEDGED -> RESOLVED
    ack_resp = client.patch(
        f"/api/v1/anomalies/{anomaly_id}/status",
        json={"status": "ACKNOWLEDGED"},
    )
    assert ack_resp.status_code == 200
    assert ack_resp.json()["status"] == "ACKNOWLEDGED"

    resolve_resp = client.patch(
        f"/api/v1/anomalies/{anomaly_id}/status",
        json={"status": "RESOLVED"},
    )
    assert resolve_resp.status_code == 200
    assert resolve_resp.json()["status"] == "RESOLVED"

    # 6. Verify statistics summary
    stats_resp = client.get("/api/v1/anomalies/statistics")
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert "total_active" in stats
    assert "critical_count" in stats
    assert "recent_trend" in stats
    assert len(stats["recent_trend"]) == 24


def test_baseline_rebuild_and_retrieval(client: TestClient, db_session: Session):
    """Test rebuilding service statistical baselines."""
    src = LogSource(
        name="Auth Service",
        source_type="file",
        service_name="auth-service",
        status="active",
    )
    db_session.add(src)
    db_session.commit()

    now = datetime.datetime.utcnow()
    for i in range(15):
        msg = f"Token verification {i}"
        entry = LogEntry(
            source_id=src.id,
            service_name="auth-service",
            severity="INFO",
            message=msg,
            raw_message=msg,
            timestamp=now - datetime.timedelta(minutes=i * 5),
            metadata_json=json.dumps({"duration_ms": 25.0 + (i % 5), "status_code": 200}),
        )
        db_session.add(entry)
    db_session.commit()

    rebuild_resp = client.post("/api/v1/anomalies/baselines/rebuild?window=5m&history_days=1")
    assert rebuild_resp.status_code == 200
    baselines = rebuild_resp.json()
    assert len(baselines) > 0

    auth_baselines = [b for b in baselines if b["service_name"] == "auth-service"]
    assert len(auth_baselines) > 0
    assert auth_baselines[0]["sample_count"] > 0

    # Query via GET
    get_baselines_resp = client.get("/api/v1/anomalies/baselines?service=auth-service")
    assert get_baselines_resp.status_code == 200
    assert len(get_baselines_resp.json()) > 0
