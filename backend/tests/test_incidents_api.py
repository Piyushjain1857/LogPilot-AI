import json
import datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database.session import get_db
from app.models.source import LogSource
from app.models.log import LogEntry
from app.models.anomaly import Anomaly
from app.models.cluster import LogCluster
from app.models.incident import Incident, IncidentLog


@pytest.fixture
def seed_incident_data(db_session: Session):
    # 1. Source
    source = LogSource(
        id="src-inc-test",
        name="Production Cluster",
        source_type="container",
        service_name="payment-service",
        status="active",
    )
    db_session.add(source)
    db_session.flush()

    # 2. Logs
    now = datetime.datetime.now(datetime.timezone.utc)
    log1 = LogEntry(
        id="log-inc-1",
        source_id="src-inc-test",
        timestamp=now - datetime.timedelta(minutes=10),
        service_name="payment-service",
        severity="CRITICAL",
        message="Connection to Postgres pool timeout after 30000ms",
        raw_message="Connection to Postgres pool timeout after 30000ms",
        trace_id="tr-inc-100",
        metadata_json=json.dumps({"status_code": 500, "duration_ms": 30000.0}),
    )
    log2 = LogEntry(
        id="log-inc-2",
        source_id="src-inc-test",
        timestamp=now - datetime.timedelta(minutes=8),
        service_name="order-service",
        severity="ERROR",
        message="503 Service Unavailable upstream payment-service",
        raw_message="503 Service Unavailable upstream payment-service",
        trace_id="tr-inc-100",
        metadata_json=json.dumps({"status_code": 503, "duration_ms": 2500.0}),
    )
    db_session.add_all([log1, log2])
    db_session.flush()

    # 3. Anomaly
    anomaly = Anomaly(
        time_window_start=now - datetime.timedelta(minutes=15),
        time_window_end=now,
        service_name="payment-service",
        anomaly_type="ERROR_SPIKE",
        severity="CRITICAL",
        anomaly_score=0.96,
        algorithm="Z_SCORE",
        metric_name="error_rate",
        observed_value=0.85,
        expected_value=0.01,
        threshold=0.05,
        context_payload=json.dumps({"sample_log_ids": ["log-inc-1"]}),
        status="ACTIVE",
        detected_at=now - datetime.timedelta(minutes=9),
    )
    db_session.add(anomaly)
    db_session.flush()

    # 4. Cluster
    cluster = LogCluster(
        id="cl-inc-1",
        signature_hash="f" * 32,
        service_name="order-service",
        name="503 Service Unavailable upstream",
        template="<NUM> Service Unavailable upstream <VAR>",
        severity="ERROR",
        occurrence_count=42,
        error_count=42,
        sample_log_ids=json.dumps(["log-inc-2"]),
        first_seen_at=now - datetime.timedelta(minutes=8),
        last_seen_at=now - datetime.timedelta(minutes=5),
        status="ACTIVE",
    )
    db_session.add(cluster)
    db_session.commit()

    return {
        "source": source,
        "logs": [log1, log2],
        "anomaly": anomaly,
        "cluster": cluster,
    }


def test_correlate_and_incident_lifecycle(client: TestClient, seed_incident_data):
    # 1. Trigger correlation
    resp = client.post("/api/v1/incidents/correlate", json={"lookback_minutes": 60})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "COMPLETED"
    assert data["incidents_created"] >= 1
    assert data["anomalies_correlated"] >= 1
    assert len(data["incident_ids"]) >= 1

    incident_id = data["incident_ids"][0]

    # 2. Get Incident Detail
    detail_resp = client.get(f"/api/v1/incidents/{incident_id}")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["id"] == incident_id
    assert detail["severity"] == "CRITICAL"
    assert detail["status"] == "active"
    assert "payment-service" in detail["affected_services"] or detail["primary_service"] == "payment-service"
    assert len(detail["timeline_events"]) >= 1
    assert len(detail["sample_logs"]) >= 1

    # 3. Add operator note
    note_resp = client.post(
        f"/api/v1/incidents/{incident_id}/notes",
        json={"note": "Investigating database connection pool leak in payment-service pods.", "author": "SRE Lead"},
    )
    assert note_resp.status_code == 200
    note_data = note_resp.json()
    assert any("SRE Lead" in ev["description"] for ev in note_data["timeline_events"])

    # 4. Update status to INVESTIGATING
    update_resp = client.patch(
        f"/api/v1/incidents/{incident_id}/status",
        json={"status": "investigating", "assigned_to": "alice@company.com"},
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "investigating"
    assert update_resp.json()["assigned_to"] == "alice@company.com"

    # 5. Update status to RESOLVED
    resolve_resp = client.patch(
        f"/api/v1/incidents/{incident_id}/status",
        json={"status": "resolved", "resolution_notes": "Restarted payment-service with increased pool size to 50 connections."},
    )
    assert resolve_resp.status_code == 200
    res_data = resolve_resp.json()
    assert res_data["status"] == "resolved"
    assert res_data["resolved_at"] is not None
    assert res_data["resolution_notes"] == "Restarted payment-service with increased pool size to 50 connections."

    # 6. Verify Statistics
    stats_resp = client.get("/api/v1/incidents/statistics")
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert stats["total_incidents"] >= 1
    assert stats["resolved_incidents"] >= 1
    assert stats["mttr_seconds"] >= 0.0

    # 7. List Incidents with filters
    list_resp = client.get("/api/v1/incidents?status=resolved")
    assert list_resp.status_code == 200
    list_data = list_resp.json()
    assert list_data["total"] >= 1
    assert any(i["id"] == incident_id for i in list_data["incidents"])


def test_incident_deduplication_and_not_found(client: TestClient, db_session: Session, seed_incident_data):
    # Initial correlate
    client.post("/api/v1/incidents/correlate", json={"lookback_minutes": 60})

    # Add another anomaly in the same sliding window for payment-service
    now = datetime.datetime.now(datetime.timezone.utc)
    new_anomaly = Anomaly(
        time_window_start=now - datetime.timedelta(minutes=5),
        time_window_end=now,
        service_name="payment-service",
        anomaly_type="LATENCY_P95_BREACH",
        severity="HIGH",
        anomaly_score=0.91,
        algorithm="EWMA",
        metric_name="p95_latency_ms",
        observed_value=4200.0,
        expected_value=250.0,
        threshold=1000.0,
        context_payload=json.dumps({"sample_log_ids": []}),
        status="ACTIVE",
        detected_at=now - datetime.timedelta(minutes=2),
    )
    db_session.add(new_anomaly)
    db_session.commit()

    # Re-correlate: should deduplicate and merge into the existing incident rather than duplicate
    re_resp = client.post("/api/v1/incidents/correlate", json={"lookback_minutes": 60})
    assert re_resp.status_code == 200
    re_data = re_resp.json()
    assert re_data["incidents_updated"] >= 1

    # Check 404 for non-existent incident
    not_found_resp = client.get("/api/v1/incidents/inc-non-existent-999")
    assert not_found_resp.status_code == 404
