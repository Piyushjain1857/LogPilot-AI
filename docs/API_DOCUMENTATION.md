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

## Standard Error Response Format
All 4xx and 5xx responses conform to a unified error schema:
```json
{
  "detail": "Description of the error condition",
  "request_id": "8f8c2b54-1b12-4f76-80f0-c5332f143c7b",
  "status_code": 404
}
```
