# AKSI Reality Layer

## Purpose

Reality Layer is the boundary between AKSI's cognitive/decision runtime and real-world state. It converts explicitly authorized browser/device observations into structured `RealityEvent` records.

```text
REAL WORLD
  ↓
sensors / APIs
  ↓
Reality Layer
  ↓
RealityEvent
  ↓
evidence + decision
  ↓
policy gate
  ↓
[action — future capability]
  ↓
outcome / receipt
```

## Current implementation

- geolocation observation (opt-in)
- camera permission probe (opt-in; stream is immediately stopped)
- microphone permission probe (opt-in; stream is immediately stopped)
- capability registry with local persistence
- structured World State
- local event history
- **observe-only**: no autonomous external action API

## Security boundary

The model must not receive unrestricted browser/device authority. Capabilities are explicit, revocable, and separate from reasoning. A future action capability must require a policy decision and an authorization context before execution.

## RealityEvent contract

Required fields:

`id`, `version`, `kind`, `source`, `ts`, `observation`, `confidence`, `evidence`, `policy`, `authorization`, `action`, `result`, `parent_event`, `cryptographic_seal`.

## Non-claims

This module does not prove that an observation is true. Browser permissions establish access, not factual truth. Confidence is an engineering signal and must not be represented as certainty.

This is an architecture/MVP layer, not a certified safety system or autonomous agent controller.
