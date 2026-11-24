import csv
import io
import json
from typing import List, Dict, Any, Optional
from datetime import datetime


def sanitize_csv_cell(val: Any) -> Any:
    """
    Prevents CSV / Spreadsheet Formula Injection (CWE-1236).
    If a cell value starts with '=', '+', '-', '@', '\\t', '\\r', prepend a single quote (').
    """
    if val is None:
        return ""
    s = str(val)
    if s and s[0] in ("=", "+", "-", "@", "\t", "\r"):
        return f"'{s}"
    return s


class ExportService:
    DEFAULT_CSV_FIELDS = [
        "timestamp",
        "severity",
        "service_name",
        "message",
        "trace_id",
        "span_id",
        "template_id",
        "ingestion_method",
        "parsing_status",
    ]

    @staticmethod
    def generate_csv(records: List[Dict[str, Any]], fields: Optional[List[str]] = None) -> str:
        output = io.StringIO()
        fieldnames = fields or ExportService.DEFAULT_CSV_FIELDS
        writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")

        writer.writeheader()
        for rec in records:
            sanitized_row = {}
            for k in fieldnames:
                raw_val = rec.get(k)
                if isinstance(raw_val, datetime):
                    sanitized_row[k] = raw_val.isoformat()
                elif isinstance(raw_val, (dict, list)):
                    sanitized_row[k] = sanitize_csv_cell(json.dumps(raw_val))
                else:
                    sanitized_row[k] = sanitize_csv_cell(raw_val)
            writer.writerow(sanitized_row)

        return output.getvalue()

    @staticmethod
    def generate_json(records: List[Dict[str, Any]]) -> str:
        # Normalize datetimes for JSON serialization
        def default_serializer(obj):
            if isinstance(obj, datetime):
                return obj.isoformat()
            raise TypeError(f"Type {type(obj)} not serializable")

        return json.dumps(records, default=default_serializer, indent=2)
