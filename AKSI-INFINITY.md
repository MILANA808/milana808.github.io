# AKSI Infinity

**Product direction:** a personal, model-independent layer for owning and controlling AI agents.

## Core thesis

> Models change. Ownership of the agent should not.

AKSI Infinity is the product layer that keeps **identity, memory, policy, evidence and decision history** stable while the underlying models and tools can change.

## Architecture

```text
USER
  ↓
IDENTITY
  ↓
INTENT → MEMORY → MODEL GATEWAY
  ↓              ↓
POLICY ← EVIDENCE / SOURCES
  ↓
DECISION
  ↓
RECEIPT / SEAL
  ↓
PORTABLE AGENT STATE
  ↓
optional: TOOLS · DEVICES · OTHER AGENTS
```

## What already exists in AKSI

- browser-local runtime and memory
- optional WebLLM/WebGPU path
- encrypted local vault direction
- decision gate and Decision Receipt surfaces
- SHA-256 / Ed25519 integrity infrastructure
- `AKSI-VAI/1` provenance envelope
- discovery through `/.well-known/aksi.json`
- experimental neural/connectomics and quantum-simulation labs

## What Infinity must make real next

1. **AKSI Core package** — one canonical runtime API.
2. **Model Gateway** — interchangeable local/remote model adapters.
3. **Portable Identity** — stable agent identifier plus passkey/WebAuthn path.
4. **Portable Memory** — export/import independent of provider.
5. **Policy Engine** — explicit permissions for network, tools and actions.
6. **Evidence + Receipt** — reproducible, signed events where keys are available.
7. **SDK** — embed an AKSI agent into another product.
8. **Network protocol** — agent↔agent only after the single-agent product is useful.

## Honest boundary

Infinity is a product direction and prototype surface, not a finished general-purpose agent network. Cryptographic seals establish integrity/attribution of a recorded event; they do not prove that the event's content is true. Quantum modules remain classical simulations unless a real QPU integration is demonstrated.

## Product forms

- **Personal:** your AI follows your identity and memory across models.
- **Business:** white-label agent runtime for a company.
- **Enterprise:** policy, audit, evidence and integrations.
- **Network:** optional interoperability between independently owned agents.

## The intended end state

AKSI is no longer sold as “a smarter chatbot.” It is sold as the **control and trust layer around an agent**.

The model is the motor.

**AKSI is the identity, keys, memory, rules, evidence and logbook.**
