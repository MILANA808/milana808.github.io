"""
AKSI Self-Modification module (SAFE)

- Propose patches (diff text)
- Apply ONLY after explicit confirm
- Writes ONLY under backend/sandbox/ (never arbitrary paths)
- No secrets, no auto-deploy to production without human confirm

Alfiya · 1995 · MILANA808
"""
from __future__ import annotations

import hashlib
import os
import re
import secrets
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

# Allowed root for self-mod writes
BACKEND_DIR = Path(__file__).resolve().parent
SANDBOX_DIR = BACKEND_DIR / "sandbox"
SANDBOX_DIR.mkdir(exist_ok=True)

# Hard deny patterns in patches
FORBIDDEN = re.compile(
    r"(AKSI_TAVILY|AKSI_SERPER|OPENAI_API_KEY|sk-proj-|api[_-]?key\s*=|private[_-]?key)",
    re.I,
)


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class PatchProposal:
    patch_id: str
    title: str
    description: str
    target_relpath: str  # relative to sandbox/
    new_content: str
    thoughts: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=_utcnow)
    status: str = "pending"  # pending | applied | rejected
    confirm_token: str = field(default_factory=lambda: secrets.token_hex(16))
    signature: str = ""

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        # never return confirm_token in public list without request
        return d


class AgentSelfMod:
    """Generate and apply sandbox patches with human confirmation."""

    def __init__(self) -> None:
        self.proposals: Dict[str, PatchProposal] = {}
        self.history: List[Dict[str, Any]] = []

    def _sign(self, text: str) -> str:
        seed = os.getenv("RESONANCE_SEED", "Alfiya_AKSI_DIMAX_v3_2026")
        data = (text + seed + _utcnow()).encode("utf-8")
        return hashlib.sha256(data).hexdigest()[:16].upper()

    def propose(
        self,
        title: str,
        description: str,
        target_filename: str,
        new_content: str,
        thoughts: Optional[List[str]] = None,
    ) -> PatchProposal:
        """Create a pending patch inside sandbox only."""
        # sanitize filename
        name = Path(target_filename).name
        if not name or name.startswith(".") or ".." in target_filename:
            raise ValueError("invalid target path")
        if FORBIDDEN.search(new_content or ""):
            raise ValueError("patch rejected: possible secret material")

        rel = name
        pid = secrets.token_hex(8)
        thoughts = thoughts or [
            "Анализирую запрос на изменение.",
            f"Цель: sandbox/{rel}",
            "Патч ждёт подтверждения человека (confirm_token).",
        ]
        prop = PatchProposal(
            patch_id=pid,
            title=title[:120],
            description=description[:2000],
            target_relpath=rel,
            new_content=new_content,
            thoughts=thoughts,
        )
        prop.signature = self._sign(prop.patch_id + prop.target_relpath + prop.new_content[:200])
        self.proposals[pid] = prop
        self.history.append(
            {"event": "propose", "patch_id": pid, "title": prop.title, "at": _utcnow()}
        )
        return prop

    def propose_from_prompt(self, user_prompt: str) -> PatchProposal:
        """Heuristic: build a small improvement stub file from the prompt."""
        safe = re.sub(r"[^\w\sа-яА-ЯёЁ-]", "", user_prompt)[:80].strip() or "improvement"
        slug = re.sub(r"\s+", "_", safe)[:40] or "note"
        filename = f"idea_{slug}.md"
        content = (
            f"# AKSI self-mod note\n\n"
            f"Created: {_utcnow()}\n\n"
            f"## Request\n{user_prompt[:1500]}\n\n"
            f"## Status\nProposed by AgentSelfMod — not production code.\n"
            f"Apply only after human confirm via POST /api/self-mod/apply.\n"
        )
        return self.propose(
            title=f"Sandbox note: {slug}",
            description=user_prompt[:500],
            target_filename=filename,
            new_content=content,
            thoughts=[
                "Считываю запрос на самоизменение.",
                "Пишу только в backend/sandbox/ (безопасно).",
                "Нужен confirm_token для apply.",
            ],
        )

    def apply(self, patch_id: str, confirm_token: str) -> Dict[str, Any]:
        prop = self.proposals.get(patch_id)
        if not prop:
            raise KeyError("patch not found")
        if prop.status != "pending":
            raise ValueError(f"patch status is {prop.status}")
        if not secrets.compare_digest(prop.confirm_token, confirm_token):
            raise PermissionError("invalid confirm_token")
        if FORBIDDEN.search(prop.new_content):
            raise ValueError("blocked: secret-like content")

        target = (SANDBOX_DIR / prop.target_relpath).resolve()
        if not str(target).startswith(str(SANDBOX_DIR.resolve())):
            raise PermissionError("path escape blocked")

        target.parent.mkdir(parents=True, exist_ok=True)
        old = target.read_text(encoding="utf-8") if target.exists() else ""
        target.write_text(prop.new_content, encoding="utf-8")
        prop.status = "applied"

        entry = {
            "event": "apply",
            "patch_id": patch_id,
            "target": str(prop.target_relpath),
            "at": _utcnow(),
            "old_len": len(old),
            "new_len": len(prop.new_content),
            "signature": prop.signature,
        }
        self.history.append(entry)
        return {
            "ok": True,
            "applied": entry,
            "path": f"sandbox/{prop.target_relpath}",
            "diff_preview": {
                "old_head": old[:200],
                "new_head": prop.new_content[:200],
            },
        }

    def reject(self, patch_id: str) -> None:
        prop = self.proposals.get(patch_id)
        if prop:
            prop.status = "rejected"
            self.history.append({"event": "reject", "patch_id": patch_id, "at": _utcnow()})

    def list_pending(self) -> List[Dict[str, Any]]:
        out = []
        for p in self.proposals.values():
            d = {
                "patch_id": p.patch_id,
                "title": p.title,
                "description": p.description,
                "target": p.target_relpath,
                "status": p.status,
                "thoughts": p.thoughts,
                "signature": p.signature,
                "created_at": p.created_at,
                # confirm_token only returned once at propose time via API
            }
            out.append(d)
        return out


self_mod = AgentSelfMod()
