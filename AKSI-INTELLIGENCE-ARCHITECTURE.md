# AKSI Intelligence Architecture

## New layer: Intelligence Orchestrator

AKSI now has a model-independent orchestration layer: `aksi-intelligence-orchestrator.js`.

It does not claim to be AGI and does not replace an ML model. Its purpose is to decide **how** a task should be processed before inference:

`TASK → PLAN → LOCAL INFERENCE → OPTIONAL QUANTUM EXPERIMENT → VERIFICATION → RESULT`

## Why this is different

Most front-end AI integrations choose a model first and send a prompt. AKSI instead exposes a task-level planning boundary so different runtimes can be selected according to capabilities and operating mode.

Supported modes:

- `auto` — select an appropriate registered adapter
- `local` — prefer device-local execution
- `offline` — no network dependency for the orchestration layer
- `hybrid` — allow local and remote components

## Model neutrality

`AKSI-MODEL-GATEWAY-1` provides adapters for WebLLM, Transformers.js, ONNX Web, BERT-family encoders, GPT-compatible gateways, and Python/Rust bridges. An adapter is only a capability declaration until a real runtime handler is registered.

## Quantum honesty

The quantum layer is a simulator. It can execute educational state-vector experiments such as Bell/Grover/QFT-style demonstrations, but it must not be represented as access to quantum hardware.

## Verification boundary

A cryptographic signature can establish integrity and attribution of a record. It does **not** establish that an AI statement is true. Verification therefore remains a separate stage with evidence, source and experiment inputs.

## Next evolution

1. Bind orchestrator events to `AKSI-VAI/1` evidence records.
2. Add deterministic task manifests and replay IDs.
3. Add encrypted offline queue and conflict resolution.
4. Add WebAuthn/passkey identity and capability-based permissions.
5. Add model benchmarking and automatic runtime selection.
6. Add signed, exportable execution receipts.
7. Add a policy firewall for tools, network access and data classes.

The architectural objective is **verifiable, local-first intelligence infrastructure**, not a claim that AKSI has invented a new foundation model or quantum computer.
