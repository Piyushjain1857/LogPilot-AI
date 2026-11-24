import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.anomaly_detector import AnomalyDetectionService
from app.schemas.anomaly import (
    AnomalyResponse,
    AnomalyDetailResponse,
    AnomalyListResponse,
    AnomalyStatusUpdate,
    DetectionTriggerRequest,
    DetectionRunResponse,
    AnomalyStatisticsResponse,
    ServiceBaselineResponse,
    DetectionConfigResponse,
    DetectionConfigUpdate,
)
from app.models.anomaly import ServiceBaseline

router = APIRouter(prefix="/anomalies", tags=["Anomaly Detection"])


@router.get("", response_model=AnomalyListResponse)
def list_anomalies(
    service: Optional[str] = Query(None, description="Filter by service name"),
    severity: Optional[str] = Query(None, description="Filter by severity (LOW, MEDIUM, HIGH, CRITICAL)"),
    status: Optional[str] = Query(None, description="Filter by status (ACTIVE, ACKNOWLEDGED, RESOLVED, FALSE_POSITIVE)"),
    algorithm: Optional[str] = Query(None, description="Filter by detection algorithm"),
    anomaly_type: Optional[str] = Query(None, description="Filter by anomaly type"),
    start_time: Optional[datetime.datetime] = Query(None, description="Start timestamp (ISO 8601)"),
    end_time: Optional[datetime.datetime] = Query(None, description="End timestamp (ISO 8601)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    db: Session = Depends(get_db),
):
    """
    Query system anomalies with multi-factor filtering, severity sorting, and pagination.
    """
    detector = AnomalyDetectionService(db)
    items, total = detector.list_anomalies(
        service=service,
        severity=severity,
        status=status,
        algorithm=algorithm,
        anomaly_type=anomaly_type,
        start_time=start_time,
        end_time=end_time,
        page=page,
        page_size=page_size,
    )

    total_pages = max(1, (total + page_size - 1) // page_size)
    return AnomalyListResponse(
        items=[AnomalyResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/statistics", response_model=AnomalyStatisticsResponse)
def get_anomaly_statistics(db: Session = Depends(get_db)):
    """
    Aggregate summary metrics: active anomaly count by severity, average score, and hourly 24h trends.
    """
    detector = AnomalyDetectionService(db)
    return detector.get_statistics()


@router.get("/configuration", response_model=DetectionConfigResponse)
def get_detection_configuration(db: Session = Depends(get_db)):
    """
    Retrieve active algorithm sensitivity thresholds and baseline parameters.
    """
    detector = AnomalyDetectionService(db)
    cfg = detector.get_configuration()
    return DetectionConfigResponse(**cfg)


@router.patch("/configuration", response_model=DetectionConfigResponse)
def update_detection_configuration(
    body: DetectionConfigUpdate,
    db: Session = Depends(get_db),
):
    """
    Update sensitivity thresholds (Z-score, MAD, EWMA, Isolation Forest).
    """
    detector = AnomalyDetectionService(db)
    updated = detector.update_configuration(body.model_dump(exclude_unset=True))
    return DetectionConfigResponse(**updated)


@router.get("/baselines", response_model=List[ServiceBaselineResponse])
def get_service_baselines(
    service: Optional[str] = Query(None, description="Filter by service"),
    window: Optional[str] = Query(None, description="Filter by window size (1m, 5m, 15m, 1h)"),
    db: Session = Depends(get_db),
):
    """
    Retrieve computed statistical baseline envelopes per service and metric.
    """
    query = db.query(ServiceBaseline)
    if service:
        query = query.filter(ServiceBaseline.service_name == service)
    if window:
        query = query.filter(ServiceBaseline.time_window == window)

    baselines = query.order_by(ServiceBaseline.service_name.asc(), ServiceBaseline.metric_name.asc()).all()
    return [ServiceBaselineResponse.model_validate(b) for b in baselines]


@router.post("/baselines/rebuild", response_model=List[ServiceBaselineResponse])
def rebuild_service_baselines(
    window: str = Query("5m", description="Window size to build (1m, 5m, 15m, 1h)"),
    history_days: int = Query(7, ge=1, le=30, description="Historical depth in days"),
    db: Session = Depends(get_db),
):
    """
    Recompute statistical metric baselines across historical log activity.
    """
    detector = AnomalyDetectionService(db)
    baselines = detector.rebuild_baselines(window_str=window, history_days=history_days)
    return [ServiceBaselineResponse.model_validate(b) for b in baselines]


@router.post("/detect", response_model=DetectionRunResponse)
def trigger_anomaly_detection(
    body: DetectionTriggerRequest,
    db: Session = Depends(get_db),
):
    """
    Trigger manual or scheduled multi-method anomaly detection across tumbling windows.
    """
    detector = AnomalyDetectionService(db)
    run_record = detector.run_detection(
        start_time=body.start_time,
        end_time=body.end_time,
        window_minutes=body.window_minutes,
        service_name=body.service_name,
        algorithm=body.algorithm,
    )
    return DetectionRunResponse.model_validate(run_record)


@router.get("/{anomaly_id}", response_model=AnomalyDetailResponse)
def get_anomaly_detail(anomaly_id: int, db: Session = Depends(get_db)):
    """
    Retrieve full anomaly diagnostics, surrounding log window events, and metric baseline envelopes.
    """
    detector = AnomalyDetectionService(db)
    detail = detector.get_anomaly_detail(anomaly_id)
    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Anomaly with ID {anomaly_id} not found",
        )

    anom = detail["anomaly"]
    return AnomalyDetailResponse(
        id=anom.id,
        detected_at=anom.detected_at,
        time_window_start=anom.time_window_start,
        time_window_end=anom.time_window_end,
        service_name=anom.service_name,
        anomaly_type=anom.anomaly_type,
        severity=anom.severity,
        anomaly_score=anom.anomaly_score,
        algorithm=anom.algorithm,
        metric_name=anom.metric_name,
        observed_value=anom.observed_value,
        expected_value=anom.expected_value,
        threshold=anom.threshold,
        context_payload=anom.context_payload,
        status=anom.status,
        baseline=detail["baseline"],
        surrounding_logs=detail["surrounding_logs"],
    )


@router.patch("/{anomaly_id}/status", response_model=AnomalyResponse)
def update_anomaly_status(
    anomaly_id: int,
    body: AnomalyStatusUpdate,
    db: Session = Depends(get_db),
):
    """
    Transition anomaly lifecycle status (ACTIVE, ACKNOWLEDGED, RESOLVED, FALSE_POSITIVE).
    """
    detector = AnomalyDetectionService(db)
    updated = detector.update_anomaly_status(anomaly_id, body.status)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Anomaly with ID {anomaly_id} not found",
        )
    return AnomalyResponse.model_validate(updated)
