import os
import re
from datetime import datetime
from typing import Iterator, Optional, Dict, List
from dateutil import parser as date_parser
from app.parsers.base_parser import BaseParser
from app.schemas.ingestion import ParsedLogRecord
from app.schemas.upload import UploadPreviewResponse
from app.core.config import settings

# Timestamp regex patterns
ISO_TIMESTAMP_RE = re.compile(r'(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)')
BRACKETED_TIMESTAMP_RE = re.compile(r'\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?)\]')

# Severity levels pattern
SEVERITY_RE = re.compile(r'\b(CRITICAL|FATAL|ERROR|WARN|WARNING|INFO|DEBUG|TRACE)\b', re.IGNORECASE)

# Service name pattern e.g. [order-service] or order-service:
SERVICE_BRACKET_RE = re.compile(r'\[([a-zA-Z0-9_\-\.]+service[a-zA-Z0-9_\-\.]*|[a-zA-Z0-9_\-\.]+api[a-zA-Z0-9_\-\.]*|[a-zA-Z0-9_\-\.]+)\]')

# Trace / Span ID pattern
TRACE_ID_RE = re.compile(r'(?:trace_id|traceId|trace-id)=([a-zA-Z0-9_\-]+)', re.IGNORECASE)
SPAN_ID_RE = re.compile(r'(?:span_id|spanId|span-id)=([a-zA-Z0-9_\-]+)', re.IGNORECASE)
EXCEPTION_LINE_RE = re.compile(r'^[A-Za-z0-9_.]*(?:Error|Exception|Fault|Throwable)(?:\:|\s|$)', re.IGNORECASE)


