from abc import ABC, abstractmethod
from typing import List, Dict, Any


class BaseAnomalyDetector(ABC):
    """Extensible interface for statistical and ML-based anomaly detection."""

    @abstractmethod
    def detect_anomalies(self, time_series: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identify anomalous log frequency bursts or latency shifts."""
        pass
