from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Integer, DateTime
from app.database.session import Base


def utc_now():
    return datetime.now(timezone.utc)


class WorkspacePreference(Base):
    __tablename__ = "workspace_preferences"

    id = Column(String(64), primary_key=True, default="default")
    theme = Column(String(32), nullable=False, default="dark")  # dark, light, system
    sidebar_collapsed = Column(Boolean, nullable=False, default=False)
    display_density = Column(String(32), nullable=False, default="comfortable")  # comfortable, compact
    timezone = Column(String(64), nullable=False, default="UTC")
    auto_refresh_enabled = Column(Boolean, nullable=False, default=True)
    auto_refresh_interval = Column(Integer, nullable=False, default=30)  # 5, 10, 15, 30, 60, 300
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
