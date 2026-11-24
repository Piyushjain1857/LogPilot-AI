import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, Boolean
from app.database.session import Base


def utc_now():
    return datetime.now(timezone.utc)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(256), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String(32), default="INFO", nullable=False)  # INFO, WARNING, CRITICAL
    category = Column(String(64), default="SYSTEM", nullable=False)  # INCIDENT, ANOMALY, PLAYBOOK, SYSTEM
    link = Column(String(256), nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
