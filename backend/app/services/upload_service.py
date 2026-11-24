import os
import uuid
import json
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple
from fastapi import UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.config import settings
from app.models.upload_batch import UploadBatch
from app.models.source import LogSource
from app.ingestion.file_validator import FileValidator
from app.ingestion.fingerprint_service import FingerprintService
from app.ingestion.ingestion_errors import FileValidationError, DuplicateFileError
from app.ingestion.ingestion_manager import ingestion_manager
from app.parsers.parser_factory import ParserFactory
from app.schemas.upload import UploadPreviewResponse


class UploadService:
    """Orchestrates file upload ingestion, validation, duplicate prevention, and history queries."""

    @staticmethod
    def _ensure_temp_dir() -> Path:
        temp_dir = Path(settings.UPLOAD_TEMP_DIRECTORY)
        temp_dir.mkdir(parents=True, exist_ok=True)
        return temp_dir

    @classmethod
    async def generate_preview(
        cls,
        file: UploadFile,
        field_mappings: Optional[Dict[str, str]] = None,
    ) -> UploadPreviewResponse:
        """Validates uploaded file and extracts preliminary sample records without database persistence."""
        sanitized_name = FileValidator.sanitize_filename(file.filename or "uploaded.log")
        declared_size = file.size
        FileValidator.validate_file_metadata(sanitized_name, declared_size)

        temp_dir = cls._ensure_temp_dir()
        temp_path = str(temp_dir / f"preview_{uuid.uuid4().hex}_{sanitized_name}")

        try:
            # Stream upload to disk
            bytes_written = 0
            max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
            with open(temp_path, "wb") as f:
                while chunk := await file.read(65536):
                    bytes_written += len(chunk)
                    if bytes_written > max_bytes:
                        raise FileValidationError(
                            f"File size exceeds maximum allowed limit of {settings.MAX_UPLOAD_SIZE_MB} MB."
                        )
                    f.write(chunk)

            file_format, encoding = FileValidator.validate_content_and_encoding(temp_path)
            parser = ParserFactory.get_parser(file_format)
            return parser.generate_preview(
                file_path=temp_path,
                filename=sanitized_name,
                encoding=encoding,
                limit=settings.MAX_PREVIEW_RECORDS,
                field_mappings=field_mappings,
            )
        finally:
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception:
                    pass

    @classmethod
    async def create_upload(
        cls,
        db: Session,
        file: UploadFile,
        source_id: Optional[str] = None,
        source_name: Optional[str] = None,
        service_name: Optional[str] = None,
        source_description: Optional[str] = None,
        field_mappings: Optional[Dict[str, str]] = None,
        confirm_duplicate: bool = False,
    ) -> UploadBatch:
        """Saves file to storage, validates schema, checks fingerprint, and enqueues background worker."""
        sanitized_name = FileValidator.sanitize_filename(file.filename or "uploaded.log")
        FileValidator.validate_file_metadata(sanitized_name, file.size)

        # Resolve or create log source
        target_source: Optional[LogSource] = None
        if source_id:
            target_source = db.query(LogSource).filter(LogSource.id == source_id).first()
            if not target_source:
                raise FileValidationError(f"Specified LogSource '{source_id}' does not exist.")
        elif source_name and service_name:
            target_source = LogSource(
                name=source_name,
                source_type="file",
                service_name=service_name,
                description=source_description,
                status="active",
            )
            db.add(target_source)
            db.commit()
            db.refresh(target_source)
        else:
            raise FileValidationError("Either an existing 'source_id' or both 'source_name' and 'service_name' must be provided.")

        temp_dir = cls._ensure_temp_dir()
        temp_path = str(temp_dir / f"upload_{uuid.uuid4().hex}_{sanitized_name}")

        try:
            bytes_written = 0
            max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
            with open(temp_path, "wb") as f:
                while chunk := await file.read(65536):
                    bytes_written += len(chunk)
                    if bytes_written > max_bytes:
                        raise FileValidationError(
                            f"File size exceeds maximum allowed limit of {settings.MAX_UPLOAD_SIZE_MB} MB."
                        )
                    f.write(chunk)

            file_format, encoding = FileValidator.validate_content_and_encoding(temp_path)
            file_hash = FingerprintService.calculate_sha256(temp_path)

            # Duplicate detection check
            is_dup, existing_batch = FingerprintService.check_duplicate(
                db=db,
                file_hash=file_hash,
                source_id=target_source.id,
            )
            if is_dup and not confirm_duplicate and existing_batch:
                raise DuplicateFileError(
                    message=f"Duplicate file detected: An identical file was already imported as '{existing_batch.original_filename}'.",
                    file_hash=file_hash,
                    existing_batch_id=existing_batch.id,
                    existing_filename=existing_batch.original_filename,
                    existing_time=existing_batch.created_at,
                )

            batch = UploadBatch(
                source_id=target_source.id,
                original_filename=sanitized_name,
                file_format=file_format,
                file_size_bytes=bytes_written,
                file_hash=file_hash,
                status="PENDING",
            )
            db.add(batch)
            db.commit()
            db.refresh(batch)

            # Dispatch to worker pool
            ingestion_manager.submit_job(
                upload_id=batch.id,
                file_path=temp_path,
                encoding=encoding,
                field_mappings=field_mappings,
            )
            return batch

        except Exception:
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception:
                    pass
            raise

    @staticmethod
    def get_upload(db: Session, upload_id: str) -> Optional[UploadBatch]:
        return db.query(UploadBatch).filter(UploadBatch.id == upload_id).first()

    @staticmethod
    def list_uploads(
        db: Session,
        source_id: Optional[str] = None,
        status: Optional[str] = None,
        file_format: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[UploadBatch], int]:
        query = db.query(UploadBatch)
        if source_id:
            query = query.filter(UploadBatch.source_id == source_id)
        if status:
            query = query.filter(UploadBatch.status == status.upper())
        if file_format:
            query = query.filter(UploadBatch.file_format == file_format.upper())

        total = query.count()
        offset = (max(page, 1) - 1) * page_size
        items = query.order_by(UploadBatch.created_at.desc()).offset(offset).limit(page_size).all()
        return items, total

    @staticmethod
    def get_upload_errors(db: Session, upload_id: str) -> Optional[List[Dict[str, Any]]]:
        batch = db.query(UploadBatch).filter(UploadBatch.id == upload_id).first()
        if not batch or not batch.error_summary_json:
            return []
        try:
            return json.loads(batch.error_summary_json)
        except Exception:
            return [{"error_reason": str(batch.error_summary_json)}]

    @staticmethod
    def cancel_upload(db: Session, upload_id: str) -> bool:
        return ingestion_manager.cancel_job(upload_id)
