from typing import Optional
from fastapi import APIRouter, Depends, Query, Path, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.root_cause import (
    RCARequest,
    RCAResponse,
    GlobalTopologyResponse,
)
from app.services.root_cause_engine import RootCauseEngine
from app.models.analysis import AnalysisRun

router = APIRouter()


@router.post(
    "/analyze",
    response_model=RCAResponse,
    summary="Trigger Evidence-Based Root Cause Analysis",
)
def trigger_root_cause_analysis(
    req: RCARequest = RCARequest(),
    db: Session = Depends(get_db),
):
    """
    Executes multi-factor causal graph analysis across service topology,
    identifying root origin services, propagation paths, and verified log citations.
    """
    return RootCauseEngine.analyze_root_cause(
        db=db,
        incident_id=req.incident_id,
        lookback_minutes=req.lookback_minutes,
        service_filter=req.service_filter,
    )


@router.get(
    "/topology",
    response_model=GlobalTopologyResponse,
    summary="Get Global Service Dependency Topology",
)
def get_service_topology(db: Session = Depends(get_db)):
    """
    Returns global service topology inferred from trace spans and system communication graphs.
    """
    return RootCauseEngine.get_global_topology(db=db)


@router.get(
    "/{analysis_id}",
    response_model=RCAResponse,
    summary="Get RCA Run by Analysis ID",
)
def get_analysis_by_id(
    analysis_id: str = Path(..., description="Unique analysis run identifier"),
    db: Session = Depends(get_db),
):
    """
    Retrieves full RCA result with ranked hypotheses, graph nodes & edges, and citations.
    """
    analysis = RootCauseEngine.get_analysis_by_id(db=db, analysis_id=analysis_id)
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis with ID '{analysis_id}' not found.",
        )
    return analysis


@router.get(
    "/incident/{incident_id}",
    response_model=RCAResponse,
    summary="Get Latest RCA for Incident",
)
def get_analysis_for_incident(
    incident_id: str = Path(..., description="Incident identifier"),
    db: Session = Depends(get_db),
):
    """
    Retrieves the most recent RCA analysis conducted for a specific incident,
    or executes a fresh run if none exists.
    """
    run = (
        db.query(AnalysisRun)
        .filter(
            AnalysisRun.incident_id == incident_id,
            AnalysisRun.analysis_type == "root_cause",
        )
        .order_by(AnalysisRun.created_at.desc())
        .first()
    )
    if run:
        analysis = RootCauseEngine.get_analysis_by_id(db=db, analysis_id=run.id)
        if analysis:
            return analysis

    # Generate analysis on demand
    return RootCauseEngine.analyze_root_cause(db=db, incident_id=incident_id)
