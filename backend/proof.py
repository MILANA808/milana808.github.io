"""AKSI Proof — canonical, hashable and optionally Ed25519-signed AI provenance.

Important distinction: a signature proves integrity/authorship of a record; it does
NOT prove that the AI's claims are true. Evidence and verification status remain
explicit application data.
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey


def canonical_json(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def sha256_hex(value: Any) -> str:
    return hashlib.sha256(canonical_json(value)).hexdigest()


def _private_key() -> Optional[Ed25519PrivateKey]:
    raw = os.getenv("AKSI_SIGNING_PRIVATE_KEY", "").strip()
    if not raw:
        return None
    try:
        data = base64.b64decode(raw, validate=True)
        return serialization.load_pem_private_key(data, password=None)
    except Exception:
        return None


def build_proof_record(
    *,
    question: str,
    answer: str,
    provider: str,
    model: str,
    claims: Optional[List[Dict[str, Any]]] = None,
    evidence: Optional[List[Dict[str, Any]]] = None,
    verification: Optional[Dict[str, Any]] = None,
    record_id: Optional[str] = None,
) -> Dict[str, Any]:
    created = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    body: Dict[str, Any] = {
        "schema": "aksi-proof/v1",
        "record_id": record_id or "",
        "created_at": created,
        "provider": provider,
        "model": model,
        "question": question,
        "answer": answer,
        "claims": claims or [],
        "evidence": evidence or [],
        "verification": verification or {"status": "not_run"},
    }
    digest = sha256_hex(body)
    result: Dict[str, Any] = {"record": body, "integrity": {"algorithm": "SHA-256", "hash": digest}}

    key = _private_key()
    if key:
        signature = key.sign(canonical_json(body))
        public = key.public_key().public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw,
        )
        result["signature"] = {
            "algorithm": "Ed25519",
            "encoding": "base64",
            "signature": base64.b64encode(signature).decode("ascii"),
            "public_key": base64.b64encode(public).decode("ascii"),
        }
    else:
        result["signature"] = {"status": "not_configured", "note": "Hash is available; no server private key was configured."}
    return result


def verify_proof(proof: Dict[str, Any]) -> Dict[str, Any]:
    record = proof.get("record") or {}
    expected = ((proof.get("integrity") or {}).get("hash") or "").lower()
    actual = sha256_hex(record)
    hash_valid = bool(expected) and expected == actual
    sig = proof.get("signature") or {}
    signature_valid = None
    if sig.get("algorithm") == "Ed25519" and sig.get("signature") and sig.get("public_key"):
        try:
            from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
            public = Ed25519PublicKey.from_public_bytes(base64.b64decode(sig["public_key"], validate=True))
            public.verify(base64.b64decode(sig["signature"], validate=True), canonical_json(record))
            signature_valid = True
        except Exception:
            signature_valid = False
    return {
        "hash_valid": hash_valid,
        "signature_valid": signature_valid,
        "integrity_status": "VALID" if hash_valid and signature_valid is not False else "INVALID",
    }
