import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base


def utc_now():
    return datetime.now(timezone.utc)


class IngestionBatch(Base):
    __tablename__ = "ingestion_batches"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_id = Column(String(36), ForeignKey("log_sources.id", ondelete="CASCADE"), nullable=False, index=True)
    external_batch_id = Column(String(128), nullable=True, index=True)
    status = Column(String(32), default="PENDING", nullable=False)  # PENDING, PROCESSING, COMPLETED, PARTIALLY_COMPLETED, FAILED
    total_records = Column(Integer, default=0, nullable=False)
    accepted_records = Column(Integer, default=0, nullable=False)
    persisted_records = Column(Integer, default=0, nullable=False)
    duplicate_records = Column(Integer, default=0, nullable=False)
    failed_records = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    error_summary_json = Column(Text, nullable=True)

    source = relationship("LogSource", back_populates="ingestion_batches")
    logs = relationship("LogEntry", back_populates="ingestion_batch")
