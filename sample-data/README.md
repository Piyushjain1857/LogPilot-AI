# Synthetic Sample Log Dataset (LogPilot AI)

> **Important Notice:** This dataset contains **100% synthetic, generated logs** created solely for testing, validation, and benchmarking of LogPilot AI parsers, anomaly detectors, and correlation algorithms.
> **DO NOT** treat these logs as real production telemetry or operational incidents.

## Scenarios Covered

1. **Normal API Requests (`api-gateway`)**:
   - HTTP 200/201 requests, routing, and healthy payload responses.
2. **Authentication Failures (`auth-service`)**:
   - Expired JWT tokens, invalid client credentials, and rate-limit thresholds.
3. **Database Connection Failures (`order-service`, `inventory-service`)**:
   - Connection pool exhaustion, timeout connecting to read replica, retry exhaustion.
4. **HTTP 500 & Unhandled Exceptions (`checkout-service`)**:
   - `NullReferenceException` / `KeyError` during checkout cart calculation.
5. **Downstream Service Timeouts (`payment-service`)**:
   - Gateway timeout (HTTP 504) waiting for external banking provider webhook.
6. **Deployment Events (`deploy-orchestrator`)**:
   - Canary deployment started, health probe failure detected, automatic rollback triggered.
7. **Recovery Events (`circuit-breaker`, `order-service`)**:
   - Circuit breaker transition from Open to Half-Open to Closed after upstream DB recovers.

## Formats Provided

- `synthetic_logs.log`: Standard unstructured / RFC 5424-style plain text log file.
- `synthetic_logs.jsonl`: Structured JSON Lines format with explicit `timestamp`, `level`, `service`, `trace_id`, and `metadata`.
- `synthetic_logs.csv`: Comma-separated values format for tabular processing and baseline ML benchmarking.
