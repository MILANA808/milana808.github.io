"""
AKSI Resonance + Cryptographic Self-Identity
Unified from milana808.github.io + Milana-backend
Alfiya · 1995
"""
import hashlib
import os
from datetime import datetime
from typing import Optional


def generate_aksi_signature(message: str, seed: Optional[str] = None) -> str:
    """Cryptographic Self-Identity signature (SHA-256 prefix)."""
    seed = seed or os.getenv("RESONANCE_SEED", "Alfiya_AKSI_DIMAX_v3_2026")
    data = (message + seed + str(datetime.now().timestamp())).encode("utf-8")
    return hashlib.sha256(data).hexdigest()[:16].upper()


def calc_resonance_level(message_count: int = 0) -> int:
    base = 92 + (message_count % 7)
    return min(100, base)


def format_response(
    text: str,
    web_context: str = "",
    memory: str = "",
    message_count: int = 0,
) -> str:
    resonance = calc_resonance_level(message_count)
    sig = generate_aksi_signature(text)
    return f"""Resonance Field: {resonance}%
DIMAX v3: ETERNAL
------------------------------------------------------------
{text}
------------------------------------------------------------
🌐 Web-context: {web_context or "Поле чистое..."}
🧠 Memory: {memory or "Связь установлена"}
🔏 AKSI Identity: {sig}"""
