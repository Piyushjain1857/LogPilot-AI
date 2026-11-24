from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.log import LogEntry
from app.models.incident import Incident
from app.models.source import LogSource
from app.schemas.overview import OverviewSummaryResponse


class OverviewService:
    @staticmethod
    def get_overview_summary(db: Session) -> OverviewSummaryResponse:
        """
        Queries actual database counts. Returns zero counts if no records exist.
        Never fabricates monitoring telemetry.
        """
        total_logs = db.query(func.count(LogEntry.id)).scalar() or 0
        error_logs = db.query(func.count(LogEntry.id)).filter(LogEntry.severity == "ERROR").scalar() or 0
        warning_logs = db.query(func.count(LogEntry.id)).filter(LogEntry.severity == "WARNING").scalar() or 0
        critical_logs = db.query(func.count(LogEntry.id)).filter(LogEntry.severity == "CRITICAL").scalar() or 0
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
