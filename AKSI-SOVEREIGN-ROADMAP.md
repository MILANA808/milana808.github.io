# AKSI Sovereign AI — engineering roadmap

## Target architecture

`Surface → Policy → Model Gateway → Local/Remote Runtime → Evidence/Integrity → Diagnostics`

The gateway is provider-neutral. Models are adapters, not the product identity.

## Model/runtime expansion

- WebLLM/WebGPU — local LLM path.
- Transformers.js/WASM — portable local transformer path.
- BERT-family — encoder/embedding/classification slot through Transformers.js/ONNX.
- ONNX Runtime Web — portable inference target.
- GPT-compatible — provider-neutral HTTP gateway; credentials stay outside the public browser bundle.
- Python — local HTTP/WebSocket bridge for PyTorch/Transformers/custom models.
- Rust — WASM/native bridge for performance-sensitive runtimes.

Important: an adapter being listed does not mean every model is bundled or loaded by default. Actual weights, licenses, hardware support and runtime availability are checked at deployment time.

## Offline-first

1. Prefer local runtime.
2. Cache application shell and approved model assets where licensing permits.
3. Queue non-critical network actions while offline.
4. Never require cloud connectivity for local diagnostics, local memory or local proof verification.
5. Make network escalation explicit to the user/policy layer.

## Security baseline

- Web Crypto for browser-side cryptographic operations.
- Ed25519 for signatures where the selected implementation supports it.
- SHA-256 for content/hash-chain integrity.
- AES-GCM for local encrypted data where a key-management design is present.
- Passkeys/WebAuthn + device/session policy for strong authentication in production.
- RBAC/ABAC and policy gates for Enterprise/Sovereign editions.
- Threat modeling, dependency scanning, SAST/DAST and independent penetration testing before security claims.

A signature proves integrity/attribution of a signed record; it does not prove that an AI statement is true. Truth claims require evidence and verification.

## Quantum lab

The current browser quantum runtime is a **classical state-vector simulator**, not quantum hardware. Planned demonstrations:

- Bell-state preparation and measurement.
- CHSH correlation experiment.
- Grover-style amplitude amplification.
- Quantum Fourier Transform.
- Noise/decoherence visualization.
- Mapping AI candidate scoring to a clearly labeled experimental circuit.

No quantum-advantage claim should be made without reproducible benchmark evidence against a classical baseline.

## Product editions

### Enterprise
On-prem/private deployment, SSO, RBAC, audit, model gateway, policy controls and enterprise connectors.

### Sovereign
Local-first execution, controlled dependency/model supply chain, offline operation, auditable configuration and deployment profiles for local regulatory requirements.

### Finance
Data isolation, stronger authorization, key separation, immutable audit records and controlled model/tool permissions.

These are product profiles, not certifications. Regulatory compliance and certification must be demonstrated separately for each deployment and jurisdiction.

## Performance / stability gates

- Main-thread blocking budget and startup budget.
- Model load memory budget per device class.
- Offline smoke test.
- Network-loss/recovery test.
- Deterministic diagnostic report.
- Regression tests for proof verification and model adapter contracts.
- Security regression suite on every release.

## Next implementation order

1. Connect `AKSIModelGateway` to existing WebLLM runtime.
2. Add a real Transformers.js/ONNX adapter with explicit model manifests.
3. Add local Python/Rust bridge specifications and reference implementations.
4. Move authentication to WebAuthn/passkeys + policy engine.
5. Add encrypted local vault and key rotation.
6. Add signed AI Evidence Record (`AKSI-VAI/1`).
7. Expand quantum lab with reproducible experiments.
8. Add CI performance/security gates.

The goal is not to claim the most models. The goal is a stable control plane where models can be replaced without replacing identity, memory, policy, evidence and integrity layers.
