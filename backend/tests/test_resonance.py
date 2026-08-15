from core.resonance import content_hash, generate_aksi_signature, verify_aksi_signature


def test_signature_is_deterministic():
    first = generate_aksi_signature("AKSI integrity", "test-secret")
    second = generate_aksi_signature("AKSI integrity", "test-secret")
    assert first == second
    assert len(first) == 64


def test_signature_verification_rejects_tampering():
    signature = generate_aksi_signature("original", "test-secret")
    assert verify_aksi_signature("original", signature, "test-secret")
    assert not verify_aksi_signature("tampered", signature, "test-secret")


def test_content_hash_is_public_and_deterministic():
    assert content_hash("AKSI") == content_hash("AKSI")
    assert content_hash("AKSI") != content_hash("AKSI!")
