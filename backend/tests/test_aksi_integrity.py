from core.aksi_integrity import IntegrityEvent, hmac_sha256, verify_chain, verify_hmac


def test_hmac_is_deterministic_and_verifiable():
    payload = {"message": "АКСИ", "lang": "ru", "version": 1}
    signature = hmac_sha256(payload, "test-secret")
    assert signature == hmac_sha256({"version": 1, "lang": "ru", "message": "АКСИ"}, "test-secret")
    assert verify_hmac(payload, signature, "test-secret")
    assert not verify_hmac({"message": "АКСИ!", "lang": "ru", "version": 1}, signature, "test-secret")


def test_chain_detects_payload_tampering():
    first = IntegrityEvent.create(0, "message", {"text": "hello"})
    second = IntegrityEvent.create(1, "response", {"text": "world"}, first.event_hash)
    assert verify_chain([first, second]) == (True, "chain valid")

    tampered = IntegrityEvent(1, second.event_type, {"text": "altered"}, second.previous_hash, second.content_hash, second.event_hash)
    ok, reason = verify_chain([first, tampered])
    assert not ok
    assert "content tampering" in reason
