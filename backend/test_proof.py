from proof import build_proof_record, verify_proof


def test_hash_proof_round_trip():
    proof = build_proof_record(
        question="Что такое AKSI?",
        answer="Проверяемый ИИ-интерфейс.",
        provider="test",
        model="test-model",
        claims=[{"text": "Это тест", "status": "unverified"}],
        evidence=[],
    )
    result = verify_proof(proof)
    assert result["hash_valid"] is True
    assert result["integrity_status"] == "VALID"


def test_tamper_is_detected():
    proof = build_proof_record(
        question="Q",
        answer="A",
        provider="test",
        model="test-model",
    )
    proof["record"]["answer"] = "tampered"
    result = verify_proof(proof)
    assert result["hash_valid"] is False
    assert result["integrity_status"] == "INVALID"
