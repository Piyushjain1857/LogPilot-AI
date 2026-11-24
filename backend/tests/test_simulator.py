import os
import sys
from pathlib import Path

# Add simulators to path for unit testing
sim_dir = Path(__file__).resolve().parent.parent.parent / "simulators"
sys.path.insert(0, str(sim_dir))

from log_generator import SyntheticLogGenerator
from scenarios import get_scenario_logs


def test_synthetic_log_generator_structure():
    ev = SyntheticLogGenerator.generate_event(
        service="order-service",
        severity="ERROR",
        message="Order processing failed due to credit check",
        trace_id="tr-test-1234",
        metadata={"order_id": 9981},
    )

    assert ev["service"] == "order-service"
    assert ev["severity"] == "ERROR"
    assert ev["trace_id"] == "tr-test-1234"
    assert ev["event_id"].startswith("sim-evt-")
    assert ev["metadata"]["order_id"] == 9981
    assert "timestamp" in ev


def test_all_scenarios_generate_valid_events():
    scenarios = ["normal", "database-failure", "deployment-regression", "traffic-spike", "recovery"]

    for sc in scenarios:
        logs = get_scenario_logs(sc, batch_size=4)
        assert len(logs) >= 3, f"Scenario {sc} generated insufficient logs"

        # Verify shared trace correlation within the scenario batch
        first_trace = logs[0].get("trace_id")
        assert first_trace is not None

        for item in logs:
            assert "event_id" in item
            assert "severity" in item
            assert "service" in item
            assert "message" in item
            assert item["trace_id"] == first_trace
