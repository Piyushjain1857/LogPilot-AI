import pytest
from fastapi.testclient import TestClient
from app.models.incident import Incident
from datetime import datetime, timezone


def test_list_reports_auto_seeded(client: TestClient):
    """Test that default reports are auto-seeded and listed."""
    res = client.get("/api/v1/reports")
    assert res.status_code == 200
    reports = res.json()
    assert len(reports) >= 3

    rpt_numbers = [r["report_number"] for r in reports]
    assert "RPT-1001" in rpt_numbers
    assert "RPT-1002" in rpt_numbers
    assert "RPT-1003" in rpt_numbers


def test_get_report_detail(client: TestClient):
    """Test retrieving report detail and structured timeline events."""
    res = client.get("/api/v1/reports/RPT-1001")
    assert res.status_code == 200
    report = res.json()
    assert report["report_number"] == "RPT-1001"
    assert report["category"] == "INCIDENT_POSTMORTEM"
    assert "Post-Mortem: PostgreSQL Connection Pool" in report["title"]
    assert len(report["timeline"]) >= 4
    assert "mttd" in report["metrics"]


def test_export_pdf(client: TestClient):
    """Test ReportLab PDF generation and binary download."""
    res = client.get("/api/v1/reports/RPT-1001/export/pdf")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    # PDF files start with %PDF header
    assert res.content.startswith(b"%PDF")
    assert len(res.content) > 1000


def test_export_markdown_and_json(client: TestClient):
    """Test exporting report in Markdown and JSON formats."""
    # Markdown
    res_md = client.get("/api/v1/reports/RPT-1001/export/markdown")
    assert res_md.status_code == 200
    assert "# Post-Mortem" in res_md.text
    assert "Executive Summary" in res_md.text

    # JSON
    res_json = client.get("/api/v1/reports/RPT-1001/export/json")
    assert res_json.status_code == 200
    data = res_json.json()
    assert data["report_number"] == "RPT-1001"
    assert "timeline" in data


def test_generate_postmortem_for_incident(client: TestClient, db_session):
    """Test dynamic post-mortem generation from incident."""
    incident = Incident(
        incident_number="INC-2026-999",
        title="Checkout Service Timeout Saturation",
        description="High volume concurrent requests caused connection timeouts.",
        severity="CRITICAL",
        primary_service="checkout-service",
        affected_services_json='["checkout-service", "postgres-primary"]',
        first_detected_at=datetime.now(timezone.utc),
        last_detected_at=datetime.now(timezone.utc),
    )
    db_session.add(incident)
    db_session.commit()
    db_session.refresh(incident)

    res = client.post("/api/v1/reports/generate", json={"incident_id": incident.id})
    assert res.status_code == 200
    rpt = res.json()
    assert "Post-Mortem" in rpt["title"]
    assert rpt["incident_id"] == incident.id
    assert rpt["category"] == "INCIDENT_POSTMORTEM"


def test_assistant_query_translation(client: TestClient):
    """Test natural language to Boolean AST query translation."""
    res = client.post(
        "/api/v1/assistant/translate-query",
        json={"query": "find 500 errors in payment-service"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "service:payment-service" in data["translated_query"]
    assert "severity:ERROR" in data["translated_query"]
    assert '"500"' in data["translated_query"]


def test_assistant_chat(client: TestClient):
    """Test conversational assistant chat interface."""
    res = client.post(
        "/api/v1/assistant/chat",
        json={"message": "are there any active incidents right now?"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "reply" in data
    assert len(data["reply"]) > 10
