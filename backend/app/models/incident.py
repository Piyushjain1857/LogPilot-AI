import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Table
from sqlalchemy.orm import relationship
from app.database.session import Base


def utc_now():
    return datetime.now(timezone.utc)


class IncidentLog(Base):
    __tablename__ = "incident_logs"

    incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), primary_key=True)
    log_entry_id = Column(String(36), ForeignKey("log_entries.id", ondelete="CASCADE"), primary_key=True)

    incident = relationship("Incident", back_populates="incident_logs")
    log_entry = relationship("LogEntry", back_populates="incidents")


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_number = Column(String(32), unique=True, index=True, nullable=True)  # e.g. INC-1001
    title = Column(String(256), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(32), nullable=False, default="HIGH")  # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(32), nullable=False, default="active", index=True)  # active, investigating, mitigated, resolved, closed
    primary_service = Column(String(128), nullable=True, index=True)
    affected_services_json = Column(Text, nullable=False, default="[]")
    root_cause_hypothesis = Column(Text, nullable=True)
    timeline_events_json = Column(Text, nullable=False, default="[]")
    metrics_snapshot_json = Column(Text, nullable=False, default="{}")
    anomaly_ids_json = Column(Text, nullable=False, default="[]")
    cluster_ids_json = Column(Text, nullable=False, default="[]")
    assigned_to = Column(String(128), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    first_detected_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    last_detected_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    mitigated_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    incident_logs = relationship("IncidentLog", back_populates="incident", cascade="all, delete-orphan")
    analysis_runs = relationship("AnalysisRun", back_populates="incident", cascade="all, delete-orphan")
    playbooks = relationship("RemediationPlaybook", back_populates="incident", cascade="all, delete-orphan")
