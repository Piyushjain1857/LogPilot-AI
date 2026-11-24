import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database.session import Base


def utc_now():
    return datetime.now(timezone.utc)


class LogEntry(Base):
    __tablename__ = "log_entries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_id = Column(String(36), ForeignKey("log_sources.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    severity = Column(String(32), nullable=False, index=True)  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    service_name = Column(String(128), nullable=False, index=True)
    message = Column(Text, nullable=False)
    raw_message = Column(Text, nullable=False)
    trace_id = Column(String(128), nullable=True, index=True)
    span_id = Column(String(64), nullable=True)
    metadata_json = Column(Text, nullable=True)
    template_id = Column(String(36), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    source = relationship("LogSource", back_populates="logs")
    incidents = relationship("IncidentLog", back_populates="log_entry")

    __table_args__ = (
        Index("ix_log_entries_timestamp_severity", "timestamp", "severity"),
        Index("ix_log_entries_service_severity", "service_name", "severity"),
    )
