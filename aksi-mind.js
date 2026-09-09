/**
 * AKSI Mind v1.2 — leaf reasoner (NO calls to AKSI API / Brain)
 * Layers: Crystal → Neuro → KB only
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.2.0-mind-leaf";
  var KB = [
    { k: ["кто ты", "who are you", "привет", "hello"], a: "Я АКСИ — локальный Decision Integrity runtime. Offline: ответ · Gate · seal. Контакт: aksilove@internet.ru" },
    { k: ["формул", "formula"], a: "AKSI = (A × I × S) × (1 + 0.4√n)\nA — agency · I — integrity · S — structure · n — sealed history" },
    { k: ["контур", "π", "pi", "пи"], a: "π-Contour: запрос → SHA-256 → θ ∈ [0, 2π) → sin/cos → FNV seal. Тот же текст → тот же θ." },
    { k: ["crystal", "кристал", "памят", "memory", "hrr"], a: "Crystal: Neuro + RAG IndexedDB + HRR. «запомни: факт» вписывает след." },
    { k: ["swarm", "p2p"], a: "Swarm: WebRTC DataChannel, manual SDP, без своего signaling-сервера." },
    { k: ["reality", "реальн"], a: "Reality Layer: opt-in наблюдения → RealityEvent (observe-only). /reality/" },
    { k: ["gate", "гейт", "eqs"], a: "Gate τ ≈ 0.55. EQS — инженерный score целостности ответа." },
    { k: ["vault", "шифр", "crypto"], a: "Vault / PiFractal: локальный AES-GCM. Данные по умолчанию не уходят в облако." },
    { k: ["offline", "автоном", "без сети", "sovereign"], a: "Service Worker кэширует shell. Contour/Sovereign работают offline после установки SW." },
    { k: ["как пользоваться", "с чего начать", "help", "помощ"], a: "1) Contour → Decision\n2) Sovereign → Mind / Crystal / Swarm\n3) Reality — opt-in сенсоры\nWebLLM — опция (Qwen). Основной путь — Brain RU offline." },
    { k: ["статус", "status", "что умеешь"], a: "Умею: decide/think, π-seal, Crystal, Swarm, Reality, offline SW.\nНе умею: всезнание; критические решения — за человеком." },
    { k: ["brain", "браин", "мозг"], a: "Brain RU — маршрутизатор: Mind → Crystal → Neuro → (WebLLM только если ответ по-русски) → KB." }
  ];
  function kbAnswer(q) {
    var s = String(q || "").toLowerCase();
    for (var i = 0; i < KB.length; i++) {
      for (var j = 0; j < KB[i].k.length; j++) {
        if (s.indexOf(KB[i].k[j]) !== -1) return KB[i].a;
      }
    }
    return null;
  }
  async function reason(query, opts) {
    opts = opts || {};
    query = String(query || "").trim();
    if (!query) return { ok: false, answer: "", source: "empty" };
    var layers = [];
    var answer = null;
    var source = "mind";
    if (G.AKSI_CRYSTAL && typeof G.AKSI_CRYSTAL.associate === "function" && opts.crystal !== false) {
      try {
        var cr = await G.AKSI_CRYSTAL.associate(query, { k: 4 });
        if (cr && cr.associations && cr.associations.length) {
          layers.push({ layer: "crystal", n: cr.associations.length });
          if (cr.associations[0].score >= 1) { answer = cr.associations[0].text; source = "crystal"; }
        }
      } catch (e) {}
    }
    if (!answer && G.AKSI_NEURO && typeof G.AKSI_NEURO.think === "function") {
      try {
        var n = await Promise.resolve(G.AKSI_NEURO.think(query));
        if (n && (n.text || n.answer)) { answer = n.text || n.answer; source = "neuro"; layers.push({ layer: "neuro", score: n.score }); }
      } catch (e) {}
    }
    if (!answer) {
      var kb = kbAnswer(query);
      if (kb) { answer = kb; source = "mind-kb"; layers.push({ layer: "kb" }); }
    }
    if (!answer) {
      answer = "АКСИ Mind v" + VER + ".\nСпросите: кто ты, формула, контур, crystal, swarm, reality, как пользоваться.\nИли «запомни: …»\nКонтакт: aksilove@internet.ru";
      source = "mind-fallback";
    }
    return { ok: true, answer: answer, text: answer, source: source, layers: layers, version: VER, scores: { aksi: 0.76, eqs: 76, phi: 0.6, qcli: 0.55 }, gate: { ok: true, reason: "mind-pass" }, seal: { kind: "mind", v: VER, t: Date.now() } };
  }
  G.AKSI_MIND = { version: VER, reason: reason, think: reason, decide: reason, kb: KB };
})(typeof window !== "undefined" ? window : globalThis);
