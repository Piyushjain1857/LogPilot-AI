# LogPilot AI — API Documentation (v1)

Base URL: `http://127.0.0.1:8000/api/v1`  
Interactive OpenAPI UI (Swagger): `http://127.0.0.1:8000/docs`  
ReDoc UI: `http://127.0.0.1:8000/redoc`

---

## Headers

All responses include standard diagnostic headers:
- `X-Request-ID`: UUID uniquely identifying the request lifecycle.
- `X-Process-Time`: Execution latency in seconds (e.g. `0.0034s`).

---

## Endpoints

### 1. Root Application Metadata
- **Route:** `GET /`
- **Description:** Returns application identity and high-level description.
- **Response 200 OK:**
```json
{
  "name": "LogPilot AI",
  "version": "0.1.0",
  "description": "AI-powered Logs Analyser and Troubleshooter Agent"
}
```

---

### 2. Health Check
- **Route:** `GET /api/v1/health`
- **Description:** Simple endpoint for load balancers and container orchestrator health probes.
- **Response 200 OK:**
```json
{
  "status": "healthy",
  "timestamp": "2026-11-24T17:30:00Z"
}
```

---

### 3. System Status
- **Route:** `GET /api/v1/system/status`
- **Description:** Deep diagnostic telemetry including DB connection, uptime, and AI configuration state.
- **Response 200 OK:**
```json
{
  "backend_status": "online",
  "database_connected": true,
  "app_version": "0.1.0",
  "environment": "development",
  "uptime_seconds": 128.45,
  "current_timestamp": "2026-11-24T17:30:00Z",
  "gemini_status": "not_configured"
}
```
*Note: `gemini_status` is one of `not_configured`, `configured_unverified`, or `verified`.*

---

### 4. System Capabilities
- **Route:** `GET /api/v1/system/capabilities`
- **Description:** Truthful feature readiness flags for all platform subsystems.
- **Response 200 OK:**
```json
{
  "log_file_ingestion": "planned",
  "real_time_streaming": "planned",
  "log_parsing": "planned",
  "severity_classification": "planned",
  "anomaly_detection": "planned",
  "log_clustering": "planned",
  "incident_management": "implemented",
  "root_cause_correlation": "planned",
  "ai_troubleshooting": "planned",
  "remediation_playbooks": "planned",
  "report_generation": "planned"
}
```

---

### 5. Overview Summary Metrics
- **Route:** `GET /api/v1/overview/summary`
- **Description:** Aggregated live database counts. Returns actual counts from SQLite, with zero values when no logs or incidents have been ingested.
- **Response 200 OK:**
```json
{
  "total_logs": 0,
  "error_logs": 0,
  "warning_logs": 0,
  "critical_logs": 0,
  "active_incidents": 0,
  "configured_sources": 0
}
```

---

### 6. Log Ingestion Activity Timeseries
- **Route:** `GET /api/v1/overview/activity?window_hours=24`
- **Description:** Time-bucketed log volume and error frequency for AreaChart visualizations.
- **Query Parameters:**
  - `window_hours` (integer, optional, default: 24, range: 1–168)
- **Response 200 OK:**
```json
{
  "window_hours": 24,
  "total_logs": 120,
  "points": [
    {
      "timestamp": "2026-11-24T10:00:00Z",
      "count": 45,
      "error_count": 8
    }
  ]
}
```

---

### 7. Severity Breakdown Distribution
- **Route:** `GET /api/v1/overview/severity-distribution`
- **Description:** Relative percentages and absolute counts of logs categorized by severity level (CRITICAL, ERROR, WARNING, INFO, DEBUG).
- **Response 200 OK:**
```json
{
  "total": 120,
  "distribution": [
    {
      "severity": "ERROR",
      "count": 15,
      "percentage": 12.5
    },
    {
      "severity": "WARNING",
      "count": 8,
      "percentage": 6.7
    }
  ]
}
```

---

### 8. Recent Incidents Stream
- **Route:** `GET /api/v1/overview/recent-incidents?limit=5`
- **Description:** Returns the most recently active or investigated incidents with affected service lists.
- **Query Parameters:**
  - `limit` (integer, optional, default: 5, max: 20)
- **Response 200 OK:**
```json
{
  "incidents": [
    {
      "id": "inc-uuid-1",
      "title": "PostgreSQL Connection Pool Exhausted",
      "severity": "CRITICAL",
      "status": "active",
      "affected_services": ["order-service", "checkout-service"],
      "created_at": "2026-11-24T10:00:11Z"
    }
  ]
}
```

---

### 9. Telemetry Source Health Summary
- **Route:** `GET /api/v1/overview/source-health`
- **Description:** Status and health indicators of configured log intake streams.
- **Response 200 OK:**
```json
{
  "sources": [
    {
      "id": "src-uuid-1",
      "name": "API Gateway Cluster",
      "service_name": "api-gateway",
      "source_type": "HTTP Stream",
      "health": "healthy",
      "last_seen": "2026-11-24T10:00:01Z"
    }
  ]
}
```

---

### 10. Workspace Preferences (Get)
- **Route:** `GET /api/v1/settings/preferences`
- **Description:** Retrieves workspace UI configurations including theme, density, timezone, and auto-refresh intervals.
- **Response 200 OK:**
```json
{
  "id": 1,
  "theme": "dark",
  "sidebar_collapsed": false,
  "display_density": "comfortable",
  "timezone": "UTC",
  "auto_refresh_enabled": true,
  "auto_refresh_interval": 30,
  "updated_at": "2026-11-24T22:30:00Z"
}
```

---

### 11. Workspace Preferences (Update)
- **Route:** `PATCH /api/v1/settings/preferences`
- **Description:** Updates workspace configurations with partial payload updates.
- **Request Body (Partial):**
```json
{
  "theme": "light",
  "display_density": "compact",
  "auto_refresh_interval": 15
}
```
- **Response 200 OK:** Returns updated `WorkspacePreferenceResponse`.

---

## Standard Error Response Format
All 4xx and 5xx responses conform to a unified error schema:
```json
{
  "detail": "Description of the error condition",
  "request_id": "8f8c2b54-1b12-4f76-80f0-c5332f143c7b",
  "status_code": 404
}
```
