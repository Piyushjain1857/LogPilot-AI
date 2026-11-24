import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Text, JSON, Boolean, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database.session import Base


def utc_now():
    return datetime.now(timezone.utc)


class LogCluster(Base):
    """
    Clustered group of log records sharing an extracted Drain3/TF-IDF template pattern and service.
    """
    __tablename__ = "log_clusters"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    signature_hash = Column(String(64), nullable=False, index=True)
    name = Column(String(256), nullable=True)
    service_name = Column(String(128), nullable=False, default="unknown", index=True)
    template = Column(Text, nullable=False)
    pattern_regex = Column(Text, nullable=True)
    severity = Column(String(32), nullable=False, default="INFO", index=True)
    occurrence_count = Column(Integer, nullable=False, default=1)
    error_count = Column(Integer, nullable=False, default=0)
    sample_log_ids = Column(JSON, nullable=True)
    variable_parameters = Column(JSON, nullable=True)
    status = Column(String(32), nullable=False, default="ACTIVE", index=True)  # ACTIVE, MUTED, RESOLVED
    first_seen_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    last_seen_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    evolutions = relationship("ClusterEvolution", back_populates="cluster", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_log_clusters_svc_sig", "service_name", "signature_hash", unique=True),
        Index("ix_log_clusters_status_sev", "status", "severity"),
    )


class ClusterEvolution(Base):
    """
    Time-series frequency and evolutionary trend tracking for a log cluster.
    """
    __tablename__ = "cluster_evolutions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    cluster_id = Column(String(36), ForeignKey("log_clusters.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    window_count = Column(Integer, nullable=False, default=1)
    anomaly_detected = Column(Boolean, nullable=False, default=False)

    cluster = relationship("LogCluster", back_populates="evolutions")
