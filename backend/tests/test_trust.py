from backend.core.trust import CognitiveLedger, content_hash, hmac_sign, hmac_verify


def test_canonical_hash_is_deterministic():
    assert content_hash({"b": 2, "a": 1}) == content_hash({"a": 1, "b": 2})


def test_hmac_detects_tampering():
    value = {"claim": "hello", "status": "computed"}
    signature = hmac_sign(value, "test-secret")
    assert hmac_verify(value, signature, "test-secret")
    assert not hmac_verify({**value, "status": "verified"}, signature, "test-secret")


def test_ledger_detects_mutation():
    ledger = CognitiveLedger()
    ledger.append({"type": "observation", "value": 1})
    ledger.append({"type": "decision", "value": 2})
    assert ledger.verify()["valid"] is True
    ledger._events[0]["event"]["value"] = 99
    assert ledger.verify()["valid"] is False
