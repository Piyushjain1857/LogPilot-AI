import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base


def utc_now():
    return datetime.now(timezone.utc)


class IngestionToken(Base):
    __tablename__ = "ingestion_tokens"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_id = Column(String(36), ForeignKey("log_sources.id", ondelete="CASCADE"), nullable=False, index=True)
    token_prefix = Column(String(16), nullable=False)
    token_hash = Column(String(128), nullable=False, unique=True, index=True)
    name = Column(String(128), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    source = relationship("LogSource", back_populates="tokens")
