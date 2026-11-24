import re
from abc import ABC, abstractmethod
from typing import Iterator, Optional, Dict, Any
from app.schemas.ingestion import ParsedLogRecord
from app.schemas.upload import UploadPreviewResponse
from app.utils.redaction import SensitiveDataRedactor


class BaseParser(ABC):
    """Abstract base class for all file format log parsers."""

    def __init__(self, redactor: Optional[SensitiveDataRedactor] = None):
        self.redactor = redactor or SensitiveDataRedactor()

    @abstractmethod
    def parse(
        self,
        file_path: str,
        encoding: str = "utf-8",
        default_service: str = "unknown-service",
        field_mappings: Optional[Dict[str, str]] = None,
        max_records: int = 100000,
    ) -> Iterator[ParsedLogRecord]:
        """Iteratively yields parsed log records from a validated file."""
        pass

    @abstractmethod
    def generate_preview(
        self,
        file_path: str,
        filename: str,
        encoding: str = "utf-8",
        limit: int = 50,
        field_mappings: Optional[Dict[str, str]] = None,
    ) -> UploadPreviewResponse:
        """Extracts initial preview records and field structure without persisting operational data."""
        pass

    def apply_redaction(self, record: ParsedLogRecord) -> ParsedLogRecord:
        """Applies sensitive data redaction to record fields before preview or persistence."""
        original_msg = record.message
        record.message = self.redactor.redact(record.message)
        record.raw_message = self.redactor.redact(record.raw_message)
        if record.metadata:
            record.metadata = self.redactor.redact_dict(record.metadata)

        # Flag whether any secret was redacted
        if original_msg != record.message or "[REDACTED" in record.raw_message:
            record.is_redacted = True

        return record
