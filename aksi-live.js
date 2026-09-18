/**
 * AKSI Live v1 — fully wired product brain
 * remember → capsule + HRR + cortex vault
 * ask → cortex + capsule + HRR + ARIN → walk → answerGate
 * seal → ECDSA + quantum gate
 * export/import → organism
 * © AKSI · aksilove@internet.ru · 2026-09-18
 */
(function (G) {
  "use strict";
  var VERSION = "1.0.0-live";
  var sessionPw = null;
  var last = null;
  function now() { return new Date().toISOString(); }
  function setPassword(pw) {
    sessionPw = pw ? String(pw) : null;
    if (sessionPw && G.AKSI_CORTEX_KERNEL && AKSI_CORTEX_KERNEL.setSessionPassword) {
      try { AKSI_CORTEX_KERNEL.setSessionPassword(sessionPw); } catch (e) {}
    }
    return { ok: true, vault: !!sessionPw };
  }
  async function remember(text, meta) {
    text = String(text || "").trim();
    if (!text) return { ok: false, error: "empty" };
    var out = { ok: true, capsule: null, hrr: false, cortex: null };
    if (G.AKSI_CAPSULE && AKSI_CAPSULE.remember) out.capsule = AKSI_CAPSULE.remember(text, meta || null);
    if (G.AKSI_HRR && AKSI_HRR.get) { try { AKSI_HRR.get().add(text); out.hrr = true; } catch (e) {} }
    if (sessionPw && G.AKSI_CORTEX_KERNEL && AKSI_CORTEX_KERNEL.ingestDocument) {
      try { out.cortex = await AKSI_CORTEX_KERNEL.ingestDocument(text, sessionPw); }
      catch (e) { out.cortex = { error: String(e.message || e) }; }
    }
    return out;
  }
  async function ask(query, opts) {
    opts = opts || {};
    var q = String(query || "").trim();
    if (!q) return { ok: false, error: "empty" };
    if (G.AKSI_STACK && AKSI_STACK.zenoAllowDrift) {
      var z = AKSI_STACK.zenoAllowDrift();
      if (!z.allow && opts.respectZeno !== false)
        return { ok: false, text: "Zeno: пауза до аудита", source: "zeno", zeno: z };
    }
    var candidates = [], sources = [];
    if (G.AKSI_CAPSULE && AKSI_CAPSULE.ask) {
      try {
        var ca = await AKSI_CAPSULE.ask(q, { research: opts.research !== false });
        if (ca && ca.text && ca.source === "memory") { candidates.push({ text: ca.text, engine: "capsule", w: 1 }); sources.push("capsule"); }
        else if (ca && ca.source === "wikipedia" && ca.text) { candidates.push({ text: ca.text, engine: "wiki", w: 0.35 }); sources.push("wiki"); }
      } catch (e) {}
    }
    if (sessionPw && G.AKSI_CORTEX_KERNEL && AKSI_CORTEX_KERNEL.resonantQuery) {
      try {
        AKSI_CORTEX_KERNEL.setSessionPassword(sessionPw);
        var hit = await AKSI_CORTEX_KERNEL.resonantQuery(q);
        if (hit && hit.text) { candidates.push({ text: hit.text, engine: "cortex-fidelity", w: 0.9 + Math.min(0.2, hit.score || 0), score: hit.score }); sources.push("cortex"); }
      } catch (e) {}
    }
    if (G.AKSI_HRR && AKSI_HRR.get) {
      try {
        var hr = AKSI_HRR.get().resonance(q);
        if (hr && hr.fact && hr.score > 0.18) { candidates.push({ text: hr.fact, engine: "hrr", w: hr.score, score: hr.score }); sources.push("hrr"); }
      } catch (e) {}
    }
    if (G.AKSI_RESONANCE) {
      try {
        if (AKSI_RESONANCE.ensure) AKSI_RESONANCE.ensure();
        var ar = AKSI_RESONANCE.ask(q);
        var at = ar && (ar.text || ar.answer || (ar.top && ar.top.text));
        if (at) { candidates.push({ text: String(at), engine: "arin", w: 0.5 }); sources.push("arin"); }
      } catch (e) {}
    }
    if (!candidates.length) { candidates.push({ text: "Пока пусто. Напишите: запомни: ваш факт", engine: "empty", w: 0.1 }); sources.push("empty"); }
    var pick = candidates[0];
    if (G.AKSI_STACK && AKSI_STACK.quantumWalkPick && candidates.length > 1) {
      var w = AKSI_STACK.quantumWalkPick(candidates.map(function (c) { return { text: c.text }; }));
      if (w && w.ok && w.pick) {
        pick = { text: w.pick, engine: "walk", w: 0.7 };
        for (var i = 0; i < candidates.length; i++) if (candidates[i].text === w.pick) { pick = candidates[i]; break; }
      }
    } else {
      candidates.sort(function (a, b) { return (b.w || 0) - (a.w || 0); });
      pick = candidates[0];
    }
    var text = pick.text;
    var gate = null;
    if (G.AKSI_QUANTUM && AKSI_QUANTUM.answerGate) { try { gate = AKSI_QUANTUM.answerGate(q, text); } catch (e) {} }
    last = { q: q, text: text, gate: gate, sources: sources, candidates: candidates, engine: pick.engine, at: now() };
    if (G.AKSI_STACK && AKSI_STACK.zenoAudit) AKSI_STACK.zenoAudit("ask");
    return {
      ok: true, text: text, engine: pick.engine, sources: sources, candidates: candidates.length,
      gate: gate && { QCLI: gate.QCLI, entropy: gate.entropy, purity: gate.purity, resonance: gate.resonance, outcome: gate.outcome },
      last: last
    };
  }
  async function seal() {
    if (!last) return { ok: false, error: "no answer to seal" };
    var capsuleSeal = null;
    if (G.AKSI_CAPSULE && AKSI_CAPSULE.sealLast) {
      try { await AKSI_CAPSULE.ask(last.q, { research: false }); } catch (e) {}
      try { capsuleSeal = await AKSI_CAPSULE.sealLast(); } catch (e) { capsuleSeal = { ok: false, error: String(e.message || e) }; }
    }
    var quantum = last.gate || (G.AKSI_QUANTUM && AKSI_QUANTUM.answerGate ? AKSI_QUANTUM.answerGate(last.q, last.text) : null);
    return {
      ok: true, capsule: capsuleSeal,
      quantum: quantum && { alg: "answerGate-3q", QCLI: quantum.QCLI, entropy: quantum.entropy, purity: quantum.purity, resonance: quantum.resonance, outcome: quantum.outcome },
      text: last.text, q: last.q
    };
  }
  async function exportAll() {
    if (G.AKSI_STACK && AKSI_STACK.exportOrganismCapsule) return AKSI_STACK.exportOrganismCapsule({ download: true });
    if (G.AKSI_CAPSULE && AKSI_CAPSULE.downloadCapsule) return AKSI_CAPSULE.downloadCapsule({ alsoAksi: true });
    return { ok: false, error: "no exporter" };
  }
  async function importAll(fileOrText) {
    var text = typeof fileOrText === "string" ? fileOrText : await fileOrText.text();
    var data; try { data = JSON.parse(text.replace(/^\uFEFF/, "")); } catch (e) { return { ok: false, error: "not JSON" }; }
    if (G.AKSI_STACK && AKSI_STACK.importOrganismCapsule && (data.format === "aksi-organism" || data.quantumSeal))
      return AKSI_STACK.importOrganismCapsule(data);
    if (G.AKSI_CAPSULE && AKSI_CAPSULE.importCapsule) return AKSI_CAPSULE.importCapsule(data);
    return { ok: false, error: "no importer" };
  }
  function status() {
    return {
      version: VERSION, password: !!sessionPw, hasLast: !!last, lastEngine: last && last.engine,
      capsule: G.AKSI_CAPSULE ? AKSI_CAPSULE.status() : null,
      cortex: G.AKSI_CORTEX_KERNEL ? { size: AKSI_CORTEX_KERNEL.size } : null,
      modules: { capsule: !!G.AKSI_CAPSULE, cortex: !!G.AKSI_CORTEX_KERNEL, quantum: !!G.AKSI_QUANTUM, hrr: !!G.AKSI_HRR, arin: !!G.AKSI_RESONANCE, stack: !!G.AKSI_STACK }
    };
  }
  function getLast() { return last; }
  G.AKSI_LIVE = { version: VERSION, setPassword: setPassword, remember: remember, ask: ask, seal: seal, exportAll: exportAll, importAll: importAll, status: status, getLast: getLast };
})(typeof window !== "undefined" ? window : globalThis);
