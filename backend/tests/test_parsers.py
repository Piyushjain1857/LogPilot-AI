import json
import pytest
from app.parsers.parser_factory import ParserFactory
from app.parsers.text_parser import TextLogParser
from app.parsers.csv_parser import CSVLogParser
from app.parsers.json_parser import JSONLogParser
from app.parsers.jsonl_parser import JSONLinesLogParser


def test_parser_factory_selection():
    assert isinstance(ParserFactory.get_parser("LOG"), TextLogParser)
    assert isinstance(ParserFactory.get_parser("TXT"), TextLogParser)
    assert isinstance(ParserFactory.get_parser("CSV"), CSVLogParser)
    assert isinstance(ParserFactory.get_parser("JSON"), JSONLogParser)
    assert isinstance(ParserFactory.get_parser("JSONL"), JSONLinesLogParser)
    assert isinstance(ParserFactory.get_parser("NDJSON"), JSONLinesLogParser)


def test_text_parser_multiline(tmp_path):
    log_content = (
        "2026-11-24T10:00:00Z [INFO] [api-gateway] Request received trace_id=tr-01\n"
        "2026-11-24T10:00:01Z [ERROR] [payment-service] Database connection timeout trace_id=tr-01\n"
        "Traceback (most recent call last):\n"
        "  File \"app.py\", line 12, in <module>\n"
        "    connect_db()\n"
        "ConnectionError: timed out\n"
        "2026-11-24T10:00:05Z [WARNING] [api-gateway] Request retry\n"
    )
    p = tmp_path / "app.log"
    p.write_text(log_content)

    parser = TextLogParser()
    records = list(parser.parse(str(p)))

    assert len(records) == 3
    assert records[0].severity == "INFO"
    assert records[0].service_name == "api-gateway"
    assert records[0].trace_id == "tr-01"

    assert records[1].severity == "ERROR"
    assert "Traceback" in records[1].message
    assert "ConnectionError" in records[1].message

    assert records[2].severity == "WARNING"


def test_csv_parser_auto_mapping(tmp_path):
    csv_content = (
        "time,level,application,msg,traceId,spanId\n"
        "2026-11-24T10:00:00Z,ERROR,order-service,Order validation failed,tr-999,sp-111\n"
        "2026-11-24T10:00:01Z,INFO,order-service,Order processed successfully,tr-999,sp-112\n"
    )
    p = tmp_path / "logs.csv"
    p.write_text(csv_content)

    parser = CSVLogParser()
    records = list(parser.parse(str(p)))

    assert len(records) == 2
    assert records[0].severity == "ERROR"
    assert records[0].service_name == "order-service"
    assert records[0].message == "Order validation failed"
    assert records[0].trace_id == "tr-999"
    assert records[0].span_id == "sp-111"


def test_json_parser_array_and_wrapper(tmp_path):
    json_content = json.dumps([
        {"timestamp": "2026-11-24T10:00:00Z", "level": "CRITICAL", "service": "db", "message": "Disk full"},
        {"timestamp": "2026-11-24T10:00:01Z", "level": "INFO", "service": "db", "message": "Disk pruned"}
    ])
    p = tmp_path / "logs.json"
    p.write_text(json_content)

    parser = JSONLogParser()
    records = list(parser.parse(str(p)))

    assert len(records) == 2
    assert records[0].severity == "CRITICAL"
    assert records[0].service_name == "db"
    assert records[0].message == "Disk full"


def test_jsonl_parser_mixed_lines(tmp_path):
    jsonl_content = (
        '{"timestamp": "2026-11-24T10:00:00Z", "level": "INFO", "message": "Line 1"}\n'
        'NOT_A_VALID_JSON_STRING\n'
        '{"timestamp": "2026-11-24T10:00:02Z", "level": "ERROR", "message": "Line 3"}\n'
    )
    p = tmp_path / "logs.jsonl"
    p.write_text(jsonl_content)

    parser = JSONLinesLogParser()
    records = list(parser.parse(str(p)))

    assert len(records) == 3
    assert records[0].is_valid is True
    assert records[1].is_valid is False
    assert "Malformed JSON" in records[1].error_reason
    assert records[2].is_valid is True
