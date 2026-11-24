import json
import os
import time
from datetime import datetime, timezone
from typing import Optional, Dict, List
from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.models.upload_batch import UploadBatch
from app.models.source import LogSource
from app.models.log import LogEntry
from app.parsers.parser_factory import ParserFactory
from app.core.config import settings


def utc_now():
    return datetime.now(timezone.utc)


class IngestionPipeline:
    """Executes file ingestion, batch persistence, sensitive data redaction, and progress tracking."""

    @classmethod
    def process_upload(
        cls,
        upload_id: str,
        file_path: str,
        encoding: str = "utf-8",
        field_mappings: Optional[Dict[str, str]] = None,
    ) -> None:
        db: Session = SessionLocal()
        start_time = time.time()
        record_errors: List[Dict] = []

        try:
            batch = db.query(UploadBatch).filter(UploadBatch.id == upload_id).first()
            if not batch:
                return

            if batch.status == "CANCELLED":
                return

            batch.status = "PROCESSING"
            batch.started_at = utc_now()
            db.commit()

            source = db.query(LogSource).filter(LogSource.id == batch.source_id).first()
            default_service = source.service_name if source else "unknown-service"

            parser = ParserFactory.get_parser(batch.file_format)
            log_buffer: List[LogEntry] = []

            successful_count = 0
            failed_count = 0
            skipped_count = 0
            redacted_count = 0
            processed_count = 0

            is_cancelled = False

            for record in parser.parse(
                file_path=file_path,
                encoding=encoding,
                default_service=default_service,
                field_mappings=field_mappings,
                max_records=settings.MAX_UPLOAD_RECORDS,
            ):
                # Periodic cooperative cancellation check every 250 records
                if processed_count % 250 == 0:
                    db.refresh(batch)
                    if batch.status == "CANCELLED":
                        is_cancelled = True
                        break

                processed_count += 1

                if not record.is_valid:
                    failed_count += 1
                    if len(record_errors) < settings.MAX_INGESTION_ERRORS:
                        record_errors.append({
                            "line_number": record.line_number,
                            "raw_content": record.raw_message[:200] if record.raw_message else None,
                            "error_reason": record.error_reason or "Invalid record structure",
                        })
                    continue

                if record.is_redacted:
                    redacted_count += 1

                log_entry = LogEntry(
                    source_id=batch.source_id,
                    upload_batch_id=batch.id,
                    timestamp=record.timestamp,
                    severity=record.severity,
                    service_name=record.service_name,
                    message=record.message,
                    raw_message=record.raw_message,
                    trace_id=record.trace_id,
                    span_id=record.span_id,
                    metadata_json=json.dumps(record.metadata) if record.metadata else None,
                    line_number=record.line_number,
                    parsing_status=record.parsing_status,
                )
                log_buffer.append(log_entry)
                successful_count += 1

                # Flush batch
                if len(log_buffer) >= settings.INGESTION_BATCH_SIZE:
                    db.bulk_save_objects(log_buffer)
                    db.commit()
                    log_buffer.clear()

                    # Update batch progress in DB
                    batch.processed_records = processed_count
                    batch.successful_records = successful_count
                    batch.failed_records = failed_count
                    batch.redacted_records = redacted_count
                    batch.total_records = processed_count
                    db.commit()

            # Flush remaining entries
            if log_buffer:
                db.bulk_save_objects(log_buffer)
                db.commit()
                log_buffer.clear()

            duration_ms = round((time.time() - start_time) * 1000, 2)
            total_records = successful_count + failed_count + skipped_count

            # Finalize status
            if is_cancelled:
                batch.status = "CANCELLED"
            elif total_records == 0:
                batch.status = "COMPLETED"
            elif failed_count > 0 and successful_count > 0:
                batch.status = "PARTIALLY_COMPLETED"
            elif failed_count > 0 and successful_count == 0:
                batch.status = "FAILED"
            else:
                batch.status = "COMPLETED"

            batch.total_records = total_records
            batch.processed_records = processed_count
            batch.successful_records = successful_count
            batch.failed_records = failed_count
            batch.skipped_records = skipped_count
            batch.redacted_records = redacted_count
            batch.processing_duration_ms = duration_ms
            batch.completed_at = utc_now()
            if record_errors:
                batch.error_summary_json = json.dumps(record_errors)

            if source and successful_count > 0:
                source.last_ingested_at = utc_now()

            db.commit()

        except Exception as e:
            db.rollback()
            try:
                batch = db.query(UploadBatch).filter(UploadBatch.id == upload_id).first()
                if batch:
                    batch.status = "FAILED"
                    batch.completed_at = utc_now()
                    batch.error_summary_json = json.dumps([{"error_reason": f"Fatal processing error: {str(e)}"}])
                    db.commit()
            except Exception:
                pass
        finally:
            # Clean up temporary file
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception:
                pass
            db.close()
