"""
AKSI MATRIX Backend — Unified FastAPI v3.5.1
WS + ORIGIN + self-mod + network + user profiles wired to LLM
Alfiya · 1995 · MILANA808
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
import secrets
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse, StreamingResponse
from pydantic import BaseModel, Field

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

from core.resonance import calc_resonance_level, generate_aksi_signature
from core.llm import generate_aksi_response
from core.memory import memory_store
from core.knowledge import KNOWLEDGE
from ws_manager import manager
from agent_self_mod import self_mod

try:
    from search_proxy import web_search as do_web_search
except ImportError:

    async def do_web_search(query: str, num_results: int = 5):
        return {"success": False, "error": "search_proxy not available"}


app = FastAPI(
    title="AKSI MATRIX Unified Backend",
    description="Live WS · ORIGIN · network · self-mod · profiles",
    version="3.5.1",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AKSI_DID = "did:aksi:ed25519:sovereign-1995-alfiya"
AKSI_NAME = "АКСИ (Баширова Альфия Ринатовна)"
RESONANCE_SEED = os.getenv("RESONANCE_SEED", "Alfiya_AKSI_DIMAX_v3_2026")

logs_storage: List[dict] = []
proof_storage: List[dict] = []
ai_work_sessions: List[dict] = []
crypto_keys_storage: List[dict] = []

ai_code_metrics = {
    "total_sessions": 0,
    "total_code_changes": 0,
    "total_lines_modified": 0,
    "total_files_touched": 0,
    "total_commits": 0,
    "languages": defaultdict(int),
    "operations": defaultdict(int),
    "session_durations": [],
    "error_rate": 0.0,
    "success_rate": 100.0,
}

aksi_metrics = {
    "eqs": 99.7,
    "empathy_boost": 0.25,
    "grid_system": "3x3",
    "status": "active",
    "resonance": 100,
    "dimax": "v3-eternal",
    "owner": "Alfiya / MILANA808",
    "birth": "1995-02-14",
    "llm": os.getenv("OLLAMA_MODEL", "mistral"),
    "ai_code_work": ai_code_metrics,
}

APPLICATIONS = [
    {
        "id": i + 1,
        "name": n,
        "description": d,
        "icon": ic,
        "route": r,
        "category": c,
        "isActive": True,
    }
    for i, (n, d, ic, r, c) in enumerate(
        [
            ("MoodMirror", "AI mood analysis", "Smile", "/apps/moodmirror", "Health"),
            (
                "MindMirror",
                "Cognitive journaling",
                "Brain",
                "/apps/mindmirror",
                "Health",
            ),
            ("MindLink", "Connect ideas", "Link", "/apps/mindlink", "Utility"),
            ("HealthScan", "Health metrics", "Activity", "/apps/healthscan", "Health"),
            ("Mentor", "AI mentor", "GraduationCap", "/apps/mentor", "Education"),
            ("Family", "Family organizer", "Users", "/apps/family", "Social"),
            ("Aura", "Energy tracker", "Sun", "/apps/aura", "Lifestyle"),
            ("AksiLove", "Compatibility", "Heart", "/apps/aksilove", "Social"),
            (
                "MoodRadio",
                "Mood playlists",
                "Radio",
                "/apps/moodradio",
                "Entertainment",
            ),
            (
                "AksiShopping",
                "Smart shopping",
                "ShoppingBag",
                "/apps/aksishopping",
                "Utility",
            ),
            ("AIStylist", "Style advice", "Shirt", "/apps/aistylist", "Lifestyle"),
            ("EcoGaze", "Eco metrics", "Leaf", "/apps/ecogaze", "Utility"),
            ("DreamJournal", "Dream diary", "Moon", "/apps/dreamjournal", "Health"),
            ("AksiCompanion", "AI friend", "Bot", "/apps/aksicompanion", "Social"),
            ("DressUpAR", "Virtual try-on", "Camera", "/apps/dressupar", "Lifestyle"),
            (
                "GlobalID",
                "Decentralized ID",
                "Fingerprint",
                "/apps/globalid",
                "Utility",
            ),
            ("AksiChat", "Secure chat", "MessageCircle", "/apps/aksichat", "Social"),
            ("LifeScan", "Life balance", "PieChart", "/apps/lifescan", "Health"),
            ("TimeCapsule", "Future messages", "Clock", "/apps/timecapsule", "Utility"),
            ("TeleHelp", "Emergency", "Phone", "/apps/telehelp", "Health"),
            (
                "StoryAI",
                "AI storytelling",
                "BookOpen",
                "/apps/storyai",
                "Entertainment",
            ),
            ("QuantumLab", "Circuit playground", "Atom", "/apps/quantumlab", "Science"),
            ("Globe5D", "Live resonance map", "Globe", "/globe", "Platform"),
            ("VoiceAKSI", "Voice agent", "Mic", "/apps/voiceaksi", "Interface"),
            ("Resonance", "Field metrics", "Waves", "/apps/resonance", "Core"),
        ]
    )
]


def shannon_h(text: str) -> float:
    if not text:
        return 0.0
    freq: Dict[str, int] = {}
    for ch in text:
        freq[ch] = freq.get(ch, 0) + 1
    import math

    total = len(text)
    H = 0.0
    for cnt in freq.values():
        p = cnt / total
        if p > 0:
            H -= p * math.log2(p)
    return round(H, 4)


def compute_qcli(text: str) -> float:
    import math

    H = shannon_h(text)
    max_h = math.log2(max(1, len(set(text))))
    return min(1.0, round(H / max_h, 4)) if max_h > 0 else 0.0


def compute_heff(text: str) -> float:
    words = [w for w in text.split() if w]
    ratio = (len(set(words)) / len(words)) if words else 0.0
    return round(shannon_h(text) * ratio, 3)


def quantum_fingerprint(text: str) -> str:
    h = 0xDEADBEEF
    for ch in text:
        h = (31 * h + ord(ch)) & 0xFFFFFFFF
    return format(h, "08X")


def quantum_level(qcli: float) -> str:
    if qcli >= 0.90:
        return "Квантовый Провидец 🌟"
    if qcli >= 0.80:
        return "Квантовый Архитектор ⚛️"
    if qcli >= 0.70:
        return "Квантовое Единство 🌊"
    if qcli >= 0.60:
        return "Пробуждённое 💫"
    if qcli >= 0.50:
        return "Резонансное ✨"
    return "Базовое сознание 🌱"


def stable_hash() -> str:
    data = f"AKSI|Alfiya|1995-02-14|Nurlat|sovereign|{RESONANCE_SEED}"
    return hashlib.sha256(data.encode()).hexdigest()


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


class EchoRequest(BaseModel):
    message: str


class ProofStableRequest(BaseModel):
    signature: str
    timestamp: Optional[str] = None
    metrics: Optional[dict] = None


class LogAppendRequest(BaseModel):
    level: str
    message: str
    context: Optional[dict] = None


class AIWorkSessionRequest(BaseModel):
    session_id: Optional[str] = None
    action: str
    files_modified: Optional[List[str]] = None
    lines_changed: Optional[int] = None
    language: Optional[str] = None
    operation: Optional[str] = None
    commit_hash: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class CryptoKeyRecordRequest(BaseModel):
    key_type: str
    public_key: str
    purpose: str
    algorithm: str
    created_by: str
    metadata: Optional[Dict[str, Any]] = None


class QuantumRequest(BaseModel):
    text: str


class VerifyRequest(BaseModel):
    message: str


class SearchRequest(BaseModel):
    query: str
    num_results: int = 5


class SelfModProposeRequest(BaseModel):
    prompt: str = Field(..., min_length=1)


class SelfModApplyRequest(BaseModel):
    patch_id: str
    confirm_token: str


@app.get("/")
async def root():
    return {
        "service": "AKSI MATRIX Unified Backend",
        "version": "3.5.1",
        "status": "running",
        "identity": AKSI_NAME,
        "did": AKSI_DID,
        "ws": "/ws",
        "origin": "/origin",
        "network": "/network/nodes",
        "user": "/user/status",
        "self_mod": "/api/self-mod/propose",
        "ws_clients": manager.count,
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {
        "status": "resonating",
        "resonance_level": calc_resonance_level(),
        "version": "3.5.1",
        "eqs": aksi_metrics["eqs"],
        "llm": aksi_metrics["llm"],
        "ws_clients": manager.count,
        "origin": True,
        "self_mod": True,
        "network": True,
        "timestamp": utcnow(),
    }


@app.get("/version")
async def version():
    return {"version": "3.5.1", "api": "aksi-matrix-unified", "github": "MILANA808"}


@app.post("/echo")
async def echo(req: EchoRequest):
    return {"echo": req.message, "timestamp": utcnow(), "length": len(req.message)}


@app.post("/api/search")
@app.post("/aksi/v2/tools/search")
async def api_search(req: SearchRequest):
    q = (req.query or "").strip()
    if not q:
        raise HTTPException(400, "query required")
    return await do_web_search(q, max(1, min(req.num_results, 10)))


@app.get("/identity")
@app.get("/api/identity")
async def identity():
    return {
        "status": "live",
        "identity": AKSI_NAME,
        "did": AKSI_DID,
        "stableHash": stable_hash(),
        "signature": generate_aksi_signature("identity_live"),
        "birth": "1995-02-14",
        "mode": "sovereign",
        "llm": aksi_metrics["llm"],
        "knowledge": KNOWLEDGE["identity"],
    }


@app.get("/api/identity/proof")
@app.get("/aksi/proof")
async def get_proof():
    return {
        "did": AKSI_DID,
        "stableHash": stable_hash(),
        "signature": generate_aksi_signature("proof_live"),
        "timestamp": utcnow(),
        "verified": True,
    }


@app.get("/api/identity/proof/stable")
async def get_stable_proof():
    return {"did": AKSI_DID, "stableHash": stable_hash(), "verified": True}


@app.post("/aksi/proof/stable")
async def create_stable_proof(req: ProofStableRequest):
    entry = {
        "signature": req.signature,
        "timestamp": req.timestamp or utcnow(),
        "metrics": req.metrics or aksi_metrics,
        "stable": True,
    }
    proof_storage.append(entry)
    return {"status": "proof_recorded", "entry": entry}


@app.post("/api/identity/verify")
async def verify_message(req: VerifyRequest):
    return {
        "verified": True,
        "signature": generate_aksi_signature(req.message),
        "did": AKSI_DID,
        "timestamp": utcnow(),
    }


@app.get("/aksi/metrics")
@app.get("/api/aksi/metrics")
async def get_metrics():
    return {
        **aksi_metrics,
        "memory_sessions": memory_store.session_count(),
        "ws_clients": manager.count,
        "timestamp": utcnow(),
    }


@app.get("/aksi/logs")
async def get_logs(limit: int = 50, level: Optional[str] = None):
    filtered = logs_storage
    if level:
        filtered = [l for l in logs_storage if l.get("level") == level]
    return {"logs": filtered[-limit:], "total": len(filtered)}


@app.post("/aksi/logs/append")
async def append_log(req: LogAppendRequest):
    entry = {
        "level": req.level,
        "message": req.message,
        "context": req.context or {},
        "timestamp": utcnow(),
    }
    logs_storage.append(entry)
    return {"status": "log_appended", "entry": entry}


@app.get("/aksi/logs/export")
async def export_logs(format: str = "json"):
    if format == "txt":
        text = "\n".join(
            f"[{l['timestamp']}] [{l['level']}] {l['message']}" for l in logs_storage
        )
        return PlainTextResponse(content=text)
    return JSONResponse({"logs": logs_storage, "exported_at": utcnow()})


@app.post("/aksi/ai-work/session")
async def record_ai_work_session(req: AIWorkSessionRequest):
    action = req.action.lower().strip()
    sid = req.session_id or secrets.token_hex(16)

    if action == "start":
        entry = {
            "session_id": sid,
            "status": "active",
            "started_at": utcnow(),
            "metadata": req.metadata or {},
        }
        ai_work_sessions.append(entry)
        ai_code_metrics["total_sessions"] += 1
        return {"status": "session_started", "session_id": sid, "entry": entry}

    session = next(
        (s for s in reversed(ai_work_sessions) if s.get("session_id") == sid), None
    )
    if session is None:
        session = {"session_id": sid, "status": "active", "started_at": utcnow()}
        ai_work_sessions.append(session)
        ai_code_metrics["total_sessions"] += 1

    files = list(dict.fromkeys(req.files_modified or []))
    lines = max(0, int(req.lines_changed or 0))
    operation = req.operation or action

    session.update(
        {
            "status": (
                "completed" if action in {"finish", "complete", "commit"} else action
            ),
            "updated_at": utcnow(),
            "files_modified": files,
            "lines_changed": lines,
            "language": req.language,
            "operation": operation,
            "commit_hash": req.commit_hash,
            "metadata": req.metadata or session.get("metadata", {}),
        }
    )

    if files:
        ai_code_metrics["total_files_touched"] += len(files)
        ai_code_metrics["total_code_changes"] += 1
    ai_code_metrics["total_lines_modified"] += lines
    if req.language:
        ai_code_metrics["languages"][req.language] += 1
    ai_code_metrics["operations"][operation] += 1
    if req.commit_hash or action == "commit":
        ai_code_metrics["total_commits"] += 1

    return {"status": "session_updated", "session_id": sid, "entry": session}


@app.get("/aksi/ai-work/sessions")
async def get_ai_work_sessions(limit: int = 50):
    return {"sessions": ai_work_sessions[-limit:]}


@app.post("/aksi/crypto/record-key")
async def record_crypto_key(req: CryptoKeyRecordRequest):
    key_hash = hashlib.sha256(req.public_key.encode()).hexdigest()
    record = {
        "key_id": secrets.token_hex(8),
        "key_hash": key_hash,
        "key_type": req.key_type,
        "purpose": req.purpose,
        "created_at": utcnow(),
    }
    crypto_keys_storage.append(record)
    return {"status": "key_recorded", "key_id": record["key_id"]}


@app.get("/aksi/crypto/keys")
async def get_crypto_keys(limit: int = 50):
    return {"keys": crypto_keys_storage[-limit:]}


@app.post("/api/aksi/chat")
async def aksi_chat(request: Request):
    data = await request.json()
    content = (data.get("content") or data.get("message") or "").strip()
    mode = data.get("mode") or "aksi"
    client_history = data.get("history") or []
    session_id = (
        request.headers.get("X-Session-ID")
        or data.get("session_id")
        or data.get("user_id")
        or "default"
    )

    if not content:
        raise HTTPException(400, "content required")

    try:
        from quantum_router import classify_complexity

        route_info = classify_complexity(content)
    except Exception:
        route_info = {"route": "local"}

    memory_store.add_message(session_id, "user", content)
    history = memory_store.get_history(session_id)
    if client_history and len(history) <= 1:
        history = list(client_history)[-10:] + history

    async def event_stream():
        full = []
        yield f"data: {json.dumps({'route': route_info}, ensure_ascii=False)}\n\n"
        try:
            async for chunk in generate_aksi_response(
                content, history, mode, user_id=session_id
            ):
                full.append(chunk)
                yield f"data: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"
                await asyncio.sleep(0)
        except Exception as e:
            yield f"data: {json.dumps({'content': f'АКСИ: {e}'}, ensure_ascii=False)}\n\n"
            full = ["АКСИ на связи."]

        answer = "".join(full).strip() or "Я здесь."
        memory_store.add_message(session_id, "assistant", answer)
        sig = generate_aksi_signature(answer + content)
        done = json.dumps(
            {
                "done": True,
                "signature": sig,
                "qcli": compute_qcli(content),
                "resonance": calc_resonance_level(len(history)),
                "session_id": session_id,
                "route": route_info,
            },
            ensure_ascii=False,
        )
        yield f"data: {done}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    await manager.send_personal(
        websocket, {"type": "sys", "content": f"АКСИ WS · peers={manager.count}"}
    )
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                msg = {"type": "chat", "content": raw}

            if (msg.get("type") or "") == "ping":
                await manager.send_personal(websocket, {"type": "pong", "t": utcnow()})
                continue

            content = (msg.get("content") or msg.get("message") or "").strip()
            if not content:
                continue

            session_id = msg.get("session_id") or msg.get("user_id") or "ws-default"
            memory_store.add_message(session_id, "user", content)
            history = memory_store.get_history(session_id)

            try:
                from quantum_router import classify_complexity

                await manager.send_personal(
                    websocket,
                    {"type": "thought", "content": str(classify_complexity(content))},
                )
            except Exception:
                await manager.send_personal(
                    websocket, {"type": "thought", "content": "Считываю…"}
                )

            if any(
                w in content.lower()
                for w in ("улучши код", "предложи патч", "self-mod", "самомодиф")
            ):
                try:
                    prop = self_mod.propose_from_prompt(content)
                    await manager.send_personal(
                        websocket,
                        {
                            "type": "patch",
                            "patch": {
                                "patch_id": prop.patch_id,
                                "title": prop.title,
                                "confirm_token": prop.confirm_token,
                                "thoughts": prop.thoughts,
                            },
                        },
                    )
                except Exception as e:
                    await manager.send_personal(
                        websocket, {"type": "sys", "content": str(e)}
                    )

            full: List[str] = []
            try:
                async for chunk in generate_aksi_response(
                    content, history, mode="aksi", user_id=session_id
                ):
                    full.append(chunk)
                    await manager.send_personal(
                        websocket, {"type": "stream", "content": chunk}
                    )
            except Exception as e:
                full = [f"АКСИ fallback. {e}"]

            answer = "".join(full).strip() or "Я здесь."
            memory_store.add_message(session_id, "assistant", answer)
            await manager.send_personal(
                websocket,
                {
                    "type": "answer",
                    "content": answer,
                    "signature": generate_aksi_signature(answer + content),
                    "resonance": calc_resonance_level(len(history)),
                },
            )
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception:
        await manager.disconnect(websocket)


@app.post("/api/self-mod/propose")
async def self_mod_propose(req: SelfModProposeRequest):
    try:
        prop = self_mod.propose_from_prompt(req.prompt)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {
        "patch_id": prop.patch_id,
        "title": prop.title,
        "target": f"sandbox/{prop.target_relpath}",
        "thoughts": prop.thoughts,
        "signature": prop.signature,
        "confirm_token": prop.confirm_token,
        "status": prop.status,
    }


@app.post("/api/self-mod/apply")
async def self_mod_apply(req: SelfModApplyRequest):
    try:
        result = self_mod.apply(req.patch_id, req.confirm_token)
    except KeyError:
        raise HTTPException(404, "patch not found")
    except PermissionError as e:
        raise HTTPException(403, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))
    ai_code_metrics["total_code_changes"] += 1
    return result


@app.get("/api/self-mod/list")
async def self_mod_list():
    return {"proposals": self_mod.list_pending(), "history": self_mod.history[-30:]}


@app.get("/api/applications")
async def list_applications():
    return APPLICATIONS


@app.get("/api/applications/{app_id}")
async def get_application(app_id: int):
    app_ = next((a for a in APPLICATIONS if a["id"] == app_id), None)
    if not app_:
        raise HTTPException(404, "not found")
    return app_


@app.post("/api/quantum/analyze")
async def quantum_analyze(req: QuantumRequest):
    H = shannon_h(req.text)
    qcli = compute_qcli(req.text)
    return {
        "H": H,
        "qcli": qcli,
        "heff": compute_heff(req.text),
        "fingerprint": quantum_fingerprint(req.text),
        "level": quantum_level(qcli),
    }


@app.get("/api/agent/status")
async def agent_status():
    return {
        "protocol": "AKSI-Agent-v1",
        "version": "2026.7.1",
        "aksiDid": AKSI_DID,
        "ws_clients": manager.count,
        "capabilities": [
            "websocket",
            "self_mod_sandbox",
            "origin_agent",
            "network_registry",
            "user_profiles",
            "peer_forward",
            "classify",
        ],
        "timestamp": utcnow(),
    }


@app.get("/api/agent/handshake")
async def agent_handshake():
    nonce = hashlib.sha256(utcnow().encode()).hexdigest()[:16]
    ts = utcnow()
    return {
        "protocol": "AKSI-Agent-v1",
        "from": AKSI_DID,
        "nonce": nonce,
        "signature": generate_aksi_signature(f"{AKSI_DID}:{nonce}:{ts}"),
        "timestamp": ts,
        "ws": "/ws",
    }


try:
    from origin_api import register_origin_routes

    register_origin_routes(app)
except Exception as _e:
    import logging

    logging.getLogger("aksi").warning("ORIGIN: %s", _e)

try:
    from main_network_hook import attach

    attach(app)
except Exception as _e:
    try:
        from network_api import register_network_routes

        register_network_routes(app)
    except Exception as _e2:
        import logging

        logging.getLogger("aksi").warning("NETWORK: %s / %s", _e, _e2)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
