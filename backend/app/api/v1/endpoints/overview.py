from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.services.overview_service import OverviewService
from app.schemas.overview import OverviewSummaryResponse

router = APIRouter(prefix="/overview", tags=["Overview"])


@router.get("/summary", response_model=OverviewSummaryResponse, summary="Database Metric Summary")
def get_overview_summary(db: Session = Depends(get_db)):
    """
    Returns actual database-derived counts for total logs, error logs,
    warning logs, critical logs, active incidents, and configured sources.
    Returns zeros if no data exists.
    """
    return OverviewService.get_overview_summary(db=db)
