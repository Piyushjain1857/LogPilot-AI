import threading
from typing import Tuple
from app.core.logging import logger

try:
    from drain3 import TemplateMiner
    from drain3.template_miner_config import TemplateMinerConfig
    _DRAIN3_AVAILABLE = True
except ImportError:
    _DRAIN3_AVAILABLE = False


class TemplateMinerService:
    """Thread-safe Drain3 log template extraction engine."""

    def __init__(self):
        self._lock = threading.Lock()
        self._miner = None
        if _DRAIN3_AVAILABLE:
            try:
                config = TemplateMinerConfig()
                config.drain_sim_th = 0.5
                config.drain_depth = 4
                config.drain_max_children = 100
                config.drain_max_clusters = 1024
                config.mask_prefix = "<:"
                config.mask_suffix = ":>"
                config.profiling_enabled = False
                self._miner = TemplateMiner(config=config)
            except Exception as e:
                logger.warning(f"Could not initialize Drain3 TemplateMiner: {e}")
                self._miner = None

    def match_or_create_template(self, message: str) -> Tuple[str, str]:
        """
        Extracts or matches a template ID and pattern for a given log message.
        Returns: (template_id, template_string)
        """
        if not message:
            return "empty", ""

        if not self._miner:
            # Fallback simple template heuristic
            import re
            simplified = re.sub(r"\b\d+\b", "*", message)
            simplified = re.sub(r"\b[0-9a-fA-F-]{16,}\b", "*", simplified)
            return "default", simplified[:255]

        with self._lock:
            try:
                result = self._miner.add_log_message(message)
                if result:
                    cluster_id = str(result.get("cluster_id", "tpl-1"))
                    template_str = result.get("template_mined", message)
                    return cluster_id, template_str
            except Exception as e:
                logger.debug(f"Drain3 extraction notice: {e}")

        return "default", message[:255]


template_miner_service = TemplateMinerService()
