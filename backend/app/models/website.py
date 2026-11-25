import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import relationship
from app.database.session import Base


def utc_now():
    return datetime.now(timezone.utc)


class MonitoredWebsite(Base):
    """
    Website registered for real-time uptime, performance, SSL, DNS,
    and client-side JavaScript SDK error monitoring.
    """
    __tablename__ = "monitored_websites"

    id = Column(String(36), primary_key=True, default=lambda: f"site-{uuid.uuid4().hex[:12]}")
    name = Column(String(128), nullable=False, index=True)
    url = Column(String(512), nullable=False)
    ingestion_key = Column(String(64), unique=True, nullable=False, index=True)

    status = Column(String(32), default="active", nullable=False)  # active, paused, error
    interval_seconds = Column(Integer, default=30, nullable=False)
    check_ssl = Column(Boolean, default=True, nullable=False)
    check_dns = Column(Boolean, default=True, nullable=False)
    expected_status_code = Column(Integer, default=200, nullable=False)
    timeout_seconds = Column(Float, default=10.0, nullable=False)

    # Health & Observability Metrics
    last_checked_at = Column(DateTime(timezone=True), nullable=True, index=True)
    last_status = Column(String(32), default="pending", nullable=False)  # up, down, degraded, pending
    last_status_code = Column(Integer, nullable=True)
    last_response_time_ms = Column(Float, default=0.0, nullable=False)
    uptime_percentage = Column(Float, default=100.0, nullable=False)
    total_checks = Column(Integer, default=0, nullable=False)
    successful_checks = Column(Integer, default=0, nullable=False)

    # SSL details
    ssl_valid = Column(Boolean, default=True, nullable=False)
    ssl_expires_at = Column(DateTime(timezone=True), nullable=True)
    ssl_days_remaining = Column(Integer, nullable=True)
    ssl_issuer = Column(String(256), nullable=True)

    # DNS details
    dns_ip = Column(String(128), nullable=True)
    dns_lookup_time_ms = Column(Float, default=0.0, nullable=False)

    # GitHub integration
    github_repo = Column(String(256), nullable=True)
    github_branch = Column(String(128), default="main", nullable=False)

    # Audit & ownership
    created_by = Column(String(36), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    checks = relationship("WebsiteCheckResult", back_populates="website", cascade="all, delete-orphan", order_by="desc(WebsiteCheckResult.checked_at)")
    sdk_events = relationship("WebsiteSDKEvent", back_populates="website", cascade="all, delete-orphan", order_by="desc(WebsiteSDKEvent.timestamp)")

    __table_args__ = (
        Index("ix_monitored_websites_status_checked", "status", "last_checked_at"),
    )


class WebsiteCheckResult(Base):
    """
    Individual synthetic health check result recorded during monitoring.
    """
    __tablename__ = "website_check_results"

    id = Column(String(36), primary_key=True, default=lambda: f"chk-{uuid.uuid4().hex[:12]}")
    website_id = Column(String(36), ForeignKey("monitored_websites.id", ondelete="CASCADE"), nullable=False, index=True)
    checked_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    status = Column(String(32), nullable=False)  # up, down, degraded
    status_code = Column(Integer, nullable=True)
    response_time_ms = Column(Float, default=0.0, nullable=False)
    dns_lookup_time_ms = Column(Float, default=0.0, nullable=False)

    ssl_valid = Column(Boolean, default=True, nullable=False)
    ssl_days_remaining = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
    headers_json = Column(Text, nullable=True)

    website = relationship("MonitoredWebsite", back_populates="checks")

    __table_args__ = (
        Index("ix_website_checks_website_date", "website_id", "checked_at"),
    )


class WebsiteSDKEvent(Base):
    """
    Client-side or backend SDK telemetry event transmitted to LogPilot AI.
    """
    __tablename__ = "website_sdk_events"

    id = Column(String(36), primary_key=True, default=lambda: f"evt-{uuid.uuid4().hex[:12]}")
    website_id = Column(String(36), ForeignKey("monitored_websites.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(64), nullable=False, index=True)  # error, unhandled_rejection, api_failure, console_error, web_vital, log
    timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    severity = Column(String(32), default="ERROR", nullable=False, index=True)  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    message = Column(Text, nullable=False)
    source_file = Column(String(512), nullable=True)
    line_number = Column(Integer, nullable=True)
    col_number = Column(Integer, nullable=True)
    stack_trace = Column(Text, nullable=True)
    url = Column(String(512), nullable=True)
    user_agent = Column(String(256), nullable=True)
    metadata_json = Column(Text, nullable=True)
    ai_analysis_json = Column(Text, nullable=True)

    website = relationship("MonitoredWebsite", back_populates="sdk_events")

    __table_args__ = (
        Index("ix_website_sdk_website_timestamp", "website_id", "timestamp"),
        Index("ix_website_sdk_event_severity", "event_type", "severity"),
    )
