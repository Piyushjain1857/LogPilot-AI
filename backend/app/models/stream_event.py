from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base


def utc_now():
    return datetime.now(timezone.utc)


class StreamEvent(Base):
    __tablename__ = "stream_events"

    sequence_id = Column(Integer, primary_key=True, autoincrement=True)
    event_type = Column(String(64), nullable=False, index=True)
    log_entry_id = Column(String(36), ForeignKey("log_entries.id", ondelete="SET NULL"), nullable=True, index=True)
    source_id = Column(String(36), ForeignKey("log_sources.id", ondelete="CASCADE"), nullable=True, index=True)
    payload_json = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    source = relationship("LogSource", back_populates="stream_events")
