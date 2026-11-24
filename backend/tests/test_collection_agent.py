import os
import sys
import tempfile
from pathlib import Path

# Add agents/python to python path for testing
agent_dir = Path(__file__).resolve().parent.parent.parent / "agents" / "python"
sys.path.insert(0, str(agent_dir))

from checkpoint_manager import CheckpointManager
from collector import LogFileTailer, parse_log_line, client_redact


def test_checkpoint_manager_lifecycle():
    with tempfile.TemporaryDirectory() as tmpdir:
        ckpt_path = os.path.join(tmpdir, "test-checkpoint.json")
        mgr = CheckpointManager(ckpt_path)

        # Initial offset is 0
        assert mgr.get_offset("/tmp/app.log") == 0

        # Commit offset
        mgr.commit_offset("/tmp/app.log", offset=1024, inode=999)
        assert mgr.get_offset("/tmp/app.log") == 1024

        # Reload manager from file
        mgr2 = CheckpointManager(ckpt_path)
        assert mgr2.get_offset("/tmp/app.log") == 1024
        assert mgr2.get_offset("/tmp/app.log", current_inode=999) == 1024
        # Inode change (rotation) resets offset to 0
        assert mgr2.get_offset("/tmp/app.log", current_inode=1000) == 0


def test_parse_log_line_json_and_text():
    # 1. Plain text line
    txt = "2026-11-25 10:30:15 ERROR payment-service Database timeout occurred with password=MySecretPassword"
    parsed_txt = parse_log_line(txt, default_service="default-svc")
    assert parsed_txt["severity"] == "ERROR"
    assert "MySecretPassword" not in parsed_txt["message"]
    assert "[REDACTED_PASSWORD]" in parsed_txt["message"]

    # 2. JSON Lines format
    json_line = '{"timestamp": "2026-11-25T10:30:15Z", "severity": "WARNING", "service": "auth-service", "message": "Bearer eyJhbGciOiJIUzI1NiJ9.abc auth delayed", "trace_id": "tr-99"}'
    parsed_json = parse_log_line(json_line, default_service="default-svc")
    assert parsed_json["severity"] == "WARNING"
    assert parsed_json["service"] == "auth-service"
    assert parsed_json["trace_id"] == "tr-99"
    assert "[REDACTED_TOKEN]" in parsed_json["message"]


def test_logfile_tailer_reads_appends_and_truncations():
    with tempfile.TemporaryDirectory() as tmpdir:
        log_file = os.path.join(tmpdir, "tail-test.log")
        tailer = LogFileTailer(log_file, default_service="test-service", start_position="beginning")

        # 1. Write initial entries
        with open(log_file, "w") as f:
            f.write("2026-11-25 10:00:01 INFO test-service Line 1\n")
            f.write("2026-11-25 10:00:02 ERROR test-service Line 2\n")

        records, new_offset, _ = tailer.read_new_lines(start_offset=0)
        assert len(records) == 2
        assert records[0]["severity"] == "INFO"
        assert records[1]["severity"] == "ERROR"
        assert records[0]["event_id"] is not None

        # 2. Read again without changes -> 0 new records
        recs2, off2, _ = tailer.read_new_lines(start_offset=new_offset)
        assert len(recs2) == 0
        assert off2 == new_offset

        # 3. Append a third line
        with open(log_file, "a") as f:
            f.write("2026-11-25 10:00:03 CRITICAL test-service Line 3\n")

        recs3, off3, _ = tailer.read_new_lines(start_offset=new_offset)
        assert len(recs3) == 1
        assert recs3[0]["severity"] == "CRITICAL"
        assert off3 > new_offset

        # 4. Truncate file (file size becomes 0)
        with open(log_file, "w") as f:
            f.write("2026-11-25 10:00:04 INFO test-service Truncated new line\n")

        # Tailer should detect truncation and read from offset 0
        recs4, off4, _ = tailer.read_new_lines(start_offset=off3)
        assert len(recs4) == 1
        assert "Truncated new line" in recs4[0]["message"]
