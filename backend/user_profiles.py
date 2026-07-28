"""
Per-user agent configuration (personalized AKSI node settings)
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class UserConfig:
    user_id: str
    model: str = "mistral"
    temperature: float = 0.7
    system_prompt: str = (
        "Ты — АКСИ, суверенный ИИ Альфии (1995). "
        "Отвечай с ходом мыслей и подписями."
    )
    plugins: List[str] = field(default_factory=lambda: ["identity", "quantum", "search"])
    mode: str = "aksi"  # aksi | quantum | concise
    max_history: int = 20
    updated_at: str = field(default_factory=_utcnow)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class UserProfileStore:
    def __init__(self) -> None:
        self._users: Dict[str, UserConfig] = {}

    def get(self, user_id: str) -> UserConfig:
        uid = (user_id or "default").strip() or "default"
        if uid not in self._users:
            self._users[uid] = UserConfig(user_id=uid)
        return self._users[uid]

    def update(self, user_id: str, **kwargs: Any) -> UserConfig:
        cfg = self.get(user_id)
        if "model" in kwargs and kwargs["model"]:
            cfg.model = str(kwargs["model"])[:64]
        if "temperature" in kwargs and kwargs["temperature"] is not None:
            t = float(kwargs["temperature"])
            cfg.temperature = max(0.0, min(1.5, t))
        if "system_prompt" in kwargs and kwargs["system_prompt"] is not None:
            cfg.system_prompt = str(kwargs["system_prompt"])[:4000]
        if "plugins" in kwargs and isinstance(kwargs["plugins"], list):
            cfg.plugins = [str(p)[:40] for p in kwargs["plugins"][:20]]
        if "mode" in kwargs and kwargs["mode"]:
            cfg.mode = str(kwargs["mode"])[:32]
        if "max_history" in kwargs and kwargs["max_history"] is not None:
            cfg.max_history = max(5, min(100, int(kwargs["max_history"])))
        cfg.updated_at = _utcnow()
        return cfg

    def status(self, user_id: str) -> Dict[str, Any]:
        cfg = self.get(user_id)
        d = cfg.to_dict()
        d["alive"] = True
        return d


profiles = UserProfileStore()
