"""
AKSI Resonance + Cryptographic Self-Identity

The previous implementation mixed a timestamp into every signature and truncated
SHA-256 to 64 bits. That made the value non-deterministic and impossible to
verify from the message alone. This module now exposes a deterministic,
cryptographically strong digest for integrity checks.
"""
import hashlib
import hmac
import os
from typing import List, Optional, Tuple

DEFAULT_SEED = "AKSI_DIMAX_v3_2026"


def _secret(seed: Optional[str] = None) -> bytes:
    value = seed if seed is not None else os.getenv("RESONANCE_SEED", DEFAULT_SEED)
    return value.encode("utf-8")


def generate_aksi_signature(message: str, seed: Optional[str] = None) -> str:
    """Return a deterministic 256-bit HMAC-SHA-256 integrity signature.

    The signature is stable for the same message and secret and can therefore
    be verified with :func:`verify_aksi_signature`. The secret must not be
    committed to the repository.
    """
    return hmac.new(
        _secret(seed), str(message).encode("utf-8"), hashlib.sha256
    ).hexdigest().upper()


def verify_aksi_signature(
    message: str, signature: str, seed: Optional[str] = None
) -> bool:
    """Constant-time verification of an AKSI integrity signature."""
    expected = generate_aksi_signature(message, seed)
    return hmac.compare_digest(expected, str(signature).upper())


def content_hash(message: str) -> str:
    """Return a public, deterministic SHA-256 content hash.

    Unlike the HMAC signature, this hash does not require a secret and is
    suitable for independently checking that content has not changed.
    """
    return hashlib.sha256(str(message).encode("utf-8")).hexdigest()


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
