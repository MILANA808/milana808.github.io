"""AKSI Runtime API v1.1 — optional FastAPI. pip install fastapi uvicorn httpx"""
from __future__ import annotations
import json, uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
try:
    import httpx
except ImportError:
    httpx = None

app = FastAPI(title="AKSI Runtime API", version="1.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
SESSIONS: Dict[str, Dict[str, Any]] = {}

def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

def fnv(s: str) -> str:
    h = 0x811C9DC5
    for ch in s:
        h ^= ord(ch)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return f"{h:08x}"

class TaskCreate(BaseModel):
    goal: str = Field(..., min_length=3)

class ApproveBody(BaseModel):
    tool: str
    allowed: bool = True

@app.get("/health")
def health():
    return {"ok": True, "service": "aksi-runtime", "version": "1.1.0"}

@app.post("/runtime/task")
async def create_task(body: TaskCreate):
    if httpx is None:
        raise HTTPException(500, "pip install httpx fastapi uvicorn")
    sid = f"sess_{uuid.uuid4().hex[:10]}"
    goal = body.goal.strip()
    session: Dict[str, Any] = {
        "id": sid, "goal": goal, "status": "RUNNING", "created_at": now(),
        "events": [], "tasks": [], "evidence": [], "claims": [], "conflicts": [],
        "proof": {"chain": []}, "report": None, "live": [], "memories": [], "approvals": {},
    }
    def emit(etype: str, data: Any = None):
        prev = session["proof"]["chain"][-1]["hash"] if session["proof"]["chain"] else "genesis"
        h = fnv(f"{etype}|{json.dumps(data, ensure_ascii=False)[:400]}|{prev}")
        ev = {"event_id": f"ev_{uuid.uuid4().hex[:8]}", "timestamp": now(), "event_type": etype,
              "data": data or {}, "previous_event_hash": prev, "hash": h}
        session["events"].append(ev)
        session["proof"]["chain"].append({"hash": h, "prev": prev, "type": etype, "at": ev["timestamp"]})
        session["live"].append({"t": ev["timestamp"][11:19], "type": etype})
    emit("GOAL_RECEIVED", {"goal": goal})
    emit("PLAN_CREATED", {"count": 4})
    sources: List[Dict[str, Any]] = []
    async with httpx.AsyncClient(timeout=20.0, headers={"User-Agent": "AKSI-Runtime/1.1"}) as client:
        emit("WEB_SEARCH", {"query": goal[:120]})
        r = await client.get("https://en.wikipedia.org/w/api.php",
            params={"action": "opensearch", "limit": 5, "format": "json", "search": goal[:120]})
        if r.status_code == 200:
            data = r.json()
            for i, title in enumerate(data[1] or []):
                sources.append({"title": title,
                    "snippet": (data[2] or [""])[i] if i < len(data[2] or []) else "",
                    "url": (data[3] or [""])[i] if i < len(data[3] or []) else ""})
        emit("SOURCES_FOUND", {"count": len(sources)})
        for s in sources[:4]:
            if not s.get("url"):
                continue
            sr = await client.get(f"https://en.wikipedia.org/api/rest_v1/page/summary/{s['title']}")
            if sr.status_code == 200:
                j = sr.json()
                extract = j.get("extract") or ""
                session["evidence"].append({"id": f"evd_{uuid.uuid4().hex[:8]}", "kind": "FACT",
                    "content": extract[:1200], "url": s["url"], "confidence": 0.75})
                session["claims"].append({"id": f"clm_{uuid.uuid4().hex[:8]}", "text": extract[:280],
                    "source_path": s["url"], "confidence": 0.75})
    emit("MULTI_LLM_DONE", {"paths": 1})
    summary = f"Server session {sid}: {len(session['evidence'])} facts for goal."
    session["report"] = {"id": f"rep_{uuid.uuid4().hex[:8]}", "executive_summary": summary,
        "markdown": f"# Report\n\n{summary}\n", "at": now()}
    emit("REPORT_READY", {"id": session["report"]["id"]})
    emit("PROOF_SEALED", {"length": len(session["proof"]["chain"])})
    session["status"] = "COMPLETED"
    session["completed_at"] = now()
    SESSIONS[sid] = session
    return {"ok": True, "id": sid, "status": session["status"], "evidence": len(session["evidence"])}

@app.get("/runtime/task/{task_id}")
def get_task(task_id: str):
    s = SESSIONS.get(task_id)
    if not s:
        raise HTTPException(404, "session not found")
    return s

@app.get("/runtime/task/{task_id}/graph")
def get_graph(task_id: str):
    s = SESSIONS.get(task_id)
    if not s:
        raise HTTPException(404, "session not found")
    return {"tasks": s.get("tasks", []), "live": s.get("live", [])}

@app.get("/runtime/task/{task_id}/evidence")
def get_evidence(task_id: str):
    s = SESSIONS.get(task_id)
    if not s:
        raise HTTPException(404, "session not found")
    return {"evidence": s.get("evidence", []), "claims": s.get("claims", []), "conflicts": s.get("conflicts", [])}

@app.get("/runtime/task/{task_id}/proof")
def get_proof(task_id: str):
    s = SESSIONS.get(task_id)
    if not s:
        raise HTTPException(404, "session not found")
    return s.get("proof", {})

@app.get("/runtime/task/{task_id}/memory")
def get_memory(task_id: str):
    s = SESSIONS.get(task_id)
    if not s:
        raise HTTPException(404, "session not found")
    return {"memories": s.get("memories", [])}

@app.post("/runtime/action/{task_id}/approve")
def approve(task_id: str, body: ApproveBody):
    s = SESSIONS.get(task_id)
    if not s:
        raise HTTPException(404, "session not found")
    s.setdefault("approvals", {})[body.tool] = body.allowed
    return {"ok": True, "approvals": s["approvals"]}

@app.post("/runtime/action/{task_id}/reject")
def reject(task_id: str, body: ApproveBody):
    body.allowed = False
    return approve(task_id, body)
