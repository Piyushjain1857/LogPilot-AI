from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class ReportBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=256)
    report_number: Optional[str] = None
    category: str = Field("INCIDENT_POSTMORTEM", description="INCIDENT_POSTMORTEM, SLA_AUDIT, SECURITY_COMPLIANCE")
    status: str = Field("FINALIZED", description="DRAFT, FINALIZED, ARCHIVED")
    summary: str
    impact_assessment: str
    root_cause_analysis: str
    remediation_summary: str
    author: str = "LogPilot AI Autonomous SRE"


class ReportCreate(ReportBase):
    incident_id: Optional[str] = None
    timeline: List[Dict[str, Any]] = Field(default_factory=list)
    metrics: Dict[str, Any] = Field(default_factory=dict)


class ReportResponse(ReportBase):
    id: str
    incident_id: Optional[str] = None
    timeline: List[Dict[str, Any]] = Field(default_factory=list)
    metrics: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GenerateReportRequest(BaseModel):
    incident_id: str
    title: Optional[str] = None


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    context_incident_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    query_translation: Optional[str] = None
    suggested_actions: List[Dict[str, Any]] = Field(default_factory=list)
