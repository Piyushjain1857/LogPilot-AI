from app.parsers.base_parser import BaseParser
from app.parsers.text_parser import TextLogParser
from app.parsers.csv_parser import CSVLogParser
from app.parsers.json_parser import JSONLogParser
from app.parsers.jsonl_parser import JSONLinesLogParser
from app.ingestion.ingestion_errors import ParsingError


class ParserFactory:
    """Factory creating format-specific parser instances."""

    _PARSERS = {
        "LOG": TextLogParser,
        "TXT": TextLogParser,
        "CSV": CSVLogParser,
        "JSON": JSONLogParser,
        "JSONL": JSONLinesLogParser,
        "NDJSON": JSONLinesLogParser,
    }

    @classmethod
    def get_parser(cls, file_format: str) -> BaseParser:
        fmt = (file_format or "").upper()
        parser_cls = cls._PARSERS.get(fmt)
        if not parser_cls:
            raise ParsingError(f"No parser available for format '{file_format}'.")
        return parser_cls()
