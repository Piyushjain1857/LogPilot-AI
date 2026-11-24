import csv
import os
from datetime import datetime
from typing import Iterator, Optional, Dict, Any, List
from dateutil import parser as date_parser
from app.parsers.base_parser import BaseParser
from app.schemas.ingestion import ParsedLogRecord
from app.schemas.upload import UploadPreviewResponse
from app.core.config import settings

TIMESTAMP_ALIASES = ["timestamp", "time", "datetime", "date", "@timestamp", "ts", "created_at"]
SEVERITY_ALIASES = ["severity", "level", "log_level", "loglevel", "status", "priority"]
SERVICE_ALIASES = ["service", "service_name", "app", "application", "component", "service_id"]
MESSAGE_ALIASES = ["message", "msg", "log", "description", "content", "payload", "body"]
TRACE_ID_ALIASES = ["trace_id", "traceid", "correlation_id", "trace-id", "request_id"]
SPAN_ID_ALIASES = ["span_id", "spanid", "span-id"]


class CSVLogParser(BaseParser):
    """Parser for structured CSV log files with intelligent column matching and manual overrides."""

    @staticmethod
    def _detect_mapping(headers: List[str], overrides: Optional[Dict[str, str]] = None) -> Dict[str, str]:
        mapping = {}
        header_lower = {h.lower().strip(): h for h in headers}

        def match_alias(aliases: List[str]) -> Optional[str]:
            for alias in aliases:
                if alias in header_lower:
                    return header_lower[alias]
            return None

        mapping["timestamp"] = match_alias(TIMESTAMP_ALIASES)
        mapping["severity"] = match_alias(SEVERITY_ALIASES)
        mapping["service_name"] = match_alias(SERVICE_ALIASES)
        mapping["message"] = match_alias(MESSAGE_ALIASES)
        mapping["trace_id"] = match_alias(TRACE_ID_ALIASES)
        mapping["span_id"] = match_alias(SPAN_ID_ALIASES)

        if overrides:
            for k, v in overrides.items():
                if v and v in headers:
                    mapping[k] = v

        return mapping

    def parse(
        self,
        file_path: str,
        encoding: str = "utf-8",
        default_service: str = "unknown-service",
        field_mappings: Optional[Dict[str, str]] = None,
        max_records: int = 100000,
    ) -> Iterator[ParsedLogRecord]:
        with open(file_path, "r", encoding=encoding, errors="replace", newline="") as f:
            # Sniff delimiter
            sample = f.read(4096)
            f.seek(0)
            delimiter = ","
            try:
                sniffer = csv.Sniffer()
                dialect = sniffer.sniff(sample)
                delimiter = dialect.delimiter
            except Exception:
                delimiter = ","

            reader = csv.reader(f, delimiter=delimiter)
            try:
                headers = next(reader)
            except StopIteration:
                return

            col_map = self._detect_mapping(headers, field_mappings)
            msg_col = col_map.get("message")
            ts_col = col_map.get("timestamp")
            sev_col = col_map.get("severity")
            svc_col = col_map.get("service_name")
            tr_col = col_map.get("trace_id")
            sp_col = col_map.get("span_id")

            header_indices = {h: idx for idx, h in enumerate(headers)}

            record_count = 0
            for line_no, row in enumerate(reader, start=2):
                if not row or not any(field.strip() for field in row):
                    continue

                def get_val(col_name):
                    idx = header_indices.get(col_name) if col_name else None
                    if idx is not None and idx < len(row):
                        return row[idx].strip()
                    return None

                # Extract message
                raw_msg = get_val(msg_col) if msg_col else ", ".join(row)
                if not raw_msg:
                    raw_msg = ", ".join(row)

                if len(raw_msg.encode("utf-8")) > settings.MAX_LOG_MESSAGE_BYTES:
                    raw_msg = raw_msg[:settings.MAX_LOG_MESSAGE_BYTES] + " ... [TRUNCATED_LONG_LINE]"

                # Timestamp
                ts = None
                raw_ts = get_val(ts_col)
                if raw_ts:
                    try:
                        ts = date_parser.parse(raw_ts)
                    except Exception:
                        ts = None

                # Severity
                sev = (get_val(sev_col) or "UNKNOWN").upper()
                if sev in ("FATAL", "CRITICAL"):
                    sev = "CRITICAL"
                elif sev in ("WARN", "WARNING"):
                    sev = "WARNING"
                elif sev not in ("DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"):
                    sev = "UNKNOWN"

                # Service
                svc = get_val(svc_col) or default_service

                # Trace and Span
                trace_id = get_val(tr_col)
                span_id = get_val(sp_col)

                # Extra columns stored in metadata
                extra_meta = {}
                for h, idx in header_indices.items():
                    if idx < len(row) and h not in (msg_col, ts_col, sev_col, svc_col, tr_col, sp_col):
                        extra_meta[h] = row[idx]

                record = ParsedLogRecord(
                    line_number=line_no,
                    timestamp=ts,
                    severity=sev,
                    service_name=svc,
                    message=raw_msg,
                    raw_message=raw_msg,
                    trace_id=trace_id,
                    span_id=span_id,
                    metadata=extra_meta,
                    parsing_status="SUCCESS",
                    is_valid=True,
                )
                yield self.apply_redaction(record)
                record_count += 1
                if record_count >= max_records:
                    return

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

        with open(file_path, "r", encoding=encoding, errors="replace", newline="") as f:
            sample = f.read(4096)
            f.seek(0)
            try:
                dialect = csv.Sniffer().sniff(sample)
                delimiter = dialect.delimiter
            except Exception:
                delimiter = ","

            reader = csv.reader(f, delimiter=delimiter)
            try:
                headers = next(reader)
            except StopIteration:
                return UploadPreviewResponse(
                    filename=filename,
                    file_format="CSV",
                    file_size_bytes=total_size,
                    detected_columns=[],
                    suggested_mappings={},
                    preview_records=[],
                    validation_warnings=["CSV file has no header row."],
                    requires_manual_mapping=True,
                    total_preview_count=0,
                )

        mappings = self._detect_mapping(headers, field_mappings)
        requires_manual = not bool(mappings.get("message"))

        records: List[Dict[str, Any]] = []
        for record in self.parse(file_path, encoding=encoding, field_mappings=field_mappings, max_records=limit):
            records.append({
                "line_number": record.line_number,
                "timestamp": record.timestamp.isoformat() if record.timestamp else None,
                "severity": record.severity,
                "service_name": record.service_name,
                "message": record.message[:300] + ("..." if len(record.message) > 300 else ""),
                "trace_id": record.trace_id,
            })

        if requires_manual:
            warnings.append("Could not automatically identify the 'message' column. Please select field mappings.")

        return UploadPreviewResponse(
            filename=filename,
            file_format="CSV",
            file_size_bytes=total_size,
            detected_columns=headers,
            suggested_mappings={k: v for k, v in mappings.items() if v},
            preview_records=records,
            validation_warnings=warnings,
            requires_manual_mapping=requires_manual,
            total_preview_count=len(records),
        )
