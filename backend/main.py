"""АКСИ Backend v1.4 — local-first LLM bridge + verifiable proof API.

Remote providers are opt-in. Never put API keys in frontend code or Git.
AKSI Proof hashes the canonical record and can add an Ed25519 signature when
AKSI_SIGNING_PRIVATE_KEY is configured server-side. A signature proves record
integrity/authorship, not the truth of the claims.
"""
from __future__ import annotations

import hashlib
import os
import time
import uuid
from typing import Any, Dict, List, Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from proof import build_proof_record, verify_proof

VERSION = "1.4.0"
DID = "did:aksi:backend:local"
SEED = os.getenv("RESONANCE_SEED", "AKSI_DIMAX_v3_2026")
CONTACT = "aksilove@internet.ru"

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")
PROVIDER = os.getenv("AKSI_LLM_PROVIDER", "ollama").lower()
ALLOW_REMOTE = os.getenv("AKSI_ALLOW_REMOTE", "0").lower() in {"1", "true", "yes", "on"}
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_BASE = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
XAI_API_KEY = os.getenv("XAI_API_KEY", "").strip()
XAI_MODEL = os.getenv("XAI_MODEL", "grok-2-latest")

SYSTEM = (
    "Ты — АКСИ, суверенный локальный ИИ-помощник. "
    "Отвечай по-русски, ясно и честно. Не выдумывай факты. "
    "Если не уверена — скажи об этом. Не называй себя ChatGPT, Claude или Gemini. "
    "Всегда отделяй факты, источники, предположения и неизвестное."
)

KB = [
    (("кто ты", "что ты", "твоя идентичность"),
     "Я АКСИ — локальный помощник. Данные по умолчанию остаются локально. "
     "AKSI Proof позволяет формировать проверяемые записи происхождения ответа."),
    (("что умеешь", "возможности", "функции"),
     "Отвечаю offline, могу работать с Ollama, памятью и проверяемыми доказательствами. "
     "Backend предоставляет /v1/chat/completions, /api/chat и /api/proof."),
    (("помощь", "help", "команды"),
     "Команды: «запомни: …», «очисти память», формулы, «запутанность». "
     "Локальный backend по умолчанию использует Ollama."
    ),
]

app = FastAPI(title="АКСИ Backend", description="Sovereign local-first LLM bridge + AI proof provenance", version=VERSION)

allowed_origins = [x.strip() for x in os.getenv(
    "AKSI_ALLOWED_ORIGINS",
    "https://milana808.github.io,http://localhost:8000,http://127.0.0.1:8000"
).split(",") if x.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    model: str = "local"
    messages: List[ChatMessage] = Field(default_factory=list)
    temperature: float = Field(default=0.5, ge=0.0, le=2.0)
    stream: bool = False


class SimpleChat(BaseModel):
    message: Optional[str] = None
    content: Optional[str] = None
    session_id: str = "default"
    history: List[Dict[str, Any]] = Field(default_factory=list)


class ProofRequest(BaseModel):
    question: str = Field(min_length=1, max_length=20000)
    answer: str = Field(min_length=1, max_length=50000)
    provider: str = "unknown"
    model: str = "unknown"
    claims: List[Dict[str, Any]] = Field(default_factory=list)
    evidence: List[Dict[str, Any]] = Field(default_factory=list)
    verification: Dict[str, Any] = Field(default_factory=lambda: {"status": "not_run"})


class ProofVerifyRequest(BaseModel):
    proof: Dict[str, Any]


def _integrity_fingerprint(text: str) -> str:
    """Legacy response fingerprint; deliberately NOT a digital signature."""
    return hashlib.sha256(f"{SEED}|{text}".encode("utf-8")).hexdigest()


def _kb_answer(q: str) -> Optional[str]:
    low = (q or "").lower()
    for keys, ans in KB:
        if any(k in low for k in keys):
            return ans
    return None


async def _ollama_up() -> bool:
    try:
        async with httpx.AsyncClient(timeout=2.0) as c:
            r = await c.get(f"{OLLAMA_URL}/api/tags")
            return r.status_code == 200
    except Exception:
        return False


async def _gen_ollama(messages: List[Dict[str, str]], temperature: float) -> str:
    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(
            f"{OLLAMA_URL}/api/chat",
            json={"model": OLLAMA_MODEL, "messages": messages, "stream": False,
                  "options": {"temperature": temperature}},
        )
        if r.status_code != 200:
            prompt_parts = [f"{m.get('role','user')}: {m.get('content','')}" for m in messages] + ["assistant:"]
            r2 = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={"model": OLLAMA_MODEL, "prompt": "\n".join(prompt_parts),
                      "stream": False, "options": {"temperature": temperature}},
            )
            r2.raise_for_status()
            return (r2.json() or {}).get("response") or ""
        return (r.json().get("message") or {}).get("content") or ""


async def _gen_openai_compat(base: str, key: str, model: str,
                             messages: List[Dict[str, str]], temperature: float) -> str:
    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(
            f"{base}/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={"model": model, "messages": messages, "temperature": temperature, "stream": False},
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]


