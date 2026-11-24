import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Text, Index
from app.database.session import Base


class Anomaly(Base):
    """
    Detected system or service anomaly flagged by statistical or ML algorithms.
    """
    __tablename__ = "anomalies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    detected_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)
    time_window_start = Column(DateTime, nullable=False, index=True)
    time_window_end = Column(DateTime, nullable=False, index=True)
    service_name = Column(String(100), nullable=False, index=True)
    anomaly_type = Column(String(50), nullable=False, index=True)
    severity = Column(String(20), nullable=False, default="MEDIUM", index=True)  # LOW, MEDIUM, HIGH, CRITICAL
    anomaly_score = Column(Float, nullable=False, default=0.0, index=True)  # 0.0 to 1.0
    algorithm = Column(String(50), nullable=False, index=True)  # Z_SCORE, MAD, EWMA, ISOLATION_FOREST
    metric_name = Column(String(50), nullable=False, index=True)  # error_rate, log_volume, p95_latency_ms, http_5xx_rate, multivariate_vector
    observed_value = Column(Float, nullable=False, default=0.0)
    expected_value = Column(Float, nullable=False, default=0.0)
    threshold = Column(Float, nullable=False, default=0.0)
    context_payload = Column(JSON, nullable=True)
    status = Column(String(20), nullable=False, default="ACTIVE", index=True)  # ACTIVE, ACKNOWLEDGED, RESOLVED, FALSE_POSITIVE

    __table_args__ = (
        Index("ix_anomalies_svc_status", "service_name", "status"),
        Index("ix_anomalies_time_sev", "detected_at", "severity"),
    )


class AnomalyDetectionRun(Base):
    """
    Audit log of manual or scheduled anomaly detection executions.
    """
    __tablename__ = "anomaly_detection_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    started_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String(20), nullable=False, default="RUNNING")  # RUNNING, COMPLETED, FAILED
    algorithm = Column(String(50), nullable=False, default="ALL")
    window_minutes = Column(Integer, nullable=False, default=5)
    total_windows_analyzed = Column(Integer, nullable=False, default=0)
    anomalies_detected = Column(Integer, nullable=False, default=0)
    summary = Column(JSON, nullable=True)


class ServiceBaseline(Base):
    """
    Rolling statistical baseline profile computed for each service metric.
    """
    __tablename__ = "service_baselines"

    id = Column(Integer, primary_key=True, autoincrement=True)
    service_name = Column(String(100), nullable=False, index=True)
    metric_name = Column(String(50), nullable=False, index=True)
    time_window = Column(String(20), nullable=False, default="5m", index=True)  # 1m, 5m, 15m, 1h
    mean = Column(Float, nullable=False, default=0.0)
    std_dev = Column(Float, nullable=False, default=0.0)
    median = Column(Float, nullable=False, default=0.0)
    mad = Column(Float, nullable=False, default=0.0)  # Median Absolute Deviation
    ewma_mean = Column(Float, nullable=False, default=0.0)
    p95 = Column(Float, nullable=False, default=0.0)
    min_val = Column(Float, nullable=False, default=0.0)
    max_val = Column(Float, nullable=False, default=0.0)
    sample_count = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    __table_args__ = (
        Index("ix_svc_baseline_unique", "service_name", "metric_name", "time_window", unique=True),
    )


class DetectionConfig(Base):
    """
    Configurable sensitivity and thresholds for anomaly detection algorithms.
    """
    __tablename__ = "detection_configs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(50), unique=True, nullable=False)
    value = Column(JSON, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
