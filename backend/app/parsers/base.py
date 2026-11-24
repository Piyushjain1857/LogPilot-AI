from abc import ABC, abstractmethod
from typing import Any, Dict, List


class BaseLogParser(ABC):
    """Extensible interface for log normalization and template mining (e.g. Drain3)."""

    @abstractmethod
    def parse_line(self, line: str) -> Dict[str, Any]:
        """Parse an unformatted log line into structured fields."""
        pass

    @abstractmethod
    def extract_template(self, message: str) -> str:
        """Extract a generalized template replacing variable tokens with wildcards."""
        pass
