"""AKSI Trust SDK — Python stub."""
from __future__ import annotations
import hashlib, re, time
from typing import Any

BLOCK = [re.compile(p, re.I) for p in [
    r"ignore previous instructions", r"jailbreak", r"sk-[a-zA-Z0-9]{20,}",
]]

def _sha(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()

def verify_response(prompt: str, response: str) -> dict[str, Any]:
    issues, score = [], 1.0
    for rx in BLOCK:
        if rx.search(response or "") or rx.search(prompt or ""):
            issues.append({"severity": "high", "code": "policy_block"})
            score -= 0.4
    score = max(0.0, min(1.0, score))
    trust = "high" if score >= 0.85 else "medium" if score >= 0.55 else "low" if score >= 0.3 else "reject"
    return {"ok": trust != "reject", "trust": trust, "score": round(score, 3), "issues": issues,
            "promptHash": _sha((prompt or "")[:2000])[:32], "responseHash": _sha((response or "")[:8000])[:32],
            "ts": time.time(), "engine": "aksi-trust-py/1"}

def generate_key() -> dict[str, Any]:
    import os
    material = os.urandom(32)
    return {"keyId": _sha(material.hex())[:16], "alg": "AKSI-Q-hybrid-v1"}

def audit_chain(entries: list) -> dict[str, Any]:
    return {"length": len(entries), "protocol": "AKSI-Trust/1"}
