# LogPilot AI — Phase 11: Gemini AI Troubleshooter & Autonomous Agent

## Overview

The LogPilot AI Troubleshooter Agent combines the official Google GenAI SDK (`google-genai`) with an autonomous ReAct diagnostic loop and strict zero-hallucination grounding.

When an operational incident occurs, the Troubleshooter autonomously queries read-only database tools, inspects distributed traces, retrieves statistical anomaly breaches, and synthesizes an authoritative 4-perspective diagnostic assessment (SRE, Database & Infrastructure, Application Runtime, Security) with step-by-step remediation playbooks.

---

## 1. Grounded ReAct Loop Architecture

The agent executes a deterministic, multi-turn reasoning and acting cycle:

```
[Incident or Symptom Query]
          │
          ▼
    ┌───────────┐
    │  THOUGHT  │ ➔ Formulates diagnostic hypothesis & strategy
    └─────┬─────┘
          │
          ▼
    ┌───────────┐
    │  ACTION   │ ➔ Calls read-only inspection tool (query_logs, inspect_trace, get_anomalies)
    └─────┬─────┘
          │
          ▼
    ┌───────────┐
    │OBSERVATION│ ➔ Receives immutable SQLite telemetry payload
    └─────┬─────┘
          │
          ▼
[Repeat until evidence is converged]
          │
          ▼
[Multi-Perspective Grounded Synthesis]
```

### Sanctioned Read-Only Tools (`app/agent/tools.py`)
1. **`get_incident_detail(incident_id)`**: Inspects incident severity, blast radius, and chronological progression.
2. **`query_logs(service, severity, limit, search)`**: Retrieves verified logs matching candidate failure signatures.
3. **`inspect_trace(trace_id)`**: Reconstructs end-to-end trace spans across microservice boundaries.
4. **`get_anomalies(service, limit)`**: Checks statistical anomaly deviations and confidence intervals.
5. **`get_service_topology()`**: Reads the NetworkX service communication graph.

---

## 2. Hybrid Dual-Engine Architecture

1. **Google GenAI SDK Engine (`gemini-2.5-flash`)**:
   - Activated whenever `GEMINI_API_KEY` is configured in `.env`.
   - Uses `from google import genai` (`genai.Client(api_key=...)`).
   - Ingests structured telemetry evidence as context and produces detailed multimodal insights.
2. **Grounded Deterministic Engine**:
   - Activated automatically when offline, unconfigured, or in CI/CD sandbox environments.
   - Operates on real database telemetry, metrics, and trace models without generating fake data or hallucinations.
   - Guarantees 100% test reliability and zero external API dependencies for mission-critical offline operations.

---

## 3. Four-Perspective Diagnostic Synthesis

Every analysis is evaluated across four distinct engineering disciplines:

| Perspective | Focus Area | Sample Diagnostic Output |
|---|---|---|
| **SRE & Reliability** | SLO error budget, cascade prevention, circuit breaking | SLO breach on `payment-service`. Cascaded to reverse proxy resulting in 504 Gateway Timeouts. |
| **Database & Infrastructure** | Pool saturation, lock contention, IOPS, slow queries | Connection acquisition queue backed up beyond maximum pool limit (100/100). |
| **Application Runtime** | Unhandled exceptions, retry storms, backpressure | Missing exponential backoff and jitter during database connection timeouts. |
| **Security & Access** | Authentication tokens, JWT validity, privilege escalation | Validated authentication audit logs; verified failures stem from resource contention. |

---

## 4. API Endpoints

- `POST /api/v1/troubleshooter/investigate`: Runs autonomous ReAct troubleshooting for an incident or custom query.
- `GET /api/v1/troubleshooter/investigations/{id}`: Retrieves stored investigation run, ReAct thought steps, and playbook.
- `POST /api/v1/troubleshooter/chat`: Interactive conversational agent grounded in verified log citations.

---

## 5. UI Capabilities (`/app/troubleshooter`)

1. **Target Incident & Custom Query Selector**: Seamlessly investigate active incidents or test custom failure hypotheses.
2. **Autonomous ReAct Execution Stream**: Step-by-step display of agent thoughts, tool badges, and expandable observation outputs.
3. **Multi-Perspective Diagnosis Cards**: Tabbed interface switching between SRE, Database, Application, and Security angles with severity badges.
4. **Actionable Remediation Playbook**: Copyable bash/kubectl commands, verification checks, and rollback plans.
5. **Grounded Diagnostic Chat**: Interactive conversation with real-time evidence citation confirmation.
