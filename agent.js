/**
 * AKSI Agent v4.0 — offline-first
 * Path: Zero → FIR → Genesis → AI → Neuro → local
 * Server only if enableServer(true) / aksi_use_server=1 (connect later)
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "4.0.0";
  var API = (G.AKSI_API_BASE || "https://milana-backend.onrender.com").replace(/\/$/, "");
  function localAnswer(q) {
    var low = String(q || "").toLowerCase();
    if (/кто ты|who are you|что такое акси/.test(low))
      return { text: "Я АКСИ — offline-first ИИ. Сейчас без сервера (Zero). Сервер подключим позже.\naksilove@internet.ru", source: "identity", offline: true };
    if (/сервер|server|backend/.test(low))
      return { text: "Сервер опционален. База — Zero/Neuro/Genesis. API: AKSIAgent.enableServer(true)", source: "server", offline: true };
    if (/zero|без сервера/.test(low))
      return { text: "АКСИ Zero — контур в браузере: /zero/", source: "zero", offline: true };
    if (/как польз|help/.test(low))
      return { text: "1) /zero/ 2) запомни: 3) /fir/ /genesis/ 4) сервер позже", source: "guide", offline: true };
    if (/модул|что уме/.test(low))
      return { text: "Zero, FIR, Genesis, Neuro, AI, Crypto, MATRIX, Quantum, Proof, SPA, Bot.", source: "caps", offline: true };
    return { text: "«" + String(q).slice(0, 100) + "». кто ты · zero · запомни:", source: "fallback", offline: true };
  }
  function wantServer(opts) {
    opts = opts || {};
    if (opts.api === true || opts.server === true) return true;
    try { if (G.AKSI_USE_SERVER === true) return true; } catch (e) {}
    try { if (localStorage.getItem("aksi_use_server") === "1") return true; } catch (e) {}
    return false;
  }
  async function ask(q, opts) {
    opts = opts || {};
    q = String(q || "").trim();
    if (!q) return { text: "Пустой запрос", source: "empty", offline: true };
    if (G.AKSI_ZERO && G.AKSI_ZERO.think) {
      try {
        var z = await G.AKSI_ZERO.think(q);
        if (z && z.answer) return { text: z.answer, source: z.source || "zero", offline: true, kind: z.kind, critique: { score: z.confidence }, seal: z.seal, quantum: z.quantum, hits: z.hits, ms: z.ms, server: false };
      } catch (e) {}
    }
    if (G.AKSI_FIR && G.AKSI_FIR.think) {
      try {
        var f = await G.AKSI_FIR.think(q, opts);
        var fp = f.payload || f;
        if (fp && (fp.answer || f.answer)) return { text: fp.answer || f.answer, source: fp.source || "fir", offline: true, critique: { score: fp.score }, seal: f.seal || fp.seal, quantum: fp.quantum, layers: fp.layers, thought: fp.thought, ms: fp.ms, server: false };
      } catch (e) {}
    }
    if (G.AKSI_GENESIS && G.AKSI_GENESIS.think) {
      try {
        var g = await G.AKSI_GENESIS.think(q, { quantum: opts.quantum !== false });
        var p = g.payload || g;
        if (p && p.answer) return { text: p.answer, source: "genesis", offline: true, kind: p.kind, critique: p.critique, quantum: p.quantum, seal: g.seal, thought: p.thought, ms: p.ms, server: false };
      } catch (e) {}
    }
    if (G.AKSI_AI && G.AKSI_AI.think) {
      try {
        var r = await G.AKSI_AI.think(q);
        var p2 = r.payload || r;
        if (p2 && p2.answer) return { text: p2.answer, source: "aksi-ai", offline: true, critique: p2.critique, seal: r.seal, ms: p2.ms, server: false };
      } catch (e) {}
    }
    if (G.AKSI_NEURO && G.AKSI_NEURO.think) {
      try {
        var n = G.AKSI_NEURO.think(q);
        if (n && n.text) return { text: n.text, source: "neuro", offline: true, server: false };
      } catch (e) {}
    }
    var loc = localAnswer(q);
    if (wantServer(opts)) {
      try {
        var res = await fetch(API + "/api/v1/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: q }), signal: AbortSignal.timeout(15000) });
        if (res.ok) {
          var j = await res.json();
          return { text: j.reply || j.answer || j.text || JSON.stringify(j).slice(0, 400), source: "api", offline: false, server: true };
        }
      } catch (e) { loc.text += "\n\n[сервер: " + String(e.message || e).slice(0, 80) + "]"; }
    }
    return loc;
  }
  async function capabilities() {
    return {
      version: VER, offline: true, serverEnabled: wantServer({}), apiBase: API,
      zero: !!(G.AKSI_ZERO && G.AKSI_ZERO.think), fir: !!(G.AKSI_FIR && G.AKSI_FIR.think),
      genesis: !!(G.AKSI_GENESIS && G.AKSI_GENESIS.think), neuro: !!(G.AKSI_NEURO && G.AKSI_NEURO.think),
      aksi_ai: !!(G.AKSI_AI && G.AKSI_AI.think), crypto: !!G.AKSI_CRYPTO,
      path: "Zero\u2192FIR\u2192Genesis\u2192AI\u2192Neuro\u2192local \u00b7 server later"
    };
  }
  G.AKSIAgent = {
    version: VER, ask: ask, capabilities: capabilities, localAnswer: localAnswer,
    enableServer: function (on) {
      try { localStorage.setItem("aksi_use_server", on ? "1" : "0"); } catch (e) {}
      G.AKSI_USE_SERVER = !!on;
      return capabilities();
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
