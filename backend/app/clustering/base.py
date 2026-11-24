from abc import ABC, abstractmethod
from typing import List, Dict, Any


class BaseLogClusterer(ABC):
    """Extensible interface for error template grouping and semantic clustering."""

    @abstractmethod
    def cluster_logs(self, log_entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Group similar logs by pattern, template, and message similarity."""
        pass
