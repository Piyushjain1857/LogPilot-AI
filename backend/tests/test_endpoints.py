def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "LogPilot AI"
    assert data["version"] == "0.1.0"
    assert "description" in data
    # Headers
    assert "X-Request-ID" in response.headers
    assert "X-Process-Time" in response.headers
    assert response.headers["X-Content-Type-Options"] == "nosniff"


def test_health_endpoint(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data


def test_system_status_endpoint(client):
    response = client.get("/api/v1/system/status")
    assert response.status_code == 200
    data = response.json()
    assert data["backend_status"] == "online"
    assert data["database_connected"] is True
    assert data["app_version"] == "0.1.0"
    assert "uptime_seconds" in data
    assert "gemini_status" in data
    assert data["gemini_status"] in ["not_configured", "configured_unverified", "verified"]


def test_system_capabilities_endpoint(client):
    response = client.get("/api/v1/system/capabilities")
    assert response.status_code == 200
    data = response.json()
    assert data["incident_management"] == "implemented"
    assert data["log_file_ingestion"] == "planned"
    assert data["anomaly_detection"] == "planned"
    assert data["ai_troubleshooting"] == "planned"


def test_overview_summary_empty_database(client):
    response = client.get("/api/v1/overview/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["total_logs"] == 0
    assert data["error_logs"] == 0
    assert data["warning_logs"] == 0
    assert data["critical_logs"] == 0
    assert data["active_incidents"] == 0
    assert data["configured_sources"] == 0


def test_invalid_route_returns_structured_error(client):
    response = client.get("/api/v1/nonexistent-route")
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
    assert "request_id" in data
    assert data["status_code"] == 404
    assert response.headers.get("X-Request-ID") == data["request_id"]


def test_request_id_custom_header_preserved(client):
    custom_id = "test-custom-uuid-1234"
    response = client.get("/", headers={"X-Request-ID": custom_id})
    assert response.headers.get("X-Request-ID") == custom_id
