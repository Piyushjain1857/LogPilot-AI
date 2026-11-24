import json
import datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.source import LogSource
from app.models.log import LogEntry
from app.models.incident import Incident


@pytest.fixture
def seed_troubleshooter_data(db_session: Session):
    src = LogSource(
        id="src-tb-test",
        name="Payment Gateway Service",
        source_type="container",
        service_name="payment-service",
        status="active",
    )
    db_session.add(src)
    db_session.flush()

    now = datetime.datetime.now(datetime.timezone.utc)
    log = LogEntry(
        id="log-tb-101",
        source_id="src-tb-test",
        timestamp=now - datetime.timedelta(minutes=5),
        service_name="payment-service",
        severity="CRITICAL",
        message="Deadlock detected on table accounts_payable waiting for lock",
        raw_message="Deadlock detected on table accounts_payable waiting for lock",
        trace_id="tr-tb-777",
        metadata_json=json.dumps({"status_code": 500, "duration_ms": 30000.0}),
    )
    db_session.add(log)
    db_session.flush()

    inc = Incident(
        id="inc-tb-test",
        incident_number="INC-3001",
        title="Payment Service Deadlock Outage",
        description="Deadlock detected in payment-service causing checkout timeouts.",
        severity="CRITICAL",
        status="active",
        primary_service="payment-service",
        affected_services_json=json.dumps(["payment-service"]),
        first_detected_at=now - datetime.timedelta(minutes=5),
        last_detected_at=now,
    )
    db_session.add(inc)
    db_session.commit()

    return {"incident": inc, "log": log}


def test_troubleshooter_autonomous_investigation(client: TestClient, seed_troubleshooter_data):
    # 1. Trigger investigation for incident
    resp = client.post(
        "/api/v1/troubleshooter/investigate",
        json={"incident_id": "inc-tb-test"},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] == "completed"
    assert "payment-service" in data["executive_summary"]
    assert len(data["thought_steps"]) >= 3
    assert any(step["tool"] == "get_incident_detail" for step in data["thought_steps"])
    assert any(step["tool"] == "query_logs" for step in data["thought_steps"])

    # 2. Check 4 perspectives
    perspectives = data["perspectives"]
    assert "sre" in perspectives
    assert "database_infra" in perspectives
    assert "application" in perspectives
    assert "security" in perspectives
    assert perspectives["sre"]["severity"] == "CRITICAL"

    # 3. Check remediation steps
    remediation = data["remediation_steps"]
    assert len(remediation) >= 2
    assert remediation[0]["command"] is not None
    assert remediation[0]["verification"] is not None
    assert remediation[0]["rollback_plan"] is not None

    # 4. Check evidence citations
    citations = data["evidence_citations"]
    assert len(citations) >= 1
    assert citations[0]["service"] == "payment-service"
    assert "Deadlock" in citations[0]["message"]

    # 5. Retrieve investigation by ID
    inv_id = data["investigation_id"]
    get_resp = client.get(f"/api/v1/troubleshooter/investigations/{inv_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["investigation_id"] == inv_id

    # 6. Chat with troubleshooter
    chat_resp = client.post(
        "/api/v1/troubleshooter/chat",
        json={
            "investigation_id": inv_id,
            "incident_id": "inc-tb-test",
            "message": "Why did the payment-service deadlock occur?",
        },
    )
    assert chat_resp.status_code == 200
    chat_data = chat_resp.json()
    assert "payment-service" in chat_data["response"]
    assert len(chat_data["evidence_citations"]) >= 1
