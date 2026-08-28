# AKSI LIVE Architecture

```
Query
  → AKSI_QUANTUM.shot (2-qubit |ψ⟩, Resonance seed)
  → route by resonance
      high → Brain → Core → Neuro → LLM
      low  → Core → Brain → Neuro → LLM
  → AKSI_TRUST.verify_response
  → UI (meta: q:bits · trust:level · footer ⟨QSim⟩)
```

## Facade

```js
AKSI.think(q)
AKSI.status()
AKSI.quantum(q)
AKSI.modules()
```

## Modules
quantum, brain, trust, one, core, llm, pq, neuro, relay, p2p, mesh

Contact: aksilove@internet.ru
