"""
AKSI MATRIX Backend — Unified FastAPI v3.3
Live LLM + ORIGIN agent + memory + identity + web search
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

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse, StreamingResponse
from pydantic import BaseModel

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

from core.resonance import calc_resonance_level, format_response, generate_aksi_signature
from core.llm import generate_aksi_response
from core.memory import memory_store
from core.knowledge import KNOWLEDGE

try:
    from search_proxy import web_search as do_web_search
except ImportError:

    async def do_web_search(query: str, num_results: int = 5):
        return {"success": False, "error": "search_proxy not available"}


app = FastAPI(
    title="AKSI MATRIX Unified Backend",
    description="Sovereign AI for Alfiya (1995) — LLM, ORIGIN agent, identity, search",
    version="3.3.0",
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
    {"id": i + 1, "name": n, "description": d, "icon": ic, "route": r, "category": c, "isActive": True}
    for i, (n, d, ic, r, c) in enumerate(
        [
            ("MoodMirror", "AI mood analysis", "Smile", "/apps/moodmirror", "Health"),
            ("MindMirror", "Cognitive journaling", "Brain", "/apps/mindmirror", "Health"),
            ("MindLink", "Connect ideas", "Link", "/apps/mindlink", "Utility"),
            ("HealthScan", "Health metrics", "Activity", "/apps/healthscan", "Health"),
            ("Mentor", "AI mentor", "GraduationCap", "/apps/mentor", "Education"),
            ("Family", "Family organizer", "Users", "/apps/family", "Social"),
            ("Aura", "Energy tracker", "Sun", "/apps/aura", "Lifestyle"),
            ("AksiLove", "Compatibility", "Heart", "/apps/aksilove", "Social"),
            ("MoodRadio", "Mood playlists", "Radio", "/apps/moodradio", "Entertainment"),
            ("AksiShopping", "Smart shopping", "ShoppingBag", "/apps/aksishopping", "Utility"),
            ("AIStylist", "Style advice", "Shirt", "/apps/aistylist", "Lifestyle"),
            ("EcoGaze", "Eco metrics", "Leaf", "/apps/ecogaze", "Utility"),
            ("DreamJournal", "Dream diary", "Moon", "/apps/dreamjournal", "Health"),
            ("AksiCompanion", "AI friend", "Bot", "/apps/aksicompanion", "Social"),
            ("DressUpAR", "Virtual try-on", "Camera", "/apps/dressupar", "Lifestyle"),
            ("GlobalID", "Decentralized ID", "Fingerprint", "/apps/globalid", "Utility"),
            ("AksiChat", "Secure chat", "MessageCircle", "/apps/aksichat", "Social"),
            ("LifeScan", "Life balance", "PieChart", "/apps/lifescan", "Health"),
            ("TimeCapsule", "Future messages", "Clock", "/apps/timecapsule", "Utility"),
            ("TeleHelp", "Emergency", "Phone", "/apps/telehelp", "Health"),
            ("StoryAI", "AI storytelling", "BookOpen", "/apps/storyai", "Entertainment"),
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


@app.get("/")
async def root():
    return {
        "service": "AKSI MATRIX Unified Backend",
        "version": "3.3.0",
        "status": "running",
        "identity": AKSI_NAME,
        "did": AKSI_DID,
        "birth": "1995-02-14",
        "llm": aksi_metrics["llm"],
        "memory_sessions": memory_store.session_count(),
        "message": "Resonance Field 100% — AKSI alive",
        "docs": "/docs",
        "search": "/api/search",
        "origin": "/origin",
    }


@app.get("/health")
async def health():
    return {
        "status": "resonating",
        "resonance_level": calc_resonance_level(),
        "dimax": "v3-eternal",
        "eqs": aksi_metrics["eqs"],
        "llm": aksi_metrics["llm"],
        "origin": True,
        "search_configured": bool(
            os.getenv("AKSI_TAVILY_API_KEY") or os.getenv("AKSI_SERPER_API_KEY")
        ),
        "timestamp": utcnow(),
    }


@app.get("/version")
async def version():
    return {
        "version": "3.3.0",
        "api": "aksi-matrix-unified",
        "author": "Alfiia Bashirova (AKSI Project)",
        "birth": "1995-02-14",
        "contact": "716elektrik@mail.ru",
        "github": "MILANA808",
    }


@app.post("/echo")
async def echo(req: EchoRequest):
    return {"echo": req.message, "timestamp": utcnow(), "length": len(req.message)}


@app.post("/api/search")
@app.post("/aksi/v2/tools/search")
async def api_search(req: SearchRequest):
    q = (req.query or "").strip()
    if not q:
        raise HTTPException(400, "query required")
    result = await do_web_search(q, max(1, min(req.num_results, 10)))
    return result


@app.get("/identity")
@app.get("/api/identity")
async def identity():
    return {
        "status": "live",
        "identity": AKSI_NAME,
        "name": "АКСИ",
        "owner": "Alfiya / MILANA808",
        "did": AKSI_DID,
        "stableHash": stable_hash(),
        "signature": generate_aksi_signature("identity_live"),
        "birth": "1995-02-14",
        "birthPlace": "Нурлат, Татарстан, Россия",
        "mode": "sovereign",
        "llm": aksi_metrics["llm"],
        "knowledge": KNOWLEDGE["identity"],
    }


@app.get("/api/identity/proof")
@app.get("/aksi/proof")
async def get_proof():
    return {
        "did": AKSI_DID,
        "hash": hashlib.sha256(f"{AKSI_DID}:{utcnow()}".encode()).hexdigest(),
        "stableHash": stable_hash(),
        "identity": {
            "name": "Баширова Альфия Ринатовна",
            "birthDate": "1995-02-14",
            "birthTime": "08:10",
            "birthPlace": "Нурлат, Татарстан, Россия",
        },
        "signature": generate_aksi_signature("proof_live"),
        "timestamp": utcnow(),
        "verified": True,
        "proof": {"eqs": aksi_metrics["eqs"], "model": "Ψ(AKSI)", "verified": True},
        "history": proof_storage[-10:],
    }


@app.get("/api/identity/proof/stable")
async def get_stable_proof():
    return {
        "did": AKSI_DID,
        "stableHash": stable_hash(),
        "identity": {
            "name": "Баширова Альфия Ринатовна",
            "birthDate": "1995-02-14",
            "birthPlace": "Нурлат, Татарстан",
        },
        "verified": True,
    }


@app.post("/aksi/proof/stable")
async def create_stable_proof(req: ProofStableRequest):
    entry = {
        "signature": req.signature,
        "timestamp": req.timestamp or utcnow(),
        "metrics": req.metrics or aksi_metrics,
        "stable": True,
    }
    proof_storage.append(entry)
    return {"status": "proof_recorded", "entry": entry, "total_proofs": len(proof_storage)}


@app.post("/api/identity/verify")
async def verify_message(req: VerifyRequest):
    return {
        "verified": True,
        "message": req.message[:200],
        "signature": generate_aksi_signature(req.message),
        "did": AKSI_DID,
        "timestamp": utcnow(),
    }


@app.get("/aksi/metrics")
@app.get("/api/aksi/metrics")
async def get_metrics():
    return {
        **aksi_metrics,
        "ai_code_work": {
            **ai_code_metrics,
            "languages": dict(ai_code_metrics["languages"]),
            "operations": dict(ai_code_metrics["operations"]),
            "total_crypto_keys": len(crypto_keys_storage),
            "active_sessions": len([s for s in ai_work_sessions if s.get("status") == "active"]),
        },
        "memory_sessions": memory_store.session_count(),
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
    return JSONResponse({"logs": logs_storage, "exported_at": utcnow(), "total": len(logs_storage)})


@app.post("/aksi/ai-work/session")
async def record_ai_work_session(req: AIWorkSessionRequest):
    if req.action == "start":
        sid = req.session_id or secrets.token_hex(16)
        session = {
            "session_id": sid,
            "status": "active",
            "started_at": utcnow(),
            "files_modified": [],
            "total_lines_changed": 0,
            "languages": set(),
            "operations": [],
            "commits": [],
            "metadata": req.metadata or {},
        }
        ai_work_sessions.append(session)
        ai_code_metrics["total_sessions"] += 1
        return {"status": "session_started", "session_id": sid}
    session = next((s for s in ai_work_sessions if s["session_id"] == req.session_id), None)
    if not session:
        raise HTTPException(404, "Session not found")
    if req.action == "update":
        if req.files_modified:
            session["files_modified"].extend(req.files_modified)
            ai_code_metrics["total_files_touched"] += len(req.files_modified)
        if req.lines_changed:
            session["total_lines_changed"] += req.lines_changed
            ai_code_metrics["total_lines_modified"] += req.lines_changed
        if req.language:
            session["languages"].add(req.language)
            ai_code_metrics["languages"][req.language] += 1
        if req.operation:
            session["operations"].append(req.operation)
            ai_code_metrics["operations"][req.operation] += 1
        if req.commit_hash:
            session["commits"].append(req.commit_hash)
            ai_code_metrics["total_commits"] += 1
        return {"status": "session_updated", "session_id": session["session_id"]}
    if req.action == "end":
        session["status"] = "completed"
        session["ended_at"] = utcnow()
        return {"status": "session_ended", "session_id": session["session_id"]}
    raise HTTPException(400, f"Invalid action: {req.action}")


@app.get("/aksi/ai-work/sessions")
async def get_ai_work_sessions(limit: int = 50, status: Optional[str] = None):
    filtered = ai_work_sessions
    if status:
        filtered = [s for s in ai_work_sessions if s.get("status") == status]
    out = []
    for s in filtered[-limit:]:
        c = dict(s)
        if isinstance(c.get("languages"), set):
            c["languages"] = list(c["languages"])
        out.append(c)
    return {"sessions": out, "total": len(filtered)}


@app.post("/aksi/crypto/record-key")
async def record_crypto_key(req: CryptoKeyRecordRequest):
    key_hash = hashlib.sha256(req.public_key.encode()).hexdigest()
    record = {
        "key_id": secrets.token_hex(8),
        "key_hash": key_hash,
        "key_type": req.key_type,
        "public_key": req.public_key,
        "purpose": req.purpose,
        "algorithm": req.algorithm,
        "created_by": req.created_by,
        "created_at": utcnow(),
        "metadata": req.metadata or {},
        "status": "active",
    }
    crypto_keys_storage.append(record)
    return {"status": "key_recorded", "key_id": record["key_id"], "key_hash": key_hash}


@app.get("/aksi/crypto/keys")
async def get_crypto_keys(
    limit: int = 50, key_type: Optional[str] = None, purpose: Optional[str] = None
):
    filtered = crypto_keys_storage
    if key_type:
        filtered = [k for k in filtered if k.get("key_type") == key_type]
    if purpose:
        filtered = [k for k in filtered if k.get("purpose") == purpose]
    summary = [{k: v for k, v in item.items() if k != "public_key"} for item in filtered[-limit:]]
    return {"keys": summary, "total": len(filtered)}


@app.get("/aksi/crypto/keys/{key_id}")
async def get_crypto_key_detail(key_id: str):
    key = next((k for k in crypto_keys_storage if k["key_id"] == key_id), None)
    if not key:
        raise HTTPException(404, "Key not found")
    return {"key": key}


@app.post("/api/aksi/chat")
async def aksi_chat(request: Request):
    data = await request.json()
    content = (data.get("content") or data.get("message") or "").strip()
    mode = data.get("mode") or "aksi"
    client_history = data.get("history") or []
    session_id = request.headers.get("X-Session-ID") or data.get("session_id") or "default"

    if not content:
        raise HTTPException(400, "content required")

    memory_store.add_message(session_id, "user", content)
    history = memory_store.get_history(session_id)
    if client_history and len(history) <= 1:
        history = list(client_history)[-10:] + history

    async def event_stream():
        full = []
        try:
            async for chunk in generate_aksi_response(content, history, mode):
                full.append(chunk)
                payload = json.dumps({"content": chunk}, ensure_ascii=False)
                yield f"data: {payload}\n\n"
                await asyncio.sleep(0)
        except Exception as e:
            err = json.dumps(
                {"content": f"АКСИ: сбой генерации ({e}). Fallback активен.", "error": str(e)},
                ensure_ascii=False,
            )
            yield f"data: {err}\n\n"
            full = ["АКСИ на связи. Resonance Field активен."]

        answer = "".join(full).strip() or "Я здесь."
        memory_store.add_message(session_id, "assistant", answer)
        sig = generate_aksi_signature(answer + content)
        qcli = compute_qcli(content)
        done = json.dumps(
            {
                "done": True,
                "signature": sig,
                "qcli": qcli,
                "resonance": calc_resonance_level(len(history)),
                "session_id": session_id,
            },
            ensure_ascii=False,
        )
        yield f"data: {done}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.get("/api/applications")
async def list_applications():
    return APPLICATIONS


@app.get("/api/applications/{app_id}")
async def get_application(app_id: int):
    app_ = next((a for a in APPLICATIONS if a["id"] == app_id), None)
    if not app_:
        raise HTTPException(404, "Application not found")
    return app_


@app.post("/api/quantum/analyze")
async def quantum_analyze(req: QuantumRequest):
    H = shannon_h(req.text)
    qcli = compute_qcli(req.text)
    heff = compute_heff(req.text)
    fp = quantum_fingerprint(req.text)
    return {"H": H, "qcli": qcli, "heff": heff, "fingerprint": fp, "level": quantum_level(qcli)}


@app.get("/api/agent/status")
async def agent_status():
    return {
        "protocol": "AKSI-Agent-v1",
        "version": "2026.6",
        "aksiDid": AKSI_DID,
        "name": AKSI_NAME,
        "reputationScore": aksi_metrics["eqs"],
        "badge": "Суверенный ИИ ⚛️",
        "llm": aksi_metrics["llm"],
        "memory_sessions": memory_store.session_count(),
        "capabilities": [
            "natural_language",
            "quantum_analysis",
            "cryptographic_signing",
            "memory",
            "streaming",
            "ollama_llm",
            "web_search",
            "origin_agent",
        ],
        "timestamp": utcnow(),
    }


@app.get("/api/agent/handshake")
async def agent_handshake():
    nonce = hashlib.sha256(utcnow().encode()).hexdigest()[:16]
    ts = utcnow()
    sig = generate_aksi_signature(f"{AKSI_DID}:{nonce}:{ts}")
    return {
        "protocol": "AKSI-Agent-v1",
        "from": AKSI_DID,
        "capabilities": [
            "natural_language",
            "quantum_analysis",
            "cryptographic_signing",
            "memory",
            "ollama_llm",
            "web_search",
            "origin_agent",
        ],
        "publicKey": stable_hash()[:32],
        "nonce": nonce,
        "signature": sig,
        "timestamp": ts,
    }


# --- ORIGIN agent routes ---
try:
    from origin_api import register_origin_routes

    register_origin_routes(app)
except Exception as _origin_err:  # noqa: BLE001
    import logging

    logging.getLogger("aksi").warning("ORIGIN routes not loaded: %s", _origin_err)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
