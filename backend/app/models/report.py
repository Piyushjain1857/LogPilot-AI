import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base


def utc_now():
    return datetime.now(timezone.utc)


class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    report_number = Column(String(32), unique=True, index=True, nullable=True)  # e.g. RPT-1001
    incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(256), nullable=False)
    category = Column(String(64), default="INCIDENT_POSTMORTEM", index=True, nullable=False)  # INCIDENT_POSTMORTEM, SLA_AUDIT, SECURITY_COMPLIANCE
    status = Column(String(32), default="FINALIZED", nullable=False)  # DRAFT, FINALIZED, ARCHIVED
    summary = Column(Text, nullable=False)
    impact_assessment = Column(Text, nullable=False)
    timeline_json = Column(Text, default="[]", nullable=False)
    root_cause_analysis = Column(Text, nullable=False)
    remediation_summary = Column(Text, nullable=False)
    metrics_json = Column(Text, default="{}", nullable=False)  # MTTD, MTTR, impact %
    author = Column(String(128), default="LogPilot AI Autonomous SRE", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    incident = relationship("Incident", foreign_keys=[incident_id])
