# ADIA 2.0 — Resonance Decision Engine

**AKSI Decision Integrity Algorithm**  
**Classification:** Core IP · Sovereign Agent Layer  
**Runtime:** `aksi-algorithm.js` · wired into Mind on every answer  
**Contact:** aksilove@internet.ru  
**Live:** https://milana808.github.io

---

## Why this is ahead of typical stacks

Most “AI products” are a UI over a cloud API.

ADIA 2.0 is a **named, offline-first decision algorithm**:

1. **Measure** the answer (Shannon H, QCLI, H_eff)
2. **Score** with multi-factor EQS (source trust · coherence · memory resonance · maturity)
3. **Fuse** multi-engine candidates when available
4. **Gate** weak answers by policy threshold
5. **Seal** into a hash-linked ledger (verifiable offline)
6. **Accumulate** AKSI formula over interaction count n

No mainstream browser agent ships this as a **single measurable standard** with consent-bound networking and user-owned memory ranking.

This is not a claim of AGI. It is a claim of **instrumented sovereign decision integrity**.

---

## Core symbols

| Symbol | Meaning |
|--------|---------|
| H | Shannon entropy of text |
| QCLI | H / log2(min(256, alphabet)) in [0,1] |
| H_eff | H × unique words / words |
| EQS | Composite quality in [0,100] |
| AKSI | (A × I × S) × (1 + 0.4√n) |
| R | Reliability prior |
| C | Coherence heuristic |
| A | Age/maturity prior |
| S_src | Source trust (offline preferred) |
| M | Memory resonance (query–answer overlap) |

---

## EQS 2.0

EQS = 100 · clip(0.22·min(1,H/5) + 0.20·R + 0.18·C + 0.10·A + 0.18·S_src + 0.12·M)

### Source trust priors (offline-first)

| Source | Trust |
|--------|-------|
| memory | 0.95 |
| brain | 0.92 |
| webllm | 0.90 |
| neuro | 0.88 |
| ollama | 0.80 |
| core local | 0.85 |
| web / core net | 0.50–0.55 |
| cloud llm | 0.45 |
| fallback | 0.30 |

---

## AKSI growth formula

AKSI = (A × I × S) × (1 + 0.4√n)

- I = EQS/100
- n = sealed decisions on device
- Structure S higher when answer is offline

---

## Decision loop

```
query
  → engines (Brain / WebLLM / Neuro / Web / Ollama)
  → candidates[]
  → rank by EQS + source + quantum meta
  → policy gate (EQS ≥ θ)
  → seal into ADIA ledger
  → return text + metrics (EQS · QCLI · H · AKSI · resonance)
```

---

## Integrity chain

Each sealed decision links prev hash → FNV1a64(canonical). Verify offline O(n). Genesis: GENESIS.

---

## Runtime API

```js
AKSI_ALGORITHM.evaluate(query, answerOrCandidates, { seal: true, quantum })
AKSI_ALGORITHM.eqs2(text, { source, memoryResonance })
AKSI_ALGORITHM.verify()
AKSI_ALGORITHM.status()
```

Aliases: ADIA, AKSI_ADIA. Mind calls evaluate on every answer.

---

## Versioning

| Version | Notes |
|---------|--------|
| ADIA 1.0 | H, QCLI, H_eff, EQS four-term, retrieve, chain |
| **ADIA 2.0** | Source trust · memory resonance · multi-candidate rank · AKSI formula · dual hash seal · Mind integration |

*AKSI — the model is the motor; ADIA is the instruments and the seal.*
