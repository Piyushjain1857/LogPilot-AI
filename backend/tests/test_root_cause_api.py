import json
import datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.source import LogSource
from app.models.log import LogEntry
from app.models.incident import Incident
from app.models.anomaly import Anomaly


@pytest.fixture
def seed_rca_scenario(db_session: Session):
    # Log source
    src = LogSource(
        id="src-rca",
        name="Microservices E-Commerce",
        source_type="container",
        service_name="payment-service",
        status="active",
    )
    db_session.add(src)
    db_session.flush()

    now = datetime.datetime.now(datetime.timezone.utc)
    t0 = now - datetime.timedelta(minutes=20)
    t1 = now - datetime.timedelta(minutes=15)
    t2 = now - datetime.timedelta(minutes=10)

    # 1. Earliest root cause: postgres deadlock in payment-service
    log_root = LogEntry(
        id="log-rca-root",
        source_id="src-rca",
        timestamp=t0,
        service_name="payment-service",
        severity="CRITICAL",
        message="Deadlock detected on table accounts_payable waiting for lock",
        raw_message="Deadlock detected on table accounts_payable waiting for lock",
        trace_id="tr-cascading-999",
        metadata_json=json.dumps({"status_code": 500, "duration_ms": 30000.0}),
    )

    # 2. Downstream propagating symptom: order-service timeout
    log_prop = LogEntry(
        id="log-rca-prop",
        source_id="src-rca",
        timestamp=t1,
        service_name="order-service",
        severity="ERROR",
        message="504 Gateway Timeout calling upstream payment-service /charge",
        raw_message="504 Gateway Timeout calling upstream payment-service /charge",
        trace_id="tr-cascading-999",
        metadata_json=json.dumps({"status_code": 504, "duration_ms": 5000.0}),
    )

    # 3. Edge symptom: api-gateway bad gateway
    log_symp = LogEntry(
        id="log-rca-symp",
        source_id="src-rca",
        timestamp=t2,
        service_name="api-gateway",
        severity="ERROR",
        message="502 Bad Gateway forward to order-service timed out",
        raw_message="502 Bad Gateway forward to order-service timed out",
        trace_id="tr-cascading-999",
        metadata_json=json.dumps({"status_code": 502, "duration_ms": 5100.0}),
    )
    db_session.add_all([log_root, log_prop, log_symp])
    db_session.flush()

    # Associated Incident
    inc = Incident(
        id="inc-rca-test",
        incident_number="INC-2001",
        title="Cascading Checkout Failure Across Microservices",
        description="Deadlock in payment-service caused cascading 504 and 502 errors.",
        severity="CRITICAL",
        status="active",
        primary_service="payment-service",
        affected_services_json=json.dumps(["payment-service", "order-service", "api-gateway"]),
        first_detected_at=t0,
        last_detected_at=t2,
    )
    db_session.add(inc)
    db_session.commit()

    return {
        "incident": inc,
        "logs": [log_root, log_prop, log_symp],
    }


def test_global_topology(client: TestClient, seed_rca_scenario):
    resp = client.get("/api/v1/root-cause/topology")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_services"] >= 3
    assert data["total_dependencies"] >= 2
    node_ids = [n["id"] for n in data["nodes"]]
    assert "payment-service" in node_ids
    assert "order-service" in node_ids


def test_analyze_root_cause_and_citations(client: TestClient, seed_rca_scenario):
    # 1. Trigger RCA for incident
    resp = client.post(
        "/api/v1/root-cause/analyze",
        json={"incident_id": "inc-rca-test", "lookback_minutes": 60},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "completed"
    assert data["top_root_cause_service"] == "payment-service"
    assert data["confidence_score"] >= 0.70

    # 2. Check hypotheses ranking
    hypotheses = data["hypotheses"]
    assert len(hypotheses) >= 1
    top_hypo = hypotheses[0]
    assert top_hypo["rank"] == 1
    assert top_hypo["service_name"] == "payment-service"
    assert "payment-service" in top_hypo["title"]
    assert len(top_hypo["evidence_citations"]) >= 1
    top_citation = top_hypo["evidence_citations"][0]
    assert top_citation["service_name"] == "payment-service"
    assert "Deadlock" in top_citation["message"]
    assert top_citation["trace_id"] == "tr-cascading-999"

    # 3. Check graph node classification
    nodes = data["graph"]["nodes"]
    root_node = next((n for n in nodes if n["id"] == "payment-service"), None)
    assert root_node is not None
    assert root_node["status"] == "ROOT_CAUSE"

    # 4. Fetch analysis by ID
    analysis_id = data["analysis_id"]
    get_resp = client.get(f"/api/v1/root-cause/{analysis_id}")
    assert get_resp.status_code == 200
    get_data = get_resp.json()
    assert get_data["analysis_id"] == analysis_id
    assert get_data["top_root_cause_service"] == "payment-service"

    # 5. Fetch analysis by incident ID
    inc_resp = client.get("/api/v1/root-cause/incident/inc-rca-test")
    assert inc_resp.status_code == 200
    inc_data = inc_resp.json()
    assert inc_data["incident_id"] == "inc-rca-test"
    assert inc_data["top_root_cause_service"] == "payment-service"


def test_analyze_root_cause_adhoc_window(client: TestClient):
    """Verify ad-hoc/lookback window root cause analysis with incident_id=None succeeds."""
    resp = client.post(
        "/api/v1/root-cause/analyze",
        json={"incident_id": None, "lookback_minutes": 60},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "completed"
    assert data["incident_id"] is None
    assert "graph" in data
    assert len(data["graph"]["nodes"]) > 0
