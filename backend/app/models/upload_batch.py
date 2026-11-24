import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, BigInteger, Float, DateTime, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database.session import Base


def utc_now():
    return datetime.now(timezone.utc)


class UploadBatch(Base):
    __tablename__ = "upload_batches"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_id = Column(String(36), ForeignKey("log_sources.id", ondelete="CASCADE"), nullable=False, index=True)
    original_filename = Column(String(255), nullable=False)
    file_format = Column(String(32), nullable=False)  # LOG, TXT, CSV, JSON, JSONL, NDJSON
    file_size_bytes = Column(BigInteger, nullable=False, default=0)
    file_hash = Column(String(64), nullable=False, index=True)  # SHA-256
    status = Column(
        String(32),
        nullable=False,
        default="PENDING",
        index=True,
    )  # PENDING, VALIDATING, PROCESSING, COMPLETED, PARTIALLY_COMPLETED, FAILED, CANCELLED, INTERRUPTED

    total_records = Column(Integer, nullable=False, default=0)
    processed_records = Column(Integer, nullable=False, default=0)
    successful_records = Column(Integer, nullable=False, default=0)
    failed_records = Column(Integer, nullable=False, default=0)
    skipped_records = Column(Integer, nullable=False, default=0)
    redacted_records = Column(Integer, nullable=False, default=0)
    processing_duration_ms = Column(Float, nullable=False, default=0.0)
    error_summary_json = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    source = relationship("LogSource", back_populates="upload_batches")
    logs = relationship("LogEntry", back_populates="upload_batch", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_upload_batches_source_status", "source_id", "status"),
        Index("ix_upload_batches_hash_source", "file_hash", "source_id"),
    )
