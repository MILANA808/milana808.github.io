"""
AKSI Resonance + Cryptographic Self-Identity
Alfiya · 1995 · MILANA808

Signature: SHA-256(message + RESONANCE_SEED + timestamp)[:16].upper()
"""
import hashlib
import os
from datetime import datetime
from typing import List, Optional, Tuple

DEFAULT_SEED = "Alfiya_AKSI_DIMAX_v3_2026"


def generate_aksi_signature(message: str, seed: Optional[str] = None) -> str:
    """Canonical AKSI identity signature (16 hex chars)."""
    seed = seed or os.getenv("RESONANCE_SEED", DEFAULT_SEED)
    data = (str(message) + seed + str(datetime.now().timestamp())).encode("utf-8")
    return hashlib.sha256(data).hexdigest()[:16].upper()


def sign_thought(thought: str, seed: Optional[str] = None) -> str:
    """Sign a single reasoning step."""
    return generate_aksi_signature(f"THOUGHT|{thought}", seed)


def sign_thoughts(thoughts: List[str], seed: Optional[str] = None) -> List[Tuple[str, str]]:
    """Return list of (thought, signature)."""
    return [(t, sign_thought(t, seed)) for t in thoughts if t and str(t).strip()]


def calc_resonance_level(message_count: int = 0) -> int:
    base = 92 + (int(message_count) % 7)
    return min(100, base)


def format_response(
    text: str,
    web_context: str = "",
    memory: str = "",
    message_count: int = 0,
    thoughts: Optional[List[str]] = None,
) -> str:
    resonance = calc_resonance_level(message_count)
    sig = generate_aksi_signature(text)
    lines = [
        f"Resonance Field: {resonance}%",
        "DIMAX v3: ETERNAL",
        "------------------------------------------------------------",
    ]
    if thoughts:
        lines.append("Ход размышлений:")
        for i, t in enumerate(thoughts, 1):
            tsig = sign_thought(t)
            lines.append(f"  [{i}] {t}")
            lines.append(f"      🔏 {tsig}")
        lines.append("------------------------------------------------------------")
    lines.extend(
        [
            text,
            "------------------------------------------------------------",
            f"🌐 Web-context: {web_context or 'Поле чистое...'}",
            f"🧠 Memory: {memory or 'Связь установлена'}",
            f"🔏 AKSI Identity: {sig}",
        ]
    )
    return "\n".join(lines)
