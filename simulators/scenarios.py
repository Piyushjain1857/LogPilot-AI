import random
import uuid
from typing import List, Dict, Any
from log_generator import SyntheticLogGenerator


def get_scenario_logs(scenario_name: str, batch_size: int = 5) -> List[Dict[str, Any]]:
    """
    Generates a burst of correlated microservice logs for a specific operational scenario.
    Supported scenarios:
    - normal: Standard healthy HTTP requests, auth checks, and DB reads.
    - database-failure: Cascading connection pool exhaustion and query timeouts.
    - deployment-regression: Canary release KeyError exceptions and 500 error spike.
    - traffic-spike: High concurrency volume, rate limit warnings, and latency elevation.
    - recovery: Self-healing circuit breaker resets and restored operational health.
    """
    trace_id = f"tr-sim-{uuid.uuid4().hex[:10]}"
    logs: List[Dict[str, Any]] = []

    if scenario_name == "normal":
        endpoints = ["/api/v1/orders/status", "/api/v1/checkout", "/api/v1/user/profile", "/api/v1/inventory/check"]
        for _ in range(batch_size):
            srv = random.choice(["api-gateway", "auth-service", "inventory-service", "payment-service"])
            ep = random.choice(endpoints)
            duration = random.randint(12, 120)
            logs.append(
                SyntheticLogGenerator.generate_event(
                    service=srv,
                    severity="INFO",
                    message=f"HTTP 200 GET {ep} duration={duration}ms status=SUCCESS",
                    trace_id=trace_id,
                    metadata={"endpoint": ep, "duration_ms": duration, "status_code": 200},
                )
            )

    elif scenario_name == "database-failure":
        logs.append(
            SyntheticLogGenerator.generate_event(
                service="database-service",
                severity="CRITICAL",
                message="PostgreSQL connection pool exhausted: active_connections=100 max_connections=100 waiting_threads=42",
                trace_id=trace_id,
                metadata={"pool_size": 100, "waiting_queue": 42},
            )
        )
        logs.append(
            SyntheticLogGenerator.generate_event(
                service="inventory-service",
                severity="ERROR",
                message="Database query timeout after 5000ms: SELECT * FROM inventory_locks WHERE sku='SKU-998'",
                trace_id=trace_id,
                metadata={"timeout_ms": 5000, "sql_state": "57014"},
            )
        )
        logs.append(
            SyntheticLogGenerator.generate_event(
                service="payment-service",
                severity="ERROR",
                message="Transaction commit failed due to broken database pipe upstream",
                trace_id=trace_id,
            )
        )
        logs.append(
            SyntheticLogGenerator.generate_event(
                service="api-gateway",
                severity="WARNING",
                message="Circuit breaker tripped to OPEN state for downstream database-service (failure_rate=88%)",
                trace_id=trace_id,
                metadata={"circuit_state": "OPEN", "failure_threshold": 0.5},
            )
        )
        logs.append(
            SyntheticLogGenerator.generate_event(
                service="api-gateway",
                severity="ERROR",
                message="HTTP 503 Service Unavailable returned to client ip=192.168.1.42 path=/api/v1/checkout",
                trace_id=trace_id,
                metadata={"status_code": 503},
            )
        )

    elif scenario_name == "deployment-regression":
        logs.append(
            SyntheticLogGenerator.generate_event(
                service="checkout-service",
                severity="INFO",
                message="Deployment roll-out started: canary pod checkout-service-v2.4.1 initialized",
                trace_id=trace_id,
                metadata={"version": "v2.4.1", "canary_weight": 0.1},
            )
        )
        logs.append(
            SyntheticLogGenerator.generate_event(
                service="checkout-service",
                severity="ERROR",
                message="Unhandled Exception at CheckoutCalculator.py:142 KeyError: 'tax_rate_id' not found in order payload",
                trace_id=trace_id,
                metadata={"exception_class": "KeyError", "file": "CheckoutCalculator.py", "line": 142},
            )
        )
        logs.append(
            SyntheticLogGenerator.generate_event(
                service="api-gateway",
                severity="ERROR",
                message="HTTP 500 Internal Server Error returned for POST /api/v1/checkout duration=48ms",
                trace_id=trace_id,
                metadata={"status_code": 500},
            )
        )
        logs.append(
            SyntheticLogGenerator.generate_event(
                service="checkout-service",
                severity="WARNING",
                message="Canary health check probe failed (consecutive_failures=3). Triggering automatic rollback to v2.4.0",
                trace_id=trace_id,
                metadata={"action": "rollback", "target_version": "v2.4.0"},
            )
        )

    elif scenario_name == "traffic-spike":
        for i in range(batch_size):
            dur = random.randint(350, 4200)
            status_code = 429 if dur > 2500 else 200
            sev = "WARNING" if status_code == 429 else "INFO"
            logs.append(
                SyntheticLogGenerator.generate_event(
                    service="api-gateway",
                    severity=sev,
                    message=f"High concurrency load spike: POST /api/v1/checkout duration={dur}ms status={status_code}",
                    trace_id=trace_id,
                    metadata={"duration_ms": dur, "status_code": status_code, "concurrency": 850},
                )
            )

    elif scenario_name == "recovery":
        logs.append(
            SyntheticLogGenerator.generate_event(
                service="database-service",
                severity="INFO",
                message="Database connection pool restored: active_connections=18/100 idle_connections=82",
                trace_id=trace_id,
                metadata={"pool_utilization": 0.18},
            )
        )
        logs.append(
            SyntheticLogGenerator.generate_event(
                service="api-gateway",
                severity="INFO",
                message="Circuit breaker transitioned to HALF_OPEN, probe successful, closing circuit",
                trace_id=trace_id,
                metadata={"circuit_state": "CLOSED"},
            )
        )
        logs.append(
            SyntheticLogGenerator.generate_event(
                service="payment-service",
                severity="INFO",
                message="All pending deferred transaction queues flushed and processed successfully",
                trace_id=trace_id,
            )
        )

    return logs
