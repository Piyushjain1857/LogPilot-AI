# LogPilot AI — Phase 7: Intelligent Anomaly Detection Engine

## Overview

The LogPilot AI Intelligent Anomaly Detection Engine provides multi-method statistical and machine learning anomaly detection for distributed cloud-native services and system logs.

It monitors rolling time-window feature vectors and surfaces operational metric anomalies with statistical confidence intervals, dynamic baseline tracking, and surrounding trace evidence.

---

## 1. Multi-Method Detection Algorithms

| Algorithm | Method Class | Primary Anomaly Targets | Mathematical Formulation |
|---|---|---|---|
| **Z-Score** | Parametric Statistical | Sudden magnitude bursts, Gaussian outliers | $$z = \frac{x - \mu}{\sigma + \epsilon}$$ flagged if $z > \theta_{\text{z}}$ (default 3.0) |
| **Rolling MAD** | Non-Parametric Robust | Bursty, non-Gaussian distributions, fat-tailed traffic | $$\text{Mod } z = \frac{0.6745 \cdot (x - \text{median})}{\text{MAD} + \epsilon}$$ flagged if $\text{Mod } z > \theta_{\text{mad}}$ (default 3.5) |
| **EWMA** | Sequential Drift & Shift | Mean drifts, gradual degradation, persistent surges | $$S_t = \alpha Y_t + (1 - \alpha) S_{t-1}$$ flagged if $|x - S_t| > \theta_{\text{ewma}} \cdot \sigma$ |
| **Isolation Forest** | Multivariate Machine Learning | Complex multi-dimensional outliers | Ensemble of isolation trees partitioning joint feature space $\mathbf{x} = [\text{vol}, \text{err\_rate}, \text{5xx\_rate}, P_{95}]$ |

---

## 2. Metric Feature Engineering

Logs are aggregated into tumbling windows ($1\text{m}, 5\text{m}, 15\text{m}, 1\text{h}$) per service:
- **`log_volume`**: Total count of log records within the window.
- **`error_rate`**: Proportion of log entries with severity `ERROR` or `CRITICAL` ($N_{\text{err}} / N_{\text{total}}$).
- **`http_5xx_rate`**: Frequency of HTTP status codes in $[500, 599]$ extracted from structured log metadata.
- **`p95_latency_ms`**: 95th percentile request latency extracted from `duration_ms`.

---

## 3. Database Architecture

### `anomalies`
- `id`: Unique integer identifier.
- `detected_at`: Timestamp when the anomaly was flagged.
- `time_window_start`, `time_window_end`: Exact bounding window of the detected event.
- `service_name`: Affected service.
- `anomaly_type`: `ERROR_SPIKE`, `VOLUME_SURGE`, `STATUS_5XX_SURGE`, `LATENCY_P95_BREACH`, `MULTIVARIATE_ISOLATION_OUTLIER`.
- `severity`: Categorized into `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`.
- `anomaly_score`: Normalized confidence score in $[0.0, 1.0]$.
- `algorithm`: `Z_SCORE`, `MAD`, `EWMA`, `ISOLATION_FOREST`.
- `metric_name`: The primary trigger metric.
- `observed_value`, `expected_value`, `threshold`: Quantitative diagnostic comparison.
- `context_payload`: JSON containing `sample_log_ids`, sample messages, trace IDs, and feature snapshots.
- `status`: Lifecycle state (`ACTIVE`, `ACKNOWLEDGED`, `RESOLVED`, `FALSE_POSITIVE`).

### `service_baselines`
Maintains rolling statistical baselines per service, metric, and window size (`mean`, `std_dev`, `median`, `mad`, `ewma_mean`, `p95`, `min_val`, `max_val`, `sample_count`).

### `anomaly_detection_runs`
Audit history of detection executions, analyzing windows, detected count, and diagnostic summaries.

---

## 4. REST API Endpoints

- `GET /api/v1/anomalies`: List anomalies with multi-factor filtering (`service`, `severity`, `status`, `algorithm`, `start_time`, `end_time`) and pagination.
- `GET /api/v1/anomalies/{anomaly_id}`: Detailed diagnostic view with baseline comparison and surrounding logs.
- `PATCH /api/v1/anomalies/{anomaly_id}/status`: Lifecycle transitions (`ACTIVE` $\to$ `ACKNOWLEDGED` $\to$ `RESOLVED` / `FALSE_POSITIVE`).
- `POST /api/v1/anomalies/detect`: Execute manual or scheduled anomaly detection run.
- `GET /api/v1/anomalies/statistics`: Metric overview, critical alerts count, average anomaly score, and 24-hour hourly distribution trend.
- `GET /api/v1/anomalies/baselines`: Query current service baselines.
- `POST /api/v1/anomalies/baselines/rebuild`: Recompute baseline statistics from historical records.
- `GET /api/v1/anomalies/configuration`: View algorithm sensitivity thresholds.
- `PATCH /api/v1/anomalies/configuration`: Update algorithm sensitivity thresholds.

---

## 5. UI Features

1. **Anomaly Explorer (`/app/anomalies`)**:
   - Primary KPI summary cards (Active Anomalies, Critical Alerts, Avg Anomaly Score, Top Outlier Service).
   - 24-Hour Anomaly Distribution Trend chart (Recharts AreaChart).
   - Real-time Anomalies Table with severity indicators, score meters, algorithm badges, and action buttons.
   - Diagnostic Detail Drawer with baseline comparisons and surrounding logs table.
   - Run Detection modal with custom time range, bucket size, and algorithm selection.
