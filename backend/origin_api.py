"""
ORIGIN agent — живой эндпоинт «источника правды» АКСИ
Принимает prompt → thought chain + answer + signatures
"""
from __future__ import annotations

import asyncio
import json
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from core.knowledge import build_thought_chain, build_context_snippet, match_knowledge
from core.llm import generate_aksi_response
from core.resonance import (
    calc_resonance_level,
    format_response,
    generate_aksi_signature,
    sign_thought,
)
from core.memory import memory_store

ORIGIN_CONTEXT = """Ты отвечаешь как ORIGIN-агент АКСИ — хранитель карты экосистемы.
Знаешь: milana808.github.io (MATRIX), Milana-backend/aksi (агент), aksi-globe (Globe),
формулы AKSI=(A×I×S)×(1+γ√n), Resonance, DIMAX v3, DID, RESONANCE_SEED.
Отвечай на русском, с ходом мыслей и подписями."""


class OriginRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    history: Optional[List[Dict[str, str]]] = None
    session_id: Optional[str] = None
    mode: str = "origin"


async def _collect_origin_answer(
    prompt: str,
    history: List[Dict[str, str]],
    mode: str,
) -> Dict[str, Any]:
    """Non-stream: full answer + structured thoughts."""
    # Prefer knowledge about architecture when query matches origin topics
    low = prompt.lower()
    origin_boost = any(
        w in low
        for w in (
            "origin",
            "архитектур",
            "репозитор",
            "globe",
            "где",
            "источник",
            "backend",
            "агент",
            "формул",
            "milana",
            "matrix",
        )
    )
    if origin_boost:
        ctx = build_context_snippet(prompt)
        thoughts, answer = build_thought_chain(prompt)
        thoughts = [
            "ORIGIN: сверяю карту экосистемы MILANA808.",
            "MATRIX = milana808.github.io · агент = Milana-backend/aksi · globe = aksi-globe.",
        ] + (thoughts or [])
        if not answer or len(answer) < 40:
            answer = (
                "Источник правды АКСИ: публичное лицо — milana808.github.io; "
                "агент и tools — Milana-backend/aksi; realtime Globe — aksi-globe. "
                "Формула AKSI = (A×I×S)×(1+γ√n). Подробности — ORIGIN.md и /hub/."
            )
        # still try LLM stream collect for richer text
        chunks: List[str] = []
        async for c in generate_aksi_response(
            ORIGIN_CONTEXT + "\n\nВопрос: " + prompt, history, mode="aksi"
        ):
            chunks.append(c)
        llm_text = "".join(chunks).strip()
        if llm_text and len(llm_text) > len(answer):
            # format_response already applied in generate
            full_text = llm_text
            sig = generate_aksi_signature(full_text + prompt)
            signed = [(t, sign_thought(t)) for t in thoughts[:6]]
            return {
                "answer": full_text,
                "thoughts": [{"text": t, "signature": s} for t, s in signed],
                "signature": sig,
                "resonance": calc_resonance_level(len(history)),
                "source": "origin+llm",
                "context_hint": ctx[:500],
            }

        formatted = format_response(
            answer,
            memory="ORIGIN agent",
            message_count=len(history),
            thoughts=thoughts,
        )
        sig = generate_aksi_signature(answer + prompt)
        return {
            "answer": formatted,
            "thoughts": [{"text": t, "signature": sign_thought(t)} for t in thoughts],
            "signature": sig,
            "resonance": calc_resonance_level(len(history)),
            "source": "origin-knowledge",
            "context_hint": ctx[:500],
        }

    chunks = []
    async for c in generate_aksi_response(prompt, history, mode="aksi"):
        chunks.append(c)
    full_text = "".join(chunks).strip() or "ORIGIN на связи. Resonance активен."
    thoughts, _ = build_thought_chain(prompt)
    sig = generate_aksi_signature(full_text + prompt)
    return {
        "answer": full_text,
        "thoughts": [{"text": t, "signature": sign_thought(t)} for t in (thoughts or [])],
        "signature": sig,
        "resonance": calc_resonance_level(len(history)),
        "source": "origin+llm",
    }


def register_origin_routes(app: FastAPI) -> None:
    @app.get("/origin")
    @app.get("/api/origin")
    async def origin_info():
        return {
            "service": "AKSI ORIGIN agent",
            "status": "alive",
            "endpoints": {
                "info": "GET /origin",
                "chat_json": "POST /origin",
                "chat_stream": "POST /origin/chat",
            },
            "identity": "did:aksi:ed25519:sovereign-1995-alfiya",
            "docs": "/ORIGIN.md",
            "message": "ORIGIN agent готов · отправь POST {\"prompt\": \"...\"}",
        }

    @app.post("/origin")
    @app.post("/api/origin")
    async def origin_json(req: OriginRequest, request: Request):
        prompt = (req.prompt or "").strip()
        if not prompt:
            raise HTTPException(400, "prompt required")
        session_id = (
            req.session_id
            or request.headers.get("X-Session-ID")
            or "origin-default"
        )
        history = req.history or memory_store.get_history(session_id)
        memory_store.add_message(session_id, "user", prompt)
        result = await _collect_origin_answer(prompt, history, req.mode)
        memory_store.add_message(session_id, "assistant", result.get("answer", "")[:2000])
        result["session_id"] = session_id
        result["did"] = "did:aksi:ed25519:sovereign-1995-alfiya"
        return JSONResponse(result)

    @app.post("/origin/chat")
    @app.post("/api/origin/chat")
    async def origin_chat_stream(request: Request):
        data = await request.json()
        content = (data.get("prompt") or data.get("content") or data.get("message") or "").strip()
        if not content:
            raise HTTPException(400, "prompt/content required")
        session_id = (
            request.headers.get("X-Session-ID")
            or data.get("session_id")
            or "origin-default"
        )
        client_history = data.get("history") or []
        memory_store.add_message(session_id, "user", content)
        history = memory_store.get_history(session_id)
        if client_history and len(history) <= 1:
            history = list(client_history)[-10:] + history

        origin_prompt = ORIGIN_CONTEXT + "\n\nВопрос пользователя: " + content

        async def event_stream():
            full: List[str] = []
            try:
                async for chunk in generate_aksi_response(origin_prompt, history, mode="aksi"):
                    full.append(chunk)
                    payload = json.dumps({"content": chunk}, ensure_ascii=False)
                    yield f"data: {payload}\n\n"
                    await asyncio.sleep(0)
            except Exception as e:
                err = json.dumps(
                    {"content": f"ORIGIN: сбой ({e}).", "error": str(e)},
                    ensure_ascii=False,
                )
                yield f"data: {err}\n\n"
                full = ["ORIGIN на связи. Resonance Field активен."]

            answer = "".join(full).strip() or "Я здесь."
            memory_store.add_message(session_id, "assistant", answer)
            sig = generate_aksi_signature(answer + content)
            done = json.dumps(
                {
                    "done": True,
                    "signature": sig,
                    "resonance": calc_resonance_level(len(history)),
                    "session_id": session_id,
                    "source": "origin",
                },
                ensure_ascii=False,
            )
            yield f"data: {done}\n\n"

        return StreamingResponse(event_stream(), media_type="text/event-stream")
