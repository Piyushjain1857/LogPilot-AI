# LogPilot AI — Synthetic Microservice Log Simulator

A standalone load generation and incident demonstration simulator for Hackathon presentations and live AIOps troubleshooting demos.

## Available Scenarios

- `normal`: Standard operations across `api-gateway`, `auth-service`, `inventory-service`, `payment-service` with HTTP 200s and healthy latencies.
- `database-failure`: Connection pool saturation (100/100 limit), 5000ms query timeouts, payment failures, circuit breaker trips, and cascading HTTP 503 errors sharing correlated trace IDs.
- `deployment-regression`: Canary v2.4.1 deployment error spike (`KeyError: 'tax_rate_id'` at `CheckoutCalculator.py:142`), HTTP 500s, probe failures, and automatic rollback to v2.4.0.
- `traffic-spike`: Sudden concurrency burst, high response latencies, and HTTP 429 rate limit warnings.
- `recovery`: Database pool recovery, circuit breaker transition back to CLOSED, and successful transaction resolution.

## Quick Start

### 1. Requirements

Ensure `httpx` is installed:

```bash
pip install httpx
```

### 2. Obtain an Ingestion Token

In the LogPilot AI web console (*Log Sources* -> *Add Source* -> *Synthetic Simulator*), generate an ingestion credential.

Export the token:

```bash
export LOGPILOT_SIMULATOR_TOKEN="lp_live_YOUR_GENERATED_TOKEN"
```

### 3. Run Demo Scenarios

#### Normal Operations:
```bash
python simulators/microservice_simulator.py --scenario normal --rate 5 --duration 60
```

#### Database Pool Exhaustion & Cascade:
```bash
python simulators/microservice_simulator.py --scenario database-failure --rate 10 --duration 45
```

#### Canary Deployment Regression:
```bash
python simulators/microservice_simulator.py --scenario deployment-regression --rate 10 --duration 45
```

#### Sudden Traffic Burst:
```bash
python simulators/microservice_simulator.py --scenario traffic-spike --rate 25 --duration 30
```

#### Post-Incident Recovery:
```bash
python simulators/microservice_simulator.py --scenario recovery --rate 5 --duration 30
```
