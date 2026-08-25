# AKSI Decision Integrity Algorithm (ADIA) v1.0

**Classification:** Core IP — Sovereign Agent Layer  
**Status:** Reference-stable  
**License:** Proprietary (AKSI Studio / Business / Enterprise)  
**Contact:** aksilove@internet.ru  

---

## 0. Why this is the product

Apps are copied in weeks.  
**Named, versioned algorithms with a protocol envelope** are what infrastructure companies are valued on.

ADIA is the computational heart of AKSI:

1. **Quality of a thought** (QCLI, H_eff, EQS)
2. **Retrieval over owned memory** (stem + intent + overlap)
3. **Integrity chain** (hash-linked signed decisions)
4. **Agent identity binding** (DID + fingerprint)

The chat UI is a demo. **ADIA + Agent-v1 is the asset.**

---

## 1. EQS — Agent Quality Score

```
EQS = 100 × clip( 0.30·(H/5) + 0.35·R + 0.25·C + 0.10·A )
```

H = Shannon entropy of text. R, C, A ∈ [0,1] (reliability, coherence, maturity).

Defaults when history unknown: R=0.85, C=0.80, A=0.70.

## 2. QCLI / H_eff

- QCLI: H normalized by log2(alphabet size)
- H_eff: H × (unique words / total words)

## 3. Memory retrieval

Tokenize → stem → stop-word drop → overlap score + substring boost. Prefer user memory over static KB.

## 4. Integrity chain

Append-only events with prev_hash, payload hash, EQS. Genesis prev = GENESIS. Offline verifiable.

## 5. Commercial

Studio $497 · Business $4,900 · Enterprise from $25,000  
aksilove@internet.ru

Public: https://milana808.github.io/algorithm.html
