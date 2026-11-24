# LogPilot AI — Phase 9: Automated Incident Management System

## Overview

The LogPilot AI Automated Incident Management System correlates multi-service anomalies, pattern clusters, and error surges into unified, actionable operational incidents.

Rather than inundating on-call engineers with hundreds of disconnected alerts, LogPilot AI reconstructs cascading failure paths, maps blast radiuses across upstream and downstream services, assembles chronological forensic timelines, and tracks full operational lifecycles (`ACTIVE`, `INVESTIGATING`, `MITIGATED`, `RESOLVED`, `CLOSED`).

---

## 1. Multi-Signal Cross-Service Correlation Architecture

Modern distributed systems rarely fail in isolation. An unhandled database connection exhaustion in a database service immediately cascades into 504 timeouts in an order service, which subsequently triggers 502 bad gateways in an API gateway.

### Correlation Pipeline:
1. **Sliding Time-Window Clustering**:
   - Collects active statistical anomalies and high-severity error clusters within a configurable lookback window ($T_0 - \Delta t$).
   - Segments concurrent signals into chronological groups where contiguous events occur within a 15-minute sliding threshold:
     $$|t_i - t_{i-1}| \le 900\text{ seconds}$$
2. **Blast Radius Identification**:
   - Compiles unique service nodes involved across the signal group.
   - Designates the earliest anomalous deviation as candidate `primary_service` (origin).
3. **Automated Incident Title & Hypothesis Formulation**:
   - Cross-service cascade: `"Cascading Service Failure across payment-service, order-service, api-gateway"`
   - Single-service burst: `"Error Spike in order-service"` or `"Latency P95 Breach in checkout-service"`
   - Hypothesizes the initial trigger point and chronological escalation.
4. **Deduplication Engine**:
   - If an open (`active` or `investigating`) incident already exists for the originating service within the time window, new signals are appended to its timeline rather than generating duplicate incidents.
5. **Severity Calculation**:
   - Categorized as `CRITICAL` if any correlated anomaly or cluster is `CRITICAL`.
   - Categorized as `HIGH` if error bursts or `HIGH` anomalies are present.
   - Dynamically escalates an existing incident's severity if subsequent signals worsen.

---

## 2. Chronological Timeline Reconstruction

Every incident maintains an audit trail in `timeline_events_json`:
- **`ANOMALY_DETECTED`**: Statistical metric deviations (Z-score, Rolling MAD, EWMA, Isolation Forest).
- **`CLUSTER_SPIKE`**: Mined Drain3 error patterns with template and error volume.
- **`STATUS_CHANGED`**: Operator lifecycle transitions (`active` -> `investigating` -> `mitigated` -> `resolved`).
- **`NOTE_ADDED`**: Operator annotations and remediation insights.

---

## 3. Database Architecture

### `incidents`
- `id`: Unique string identifier (`UUID`).
- `incident_number`: Human-readable identifier (`INC-1001`, `INC-1002`).
- `title`: High-level operational incident title.
- `description`: Detailed incident synopsis.
- `severity`: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`.
- `status`: `active`, `investigating`, `mitigated`, `resolved`, `closed`.
- `primary_service`: The originating root service.
- `affected_services_json`: JSON array of impacted services.
- `root_cause_hypothesis`: Algorithmic hypothesis of the initial trigger.
- `timeline_events_json`: Chronological array of structured event objects.
- `metrics_snapshot_json`: Anomaly counts, cluster counts, and signal counts.
- `anomaly_ids_json`: Correlated anomaly foreign references.
- `cluster_ids_json`: Correlated cluster foreign references.
- `assigned_to`: Optional engineer/operator assignment.
- `resolution_notes`: Root-cause resolution summary.
- `first_detected_at`, `last_detected_at`, `mitigated_at`, `resolved_at`.

### `incident_logs`
Many-to-many junction table mapping `incidents.id` to `log_entries.id` for forensic drill-down.

---

## 4. API Endpoints

- `GET /api/v1/incidents`: Filter by `status`, `severity`, `service`, `search`, and pagination.
- `GET /api/v1/incidents/statistics`: KPI metrics: total incidents, active count, critical count, mitigated, resolved, and Mean Time to Resolution (MTTR).
- `POST /api/v1/incidents/correlate`: Trigger multi-signal correlation on-demand.
- `GET /api/v1/incidents/{id}`: Detailed incident view with timeline, blast radius, and forensic logs.
- `PATCH /api/v1/incidents/{id}/status`: Lifecycle transitions (`active`, `investigating`, `mitigated`, `resolved`, `closed`).
- `POST /api/v1/incidents/{id}/notes`: Append team notes to the incident timeline.

---

## 5. UI Capabilities (`/app/incidents`)

1. **KPI Metric Cards**: Total Incidents, Active Incidents (with critical count alert), Mitigated / In Progress, and Mean Time to Resolution (MTTR).
2. **Filter & Control Toolbar**: Full-text search by title/description/incident number, service filter, severity filter, status filter, and live correlation trigger button.
3. **Incident Management Table**: Severity badge, blast radius service chips (with red origin highlight), signals count, duration counter, status badge, inspect action.
4. **Interactive Detail Drawer**:
   - Status changer dropdown with automated audit trails.
   - Blast radius badges highlighting the origin service.
   - Initial root-cause hypothesis card.
   - Chronological vertical timeline with distinct colored icons for anomalies, cluster spikes, status changes, and operator notes.
   - Correlated forensic log viewer with raw message and trace IDs.
   - Real-time team note submission form.
