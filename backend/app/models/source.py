import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, Boolean, Integer
from sqlalchemy.orm import relationship
from app.database.session import Base


def utc_now():
    return datetime.now(timezone.utc)


class LogSource(Base):
    __tablename__ = "log_sources"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(128), nullable=False)
    source_type = Column(String(64), nullable=False)  # file, api, stream, syslog, agent, simulator, REST_API, COLLECTION_AGENT, SIMULATOR, FILE_UPLOAD
    service_name = Column(String(128), nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(String(32), nullable=False, default="active")  # active, inactive, paused
    configuration_json = Column(Text, nullable=True)
    
    # Real-time health & telemetry tracking
    connection_status = Column(String(32), nullable=False, default="UNKNOWN")  # ACTIVE, IDLE, OFFLINE, DEGRADED, DISABLED, UNKNOWN
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    last_ingested_at = Column(DateTime(timezone=True), nullable=True)
    last_error_at = Column(DateTime(timezone=True), nullable=True)
    last_error_message = Column(Text, nullable=True)
    ingestion_enabled = Column(Boolean, default=True, nullable=False)
    total_ingested_records = Column(Integer, default=0, nullable=False)
    total_failed_records = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    logs = relationship("LogEntry", back_populates="source", cascade="all, delete-orphan")
    upload_batches = relationship("UploadBatch", back_populates="source", cascade="all, delete-orphan")
    tokens = relationship("IngestionToken", back_populates="source", cascade="all, delete-orphan")
    ingestion_batches = relationship("IngestionBatch", back_populates="source", cascade="all, delete-orphan")
    stream_events = relationship("StreamEvent", back_populates="source", cascade="all, delete-orphan")
