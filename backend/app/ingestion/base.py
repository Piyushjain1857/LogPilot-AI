from abc import ABC, abstractmethod
from typing import BinaryIO, Generator, Dict, Any


class BaseLogIngester(ABC):
    """Extensible interface for file uploads, bulk streams, and live agent ingestion."""

    @abstractmethod
    def ingest_file(self, file_obj: BinaryIO, filename: str) -> Generator[Dict[str, Any], None, None]:
        """Stream parsed log records from an uploaded file."""
        pass
