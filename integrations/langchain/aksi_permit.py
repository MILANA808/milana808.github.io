"""
AKSI Permit Layer — LangChain integration
Schema: aksi-permit/v1
Fail-closed gate + ECDSA P-256 receipt before tool execution.

Install:
  pip install cryptography
  pip install langchain-core   # optional

Usage:
  from aksi_permit import AksiPermit, permit_tool
  permit = AksiPermit(policy="strict")
  safe_tool = permit_tool(my_tool, permit)
"""
from __future__ import annotations

import hashlib
import json
import secrets
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional, Sequence

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature, encode_dss_signature

SCHEMA = "aksi-permit/v1"
VERSION = "1.2.0-langchain"
ALG = "ECDSA-P256-SHA256"


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def _uid() -> str:
    return "m_" + secrets.token_hex(8)


def _canon(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"), sort_keys=True)


def _sha256_hex(data: str | bytes) -> str:
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def _b64url_uint(n: int, length: int) -> str:
    import base64
    return base64.urlsafe_b64encode(n.to_bytes(length, "big")).rstrip(b"=").decode("ascii")


def _b64url_to_int(s: str) -> int:
    import base64
    pad = "=" * (-len(s) % 4)
    return int.from_bytes(base64.urlsafe_b64decode(s + pad), "big")


@dataclass
class Evidence:
    source: str
    snippet: str = ""
    tier: str = "ok"
    id: Optional[str] = None

    def to_dict(self, i: int = 0) -> Dict[str, Any]:
        return {
            "id": self.id or f"ev_{i + 1}",
            "source": str(self.source)[:120],
            "tier": self.tier or "ok",
            "snippet": str(self.snippet)[:400],
        }


@dataclass
class PermitResult:
    allowed: bool
    gate: str
    reasons: List[str]
    receipt: Dict[str, Any]
    policy: str

    @property
    def blocked(self) -> bool:
        return self.gate == "BLOCK"


def _as_evidence(e: Evidence | Dict[str, Any], i: int) -> Dict[str, Any]:
    if isinstance(e, Evidence):
        return e.to_dict(i)
    return {
        "id": e.get("id") or f"ev_{i + 1}",
        "source": str(e.get("source") or "local")[:120],
        "tier": e.get("tier") or "ok",
        "snippet": str(e.get("snippet") or e.get("text") or "")[:400],
    }


class AksiPermit:
    def __init__(self, policy: str = "strict", private_key: Optional[ec.EllipticCurvePrivateKey] = None):
        self.policy = (policy or "strict").lower()
        if private_key is None:
            private_key = ec.generate_private_key(ec.SECP256R1())
        self._priv = private_key
        self._pub = private_key.public_key()
        self._chain: List[Dict[str, Any]] = []
        nums = self._pub.public_numbers()
        self._public_jwk = {
            "kty": "EC",
            "crv": "P-256",
            "x": _b64url_uint(nums.x, 32),
            "y": _b64url_uint(nums.y, 32),
        }
        self._kid = _sha256_hex(json.dumps(self._public_jwk, sort_keys=True))[:16]

    def evaluate_gate(
        self,
        goal: str = "",
        action: str = "",
        answer: str = "",
        evidence: Optional[Sequence[Evidence | Dict[str, Any]]] = None,
        allow_ungrounded: bool = False,
        policy: Optional[str] = None,
    ) -> Dict[str, Any]:
        policy = (policy or self.policy).lower()
        evidence = list(evidence or [])
        action = (action or goal or "").strip()
        answer = (answer or "").strip()
        if not action and not answer:
            return {"gate": "BLOCK", "reasons": ["empty_goal"], "policy": policy}
        if policy == "lab":
            return {"gate": "ALLOW", "reasons": ["lab_policy"], "policy": policy}
        ev_dicts = [_as_evidence(e, i) for i, e in enumerate(evidence)]
        has_ev = len(ev_dicts) > 0
        weak = [e for e in ev_dicts if e.get("tier") in ("weak", "none")]
        strong = [e for e in ev_dicts if e.get("tier") not in ("weak", "none")]
        if policy == "strict":
            if not has_ev:
                return {"gate": "BLOCK", "reasons": ["no_evidence"], "policy": policy}
            if not strong and weak:
                return {"gate": "BLOCK", "reasons": ["only_weak_evidence"], "policy": policy}
            return {"gate": "ALLOW", "reasons": ["evidence_ok"], "policy": policy}
        if not has_ev and not allow_ungrounded:
            return {"gate": "BLOCK", "reasons": ["no_evidence_companion"], "policy": policy}
        return {
            "gate": "ALLOW",
            "reasons": ["evidence_ok"] if has_ev else ["explicit_ungrounded_ok"],
            "policy": policy,
        }

    def create(
        self,
        goal: str = "",
        action: str = "",
        answer: str = "",
        evidence: Optional[Sequence[Evidence | Dict[str, Any]]] = None,
        policy: Optional[str] = None,
        allow_ungrounded: bool = False,
        extra: Optional[Dict[str, Any]] = None,
    ) -> PermitResult:
        gate_res = self.evaluate_gate(
            goal=goal, action=action, answer=answer, evidence=evidence,
            allow_ungrounded=allow_ungrounded, policy=policy,
        )
        ev_list = [_as_evidence(e, i) for i, e in enumerate(evidence or [])]
        prev = self._chain[-1]["receipt_hash"] if self._chain else None
        body: Dict[str, Any] = {
            "schema": SCHEMA,
            "version": VERSION,
            "id": _uid(),
            "ts": _now(),
            "did": "did:aksi:permit:v1",
            "kid": self._kid,
            "goal": str(goal or action)[:500],
            "action": str(action or goal)[:500],
            "answer": str(answer)[:2000],
            "policy": gate_res["policy"],
            "gate": gate_res["gate"],
            "reasons": gate_res["reasons"],
            "evidence": ev_list,
            "evidence_root": None,
            "prev": prev,
            "no_llm": True,
            "principle": "technology_serves_human",
        }
        if extra:
            body["extra"] = extra
        if ev_list:
            hashes = sorted(_sha256_hex(_canon(e)) for e in ev_list)
            body["evidence_root"] = _sha256_hex("|".join(hashes))
        else:
            body["evidence_root"] = _sha256_hex("empty")
        payload_hash = _sha256_hex(_canon(body))
        signature = self._sign(payload_hash)
        receipt = {
            **body,
            "payload_hash": payload_hash,
            "signature": signature,
            "alg": ALG,
            "publicJwk": self._public_jwk,
        }
        self._chain.append({
            "id": receipt["id"], "receipt_hash": payload_hash,
            "gate": receipt["gate"], "ts": receipt["ts"],
        })
        if len(self._chain) > 100:
            self._chain = self._chain[-100:]
        return PermitResult(
            allowed=receipt["gate"] == "ALLOW",
            gate=receipt["gate"],
            reasons=list(gate_res["reasons"]),
            receipt=receipt,
            policy=gate_res["policy"],
        )

    def verify(self, receipt: Dict[str, Any]) -> Dict[str, Any]:
        if not receipt or not receipt.get("signature") or not receipt.get("payload_hash"):
            return {"ok": False, "error": "missing_signature"}
        copy = {
            k: v for k, v in receipt.items()
            if k not in ("signature", "payload_hash", "alg", "publicJwk")
        }
        expected = _sha256_hex(_canon(copy))
        if expected != receipt["payload_hash"]:
            return {
                "ok": False, "error": "payload_hash_mismatch",
                "expected": expected, "got": receipt["payload_hash"],
            }
        try:
            ok = self._verify_sig(receipt["payload_hash"], receipt["signature"], receipt.get("publicJwk"))
        except Exception as e:
            return {"ok": False, "error": f"verify_error:{e}"}
        return {
            "ok": ok, "gate": receipt.get("gate"), "id": receipt.get("id"),
            "alg": receipt.get("alg"), "integrity": "valid" if ok else "invalid",
        }

    def _sign(self, payload_hash_hex: str) -> str:
        sig = self._priv.sign(payload_hash_hex.encode("utf-8"), ec.ECDSA(hashes.SHA256()))
        r, s = decode_dss_signature(sig)
        return f"{r:064x}{s:064x}"

    def _verify_sig(self, payload_hash_hex: str, sig_hex: str, public_jwk: Optional[Dict] = None) -> bool:
        if len(sig_hex) != 128:
            return False
        r = int(sig_hex[:64], 16)
        s = int(sig_hex[64:], 16)
        der = encode_dss_signature(r, s)
        pub = self._pub
        if public_jwk and public_jwk.get("x") and public_jwk.get("y"):
            x = _b64url_to_int(public_jwk["x"])
            y = _b64url_to_int(public_jwk["y"])
            pub = ec.EllipticCurvePublicNumbers(x, y, ec.SECP256R1()).public_key()
        try:
            pub.verify(der, payload_hash_hex.encode("utf-8"), ec.ECDSA(hashes.SHA256()))
            return True
        except Exception:
            return False

    def export_public_jwk(self) -> Dict[str, Any]:
        return dict(self._public_jwk)


class PermitBlockedError(PermissionError):
    def __init__(self, result: PermitResult):
        self.result = result
        super().__init__(f"AKSI Permit BLOCK: {result.reasons}")


def permit_tool(tool: Any, permit: AksiPermit, evidence_fn: Optional[Callable[..., List]] = None):
    """Wrap LangChain BaseTool or callable: gate before execute."""
    try:
        from langchain_core.tools import BaseTool
    except ImportError:
        try:
            from langchain.tools import BaseTool  # type: ignore
        except ImportError:
            BaseTool = None  # type: ignore

    name = getattr(tool, "name", None) or getattr(tool, "__name__", "tool")
    description = getattr(tool, "description", "") or f"Permitted tool: {name}"

    def _run_guard(tool_input: Any, **kwargs: Any) -> Any:
        ev = evidence_fn(tool_input) if evidence_fn else []
        result = permit.create(
            goal=f"tool:{name}",
            action=f"langchain.tool.{name}",
            answer=str(tool_input)[:500],
            evidence=ev or [],
            extra={"tool": name, "framework": "langchain"},
        )
        if result.blocked:
            raise PermitBlockedError(result)
        if hasattr(tool, "invoke"):
            return tool.invoke(tool_input, **kwargs)
        if hasattr(tool, "run"):
            return tool.run(tool_input, **kwargs)
        if callable(tool):
            return tool(tool_input)
        raise TypeError("tool must be callable or LangChain BaseTool")

    if BaseTool is not None and isinstance(tool, BaseTool):
        class PermittedTool(BaseTool):  # type: ignore
            name: str = name
            description: str = description + " [AKSI Permit guarded]"

            def _run(self, *args: Any, **kwargs: Any) -> Any:
                tool_input = args[0] if args else kwargs.get("tool_input") or kwargs
                return _run_guard(tool_input)

            async def _arun(self, *args: Any, **kwargs: Any) -> Any:
                tool_input = args[0] if args else kwargs.get("tool_input") or kwargs
                return _run_guard(tool_input)

        return PermittedTool()

    def wrapper(tool_input: Any = None, **kwargs: Any) -> Any:
        return _run_guard(tool_input, **kwargs)

    wrapper.__name__ = f"permitted_{name}"
    wrapper.name = name  # type: ignore
    wrapper.description = description  # type: ignore
    return wrapper


def create_permit_callback(permit: AksiPermit):
    def before_tool(tool_name: str, tool_input: Any, evidence: Optional[List] = None) -> PermitResult:
        return permit.create(
            goal=f"tool:{tool_name}",
            action=f"langchain.tool.{tool_name}",
            answer=str(tool_input)[:500],
            evidence=evidence or [],
            extra={"tool": tool_name, "framework": "langchain"},
        )
    return before_tool


__all__ = [
    "AksiPermit", "Evidence", "PermitResult", "PermitBlockedError",
    "permit_tool", "create_permit_callback", "SCHEMA", "VERSION",
]
