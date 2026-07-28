"""
Network API: user config, node registry, quantum-inspired routing, peer relay
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from node_registry import registry
from quantum_router import classify_complexity, grover_style_search, pick_node_ising
from user_profiles import profiles
from core.memory import memory_store
from core.llm import generate_aksi_response
from core.resonance import generate_aksi_signature, calc_resonance_level
from ws_manager import manager

try:
    from peer_forward import forward_chat, should_forward
except ImportError:

    async def forward_chat(*a, **k):
        return {"ok": False, "error": "peer_forward missing"}

    def should_forward(text: str) -> bool:
        return False


class UserConfigBody(BaseModel):
    user_id: str = "default"
    model: Optional[str] = None
    temperature: Optional[float] = None
    system_prompt: Optional[str] = None
    plugins: Optional[List[str]] = None
    mode: Optional[str] = None
    max_history: Optional[int] = None


class NodeRegisterBody(BaseModel):
    name: str = "aksi-node"
    endpoint: str
    public_key: str = ""
    skills: Optional[List[str]] = None
    node_id: Optional[str] = None


class HeartbeatBody(BaseModel):
    node_id: str
    load: float = 0.0


class ClassifyBody(BaseModel):
    text: str = Field(..., min_length=1)


class GroverBody(BaseModel):
    query: str
    items: List[str] = Field(default_factory=list)


class RelayBody(BaseModel):
    content: str = Field(..., min_length=1)
    from_peer: Optional[str] = None


class ForwardBody(BaseModel):
    content: str = Field(..., min_length=1)
    skill: str = "chat"


def register_network_routes(app: FastAPI) -> None:
    @app.get("/user/status")
    @app.get("/api/user/status")
    async def user_status(user_id: str = "default"):
        st = profiles.status(user_id)
        st["memory_messages"] = len(memory_store.get_history(user_id, limit=1000))
        st["ws_peers"] = manager.count
        return st

    @app.post("/user/config")
    @app.post("/api/user/config")
    async def user_config(body: UserConfigBody):
        cfg = profiles.update(
            body.user_id,
            model=body.model,
            temperature=body.temperature,
            system_prompt=body.system_prompt,
            plugins=body.plugins,
            mode=body.mode,
            max_history=body.max_history,
        )
        return {"ok": True, "config": cfg.to_dict()}

    @app.get("/network/nodes")
    @app.get("/api/network/nodes")
    async def list_nodes():
        return {"nodes": registry.list_nodes(), "count": len(registry.nodes)}

    @app.post("/network/register")
    @app.post("/api/network/register")
    async def register_node(body: NodeRegisterBody):
        if not body.endpoint.strip():
            raise HTTPException(400, "endpoint required")
        entry = registry.register(
            name=body.name,
            endpoint=body.endpoint.strip(),
            public_key=body.public_key,
            skills=body.skills,
            node_id=body.node_id,
        )
        await manager.broadcast({"type": "sys", "content": f"node joined: {entry['name']}"})
        return entry

    @app.post("/network/heartbeat")
    async def heartbeat(body: HeartbeatBody):
        n = registry.heartbeat(body.node_id, body.load)
        if not n:
            raise HTTPException(404, "node not found")
        return n

    @app.post("/network/classify")
    @app.post("/api/network/classify")
    async def classify(body: ClassifyBody):
        return classify_complexity(body.text)

    @app.post("/network/grover-search")
    async def grover_search(body: GroverBody):
        items = body.items or [
            "АКСИ identity DID",
            "quantum statevector simulator",
            "ORIGIN agent map",
            "self-mod sandbox patches",
            "WebSocket live chat",
            "Globe Resonance DIMAX",
            "federated node registry",
        ]
        return grover_style_search(items, body.query)

    @app.post("/network/route")
    async def route_skill(skill: str = "chat"):
        nodes = registry.list_nodes()
        for n in nodes:
            n.setdefault("latency_ms", 40.0)
        return pick_node_ising(nodes, skill=skill)

    @app.post("/network/relay")
    async def relay(body: RelayBody):
        """Answer on behalf of a peer (non-stream JSON)."""
        content = body.content.strip()
        chunks: List[str] = []
        async for c in generate_aksi_response(content, [], mode="aksi"):
            chunks.append(c)
        answer = "".join(chunks).strip()
        return {
            "answer": answer,
            "signature": generate_aksi_signature(answer + content),
            "resonance": calc_resonance_level(1),
            "from_peer": body.from_peer,
            "node": "local-relay",
        }

    @app.post("/network/forward")
    async def forward(body: ForwardBody):
        """Delegate to another registered node if complexity suggests it."""
        cls = classify_complexity(body.content)
        result = await forward_chat(body.content, prefer_skill=body.skill)
        return {"classify": cls, "forward": result}
