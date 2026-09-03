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
    if (/кто ты|who are you|что такое акси|what is aksi/.test(low))
      return { text: "Я АКСИ — суверенный offline-first ИИ. Genesis \u00b7 AI \u00b7 Crypto \u00b7 Quantum \u00b7 MATRIX.\naksilove@internet.ru", source: "identity", offline: true };
    if (/genesis|дженезис/.test(low))
      return { text: "Genesis v2: SENSE→…→ATTEST, quantum gate, cortex, derived.\n/genesis/", source: "genesis", offline: true };
    if (/как польз|help|с чего/.test(low))
      return { text: "1) Бот\n2) /genesis/\n3) /ai/\n4) /crypto/\n5) /matrix/\n6) «запомни: факт»", source: "guide", offline: true };
    if (/модул|что уме|capabilit/.test(low))
      return { text: "Genesis, AI, Crypto, SPA, Chat, MATRIX, Local AI, Quantum, Proof, Globe, Net, Protocol, ADIA, Bot.", source: "caps", offline: true };
    if (/квант|quantum|qcli/.test(low))
      return { text: "Квант АКСИ — state-vector + QCLI + answerGate. /quantum/ \u00b7 /genesis/", source: "quantum", offline: true };
    if (/крипто|подпис|шифр|pq|post-quantum/.test(low))
      return { text: "Cipher Suite: ECDSA/Ed25519, ECDH, AES-GCM, optional ML-KEM. /crypto/", source: "crypto", offline: true };
    if (/сеть|интернет|net/.test(low))
      return { text: "АКСИ-Сеть: Chat↔Mem↔Trust↔Quantum↔Bot↔Genesis.", source: "net", offline: true };
    if (G.AKSI_PRIORITY_ANSWER) {
      try { var a = G.AKSI_PRIORITY_ANSWER(q); if (a && a.text) return { text: String(a.text), source: a.source || "priority", offline: true }; } catch (e) {}
    }
    return { text: "Принято: «" + String(q).slice(0, 100) + "».\nкто ты \u00b7 genesis \u00b7 модули \u00b7 запомни:", source: "fallback", offline: true };
  }

  async function ask(q, opts) {
    opts = opts || {};
    q = String(q || "").trim();
    if (!q) return { text: "Пустой запрос", source: "empty", offline: true };

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
    var loc = localAnswer(q);
    if (opts.alsoSearch || opts.api) {
      try {
        var res = await fetch(API + "/api/v1/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: q }), signal: AbortSignal.timeout(15000) });
        if (res.ok) {
          var j = await res.json();
          return { text: j.reply || j.answer || j.text || JSON.stringify(j).slice(0, 400), source: "api", offline: false };
        }
      } catch (e) {}
    }
    return loc;
  }

  async function capabilities() {
    return {
      version: VER, offline: true,
      genesis: !!(G.AKSI_GENESIS && G.AKSI_GENESIS.think),
      aksi_ai: !!(G.AKSI_AI && G.AKSI_AI.think),
      crypto: !!G.AKSI_CRYPTO,
      quantum: !!(G.AKSI_QPIPE || G.AKSI_QUANTUM),
      stages: G.AKSI_GENESIS ? G.AKSI_GENESIS.stages : []
    };
  }

  G.AKSIAgent = { version: VER, ask: ask, capabilities: capabilities, localAnswer: localAnswer };
})(typeof window !== "undefined" ? window : globalThis);
