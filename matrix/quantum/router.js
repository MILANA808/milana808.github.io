/**
 * AKSI MATRIX — QuantumRouter
 * Deterministic text → state-vector → circuit (H / phase) → answerGate weights.
 * Classical simulation only — not a physical QPU.
 */

const DIM = 64;

function fnv1a(str) {
  let h = 0x811c9dc5;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalize(vec) {
  let sum = 0;
  for (let i = 0; i < vec.length; i++) sum += vec[i] * vec[i];
  const n = Math.sqrt(sum) || 1;
  const out = new Float32Array(vec.length);
  for (let i = 0; i < vec.length; i++) out[i] = vec[i] / n;
  return out;
}

function softmax3(a, b, c) {
  const m = Math.max(a, b, c);
  const ea = Math.exp(a - m);
  const eb = Math.exp(b - m);
  const ec = Math.exp(c - m);
  const s = ea + eb + ec || 1;
  return [ea / s, eb / s, ec / s];
}

export class QuantumRouter {
  constructor(dim) {
    this.dim = dim || DIM;
    this.lastVector = null;
    this.lastGate = null;
  }

  textToState(text) {
    const s = String(text || '').toLowerCase().trim();
    const dim = this.dim;
    const vec = new Float32Array(dim);
    const seed0 = fnv1a(s);
    const rng = mulberry32(seed0);

    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      const idx = (c * 131 + i * 17) % dim;
      vec[idx] += 1;
      const idx2 = ((c << 3) ^ i) % dim;
      vec[idx2] += 0.5;
    }

    const tokens = s.split(/[^\p{L}\p{N}]+/u).filter((t) => t.length > 0);
    for (let t = 0; t < tokens.length; t++) {
      const h = fnv1a(tokens[t]);
      const i0 = h % dim;
      const i1 = (h >>> 8) % dim;
      const i2 = (h >>> 16) % dim;
      vec[i0] += 1.2;
      vec[i1] += 0.8;
      vec[i2] += 0.4;
    }

    for (let i = 0; i < dim; i++) {
      const phase = ((seed0 + i * 2654435761) >>> 0) / 4294967296;
      vec[i] += 0.05 * Math.sin(2 * Math.PI * phase);
      vec[i] += 0.02 * (rng() - 0.5);
    }

    const out = normalize(vec);
    this.lastVector = out;
    return out;
  }

  hadamardLayer(vec) {
    const out = new Float32Array(vec.length);
    const s2 = Math.SQRT1_2;
    for (let i = 0; i + 1 < vec.length; i += 2) {
      const a = vec[i];
      const b = vec[i + 1];
      out[i] = s2 * (a + b);
      out[i + 1] = s2 * (a - b);
    }
    if (vec.length % 2 === 1) out[vec.length - 1] = vec[vec.length - 1];
    return out;
  }

  phaseShiftLayer(vec, query) {
    const out = new Float32Array(vec.length);
    const seed = fnv1a(query || '');
    for (let i = 0; i < vec.length; i++) {
      const theta = (((seed + i * 9973) % 10000) / 10000) * Math.PI * 2;
      const c = Math.cos(theta);
      const s = Math.sin(theta * 0.5);
      const neighbor = vec[(i + 1) % vec.length];
      out[i] = vec[i] * c + 0.15 * neighbor * s;
    }
    return normalize(out);
  }

  applyCircuit(vec, query) {
    let v = vec;
    v = this.hadamardLayer(v);
    v = this.phaseShiftLayer(v, query);
    v = this.hadamardLayer(v);
    this.lastVector = v;
    return v;
  }

  answerGate(stateVec, query) {
    const v = stateVec || this.lastVector || this.textToState(query || '');
    const dim = v.length;
    const third = Math.floor(dim / 3);

    let e0 = 0, e1 = 0, e2 = 0;
    for (let i = 0; i < dim; i++) {
      const p = v[i] * v[i];
      if (i < third) e0 += p;
      else if (i < 2 * third) e1 += p;
      else e2 += p;
    }

    const q = String(query || '').toLowerCase();
    let biasLocal = 0, biasDeep = 0, biasSafe = 0;
    if (/запомни|remember|факт|memory|память/i.test(q)) biasLocal += 0.8;
    if (/кто ты|что ты|формула|gate|adia|aksi/i.test(q)) biasLocal += 0.5;
    if (/почему|как устроен|архитектур|сложн/i.test(q)) biasDeep += 0.4;
    if (/удали|секрет|пароль|hack|взлом/i.test(q)) biasSafe += 1.2;
    if (q.length < 3) biasSafe += 0.6;

    const logitLocal = Math.log(e0 + 1e-8) * 2.2 + biasLocal + Math.abs(v[0]) * 0.5;
    const logitDeep = Math.log(e1 + 1e-8) * 2.0 + biasDeep + Math.abs(v[1]) * 0.4;
    const logitSafe = Math.log(e2 + 1e-8) * 2.0 + biasSafe + (1 - Math.abs(v[2])) * 0.3;

    const [wLocal, wDeep, wSafe] = softmax3(logitLocal, logitDeep, logitSafe);
    const weightsArr = [wLocal, wDeep, wSafe];
    let entropy = 0;
    for (let i = 0; i < 3; i++) {
      if (weightsArr[i] > 1e-12) entropy -= weightsArr[i] * Math.log2(weightsArr[i]);
    }
    const maxH = Math.log2(3);
    const QCLI = 1 - entropy / maxH;

    const gate = {
      weights: {
        Local_RAG_Weight: wLocal,
        Deep_LLM_Weight: wDeep,
        Safe_Gate_Weight: wSafe
      },
      energies: { e0, e1, e2 },
      entropy,
      QCLI,
      route:
        wSafe >= wLocal && wSafe >= wDeep
          ? 'safe'
          : wLocal >= wDeep
            ? 'local_rag'
            : 'deep_local_hook',
      dim,
      queryHash: fnv1a(q).toString(16)
    };
    this.lastGate = gate;
    return gate;
  }

  getAmplitudes() {
    if (!this.lastVector) return new Float32Array(this.dim);
    return this.lastVector;
  }
}

export default QuantumRouter;
