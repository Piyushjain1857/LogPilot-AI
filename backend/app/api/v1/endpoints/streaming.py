import json
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.session import get_db
from app.models.stream_event import StreamEvent
from app.models.log import LogEntry
from app.schemas.streaming import (
    StreamStatusResponse,
    StreamMetricsResponse,
    StreamEventsReplayResponse,
)
from app.ingestion.ingestion_queue import ingestion_queue
from app.services.streaming_metrics_service import streaming_metrics_service
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/stream", tags=["Streaming & Telemetry"])


@router.get(
    "/status",
    response_model=StreamStatusResponse,
    summary="Get real-time streaming service status and queue depth",
)
def get_stream_status():
    metrics = streaming_metrics_service.get_metrics(
        queue_depth=ingestion_queue.qsize,
        active_workers=1,
        connected_clients=ws_manager.connected_clients_count,
    )
    return StreamStatusResponse(
        service_status="ONLINE",
        queue_depth=ingestion_queue.qsize,
        queue_capacity=ingestion_queue.maxsize,
        active_workers=1,
        connected_clients=ws_manager.connected_clients_count,
        last_persisted_event_timestamp=metrics["last_persisted_event_timestamp"],
    )


@router.get(
    "/metrics",
    response_model=StreamMetricsResponse,
    summary="Get operational ingestion throughput and latency metrics",
)
def get_stream_metrics():
    metrics = streaming_metrics_service.get_metrics(
        queue_depth=ingestion_queue.qsize,
        active_workers=1,
        connected_clients=ws_manager.connected_clients_count,
    )
    return StreamMetricsResponse(**metrics)


@router.get(
    "/events",
    response_model=StreamEventsReplayResponse,
    summary="Cursor-based committed event replay for missed log recovery",
)
def replay_stream_events(
    after_sequence: Optional[int] = Query(None, description="Sequence ID cursor to resume from"),
    limit: int = Query(100, ge=1, le=500, description="Max events to return"),
    source_id: Optional[str] = Query(None, description="Optional source filter"),
    severity: Optional[str] = Query(None, description="Optional severity filter"),
    service: Optional[str] = Query(None, description="Optional service filter"),
    db: Session = Depends(get_db),
):
    query = db.query(StreamEvent)
    if after_sequence is not None:
        query = query.filter(StreamEvent.sequence_id > after_sequence)

    if source_id:
        query = query.filter(StreamEvent.source_id == source_id)

    # Order ascending by sequence_id for continuous replay
    events = query.order_by(StreamEvent.sequence_id.asc()).limit(limit + 1).all()

    has_more = len(events) > limit
    returned_events = events[:limit]

    parsed_events = []
    max_seq = after_sequence or 0

    for ev in returned_events:
        max_seq = max(max_seq, ev.sequence_id)
        try:
            payload = json.loads(ev.payload_json)
        except Exception:
            payload = {}

        # Apply in-memory severity/service filters if specified
        if severity and str(payload.get("severity", "")).upper() != severity.upper():
            continue
        if service and payload.get("service_name") != service:
            continue

        parsed_events.append({
            "version": 1,
            "type": ev.event_type,
            "sequence": ev.sequence_id,
            "timestamp": ev.created_at.isoformat(),
            "data": payload,
        })

    # High water mark is max sequence_id in DB
    highest_seq_record = db.query(func.max(StreamEvent.sequence_id)).scalar() or 0

    return StreamEventsReplayResponse(
        events=parsed_events,
        high_water_mark=highest_seq_record,
        total_returned=len(parsed_events),
        has_more=has_more,
    )
