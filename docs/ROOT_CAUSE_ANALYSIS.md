# LogPilot AI — Phase 10: Evidence-Based Root Cause Analysis Engine

## Overview

The LogPilot AI Evidence-Based Root Cause Analysis (RCA) Engine reconstructs failure cascades across distributed microservices using graph theory (NetworkX) and multi-factor causal ranking.

Rather than relying on ungrounded heuristics or black-box guessing, LogPilot AI pairs every causal hypothesis with verified immutable evidence: exact log identifiers, timestamps, distributed trace IDs, and statistical anomaly scores.

---

## 1. NetworkX Topological Dependency Engine

LogPilot AI dynamically constructs a directed graph $G = (V, E)$ modeling service dependencies:
- **Vertices ($V$)**: Discovered microservice nodes (`api-gateway`, `order-service`, `payment-service`, `postgres-db`).
- **Directed Edges ($E$)**: Caller-to-callee dependencies extracted from distributed trace transitions ($u \to v$).
- **Topological In-Degree & Out-Degree**: Distinguishes edge ingress proxies (in-degree = 0) from intermediate workers (in-degree $\ge 1$, out-degree $\ge 1$) and deep leaf dependencies (out-degree = 0, in-degree $\ge 1$, e.g. databases, queues).

---

## 2. Multi-Factor Causal Ranking Formulation

Candidate root cause services are ranked via a combined multi-factor scoring function:
$$C(\text{service}) = 0.35 \cdot S_{\text{time}} + 0.25 \cdot S_{\text{topo}} + 0.25 \cdot S_{\text{error}} + 0.15 \cdot S_{\text{trace}}$$

| Factor | Metric Name | Mathematical Formulation | Rationale |
|---|---|---|---|
| **$S_{\text{time}}$** | **Temporal Precedence** | $S_{\text{time}} = 1.0 - \frac{t_{\text{first\_error}} - t_{\text{origin}}}{\Delta T}$ | The originating root cause must fail before downstream services show cascading symptoms. |
| **$S_{\text{topo}}$** | **Topological Depth** | Leaf/Deepest sink = $0.95$, Intermediate = $0.75$, Gateway = $0.55$ | Downstream storage and bottleneck services have higher structural responsibility than pass-through proxies. |
| **$S_{\text{error}}$** | **Severity & Volume** | $0.5 \frac{N_{\text{crit}}}{N_{\text{err}}} + 0.3 \min(1, \frac{N_{\text{err}}}{5}) + 0.2 S_{\text{anomaly}}$ | Proportion of unhandled critical exceptions and statistical deviation strength. |
| **$S_{\text{trace}}$** | **Cross-Trace Correlation** | $0.85$ if present in shared failing trace spans, else $0.30$ | Verified propagation across the distributed trace waterfall. |

---

## 3. Node Role Classification

In the causal propagation graph, services are categorized into discrete operational states:
1. **`ROOT_CAUSE`**: Highest-ranked causal origin (rendered with red pulsating glow, icon, and primary badge).
2. **`PROPAGATING`**: Intermediate services whose circuit breakers or timeouts were tripped by the upstream root cause.
3. **`SYMPTOM`**: Edge consumer or gateway reporting downstream errors (e.g. 502/504).
4. **`HEALTHY`**: Unaffected nodes in the topology.

---

## 4. Grounded Evidence Citations

Every causal hypothesis is backed by zero-hallucination citations:
- `log_id`: Immutable database identifier.
- `timestamp`: UTC observation time.
- `service_name`: Emitting service.
- `severity`: Log level (`CRITICAL`, `ERROR`).
- `message`: Full raw message snippet.
- `trace_id`: Correlated distributed trace identifier.
- `relevance_score`: Algorithmic attribution relevance.

---

## 5. API Endpoints

- `POST /api/v1/root-cause/analyze`: Run multi-factor RCA on-demand for an incident or sliding lookback window.
- `GET /api/v1/root-cause/topology`: Get global inferred service dependency graph.
- `GET /api/v1/root-cause/{analysis_id}`: Retrieve stored RCA run by ID.
- `GET /api/v1/root-cause/incident/{incident_id}`: Retrieve latest RCA result for an incident.

---

## 6. UI Capabilities (`/app/root-cause`)

1. **Incident & Time-Window Selector**: Seamlessly run RCA for active incidents or historical time intervals.
2. **Interactive React Flow Canvas**:
   - Custom `CausalServiceNode` with status badges, error counters, and anomaly score pills.
   - Animated edges depicting critical error propagation flows.
   - Topological tier auto-layout.
   - View toggle between **Causal Path Graph** and **Global Topology**.
3. **Ranked Hypotheses Column**:
   - Primary Root Cause badge and confidence score percentage.
   - Multi-factor breakdown meters ($S_{\text{time}}$, $S_{\text{topo}}$, $S_{\text{error}}$, $S_{\text{trace}}$).
   - Specific actionable remediation recommendations.
4. **Evidence Drawer**:
   - Drill-down inspector displaying exact verified log messages, trace IDs, and timestamps supporting each hypothesis.
