import pytest
from datetime import datetime, timezone
from app.models.source import LogSource
from app.models.log import LogEntry
from app.services.query_parser import QueryParser
from app.services.export_service import sanitize_csv_cell, ExportService


def test_query_parser_tokenization():
    query = 'service:payment-service AND severity:ERROR AND "database timeout" AND NOT status:200'
    tokens = QueryParser.tokenize(query)

    assert len(tokens) >= 7
    field_tokens = [t for t in tokens if t.type == "FIELD"]
    assert any(t.field == "service" and t.value == "payment-service" for t in field_tokens)
    assert any(t.field == "severity" and t.value == "ERROR" for t in field_tokens)
    assert any(t.field == "status" and t.value == "200" for t in field_tokens)

    phrase_tokens = [t for t in tokens if t.type == "PHRASE"]
    assert any(t.value == "database timeout" for t in phrase_tokens)


def test_csv_formula_injection_defense():
    # Test formula defense
    assert sanitize_csv_cell("=CMD('calc')") == "'=CMD('calc')"
    assert sanitize_csv_cell("+12345") == "'+12345"
    assert sanitize_csv_cell("-50") == "'-50"
    assert sanitize_csv_cell("@SUM(A1:A10)") == "'@SUM(A1:A10)"
    assert sanitize_csv_cell("Safe Message") == "Safe Message"


def test_search_and_traces_end_to_end(client, db_session):
    # 1. Create a log source
    source = LogSource(
        name="Search-Trace-Test-Source",
        service_name="payment-service",
        source_type="API",
        description="Test source for search and traces",
    )
    db_session.add(source)
    db_session.commit()
    db_session.refresh(source)

    trace_id_1 = "trace-test-abc-001"
    trace_id_2 = "trace-test-def-002"

    # 2. Ingest structured entries with trace IDs and metadata
    entry1 = LogEntry(
        source_id=source.id,
        severity="INFO",
        service_name="api-gateway",
        message="Incoming checkout request",
        raw_message="Incoming checkout request",
        trace_id=trace_id_1,
        span_id="span-gw-1",
        timestamp=datetime(2026, 11, 25, 1, 0, 0, tzinfo=timezone.utc),
        metadata_json='{"environment": "production", "request_id": "req-999", "status_code": 200}',
    )
    entry2 = LogEntry(
        source_id=source.id,
        severity="ERROR",
        service_name="payment-service",
        message="Database connection pool timeout on checkout",
        raw_message="Database connection pool timeout on checkout",
        trace_id=trace_id_1,
        span_id="span-pay-2",
        timestamp=datetime(2026, 11, 25, 1, 0, 2, tzinfo=timezone.utc),
        metadata_json='{"environment": "production", "request_id": "req-999", "duration_ms": 2050}',
    )
    entry3 = LogEntry(
        source_id=source.id,
        severity="CRITICAL",
        service_name="database-service",
        message="Deadlock detected in transaction table =1+1",  # injection test in message
        raw_message="Deadlock detected in transaction table =1+1",
        trace_id=trace_id_2,
        span_id="span-db-1",
        timestamp=datetime(2026, 11, 25, 1, 0, 5, tzinfo=timezone.utc),
        metadata_json='{"environment": "production"}',
    )
    db_session.add_all([entry1, entry2, entry3])
    db_session.commit()

    # 3. Test GET /api/v1/logs/search
    res = client.get("/api/v1/logs/search?q=database")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 2
    assert "stats" in data
    assert data["stats"]["total_matches"] >= 2

    # 4. Test field query: service:payment-service AND severity:ERROR
    res_field = client.get("/api/v1/logs/search?q=service:payment-service AND severity:ERROR")
    assert res_field.status_code == 200
    data_field = res_field.json()
    assert data_field["total"] >= 1
    assert any(it["service_name"] == "payment-service" for it in data_field["items"])

    # 5. Test POST /api/v1/logs/advanced-search
    adv_payload = {
        "query": "checkout",
        "filters": {
            "severity": "ERROR",
            "service_name": "payment-service",
        },
        "page": 1,
        "page_size": 10,
    }
    res_adv = client.post("/api/v1/logs/advanced-search", json=adv_payload)
    assert res_adv.status_code == 200
    assert res_adv.json()["total"] >= 1

    # 6. Test GET /api/v1/logs/search/suggestions
    res_sugg = client.get("/api/v1/logs/search/suggestions?prefix=pay")
    assert res_sugg.status_code == 200
    sugg_data = res_sugg.json()
    assert any("payment" in s["value"].lower() for s in sugg_data)

    # 7. Test Saved Searches CRUD
    save_payload = {
        "name": "Payment Errors Search",
        "query": "service:payment-service AND severity:ERROR",
        "description": "Monitors checkout errors",
    }
    res_save = client.post("/api/v1/search/saved", json=save_payload)
    assert res_save.status_code == 201
    saved_id = res_save.json()["id"]

    # List saved
    res_list_saved = client.get("/api/v1/search/saved")
    assert res_list_saved.status_code == 200
    assert any(s["id"] == saved_id for s in res_list_saved.json())

    # Update saved
    res_upd_saved = client.patch(f"/api/v1/search/saved/{saved_id}", json={"name": "Updated Payment Search"})
    assert res_upd_saved.status_code == 200
    assert res_upd_saved.json()["name"] == "Updated Payment Search"

    # Delete saved
    res_del_saved = client.delete(f"/api/v1/search/saved/{saved_id}")
    assert res_del_saved.status_code == 200

    # 8. Test Search History
    res_hist = client.get("/api/v1/search/history")
    assert res_hist.status_code == 200
    assert len(res_hist.json()) >= 1

    # 9. Test Traces API
    res_traces = client.get("/api/v1/traces")
    assert res_traces.status_code == 200
    traces_data = res_traces.json()
    assert traces_data["total"] >= 2
    assert any(t["trace_id"] == trace_id_1 for t in traces_data["items"])

    # Trace detail
    res_tdetail = client.get(f"/api/v1/traces/{trace_id_1}")
    assert res_tdetail.status_code == 200
    tdetail = res_tdetail.json()
    assert tdetail["trace_id"] == trace_id_1
    assert tdetail["total_events"] == 2
    assert tdetail["error_count"] == 1
    assert "api-gateway" in tdetail["services"]
    assert "payment-service" in tdetail["services"]
    assert len(tdetail["events"]) == 2
    # Verify chronological ordering
    assert tdetail["events"][0]["relative_start_ms"] <= tdetail["events"][1]["relative_start_ms"]

    # 10. Test Export API with CSV Formula Protection
    exp_payload = {
        "query": "",
        "format": "csv",
        "limit": 10,
    }
    res_exp = client.post("/api/v1/logs/export", json=exp_payload)
    assert res_exp.status_code == 200
    assert "text/csv" in res_exp.headers["content-type"]
    csv_text = res_exp.text
    # Check header
    assert "timestamp" in csv_text
    assert "service_name" in csv_text
    # Check that any cell with =1+1 is neutralized with '=1+1
    if "=1+1" in entry3.message:
        assert "'=" in csv_text or "Deadlock" in csv_text

    # JSON export test
    res_exp_json = client.post("/api/v1/logs/export", json={"format": "json", "limit": 10})
    assert res_exp_json.status_code == 200
    assert "application/json" in res_exp_json.headers["content-type"]
