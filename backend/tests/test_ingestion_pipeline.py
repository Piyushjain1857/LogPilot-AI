import os
import pytest
from tests.conftest import TestingSessionLocal
from app.models.source import LogSource
from app.models.upload_batch import UploadBatch
from app.models.log import LogEntry
from app.ingestion.ingestion_pipeline import IngestionPipeline
from app.ingestion.fingerprint_service import FingerprintService


def test_ingestion_pipeline_success(tmp_path, db_session, monkeypatch):
    monkeypatch.setattr("app.ingestion.ingestion_pipeline.SessionLocal", TestingSessionLocal)

    # 1. Create source
    src = LogSource(name="Test Source", source_type="file", service_name="auth-service")
    db_session.add(src)
    db_session.commit()
    db_session.refresh(src)

    # 2. Create sample file
    log_file = tmp_path / "app.log"
    content = (
        "2026-11-24T10:00:00Z [INFO] [auth-service] User logged in user=usr_1\n"
        "2026-11-24T10:00:01Z [ERROR] [auth-service] Auth failed with password=SecretPassword123\n"
    )
    log_file.write_text(content)

    file_hash = FingerprintService.calculate_sha256(str(log_file))

    # 3. Create batch
    batch = UploadBatch(
        source_id=src.id,
        original_filename="app.log",
        file_format="LOG",
        file_size_bytes=os.path.getsize(str(log_file)),
        file_hash=file_hash,
        status="PENDING",
    )
    db_session.add(batch)
    db_session.commit()
    db_session.refresh(batch)

    # 4. Execute pipeline
    IngestionPipeline.process_upload(upload_id=batch.id, file_path=str(log_file))

    # 5. Verify results
    db_session.refresh(batch)
    assert batch.status == "COMPLETED"
    assert batch.successful_records == 2
    assert batch.failed_records == 0
    assert batch.redacted_records >= 1

    logs = db_session.query(LogEntry).filter(LogEntry.upload_batch_id == batch.id).all()
    assert len(logs) == 2
    # Verify password was redacted
    error_log = [l for l in logs if l.severity == "ERROR"][0]
    assert "[REDACTED_PASSWORD]" in error_log.raw_message
    assert "SecretPassword123" not in error_log.raw_message


def test_duplicate_detection(tmp_path, db_session):
    src = LogSource(name="Test Source", source_type="file", service_name="auth-service")
    db_session.add(src)
    db_session.commit()

    f = tmp_path / "sample.log"
    f.write_text("sample content")
    file_hash = FingerprintService.calculate_sha256(str(f))

    batch = UploadBatch(
        source_id=src.id,
        original_filename="sample.log",
        file_format="LOG",
        file_size_bytes=14,
        file_hash=file_hash,
        status="COMPLETED",
    )
    db_session.add(batch)
    db_session.commit()

    is_dup, existing = FingerprintService.check_duplicate(db_session, file_hash, src.id)
    assert is_dup is True
    assert existing.id == batch.id
