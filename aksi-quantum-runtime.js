(function () {
  "use strict";

  // AKSI Quantum Runtime is a real local state-vector simulator.
  // It does not claim quantum hardware or quantum advantage.
  // Its purpose is to make every AI request pass through an inspectable
  // probabilistic circuit before the response is selected/generated.

  const VERSION = "AQRT-1.0";
  const Q = 3;
  const N = 1 << Q;
  const encoder = new TextEncoder();

  function normalize(s) {
    return String(s || "").toLowerCase().normalize("NFKC").trim();
  }

  async function hashBytes(bytes) {
    const d = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(d)).map(x => x.toString(16).padStart(2, "0")).join("");
  }

  async function hashText(text) { return hashBytes(encoder.encode(text)); }

  function zeroState() {
    const s = new Float64Array(N * 2);
    s[0] = 1;
    return s;
  }

  function applySingle(state, qubit, matrix) {
    const bit = 1 << qubit;
    for (let base = 0; base < N; base += bit << 1) {
      for (let off = 0; off < bit; off++) {
        const a = base + off;
        const b = a + bit;
        const ar = state[a * 2], ai = state[a * 2 + 1];
        const br = state[b * 2], bi = state[b * 2 + 1];
        state[a * 2] = matrix[0] * ar - matrix[1] * ai + matrix[2] * br - matrix[3] * bi;
        state[a * 2 + 1] = matrix[0] * ai + matrix[1] * ar + matrix[2] * bi + matrix[3] * br;
        state[b * 2] = matrix[4] * ar - matrix[5] * ai + matrix[6] * br - matrix[7] * bi;
        state[b * 2 + 1] = matrix[4] * ai + matrix[5] * ar + matrix[6] * bi + matrix[7] * br;
      }
    }
  }

  function applyCNOT(state, control, target) {
    const c = 1 << control, t = 1 << target;
    for (let i = 0; i < N; i++) if ((i & c) && !(i & t)) {
      const j = i | t;
      for (let k = 0; k < 2; k++) {
        const x = state[i * 2 + k]; state[i * 2 + k] = state[j * 2 + k]; state[j * 2 + k] = x;
      }
    }
  }

  const SQRT_HALF = Math.SQRT1_2;
  const G = {
    H: [SQRT_HALF, 0, SQRT_HALF, 0, SQRT_HALF, 0, -SQRT_HALF, 0],
    X: [0, 0, 1, 0, 1, 0, 0, 0],
    Y: [0, 0, 0, -1, 0, 1, 0, 0],
    Z: [1, 0, 0, 0, -1, 0, 0, 0]
  };

  function probabilities(state) {
    const p = [];
    for (let i = 0; i < N; i++) p.push(state[i * 2] ** 2 + state[i * 2 + 1] ** 2);
    return p;
  }

  function entropy(p) {
    return -p.reduce((sum, x) => sum + (x > 1e-12 ? x * Math.log2(x) : 0), 0);
  }

  function tokens(q) {
    return normalize(q).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  }

  function encode(text) {
    const s = normalize(text);
    const bytes = encoder.encode(s);
    let a = 0, b = 0, c = 0;
    for (let i = 0; i < bytes.length; i++) {
      const v = bytes[i];
      if (i % 3 === 0) a ^= v;
      else if (i % 3 === 1) b ^= v;
      else c ^= v;
    }
    return [a & 7, b & 7, c & 7];
  }

  function circuit(query) {
    const bits = encode(query);
    const state = zeroState();
    // Input-dependent preparation.
    bits.forEach((v, q) => { if (v & 1) applySingle(state, q, G.X); applySingle(state, q, G.H); });
    applyCNOT(state, 0, 1);
    applyCNOT(state, 1, 2);
    if (bits[0] & 2) applySingle(state, 0, G.Z);
    if (bits[1] & 2) applySingle(state, 1, G.X);
    if (bits[2] & 2) applySingle(state, 2, G.Z);
    applyCNOT(state, 2, 0);
    const p = probabilities(state);
    const ranked = p.map((probability, basis) => ({ basis, probability }))
      .sort((a, b) => b.probability - a.probability);
    return { state, probabilities: p, ranked, entropy: entropy(p), inputBits: bits };
  }

  function intent(result, query) {
    const s = normalize(query);
    const categories = {
      identity: ["кто", "акси", "identity", "кто ты"],
      trust: ["proof", "доказ", "провер", "чест", "verify", "ledger"],
      memory: ["памят", "memory", "запом", "вспомни"],
      quantum: ["квант", "кубит", "quantum", "bell", "суперпози"],
      architecture: ["архитект", "ядро", "core", "система", "stack"],
      help: ["помог", "help", "умеешь", "как"]
    };
    const scores = {};
    Object.keys(categories).forEach(k => {
      scores[k] = categories[k].reduce((n, word) => n + (s.includes(word) ? 1 : 0), 0);
    });
    const peak = result.ranked[0].basis;
    // Quantum output breaks ties / adds a deterministic circuit-derived prior.
    const names = Object.keys(scores);
    names.forEach((name, i) => { scores[name] += result.probabilities[(peak + i) % N] * 0.25; });
    const ranked = names.sort((a, b) => scores[b] - scores[a]);
    return { label: ranked[0] || "unknown", scores, ranked };
  }

  async function run(query) {
    const started = performance.now();
    const circuitResult = circuit(query);
    const classification = intent(circuitResult, query);
    const inputHash = await hashText(normalize(query));
    const result = {
      schema: "AKSI-QUANTUM-INFERENCE-1",
      runtime: VERSION,
      input_hash: inputHash,
      qubits: Q,
      simulator: "local-state-vector",
      shots: 1,
      input_bits: circuitResult.inputBits,
      probabilities: circuitResult.probabilities.map(x => Number(x.toFixed(8))),
      top_states: circuitResult.ranked.slice(0, 4).map(x => ({ basis: x.basis.toString(2).padStart(Q, "0"), probability: Number(x.probability.toFixed(8)) })),
      entropy: Number(circuitResult.entropy.toFixed(8)),
      intent: classification.label,
      intent_scores: classification.scores,
      latency_ms: Number((performance.now() - started).toFixed(3)),
      hardware: "classical-browser-simulator"
    };
    result.trace_hash = await hashText(JSON.stringify(result));
    return result;
  }

  window.AKSIQuantum = { version: VERSION, qubits: Q, run, circuit, probabilities };
  window.dispatchEvent(new CustomEvent("aksi:quantum-ready", { detail: { version: VERSION, qubits: Q } }));
})();
