import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text
from app.database.session import Base


def utc_now():
    return datetime.now(timezone.utc)


class SystemEvent(Base):
    __tablename__ = "system_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_type = Column(String(64), nullable=False)  # deployment, config_change, restart, scale_up, scale_down
    service_name = Column(String(128), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    description = Column(Text, nullable=False)
    metadata_json = Column(Text, nullable=True)
