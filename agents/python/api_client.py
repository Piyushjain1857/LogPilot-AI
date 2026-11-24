import time
import uuid
import logging
from typing import List, Dict, Any, Optional
import httpx

logger = logging.getLogger("logpilot-agent.api")


class IngestionApiClient:
    """HTTP client communicating with the LogPilot AI Ingestion REST API."""

    def __init__(
        self,
        server_url: str,
        token: str,
        max_retry_delay_seconds: int = 30,
        timeout_seconds: float = 10.0,
    ):
        self.server_url = server_url.rstrip("/")
        self.token = token
        self.max_retry_delay = max_retry_delay_seconds
        self.client = httpx.Client(timeout=timeout_seconds)

    def submit_batch(self, batch_id: str, logs: List[Dict[str, Any]]) -> bool:
        """
        Submits a batch of logs to /api/v1/ingest/batch.
        Applies exponential backoff and respects Retry-After on 429/503.
        Returns True if accepted, False otherwise.
        """
        if not logs:
            return True

        url = f"{self.server_url}/api/v1/ingest/batch"
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }
        payload = {
            "batch_id": batch_id,
            "logs": logs,
        }

        delay = 1.0
        max_retries = 5

        for attempt in range(max_retries):
            try:
                resp = self.client.post(url, headers=headers, json=payload)
                if resp.status_code == 202:
                    logger.debug(f"Batch {batch_id} accepted successfully ({len(logs)} records).")
                    return True

                if resp.status_code in {429, 503}:
                    retry_after = resp.headers.get("Retry-After")
                    wait_time = float(retry_after) if retry_after else delay
                    logger.warning(
                        f"Server backpressure [{resp.status_code}]: retrying batch {batch_id} in {wait_time}s..."
                    )
                    time.sleep(min(wait_time, self.max_retry_delay))
                    delay = min(delay * 2, self.max_retry_delay)
                    continue

                if resp.status_code in {401, 403}:
                    logger.error(f"Authentication failure ({resp.status_code}): {resp.text}")
                    return False

                logger.error(f"Ingestion rejected ({resp.status_code}): {resp.text}")
                return False

            except (httpx.ConnectError, httpx.TimeoutException) as exc:
                logger.warning(f"Connection failure to {url} (attempt {attempt + 1}/{max_retries}): {exc}")
                time.sleep(delay)
                delay = min(delay * 2, self.max_retry_delay)

        return False

    def close(self):
        self.client.close()
