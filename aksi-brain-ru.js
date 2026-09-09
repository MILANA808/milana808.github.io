/**
 * AKSI Brain RU v1.1 — platform router (no recursion)
 * Mind(leaf) → Crystal → Neuro → Organism → WebLLM(RU-gate) → KB
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.1.0-brain-ru";
  var depth = 0;
  var KB = [
    { k: ["кто ты", "who are you", "привет", "здравствуй"], a: "Я АКСИ — единая платформа Decision Integrity. Offline Brain RU: ответ, Gate, seal. Контакт: aksilove@internet.ru" },
    { k: ["формул", "formula"], a: "AKSI = (A × I × S) × (1 + 0.4√n)\nA — agency · I — integrity · S — structure · n — sealed history" },
    { k: ["контур", "π", "пи", "pi-contour"], a: "π-Contour: запрос → SHA-256 → θ ∈ [0, 2π) → sin/cos → FNV seal." },
    { k: ["crystal", "кристал", "памят"], a: "Crystal — Neuro + RAG + HRR. «запомни: факт» наращивает поле." },
    { k: ["swarm", "p2p"], a: "Swarm — WebRTC слепки мысли, manual SDP, без своего signaling-сервера." },
    { k: ["reality", "реальн"], a: "Reality Layer — opt-in гео/камера/мик/сеть → RealityEvent (observe-only). /reality/" },
    { k: ["gate", "гейт", "eqs"], a: "Gate τ ≈ 0.55. EQS — инженерный score, не «истина»." },
    { k: ["offline", "без сети", "автоном"], a: "SW кэширует Contour/Sovereign. Практичная автономия в браузере." },
    { k: ["как пользоваться", "помощ", "help", "с чего", "миссия"], a: "Платформа АКСИ:\n1) /platform/ — единый вход\n2) /contour/ — Decision / Chat\n3) /sovereign/ — Mind · Crystal · Swarm\n4) /reality/ — наблюдения\n5) «запомни: …» — локальная память\nКонтакт: aksilove@internet.ru" },
    { k: ["webllm", "веб ллм", "llm"], a: "WebLLM (Qwen) — опция. Brain принимает ответ только на русском; английский/мусор отсекается." },
    { k: ["платформ", "platform", "что умеешь", "статус"], a: "Единый стек: Brain RU · Mind · Crystal · Neuro · π-Contour · Reality · Swarm · Vault · SW offline · API decide/think/learn." }
  ];
  function kbHit(q) {
    var s = String(q || "").toLowerCase();
    for (var i = 0; i < KB.length; i++) {
      for (var j = 0; j < KB[i].k.length; j++) {
        if (s.indexOf(KB[i].k[j]) !== -1) return KB[i].a;
      }
    }
    return null;
  }
  function mostlyEnglish(text) {
    text = String(text || "");
    if (text.length < 16) return false;
    var cyr = (text.match(/[А-Яа-яЁё]/g) || []).length;
    var lat = (text.match(/[A-Za-z]/g) || []).length;
    if (lat < 24) return false;
    return lat > cyr * 2;
  }
  function garbage(text) {
    text = String(text || "").trim();
    if (!text || text.length < 3) return true;
    if (/^(undefined|null|NaN|error)/i.test(text)) return true;
    return false;
  }
  function packet(answer, source, extra) {
    extra = extra || {};
    return {
      ok: true, id: "brain-" + Date.now().toString(36), answer: answer, text: answer,
      anti: "brain-ru · " + source, source: source,
      scores: extra.scores || { aksi: 0.8, eqs: 80, phi: 0.65, qcli: 0.6 },
      gate: { ok: true, reason: "brain-ru-pass" },
      seal: { kind: "brain-ru", v: VER, t: Date.now(), source: source }, version: VER, lang: "ru"
    };
  }
  async function decide(query, opts) {
    opts = opts || {};
    query = String(query || "").trim();
    if (!query) return { ok: false, answer: "", source: "empty" };
    if (depth > 2) {
      var kb0 = kbHit(query);
      return packet(kb0 || "АКСИ Brain (depth guard).", kb0 ? "kb" : "guard");
    }
    depth++;
    try {
      if (/^запомни\s*[:：]/i.test(query) || /^remember\s*[:：]/i.test(query)) {
        var fact = query.replace(/^(запомни|remember)\s*[:：]\s*/i, "");
        try { if (G.AKSI_CRYSTAL && G.AKSI_CRYSTAL.remember) await G.AKSI_CRYSTAL.remember(fact); } catch (e) {}
        return packet("Сохранено: «" + fact.slice(0, 140) + "»", "learn");
      }
      var mindFb;
      if (G.AKSI_MIND && typeof G.AKSI_MIND.reason === "function") {
        try {
          var m = await G.AKSI_MIND.reason(query, { crystal: true });
          if (m && (m.answer || m.text) && !garbage(m.answer || m.text) && !mostlyEnglish(m.answer || m.text)) {
            if (m.source !== "mind-fallback") return packet(m.answer || m.text, m.source || "mind", { scores: m.scores });
            mindFb = m.answer || m.text;
          }
        } catch (e) {}
      }
      if (G.AKSI_CRYSTAL && typeof G.AKSI_CRYSTAL.associate === "function") {
        try {
          var c = await G.AKSI_CRYSTAL.associate(query, { k: 3 });
          if (c && c.associations && c.associations[0] && c.associations[0].score >= 2) return packet(c.associations[0].text, "crystal");
        } catch (e) {}
      }
      if (G.AKSI_NEURO && typeof G.AKSI_NEURO.think === "function") {
        try {
          var n = await Promise.resolve(G.AKSI_NEURO.think(query));
          if (n && (n.text || n.answer) && !garbage(n.text || n.answer) && !mostlyEnglish(n.text || n.answer)) return packet(n.text || n.answer, "neuro");
        } catch (e) {}
      }
      if (G.AKSI_ORGANISM && typeof G.AKSI_ORGANISM.decide === "function" && !opts.skipOrganism) {
        try {
          var o = await G.AKSI_ORGANISM.decide(query);
          if (o && o.answer && !garbage(o.answer) && !mostlyEnglish(o.answer)) return packet(o.answer, o.source || "organism", { scores: o.scores });
        } catch (e) {}
      }
      if (opts.allowWebLLM !== false && G.AKSI_WEBLLM && G.AKSI_WEBLLM.ready && G.AKSI_WEBLLM.ready()) {
        try {
          var w = await G.AKSI_WEBLLM.complete(query, { temperature: 0.25, max_tokens: 400, system: "Ты — АКСИ. Отвечай ТОЛЬКО на русском. Кратко и по делу. Без английского." });
          if (w && w.text && !garbage(w.text) && !mostlyEnglish(w.text)) return packet(w.text, "webllm-ru");
        } catch (e) {}
      }
      var kb = kbHit(query);
      if (kb) return packet(kb, "kb");
      if (mindFb) return packet(mindFb, "mind-fallback");
      return packet("АКСИ Brain RU v" + VER + ".\nМало следов. Спросите: кто ты · формула · миссия · platform.\nИли «запомни: …»\nКонтакт: aksilove@internet.ru", "fallback");
    } finally { depth--; }
  }
  G.AKSI_BRAIN = { version: VER, decide: decide, think: decide, reason: decide };
})(typeof window !== "undefined" ? window : globalThis);