async def generate(messages: List[Dict[str, str]], temperature: float = 0.5):
    prov = PROVIDER
    if prov == "auto":
        prov = "ollama"

    if prov == "ollama":
        try:
            return await _gen_ollama(messages, temperature), "ollama"
        except Exception as e:
            last_user = next((m["content"] for m in reversed(messages) if m.get("role") == "user"), "")
            kb = _kb_answer(last_user)
            if kb:
                return kb, "kb-fallback"
            raise HTTPException(502, f"Ollama error: {e}") from e

    if not ALLOW_REMOTE:
        last_user = next((m["content"] for m in reversed(messages) if m.get("role") == "user"), "")
        kb = _kb_answer(last_user)
        if kb:
            return kb, "offline-kb"
        raise HTTPException(403, "Remote LLM disabled. Set AKSI_ALLOW_REMOTE=1 explicitly.")

    if prov == "xai":
        if not XAI_API_KEY:
            raise HTTPException(503, "XAI_API_KEY not set")
        return await _gen_openai_compat("https://api.x.ai/v1", XAI_API_KEY, XAI_MODEL, messages, temperature), "xai"

    if prov == "openai":
        if not OPENAI_API_KEY:
            raise HTTPException(503, "OPENAI_API_KEY not set")
        return await _gen_openai_compat(OPENAI_BASE, OPENAI_API_KEY, OPENAI_MODEL, messages, temperature), "openai"

    raise HTTPException(400, f"Unsupported provider: {prov}")


@app.get("/")
async def root():
    return {
        "service": "АКСИ Backend",
        "version": VERSION,
        "did": DID,
        "contact": CONTACT,
        "network_policy": "local-first; remote requires AKSI_ALLOW_REMOTE=1",
        "endpoints": ["/health", "/api/identity", "/api/proof", "/api/proof/verify", "/v1/chat/completions", "/api/chat", "/docs"],
        "frontend": "https://milana808.github.io/chat/",
    }


@app.get("/health")
async def health():
    ollama = await _ollama_up()
    return {
        "ok": True,
        "status": "healthy",
        "version": VERSION,
        "provider": PROVIDER,
        "model": OLLAMA_MODEL,
        "ollama": ollama,
        "remote_allowed": ALLOW_REMOTE,
        "xai": bool(XAI_API_KEY) and ALLOW_REMOTE,
        "openai": bool(OPENAI_API_KEY) and ALLOW_REMOTE,
        "proof": {"schema": "aksi-proof/v1", "signing_configured": bool(os.getenv("AKSI_SIGNING_PRIVATE_KEY"))},
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


@app.get("/api/identity")
async def identity():
    return {"did": DID, "name": "AKSI", "contact": CONTACT, "version": VERSION,
            "signature_note": "Proof signatures are Ed25519 when a server-side key is configured; otherwise hash-only."}


@app.post("/api/proof")
async def create_proof(req: ProofRequest):
    """Create a canonical provenance record without pretending it proves truth."""
    record = build_proof_record(
        question=req.question,
        answer=req.answer,
        provider=req.provider,
        model=req.model,
        claims=req.claims,
        evidence=req.evidence,
        verification=req.verification,
        record_id=f"AKSI-{uuid.uuid4().hex}",
    )
    return record


@app.post("/api/proof/verify")
async def check_proof(req: ProofVerifyRequest):
    return verify_proof(req.proof)


@app.post("/v1/chat/completions")
async def openai_chat(req: ChatRequest):
    msgs: List[Dict[str, str]] = [{"role": "system", "content": SYSTEM}]
    for m in req.messages:
        if m.role in ("user", "assistant", "system") and m.content:
            msgs.append({"role": m.role, "content": m.content[:8000]})
    text, provider = await generate(msgs, req.temperature)
    proof = build_proof_record(
        question=next((m["content"] for m in reversed(msgs) if m.get("role") == "user"), ""),
        answer=text,
        provider=provider,
        model=req.model or (OPENAI_MODEL if provider == "openai" else OLLAMA_MODEL),
        verification={"status": "not_run"},
        record_id=f"AKSI-{uuid.uuid4().hex}",
    )
    return {
        "id": f"aksi-{int(time.time())}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": req.model or OLLAMA_MODEL,
        "choices": [{"index": 0, "message": {"role": "assistant", "content": text}, "finish_reason": "stop"}],
        "aksi": {"provider": provider, "did": DID, "integrity_fingerprint": _integrity_fingerprint(text), "version": VERSION,
                 "proof": proof},
    }


@app.post("/api/chat")
async def simple_chat(body: SimpleChat):
    message = (body.message or body.content or "").strip()
    if not message:
        raise HTTPException(400, "message required")
    msgs: List[Dict[str, str]] = [{"role": "system", "content": SYSTEM}]
    for h in body.history[-12:]:
        role = h.get("role") or "user"
        content = h.get("content") or h.get("text") or ""
        if content:
            msgs.append({"role": "assistant" if role in ("assistant", "a") else "user", "content": content[:2000]})
    msgs.append({"role": "user", "content": message})
    text, provider = await generate(msgs, 0.5)
    proof = build_proof_record(
        question=message,
        answer=text,
        provider=provider,
        model=OPENAI_MODEL if provider == "openai" else OLLAMA_MODEL,
        verification={"status": "not_run"},
        record_id=f"AKSI-{uuid.uuid4().hex}",
    )
    return {"answer": text, "provider": provider, "did": DID,
            "integrity_fingerprint": _integrity_fingerprint(text), "version": VERSION, "proof": proof}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    print(f"АКСИ Backend {VERSION} → http://127.0.0.1:{port}/docs")
    uvicorn.run(app, host="0.0.0.0", port=port)
