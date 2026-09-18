/**
 * AKSI Organism / Stack v1 — unified quantum-inspired browser stack
 * Cortex fidelity · HRR · answerGate · ARIN · Zeno · Walk · Entangle · Capsule seal
 * Honest: classical simulations in browser — not QPU
 * Global: AKSI_STACK (preferred) and AKSI_ORGANISM
 * © AKSI · aksilove@internet.ru · 2026-09-18
 */
(function (G) {
  "use strict";
  var VERSION = "1.0.1-organism";
  function now() { return new Date().toISOString(); }
  function clamp01(x) { x = +x; if (isNaN(x)) return 0; return x < 0 ? 0 : x > 1 ? 1 : x; }
  var zeno = { intervalMs: 0, lastAudit: 0, freezes: 0, audits: 0 };
  function zenoConfigure(intervalMs) { zeno.intervalMs = Math.max(0, +intervalMs || 0); return statusZeno(); }
  function zenoAudit(label) { zeno.audits++; zeno.lastAudit = Date.now(); return { ok: true, label: label || "audit", audits: zeno.audits, freezes: zeno.freezes }; }
  function zenoAllowDrift() {
    if (!zeno.intervalMs) return { allow: true, reason: "zeno off" };
    var dt = Date.now() - zeno.lastAudit;
    if (dt < zeno.intervalMs) { zeno.freezes++; return { allow: false, reason: "zeno freeze", dt: dt, intervalMs: zeno.intervalMs, freezes: zeno.freezes }; }
    return { allow: true, reason: "audit window open", dt: dt };
  }
  function statusZeno() { return { intervalMs: zeno.intervalMs, audits: zeno.audits, freezes: zeno.freezes, lastAudit: zeno.lastAudit || null, active: zeno.intervalMs > 0 }; }
  function hrrFragmentRestore(pct) {
    if (!G.AKSI_HRR || !AKSI_HRR.get) return { ok: false, error: "HRR missing" };
    var m = AKSI_HRR.get(), N = m.N, n = N * N; pct = clamp01(pct == null ? 0.3 : pct);
    var keep = Math.max(1, Math.floor(n * pct)), re = new Float32Array(n), im = new Float32Array(n), i;
    for (i = 0; i < keep; i++) { re[i] = m.re[i]; im[i] = m.im[i]; }
    var scale = 1 / Math.sqrt(pct);
    for (i = 0; i < n; i++) {
      if (i >= keep) { re[i] = m.re[i % keep] * 0.15 * scale; im[i] = m.im[i % keep] * 0.15 * scale; }
      else { re[i] *= scale; im[i] *= scale; }
    }
    var score = 0, normA = 0, normB = 0;
    for (i = 0; i < n; i++) { score += re[i] * m.re[i] + im[i] * m.im[i]; normA += re[i] * re[i] + im[i] * im[i]; normB += m.re[i] * m.re[i] + m.im[i] * m.im[i]; }
    return { ok: true, keptFraction: pct, keptCells: keep, totalCells: n, cosineToFull: normA && normB ? score / Math.sqrt(normA * normB) : 0, note: "classical partial field" };
  }
  var pair = { a: null, b: null, bell: null };
  function sealFidelity(ga, gb) {
    if (!ga || !gb) return 0;
    var va = [ga.QCLI || 0, ga.entropy || 0, ga.purity || 0, ga.resonance || 0];
    var vb = [gb.QCLI || 0, gb.entropy || 0, gb.purity || 0, gb.resonance || 0];
    var dot = 0, na = 0, nb = 0, i;
    for (i = 0; i < va.length; i++) { dot += va[i] * vb[i]; na += va[i] * va[i]; nb += vb[i] * vb[i]; }
    return na && nb ? Math.abs(dot) / Math.sqrt(na * nb) : 0;
  }
  function entangleSeed(textA, textB) {
    var Q = G.AKSI_QUANTUM; if (!Q || !Q.answerGate) return { ok: false, error: "quantum missing" };
    var ga = Q.answerGate(textA || "agent-A", "seal-A"), gb = Q.answerGate(textB || "agent-B", "seal-B");
    pair.a = ga; pair.b = gb; pair.bell = Q.bell ? Q.bell("phi+") : null;
    return { ok: true, fidelity: sealFidelity(ga, gb), a: { QCLI: ga.QCLI }, b: { QCLI: gb.QCLI }, bell: pair.bell };
  }
  function entangleTouch(which, query, answer) {
    var Q = G.AKSI_QUANTUM; if (!Q || !Q.answerGate) return { ok: false, error: "quantum missing" };
    var g = Q.answerGate(query || "touch", answer || "update");
    if (which === "b") pair.b = g; else pair.a = g;
    return { ok: true, which: which === "b" ? "b" : "a", fidelity: sealFidelity(pair.a, pair.b) };
  }
  function quantumWalkPick(candidates) {
    candidates = (candidates || []).filter(Boolean);
    if (!candidates.length) return { ok: false, error: "no candidates" };
    var n = candidates.length;
    var amps = candidates.map(function (c, i) {
      var t = String(c.text || c), base = 1 / Math.sqrt(n), phase = (t.length * 0.17 + i * 1.3) % (Math.PI * 2);
      return { re: base * Math.cos(phase), im: base * Math.sin(phase), text: t };
    });
    var next = amps.map(function (a, i) {
      var L = amps[(i - 1 + n) % n], R = amps[(i + 1) % n];
      return { re: 0.5 * a.re + 0.25 * L.re + 0.25 * R.re, im: 0.5 * a.im + 0.25 * L.im + 0.25 * R.im, text: a.text };
    });
    var probs = next.map(function (a) { return a.re * a.re + a.im * a.im; });
    var sum = probs.reduce(function (s, p) { return s + p; }, 0) || 1;
    probs = probs.map(function (p) { return p / sum; });
    var r = Math.random(), acc = 0, pick = 0, j;
    for (j = 0; j < probs.length; j++) { acc += probs[j]; if (r <= acc) { pick = j; break; } }
    return { ok: true, pick: next[pick].text, index: pick, probs: probs.map(function (p) { return +p.toFixed(4); }), note: "classical amplitude walk" };
  }
  function zkProve(secret, challenge) {
    if (!G.AKSI_HRR || !AKSI_HRR.get) return { ok: false, error: "HRR missing" };
    var m = AKSI_HRR.get(); m.add(String(secret));
    var res = m.resonance(String(challenge || "challenge"));
    return { ok: true, score: res.score, passes: res.score >= 0.22, note: "score only" };
  }
  async function vaultIngest(text, password) {
    var K = G.AKSI_CORTEX_KERNEL; if (!K) return { ok: false, error: "cortex missing" };
    K.setSessionPassword(password);
    return { ok: true, result: await K.ingestDocument(text, password), size: K.size };
  }
  async function vaultSearch(query, password) {
    var K = G.AKSI_CORTEX_KERNEL; if (!K) return { ok: false, error: "cortex missing" };
    if (password) K.setSessionPassword(password);
    return { ok: true, hit: await K.resonantQuery(query), ranked: K.rank(query, 5), note: "fidelity search" };
  }
  async function think(query, opts) {
    opts = opts || {}; var q = String(query || "").trim(); if (!q) return { ok: false, error: "empty" };
    var z = zenoAllowDrift();
    if (!z.allow && opts.respectZeno !== false) return { ok: false, zeno: z, text: "Zeno freeze", source: "zeno" };
    var parts = [], source = "empty";
    if (G.AKSI_CAPSULE) {
      var a = await AKSI_CAPSULE.ask(q, { research: !!opts.research });
      if (a && a.source === "memory") { parts.push({ text: a.text, engine: "capsule" }); source = "capsule"; }
      else if (a && a.source === "wikipedia") { parts.push({ text: a.text, engine: "wiki" }); source = "wiki"; }
    }
    if (G.AKSI_CORTEX_KERNEL && AKSI_CORTEX_KERNEL.size > 0 && opts.password) {
      try { var vs = await vaultSearch(q, opts.password); if (vs.hit && vs.hit.text) { parts.push({ text: vs.hit.text, engine: "cortex" }); source = "cortex"; } } catch (e) {}
    }
    if (G.AKSI_HRR && AKSI_HRR.get) {
      var hr = AKSI_HRR.get().resonance(q);
      if (hr.fact && hr.score > 0.2) { parts.push({ text: hr.fact, engine: "hrr" }); if (source === "empty") source = "hrr"; }
    }
    if (G.AKSI_RESONANCE) {
      try { AKSI_RESONANCE.ensure(); var ar = AKSI_RESONANCE.ask(q); if (ar && (ar.text || ar.answer)) parts.push({ text: ar.text || ar.answer, engine: "arin" }); } catch (e) {}
    }
    if (!parts.length) parts.push({ text: "No data.", engine: "empty" });
    var walk = quantumWalkPick(parts.map(function (p) { return { text: p.text }; }));
    var text = walk.ok ? walk.pick : parts[0].text;
    var gate = G.AKSI_QUANTUM && AKSI_QUANTUM.answerGate ? AKSI_QUANTUM.answerGate(q, text) : null;
    zenoAudit("think");
    return { ok: true, text: text, source: source, candidates: parts, walk: walk, gate: gate && { QCLI: gate.QCLI, entropy: gate.entropy, purity: gate.purity }, zeno: statusZeno(), version: VERSION };
  }
  async function exportOrganismCapsule(opts) {
    opts = opts || {};
    var cap = G.AKSI_CAPSULE ? AKSI_CAPSULE.exportCapsule() : { format: "aksi-capsule", facts: [], seals: [], did: "did:aksi:organism" };
    var whole = JSON.stringify({ facts: cap.facts, seals: cap.seals, did: cap.did });
    var gate = G.AKSI_QUANTUM && AKSI_QUANTUM.answerGate ? AKSI_QUANTUM.answerGate("organism-capsule", whole.slice(0, 2000)) : null;
    var hrrSnap = null;
    if (G.AKSI_HRR && AKSI_HRR.get) { var m = AKSI_HRR.get(); hrrSnap = { n: m.N, traces: m.traces.slice(-50), count: m.traces.length }; }
    var organism = {
      format: "aksi-organism", version: VERSION, product: "AKSI Organism Capsule", contact: "aksilove@internet.ru", exportedAt: now(),
      note: "Quantum-inspired classical seals. Not QPU.", capsule: cap,
      quantumSeal: gate && { alg: "answerGate-3q", QCLI: gate.QCLI, entropy: gate.entropy, purity: gate.purity, resonance: gate.resonance, outcome: gate.outcome },
      hrr: hrrSnap, zeno: statusZeno(), pair: { fidelity: sealFidelity(pair.a, pair.b) }
    };
    if (opts.download !== false && typeof document !== "undefined") {
      var blob = new Blob([JSON.stringify(organism, null, 2)], { type: "application/json" });
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "aksi-organism.json"; a.click();
    }
    return organism;
  }
  async function importOrganismCapsule(data) {
    if (typeof data === "string") data = JSON.parse(data);
    if (!data || (data.format !== "aksi-organism" && data.format !== "aksi-capsule")) return { ok: false, error: "bad format" };
    var imp = G.AKSI_CAPSULE ? await AKSI_CAPSULE.importCapsule(data.capsule || data) : { ok: false };
    if (G.AKSI_HRR && AKSI_HRR.get && data.hrr && data.hrr.traces) {
      var m = AKSI_HRR.get(); m.clear();
      data.hrr.traces.forEach(function (t) { m.add(typeof t === "string" ? t : t.text); });
    }
    return { ok: !!imp.ok, import: imp, quantumSeal: data.quantumSeal || null };
  }
  function status() {
    return {
      version: VERSION,
      capsule: G.AKSI_CAPSULE ? AKSI_CAPSULE.status() : null,
      cortex: G.AKSI_CORTEX_KERNEL ? { size: AKSI_CORTEX_KERNEL.size, dim: AKSI_CORTEX_KERNEL.dim } : null,
      quantum: !!G.AKSI_QUANTUM, hrr: !!G.AKSI_HRR, arin: !!G.AKSI_RESONANCE,
      zeno: statusZeno(), honest: "quantum-inspired classical browser stack"
    };
  }
  var api = {
    version: VERSION, think: think, vaultIngest: vaultIngest, vaultSearch: vaultSearch,
    zenoConfigure: zenoConfigure, zenoAudit: zenoAudit, zenoAllowDrift: zenoAllowDrift,
    hrrFragmentRestore: hrrFragmentRestore, entangleSeed: entangleSeed, entangleTouch: entangleTouch,
    quantumWalkPick: quantumWalkPick, zkProve: zkProve,
    exportOrganismCapsule: exportOrganismCapsule, importOrganismCapsule: importOrganismCapsule, status: status
  };
  G.AKSI_STACK = api;
  G.AKSI_ORGANISM = api;
})(typeof window !== "undefined" ? window : globalThis);
