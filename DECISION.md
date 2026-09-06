# AKSI Decision Runtime v1.0

**Product:** local decision agent (not a chat toy).

## Promise
On any query:
- **answer** — offline response
- **anti** — risks / counterpoints
- **scores** — AKSI, EQS, Φ, QCLI
- **gate** — accept / reject into knowledge
- **seal** — FNV integrity chain
- **verify** — hash check on device

Server **OFF**. LLM **optional**.

## Formula
`AKSI = (A × I × S) × (1 + 0.4√n)`

## Live
https://milana808.github.io/decision/

## API
```js
const p = AKSI_DECISION.decide("Кто ты?");
AKSI_DECISION.verify(p.proof);
AKSI_DECISION.exportProof(p);
```

Contact: aksilove@internet.ru
