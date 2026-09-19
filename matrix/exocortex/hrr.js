/**
 * AKSI MATRIX — Exocortex HRR
 * Holographic Reduced Representations: circular convolution bind/unbind.
 */

const HRR_DIM = 128;

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
  const n = vec.length;
  for (let i = 0; i < n; i++) sum += vec[i] * vec[i];
  const norm = Math.sqrt(sum) || 1;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = vec[i] / norm;
  return out;
}

function dot(a, b) {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

export class Exocortex {
  constructor(kernel) {
    this.kernel = kernel;
    this.dim = HRR_DIM;
    this._cache = [];
  }

  async init() {
    const rows = await this.kernel.idbGetAll('memory_chunks');
    this._cache = rows.map((r) => ({
      id: r.id,
      text: r.text,
      tag: r.tag,
      ts: r.ts,
      vec: r.vec instanceof Array ? Float32Array.from(r.vec) : new Float32Array(r.vec || []),
      role: r.role ? Float32Array.from(r.role) : null
    }));
    if (this._cache.length === 0) {
      await this.store(
        'АКСИ MATRIX — суверенный offline runtime в браузере. Память HRR, gate, TrustVault AES-GCM.',
        'seed'
      );
      await this.store(
        'Команды: запомни: факт — сохранить; вопрос — recall; экспорт .aksi — encrypted capsule.',
        'seed'
      );
      await this.store(
        'QuantumRouter строит state-vector из текста, применяет H/Phase слои и answerGate веса маршрута.',
        'seed'
      );
    }
  }

  encode(text) {
    const dim = this.dim;
    const vec = new Float32Array(dim);
    const seed = fnv1a(String(text || ''));
    const rng = mulberry32(seed);
    for (let i = 0; i < dim; i++) {
      const u1 = Math.max(1e-9, rng());
      const u2 = rng();
      const g = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      vec[i] = g;
    }
    const s = String(text || '');
    for (let i = 0; i < s.length; i++) {
      const idx = (s.charCodeAt(i) * 31 + i) % dim;
      vec[idx] += 0.35;
    }
    return normalize(vec);
  }

  bind(vecA, vecB) {
    const n = Math.min(vecA.length, vecB.length);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        const k = (i - j + n) % n;
        sum += vecA[j] * vecB[k];
      }
      out[i] = sum;
    }
    return normalize(out);
  }

  unbind(boundVec, vecA) {
    const n = Math.min(boundVec.length, vecA.length);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        const k = (i + j) % n;
        sum += vecA[j] * boundVec[k];
      }
      out[i] = sum;
    }
    return normalize(out);
  }

  async store(text, tag) {
    const t = String(text || '').trim();
    if (!t) throw new Error('empty memory text');
    const role = this.encode('ITEM:' + t.slice(0, 48));
    const filler = this.encode(t);
    const bound = this.bind(role, filler);
    const id = 'm_' + fnv1a(t + '|' + Date.now()).toString(16);
    const rec = {
      id,
      text: t,
      tag: tag || 'fact',
      ts: Date.now(),
      vec: Array.from(bound),
      role: Array.from(role)
    };
    await this.kernel.idbPut('memory_chunks', rec);
    this._cache.push({ id, text: t, tag: rec.tag, ts: rec.ts, vec: bound, role });
    return rec;
  }

  async recall(query, k) {
    const topK = k || 5;
    const q = String(query || '').trim();
    if (!q || this._cache.length === 0) return [];
    const qVec = this.encode(q);
    const scored = [];
    for (let i = 0; i < this._cache.length; i++) {
      const item = this._cache[i];
      if (!item.vec || item.vec.length === 0) continue;
      const simBind = dot(qVec, item.vec);
      let simUnbind = 0;
      if (item.role && item.role.length === item.vec.length) {
        const recovered = this.unbind(item.vec, item.role);
        simUnbind = dot(qVec, recovered);
      }
      const ql = q.toLowerCase();
      const tl = item.text.toLowerCase();
      let lex = 0;
      const words = ql.split(/\s+/).filter((w) => w.length > 2);
      for (let w = 0; w < words.length; w++) {
        if (tl.indexOf(words[w]) !== -1) lex += 0.15;
      }
      const score = simBind * 0.45 + simUnbind * 0.35 + lex;
      scored.push({ id: item.id, text: item.text, tag: item.tag, score, ts: item.ts });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.filter((s) => s.score >= 0.08).slice(0, topK);
  }

  async count() {
    return this._cache.length;
  }

  async dumpAll() {
    return this.kernel.idbGetAll('memory_chunks');
  }

  async replaceAll(records) {
    await this.kernel.idbClear('memory_chunks');
    this._cache = [];
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      await this.kernel.idbPut('memory_chunks', r);
      this._cache.push({
        id: r.id,
        text: r.text,
        tag: r.tag,
        ts: r.ts,
        vec: Float32Array.from(r.vec || []),
        role: r.role ? Float32Array.from(r.role) : null
      });
    }
  }
}

export default Exocortex;
