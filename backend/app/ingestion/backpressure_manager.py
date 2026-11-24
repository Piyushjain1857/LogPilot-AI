from fastapi import HTTPException, status
from app.core.config import settings
from app.ingestion.ingestion_queue import ingestion_queue


class BackpressureManager:
    """Monitors ingestion buffer utilization and enforces backpressure to protect system stability."""

    @classmethod
    def check_capacity(cls, requested_records: int = 1) -> None:
        """
        Validates whether the ingestion queue has sufficient headroom.
        Raises HTTP 503 or HTTP 429 if the buffer is saturated.
        """
        current_depth = ingestion_queue.qsize
        max_depth = settings.MAX_INGESTION_QUEUE_SIZE

        if current_depth >= max_depth:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Ingestion queue is at maximum capacity. Please retry shortly.",
                headers={"Retry-After": "5"},
            )

        if current_depth + requested_records > max_depth:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Incoming batch of {requested_records} records exceeds available queue capacity.",
                headers={"Retry-After": "2"},
            )
