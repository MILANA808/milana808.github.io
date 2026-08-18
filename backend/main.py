"""
АКСИ Backend v1.2 — локальный мост к LLM (Ollama / xAI / OpenAI).

Запуск:
  pip install fastapi uvicorn httpx pydantic
  ollama pull qwen2.5:3b && ollama serve
  python main.py

Эндпоинты:
  GET  /health
  GET  /api/identity
  POST /v1/chat/completions
  POST /api/chat
  GET  /docs
"""
from __future__ import annotations

import hashlib
import os
import time
from typing import Any, Dict, List, Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

VERSION = "1.2.0"
DID = "did:aksi:ed25519:sovereign-2026"
SEED = os.getenv("RESONANCE_SEED", "AKSI_DIMAX_v3_2026")
CONTACT = "aksilove@internet.ru"

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")
PROVIDER = os.getenv("AKSI_LLM_PROVIDER", "auto")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_BASE = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
XAI_API_KEY = os.getenv("XAI_API_KEY", "").strip()
XAI_MODEL = os.getenv("XAI_MODEL", "grok-2-latest")

SYSTEM = (
    "Ты — АКСИ, суверенный локальный ИИ-помощник. "
    "Отвечай по-русски, ясно и честно. Не выдумывай факты. "
    "Если не уверена — скажи об этом. Не называй себя ChatGPT, Claude или Gemini."
)

KB = [
    (
        ("кто ты", "что ты", "твоя идентичность"),
        "Я АКСИ — суверенный помощник. DID: did:aksi:ed25519:sovereign-2026. "
        "Работаю локально: данные по умолчанию остаются у вас. Контакт: aksilove@internet.ru",
    ),
    (
        ("что умеешь", "возможности", "функции"),
        "Отвечаю offline, помню факты, считаю, объясняю квантовые состояния, "
        "подписываю ответы. С Ollama — полноценный LLM. Backend: /v1/chat/completions.",
    ),
    (
        ("помощь", "help", "команды"),
        "Команды: «запомни: …», «очисти память», формулы, «запутанность». "
        "Включите LLM в настройках чата: http://127.0.0.1:8000",
    ),
]

app = FastAPI(title="АКСИ Backend", description="Sovereign local LLM bridge", version=VERSION)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    model: str = "local"
    messages: List[ChatMessage] = Field(default_factory=list)
    temperature: float = 0.5
    stream: bool = False


class SimpleChat(BaseModel):
    message: Optional[str] = None
    content: Optional[str] = None
    session_id: str = "default"
    history: List[Dict[str, Any]] = Field(default_factory=list)


def _sign(text: str) -> str:
    return hashlib.sha256(f"{SEED}|{text}".encode("utf-8")).hexdigest()[:32]


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
            json={"model": OLLAMA_MODEL, "messages": messages, "stream": False, "options": {"temperature": temperature}},
        )
        if r.status_code != 200:
            prompt_parts = [f"{m.get('role','user')}: {m.get('content','')}" for m in messages] + ["assistant:"]
            r2 = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={"model": OLLAMA_MODEL, "prompt": "\n".join(prompt_parts), "stream": False, "options": {"temperature": temperature}},
            )
            r2.raise_for_status()
            return (r2.json() or {}).get("response") or ""
        return (r.json().get("message") or {}).get("content") or ""


async def _gen_openai_compat(base: str, key: str, model: str, messages: List[Dict[str, str]], temperature: float) -> str:
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
        if await _ollama_up():
            prov = "ollama"
        elif XAI_API_KEY:
            prov = "xai"
        elif OPENAI_API_KEY:
            prov = "openai"
        else:
            prov = "offline"

    if prov == "ollama":
        try:
            return await _gen_ollama(messages, temperature), "ollama"
        except Exception as e:
            last_user = next((m["content"] for m in reversed(messages) if m.get("role") == "user"), "")
            kb = _kb_answer(last_user)
            if kb:
                return kb, "kb-fallback"
            raise HTTPException(502, f"Ollama error: {e}") from e

    if prov == "xai":
        if not XAI_API_KEY:
            raise HTTPException(503, "XAI_API_KEY not set")
        return await _gen_openai_compat("https://api.x.ai/v1", XAI_API_KEY, XAI_MODEL, messages, temperature), "xai"

    if prov == "openai":
        if not OPENAI_API_KEY:
            raise HTTPException(503, "OPENAI_API_KEY not set")
        return await _gen_openai_compat(OPENAI_BASE, OPENAI_API_KEY, OPENAI_MODEL, messages, temperature), "openai"

    last_user = next((m["content"] for m in reversed(messages) if m.get("role") == "user"), "")
    kb = _kb_answer(last_user)
    if kb:
        return kb, "offline-kb"
    return (
        f"Локальная LLM недоступна. Установите Ollama, выполните `ollama pull {OLLAMA_MODEL}` и `ollama serve`.",
        "offline",
    )


@app.get("/")
async def root():
    return {
        "service": "АКСИ Backend",
        "version": VERSION,
        "did": DID,
        "contact": CONTACT,
        "endpoints": ["/health", "/api/identity", "/v1/chat/completions", "/api/chat", "/docs"],
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
        "ollama_url": OLLAMA_URL,
        "xai": bool(XAI_API_KEY),
        "openai": bool(OPENAI_API_KEY),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


@app.get("/api/identity")
async def identity():
    return {"did": DID, "name": "AKSI", "contact": CONTACT, "version": VERSION}


@app.post("/v1/chat/completions")
async def openai_chat(req: ChatRequest):
    msgs: List[Dict[str, str]] = [{"role": "system", "content": SYSTEM}]
    for m in req.messages:
        if m.role in ("user", "assistant", "system") and m.content:
            msgs.append({"role": m.role, "content": m.content[:8000]})
    text, provider = await generate(msgs, req.temperature)
    return {
        "id": f"aksi-{int(time.time())}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": req.model or OLLAMA_MODEL,
        "choices": [{"index": 0, "message": {"role": "assistant", "content": text}, "finish_reason": "stop"}],
        "aksi": {"provider": provider, "did": DID, "signature": _sign(text), "version": VERSION},
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
    return {"answer": text, "provider": provider, "did": DID, "signature": _sign(text), "version": VERSION}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    print(f"АКСИ Backend {VERSION} → http://127.0.0.1:{port}/docs")
    uvicorn.run(app, host="0.0.0.0", port=port)
