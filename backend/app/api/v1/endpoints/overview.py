from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.services.overview_service import OverviewService
from app.schemas.overview import (
    OverviewSummaryResponse,
    LogActivityResponse,
    SeverityDistributionResponse,
    RecentIncidentsResponse,
    SourceHealthResponse,
)

router = APIRouter(prefix="/overview", tags=["Overview"])


@router.get("/summary", response_model=OverviewSummaryResponse, summary="Database Metric Summary")
def get_overview_summary(db: Session = Depends(get_db)):
    """
    Returns actual database-derived counts for total logs, error logs,
    warning logs, critical logs, active incidents, and configured sources.
    Returns zeros if no data exists.
    """
    return OverviewService.get_overview_summary(db=db)


@router.get("/activity", response_model=LogActivityResponse, summary="Log Activity Time Series")
def get_log_activity(
    range: str = Query("24h", description="Time range: 1h, 6h, 12h, 24h, 7d"),
    db: Session = Depends(get_db),
):
    """
    Returns aggregated log frequency points grouped into time buckets.
    """
    return OverviewService.get_log_activity(db=db, time_range=range)


@router.get(
    "/severity-distribution",
    response_model=SeverityDistributionResponse,
    summary="Log Severity Breakdown",
)
def get_severity_distribution(db: Session = Depends(get_db)):
    """
    Returns counts and percentages grouped by severity level.
    """
    return OverviewService.get_severity_distribution(db=db)


@router.get(
    "/recent-incidents",
    response_model=RecentIncidentsResponse,
    summary="Recent Incidents Feed",
)
def get_recent_incidents(
    limit: int = Query(5, ge=1, le=50, description="Max incidents to retrieve"),
    db: Session = Depends(get_db),
):
    """
    Returns most recently detected incidents with bounded pagination.
    """
    return OverviewService.get_recent_incidents(db=db, limit=limit)


@router.get(
    "/source-health",
    response_model=SourceHealthResponse,
    summary="Configured Source Health Status",
)
def get_source_health(db: Session = Depends(get_db)):
    """
    Returns configured sources with their health status based on recent telemetry.
    """
    return OverviewService.get_source_health(db=db)
