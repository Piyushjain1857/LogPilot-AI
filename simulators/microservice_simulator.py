#!/usr/bin/env python3
"""
LogPilot AI — Synthetic Microservice Log Simulator.
Generates realistic, correlated multi-service telemetry and submits it
to the LogPilot AI Real-Time Ingestion API for live demonstrations.
"""

import os
import sys
import time
import signal
import random
import logging
import argparse
import uuid
import httpx
from scenarios import get_scenario_logs

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [simulator] %(message)s",
)
logger = logging.getLogger("simulator")


class MicroserviceSimulator:
    def __init__(
        self,
        server_url: str,
        token: str,
        scenario: str = "normal",
        rate: int = 5,
        duration: int = 60,
        seed: int = None,
    ):
        self.server_url = server_url.rstrip("/")
        self.token = token
        self.scenario = scenario
        self.rate = max(rate, 1)
        self.duration = duration
        if seed is not None:
            random.seed(seed)

        self.client = httpx.Client(timeout=10.0)
        self._running = False
        self.total_submitted = 0
        self.total_accepted = 0
        self.total_failed = 0

    def start(self):
        self._running = True
        signal.signal(signal.SIGINT, self._handle_exit)
        signal.signal(signal.SIGTERM, self._handle_exit)

        logger.info(
            f"Starting simulator | Scenario: '{self.scenario}' | Rate: {self.rate} logs/s | Duration: {self.duration}s"
        )
        logger.info(f"Target: {self.server_url}/api/v1/ingest/batch")

        start_time = time.time()
        interval = 1.0  # Emit every 1 second

        while self._running:
            elapsed = time.time() - start_time
            if self.duration > 0 and elapsed >= self.duration:
                logger.info(f"Specified duration ({self.duration}s) reached.")
                break

            # Generate batch for this second
            batch_records = get_scenario_logs(self.scenario, batch_size=self.rate)
            batch_id = f"sim-batch-{uuid.uuid4().hex[:10]}"

            success = self._send_batch(batch_id, batch_records)
            self.total_submitted += len(batch_records)
            if success:
                self.total_accepted += len(batch_records)
            else:
                self.total_failed += len(batch_records)

            time.sleep(interval)

        self._print_summary(time.time() - start_time)
        self.client.close()

    def _send_batch(self, batch_id: str, records: list) -> bool:
        url = f"{self.server_url}/api/v1/ingest/batch"
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }
        payload = {
            "batch_id": batch_id,
            "logs": records,
        }

        try:
            resp = self.client.post(url, headers=headers, json=payload)
            if resp.status_code == 202:
                logger.info(f"[{self.scenario}] Batch {batch_id} submitted ({len(records)} logs).")
                return True
            else:
                logger.warning(f"Batch {batch_id} rejected [{resp.status_code}]: {resp.text}")
                return False
        except Exception as e:
            logger.error(f"Failed to submit batch: {e}")
            return False

    def _print_summary(self, elapsed: float):
        logger.info("=" * 60)
        logger.info("LOGPILOT AI SIMULATOR RUN SUMMARY")
        logger.info("=" * 60)
        logger.info(f"Scenario:           {self.scenario}")
        logger.info(f"Elapsed Time:       {elapsed:.2f}s")
        logger.info(f"Total Submitted:    {self.total_submitted}")
        logger.info(f"Total Accepted:     {self.total_accepted}")
        logger.info(f"Total Failed:       {self.total_failed}")
        logger.info(f"Average Throughput: {self.total_accepted / max(elapsed, 0.1):.2f} logs/sec")
        logger.info("=" * 60)

    def _handle_exit(self, signum, frame):
        logger.info("Interrupted. Stopping simulator...")
        self._running = False


def main():
    parser = argparse.ArgumentParser(description="LogPilot AI Synthetic Microservice Simulator")
    parser.add_argument(
        "--scenario",
        choices=["normal", "database-failure", "deployment-regression", "traffic-spike", "recovery"],
        default="normal",
        help="Simulated operational incident scenario",
    )
    parser.add_argument(
        "--rate",
        type=int,
        default=5,
        help="Target logs per second rate (default: 5)",
    )
    parser.add_argument(
        "--duration",
        type=int,
        default=60,
        help="Duration in seconds (default: 60)",
    )
    parser.add_argument(
        "--server-url",
        default="http://127.0.0.1:8000",
        help="Base URL of LogPilot backend server",
    )
    parser.add_argument(
        "--token",
        help="Ingestion bearer token (lp_live_...)",
    )
    parser.add_argument(
        "--token-env",
        default="LOGPILOT_SIMULATOR_TOKEN",
        help="Environment variable name holding token",
    )
    parser.add_argument(
        "--seed",
        type=int,
        help="Reproducible random seed",
    )

    args = parser.parse_args()
    token = args.token or os.environ.get(args.token_env) or os.environ.get("LOGPILOT_INGESTION_TOKEN")
    if not token:
        logger.error(
            f"Missing ingestion token. Provide --token or set environment variable '{args.token_env}'."
        )
        sys.exit(1)

    sim = MicroserviceSimulator(
        server_url=args.server_url,
        token=token,
        scenario=args.scenario,
        rate=args.rate,
        duration=args.duration,
        seed=args.seed,
    )
    sim.start()


if __name__ == "__main__":
    main()
