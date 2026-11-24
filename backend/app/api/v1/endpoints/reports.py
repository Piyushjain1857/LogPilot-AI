import json
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.report_service import report_service
from app.schemas.report import (
    ReportResponse,
    ReportCreate,
    GenerateReportRequest,
)

router = APIRouter(prefix="/reports", tags=["Reports & Post-Mortems"])


def _format_report(r: Any) -> Dict[str, Any]:
    timeline = json.loads(r.timeline_json) if isinstance(r.timeline_json, str) else (r.timeline_json or [])
    metrics = json.loads(r.metrics_json) if isinstance(r.metrics_json, str) else (r.metrics_json or {})
    return {
        "id": r.id,
        "report_number": r.report_number,
        "incident_id": r.incident_id,
        "title": r.title,
        "category": r.category,
        "status": r.status,
        "summary": r.summary,
        "impact_assessment": r.impact_assessment,
        "root_cause_analysis": r.root_cause_analysis,
        "remediation_summary": r.remediation_summary,
        "author": r.author,
        "timeline": timeline,
        "metrics": metrics,
        "created_at": r.created_at,
        "updated_at": r.updated_at,
    }


@router.get("", response_model=List[ReportResponse])
def get_reports(
    category: Optional[str] = Query(None, description="INCIDENT_POSTMORTEM, SLA_AUDIT, SECURITY_COMPLIANCE"),
    status: Optional[str] = Query(None, description="DRAFT, FINALIZED, ARCHIVED"),
    search: Optional[str] = Query(None, description="Search term"),
    db: Session = Depends(get_db),
):
    """Lists executive post-mortems and reliability audit reports."""
    reports = report_service.list_reports(db, category=category, status=status, search=search)
    return [_format_report(r) for r in reports]


@router.get("/{report_id}", response_model=ReportResponse)
def get_report(report_id: str, db: Session = Depends(get_db)):
    """Retrieves full post-mortem report detail including chronological timeline."""
    report = report_service.get_report(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found")
    return _format_report(report)


@router.post("/generate", response_model=ReportResponse)
def generate_postmortem(request: GenerateReportRequest, db: Session = Depends(get_db)):
    """Autonomously synthesizes a post-mortem report from an incident."""
    try:
        report = report_service.generate_postmortem(
            db,
            incident_id=request.incident_id,
            custom_title=request.title,
        )
        return _format_report(report)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{report_id}/export/pdf")
def export_report_pdf(report_id: str, db: Session = Depends(get_db)):
    """Generates and downloads an executive PDF post-mortem document."""
    report = report_service.get_report(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found")

    pdf_bytes = report_service.export_pdf(report)
    filename = f"report-{(report.report_number or report.id).lower()}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/{report_id}/export/markdown")
def export_report_markdown(report_id: str, db: Session = Depends(get_db)):
    """Exports post-mortem as GitHub Flavored Markdown."""
    report = report_service.get_report(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found")

    md_text = report_service.export_markdown(report)
    return Response(content=md_text, media_type="text/markdown")


@router.get("/{report_id}/export/json")
def export_report_json(report_id: str, db: Session = Depends(get_db)):
    """Exports structured post-mortem telemetry as JSON."""
    report = report_service.get_report(db, report_id)
    if not report:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found")

    return report_service.export_json(report)
