from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.source import LogSource
from app.models.log import LogEntry
from app.schemas.log_source import LogSourceCreate, LogSourceUpdate, LogSourceResponse


class LogSourceService:
    """Manages telemetry log source configurations and aggregates real record counts."""

    @staticmethod
    def list_sources(db: Session) -> List[Dict[str, Any]]:
        sources = db.query(LogSource).order_by(LogSource.created_at.desc()).all()
        # Count records per source efficiently
        counts_res = db.query(LogEntry.source_id, func.count(LogEntry.id)).group_by(LogEntry.source_id).all()
        count_map = {src_id: cnt for src_id, cnt in counts_res}

        result = []
        for s in sources:
            result.append({
                "id": s.id,
                "name": s.name,
                "source_type": s.source_type,
                "service_name": s.service_name,
                "description": s.description,
                "status": s.status,
                "total_records": count_map.get(s.id, 0),
                "last_ingested_at": s.last_ingested_at,
                "created_at": s.created_at,
                "updated_at": s.updated_at,
            })
        return result

    @staticmethod
    def create_source(db: Session, payload: LogSourceCreate) -> LogSource:
        source = LogSource(
            name=payload.name,
            source_type=payload.source_type or "file",
            service_name=payload.service_name,
            description=payload.description,
            status="active",
        )
        db.add(source)
        db.commit()
        db.refresh(source)
        return source

    @staticmethod
    def get_source(db: Session, source_id: str) -> Optional[Dict[str, Any]]:
        source = db.query(LogSource).filter(LogSource.id == source_id).first()
        if not source:
            return None
        total_records = db.query(func.count(LogEntry.id)).filter(LogEntry.source_id == source_id).scalar() or 0
        return {
            "id": source.id,
            "name": source.name,
            "source_type": source.source_type,
            "service_name": source.service_name,
            "description": source.description,
            "status": source.status,
            "total_records": total_records,
            "last_ingested_at": source.last_ingested_at,
            "created_at": source.created_at,
            "updated_at": source.updated_at,
        }

    @staticmethod
    def update_source(db: Session, source_id: str, payload: LogSourceUpdate) -> Optional[LogSource]:
        source = db.query(LogSource).filter(LogSource.id == source_id).first()
        if not source:
            return None
        if payload.name is not None:
            source.name = payload.name
        if payload.service_name is not None:
            source.service_name = payload.service_name
        if payload.description is not None:
            source.description = payload.description
        if payload.status is not None:
            source.status = payload.status
        db.commit()
        db.refresh(source)
        return source
