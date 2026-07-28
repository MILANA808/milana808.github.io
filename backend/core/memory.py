"""
AKSI dialogue memory — in-process session store
Alfiya · 1995
"""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from typing import Dict, List


class MemoryStore:
    def __init__(self) -> None:
        self.sessions: Dict[str, List[dict]] = defaultdict(list)

    def add_message(self, session_id: str, role: str, content: str) -> None:
        self.sessions[session_id].append(
            {
                "role": role,
                "content": content,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )

    def get_history(self, session_id: str, limit: int = 20) -> List[dict]:
        return self.sessions[session_id][-limit:]

    def clear(self, session_id: str) -> None:
        self.sessions[session_id] = []

    def session_count(self) -> int:
        return len(self.sessions)


memory_store = MemoryStore()
