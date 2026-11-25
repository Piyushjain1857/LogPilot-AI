from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, HttpUrl, ConfigDict


class WebsiteBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=128, description="Human-readable project or website name")
    url: str = Field(..., description="Target website or API URL to monitor")
    interval_seconds: int = Field(30, ge=5, le=3600, description="Check frequency in seconds")
    check_ssl: bool = Field(True, description="Whether to verify SSL certificate and expiry")
    check_dns: bool = Field(True, description="Whether to perform DNS resolution time checks")
    expected_status_code: int = Field(200, ge=100, le=599, description="Expected HTTP response status code")
    timeout_seconds: float = Field(10.0, ge=1.0, le=60.0, description="HTTP request timeout")
    github_repo: Optional[str] = Field(None, max_length=256, description="Optional GitHub repository (e.g. org/repo)")
    github_branch: str = Field("main", max_length=128, description="Target repository branch for code correlation")


class WebsiteCreate(WebsiteBase):
    pass


class WebsiteUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=128)
    url: Optional[str] = None
    interval_seconds: Optional[int] = Field(None, ge=5, le=3600)
    check_ssl: Optional[bool] = None
    check_dns: Optional[bool] = None
    expected_status_code: Optional[int] = Field(None, ge=100, le=599)
    timeout_seconds: Optional[float] = Field(None, ge=1.0, le=60.0)
    github_repo: Optional[str] = None
    github_branch: Optional[str] = None


class WebsiteCheckResultSchema(BaseModel):
    id: str
    website_id: str
    checked_at: datetime
    status: str
    status_code: Optional[int] = None
    response_time_ms: float
    dns_lookup_time_ms: float
    ssl_valid: bool
    ssl_days_remaining: Optional[int] = None
    error_message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class WebsiteSDKEventSchema(BaseModel):
    id: str
    website_id: str
    event_type: str
    timestamp: datetime
    severity: str
    message: str
    source_file: Optional[str] = None
    line_number: Optional[int] = None
    col_number: Optional[int] = None
    stack_trace: Optional[str] = None
    url: Optional[str] = None
    user_agent: Optional[str] = None
    metadata_json: Optional[str] = None
    ai_analysis_json: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class WebsiteResponse(WebsiteBase):
    id: str
    ingestion_key: str
    status: str
    last_checked_at: Optional[datetime] = None
    last_status: str
    last_status_code: Optional[int] = None
    last_response_time_ms: float
    uptime_percentage: float
    total_checks: int
    successful_checks: int
    ssl_valid: bool
    ssl_expires_at: Optional[datetime] = None
    ssl_days_remaining: Optional[int] = None
    ssl_issuer: Optional[str] = None
    dns_ip: Optional[str] = None
    dns_lookup_time_ms: float
    created_at: datetime
    updated_at: datetime

    recent_checks: List[WebsiteCheckResultSchema] = []
    recent_sdk_events: List[WebsiteSDKEventSchema] = []

    model_config = ConfigDict(from_attributes=True)


class WebsiteListResponse(BaseModel):
    websites: List[WebsiteResponse]
    total_count: int
    online_count: int
    offline_count: int
    degraded_count: int


# SDK Telemetry Ingestion Schemas
class SDKTelemetryEvent(BaseModel):
    event_type: str = Field(..., description="error, unhandled_rejection, api_failure, console_error, web_vital, log")
    timestamp: Optional[str] = None
    severity: Optional[str] = Field("ERROR", description="DEBUG, INFO, WARNING, ERROR, CRITICAL")
    message: str
    source_file: Optional[str] = None
    line_number: Optional[int] = None
    col_number: Optional[int] = None
    stack_trace: Optional[str] = None
    url: Optional[str] = None
    user_agent: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class SDKBatchIngestRequest(BaseModel):
    events: List[SDKTelemetryEvent]


class SDKIngestResponse(BaseModel):
    status: str
    ingested_count: int
    website_id: str
    website_name: str


# AI Diagnostic Schemas
class EvidenceItem(BaseModel):
    type: str  # log, check, stack_trace, network
    timestamp: str
    source: str
    content: str
    confirmed: bool = True


class AIDiagnosticResponse(BaseModel):
    website_id: str
    website_name: str
    error_summary: str
    severity: str  # CRITICAL, ERROR, WARNING
    affected_service: str
    probable_root_cause: str
    confidence_level: str  # HIGH, MEDIUM, LOW (with percentage)
    confidence_score: float
    is_confirmed_finding: bool = True
    ai_generated_hypotheses: List[str] = []
    supporting_evidence: List[EvidenceItem] = []
    suggested_solution: str
    suggested_code_patch: Optional[str] = None
    recommended_prevention_measures: List[str] = []
    created_at: datetime


class GitHubPatchResponse(BaseModel):
    repository: str
    branch: str
    affected_file: Optional[str] = None
    diff: str
    description: str
    explanation: str
    is_review_only: bool = True
