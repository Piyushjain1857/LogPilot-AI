import asyncio
import json
import time
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.models.log import LogEntry
from app.models.source import LogSource
from app.models.ingestion_batch import IngestionBatch
from app.models.stream_event import StreamEvent
from app.ingestion.ingestion_queue import ingestion_queue, IngestionJob
from app.ingestion.template_miner_service import template_miner_service
from app.utils.redaction import SensitiveDataRedactor
from app.services.streaming_metrics_service import streaming_metrics_service
from app.websocket.event_broadcaster import event_broadcaster
from app.core.logging import logger


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def parse_timestamp(val: Any) -> datetime:
    if isinstance(val, datetime):
        return val
    if isinstance(val, str) and val.strip():
        try:
            # Handle ISO-8601 strings
            clean = val.replace("Z", "+00:00")
            return datetime.fromisoformat(clean)
        except Exception:
            pass
    return utc_now()


class IngestionWorker:
    """
    Asynchronous background worker that dequeues, parses, sanitizes,
    mines Drain3 templates, persists, and broadcasts committed log records.
    """

    def __init__(self):
        self._running = False
        self._task: Optional[asyncio.Task] = None

    def start(self):
        try:
            current_loop = asyncio.get_running_loop()
        except RuntimeError:
            current_loop = None

        if self._task is None or self._task.done() or not self._running:
            self._running = True
            if current_loop:
                self._task = current_loop.create_task(self._run_loop())
            else:
                self._task = asyncio.create_task(self._run_loop())
            logger.info("Real-time Ingestion Worker started.")

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except (asyncio.CancelledError, Exception):
                pass
            self._task = None
            logger.info("Real-time Ingestion Worker stopped gracefully.")

    async def _run_loop(self):
        while self._running:
            try:
                job: IngestionJob = await ingestion_queue.get()
                await self._process_job(job)
                ingestion_queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in IngestionWorker loop: {e}", exc_info=True)
                await asyncio.sleep(0.1)

    async def _process_job(self, job: IngestionJob):
        # Run blocking DB & template mining in thread pool to keep event loop responsive
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, self._sync_process_job, job, loop)

    def _sync_process_job(self, job: IngestionJob, loop: Optional[asyncio.AbstractEventLoop] = None):
        db: Session = SessionLocal()
        start_time = time.time()
        persisted_records: List[LogEntry] = []
        duplicate_count = 0
        failed_count = 0

        try:
            source = db.query(LogSource).filter(LogSource.id == job.source_id).first()
            if not source:
                logger.warning(f"Ingestion job discarded: source {job.source_id} not found.")
                return

            batch: Optional[IngestionBatch] = None
            if job.batch_id:
                batch = db.query(IngestionBatch).filter(IngestionBatch.id == job.batch_id).first()
                if batch:
                    batch.status = "PROCESSING"
                    batch.started_at = utc_now()
                    db.commit()

            default_service = source.service_name or "unknown-service"

            for raw_record in job.records:
                try:
                    ext_id = raw_record.get("event_id")
                    
                    # 1. Idempotency Check: Source-scoped uniqueness
                    if ext_id:
                        existing = db.query(LogEntry).filter(
                            LogEntry.source_id == job.source_id,
                            LogEntry.external_event_id == ext_id,
                        ).first()
                        if existing:
                            duplicate_count += 1
                            streaming_metrics_service.record_persisted_event(
                                count=1,
                                is_duplicate=True,
                                severity=raw_record.get("severity", "INFO"),
                                service=raw_record.get("service") or default_service,
                            )
                            continue

                    # 2. Extract & Sanitize fields
                    raw_msg = str(raw_record.get("message", "")).strip()
                    redacted_msg = SensitiveDataRedactor.redact(raw_msg)
                    
                    metadata = raw_record.get("metadata")
                    if isinstance(metadata, dict):
                        redacted_metadata = SensitiveDataRedactor.redact_dict(metadata)
                        metadata_json = json.dumps(redacted_metadata)
                    else:
                        metadata_json = None

                    ts = parse_timestamp(raw_record.get("timestamp"))
                    sev = str(raw_record.get("severity", "INFO")).upper()
                    if sev not in {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL", "UNKNOWN"}:
                        sev = "INFO"

                    srv = str(raw_record.get("service") or default_service).strip()
                    trace_id = raw_record.get("trace_id")
                    span_id = raw_record.get("span_id")

                    # 3. Drain3 Template Extraction
                    tpl_id, _ = template_miner_service.match_or_create_template(redacted_msg)

                    log_entry = LogEntry(
                        source_id=job.source_id,
                        ingestion_batch_id=batch.id if batch else None,
                        external_event_id=ext_id,
                        ingestion_method=job.ingestion_method,
                        received_at=job.submitted_at,
                        persisted_at=utc_now(),
                        timestamp=ts,
                        severity=sev,
                        service_name=srv,
                        message=redacted_msg,
                        raw_message=raw_msg,
                        trace_id=trace_id,
                        span_id=span_id,
                        metadata_json=metadata_json,
                        parsing_status="SUCCESS",
                        template_id=tpl_id,
                    )
                    db.add(log_entry)
                    persisted_records.append(log_entry)

                except Exception as err:
                    failed_count += 1
                    logger.debug(f"Record processing failure: {err}")

            # 4. Commit Log Entries to Database
            db.commit()

            # 5. Create Stream Events & Dispatch committed records
            events_to_broadcast = []
            for entry in persisted_records:
                payload = {
                    "id": entry.id,
                    "event_id": entry.external_event_id,
                    "timestamp": entry.timestamp.isoformat() if entry.timestamp else utc_now().isoformat(),
                    "severity": entry.severity,
                    "service_name": entry.service_name,
                    "message": entry.message,
                    "trace_id": entry.trace_id,
                    "span_id": entry.span_id,
                    "source_id": entry.source_id,
                    "template_id": entry.template_id,
                    "ingestion_method": entry.ingestion_method,
                }
                payload_str = json.dumps(payload)

                stream_ev = StreamEvent(
                    event_type="log.created",
                    log_entry_id=entry.id,
                    source_id=entry.source_id,
                    payload_json=payload_str,
                    created_at=utc_now(),
                )
                db.add(stream_ev)
                events_to_broadcast.append((payload, stream_ev, entry))

            db.commit()

            # 6. Update Source Health & Counters
            duration_ms = round((time.time() - start_time) * 1000, 2)
            if source:
                source.total_ingested_records += len(persisted_records)
                source.total_failed_records += failed_count
                source.last_ingested_at = utc_now()
                source.last_seen_at = utc_now()
                source.connection_status = "ACTIVE"
                db.commit()

            # 7. Update Batch Record
            if batch:
                batch.persisted_records = len(persisted_records)
                batch.duplicate_records = duplicate_count
                batch.failed_records = failed_count
                batch.completed_at = utc_now()
                batch.status = "COMPLETED" if failed_count == 0 else "PARTIALLY_COMPLETED"
                db.commit()

            # 8. Record Metrics & Schedule WebSocket Broadcasts
            for payload, stream_ev, entry in events_to_broadcast:
                streaming_metrics_service.record_persisted_event(
                    count=1,
                    duration_ms=duration_ms / max(len(events_to_broadcast), 1),
                    severity=entry.severity,
                    service=entry.service_name,
                    is_duplicate=False,
                )

                # Broadcast on asyncio loop
                if loop and loop.is_running():
                    try:
                        asyncio.run_coroutine_threadsafe(
                            event_broadcaster.broadcast_committed_event(
                                event_payload=payload,
                                sequence_id=stream_ev.sequence_id,
                                source_id=entry.source_id,
                                severity=entry.severity,
                                service=entry.service_name,
                            ),
                            loop,
                        )
                    except Exception as e:
                        logger.debug(f"Broadcast dispatch exception: {e}")

        except Exception as e:
            db.rollback()
            logger.error(f"Fatal error processing ingestion job: {e}", exc_info=True)
            if source:
                try:
                    source.last_error_at = utc_now()
                    source.last_error_message = str(e)[:255]
                    source.connection_status = "DEGRADED"
                    db.commit()
                except Exception:
                    pass
        finally:
            db.close()


ingestion_worker = IngestionWorker()
