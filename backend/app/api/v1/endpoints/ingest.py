import uuid
import json
from datetime import datetime, timezone
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.source import LogSource
from app.models.ingestion_token import IngestionToken
from app.models.ingestion_batch import IngestionBatch
from app.schemas.streaming import (
    LogRecordInput,
    SingleLogIngestResponse,
    BatchLogIngestRequest,
    BatchLogIngestResponse,
    BatchStatusResponse,
)
from app.services.source_token_service import get_authenticated_source
from app.services.rate_limit_service import rate_limit_service
from app.ingestion.realtime_ingestor import RealtimeIngestor
from app.core.config import settings

router = APIRouter(prefix="/ingest", tags=["Log Ingestion"])


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@router.post(
    "/logs",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=SingleLogIngestResponse,
    summary="Ingest a single structured log record",
)
async def ingest_single_log(
    record: LogRecordInput,
    auth_context=Depends(get_authenticated_source),
):
    """
    Receives an authenticated single log record.
    Applies rate limiting and enqueues for asynchronous processing, sanitization,
    template mining, persistence, and WebSocket broadcasting.
    """
    source, token = auth_context

    # Rate limiting
    rate_limit_service.check_rate_limit(source.id, record_count=1)

    # Message size limit
    if len(record.message.encode("utf-8")) > settings.MAX_LOG_MESSAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Log message exceeds {settings.MAX_LOG_MESSAGE_BYTES} byte limit."
        )

    receipt_id = await RealtimeIngestor.ingest_single_log(
        source_id=source.id,
        record=record.model_dump(),
        ingestion_method=source.source_type or "REST_API",
    )

    return SingleLogIngestResponse(
        status="ACCEPTED",
        event_id=record.event_id,
        source_id=source.id,
        service_name=record.service or source.service_name,
        receipt_id=receipt_id,
        accepted_at=utc_now(),
        is_duplicate=False,
    )


@router.post(
    "/batch",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=BatchLogIngestResponse,
    summary="Ingest a batch of structured log records",
)
async def ingest_batch_logs(
    batch_req: BatchLogIngestRequest,
    auth_context=Depends(get_authenticated_source),
    db: Session = Depends(get_db),
):
    """
    Receives an authenticated batch of log records (up to 500).
    Performs per-record validation, partial acceptance, applies rate limits,
    persists an IngestionBatch tracking record, and enqueues valid records.
    """
    source, token = auth_context

    total_records = len(batch_req.logs)
    if total_records > settings.MAX_INGESTION_BATCH_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Batch size {total_records} exceeds maximum allowed limit of {settings.MAX_INGESTION_BATCH_SIZE} records."
        )

    # Rate limiting
    rate_limit_service.check_rate_limit(source.id, record_count=total_records)

    valid_records: List[Dict[str, Any]] = []
    rejected_records: List[Dict[str, Any]] = []

    for idx, item in enumerate(batch_req.logs):
        item_dict = item.model_dump()
        msg_bytes = len(item.message.encode("utf-8"))
        if msg_bytes > settings.MAX_LOG_MESSAGE_BYTES:
            rejected_records.append({
                "index": idx,
                "event_id": item.event_id,
                "reason": f"Message size ({msg_bytes} bytes) exceeds limit ({settings.MAX_LOG_MESSAGE_BYTES} bytes)."
            })
            continue

        valid_records.append(item_dict)

    if not valid_records:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="All records in batch failed validation.",
        )

    # Create batch record in DB
    batch_record_id = str(uuid.uuid4())
    batch_record = IngestionBatch(
        id=batch_record_id,
        source_id=source.id,
        external_batch_id=batch_req.batch_id,
        status="PENDING",
        total_records=total_records,
        accepted_records=len(valid_records),
        duplicate_records=0,
        failed_records=len(rejected_records),
        created_at=utc_now(),
        error_summary_json=json.dumps(rejected_records) if rejected_records else None,
    )
    db.add(batch_record)
    db.commit()

    receipt_id = await RealtimeIngestor.ingest_batch_logs(
        source_id=source.id,
        records=valid_records,
        batch_id=batch_record_id,
        ingestion_method=source.source_type or "REST_API",
    )

    batch_status = "ACCEPTED" if len(rejected_records) == 0 else "PARTIALLY_ACCEPTED"

    return BatchLogIngestResponse(
        batch_id=batch_record_id,
        status=batch_status,
        total_records=total_records,
        accepted_records=len(valid_records),
        rejected_records=len(rejected_records),
        duplicate_records=0,
        receipt_id=receipt_id,
        accepted_at=utc_now(),
        errors=rejected_records if rejected_records else None,
    )


@router.get(
    "/batches/{batch_id}",
    response_model=BatchStatusResponse,
    summary="Retrieve ingestion batch status and processing metrics",
)
def get_batch_status(
    batch_id: str,
    db: Session = Depends(get_db),
):
    batch = db.query(IngestionBatch).filter(IngestionBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ingestion batch {batch_id} not found."
        )

    errors = None
    if batch.error_summary_json:
        try:
            errors = json.loads(batch.error_summary_json)
        except Exception:
            errors = None

    return BatchStatusResponse(
        id=batch.id,
        source_id=batch.source_id,
        external_batch_id=batch.external_batch_id,
        status=batch.status,
        total_records=batch.total_records,
        accepted_records=batch.accepted_records,
        persisted_records=batch.persisted_records,
        duplicate_records=batch.duplicate_records,
        failed_records=batch.failed_records,
        created_at=batch.created_at,
        started_at=batch.started_at,
        completed_at=batch.completed_at,
        error_summary=errors,
    )
