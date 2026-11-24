from typing import Optional
from fastapi import APIRouter, Depends, Query, Path, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.incident import (
    IncidentListResponse,
    IncidentDetailResponse,
    IncidentStatisticsResponse,
    IncidentStatusUpdate,
    IncidentAddNoteRequest,
    IncidentCorrelateRequest,
    IncidentCorrelateResponse,
)
from app.services.incident_service import IncidentService
from app.services.incident_correlator import IncidentCorrelator

router = APIRouter()


@router.get(
    "",
    response_model=IncidentListResponse,
    summary="List Operational Incidents",
)
def list_incidents(
    status: Optional[str] = Query(None, description="active, investigating, mitigated, resolved, closed, or ALL"),
    severity: Optional[str] = Query(None, description="CRITICAL, HIGH, MEDIUM, LOW, or ALL"),
    service: Optional[str] = Query(None, description="Filter by service name"),
    search: Optional[str] = Query(None, description="Search by title, description or incident number"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Retrieve paginated operational incidents with multi-field filtering.
    """
    return IncidentService.list_incidents(
        db=db,
        status=status,
        severity=severity,
        service=service,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/statistics",
    response_model=IncidentStatisticsResponse,
    summary="Incident Metrics and MTTR Statistics",
)
def get_incident_statistics(db: Session = Depends(get_db)):
    """
    Returns incident counts across severities, statuses, active counts, and Mean Time to Resolution (MTTR).
    """
    return IncidentService.get_statistics(db=db)


@router.post(
    "/correlate",
    response_model=IncidentCorrelateResponse,
    summary="Trigger Automated Multi-Signal Correlation",
)
def trigger_correlation(
    req: IncidentCorrelateRequest = IncidentCorrelateRequest(),
    db: Session = Depends(get_db),
):
    """
    Runs the automated correlation engine across recent anomalies and error clusters,
    merging related events into unified operational incidents.
    """
    result = IncidentCorrelator.correlate(
        db=db,
        lookback_minutes=req.lookback_minutes,
        force_recorrelate=req.force_recorrelate,
    )
    return IncidentCorrelateResponse(**result)


@router.get(
    "/{incident_id}",
    response_model=IncidentDetailResponse,
    summary="Get Incident Details with Timeline and Blast Radius",
)
def get_incident_detail(
    incident_id: str = Path(..., description="Unique incident identifier"),
    db: Session = Depends(get_db),
):
    """
    Retrieves full incident details, chronological timeline events, blast radius services,
    and associated forensic logs.
    """
    incident = IncidentService.get_incident_detail(db=db, incident_id=incident_id)
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with ID '{incident_id}' not found.",
        )
    return incident


@router.patch(
    "/{incident_id}/status",
    response_model=IncidentDetailResponse,
    summary="Update Incident Status or Assignee",
)
def update_incident_status(
    incident_id: str = Path(..., description="Unique incident identifier"),
    update: IncidentStatusUpdate = ...,
    db: Session = Depends(get_db),
):
    """
    Transitions incident lifecycle state (active, investigating, mitigated, resolved, closed),
    records timestamps, and appends a transition audit log to the incident timeline.
    """
    updated = IncidentService.update_status(db=db, incident_id=incident_id, update=update)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with ID '{incident_id}' not found.",
        )
    return updated


@router.post(
    "/{incident_id}/notes",
    response_model=IncidentDetailResponse,
    summary="Append Operator Note to Incident Timeline",
)
def add_incident_note(
    incident_id: str = Path(..., description="Unique incident identifier"),
    note_req: IncidentAddNoteRequest = ...,
    db: Session = Depends(get_db),
):
    """
    Appends an operator note or diagnostic insight directly to the incident's chronological timeline.
    """
    updated = IncidentService.add_note(db=db, incident_id=incident_id, note_req=note_req)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with ID '{incident_id}' not found.",
        )
    return updated
