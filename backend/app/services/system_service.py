import time
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.config import settings
from app.schemas.system import SystemStatusResponse, SystemCapabilitiesResponse


class SystemService:
    @staticmethod
    def check_database_connectivity(db: Session) -> bool:
        try:
            db.execute(text("SELECT 1"))
            return True
        except Exception:
            return False

    @staticmethod
    def get_system_status(db: Session, server_start_time: float) -> SystemStatusResponse:
        db_connected = SystemService.check_database_connectivity(db)
        uptime = max(0.0, time.time() - server_start_time)
        current_time = datetime.now(timezone.utc).isoformat()

        return SystemStatusResponse(
            backend_status="online" if db_connected else "degraded",
            database_connected=db_connected,
            app_version=settings.APP_VERSION,
            environment=settings.APP_ENV,
            uptime_seconds=round(uptime, 2),
            current_timestamp=current_time,
            gemini_status=settings.gemini_status,
        )

    @staticmethod
    def get_system_capabilities() -> SystemCapabilitiesResponse:
        """
        Truthful reflection of Phase 1 implementation vs planned future capabilities.
        """
        return SystemCapabilitiesResponse(
            log_file_ingestion="planned",
            real_time_streaming="planned",
            log_parsing="planned",
            severity_classification="planned",
            anomaly_detection="planned",
            log_clustering="planned",
            incident_management="implemented",
            root_cause_correlation="planned",
            ai_troubleshooting="planned",
            remediation_playbooks="planned",
            report_generation="planned",
        )
