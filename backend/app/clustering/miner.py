import re
import hashlib
from typing import List, Dict, Any, Tuple, Optional
from drain3 import TemplateMiner
from drain3.template_miner_config import TemplateMinerConfig


# Regex pre-masking patterns
UUID_REGEX = re.compile(r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b")
IP_REGEX = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?\b")
HEX_REGEX = re.compile(r"\b0x[0-9a-fA-F]+\b|\b[0-9a-fA-F]{16,64}\b")
PATH_REGEX = re.compile(r"(?:/[a-zA-Z0-9_\.-]+){2,}")
URL_REGEX = re.compile(r"https?://[^\s/$.?#].[^\s]*")
NUM_REGEX = re.compile(r"\b\d+\b")


class LogClusterEngine:
    def __init__(self, depth: int = 4, sim_th: float = 0.5):
        config = TemplateMinerConfig()
        config.drain_depth = depth
        config.drain_sim_th = sim_th
        config.drain_max_children = 100
        config.drain_max_clusters = 5000
        self.miner = TemplateMiner(config=config)

    def preprocess_message(self, message: str) -> str:
        """Mask volatile entities with canonical semantic tokens."""
        if not message:
            return ""
        s = URL_REGEX.sub("<URL>", message)
        s = UUID_REGEX.sub("<UUID>", s)
        s = IP_REGEX.sub("<IP>", s)
        s = HEX_REGEX.sub("<HEX>", s)
        s = PATH_REGEX.sub("<PATH>", s)
        s = NUM_REGEX.sub("<NUM>", s)
        return s

    def mine_log(self, raw_message: str, service_name: str) -> Dict[str, Any]:
        """
        Process a log message, extract template, variables, and deterministic signature hash.
        """
        masked = self.preprocess_message(raw_message)
        result = self.miner.add_log_message(masked)

        template = result.get("template_mined", masked)
        # Normalize template spacing
        template = " ".join(template.split())

        # Generate deterministic signature hash based on service and template
        sig_input = f"{service_name}:{template}"
        signature_hash = hashlib.sha256(sig_input.encode("utf-8")).hexdigest()

        # Extract variables by comparing raw message with template tokens
        variables = self.extract_variables(raw_message, template)

        # Derive readable cluster name
        name = self.generate_cluster_name(template)

        return {
            "template": template,
            "signature_hash": signature_hash,
            "name": name,
            "variables": variables,
            "cluster_id": result.get("cluster_id"),
        }

    def extract_variables(self, raw_message: str, template: str) -> Dict[str, List[str]]:
        """Extract variable tokens from raw message that correspond to template placeholders."""
        vars_found: Dict[str, List[str]] = {}
        raw_tokens = raw_message.split()
        temp_tokens = template.split()

        placeholders = {"<*>", "<UUID>", "<IP>", "<NUM>", "<HEX>", "<PATH>", "<URL>"}

        if len(raw_tokens) == len(temp_tokens):
            for r_tok, t_tok in zip(raw_tokens, temp_tokens):
                if t_tok in placeholders:
                    clean_key = t_tok.strip("<>").lower()
                    if clean_key not in vars_found:
                        vars_found[clean_key] = []
                    if r_tok not in vars_found[clean_key] and len(vars_found[clean_key]) < 5:
                        vars_found[clean_key].append(r_tok)

        return vars_found

    def generate_cluster_name(self, template: str) -> str:
        """Create a concise human-readable summary name for a template."""
        words = template.split()
        significant = [w for w in words if not w.startswith("<") and not w.endswith(">")]
        if significant:
            # Use up to first 7 significant words
            return " ".join(significant[:7])
        return template[:40]
