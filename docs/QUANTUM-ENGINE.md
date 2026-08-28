# AKSI Quantum Engine v2

State-vector simulator (browser IIFE).

## API

```js
const c = AKSI_QUANTUM.create(2);
c.h(0).cnot(0, 1);
c.probs();           // [0.5,0,0,0.5]
c.sample(1024);
c.bloch(0);
AKSI_QUANTUM.chsh(4096);
AKSI_QUANTUM.shot("query"); // LIVE path
```

## Gates
I X Y Z H S T Rx Ry Rz Phase · CNOT CZ SWAP · CCX

## Limits
1…8 qubits · exact unitary · no noise model

## Tests (node)
Bell Φ+ · GHZ-3 · CHSH |S|≈2.81
