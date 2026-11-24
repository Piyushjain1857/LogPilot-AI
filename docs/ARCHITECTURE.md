# LogPilot AI — System Architecture (Phase 1 Foundation)

**Tagline:** Detect. Diagnose. Resolve.  
**Hackathon:** Tech Fusion 4.0 — Codestorm | **Track:** Enterprise & Industry | **Problem Statement:** PS-01A (Logs Analyser & Troubleshooter Agent)

---

## 1. High-Level Architecture Overview

LogPilot AI is structured as a decoupled full-stack AIOps platform. The architecture separates high-throughput real-time ingestion, deterministic statistical clustering/parsing, and non-deterministic LLM reasoning (Gemini) into distinct stages with well-defined service boundaries.

```
+-----------------------------------------------------------------------------------+
|                                 LOG SOURCES                                       |
|  [Application Services]  [K8s / Containers]  [Databases]  [API Gateways]  [Files]  |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                              BACKEND (FastAPI)                                    |
|                                                                                   |
|  +-------------------+    +----------------------+    +-----------------------+   |
|  | Ingestion Engine  | -> | Normalization/Parser | -> | Anomaly & Clustering  |   |
|  | (HTTP / WS / File)|    | (Regex / Drain3)     |    | (Z-Score / Templates) |   |
|  +-------------------+    +----------------------+    +-----------------------+   |
|                                                                   |               |
|                                                                   v               |
|  +-------------------+    +----------------------+    +-----------------------+   |
|  | Remediation Eng.  | <- | Gemini AI Agent Core | <- | Incident Correlation  |   |
|  | (Playbooks-Draft) |    | (Root Cause Analysis)|    | (Trace & Time-Window) |   |
|  +-------------------+    +----------------------+    +-----------------------+   |
|            |                                                      |               |
|            +-----------------------+------------------------------+               |
|                                    v                                              |
|                           [Storage / Database]                                    |
|                      SQLite (Phase 1) / TimescaleDB                               |
+-----------------------------------------------------------------------------------+
                                         |
                                 REST API & WebSocket
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                               FRONTEND (React + Vite)                             |
|  - Enterprise Observability App Shell (Dark Theme #090E19)                        |
|  - Real-time Log Stream Viewer & Filter                                           |
|  - Anomaly & Incident Correlation Graph (React Flow)                              |
|  - Metric & Timeline Charts (Recharts)                                            |
|  - AI Root Cause Analysis & Playbook Inspector                                    |
+-----------------------------------------------------------------------------------+
```

---

## 2. Component Implementation Status Matrix

To maintain technical transparency, every component is classified as either **Implemented (Phase 1)** or **Planned (Subsequent Phases)**:

| Component | Status | Details in Phase 1 |
|---|---|---|
| **FastAPI Core & Lifecycle** | **Implemented** | Application lifecycle lifespan, versioned routing (`/api/v1`), health checks, system status, capabilities, and overview counts. |
| **Database Models & ORM** | **Implemented** | SQLAlchemy 2.0 schema for `LogSource`, `LogEntry`, `LogCluster`, `Incident`, `IncidentLog`, `AnalysisRun`, `RemediationPlaybook`, `SystemEvent`. |
| **Security & Middleware** | **Implemented** | Request ID generation (`X-Request-ID`), process timing (`X-Process-Time`), restricted CORS, sensitive data redaction utility, centralized error handling. |
| **Frontend Shell & Design** | **Implemented** | Dark AIOps design system (#090E19, #111827), accessible contrast, responsive sidebar, breadcrumbs, backend connection indicator, clean modular CSS. |
| **Landing Page & Routing** | **Implemented** | Complete 12-route routing table with active pages and distinct future-feature placeholders. |
| **System Overview Dashboard** | **Implemented** | Real-time database metrics query, health status, capabilities checklist, and live backend connection state. |
| **Log Ingestion & Upload** | **Implemented** | Multi-format upload pipeline (.log, .txt, .csv, .json, .jsonl), SHA-256 deduplication, 25MB limits, binary null-byte defense. |
| **Log Parsers & Redactor** | **Implemented** | `TextLogParser` (multiline stack traces), `CSVLogParser` (auto/manual mapping), `JSONLogParser`, `JSONLLogParser`, inline secret redaction. |
| **Upload Wizard & Explorer** | **Implemented** | 4-step upload wizard modal, live progress polling, LogSourcesPage, and LogExplorerPage with server-side pagination & filtering. |
| **Drain3 Log Parser** | *Planned (Phase 4)* | Extensible interface prepared in `backend/app/parsers/`. |
| **Anomaly Detection (ML)** | *Planned (Phase 5)* | Extensible service hooks prepared in `backend/app/analytics/`. |
| **Error Clustering Engine** | *Planned (Phase 6)* | Extensible service hooks prepared in `backend/app/clustering/`. |
| **Root Cause Correlation** | *Planned (Phase 7)* | Trace-based correlation hooks in `backend/app/correlation/`. |
| **Gemini AI Root Cause Agent** | *Planned (Phase 8)* | Google Gen AI SDK integration hooks in `backend/app/agents/`. Safe fallback when unconfigured. |
| **Remediation Execution** | *Planned (Phase 9)* | Playbook generation. Strict security guard: `ENABLE_REMEDIATION_EXECUTION=false` by default. |

---

## 3. Detailed Data Pipeline (End-to-End)

### Step 1: Ingestion
- Ingest logs via file upload (LOG, JSONL, CSV), API streaming, or agent webhooks.
- Pass through the `SensitiveDataRedactor` to strip credentials, auth tokens, passwords, and private keys *before* storage.

### Step 2: Parsing & Normalization
- Normalize multi-format logs into the canonical `LogEntry` schema:
  - Timestamp (UTC ISO 8601)
  - Severity level (`DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`)
  - Service Name
  - Message & Raw Message
  - Distributed tracing context (`trace_id`, `span_id`)
  - Arbitrary structured metadata (`metadata_json`)

### Step 3: Clustering & Anomaly Detection
- Fast online template extraction via Drain3 parses dynamic variables (`<*>` wildcard tokens).
- Statistical z-score and moving-window rate anomaly detection identify sudden error bursts and latency spikes.

### Step 4: Incident Correlation
- Log errors sharing identical `trace_id`s or co-occurring across dependent microservices within temporal windows (e.g. 30s) are grouped into an `Incident`.

### Step 5: AI Troubleshooting & Root Cause Analysis
- The Gemini AI Agent receives the clustered error context, affected service topology, recent system events (e.g. deployments), and error stack traces.
- The agent outputs:
  - Concise root cause hypothesis
  - Supporting trace evidence
  - Confidence score
  - Multi-step remediation playbook (with human approval gate)

---

## 4. Security Principles

1. **Untrusted Input Assumption:** All log payloads are treated as untrusted text. No log content is ever evaluated as code or passed directly to bash/SQL interpreters.
2. **AI Command Injection Protection:** Log content is fenced within prompt boundaries; AI recommendations never trigger automated shell commands without human-in-the-loop verification and allowlist checks.
3. **Redaction at Ingestion:** Sensitive patterns (Bearer tokens, AWS keys, JWTs, password assignments) are sanitized.
4. **Isolated Development Storage:** Local SQLite storage is restricted to server-side access; static directories never expose raw logs or database files.
