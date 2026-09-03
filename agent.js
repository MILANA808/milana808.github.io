/**
 * AKSI Agent v3.0 — Genesis → AI → local → optional API
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "3.0.0";
  var API = (G.AKSI_API_BASE || "https://milana-backend.onrender.com").replace(/\/$/, "");
  function localAnswer(q) {
    var low = String(q || "").toLowerCase();
    if (/кто ты|who are you|что такое акси/.test(low))
      return { text: "Я АКСИ — offline-first ИИ. Genesis / AI / Crypto / Quantum.\naksilove@internet.ru", source: "identity", offline: true };
    if (/genesis/.test(low))
      return { text: "Genesis v2: SENSE→ATTEST. /genesis/", source: "genesis", offline: true };
    if (/как польз|help/.test(low))
      return { text: "1) Бот 2) /genesis/ 3) /ai/ 4) /crypto/ 5) «запомни:»", source: "guide", offline: true };
    if (/модул/.test(low))
      return { text: "Genesis, AI, Crypto, SPA, MATRIX, Quantum, Proof, ADIA, Bot.", source: "caps", offline: true };
    if (/квант|quantum/.test(low))
      return { text: "State-vector + QCLI + answerGate. /quantum/", source: "quantum", offline: true };
    if (/крипт|pq|crypto/.test(low))
      return { text: "ECDSA/Ed25519, AES-GCM, optional ML-KEM. /crypto/", source: "crypto", offline: true };
    return { text: "«" + String(q).slice(0, 80) + "». кто ты · genesis · запомни:", source: "fallback", offline: true };
  }
  async function ask(q, opts) {
    opts = opts || {}; q = String(q || "").trim();
    if (!q) return { text: "Пусто", source: "empty", offline: true };
    if (G.AKSI_GENESIS && G.AKSI_GENESIS.think) {
      try {
        var g = await G.AKSI_GENESIS.think(q, { quantum: opts.quantum !== false });
        var p = g.payload || g;
        return { text: p.answer || "—", source: "genesis", offline: true, kind: p.kind, critique: p.critique, quantum: p.quantum, seal: g.seal, derived: p.derived, thought: p.thought, ms: p.ms };
      } catch (e) {}
    }
    if (G.AKSI_AI && G.AKSI_AI.think) {
      try {
        var r = await G.AKSI_AI.think(q);
        var p2 = r.payload || r;
        return { text: p2.answer || "—", source: "aksi-ai", offline: true, kind: p2.kind, critique: p2.critique, seal: r.seal, thought: p2.thought, ms: p2.ms };
      } catch (e) {}
    }
    return localAnswer(q);
  }
  async function capabilities() {
    return { version: VER, offline: true, genesis: !!(G.AKSI_GENESIS && G.AKSI_GENESIS.think), aksi_ai: !!(G.AKSI_AI && G.AKSI_AI.think), crypto: !!G.AKSI_CRYPTO, quantum: !!(G.AKSI_QPIPE || G.AKSI_QUANTUM) };
  }
  G.AKSIAgent = { version: VER, ask: ask, capabilities: capabilities, localAnswer: localAnswer };
})(typeof window !== "undefined" ? window : globalThis);
