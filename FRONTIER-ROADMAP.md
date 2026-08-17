# AKSI Frontier Architecture

## Goal

AKSI integrates modern AI, browser, cryptography, agent interoperability and verification capabilities without claiming that an unavailable capability exists.

## Implemented / usable now

- Local-first browser execution
- Web Crypto / SHA-256
- IndexedDB local storage
- Ed25519 local identity path
- Proof Ledger / Proof Graph
- Decision Passport
- Public verification
- 3-qubit classical state-vector simulator (AKSI-Q)
- Capability detection (`aksi-frontier.js`)
- Optional Web/Wikipedia path

## Frontier integration targets

### 1. On-device acceleration

Use WebGPU for local model inference, embeddings and verification workloads when the browser exposes a compatible adapter. WebGPU is a W3C Candidate Recommendation Draft as of May 2026. Do not assume availability; feature-detect it.

### 2. WebAssembly

Use WASM for portable deterministic compute and future local cryptographic/ML kernels. Keep WASM modules sandboxed and versioned.

### 3. Agent interoperability

Define adapters for MCP (agent-to-tool/resource) and A2A (agent-to-agent). AKSI should act as a policy/proof boundary between agents, not blindly execute their requests. A2A 1.0 is an open interoperability protocol; MCP and A2A solve complementary problems.

### 4. Verifiable AI artifacts

Map Decision Passport to interoperable verifiable-data concepts where appropriate. W3C VC Data Integrity 1.0 is a Recommendation; 1.1 is a 2026 Working Draft. Ed25519-based data-integrity suites are part of the current W3C work.

### 5. Post-quantum crypto agility

Prepare an algorithm-agility interface for ML-KEM, ML-DSA and SLH-DSA. Do not implement cryptography from scratch in application JavaScript and do not claim PQC support until a reviewed implementation is bundled and tested. NIST finalized FIPS 203/204/205 in 2024 and continues PQC migration work.

### 6. AI evaluation

Add deterministic regression suites for hallucination handling, provenance, uncertainty, refusal, prompt injection, tool authorization and reproducibility. A green UI state must correspond to a tested property.

### 7. Privacy

Local-first by default. Explicit network boundary. Redact/minimize sensitive data before external calls. Maintain an auditable network-policy decision for each external request.

### 8. Agent safety

Every consequential tool action must have: capability declaration, policy decision, user authorization when required, input/output receipt, reversibility classification and proof entry.

## Non-goals

- No claim of AGI.
- No claim of consciousness.
- No claim of quantum advantage from a classical simulator.
- No claim that SHA-256 proves factual truth.
- No claim of native PQC when the browser does not provide it.
- No automatic high-impact decisions without appropriate human control.

## Design rule

**If AKSI cannot demonstrate a capability at runtime, it must display `NOT ACTIVE` rather than a marketing label.**