class TextLogParser(BaseParser):
    """Parser for unstructured and structured plain text (.log, .txt) files with multiline stack trace handling."""

    def _parse_line_attributes(self, line: str, default_service: str):
        # 1. Timestamp
        timestamp = None
        ts_match = ISO_TIMESTAMP_RE.search(line) or BRACKETED_TIMESTAMP_RE.search(line)
        if ts_match:
            try:
                timestamp = date_parser.parse(ts_match.group(1))
            except Exception:
                timestamp = None

        # 2. Severity
        severity = "UNKNOWN"
        sev_match = SEVERITY_RE.search(line)
        if sev_match:
            sev_raw = sev_match.group(1).upper()
            if sev_raw in ("FATAL", "CRITICAL"):
                severity = "CRITICAL"
            elif sev_raw in ("WARN", "WARNING"):
                severity = "WARNING"
            elif sev_raw == "TRACE":
                severity = "DEBUG"
            else:
                severity = sev_raw

        # 3. Service name
        service_name = default_service
        for m in re.finditer(r'\[([a-zA-Z0-9_\-\.]+)\]', line):
            candidate = m.group(1)
            if candidate.upper() not in ("INFO", "DEBUG", "WARN", "WARNING", "ERROR", "CRITICAL", "TRACE", "FATAL") and not re.match(r'^\d+$', candidate):
                service_name = candidate
                break
        if service_name == default_service:
            # Check for service=name or app=name
            svc_param = re.search(r'\b(?:service|app|svc)=([a-zA-Z0-9_\-\.]+)', line, re.IGNORECASE)
            if svc_param:
                service_name = svc_param.group(1)

        # 4. Trace ID & Span ID
        trace_match = TRACE_ID_RE.search(line)
        trace_id = trace_match.group(1) if trace_match else None

        span_match = SPAN_ID_RE.search(line)
        span_id = span_match.group(1) if span_match else None

        return timestamp, severity, service_name, trace_id, span_id

    def _is_continuation_line(self, line: str, current_record: Optional[ParsedLogRecord] = None) -> bool:
        """Determines if a line is a multiline stack trace continuation rather than a new record."""
        stripped = line.strip()
        if not stripped:
            return False
        # Indented line with spaces or tabs (e.g. Java/Python stack traces)
        if line.startswith(" ") or line.startswith("\t"):
            return True
        # Common stack trace keywords
        if (
            line.startswith("at ") or
            line.startswith("Caused by:") or
            line.startswith("Traceback (most recent call last):") or
            line.startswith("File \"") or
            line.startswith("... ")
        ):
            return True
        # Exception class names at start of line
        if EXCEPTION_LINE_RE.match(stripped):
            return True
        # If inside an ongoing traceback and line doesn't start with a timestamp, treat as continuation
        if current_record and ("Traceback" in current_record.message or "Caused by" in current_record.message):
            if not (ISO_TIMESTAMP_RE.match(stripped) or BRACKETED_TIMESTAMP_RE.match(stripped)):
                return True
        # If line starts with a timestamp or ISO date, it's a new record
        if ISO_TIMESTAMP_RE.match(stripped) or BRACKETED_TIMESTAMP_RE.match(stripped):
            return False
        return False

    def parse(
        self,
        file_path: str,
        encoding: str = "utf-8",
        default_service: str = "unknown-service",
        field_mappings: Optional[Dict[str, str]] = None,
        max_records: int = 100000,
    ) -> Iterator[ParsedLogRecord]:
        record_count = 0
        current_record: Optional[ParsedLogRecord] = None

        with open(file_path, "r", encoding=encoding, errors="replace") as f:
            for line_no, raw_line in enumerate(f, start=1):
                clean_line = raw_line.rstrip("\r\n")
                if not clean_line.strip():
                    continue

                # Check max line size
                if len(clean_line.encode("utf-8")) > settings.MAX_LOG_MESSAGE_BYTES:
                    clean_line = clean_line[:settings.MAX_LOG_MESSAGE_BYTES] + " ... [TRUNCATED_LONG_LINE]"

                is_continuation = current_record is not None and self._is_continuation_line(clean_line, current_record)

                if is_continuation and current_record:
                    # Append multiline stacktrace to current record
                    current_record.message += "\n" + clean_line
                    current_record.raw_message += "\n" + clean_line
                else:
                    # Flush previous record if ready
                    if current_record is not None:
                        yield self.apply_redaction(current_record)
                        record_count += 1
                        if record_count >= max_records:
                            return

                    # Parse new record
                    ts, sev, svc, tr_id, sp_id = self._parse_line_attributes(clean_line, default_service)
                    current_record = ParsedLogRecord(
                        line_number=line_no,
                        timestamp=ts,
                        severity=sev,
                        service_name=svc,
                        message=clean_line,
                        raw_message=clean_line,
                        trace_id=tr_id,
                        span_id=sp_id,
                        metadata={},
                        parsing_status="SUCCESS",
                        is_valid=True,
                    )

            # Flush final buffered record
            if current_record is not None:
                yield self.apply_redaction(current_record)

    def generate_preview(
        self,
        file_path: str,
        filename: str,
        encoding: str = "utf-8",
        limit: int = 50,
        field_mappings: Optional[Dict[str, str]] = None,
    ) -> UploadPreviewResponse:
        records: List[Dict[str, Any]] = []
        warnings: List[str] = []
        total_size = os.path.getsize(file_path)

        for record in self.parse(file_path, encoding=encoding, max_records=limit):
            records.append({
                "line_number": record.line_number,
                "timestamp": record.timestamp.isoformat() if record.timestamp else None,
                "severity": record.severity,
                "service_name": record.service_name,
                "message": record.message[:300] + ("..." if len(record.message) > 300 else ""),
                "trace_id": record.trace_id,
            })
            if len(records) >= limit:
                break

        if not records:
            warnings.append("No log records could be extracted from this text file.")

        return UploadPreviewResponse(
            filename=filename,
            file_format="LOG",
            file_size_bytes=total_size,
            detected_columns=["timestamp", "severity", "service_name", "message", "trace_id"],
            suggested_mappings={},
            preview_records=records,
            validation_warnings=warnings,
            requires_manual_mapping=False,
            total_preview_count=len(records),
        )
