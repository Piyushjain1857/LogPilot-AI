# LogPilot AI — Phase 13: Premium Interactive Monitoring Dashboard (AIOps Command Center)

## 1. Executive Summary

Phase 13 establishes the **AIOps Command Center** for LogPilot AI. Transforming `/app` (OverviewPage) into a unified, high-density, real-time observability control plane inspired by Datadog, Grafana, and Linear, this phase delivers:
- **Unified System Pulse Banner:** Consolidated System Health Index (0-100%), live ingestion velocity in Events Per Second (EPS), error rates per minute, and global multi-dimension filtering controls.
- **Microservice Dependency Health Matrix:** Real-time health classification (`HEALTHY`, `DEGRADED`, `CRITICAL`), error saturation percentages, and average round-trip latency across all 7 monitored services (`gateway-service`, `order-service`, `payment-service`, `auth-service`, `notification-service`, `postgres-primary`, `redis-cluster`).
- **Global Time Horizon & Service Synchronization:** Coordinated time window filtering (15m, 1h, 6h, 24h, 7d) and single-click service isolation across all charts and metrics.
- **Global Command Palette (Cmd+K / Ctrl+K):** Universal modal navigator accessible from anywhere in the app, supporting instant route jumping and natural language log query execution.
- **Real-Time Notification Center:** Live operator alert system (`/api/v1/notifications`) alerting on critical anomalies, incident escalations, and human-in-the-loop playbook approval gates with a clear-all action and persistent unread badge counter.

---

## 2. Architecture & Data Model

### `Notification` Table
- `id`: UUID primary key
- `title`: Alert title
- `message`: Contextual description
- `severity`: `INFO`, `WARNING`, `CRITICAL`
- `category`: `INCIDENT`, `ANOMALY`, `PLAYBOOK`, `SYSTEM`
- `link`: Direct deep-link URL (e.g. `/app/incidents`, `/app/remediation`)
- `is_read`: Boolean read status
- `created_at`: UTC timestamp

### Telemetry Formulations
- **System Health Index ($H \in [10, 100]$):**
  $$H = 100 - \min(40, 4 \times E_{\text{rate}}) - \min(45, 20 \times I_{\text{active}}) - \min(15, 3 \times A_{\text{open}})$$
- **Operational Status:**
  - `HEALTHY` if $H \ge 85$
  - `DEGRADED` if $60 \le H < 85$
  - `CRITICAL` if $H < 60$

---

## 3. API Endpoints

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/overview/service-matrix` | Returns real-time health, latency, log count, and error rates across all 7 microservices |
| `GET` | `/api/v1/overview/command-center` | Returns consolidated system health index, EPS velocity, and anomaly counters |
| `GET` | `/api/v1/notifications` | Returns operator notifications (supports `unread_only=true`) |
| `POST` | `/api/v1/notifications/{id}/read` | Marks a specific notification as read |
| `POST` | `/api/v1/notifications/clear` | Marks all notifications as read |

---

## 4. Verification & Test Metrics

- **Backend Pytest Suite:** 3 dedicated tests in `backend/tests/test_phase13_dashboard.py` verifying service matrix calculations, command center telemetry scoring, and notifications lifecycle. Total backend tests passing: **82 / 82**.
- **Frontend Vitest Suite:** 4 dedicated tests in `frontend/src/tests/phase13_dashboard.test.jsx` verifying `SystemPulseBanner`, `ServiceHealthMatrix`, `CommandPalette` query search, and `OverviewPage` end-to-end integration. Total frontend tests passing: **75 / 75** across 14 test suites.
- **Linting & Type Safety:** 0 ESLint errors, 0 warnings.
- **Production Bundle:** Clean Vite build.
