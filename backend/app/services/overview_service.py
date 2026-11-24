import json
from datetime import datetime, timezone, timedelta
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.models.log import LogEntry
from app.models.incident import Incident
from app.models.source import LogSource
from app.schemas.overview import (
    OverviewSummaryResponse,
    LogActivityResponse,
    LogActivityPoint,
    SeverityDistributionResponse,
    SeverityDistributionItem,
    RecentIncidentsResponse,
    RecentIncidentItem,
    SourceHealthResponse,
    SourceHealthItem,
)

VALID_RANGES = {
    "1h": (timedelta(hours=1), 5),      # (delta, bucket_minutes)
    "6h": (timedelta(hours=6), 15),
    "12h": (timedelta(hours=12), 30),
    "24h": (timedelta(hours=24), 60),
    "7d": (timedelta(days=7), 360),
}


class OverviewService:
    @staticmethod
    def get_overview_summary(db: Session) -> OverviewSummaryResponse:
        total_logs = db.query(func.count(LogEntry.id)).scalar() or 0
        error_logs = (
            db.query(func.count(LogEntry.id))
            .filter(LogEntry.severity == "ERROR")
            .scalar()
            or 0
        )
        warning_logs = (
            db.query(func.count(LogEntry.id))
            .filter(LogEntry.severity == "WARNING")
            .scalar()
            or 0
        )
        critical_logs = (
            db.query(func.count(LogEntry.id))
            .filter(LogEntry.severity == "CRITICAL")
            .scalar()
            or 0
        )
        active_incidents = (
            db.query(func.count(Incident.id))
            .filter(Incident.status.in_(["active", "investigating"]))
            .scalar()
            or 0
        )
        configured_sources = db.query(func.count(LogSource.id)).scalar() or 0

        return OverviewSummaryResponse(
            total_logs=total_logs,
            error_logs=error_logs,
            warning_logs=warning_logs,
            critical_logs=critical_logs,
            active_incidents=active_incidents,
            configured_sources=configured_sources,
        )

    @staticmethod
    def get_log_activity(
        db: Session, time_range: str = "24h"
    ) -> LogActivityResponse:
        range_key = time_range.lower()
        if range_key not in VALID_RANGES:
            range_key = "24h"

        delta, bucket_mins = VALID_RANGES[range_key]
        now = datetime.now(timezone.utc)
        start_time = now - delta

        # Check total logs in range
        logs = (
            db.query(LogEntry.timestamp, LogEntry.severity)
            .filter(LogEntry.timestamp >= start_time)
            .order_by(LogEntry.timestamp.asc())
            .all()
        )

        if not logs:
            return LogActivityResponse(
                range=range_key,
                bucket_minutes=bucket_mins,
                points=[],
            )

        # Bucket logs
        bucket_seconds = bucket_mins * 60
        buckets = {}
        for log_ts, severity in logs:
            if not log_ts:
                continue
            # Ensure timezone-aware
            ts = log_ts if log_ts.tzinfo else log_ts.replace(tzinfo=timezone.utc)
            bucket_epoch = int(ts.timestamp() // bucket_seconds * bucket_seconds)
            if bucket_epoch not in buckets:
                buckets[bucket_epoch] = {"count": 0, "error_count": 0, "warning_count": 0}
            buckets[bucket_epoch]["count"] += 1
            if severity == "ERROR":
                buckets[bucket_epoch]["error_count"] += 1
            elif severity in ("WARNING", "CRITICAL"):
                buckets[bucket_epoch]["warning_count"] += 1

        points = [
            LogActivityPoint(
                timestamp=datetime.fromtimestamp(epoch, tz=timezone.utc).isoformat(),
                count=data["count"],
                error_count=data["error_count"],
                warning_count=data["warning_count"],
            )
            for epoch, data in sorted(buckets.items())
        ]

        return LogActivityResponse(
            range=range_key,
            bucket_minutes=bucket_mins,
            points=points,
        )

    @staticmethod
    def get_severity_distribution(db: Session) -> SeverityDistributionResponse:
        results = (
            db.query(LogEntry.severity, func.count(LogEntry.id))
            .group_by(LogEntry.severity)
            .all()
        )

        total = sum(count for _, count in results)
        if total == 0:
            return SeverityDistributionResponse(total=0, distribution=[])

        distribution = [
            SeverityDistributionItem(
                severity=sev,
                count=count,
                percentage=round((count / total) * 100, 1),
            )
            for sev, count in results
        ]

        # Sort order: CRITICAL, ERROR, WARNING, INFO, DEBUG
        order_map = {"CRITICAL": 0, "ERROR": 1, "WARNING": 2, "INFO": 3, "DEBUG": 4}
        distribution.sort(key=lambda item: order_map.get(item.severity.upper(), 99))

        return SeverityDistributionResponse(total=total, distribution=distribution)

    @staticmethod
    def get_recent_incidents(
        db: Session, limit: int = 5
    ) -> RecentIncidentsResponse:
        safe_limit = max(1, min(limit, 50))
        incidents = (
            db.query(Incident)
            .order_by(desc(Incident.last_detected_at))
            .limit(safe_limit)
            .all()
        )

        items = []
        for inc in incidents:
            affected = []
            try:
                if inc.affected_services_json:
                    affected = json.loads(inc.affected_services_json)
            except Exception:
                affected = []

            items.append(
                RecentIncidentItem(
                    id=inc.id,
                    title=inc.title,
                    severity=inc.severity,
                    status=inc.status,
                    affected_services=affected,
                    first_detected_at=inc.first_detected_at.isoformat()
                    if inc.first_detected_at
                    else "",
                    last_detected_at=inc.last_detected_at.isoformat()
                    if inc.last_detected_at
                    else "",
                )
            )

        return RecentIncidentsResponse(incidents=items)

    @staticmethod
    def get_source_health(db: Session) -> SourceHealthResponse:
        sources = db.query(LogSource).all()
        now = datetime.now(timezone.utc)
        items = []

        for src in sources:
            # Query last seen log entry
            last_entry = (
                db.query(LogEntry.timestamp, LogEntry.severity)
                .filter(LogEntry.source_id == src.id)
                .order_by(desc(LogEntry.timestamp))
                .first()
            )

            if not last_entry:
                health = "unknown"
                last_seen = None
            else:
                last_seen = last_entry.timestamp.isoformat() if last_entry.timestamp else None
                # Check recent errors
                if last_entry.severity == "CRITICAL":
                    health = "unhealthy"
                elif last_entry.severity in ("ERROR", "WARNING"):
                    health = "degraded"
                else:
                    health = "healthy"

            if src.status in ("paused", "inactive"):
                health = "degraded" if health == "healthy" else health

            items.append(
                SourceHealthItem(
                    id=src.id,
                    name=src.name,
                    source_type=src.source_type,
                    service_name=src.service_name,
                    status=src.status,
                    health=health,
                    last_seen_at=last_seen,
                )
            )

        return SourceHealthResponse(sources=items)
