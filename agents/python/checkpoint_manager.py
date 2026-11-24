import json
import os
import time
from typing import Dict, Any, Optional
from pathlib import Path


class CheckpointManager:
    """Durably tracks file read offsets and inodes to ensure at-least-once delivery without duplicate loss."""

    def __init__(self, checkpoint_path: str):
        self.checkpoint_path = Path(checkpoint_path).resolve()
        self._checkpoints: Dict[str, Dict[str, Any]] = self._load()

    def _load(self) -> Dict[str, Dict[str, Any]]:
        if not self.checkpoint_path.exists():
            return {}
        try:
            with open(self.checkpoint_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    def get_offset(self, file_path: str, current_inode: Optional[int] = None) -> int:
        norm_path = str(Path(file_path).resolve())
        data = self._checkpoints.get(norm_path)
        if not data:
            return 0

        # Inode verification for log rotation
        saved_inode = data.get("inode")
        if current_inode is not None and saved_inode is not None and saved_inode != current_inode:
            # File was rotated into a new file; start from beginning
            return 0

        return data.get("offset", 0)

    def commit_offset(self, file_path: str, offset: int, inode: Optional[int] = None):
        norm_path = str(Path(file_path).resolve())
        self._checkpoints[norm_path] = {
            "offset": offset,
            "inode": inode,
            "updated_at": time.time(),
        }
        self._persist()

    def _persist(self):
        temp_file = self.checkpoint_path.with_suffix(".tmp")
        try:
            self.checkpoint_path.parent.mkdir(parents=True, exist_ok=True)
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(self._checkpoints, f, indent=2)
            temp_file.replace(self.checkpoint_path)
        except Exception as e:
            if temp_file.exists():
                try:
                    temp_file.unlink()
                except Exception:
                    pass
