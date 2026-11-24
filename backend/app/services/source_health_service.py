from datetime import datetime, timezone
from typing import Optional
from app.models.source import LogSource
from app.core.config import settings


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


class SourceHealthService:
    """Evaluates observed activity and assigns accurate real-time connection status to log sources."""

    @classmethod
    def compute_connection_status(cls, source: LogSource) -> str:
        """
        Returns one of: ACTIVE, IDLE, OFFLINE, DEGRADED, DISABLED, UNKNOWN.
        Explicit business rules:
        - DISABLED: Ingestion manually turned off.
        - DEGRADED: Recent ingestion failure or error within last 60s.
        - ACTIVE: Authenticated ingestion activity within SOURCE_ACTIVE_WINDOW_SECONDS (default 60s).
        - IDLE: No logs within active window, but seen within SOURCE_IDLE_WINDOW_SECONDS (default 300s).
        - OFFLINE: Last seen more than 300s ago.
        - UNKNOWN: Never transmitted any logs.
        """
        if not source.ingestion_enabled:
            return "DISABLED"

        now = utc_now()

        # Check for degraded status if there was an error in last 60s and it's newer than last ingestion
        if source.last_error_at:
            error_at = ensure_utc(source.last_error_at)
            error_delta = (now - error_at).total_seconds()
            if error_delta < 60:
                ingested_at = ensure_utc(source.last_ingested_at)
                if not ingested_at or error_at >= ingested_at:
                    return "DEGRADED"

        if not source.last_seen_at and not source.last_ingested_at:
            return "UNKNOWN"

        last_activity = ensure_utc(source.last_ingested_at or source.last_seen_at)
        delta = (now - last_activity).total_seconds()

        if delta <= settings.SOURCE_ACTIVE_WINDOW_SECONDS:
            return "ACTIVE"
        elif delta <= settings.SOURCE_IDLE_WINDOW_SECONDS:
            return "IDLE"
        else:
            return "OFFLINE"
