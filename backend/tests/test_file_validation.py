import os
import pytest
from app.ingestion.file_validator import FileValidator, SUPPORTED_EXTENSIONS
from app.ingestion.ingestion_errors import FileValidationError


def test_sanitize_filename():
    assert FileValidator.sanitize_filename("valid_app.log") == "valid_app.log"
    assert FileValidator.sanitize_filename("../../etc/passwd.log") == "passwd.log"
    assert FileValidator.sanitize_filename("file\x00with\ncontrols.txt") == "filewithcontrols.txt"
    assert FileValidator.sanitize_filename("..") == "unnamed_log_file.log"
    assert FileValidator.sanitize_filename("") == "unnamed_log_file.log"


def test_validate_supported_extensions():
    for ext, fmt in SUPPORTED_EXTENSIONS.items():
        assert FileValidator.validate_file_metadata(f"test{ext}") == fmt


def test_reject_forbidden_extensions():
    forbidden = ["virus.exe", "bundle.zip", "malicious.sh", "doc.pdf", "image.png"]
    for fn in forbidden:
        with pytest.raises(FileValidationError, match="forbidden"):
            FileValidator.validate_file_metadata(fn)


def test_reject_unsupported_extensions():
    with pytest.raises(FileValidationError, match="Unsupported file extension"):
        FileValidator.validate_file_metadata("data.unsupported")


def test_reject_declared_oversized():
    with pytest.raises(FileValidationError, match="exceeds maximum allowed limit"):
        FileValidator.validate_file_metadata("huge.log", declared_size=30 * 1024 * 1024)


def test_validate_content_empty_file(tmp_path):
    empty = tmp_path / "empty.log"
    empty.write_text("")
    with pytest.raises(FileValidationError, match="empty"):
        FileValidator.validate_content_and_encoding(str(empty))


def test_validate_content_binary_file(tmp_path):
    binary = tmp_path / "binary.log"
    binary.write_bytes(b"\x00\x01\x02\x03\x04\x05")
    with pytest.raises(FileValidationError, match="Binary content detected"):
        FileValidator.validate_content_and_encoding(str(binary))


def test_validate_utf8_bom(tmp_path):
    bom_file = tmp_path / "bom.log"
    bom_file.write_bytes(b"\xef\xbb\xbf2026-11-24 INFO Test message")
    fmt, encoding = FileValidator.validate_content_and_encoding(str(bom_file))
    assert fmt == "LOG"
    assert encoding == "utf-8-sig"
