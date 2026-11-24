import json
import os
from datetime import datetime
from typing import Iterator, Optional, Dict, Any, List
from dateutil import parser as date_parser
from app.parsers.base_parser import BaseParser
from app.schemas.ingestion import ParsedLogRecord
from app.schemas.upload import UploadPreviewResponse
from app.ingestion.ingestion_errors import ParsingError
from app.core.config import settings

TIMESTAMP_KEYS = ["timestamp", "time", "datetime", "date", "@timestamp", "ts", "created_at"]
SEVERITY_KEYS = ["severity", "level", "log_level", "loglevel", "status", "priority"]
SERVICE_KEYS = ["service", "service_name", "app", "application", "component"]
MESSAGE_KEYS = ["message", "msg", "log", "description", "content", "payload", "body"]
TRACE_ID_KEYS = ["trace_id", "traceId", "correlation_id", "trace-id", "request_id"]
SPAN_ID_KEYS = ["span_id", "spanId", "span-id"]


class JSONLogParser(BaseParser):
    """Parser for JSON log files (single object, array of objects, or object with wrapper key)."""

    def _extract_record_from_dict(
        self,
        item: Dict[str, Any],
        line_no: int,
        default_service: str,
        mappings: Optional[Dict[str, str]] = None,
    ) -> ParsedLogRecord:
        if not isinstance(item, dict):
            return ParsedLogRecord(
                line_number=line_no,
                message=str(item),
                raw_message=str(item),
                is_valid=False,
                error_reason="Record is not a valid JSON dictionary.",
            )

        def find_key(aliases: List[str], mapped_key: Optional[str]) -> Optional[Any]:
            if mapped_key and mapped_key in item:
                return item[mapped_key]
            for a in aliases:
                if a in item:
                    return item[a]
            return None

        # Message
        msg_val = find_key(MESSAGE_KEYS, mappings.get("message") if mappings else None)
        raw_msg = str(msg_val) if msg_val is not None else json.dumps(item)
        if len(raw_msg.encode("utf-8")) > settings.MAX_LOG_MESSAGE_BYTES:
            raw_msg = raw_msg[:settings.MAX_LOG_MESSAGE_BYTES] + " ... [TRUNCATED_LONG_LINE]"

        # Timestamp
        ts = None
        ts_val = find_key(TIMESTAMP_KEYS, mappings.get("timestamp") if mappings else None)
        if ts_val:
            try:
                if isinstance(ts_val, (int, float)):
                    # Unix timestamp
                    ts = datetime.fromtimestamp(ts_val)
                else:
                    ts = date_parser.parse(str(ts_val))
            except Exception:
                ts = None

        # Severity
        sev_val = find_key(SEVERITY_KEYS, mappings.get("severity") if mappings else None)
        sev = (str(sev_val) if sev_val else "UNKNOWN").upper()
        if sev in ("FATAL", "CRITICAL"):
            sev = "CRITICAL"
        elif sev in ("WARN", "WARNING"):
            sev = "WARNING"
        elif sev not in ("DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"):
            sev = "UNKNOWN"

        # Service
        svc_val = find_key(SERVICE_KEYS, mappings.get("service_name") if mappings else None)
        svc = str(svc_val) if svc_val else default_service

        # Trace and Span
        tr_val = find_key(TRACE_ID_KEYS, mappings.get("trace_id") if mappings else None)
        sp_val = find_key(SPAN_ID_KEYS, mappings.get("span_id") if mappings else None)

        # Metadata
        used_keys = set()
        for k in item.keys():
            if k in (TIMESTAMP_KEYS + SEVERITY_KEYS + SERVICE_KEYS + MESSAGE_KEYS + TRACE_ID_KEYS + SPAN_ID_KEYS):
                used_keys.add(k)
        metadata = {k: v for k, v in item.items() if k not in used_keys}

        return ParsedLogRecord(
            line_number=line_no,
            timestamp=ts,
            severity=sev,
            service_name=svc,
            message=raw_msg,
            raw_message=raw_msg,
            trace_id=str(tr_val) if tr_val else None,
            span_id=str(sp_val) if sp_val else None,
            metadata=metadata,
            parsing_status="SUCCESS",
            is_valid=True,
        )

    def _extract_items(self, file_path: str, encoding: str) -> List[Any]:
        with open(file_path, "r", encoding=encoding, errors="replace") as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError as e:
                raise ParsingError(f"Malformed JSON document: {str(e)}")

        if isinstance(data, list):
            return data
        elif isinstance(data, dict):
            # Check wrapper objects (logs, records, events, data, items)
            for wrapper in ("logs", "records", "events", "data", "items"):
                if wrapper in data and isinstance(data[wrapper], list):
                    return data[wrapper]
            # Single object
            return [data]
        else:
            raise ParsingError("JSON root must be an object or an array of objects.")

    def parse(
        self,
        file_path: str,
        encoding: str = "utf-8",
        default_service: str = "unknown-service",
        field_mappings: Optional[Dict[str, str]] = None,
        max_records: int = 100000,
    ) -> Iterator[ParsedLogRecord]:
        items = self._extract_items(file_path, encoding)
        for idx, item in enumerate(items, start=1):
            if idx > max_records:
                break
            record = self._extract_record_from_dict(item, idx, default_service, field_mappings)
            yield self.apply_redaction(record)

    def generate_preview(
        self,
        file_path: str,
        filename: str,
        encoding: str = "utf-8",
        limit: int = 50,
        field_mappings: Optional[Dict[str, str]] = None,
    ) -> UploadPreviewResponse:
        total_size = os.path.getsize(file_path)
        warnings: List[str] = []

        try:
            items = self._extract_items(file_path, encoding)
        except ParsingError as e:
            return UploadPreviewResponse(
                filename=filename,
                file_format="JSON",
                file_size_bytes=total_size,
                detected_columns=[],
                suggested_mappings={},
                preview_records=[],
                validation_warnings=[str(e)],
                requires_manual_mapping=True,
                total_preview_count=0,
            )

        detected_cols = set()
        records: List[Dict[str, Any]] = []

        for idx, item in enumerate(items[:limit], start=1):
            if isinstance(item, dict):
                detected_cols.update(item.keys())
            record = self._extract_record_from_dict(item, idx, "unknown-service", field_mappings)
            records.append({
                "line_number": record.line_number,
                "timestamp": record.timestamp.isoformat() if record.timestamp else None,
                "severity": record.severity,
                "service_name": record.service_name,
                "message": record.message[:300] + ("..." if len(record.message) > 300 else ""),
                "trace_id": record.trace_id,
            })

        return UploadPreviewResponse(
            filename=filename,
            file_format="JSON",
            file_size_bytes=total_size,
            detected_columns=sorted(list(detected_cols)),
            suggested_mappings={},
            preview_records=records,
            validation_warnings=warnings,
            requires_manual_mapping=False,
            total_preview_count=len(records),
        )
