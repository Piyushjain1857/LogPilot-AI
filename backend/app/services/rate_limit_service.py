import time
from collections import deque
from typing import Dict
from threading import Lock
from fastapi import HTTPException, status
from app.core.config import settings


class RateLimitService:
    """In-memory sliding-window rate limiter for source request and record throughput."""

    def __init__(self):
        self._lock = Lock()
        self._request_history: Dict[str, deque] = {}
        self._record_history: Dict[str, deque] = {}

    def check_rate_limit(self, source_id: str, record_count: int = 1):
        """
        Checks whether the given source has exceeded requests/min or records/min limits.
        Raises HTTP 429 Too Many Requests if rate limits are exceeded.
        """
        now = time.time()
        window_start = now - 60.0

        with self._lock:
            # 1. Clean and check request history
            if source_id not in self._request_history:
                self._request_history[source_id] = deque()
            req_queue = self._request_history[source_id]
            while req_queue and req_queue[0] < window_start:
                req_queue.popleft()

            if len(req_queue) >= settings.INGESTION_REQUESTS_PER_MINUTE:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Request rate limit exceeded ({settings.INGESTION_REQUESTS_PER_MINUTE} req/min). Please back off.",
                    headers={"Retry-After": "5"},
                )

            # 2. Clean and check record history
            if source_id not in self._record_history:
                self._record_history[source_id] = deque()
            rec_queue = self._record_history[source_id]
            while rec_queue and rec_queue[0][0] < window_start:
                rec_queue.popleft()

            current_records = sum(count for _, count in rec_queue)
            if current_records + record_count > settings.INGESTION_RECORDS_PER_MINUTE:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Record throughput limit exceeded ({settings.INGESTION_RECORDS_PER_MINUTE} records/min).",
                    headers={"Retry-After": "5"},
                )

            # Record this event
            req_queue.append(now)
            rec_queue.append((now, record_count))


rate_limit_service = RateLimitService()
