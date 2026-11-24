from datetime import datetime, timezone
from app.models.source import LogSource
from app.models.log import LogEntry
from app.models.incident import Incident


def test_preferences_get_and_patch(client):
    # 1. GET default preferences
    res = client.get("/api/v1/settings/preferences")
    assert res.status_code == 200
    data = res.json()
    assert data["theme"] == "dark"
    assert data["display_density"] == "comfortable"
    assert data["timezone"] == "UTC"
    assert data["auto_refresh_enabled"] is True
    assert data["auto_refresh_interval"] == 30

    # 2. PATCH valid updates
    patch_res = client.patch(
        "/api/v1/settings/preferences",
        json={
            "theme": "light",
            "sidebar_collapsed": True,
            "display_density": "compact",
            "auto_refresh_interval": 15,
        },
    )
    assert patch_res.status_code == 200
    patched_data = patch_res.json()
    assert patched_data["theme"] == "light"
    assert patched_data["sidebar_collapsed"] is True
    assert patched_data["display_density"] == "compact"
    assert patched_data["auto_refresh_interval"] == 15

    # 3. PATCH invalid theme
    inv_res = client.patch(
        "/api/v1/settings/preferences",
        json={"theme": "neon-glow"},
    )
    assert inv_res.status_code == 422

    # 4. PATCH invalid interval
    inv_int = client.patch(
        "/api/v1/settings/preferences",
        json={"auto_refresh_interval": 999},
    )
    assert inv_int.status_code == 422

    # 5. PATCH invalid timezone
    inv_tz = client.patch(
        "/api/v1/settings/preferences",
        json={"timezone": "Mars/Olympus"},
    )
    assert inv_tz.status_code == 422


def test_overview_activity_empty_and_populated(client, db_session):
    # Empty DB
    res = client.get("/api/v1/overview/activity?range=24h")
    assert res.status_code == 200
    assert res.json()["points"] == []

    # Invalid range defaults gracefully
    res_inv = client.get("/api/v1/overview/activity?range=invalid_range")
    assert res_inv.status_code == 200
    assert res_inv.json()["range"] == "24h"

    # Insert a source and logs
    src = LogSource(name="Test", source_type="api", service_name="auth-service")
    db_session.add(src)
    db_session.commit()

    now = datetime.now(timezone.utc)
    log1 = LogEntry(
        source_id=src.id,
        timestamp=now,
        severity="INFO",
        service_name="auth-service",
        message="Login ok",
        raw_message="Login ok",
    )
    log2 = LogEntry(
        source_id=src.id,
        timestamp=now,
        severity="ERROR",
        service_name="auth-service",
        message="Login fail",
        raw_message="Login fail",
    )
    db_session.add_all([log1, log2])
    db_session.commit()

    res_pop = client.get("/api/v1/overview/activity?range=24h")
    assert res_pop.status_code == 200
    points = res_pop.json()["points"]
    assert len(points) >= 1
    assert points[0]["count"] == 2
    assert points[0]["error_count"] == 1


def test_overview_severity_distribution(client, db_session):
    # Empty
    res_empty = client.get("/api/v1/overview/severity-distribution")
    assert res_empty.status_code == 200
    assert res_empty.json()["total"] == 0

    # Populated
    src = LogSource(name="Service", source_type="api", service_name="srv")
    db_session.add(src)
    db_session.commit()

    now = datetime.now(timezone.utc)
    db_session.add_all(
        [
            LogEntry(
                source_id=src.id,
                timestamp=now,
                severity="ERROR",
                service_name="srv",
                message="Err",
                raw_message="Err",
            ),
            LogEntry(
                source_id=src.id,
                timestamp=now,
                severity="WARNING",
                service_name="srv",
                message="Warn",
                raw_message="Warn",
            ),
            LogEntry(
                source_id=src.id,
                timestamp=now,
                severity="CRITICAL",
                service_name="srv",
                message="Crit",
                raw_message="Crit",
            ),
        ]
    )
    db_session.commit()

    res = client.get("/api/v1/overview/severity-distribution")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 3
    assert len(data["distribution"]) == 3
    severities = [item["severity"] for item in data["distribution"]]
    assert "CRITICAL" in severities
    assert "ERROR" in severities
    assert "WARNING" in severities


def test_overview_recent_incidents(client, db_session):
    # Empty
    res_empty = client.get("/api/v1/overview/recent-incidents")
    assert res_empty.status_code == 200
    assert res_empty.json()["incidents"] == []

    # Insert incident
    now = datetime.now(timezone.utc)
    inc = Incident(
        title="Gateway Outage",
        description="Downstream timeout",
        severity="CRITICAL",
        status="active",
        affected_services_json='["api-gateway", "auth"]',
        first_detected_at=now,
        last_detected_at=now,
    )
    db_session.add(inc)
    db_session.commit()

    res = client.get("/api/v1/overview/recent-incidents?limit=5")
    assert res.status_code == 200
    incidents = res.json()["incidents"]
    assert len(incidents) == 1
    assert incidents[0]["title"] == "Gateway Outage"
    assert incidents[0]["affected_services"] == ["api-gateway", "auth"]


def test_overview_source_health(client, db_session):
    # Empty
    res_empty = client.get("/api/v1/overview/source-health")
    assert res_empty.status_code == 200
    assert res_empty.json()["sources"] == []

    # Insert source without logs -> health="unknown"
    src1 = LogSource(name="Payment", source_type="api", service_name="payment-svc")
    # Insert source with error log -> health="degraded"
    src2 = LogSource(name="Database", source_type="db", service_name="db-svc")
    db_session.add_all([src1, src2])
    db_session.commit()

    log_err = LogEntry(
        source_id=src2.id,
        timestamp=datetime.now(timezone.utc),
        severity="ERROR",
        service_name="db-svc",
        message="Connection err",
        raw_message="Connection err",
    )
    db_session.add(log_err)
    db_session.commit()

    res = client.get("/api/v1/overview/source-health")
    assert res.status_code == 200
    sources = res.json()["sources"]
    assert len(sources) == 2
    p_src = next(s for s in sources if s["name"] == "Payment")
    d_src = next(s for s in sources if s["name"] == "Database")
    assert p_src["health"] == "unknown"
    assert d_src["health"] == "degraded"
