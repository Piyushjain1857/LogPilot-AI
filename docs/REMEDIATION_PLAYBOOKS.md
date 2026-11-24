# LogPilot AI — Phase 12: Intelligent Remediation & Automated Playbooks

## 1. Executive Summary

Phase 12 delivers the **Intelligent Remediation & Automated Playbooks** engine for LogPilot AI. Bridging detection, root cause analysis, and operational remediation, this system provides:
- **Predefined Verified Playbook Library:** 6 cloud-native runbooks covering database connection exhaustion, Kubernetes container OOM, circuit breaker auto-recovery, Redis cache stampedes, ingress rate-limiting, and emergency disk space recovery.
- **Human-in-the-Loop (HITL) Safety Gates:** Danger-tiered operational steps (`SAFE`, `CAUTION`, `CRITICAL_DESTRUCTIVE`) where non-trivial actions require explicit human operator confirmation.
- **Zero Automatic Command Execution Policy & Security Sandbox:** Commands are strictly validated against an allowlist of permitted operational tools (`SELECT`, `SHOW`, `ALTER SYSTEM SET`, `kubectl`, `curl`, `redis-cli`, `df`, `du`, `find`, `logrotate`). Destructive patterns (`rm -rf /`, piping to devices, arbitrary forks) are blocked by the preflight sandbox engine.
- **Isolated Dry-Run Simulation:** Deterministic simulation with realistic stdout streams, execution duration, and post-execution verification criteria.
- **Reversible Compensating Rollback:** Automated rollback procedures executing compensating commands in reverse order.
- **Multi-Format Automation Export:** One-click export to Kubernetes ConfigMaps/Jobs, Ansible Playbooks, and standalone Bash Runbook scripts.
- **Immutable Audit Trail:** All operator approvals, rejections, simulations, and rollbacks are recorded in `remediation_audit_logs`.

---

## 2. Predefined Playbook Catalog

| Number | Slug | Category | Target Service | Risk Tier | Downtime | Key Symptoms Addressed |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **PB-101** | `postgres-pool-recovery` | `DATABASE` | `postgres-primary` | `SAFE` | `0s` | Connection pool exhausted, too many connections, timeout acquiring connection |
| **PB-102** | `k8s-oom-pod-restart` | `CONTAINER` | `payment-service` | `CAUTION` | `0s` (rolling) | OOMKilled, exit code 137, Java heap space, pod restart loop |
| **PB-103** | `circuit-breaker-recovery` | `CIRCUIT_BREAKER`| `gateway-service` | `SAFE` | `0s` | CircuitBreaker OPEN, 503 gateway errors, CallNotPermittedException |
| **PB-104** | `redis-cache-mitigation` | `CACHE` | `redis-cluster` | `SAFE` | `0s` | Max number of clients reached, cache stampede, Jedis connection timeout |
| **PB-105** | `ingress-rate-limit-tuning`| `NETWORK` | `ingress-nginx` | `CAUTION` | `0s` | HTTP 429 Too Many Requests, burst saturation, ingress rate drops |
| **PB-106** | `disk-space-recovery` | `STORAGE` | `worker-service` | `CRITICAL_DESTRUCTIVE` | `0s` | No space left on device, errno 28, disk quota exceeded |

---

## 3. Architecture & Data Model

### `RemediationPlaybook`
- `id`: UUID primary key
- `playbook_number`: Human-readable identifier (e.g. `PB-101`)
- `incident_id`: Foreign key to `incidents.id` (nullable for catalog templates)
- `title`, `slug`, `category`, `description`, `target_service`
- `risk_level`: `SAFE`, `CAUTION`, `CRITICAL_DESTRUCTIVE`
- `estimated_downtime`: e.g. "0 seconds"
- `steps_json`: Array of structured step definitions
- `approval_status`: `pending_approval`, `partially_approved`, `approved`, `rejected`
- `execution_status`: `not_started`, `simulating`, `simulated`, `running`, `completed`, `rolled_back`, `failed`
- `simulation_log_json`: Historical simulation telemetry

### `RemediationAuditLog`
- `id`: UUID primary key
- `playbook_id`: Foreign key to `remediation_playbooks.id`
- `action`: `PLAYBOOK_SEEDED`, `STEP_APPROVED`, `STEP_REJECTED`, `SIMULATION_EXECUTED`, `ROLLBACK_EXECUTED`
- `step_number`: Target step number
- `performed_by`: Operator identity (e.g. `sre-lead`, `sandbox-engine`)
- `details_json`: Structured event parameters and notes

---

## 4. API Specification

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/remediation/playbooks` | List playbooks (filter by `category`, `risk_level`, `search`, `incident_id`) |
| `GET` | `/api/v1/remediation/playbooks/{id}` | Retrieve full playbook detail with step workflows |
| `POST` | `/api/v1/remediation/playbooks` | Register a custom operational playbook |
| `POST` | `/api/v1/remediation/recommend` | Given `incident_id`, return ranked playbooks with match scores and rationales |
| `POST` | `/api/v1/remediation/playbooks/{id}/approve` | Update human approval state for a gated step |
| `POST` | `/api/v1/remediation/playbooks/{id}/simulate` | Run dry-run simulation of approved steps in the sandbox |
| `POST` | `/api/v1/remediation/playbooks/{id}/rollback` | Execute compensating rollback actions in reverse order |
| `GET` | `/api/v1/remediation/playbooks/{id}/export` | Export playbook manifest (`yaml`, `ansible`, or `shell`) |
| `GET` | `/api/v1/remediation/audit-logs` | Retrieve immutable audit trail of operator decisions |

---

## 5. Verification & Test Metrics

- **Backend Pytest Suite:** 8 dedicated tests in `backend/tests/test_remediation_api.py` covering auto-seeding, detail retrieval, filtering, incident correlation, human approvals, sandbox simulation, unapproved step gating, multi-format export, and audit logging. Total backend tests passing: **79 / 79**.
- **Frontend Vitest Suite:** 4 dedicated tests in `frontend/src/tests/phase12_remediation.test.jsx` verifying page rendering, category filtering, search, approval toggles, and terminal simulation. Total frontend tests passing: **71 / 71**.
- **Linting & Type Safety:** 0 ESLint errors, 0 warnings.
- **Production Bundle:** Clean Vite build.
