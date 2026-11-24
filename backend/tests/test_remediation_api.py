import pytest
from fastapi.testclient import TestClient
from app.models.incident import Incident
from app.models.source import LogSource
from app.models.log import LogEntry


def test_list_playbooks_auto_seeded(client: TestClient):
    """Test that all 6 default predefined playbooks are auto-seeded."""
    res = client.get("/api/v1/remediation/playbooks")
    assert res.status_code == 200
    playbooks = res.json()
    assert len(playbooks) >= 6

    pb_numbers = [p["playbook_number"] for p in playbooks]
    assert "PB-101" in pb_numbers
    assert "PB-102" in pb_numbers
    assert "PB-103" in pb_numbers
    assert "PB-104" in pb_numbers
    assert "PB-105" in pb_numbers
    assert "PB-106" in pb_numbers


def test_get_playbook_by_number_and_id(client: TestClient):
    """Test fetching a playbook by its number and verifying its step properties."""
    res = client.get("/api/v1/remediation/playbooks/PB-101")
    assert res.status_code == 200
    pb = res.json()
    assert pb["playbook_number"] == "PB-101"
    assert pb["category"] == "DATABASE"
    assert len(pb["steps"]) == 4

    step1 = pb["steps"][0]
    assert step1["step_number"] == 1
    assert "SELECT count(*)" in step1["command"]
    assert step1["safety_tier"] == "SAFE"

    # Fetch by internal UUID id
    res2 = client.get(f"/api/v1/remediation/playbooks/{pb['id']}")
    assert res2.status_code == 200
    assert res2.json()["playbook_number"] == "PB-101"


def test_filter_playbooks(client: TestClient):
    """Test category and risk filters."""
    # Category filter
    res = client.get("/api/v1/remediation/playbooks?category=CONTAINER")
    assert res.status_code == 200
    playbooks = res.json()
    assert all(p["category"] == "CONTAINER" for p in playbooks)
    assert any(p["playbook_number"] == "PB-102" for p in playbooks)

    # Risk level filter
    res_risk = client.get("/api/v1/remediation/playbooks?risk_level=CRITICAL_DESTRUCTIVE")
    assert res_risk.status_code == 200
    playbooks_risk = res_risk.json()
    assert all(p["risk_level"] == "CRITICAL_DESTRUCTIVE" for p in playbooks_risk)
    assert any(p["playbook_number"] == "PB-106" for p in playbooks_risk)


def test_recommend_playbooks_for_incident(client: TestClient, db_session):
    """Test incident symptom correlation and ranked runbook recommendation."""
    # Seed incident
    incident = Incident(
        incident_number="INC-2026-901",
        title="PostgreSQL connection pool exhausted on payment-service",
        description="Checkout traffic failing with connection pool timeout and too many connections error.",
        severity="CRITICAL",
        primary_service="postgres-primary",
        affected_services_json='["payment-service", "order-service"]',
    )
    db_session.add(incident)
    db_session.commit()
    db_session.refresh(incident)

    res = client.post("/api/v1/remediation/recommend", json={"incident_id": incident.id})
    assert res.status_code == 200
    recs = res.json()
    assert len(recs) >= 1

    # PB-101 should be the top match
    top_rec = recs[0]
    assert top_rec["playbook"]["playbook_number"] == "PB-101"
    assert top_rec["match_score"] >= 0.60
    assert top_rec["confidence"] in ("HIGH", "MEDIUM")
    assert len(top_rec["match_reasons"]) >= 1


def test_step_approval_and_simulation(client: TestClient):
    """Test approving a gated step, running safe simulation, and executing rollback."""
    # 1. Fetch PB-101
    res = client.get("/api/v1/remediation/playbooks/PB-101")
    pb = res.json()
    pb_id = pb["id"]

    # Step 3 requires approval
    step3 = next(s for s in pb["steps"] if s["step_number"] == 3)
    assert step3["requires_approval"] is True

    # Approve Step 3
    res_appr = client.post(
        f"/api/v1/remediation/playbooks/{pb_id}/approve",
        json={
            "step_number": 3,
            "approved": True,
            "approver_note": "Approved by Senior SRE on-call for emergency mitigation",
            "performed_by": "sre-lead",
        },
    )
    assert res_appr.status_code == 200
    updated_pb = res_appr.json()
    assert updated_pb["approval_status"] == "approved"

    # 2. Simulate execution
    res_sim = client.post(
        f"/api/v1/remediation/playbooks/{pb_id}/simulate",
        json={"dry_run": True, "enforce_approvals": True},
    )
    assert res_sim.status_code == 200
    sim_data = res_sim.json()
    assert sim_data["all_passed"] is True
    assert sim_data["execution_status"] == "simulated"
    assert len(sim_data["steps"]) == 4

    # Verify simulation outputs
    for step_log in sim_data["steps"]:
        assert step_log["preflight_passed"] is True
        assert step_log["exit_code"] == 0
        assert step_log["status"] == "simulated_success"
        assert len(step_log["stdout"]) > 0

    # 3. Rollback execution
    res_rb = client.post(
        f"/api/v1/remediation/playbooks/{pb_id}/rollback",
        json={"performed_by": "sre-lead"},
    )
    assert res_rb.status_code == 200
    rb_data = res_rb.json()
    assert rb_data["execution_status"] == "rolled_back"
    assert len(rb_data["rolled_back_steps"]) >= 1


def test_simulation_blocks_unapproved_gated_step(client: TestClient):
    """Test that simulation halts or flags unapproved steps when enforce_approvals is True."""
    # PB-102 has steps 3 & 4 requiring approval
    res = client.get("/api/v1/remediation/playbooks/PB-102")
    pb_id = res.json()["id"]

    res_sim = client.post(
        f"/api/v1/remediation/playbooks/{pb_id}/simulate",
        json={"dry_run": True, "enforce_approvals": True},
    )
    assert res_sim.status_code == 200
    sim_data = res_sim.json()
    # Should not pass all steps because steps 3 & 4 are not approved yet
    assert sim_data["all_passed"] is False

    skipped_steps = [s for s in sim_data["steps"] if s["status"] == "skipped_unapproved"]
    assert len(skipped_steps) >= 1
    assert "GATE ENFORCED" in skipped_steps[0]["stderr"]


def test_export_playbook(client: TestClient):
    """Test exporting playbook to YAML, Ansible, and Bash formats."""
    # YAML
    res_yaml = client.get("/api/v1/remediation/playbooks/PB-101/export?format=yaml")
    assert res_yaml.status_code == 200
    assert "apiVersion: v1" in res_yaml.text
    assert "PB-101" in res_yaml.text

    # Ansible
    res_ansible = client.get("/api/v1/remediation/playbooks/PB-101/export?format=ansible")
    assert res_ansible.status_code == 200
    assert "hosts: postgres-primary" in res_ansible.text

    # Shell
    res_shell = client.get("/api/v1/remediation/playbooks/PB-101/export?format=shell")
    assert res_shell.status_code == 200
    assert "#!/usr/bin/env bash" in res_shell.text


def test_audit_logs(client: TestClient):
    """Test retrieving immutable audit trail."""
    res = client.get("/api/v1/remediation/audit-logs")
    assert res.status_code == 200
    logs = res.json()
    assert len(logs) >= 1
    actions = [l["action"] for l in logs]
    assert any("PLAYBOOK" in a or "STEP" in a or "SIMULATION" in a for a in actions)
