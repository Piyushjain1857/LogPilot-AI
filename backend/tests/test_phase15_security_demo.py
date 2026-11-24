import pytest
from fastapi.testclient import TestClient


def test_security_roles_matrix(client: TestClient):
    response = client.get("/api/v1/security/roles")
    assert response.status_code == 200
    data = response.json()
    assert "roles" in data
    roles = [r["role"] for r in data["roles"]]
    assert "ADMIN" in roles
    assert "ANALYST" in roles
    assert "VIEWER" in roles


def test_security_audit_endpoint(client: TestClient):
    response = client.get("/api/v1/security/audit", headers={"X-LogPilot-Role": "ANALYST"})
    assert response.status_code == 200
    data = response.json()
    assert data["caller_context"]["role"] == "ANALYST"
    assert data["security_posture"]["rbac_enforcement"] == "ACTIVE"
    assert data["security_posture"]["command_sandbox"] == "STRICT_COMMAND_ALLOWLIST"
    assert "redaction_engine" in data


def test_rbac_enforcement_forbidden_for_viewer(client: TestClient):
    # VIEWER role is prohibited from executing remediation playbooks
    response = client.post(
        "/api/v1/remediation/playbooks/PB-101/simulate",
        json={"dry_run": True, "enforce_approvals": False},
        headers={"X-LogPilot-Role": "VIEWER"},
    )
    assert response.status_code == 403
    assert "Insufficient privileges" in response.json()["detail"]


def test_rbac_enforcement_allowed_for_admin(client: TestClient):
    # ADMIN role is authorized to execute remediation
    response = client.post(
        "/api/v1/remediation/playbooks/PB-101/simulate",
        json={"dry_run": True, "enforce_approvals": False},
        headers={"X-LogPilot-Role": "ADMIN"},
    )
    assert response.status_code == 200
    assert response.json()["all_passed"] is True


def test_demo_status_endpoint(client: TestClient):
    response = client.get("/api/v1/demo/status")
    assert response.status_code == 200
    data = response.json()
    assert "current_stage" in data
    assert data["total_stages"] == 7
    assert "demo_trace_id" in data


def test_demo_7_stage_progression(client: TestClient):
    # Advance to Stage 1 (Ingestion)
    r1 = client.post("/api/v1/demo/advance", json={"stage": 1})
    assert r1.status_code == 200
    assert r1.json()["execution"]["stage"] == 1
    assert r1.json()["execution"]["trace_id"] == "tr-demo-101"

    # Advance to Stage 4 (Incident Correlation)
    r4 = client.post("/api/v1/demo/advance", json={"stage": 4})
    assert r4.status_code == 200
    assert r4.json()["execution"]["incident_id"] == "INC-101"

    # Advance to Stage 7 (Remediation & Recovery)
    r7 = client.post("/api/v1/demo/advance", json={"stage": 7})
    assert r7.status_code == 200
    assert r7.json()["execution"]["incident_status"] == "MITIGATED"
    assert r7.json()["execution"]["post_mortem_id"] == "RPT-1001"

    # Check status reflects progress
    status_resp = client.get("/api/v1/demo/status")
    assert status_resp.status_code == 200
    assert status_resp.json()["current_stage"] == 7
    assert status_resp.json()["is_complete"] is True

    # Reset demo
    reset_resp = client.post("/api/v1/demo/reset")
    assert reset_resp.status_code == 200
    assert reset_resp.json()["result"]["status"] == "SUCCESS"
