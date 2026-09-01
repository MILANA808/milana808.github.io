# AKSI Quantum Pipeline (Release 1.2)

## What runs in real time
Every chat answer goes through:

```
answer text
  → AKSI_QPIPE.processAnswer()
  → AKSI_QUANTUM.answerGate()   // state-vector circuit (3 qubits)
  → QCLI + Bloch sphere + circuit log
  → meta on the message bubble
```

This is a **real quantum simulation** (complex state vector, gates H/RY/RZ/CNOT, measurement probabilities, entropy, purity). It is **not** a physical quantum computer by itself.

## Backends

| Backend | Where | Needs |
|---------|-------|--------|
| `local-sv` (default) | Browser | Nothing — offline |
| `ibm-runtime` | IBM Quantum cloud | API token + network |

Switch in **Lab**:
- Backend: local
- Backend: IBM
- Paste token → Save

Token is stored only in `localStorage` (`aksi_ibm_token`).

## Hardware path
`AKSI_QUANTUM.runHardware()` is called when backend is `ibm-runtime`. Local sim **always** runs first so the UI never blocks. Hardware result attaches as `quantum.hardware` when the cloud job returns.

IBM browser CORS and auth may limit full job submission; the adapter is the correct product boundary for a future server-side proxy.

## API
```js
AKSI_QPIPE.processAnswer(query, answer)
AKSI_QPIPE.setBackend('local-sv' | 'ibm-runtime')
AKSI_QPIPE.status()
AKSI_QUANTUM.answerGate(query, answer)
AKSI_QUANTUM.setIbmToken(token)
```

## Honesty
- **local-sv** = ideal state-vector simulator (engineering-grade, deterministic from seed)
- **ibm-runtime** = path to real QPU when token + network + API allow
- QCLI is an integrity/confidence **index**, not a claim of consciousness
