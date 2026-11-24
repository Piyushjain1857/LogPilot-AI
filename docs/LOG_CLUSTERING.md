# LogPilot AI — Phase 8: Intelligent Log Clustering & Error Grouping

## Overview

The LogPilot AI Intelligent Log Clustering & Pattern Mining Engine compresses high-velocity, repetitive log streams into structured, human-readable templates using the Drain3 algorithm enhanced with pre-masking domain tokenization.

By grouping recurring error variations into canonical patterns, LogPilot AI eliminates alert fatigue, extracts dynamic variables (user IDs, IPs, latency numbers, UUIDs), tracks pattern evolution over time, and supplies high-fidelity signatures to the incident correlation engine.

---

## 1. Mining Architecture & Pre-Masking Pipeline

Raw log messages often contain high-entropy dynamic tokens that prevent standard clustering algorithms from finding common roots. LogPilot AI applies a deterministic multi-stage regex pre-masking tokenizer prior to parsing via the prefix tree (Drain3):

| Token Category | Regex Pattern Rule | Replaced Token |
|---|---|---|
| **UUID** | `[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}` | `<UUID>` |
| **IP Address** | `\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b(?::[0-9]+)?` | `<IP>` |
| **Hex Hashes** | `\b0x[0-9a-fA-F]+\b\|\b[0-9a-fA-F]{16,64}\b` | `<HEX>` |
| **File Paths** | `(?:\/[\w\.\-]+){2,}` | `<PATH>` |
| **URLs** | `https?:\/\/[^\s]+` | `<URL>` |
| **Numbers & Ports** | `\b\d+\b` | `<NUM>` |

### Canonical Signature Generation
Each extracted template string (e.g. `Payment timeout for user <NUM> on gateway <IP>`) is normalized and passed through SHA-256 with the service name:
$$\text{Signature Hash} = \text{SHA256}(\text{service\_name} + \text{canonical\_template})[:32]$$
This guarantees reproducible, collision-resistant cluster identity across ingestion batches.

---

## 2. Variable Parameter Extraction

When a log matches a cluster template, the dynamic variables corresponding to masked placeholders (`<NUM>`, `<IP>`, `<UUID>`) are extracted and maintained as an aggregated distribution in `variable_parameters`:
```json
{
  "num": ["1001", "1002", "1050"],
  "ip": ["192.168.1.10", "10.0.0.15"],
  "uuid": ["c29b71a2-45e0-4ecb-99f8-b391512db4bc"]
}
```
This enables engineers to immediately distinguish whether a recurring failure is universal or isolated to a specific tenant, database shard, or gateway node.

---

## 3. Database Architecture

### `log_clusters`
- `id`: Unique string identifier (`cl-xxx`).
- `signature_hash`: Deterministic 32-character SHA-256 identifier.
- `service_name`: Name of service emitting the logs.
- `name`: Clean human-readable title derived from the template.
- `template`: Normalized template with `<VAR>` wildcards.
- `severity`: Dominant severity level (`CRITICAL`, `ERROR`, `WARNING`, `INFO`).
- `occurrence_count`: Total occurrences aggregated across all ingestion runs.
- `error_count`: Number of occurrences with error/critical level.
- `first_seen_at`: First timestamp when pattern was observed.
- `last_seen_at`: Most recent occurrence timestamp.
- `sample_log_ids`: JSON array of sample log identifiers for forensic drill-down.
- `variable_parameters`: JSON map of extracted unique parameters.
- `status`: Lifecycle state (`ACTIVE`, `MUTED`, `RESOLVED`).

### `cluster_evolutions`
Tracks hourly or daily trend buckets per cluster:
- `cluster_id`: Reference to parent `log_clusters.id`.
- `bucket_time`: Start of the time bucket.
- `frequency`: Count of occurrences within the bucket window.
- `error_rate`: Ratio of errors during that bucket.

---

## 4. API Endpoints

- `GET /api/v1/clusters`: Paginated, filterable list of mined clusters (service, severity, status, search, sorting).
- `GET /api/v1/clusters/statistics`: High-level metrics: total patterns, active clusters, total grouped errors, 24h new patterns.
- `POST /api/v1/clusters/mine`: Trigger template mining over recent or unclustered log records.
- `GET /api/v1/clusters/{id}`: Detailed cluster view with evolution history, variable parameters, and sample member logs.
- `PATCH /api/v1/clusters/{id}/status`: Update cluster lifecycle status (`ACTIVE`, `MUTED`, `RESOLVED`).

---

## 5. UI Capabilities (`/app/clusters`)

1. **Cluster KPI Cards**: Total Patterns Mined, Active Clusters, Grouped Log Errors, New Clusters (24h).
2. **Cluster Evolution Chart**: 24-hour visual trend of top 5 clusters rendered with Recharts.
3. **Template Table**: Monospace template view highlighting `<NUM>`, `<IP>`, `<UUID>` in distinct blue badges, occurrence & error counters, and quick status actions (Mute, Resolve).
4. **Detail Drawer**: Complete forensic breakdown with template visualization, extracted dynamic variable badges, and live member logs with trace IDs.
5. **Instant Template Mining**: Button to trigger Drain3 pattern extraction directly from the UI.
