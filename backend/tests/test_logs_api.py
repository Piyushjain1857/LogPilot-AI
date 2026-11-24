import pytest
from datetime import datetime, timezone
from app.models.source import LogSource
from app.models.log import LogEntry


def test_logs_explorer_pagination_and_filtering(client, db_session):
    src = LogSource(name="Payment Service", source_type="file", service_name="payment-service")
    db_session.add(src)
    db_session.commit()

    now = datetime.now(timezone.utc)
    for i in range(15):
        sev = "ERROR" if i % 2 == 0 else "INFO"
        db_session.add(
            LogEntry(
                source_id=src.id,
                timestamp=now,
                severity=sev,
                service_name="payment-service",
                message=f"Log event #{i} processing order",
                raw_message=f"Log event #{i} processing order",
                trace_id=f"tr-{i}",
            )
        )
    db_session.commit()

    # 1. List logs with pagination
    res = client.get("/api/v1/logs?page=1&page_size=10")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 15
    assert len(data["items"]) == 10
    assert data["total_pages"] == 2

    # 2. Filter by severity
    res_err = client.get("/api/v1/logs?severity=ERROR")
    assert res_err.status_code == 200
    assert res_err.json()["total"] == 8

    # 3. Search query
    res_search = client.get("/api/v1/logs", params={"search": "event #3"})
    assert res_search.status_code == 200
    assert res_search.json()["total"] == 1
    log_id = res_search.json()["items"][0]["id"]

    # 4. Get log detail
    res_detail = client.get(f"/api/v1/logs/{log_id}")
    assert res_detail.status_code == 200
    assert res_detail.json()["trace_id"] == "tr-3"
