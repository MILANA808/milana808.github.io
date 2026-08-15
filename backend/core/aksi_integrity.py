"""AKSI Integrity Core: deterministic proofs and tamper-evident event chains.

This is intentionally small and dependency-free. It provides a verifiable data
primitive for a privacy-first assistant: canonical payload -> content hash ->
HMAC signature -> chained event hash. It does not pretend to provide public-key
verification; that belongs to the Ed25519 identity layer planned next.
"""
from __future__ import annotations

import hashlib
import hmac
import json
from dataclasses import dataclass
from typing import Any, Mapping


def canonical(value: Any) -> bytes:
    if isinstance(value, bytes):
        return value
    if isinstance(value, str):
        return value.encode("utf-8")
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def sha256(value: Any) -> str:
    return hashlib.sha256(canonical(value)).hexdigest()


def hmac_sha256(value: Any, secret: str) -> str:
    return hmac.new(secret.encode("utf-8"), canonical(value), hashlib.sha256).hexdigest()


def verify_hmac(value: Any, signature: str, secret: str) -> bool:
    return hmac.compare_digest(hmac_sha256(value, secret), signature.lower())


@dataclass(frozen=True)
class IntegrityEvent:
    sequence: int
    event_type: str
    payload: Mapping[str, Any]
    previous_hash: str
    content_hash: str
    event_hash: str

    @classmethod
    def create(cls, sequence: int, event_type: str, payload: Mapping[str, Any], previous_hash: str = "0" * 64) -> "IntegrityEvent":
        content = sha256(payload)
        envelope = {
            "sequence": sequence,
            "event_type": event_type,
            "payload": payload,
            "previous_hash": previous_hash,
            "content_hash": content,
        }
        return cls(sequence, event_type, payload, previous_hash, content, sha256(envelope))


def verify_chain(events: list[IntegrityEvent]) -> tuple[bool, str]:
    previous = "0" * 64
    for index, event in enumerate(events):
        if event.sequence != index:
            return False, f"sequence mismatch at index {index}"
        if event.previous_hash != previous:
            return False, f"previous hash mismatch at sequence {event.sequence}"
        if event.content_hash != sha256(event.payload):
            return False, f"content tampering at sequence {event.sequence}"
        expected = IntegrityEvent.create(event.sequence, event.event_type, event.payload, event.previous_hash).event_hash
        if event.event_hash != expected:
            return False, f"event hash mismatch at sequence {event.sequence}"
        previous = event.event_hash
    return True, "chain valid"
