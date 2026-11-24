from abc import ABC, abstractmethod
from typing import Dict, Any


class BaseTroubleshooterAgent(ABC):
    """Extensible interface for Gemini AI root cause diagnosis and troubleshooting."""

    @abstractmethod
    async def diagnose_incident(self, incident_context: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze clustered error traces and system events to infer root cause."""
        pass
