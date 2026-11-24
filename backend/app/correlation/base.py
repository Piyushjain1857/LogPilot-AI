from abc import ABC, abstractmethod
from typing import List, Dict, Any


class BaseIncidentCorrelator(ABC):
    """Extensible interface for cross-service failure correlation."""

    @abstractmethod
    def correlate_incident(self, logs: List[Dict[str, Any]], time_window_seconds: int = 60) -> List[Dict[str, Any]]:
        """Correlate related service failures across trace IDs and co-occurrence windows."""
        pass
