import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Text
from app.database.session import Base


def utc_now():
    return datetime.now(timezone.utc)


class LogCluster(Base):
    __tablename__ = "log_clusters"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    template = Column(Text, nullable=False)
    severity = Column(String(32), nullable=False, index=True)
    occurrence_count = Column(Integer, nullable=False, default=1)
    first_seen_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    last_seen_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
