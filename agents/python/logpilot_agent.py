#!/usr/bin/env python3
"""
LogPilot AI — Standalone Python Log Collection Agent.
Tails explicitly configured local log files, batches newly appended entries,
and ships them reliably to the LogPilot AI Real-Time Ingestion API.
"""

import os
import sys
import json
import time
import signal
import logging
import argparse
import uuid
from pathlib import Path

from checkpoint_manager import CheckpointManager
from api_client import IngestionApiClient
from collector import LogFileTailer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
)
logger = logging.getLogger("logpilot-agent")


class LogPilotAgent:
    def __init__(self, config_path: str):
        self.config_path = Path(config_path).resolve()
        if not self.config_path.exists():
            raise FileNotFoundError(f"Configuration file not found: {self.config_path}")

        with open(self.config_path, "r", encoding="utf-8") as f:
            self.config = json.load(f)

        self.server_url = self.config.get("server_url", "http://127.0.0.1:8000")
        token_env = self.config.get("token_env", "LOGPILOT_INGESTION_TOKEN")
        self.token = os.environ.get(token_env) or self.config.get("token")
        if not self.token:
            raise ValueError(
                f"Missing ingestion token. Please set the environment variable '{token_env}'."
            )

        self.service_name = self.config.get("service_name", "local-application")
        self.batch_size = int(self.config.get("batch_size", 50))
        self.flush_interval = float(self.config.get("flush_interval_seconds", 2.0))
        self.max_retry_delay = int(self.config.get("max_retry_delay_seconds", 30))
        checkpoint_file = self.config.get("checkpoint_file", "./.logpilot-checkpoint.json")

        self.checkpoint_manager = CheckpointManager(checkpoint_file)
        self.api_client = IngestionApiClient(
            server_url=self.server_url,
            token=self.token,
            max_retry_delay_seconds=self.max_retry_delay,
        )

        self.tailers = []
        for file_cfg in self.config.get("files", []):
            path = file_cfg.get("path")
            if path:
                self.tailers.append(
                    LogFileTailer(
                        file_path=path,
                        default_service=file_cfg.get("service") or self.service_name,
                        start_position=file_cfg.get("start_position", "end"),
                    )
                )

        self._running = False

    def start(self):
        self._running = True
        logger.info(
            f"LogPilot Agent starting. Monitoring {len(self.tailers)} files targeting {self.server_url}."
        )

        signal.signal(signal.SIGINT, self._handle_exit)
        signal.signal(signal.SIGTERM, self._handle_exit)

        last_flush = time.time()
        pending_records = []
        pending_checkpoints = []

        while self._running:
            for tailer in self.tailers:
                path_str = str(tailer.file_path)
                current_inode = getattr(tailer.file_path.stat(), "st_ino", None) if tailer.file_path.exists() else None
                offset = self.checkpoint_manager.get_offset(path_str, current_inode)

                records, new_offset, inode = tailer.read_new_lines(offset)
                if records:
                    pending_records.extend(records)
                    pending_checkpoints.append((path_str, new_offset, inode))

            now = time.time()
            should_flush = len(pending_records) >= self.batch_size or (
                pending_records and (now - last_flush) >= self.flush_interval
            )

            if should_flush:
                batch_id = f"batch-agent-{uuid.uuid4().hex[:12]}"
                success = self.api_client.submit_batch(batch_id, pending_records)
                if success:
                    # Update checkpoints only after confirmed acceptance
                    for path_str, offset, inode in pending_checkpoints:
                        self.checkpoint_manager.commit_offset(path_str, offset, inode)
                    logger.info(f"Shipped {len(pending_records)} logs in batch {batch_id}.")
                    pending_records.clear()
                    pending_checkpoints.clear()
                    last_flush = now
                else:
                    logger.warning("Batch submission rejected or unconfirmed. Will retry in next cycle.")

            time.sleep(0.5)

        logger.info("LogPilot Agent shutting down.")
        self.api_client.close()

    def _handle_exit(self, signum, frame):
        logger.info("Termination signal received. Shutting down gracefully...")
        self._running = False


def main():
    parser = argparse.ArgumentParser(description="LogPilot AI Log Collection Agent")
    parser.add_argument(
        "--config",
        "-c",
        required=True,
        help="Path to JSON agent configuration file (e.g. config.json)",
    )
    args = parser.parse_args()

    try:
        agent = LogPilotAgent(args.config)
        agent.start()
    except Exception as e:
        logger.error(f"Fatal agent error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
