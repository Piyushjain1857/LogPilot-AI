from pydantic import BaseModel


class OverviewSummaryResponse(BaseModel):
    total_logs: int
    error_logs: int
    warning_logs: int
    critical_logs: int
    active_incidents: int
    configured_sources: int
