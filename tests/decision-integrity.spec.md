# AKSI Decision Integrity test plan

Required before production claims:

1. Canonical serialization is deterministic regardless of object insertion order.
2. Signed packet verifies with its embedded public key.
3. One-byte payload mutation fails hash/signature verification.
4. Candidate mutation fails verification.
5. Policy/gate mutation fails verification.
6. Outcome mutation fails verification.
7. Wrong public key fails verification.
8. Parent linkage is preserved.
9. Reality/evidence linkage is preserved.
10. Independent `/verify/` performs verification without the signing private key.
11. Outcome receipts preserve decision_id/action_id linkage.
12. No action is executed merely by constructing an ActionRequest.

These tests are security/product acceptance criteria, not a cryptographic certification.
