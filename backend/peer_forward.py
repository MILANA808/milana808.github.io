"""
HTTP peer delegation — first practical step toward multi-node AKSI
(not libp2p yet: plain POST to peer /api/aksi/chat or /network/relay)
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

try:
    import httpx
except ImportError:
    httpx = None  # type: ignore

from node_registry import registry
from quantum_router import classify_complexity, pick_node_ising


async def forward_chat(
    content: str,
    *,
    prefer_skill: str = "chat",
    exclude_endpoint: Optional[str] = None,
    timeout: float = 45.0,
) -> Dict[str, Any]:
    """Pick a peer and ask it to answer (non-stream aggregate)."""
    if httpx is None:
        return {"ok": False, "error": "httpx not installed"}

    nodes = registry.list_nodes()
    for n in nodes:
        n.setdefault("latency_ms", 50.0)
    pick = pick_node_ising(nodes, skill=prefer_skill)
    chosen = pick.get("chosen")
    if not chosen:
        return {"ok": False, "error": "no peer with skill", "route": pick}

    endpoint = (chosen.get("endpoint") or "").rstrip("/")
    if not endpoint:
        return {"ok": False, "error": "peer has empty endpoint"}
    if exclude_endpoint and endpoint.rstrip("/") == exclude_endpoint.rstrip("/"):
        # try any other node
        others = [n for n in nodes if (n.get("endpoint") or "").rstrip("/") != exclude_endpoint.rstrip("/")]
        if not others:
            return {"ok": False, "error": "only self registered"}
        chosen = others[0]
        endpoint = chosen["endpoint"].rstrip("/")

    url = endpoint + "/network/relay"
    payload = {"content": content, "from": "peer-forward"}
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.post(url, json=payload)
            if r.status_code == 404:
                # fallback to standard chat aggregate
                r = await client.post(
                    endpoint + "/api/aksi/chat",
                    json={"content": content, "mode": "aksi"},
                    headers={"Accept": "text/event-stream"},
                )
                text = r.text
                return {
                    "ok": r.status_code == 200,
                    "peer": chosen,
                    "raw": text[:4000],
                    "via": "chat-sse-fallback",
                }
            data = r.json() if r.headers.get("content-type", "").startswith("application/json") else {"text": r.text}
            return {"ok": r.status_code == 200, "peer": chosen, "response": data, "via": "relay"}
    except Exception as e:
        return {"ok": False, "error": str(e), "peer": chosen}


def should_forward(text: str) -> bool:
    c = classify_complexity(text)
    return c.get("route") == "consider_peer"
