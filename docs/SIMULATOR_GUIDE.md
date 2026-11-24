# Synthetic Microservice Simulator Guide

The LogPilot AI Microservice Simulator (`simulators/`) simulates realistic multi-service distributed application failures, traffic spikes, database regressions, and recovery lifecycles for testing and demonstrating AIOps capabilities.

---

## 1. Directory Structure

```text
simulators/
├── microservice_simulator.py  # Standalone CLI orchestration script
├── scenarios.py               # Deterministic scenario definitions (A - E)
├── log_generator.py           # Correlated distributed trace event generator
└── README.md                  # Simulator usage and scenario descriptions
```

---

## 2. Simulated Microservices

The generator simulates a complete microservice e-commerce topology:
1. `api-gateway`: Edge reverse proxy routing public requests.
2. `auth-service`: JWT authentication and session tokens.
3. `order-service`: Order placement and transaction management.
4. `payment-service`: External payment gateway processor.
5. `inventory-service`: Warehouse stock reservations and catalog.
6. `notification-service`: Email and SMS event notifications.

---

## 3. Operational Scenarios

| Scenario | Name | Behavior & Failure Pattern |
|---|---|---|
| **A** | `NORMAL` | Steady-state operations; 97% INFO HTTP 200/201, 2% WARNING cache misses, <1% transient errors. |
| **B** | `DATABASE_FAILURE` | Database pool exhaustion in `order-service` cascading upstream to `api-gateway` with HTTP 500/503 errors and downstream checkout timeouts. |
| **C** | `DEPLOYMENT_REGRESSION`| Post-deploy crash loop in `auth-service` caused by unhandled `NullPointerException` on user token validation. |
| **D** | `TRAFFIC_SPIKE` | 10x traffic volume surge triggering circuit breaker trip in `inventory-service` and HTTP 429 rate limiting. |
| **E** | `RECOVERY` | Service transition: 10 seconds normal -> 15 seconds severe database collapse -> 15 seconds self-healing recovery. |

---

## 4. Running the Simulator

### Interactive Mode:
```bash
python simulators/microservice_simulator.py \
  --token "lpt_your_ingestion_token" \
  --scenario B \
  --rate 25 \
  --duration 60
```

### CLI Arguments:
- `--scenario`: Scenario key (`A`, `B`, `C`, `D`, `E`). Defaults to `A`.
- `--rate`: Average log records per second. Defaults to `10`.
- `--duration`: Total runtime in seconds (0 for indefinite). Defaults to `30`.
- `--token`: Source ingestion token (`lpt_...`). Overrides `LOGPILOT_INGESTION_TOKEN` env var.
- `--api-url`: Backend base URL. Defaults to `http://127.0.0.1:8000`.
- `--seed`: Deterministic random seed for reproducible benchmark runs.
