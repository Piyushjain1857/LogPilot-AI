import os
import json
import re
import hashlib
import time
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path

# Client-side light redaction patterns
REDACT_PATTERNS = [
    (re.compile(r"(Bearer\s+)[A-Za-z0-9\-\._~\+\/]+=*", re.IGNORECASE), r"\1[REDACTED_TOKEN]"),
    (re.compile(r"(?i)(password|passwd|pwd)\s*[:=]\s*['\"]?([^'\" \r\n]{3,})['\"]?"), r"\1=[REDACTED_PASSWORD]"),
]


def client_redact(text: str) -> str:
    for pat, repl in REDACT_PATTERNS:
        text = pat.sub(repl, text)
    return text


def parse_log_line(line: str, default_service: str) -> Dict[str, Any]:
    """Parses a log line as JSON Lines or structured plain text."""
    line = line.strip()
    if not line:
        return {}

    # 1. Try JSON Lines
    if line.startswith("{") and line.endswith("}"):
        try:
            data = json.loads(line)
            msg = data.get("message") or data.get("msg") or line
            return {
                "message": client_redact(str(msg)),
                "severity": str(data.get("severity") or data.get("level") or "INFO").upper(),
                "service": data.get("service") or default_service,
                "timestamp": data.get("timestamp") or data.get("time"),
                "trace_id": data.get("trace_id"),
                "span_id": data.get("span_id"),
                "metadata": {k: v for k, v in data.items() if k not in {"message", "msg", "severity", "level", "service", "timestamp", "time", "trace_id", "span_id"}},
            }
        except Exception:
            pass

    # 2. Plain Text heuristic extraction (Timestamp Severity Service Message)
    sev = "INFO"
    for s in ["CRITICAL", "ERROR", "WARNING", "WARN", "INFO", "DEBUG"]:
        if f" {s} " in line or f" [{s}]" in line or line.startswith(f"{s}:"):
            sev = "WARNING" if s == "WARN" else s
            break

    return {
        "message": client_redact(line),
        "severity": sev,
        "service": default_service,
    }


class LogFileTailer:
    """Tails a single local log file, detecting rotations and following newly appended lines."""

    def __init__(self, file_path: str, default_service: str, start_position: str = "end"):
        self.file_path = Path(file_path).resolve()
        self.default_service = default_service
        self.start_position = start_position
        self.file_hash = hashlib.md5(str(self.file_path).encode("utf-8")).hexdigest()[:8]

    def read_new_lines(self, start_offset: int) -> Tuple[List[Dict[str, Any]], int, Optional[int]]:
        if not self.file_path.exists():
            return [], start_offset, None

        stat = self.file_path.stat()
        current_size = stat.st_size
        current_inode = getattr(stat, "st_ino", None)

        # Detect truncation: if file is smaller than offset, reset to 0
        if current_size < start_offset:
            start_offset = 0

        # Handle initial start position if offset is 0 and start_position is 'end'
        if start_offset == 0 and self.start_position == "end" and current_size > 0:
            return [], current_size, current_inode

        records: List[Dict[str, Any]] = []
        new_offset = start_offset

        try:
            with open(self.file_path, "r", encoding="utf-8", errors="replace") as f:
                f.seek(start_offset)
                line_no = 0
                while True:
                    line = f.readline()
                    if not line:
                        break
                    line_no += 1
                    pos = f.tell()
                    parsed = parse_log_line(line, self.default_service)
                    if parsed and parsed.get("message"):
                        # Stable deterministic event identifier
                        event_id = f"evt-agent-{self.file_hash}-{new_offset}-{pos}"
                        parsed["event_id"] = event_id
                        records.append(parsed)
                    new_offset = pos

        except Exception:
            pass

        return records, new_offset, current_inode
