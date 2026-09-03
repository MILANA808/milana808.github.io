/**
 * AKSI ZERO v1 — 100% browser, zero server, zero WebGPU required
 * intent → retrieve → reason → answer → seal
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.0.0-zero";
  var MEM = "aksi_zero_mem_v1";
  var LOG = "aksi_zero_log_v1";
  var XP = "aksi_zero_xp_v1";
  function now() { return Date.now(); }
  function uid() { return "z" + now().toString(36) + Math.random().toString(36).slice(2, 5); }
  function load(k) { try { var a = JSON.parse(localStorage.getItem(k) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function save(k, a) { try { localStorage.setItem(k, JSON.stringify((a || []).slice(-500))); } catch (e) {} }
  function tok(s) {
    return String(s || "").toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu, " ").split(/\s+/).filter(function (w) { return w.length > 1; });
  }
  function overlap(a, b) {
    var s = {}, i, n = 0; for (i = 0; i < b.length; i++) s[b[i]] = 1;
    for (i = 0; i < a.length; i++) if (s[a[i]]) n++; return a.length ? n / a.length : 0;
  }
  function fnv(s) {
    var h = 0x811c9dc5, i; s = String(s);
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return ("00000000" + (h >>> 0).toString(16)).slice(-8);
  }
  var KB = [
    { t: "\u042f \u0410\u041a\u0421\u0418 Zero \u2014 \u043f\u043e\u043b\u043d\u043e\u0441\u0442\u044c\u044e \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u044b\u0439 \u0418\u0418 \u0432 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435. \u0411\u0435\u0437 \u0441\u0435\u0440\u0432\u0435\u0440\u0430. aksilove@internet.ru" },
    { t: "\u0410\u041a\u0421\u0418 offline-first: \u043e\u0442\u0432\u0435\u0442, \u043f\u0430\u043c\u044f\u0442\u044c, \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435 \u0438 \u043f\u0435\u0447\u0430\u0442\u044c \u043d\u0430 \u0443\u0441\u0442\u0440\u043e\u0439\u0441\u0442\u0432\u0435." },
    { t: "\u041e\u0431\u0443\u0447\u0435\u043d\u0438\u0435: \u00ab\u0437\u0430\u043f\u043e\u043c\u043d\u0438: \u0444\u0430\u043a\u0442\u00bb \u2014 \u0441\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u0441\u044f \u0432 localStorage." },
    { t: "Zero pipeline: intent \u2192 retrieve \u2192 reason \u2192 answer \u2192 seal." },
    { t: "Quantum gate Zero \u2014 \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u0430\u044f \u044d\u0432\u0440\u0438\u0441\u0442\u0438\u043a\u0430 QCLI-lite, \u043d\u0435 \u0444\u0438\u0437\u0438\u0447\u0435\u0441\u043a\u0438\u0439 QPU." },
    { t: "\u041f\u043e\u0434\u043f\u0438\u0441\u044c \u2014 FNV-ledger \u0432 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435." },
    { t: "\u041c\u043e\u0434\u0443\u043b\u0438: Chat, MATRIX, Genesis, FIR, Quantum, Proof, Crypto, Protocol." },
    { t: "FORMULA: AKSI=(A\u00d7I\u00d7S)\u00d7(1+0.4\u221an); GenesisScore=(R\u00d7C\u00d7G\u00d7Q)\u00d7(1+0.3\u221an)." },
    { t: "\u0411\u043e\u043b\u044c\u0448\u0438\u0435 LLM \u043d\u0435\u043b\u044c\u0437\u044f \u0432\u0448\u0438\u0442\u044c \u0432 GitHub Pages. Zero \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442 \u0431\u0435\u0437 \u043d\u0438\u0445." },
    { t: "\u0421 \u0447\u0435\u0433\u043e \u043d\u0430\u0447\u0430\u0442\u044c: \u00ab\u043a\u0442\u043e \u0442\u044b\u00bb, \u00ab\u0447\u0442\u043e \u0443\u043c\u0435\u0435\u0448\u044c\u00bb, \u00ab\u0437\u0430\u043f\u043e\u043c\u043d\u0438: \u2026\u00bb." },
    { t: "ADIA \u2014 \u0440\u0435\u0437\u043e\u043d\u0430\u043d\u0441 \u0440\u0435\u0448\u0435\u043d\u0438\u0439. \u0412 Zero \u2014 confidence score." },
    { t: "P2P \u0438 backend \u043e\u043f\u0446\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u044b. Zero \u043d\u0435 \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u0441\u0435\u0440\u0432\u0435\u0440." },
    { t: "Hello \u2014 I am AKSI Zero, fully local browser AI. No server. aksilove@internet.ru" },
    { t: "Teach: remember: your fact \u2014 stored only in this browser." }
  ];
  function allDocs() {
    var out = KB.slice(), mem = load(MEM), i;
    for (i = 0; i < mem.length; i++) if (mem[i] && mem[i].text) out.push({ t: mem[i].text, src: "mem" });
    try {
      if (G.AKSI_KNOWLEDGE && Array.isArray(G.AKSI_KNOWLEDGE.topics)) {
        G.AKSI_KNOWLEDGE.topics.forEach(function (x) {
          if (x && (x.body || x.text || x.a)) out.push({ t: String(x.body || x.text || x.a), src: "knowledge" });
        });
      }
    } catch (e) {}
    return out;
  }
  function intent(q) {
    var low = String(q || "").toLowerCase().trim();
    return {
      raw: String(q || "").trim(), tokens: tok(q),
      teach: /^(запомни|выучи|remember|learn)\s*[:：]/i.test(low),
      help: /как польз|help|с чего|что уме|команд/.test(low),
      who: /кто ты|who are you|что такое акси|what is aksi/.test(low),
      lang: /[а-яё]/i.test(q || "") ? "ru" : "en"
    };
  }
  function retrieve(q, tokens) {
    var docs = allDocs(), scored = [], i, d, sc, j, parts;
    for (i = 0; i < docs.length; i++) {
      d = docs[i]; sc = overlap(tokens, tok(d.t));
      parts = String(q).toLowerCase().split(/\s+/);
      for (j = 0; j < parts.length; j++) if (parts[j].length > 3 && String(d.t).toLowerCase().indexOf(parts[j]) !== -1) sc += 0.12;
      if (sc > 0.08) scored.push({ text: d.t, score: sc, src: d.src || "kb" });
    }
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, 6);
  }
  function reason(hits, it) {
    if (!hits.length) {
      return { answer: it.lang === "ru" ? "\u041d\u0435\u0442 \u043e\u043f\u043e\u0440\u044b. \u00ab\u0437\u0430\u043f\u043e\u043c\u043d\u0438: \u2026\u00bb \u0438\u043b\u0438: \u043a\u0442\u043e \u0442\u044b" : "No match. remember: \u2026", confidence: 0.25, mode: "gap" };
    }
    var answer = hits[0].text;
    if (hits[1] && hits[1].score > 0.2 && hits[1].text !== answer) {
      var add = hits[1].text;
      if (answer.indexOf(add.slice(0, 30)) === -1) answer = answer + "\n\n" + add.slice(0, 220);
    }
    if (it.help) {
      answer = it.lang === "ru"
        ? "\u041a\u043e\u043c\u0430\u043d\u0434\u044b Zero:\n\u2022 \u0432\u043e\u043f\u0440\u043e\u0441\n\u2022 \u0437\u0430\u043f\u043e\u043c\u043d\u0438: \u0444\u0430\u043a\u0442\n\u2022 \u0431\u0435\u0437 \u0441\u0435\u0440\u0432\u0435\u0440\u0430"
        : "ask \u00b7 remember: fact \u00b7 fully local";
    }
    return {
      answer: answer,
      confidence: Math.min(0.95, 0.35 + hits[0].score),
      mode: "retrieve",
      hits: hits.slice(0, 3).map(function (h) { return { score: Math.round(h.score * 100) / 100, src: h.src, preview: h.text.slice(0, 60) }; })
    };
  }
  function qgate(q, a) {
    var h1 = fnv(q), h2 = fnv(a);
    var gate = Math.round((0.45 + ((parseInt(h1.slice(0, 4), 16) ^ parseInt(h2.slice(0, 4), 16)) % 500) / 1000) * 1000) / 1000;
    return { gate: gate, pass: gate >= 0.42, backend: "zero-qcli" };
  }
  function seal(body) {
    var chain = load(LOG), prev = chain.length ? chain[chain.length - 1].hash : "ZERO";
    var bodyHash = fnv(JSON.stringify(body));
    var entry = { i: chain.length, ts: now(), hash: fnv(prev + bodyHash), prev: prev, bodyHash: bodyHash };
    chain.push(entry); save(LOG, chain);
    return { alg: "FNV-chain", hash: entry.hash, prev: prev, suite: VER };
  }
  function teach(fact) {
    fact = String(fact || "").trim(); if (!fact) return { ok: false };
    var m = load(MEM); m.push({ id: uid(), text: fact, ts: now() }); save(MEM, m);
    try { if (G.AKSI_NEURO && G.AKSI_NEURO.learn) G.AKSI_NEURO.learn(fact); } catch (e) {}
    try { if (G.AKSI_GENESIS && G.AKSI_GENESIS.teach) G.AKSI_GENESIS.teach(fact); } catch (e) {}
    return { ok: true, n: m.length };
  }
  function boostNeuro(q) {
    try {
      if (G.AKSI_NEURO && typeof G.AKSI_NEURO.think === "function") {
        var r = G.AKSI_NEURO.think(q);
        if (r && r.text && r.mode !== "gap") return { text: r.text, source: "neuro", score: r.score || 0.7 };
      }
    } catch (e) {}
    return null;
  }
  async function think(input) {
    var t0 = now(), it = intent(input);
    if (!it.raw) return { answer: "\u041f\u0443\u0441\u0442\u043e", source: "zero", ms: 0 };
    if (it.teach) {
      var fact = it.raw.replace(/^(запомни|выучи|remember|learn)\s*[:：]\s*/i, "").trim();
      var tr = teach(fact);
      var body = { answer: "\u0417\u0430\u043f\u043e\u043c\u043d\u0435\u043d\u043e: \u00ab" + fact.slice(0, 160) + "\u00bb. n=" + tr.n, kind: "learned", source: "zero" };
      body.seal = seal(body); body.ms = now() - t0; return body;
    }
    var hits = retrieve(it.raw, it.tokens);
    var reasoned = reason(hits, it);
    var neuro = boostNeuro(it.raw);
    if (neuro && (neuro.score || 0) >= (reasoned.confidence || 0) + 0.05) {
      reasoned.answer = neuro.text; reasoned.mode = "neuro"; reasoned.confidence = neuro.score;
    } else if (neuro && neuro.text && reasoned.mode === "gap") {
      reasoned.answer = neuro.text; reasoned.mode = "neuro"; reasoned.confidence = neuro.score || 0.6;
    }
    try {
      if (G.AKSI_GENESIS && G.AKSI_GENESIS.think && reasoned.confidence < 0.45) {
        var g = await G.AKSI_GENESIS.think(it.raw);
        var p = g.payload || g;
        if (p.answer && p.kind !== "gap") {
          reasoned.answer = p.answer; reasoned.mode = "genesis"; reasoned.confidence = (p.critique && p.critique.score) || 0.55;
        }
      }
    } catch (e) {}
    var quantum = qgate(it.raw, reasoned.answer);
    var xp = Number(localStorage.getItem(XP) || 0) + 1;
    try { localStorage.setItem(XP, String(xp)); } catch (e) {}
    var out = {
      id: uid(), version: VER, input: it.raw, answer: reasoned.answer, kind: reasoned.mode,
      source: "zero" + (reasoned.mode === "neuro" ? "+neuro" : reasoned.mode === "genesis" ? "+genesis" : ""),
      confidence: Math.round((reasoned.confidence || 0) * 1000) / 1000,
      hits: reasoned.hits || [], quantum: quantum, xp: xp, ms: now() - t0, server: false, offline: true
    };
    out.seal = seal({ id: out.id, answer: out.answer, ts: t0 });
    return out;
  }
  function status() {
    return {
      version: VER, server: false, offline: true, memory: load(MEM).length, ledger: load(LOG).length, kb: KB.length,
      neuro: !!(G.AKSI_NEURO && G.AKSI_NEURO.think), genesis: !!(G.AKSI_GENESIS && G.AKSI_GENESIS.think),
      fir: !!G.AKSI_FIR, webllm: !!(G.AKSI_WEBLLM && G.AKSI_WEBLLM.ready && G.AKSI_WEBLLM.ready()),
      xp: Number(localStorage.getItem(XP) || 0)
    };
  }
  G.AKSI_ZERO = {
    version: VER, think: think, teach: teach, status: status,
    memory: function () { return load(MEM); },
    clearMemory: function () { save(MEM, []); return { ok: true }; },
    formula: "retrieve\u00d7reason\u00d7seal \u00b7 zero-server"
  };
  if (!G.AKSIAgent) {
    G.AKSIAgent = {
      version: "zero-bridge",
      ask: async function (q) {
        var r = await think(q);
        return { text: r.answer, source: r.source, offline: true, seal: r.seal, critique: { score: r.confidence }, ms: r.ms };
      }
    };
  }
})(typeof window !== "undefined" ? window : globalThis);
