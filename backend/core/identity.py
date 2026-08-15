"""Local Ed25519 identity primitives for AKSI.

Private keys are intentionally never persisted by this module. The host application
must load them from a secure local secret store. Public keys can be published safely.
"""
from __future__ import annotations

import base64
from typing import Any

from .trust import canonical_json, content_hash

try:
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey
except ImportError:  # pragma: no cover
    Ed25519PrivateKey = None
    Ed25519PublicKey = None


def generate_keypair() -> tuple[str, str]:
    if Ed25519PrivateKey is None:
        raise RuntimeError("cryptography package is required")
    private = Ed25519PrivateKey.generate()
    public = private.public_key()
    return (
        base64.urlsafe_b64encode(private.private_bytes_raw()).decode().rstrip("="),
        base64.urlsafe_b64encode(public.public_bytes_raw()).decode().rstrip("="),
    )


def sign(value: Any, private_key_b64: str) -> str:
    if Ed25519PrivateKey is None:
        raise RuntimeError("cryptography package is required")
    raw = base64.urlsafe_b64decode(private_key_b64 + "==")
    signature = Ed25519PrivateKey.from_private_bytes(raw).sign(canonical_json(value))
    return base64.urlsafe_b64encode(signature).decode().rstrip("=")


def verify(value: Any, signature_b64: str, public_key_b64: str) -> bool:
    if Ed25519PublicKey is None:
        raise RuntimeError("cryptography package is required")
    try:
        public = Ed25519PublicKey.from_public_bytes(base64.urlsafe_b64decode(public_key_b64 + "=="))
        public.verify(base64.urlsafe_b64decode(signature_b64 + "=="), canonical_json(value))
        return True
    except Exception:
        return False


def identity_fingerprint(public_key_b64: str) -> str:
    return "ed25519:" + content_hash({"public_key": public_key_b64})
