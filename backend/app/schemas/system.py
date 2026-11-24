from pydantic import BaseModel


class SystemStatusResponse(BaseModel):
    backend_status: str
    database_connected: bool
    app_version: str
    environment: str
    uptime_seconds: float
    current_timestamp: str
    gemini_status: str


class SystemCapabilitiesResponse(BaseModel):
    log_file_ingestion: str
    real_time_streaming: str
    log_parsing: str
    severity_classification: str
    anomaly_detection: str
    log_clustering: str
    incident_management: str
    root_cause_correlation: str
    ai_troubleshooting: str
    remediation_playbooks: str
    report_generation: str
