import time
from collections import deque
from threading import Lock
from typing import Dict, Any, List
from datetime import datetime, timezone
from app.core.config import settings


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class StreamingMetricsService:
    """Calculates operational ingestion and streaming metrics using real rolling-window telemetry."""

    def __init__(self):
        self._lock = Lock()
        self.total_received = 0
        self.total_accepted = 0
        self.total_persisted = 0
        self.total_rejected = 0
        self.total_duplicates = 0
        self.last_persisted_at: datetime = None

        # Rolling 300s event window for rate calculation: (timestamp, record_count, duration_ms, severity, service)
        self._event_window: deque = deque()
        self._request_window: deque = deque()

    def record_request_accepted(self, record_count: int):
        with self._lock:
            now = time.time()
            self.total_received += record_count
            self.total_accepted += record_count
            self._request_window.append(now)

    def record_request_rejected(self, record_count: int):
        with self._lock:
            self.total_received += record_count
            self.total_rejected += record_count

    def record_persisted_event(
        self,
        count: int = 1,
        duration_ms: float = 1.0,
        severity: str = "INFO",
        service: str = "unknown",
        is_duplicate: bool = False,
    ):
        with self._lock:
            now = time.time()
            if is_duplicate:
                self.total_duplicates += count
            else:
                self.total_persisted += count
                self.last_persisted_at = utc_now()
                self._event_window.append((now, count, duration_ms, severity.upper(), service))

    def get_metrics(
        self,
        queue_depth: int = 0,
        active_workers: int = 1,
        connected_clients: int = 0,
    ) -> Dict[str, Any]:
        with self._lock:
            now = time.time()
            cutoff = now - settings.STREAM_METRICS_WINDOW_SECONDS

            # Prune windows
            while self._request_window and self._request_window[0] < cutoff:
                self._request_window.popleft()

            while self._event_window and self._event_window[0][0] < cutoff:
                self._event_window.popleft()

            # Calculate requests per minute (over actual window duration or 60s)
            req_count = len(self._request_window)
            rpm = round((req_count / settings.STREAM_METRICS_WINDOW_SECONDS) * 60.0, 2)

            # Calculate logs per second
            total_window_logs = sum(item[1] for item in self._event_window)
            lps = round(total_window_logs / settings.STREAM_METRICS_WINDOW_SECONDS, 2) if settings.STREAM_METRICS_WINDOW_SECONDS > 0 else 0.0

            # Calculate latency distribution
            latencies = [item[2] for item in self._event_window if item[2] > 0]
            if latencies:
                latencies.sort()
                mid = len(latencies) // 2
                median_lat = round(latencies[mid], 2)
                p95_idx = int(len(latencies) * 0.95)
                p95_lat = round(latencies[min(p95_idx, len(latencies) - 1)], 2)
            else:
                median_lat = 0.0
                p95_lat = 0.0

            # Severity distribution in window
            severity_counts = {
                "CRITICAL": 0,
                "ERROR": 0,
                "WARNING": 0,
                "INFO": 0,
                "DEBUG": 0,
            }
            service_counts = {}

            for _, cnt, _, sev, srv in self._event_window:
                if sev in severity_counts:
                    severity_counts[sev] += cnt
                else:
                    severity_counts["INFO"] += cnt

                service_counts[srv] = service_counts.get(srv, 0) + cnt

            return {
                "total_received": self.total_received,
                "total_accepted": self.total_accepted,
                "total_persisted": self.total_persisted,
                "total_rejected": self.total_rejected,
                "total_duplicates": self.total_duplicates,
                "queue_depth": queue_depth,
                "active_workers": active_workers,
                "connected_clients": connected_clients,
                "requests_per_minute": rpm,
                "logs_per_second": lps,
                "median_latency_ms": median_lat,
                "p95_latency_ms": p95_lat,
                "source_activity": service_counts,
                "severity_distribution": severity_counts,
                "last_persisted_event_timestamp": self.last_persisted_at,
            }


streaming_metrics_service = StreamingMetricsService()
