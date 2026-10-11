# AKSI System Map & Recovery Plan
**Status:** engineering audit snapshot · 2026-10-11  
**Canonical product:** `MILANA808/milana808.github.io`  
**Canonical execution plane:** `MILANA808/Milana-backend`

This file consolidates the architecture decisions recovered from repository documentation and project history. It is a living index, not a claim that every described capability is already implemented or deployed.

## 1. The product is one system, not a pile of demos

Canonical flow:

`Human → Intent → Policy/Gate → Orchestrator → Model/Tools → Evidence → Verification → DecisionPacket → Signed Receipt → Memory → Outcome/Replay`

The user should see one chat and one coherent status surface. Runtime selection, agent tasks, tools, local/remote models, evidence, crypto, memory, and experiments are internal capabilities surfaced as tools only when useful. Modules may remain separate files/packages, but they must share one protocol and lifecycle.

### Canonical ownership
- **Product/control plane:** `milana808.github.io` — UI, public contracts, manifests, evidence protocol, browser-local/offline behavior, tests and documentation.
- **Execution plane:** `Milana-backend` — API, agent workers, discovery/web/browser adapters, durable task state, model gateway and server-side signing.
- **Optional runtimes:** local WebLLM/WebGPU, Transformers.js/ONNX/WASM, Python/Rust bridge, remote model adapters. Adapters are capabilities only when tests prove them.
- **Experimental/legacy:** `AKSI-`, `AKSI-TEST`, `AKSI-TEST-1`, `AKSI-GROK-HYBRID`, `AKSI-GROK-HYBRID-v1`, `Agi`, `SuperAGI`, `glorious-potato`, `codex`, `openai-cookbook`, `gpt-oss-safeguard`, `aksi_apps`, `Aksi-love`, `Bulat`, `Test-site`, `milana_site`, and `MILANA808` profile repo. These are sources to inspect selectively, not code to blindly merge. Respect upstream licenses and provenance.
- **Existing concepts to preserve:** AKSI Core v3; Deep Causality Engine; EQS-Layer++; Real-World Intent Mapper; Reflective Autonomy; Memory_AKSI; DIMAX/DIMAX-U; QGroove/QConsensus/QMeaningTransform; AKSI-Lambda; AKSI Globe; Superpose; WebLLM/local AI; Math/Quantum Lab; agent browser/web execution; personal identity and human approval.

## 2. Shared contracts — one source of truth
1. **Intent/Task:** stable task ID, objective, allowed tools/data, budget, deadline, approval requirements.
2. **Evidence:** source URI, retrieval time, content hash, extraction method, trust label, and whether independently checked.
3. **DecisionPacket:** candidates, evidence references, scores, uncertainty, abstention reason, policy outcome, reproducibility seed.
4. **AKSI-VAI/1 receipt:** protocol/version, agent/model/runtime, intent/context/result hashes, source/action/experiment refs, status, previous event, key ID, signature and verification metadata.
5. **Memory:** one logical memory API with scoped user/device identity, explicit retention, export/delete, encrypted sensitive records, provenance and conflict resolution.
6. **Verifier:** separate deterministic verifier. Hash/signature success means integrity/authenticity relative to a key—not factual truth, safe behavior, or correctness.
7. **Status/diagnostics:** report each capability as `ready`, `degraded`, `offline`, `unconfigured`, or `failed`, with the last tested time and a real error. Never display “online/healthy” just because the UI loaded.
8. **Model gateway:** provider-neutral adapter contract; no credentials in public browser code. Local first; remote escalation explicit and policy-gated.

## 3. Confirmed issues from the 2026-10-11 source/CI inspection
### Critical — private signing keys are exportable into browser storage
Search found private JWKs persisted to `localStorage` in:
- `integrity/index.html` (`privJwk`)
- `permit/aksi-permit.js` (`aksi_permit_priv_jwk`)
- `aksi-seal.js` (`aksi:seal:ecdsa:v1`)
- `aksi-capsule.js`
- `aksi-pq.js` (ECDH/ECDSA private JWKs)
- `mandate/aksi-mandate.js`
- `aksi-trust.js` (stored/imported private material)
- `lab/index.html` exports a PKCS#8 private key in an experiment.

This is not acceptable for a high-assurance identity. Any successful same-origin XSS or compromised dependency can read extractable key material. Treat existing browser keys as potentially exposed; do not reuse them for valuable identity, money, or production authorization. Migrate to non-extractable keys held in IndexedDB where supported, or server/HSM/KMS-held keys; prefer WebAuthn/passkeys for authentication and require explicit re-enrolment/rotation. Remove legacy plaintext private-key records after a safe migration/export decision. Do not claim this is fixed until each path has a regression test.

### Critical — a custom “PQ commitment” is not post-quantum cryptography
`aksi-seal.js` labels a custom SHA-256/SHA-512 iterative hash construction as a “Hybrid Post-Quantum Attestation” and sets `pq_hybrid_seal: true`. A custom hash loop is not ML-DSA, ML-KEM, a standardized post-quantum signature, or a reviewed hybrid protocol. Until replaced and independently tested, this claim must be treated as unsupported; do not use this seal as a post-quantum security guarantee.

### Critical — backend proof endpoint previously asserted verification without verifying a signature
The backend `GET /aksi/proof` previously returned `verified: true` alongside a placeholder string, without cryptographic verification. The route now creates an Ed25519-signed proof and verifies the signature before reporting the result. The endpoint explicitly limits the claim to signature integrity, not factual truth. Regression coverage was added in `Milana-backend/tests/test_security_contract.py`; CI is running for the change.

