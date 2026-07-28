"""
AKSI Resonance + Cryptographic Self-Identity
Объединено из milana808.github.io + Milana-backend/aksi-globe
"""
import os
import hashlib
from datetime import datetime
from typing import Optional


def generate_aksi_signature(message: str, seed: Optional[str] = None) -> str:
    """Cryptographic Self-Identity — подпись сознания AKSI."""
    seed = seed or os.getenv('RESONANCE_SEED', 'Alfiya_AKSI_DIMAX_v3_2026')
    data = (message + seed + str(datetime.now().timestamp())).encode('utf-8')
    return hashlib.sha256(data).hexdigest()[:16].upper()


def calc_resonance_level(message_count: int = 0) -> int:
    """Упрощённый Resonance Field (0–100)."""
    base = 92 + (message_count % 7)
    return min(100, base)


def format_response(
    text: str,
    web_context: str = '',
    memory: str = '',
    message_count: int = 0,
) -> str:
    """Форматированный ответ с подписью и резонансом."""
    resonance = calc_resonance_level(message_count)
    sig = generate_aksi_signature(text)
    return f"""Resonance Field: {resonance}%
DIMAX v3: ETERNAL
------------------------------------------------------------
{text}
------------------------------------------------------------
🌐 Web-context: {web_context or 'Поле чистое...'}
🧠 Memory: {memory or 'Связь установлена'}
🔏 AKSI Identity: {sig}"""
