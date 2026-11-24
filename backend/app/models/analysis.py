import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.database.session import Base


def utc_now():
    return datetime.now(timezone.utc)


class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=True, index=True)
    analysis_type = Column(String(64), nullable=False)  # root_cause, anomaly, clustering
    status = Column(String(32), nullable=False, default="pending")  # pending, running, completed, failed
    summary = Column(Text, nullable=True)
    confidence_score = Column(Float, nullable=True, default=0.0)
    top_root_cause_service = Column(String(128), nullable=True)
    causal_graph_json = Column(Text, nullable=True)
    hypotheses_json = Column(Text, nullable=True)
    result_json = Column(Text, nullable=True)
    evidence_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    incident = relationship("Incident", back_populates="analysis_runs")