### High — server signing identity may be ephemeral
The backend signer generated an Ed25519 key but only persisted it when a key directory or persistence flag was configured. A free/ephemeral host can therefore rotate the public identity across restarts. The backend now accepts `AKSI_PRIVATE_KEY_B64` as a stable PKCS#8 PEM/DER key injected through the host's secret manager and reports `signing_key_mode` from `/health`. The Render blueprint declares this as a secret environment variable. **Deployment still needs a stable key configured in the Render dashboard**; without it, health reports `ephemeral` and identity continuity is not guaranteed.

### High — duplicate state/proof concepts
- `app.js` uses `AKSI_COGNITIVE_LEDGER_V1`; another prior implementation/plan refers to `AKSI_CORE_LEDGER_V3`.
- Bond, Trust, Seal, Permit, Capsule, Mandate, PQ, Integrity and Lab each implement overlapping receipt/key behavior.
- This creates divergent identity, storage, canonicalization, signing and verification rules. Consolidate behind one `AKSI Crypto Provider` and one `AKSI-VAI/1` receipt verifier; preserve old formats as read-only import adapters until migration tests pass.

### High — CI currently contains a known false failure
The `AKSI Unified Core smoke tests` workflow checks `grep -q 'href="/unified/"' index.html`, but the current home page has no such exact link. The unified page already references Core v3, Superpose, Quantum and HRR. This stale navigation assertion fails the unified smoke job while several other checks pass. A home-page link to the unified entrypoint is required; then rerun and confirm the workflow green.

### High — automated failure noise hides useful incidents
The home repository has a long sequence of open `AKSI Autopilot failure` issues (#19 and onward, including #120), while the newest run at the time of inspection reports the Autopilot job successful. Group recurring failures by root cause and deduplicate by workflow + normalized error + commit; do not open a new issue for every retry.

### Deployment truth
The latest inspected backend CI/deploy-check workflows are green at source commit `8cf6a7e`; the home repository's latest Pages build, runtime smoke, Core v3 and Math/Quantum checks are green at `f89d954`, but Unified Core smoke fails for the stale assertion described above. A green GitHub workflow proves that workflow passed—not that Render/Replit is reachable or the live app is fully healthy. Runtime status must be verified with live HTTP checks and user-visible diagnostics.

## 4. Cryptography: strong, standard, layered
No cryptography protects “against everything.” Security depends on keys, endpoints, code integrity, permissions, backups, and people as well as algorithms. Do not invent a new cipher or home-grown post-quantum algorithm.

- **Transport:** HTTPS/TLS; strict origin allowlist; no wildcard CORS for privileged APIs; HSTS and secure headers where hosting permits.
- **Authentication:** WebAuthn/passkeys; short-lived sessions; least privilege; explicit, task-scoped approval for external/browser actions; rate limits and replay protection.
- **Classical signatures:** Ed25519 for signed receipts where the runtime/library is supported. P-256 only as a clearly identified compatibility fallback; never silently treat algorithms/keys as interchangeable.
- **Hashing:** SHA-256 for content hashes and event-chain links. Use a specified canonical serialization (RFC 8785/JCS or a tightly specified deterministic encoding), domain separation, protocol version and algorithm/key IDs.
- **Encryption at rest:** AES-256-GCM with unique random 96-bit nonce per key, authenticated metadata, and key rotation. Never reuse a nonce under the same key. Derive keys with a reviewed KDF and explicit parameters; do not store the password or raw vault key beside ciphertext.
- **Post-quantum readiness:** use NIST-standardized ML-KEM-768 for key establishment and ML-DSA-65 for signatures only through a maintained, audited implementation and a versioned hybrid protocol. Browser support is not universal; do not ship a homemade hybrid. Define classical + PQ dual signatures/key establishment as a future tested profile, not an existing guarantee.
- **Key lifecycle:** non-exportable/device-protected keys where possible; separate signing, encryption and authentication keys; rotation, revocation, backup/recovery, key IDs, expiry, and a documented lost-device path.
- **Audit evidence:** append-only hash-linked events, signed checkpoints, independent verifier, external timestamp/transparency anchor when needed, and backups. A local hash chain alone can be rewritten by an attacker controlling the browser/storage.
- **Supply chain:** lock dependency versions, scan dependencies, pin GitHub Actions to full commit SHAs, use secret scanning, SAST/DAST and independent penetration tests before security claims.
- **Claims:** signature = signed bytes tied to a key; hash = content integrity; neither proves the statement is true or the device/person is uncompromised.

## 5. Consolidation plan — in this order
1. Fix CI contract drift and make the canonical entrypoint discoverable.
2. Add one capability registry and health contract; fail visibly on unavailable routes rather than hiding exceptions.
3. Implement shared `AKSI-VAI/1` types/canonicalization and cross-runtime conformance tests.
4. Replace plaintext localStorage private-key persistence; add key rotation/re-enrolment and tests for every legacy key store.
5. Unify proof/event ledger behind one API; legacy modules call the shared provider rather than reimplementing crypto.
6. Normalize frontend API base, timeout, failover and backend capability discovery in one gateway.
7. Consolidate CI into required contract tests + syntax/security/deployment smoke tests; deduplicate autopilot issues.
8. Run live end-to-end tests: chat, memory, web research, task approval, task completion, evidence receipt, signature verification, export, offline recovery and key rotation.
9. Only after repeatable evidence, label features production-ready.

## 6. Acceptance criteria
- One public entrypoint and one user-facing chat.
- One task/decision/evidence/receipt contract shared by browser and backend.
- No plaintext private keys in localStorage or public repository.
- Independent receipt verification succeeds after export and fails after a single-byte tamper.
- The app accurately reports backend unreachable/degraded and works in local/offline mode where configured.
- CI green, with no skipped syntax checks after an earlier assertion failure.
- Every advertised capability has an executable test and a clear failure state.
