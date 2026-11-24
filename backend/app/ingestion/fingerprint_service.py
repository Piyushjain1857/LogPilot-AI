import hashlib
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.models.upload_batch import UploadBatch


class FingerprintService:
    """Calculates SHA-256 file fingerprints and detects duplicate imports."""

    @staticmethod
    def calculate_sha256(file_path: str, chunk_size: int = 65536) -> str:
        """Computes SHA-256 hash incrementally without loading full file into memory."""
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(chunk_size):
                hasher.update(chunk)
        return hasher.hexdigest()

    @staticmethod
    def calculate_bytes_sha256(data: bytes) -> str:
        return hashlib.sha256(data).hexdigest()

    @classmethod
    def check_duplicate(
        cls,
        db: Session,
        file_hash: str,
        source_id: Optional[str] = None
    ) -> Tuple[bool, Optional[UploadBatch]]:
        """
        Checks whether an identical file hash has already been successfully or partially ingested.
        """
        query = db.query(UploadBatch).filter(
            UploadBatch.file_hash == file_hash,
            UploadBatch.status.in_(["COMPLETED", "PARTIALLY_COMPLETED", "PROCESSING"])
        )
        if source_id:
            query = query.filter(UploadBatch.source_id == source_id)

        existing = query.order_by(UploadBatch.created_at.desc()).first()
        return (existing is not None, existing)
