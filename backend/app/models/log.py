import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database.session import Base


def utc_now():
    return datetime.now(timezone.utc)


class LogEntry(Base):
    __tablename__ = "log_entries"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_id = Column(String(36), ForeignKey("log_sources.id", ondelete="CASCADE"), nullable=False, index=True)
    upload_batch_id = Column(String(36), ForeignKey("upload_batches.id", ondelete="CASCADE"), nullable=True, index=True)
    ingestion_batch_id = Column(String(36), ForeignKey("ingestion_batches.id", ondelete="SET NULL"), nullable=True, index=True)
    
    external_event_id = Column(String(128), nullable=True, index=True)
    ingestion_method = Column(String(32), nullable=False, default="FILE_UPLOAD")  # FILE_UPLOAD, REST_API, COLLECTION_AGENT, SIMULATOR
    received_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    persisted_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    timestamp = Column(DateTime(timezone=True), nullable=True, index=True)
    severity = Column(String(32), nullable=False, index=True)  # DEBUG, INFO, WARNING, ERROR, CRITICAL, UNKNOWN
    service_name = Column(String(128), nullable=False, index=True)
    message = Column(Text, nullable=False)
    raw_message = Column(Text, nullable=False)
    trace_id = Column(String(128), nullable=True, index=True)
    span_id = Column(String(64), nullable=True)
    metadata_json = Column(Text, nullable=True)
    line_number = Column(Integer, nullable=True)
    parsing_status = Column(String(32), nullable=False, default="SUCCESS")
    template_id = Column(String(36), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    source = relationship("LogSource", back_populates="logs")
    upload_batch = relationship("UploadBatch", back_populates="logs")
    ingestion_batch = relationship("IngestionBatch", back_populates="logs")
    incidents = relationship("IncidentLog", back_populates="log_entry")

    __table_args__ = (
        Index("ix_log_entries_timestamp_severity", "timestamp", "severity"),
        Index("ix_log_entries_service_severity", "service_name", "severity"),
        Index("ix_log_entries_source_external_event", "source_id", "external_event_id"),
        UniqueConstraint("source_id", "external_event_id", name="uq_log_entries_source_external_event"),
    )
