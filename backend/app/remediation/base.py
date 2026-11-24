from abc import ABC, abstractmethod
from typing import Dict, Any, List


class BaseRemediationEngine(ABC):
    """Extensible interface for generating human-in-the-loop playbooks and action plans."""

    @abstractmethod
    def generate_playbook(self, root_cause_diagnosis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate safe, structured mitigation steps with risk assessments."""
        pass
