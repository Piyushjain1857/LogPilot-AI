import os
import threading
from concurrent.futures import ThreadPoolExecutor
from typing import Optional, Dict
from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.models.upload_batch import UploadBatch
from app.ingestion.ingestion_pipeline import IngestionPipeline
from app.core.config import settings


class IngestionManager:
    """Manages bounded concurrent worker execution and job lifecycle."""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(IngestionManager, cls).__new__(cls)
                cls._instance._executor = ThreadPoolExecutor(
                    max_workers=settings.MAX_CONCURRENT_INGESTION_JOBS,
                    thread_name_prefix="logpilot-ingestor",
                )
            return cls._instance

    def submit_job(
        self,
        upload_id: str,
        file_path: str,
        encoding: str = "utf-8",
        field_mappings: Optional[Dict[str, str]] = None,
    ):
        """Dispatches an ingestion job to the bounded background worker pool."""
        self._executor.submit(
            IngestionPipeline.process_upload,
            upload_id=upload_id,
            file_path=file_path,
            encoding=encoding,
            field_mappings=field_mappings,
        )

    @staticmethod
    def cancel_job(upload_id: str) -> bool:
        """Sets status to CANCELLED so worker cooperatively halts at the next check."""
        db: Session = SessionLocal()
        try:
            batch = db.query(UploadBatch).filter(UploadBatch.id == upload_id).first()
            if not batch:
                return False
            if batch.status in ("COMPLETED", "PARTIALLY_COMPLETED", "FAILED", "CANCELLED"):
                return False
            batch.status = "CANCELLED"
            db.commit()
            return True
        finally:
            db.close()

    @staticmethod
    def recover_interrupted_jobs():
        """Marks any PENDING or PROCESSING jobs from a prior crash/restart as INTERRUPTED."""
        db: Session = SessionLocal()
        try:
            stuck_batches = db.query(UploadBatch).filter(
                UploadBatch.status.in_(["PENDING", "VALIDATING", "PROCESSING"])
            ).all()
            for b in stuck_batches:
                b.status = "INTERRUPTED"
                b.error_summary_json = '["Job was interrupted by application shutdown or server restart."]'
            if stuck_batches:
                db.commit()
        except Exception:
            db.rollback()
        finally:
            db.close()


ingestion_manager = IngestionManager()
