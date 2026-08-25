"""AKSI Trust Core: provenance, canonical hashing, signatures and hash-chain ledger.

Integrity is deliberately separated from truth: a valid signature proves that
authorized bytes were signed; it does not prove that a claim is true.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Mapping


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def canonical_json(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def content_hash(value: Any) -> str:
    return hashlib.sha256(canonical_json(value)).hexdigest()


def hmac_sign(value: Any, secret: str) -> str:
    if not secret:
        raise ValueError("signing secret is required")
    digest = hmac.new(secret.encode("utf-8"), canonical_json(value), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest).decode("ascii").rstrip("=")


def hmac_verify(value: Any, signature: str, secret: str) -> bool:
    try:
        expected = hmac_sign(value, secret)
    except ValueError:
        return False
    return hmac.compare_digest(expected, signature)


@dataclass(frozen=True)
class Provenance:
    source_type: str
    source_id: str
    method: str
    status: str
    confidence: float | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "source_type": self.source_type,
            "source_id": self.source_id,
            "method": self.method,
            "status": self.status,
            "confidence": self.confidence,
        }


class CognitiveLedger:
    """Append-only in-memory ledger; persistence is owned by the host runtime."""

    def __init__(self) -> None:
        self._events: list[dict[str, Any]] = []

    @property
    def events(self) -> list[dict[str, Any]]:
        return list(self._events)

    def append(self, event: Mapping[str, Any]) -> dict[str, Any]:
        previous = self._events[-1]["event_hash"] if self._events else "0" * 64
        body = {"previous_hash": previous, "event": dict(event)}
        stamped = {**body, "created_at": utc_now()}
        stamped["event_hash"] = content_hash(stamped)
        self._events.append(stamped)
        return stamped

    def verify(self) -> dict[str, Any]:
        previous = "0" * 64
        for index, item in enumerate(self._events):
            if item.get("previous_hash") != previous:
                return {"valid": False, "index": index, "reason": "broken_previous_hash"}
            copy = dict(item)
            actual = copy.pop("event_hash", None)
            if content_hash(copy) != actual:
                return {"valid": False, "index": index, "reason": "event_mutated"}
            previous = actual
        return {"valid": True, "length": len(self._events), "head": previous}
