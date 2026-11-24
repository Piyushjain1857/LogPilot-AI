import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.ingestion.ingestion_queue import ingestion_queue, IngestionJob
from app.ingestion.backpressure_manager import BackpressureManager
from app.ingestion.ingestion_worker import ingestion_worker
from app.services.streaming_metrics_service import streaming_metrics_service
from app.core.config import settings


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class RealtimeIngestor:
    """Accepts validated log payloads, validates queue capacity, and dispatches to the ingestion queue."""

    @classmethod
    async def ingest_single_log(
        cls,
        source_id: str,
        record: Dict[str, Any],
        ingestion_method: str = "REST_API",
    ) -> str:
        """
        Accepts a single log record.
        Enforces backpressure and places it in the bounded ingestion queue.
        Returns the unique receipt ID.
        """
        if settings.ENABLE_REALTIME_INGESTION and (
            not ingestion_worker._running
            or ingestion_worker._task is None
            or ingestion_worker._task.done()
        ):
            ingestion_worker.start()

        BackpressureManager.check_capacity(1)

        receipt_id = f"rcpt-{uuid.uuid4().hex[:12]}"
        job = IngestionJob(
            receipt_id=receipt_id,
            source_id=source_id,
            batch_id=None,
            ingestion_method=ingestion_method,
            records=[record],
            submitted_at=utc_now(),
        )

        streaming_metrics_service.record_request_accepted(1)
        await ingestion_queue.put(job)
        return receipt_id

    @classmethod
    async def ingest_batch_logs(
        cls,
        source_id: str,
        records: List[Dict[str, Any]],
        batch_id: Optional[str] = None,
        ingestion_method: str = "REST_API",
    ) -> str:
        """
        Accepts a batch of log records.
        Enforces backpressure and places them in the bounded ingestion queue.
        Returns the unique receipt ID.
        """
        if settings.ENABLE_REALTIME_INGESTION and (
            not ingestion_worker._running
            or ingestion_worker._task is None
            or ingestion_worker._task.done()
        ):
            ingestion_worker.start()

        count = len(records)
        BackpressureManager.check_capacity(count)

        receipt_id = f"rcpt-batch-{uuid.uuid4().hex[:12]}"
        job = IngestionJob(
            receipt_id=receipt_id,
            source_id=source_id,
            batch_id=batch_id,
            ingestion_method=ingestion_method,
            records=records,
            submitted_at=utc_now(),
        )

        streaming_metrics_service.record_request_accepted(count)
        await ingestion_queue.put(job)
        return receipt_id
