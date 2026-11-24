import json
import os
from typing import Iterator, Optional, Dict, Any, List
from app.parsers.base_parser import BaseParser
from app.parsers.json_parser import JSONLogParser
from app.schemas.ingestion import ParsedLogRecord
from app.schemas.upload import UploadPreviewResponse
from app.core.config import settings


class JSONLinesLogParser(BaseParser):
    """Parser for line-delimited JSON (.jsonl, .ndjson) with independent record validation."""

    def __init__(self):
        super().__init__()
        self._record_helper = JSONLogParser()

    def parse(
        self,
        file_path: str,
        encoding: str = "utf-8",
        default_service: str = "unknown-service",
        field_mappings: Optional[Dict[str, str]] = None,
        max_records: int = 100000,
    ) -> Iterator[ParsedLogRecord]:
        record_count = 0
        with open(file_path, "r", encoding=encoding, errors="replace") as f:
            for line_no, raw_line in enumerate(f, start=1):
                clean_line = raw_line.strip()
                if not clean_line:
                    continue

                if len(clean_line.encode("utf-8")) > settings.MAX_LOG_MESSAGE_BYTES:
                    yield ParsedLogRecord(
                        line_number=line_no,
                        message=clean_line[:1000],
                        raw_message=clean_line[:1000],
                        is_valid=False,
                        error_reason="Log line exceeds maximum allowed byte limit.",
                    )
                    continue

                try:
                    obj = json.loads(clean_line)
                    record = self._record_helper._extract_record_from_dict(obj, line_no, default_service, field_mappings)
                    yield self.apply_redaction(record)
                    record_count += 1
                    if record_count >= max_records:
                        return
                except json.JSONDecodeError as e:
                    yield ParsedLogRecord(
                        line_number=line_no,
                        message=clean_line[:300],
                        raw_message=clean_line[:300],
                        is_valid=False,
                        error_reason=f"Malformed JSON on line {line_no}: {str(e)}",
                    )

    def generate_preview(
        self,
        file_path: str,
        filename: str,
        encoding: str = "utf-8",
        limit: int = 50,
        field_mappings: Optional[Dict[str, str]] = None,
    ) -> UploadPreviewResponse:
        total_size = os.path.getsize(file_path)
        detected_cols = set()
        records: List[Dict[str, Any]] = []
        warnings: List[str] = []

        with open(file_path, "r", encoding=encoding, errors="replace") as f:
            for line_no, raw_line in enumerate(f, start=1):
                clean_line = raw_line.strip()
                if not clean_line:
                    continue
                try:
                    obj = json.loads(clean_line)
                    if isinstance(obj, dict):
                        detected_cols.update(obj.keys())
                    record = self._record_helper._extract_record_from_dict(obj, line_no, "unknown-service", field_mappings)
                    records.append({
                        "line_number": record.line_number,
                        "timestamp": record.timestamp.isoformat() if record.timestamp else None,
                        "severity": record.severity,
                        "service_name": record.service_name,
                        "message": record.message[:300] + ("..." if len(record.message) > 300 else ""),
                        "trace_id": record.trace_id,
                    })
                except json.JSONDecodeError:
                    warnings.append(f"Line {line_no} contains invalid JSON.")

                if len(records) >= limit:
                    break

        return UploadPreviewResponse(
            filename=filename,
            file_format="JSONL",
            file_size_bytes=total_size,
            detected_columns=sorted(list(detected_cols)),
            suggested_mappings={},
            preview_records=records,
            validation_warnings=warnings[:10],
            requires_manual_mapping=False,
            total_preview_count=len(records),
        )
