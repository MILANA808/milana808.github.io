"""
Bootstrap node registry for AKSI network
In-memory + optional announce from peers (not full libp2p yet)
"""
from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


class NodeRegistry:
    def __init__(self) -> None:
        self.nodes: Dict[str, Dict[str, Any]] = {}

    def register(
        self,
        *,
        name: str,
        endpoint: str,
        public_key: str = "",
        skills: Optional[List[str]] = None,
        node_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        nid = node_id or secrets.token_hex(8)
        entry = {
            "node_id": nid,
            "name": (name or "aksi-node")[:80],
            "endpoint": (endpoint or "")[:300],
            "public_key": (public_key or "")[:256],
            "skills": skills or ["chat", "identity"],
            "load": 0.0,
            "last_seen": _utcnow(),
            "status": "online",
        }
        self.nodes[nid] = entry
        return entry

    def heartbeat(self, node_id: str, load: float = 0.0) -> Optional[Dict[str, Any]]:
        n = self.nodes.get(node_id)
        if not n:
            return None
        n["last_seen"] = _utcnow()
        n["load"] = max(0.0, min(1.0, float(load)))
        n["status"] = "online"
        return n

    def list_nodes(self) -> List[Dict[str, Any]]:
        return list(self.nodes.values())

    def pick_best(self, skill: str = "chat") -> Optional[Dict[str, Any]]:
        """Simple classical routing: lowest load among nodes with skill."""
        cands = [
            n
            for n in self.nodes.values()
            if skill in (n.get("skills") or []) and n.get("status") == "online"
        ]
        if not cands:
            return None
        return min(cands, key=lambda x: float(x.get("load") or 0))


registry = NodeRegistry()
# seed local matrix node
registry.register(
    name="MATRIX-local",
    endpoint="http://localhost:8000",
    public_key="did:aksi:ed25519:sovereign-1995-alfiya",
    skills=["chat", "identity", "quantum", "origin", "self-mod"],
    node_id="matrix-local",
)
