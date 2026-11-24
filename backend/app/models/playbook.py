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
    playbook_number = Column(String(32), unique=True, index=True, nullable=True)  # e.g. PB-101
    incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=True, index=True)
    title = Column(String(256), nullable=False)
    slug = Column(String(128), index=True, nullable=True)
    category = Column(String(64), default="GENERAL", index=True, nullable=False)  # DATABASE, CONTAINER, CIRCUIT_BREAKER, CACHE, NETWORK, STORAGE
    description = Column(Text, nullable=False)
    target_service = Column(String(128), default="all", nullable=False)
    risk_level = Column(String(32), nullable=False, default="SAFE")  # SAFE, CAUTION, CRITICAL_DESTRUCTIVE
    estimated_downtime = Column(String(64), default="0 seconds", nullable=False)
    steps_json = Column(Text, nullable=False)  # JSON array of steps
    approval_status = Column(String(32), nullable=False, default="pending_approval")  # pending_approval, partially_approved, approved, rejected
    execution_status = Column(String(32), nullable=False, default="not_started")  # not_started, simulating, simulated, running, completed, rolled_back, failed
    simulation_log_json = Column(Text, default="[]", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    incident = relationship("Incident", back_populates="playbooks")
    audit_logs = relationship("RemediationAuditLog", back_populates="playbook", cascade="all, delete-orphan")


class RemediationAuditLog(Base):
    __tablename__ = "remediation_audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    playbook_id = Column(String(36), ForeignKey("remediation_playbooks.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(64), nullable=False)  # STEP_APPROVED, STEP_REJECTED, SIMULATION_STARTED, SIMULATION_SUCCESS, ROLLBACK_EXECUTED
    step_number = Column(String(32), nullable=True)
    performed_by = Column(String(128), default="sre-operator", nullable=False)
    details_json = Column(Text, default="{}", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    playbook = relationship("RemediationPlaybook", back_populates="audit_logs")
