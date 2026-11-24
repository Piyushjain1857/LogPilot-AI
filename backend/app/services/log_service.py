from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from app.models.log import LogEntry


class LogService:
    """Queries stored log records with filtering, searching, and server-side pagination."""

    @staticmethod
    def list_logs(
        db: Session,
        source_id: Optional[str] = None,
        upload_batch_id: Optional[str] = None,
        severity: Optional[str] = None,
        service_name: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> Tuple[List[LogEntry], int]:
        query = db.query(LogEntry)
        if source_id:
            query = query.filter(LogEntry.source_id == source_id)
        if upload_batch_id:
            query = query.filter(LogEntry.upload_batch_id == upload_batch_id)
        if severity and severity.upper() != "ALL":
            query = query.filter(LogEntry.severity == severity.upper())
        if service_name and service_name.strip():
            query = query.filter(LogEntry.service_name == service_name.strip())
        if search and search.strip():
            term = f"%{search.strip()}%"
            query = query.filter(
                (LogEntry.message.ilike(term)) |
                (LogEntry.trace_id.ilike(term)) |
                (LogEntry.service_name.ilike(term))
            )

        total = query.count()
        offset = (max(page, 1) - 1) * page_size
        items = query.order_by(LogEntry.created_at.desc()).offset(offset).limit(page_size).all()
        return items, total

    @staticmethod
    def get_log(db: Session, log_id: str) -> Optional[LogEntry]:
        return db.query(LogEntry).filter(LogEntry.id == log_id).first()
