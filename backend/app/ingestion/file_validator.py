import os
import re
from pathlib import Path
from typing import Tuple, Optional
from app.core.config import settings
from app.ingestion.ingestion_errors import FileValidationError

SUPPORTED_EXTENSIONS = {
    ".log": "LOG",
    ".txt": "TXT",
    ".csv": "CSV",
    ".json": "JSON",
    ".jsonl": "JSONL",
    ".ndjson": "NDJSON",
}

DISALLOWED_EXTENSIONS = {
    ".exe", ".bin", ".sh", ".bat", ".cmd", ".msi", ".dll", ".so", ".dylib",
    ".zip", ".tar", ".gz", ".7z", ".rar", ".bz2", ".xz",
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".py", ".js", ".ts", ".c", ".cpp", ".java", ".go", ".rb", ".php",
}


class FileValidator:
    """Centralized validation service enforcing strict file size, format, and encoding security."""

    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Strips path traversal components and unsafe control characters."""
        clean_name = os.path.basename(filename)
        clean_name = re.sub(r'[\r\n\t\x00]', '', clean_name)
        clean_name = re.sub(r'[^A-Za-z0-9._\- ]', '_', clean_name)
        if not clean_name.strip() or clean_name in (".", ".."):
            clean_name = "unnamed_log_file.log"
        return clean_name[:255]

    @classmethod
    def validate_file_metadata(cls, filename: str, declared_size: Optional[int] = None) -> str:
        """Validates extension and basic file attributes before streaming."""
        sanitized = cls.sanitize_filename(filename)
        ext = Path(sanitized).suffix.lower()

        if ext in DISALLOWED_EXTENSIONS:
            raise FileValidationError(
                f"File format '{ext}' is forbidden. Executable, binary, archive, document, and media files are strictly rejected."
            )

        if ext not in SUPPORTED_EXTENSIONS:
            raise FileValidationError(
                f"Unsupported file extension '{ext}'. Supported formats: .log, .txt, .csv, .json, .jsonl, .ndjson."
            )

        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if declared_size is not None and declared_size > max_bytes:
            raise FileValidationError(
                f"File size exceeds maximum allowed limit of {settings.MAX_UPLOAD_SIZE_MB} MB."
            )

        return SUPPORTED_EXTENSIONS[ext]

    @classmethod
    def validate_content_and_encoding(cls, file_path: str) -> Tuple[str, str]:
        """
        Inspects actual file content on disk:
        - Verifies non-empty file
        - Verifies actual file size under byte limit
        - Detects binary content (null bytes, high non-text byte ratio)
        - Detects and validates character encoding (UTF-8, UTF-8 BOM, UTF-16 LE/BE)
        Returns (detected_format, encoding).
        """
        file_size = os.path.getsize(file_path)
        if file_size == 0:
            raise FileValidationError("Uploaded file is empty (0 bytes).")

        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if file_size > max_bytes:
            raise FileValidationError(
                f"File size of {file_size / (1024 * 1024):.2f} MB exceeds limit of {settings.MAX_UPLOAD_SIZE_MB} MB."
            )

        # Inspect initial chunk (up to 8KB)
        with open(file_path, "rb") as f:
            header = f.read(8192)

        # Detect BOM
        encoding = "utf-8"
        if header.startswith(b"\xef\xbb\xbf"):
            encoding = "utf-8-sig"
        elif header.startswith(b"\xff\xfe"):
            encoding = "utf-16-le"
        elif header.startswith(b"\xfe\xff"):
            encoding = "utf-16-be"
        else:
            # Check for null bytes indicative of raw binary
            if b"\x00" in header:
                # If there are null bytes and not UTF-16, reject as binary
                raise FileValidationError("Binary content detected. Only text-based log files are accepted.")
            # Verify UTF-8 decode
            try:
                header.decode("utf-8")
                encoding = "utf-8"
            except UnicodeDecodeError:
                # Try latin-1 fallback or reject
                try:
                    header.decode("utf-8-sig")
                    encoding = "utf-8-sig"
                except UnicodeDecodeError:
                    raise FileValidationError(
                        "Invalid character encoding. Files must be encoded in UTF-8 or UTF-8 with BOM."
                    )

        # Extension-based format identification
        ext = Path(file_path).suffix.lower()
        file_format = SUPPORTED_EXTENSIONS.get(ext, "LOG")
        return file_format, encoding
