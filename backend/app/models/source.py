import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.orm import relationship
from app.database.session import Base


def utc_now():
    return datetime.now(timezone.utc)


class LogSource(Base):
    __tablename__ = "log_sources"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(128), nullable=False)
    source_type = Column(String(64), nullable=False)  # file, api, stream, syslog, agent
    service_name = Column(String(128), nullable=False, index=True)
    status = Column(String(32), nullable=False, default="active")  # active, inactive, paused
    configuration_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    logs = relationship("LogEntry", back_populates="source", cascade="all, delete-orphan")
