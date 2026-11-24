import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base


def utc_now():
    return datetime.now(timezone.utc)


class RemediationPlaybook(Base):
    __tablename__ = "remediation_playbooks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(256), nullable=False)
    description = Column(Text, nullable=False)
    steps_json = Column(Text, nullable=False)  # JSON array of steps
    risk_level = Column(String(32), nullable=False, default="MEDIUM")  # LOW, MEDIUM, HIGH
    approval_status = Column(String(32), nullable=False, default="pending_approval")  # pending_approval, approved, rejected
    execution_status = Column(String(32), nullable=False, default="not_started")  # not_started, in_progress, completed, failed, disabled
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    incident = relationship("Incident", back_populates="playbooks")
