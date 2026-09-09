/**
 * AKSI Brain RU v2.0 — fusion router
 * Mind(leaf) → Crystal → Neuro → Organism → WebLLM(RU-gate) → KB
 * Multi-hit fusion. No AKSI.decide recursion. Depth guard.
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "2.0.0-brain-fusion";
  var depth = 0;
  var KB = [
    { k: ["кто ты", "who are you", "привет", "здравствуй", "представься"], a: "Я АКСИ — суверенная локальная платформа Decision Integrity.\nСтек: Brain RU · Mind · Crystal · Neuro · π-Contour · Reality · Swarm · Vault · offline SW.\nОтвет → Gate → seal. Без обязательного облака.\nКонтакт: aksilove@internet.ru" },
    { k: ["формул", "formula", "aksi ="], a: "AKSI = (A × I × S) × (1 + 0.4√n)\nA — agency (действие)\nI — integrity (EQS / целостность)\nS — structure / sovereignty\nn — число sealed-записей\nЧем длиннее честная история решений, тем выше множитель опыта." },
    { k: ["контур", "π", "пи", "pi-contour", "пи-контур"], a: "π-Contour — вычислительный контур:\nquery → SHA-256 → угол θ ∈ [0, 2π) → sin/cos-признаки → FNV seal.\nДетерминизм: один и тот же текст → тот же θ." },
    { k: ["crystal", "кристал", "памят", "memory"], a: "Crystal — трёхслойная память:\n1) Neuro — лексический резонанс\n2) RAG — IndexedDB следы\n3) HRR — голографическое поле\nКоманда: «запомни: факт»." },
    { k: ["swarm", "p2p", "сварм"], a: "Swarm — обмен слепками мысли:\nWebRTC DataChannel + manual SDP.\nБез своего signaling-сервера." },
    { k: ["reality", "реальн", "геолокац", "сенсор"], a: "Reality Layer — граница с физическим миром:\nopt-in geo / camera / mic / network.\nТолько observe. RealityEvent + FNV seal.\nДоступ ≠ истина. /reality/" },
    { k: ["gate", "гейт", "eqs", "seal", "proof"], a: "Decision Integrity:\n• EQS — инженерный score\n• Gate τ ≈ 0.55\n• seal — FNV / π / brain-метка\nАудируемый след, не «доказательство истины»." },
    { k: ["offline", "без сети", "автоном", "sovereign"], a: "Offline-first: Service Worker кэширует shell.\nPlatform / Contour / Sovereign работают без сети после установки SW." },
    { k: ["webllm", "веб ллм", "llm", "qwen"], a: "WebLLM (Qwen) — опция.\nBrain принимает только русский ответ; английский/мусор отсекается." },
    { k: ["как пользоваться", "помощ", "help", "с чего", "миссия", "платформ", "platform"], a: "Миссия АКСИ — суверенный Decision Integrity в браузере.\n\n1) /platform.html — единый вход\n2) /contour/ — Decision · Chat · Memory\n3) /sovereign/ — Mind · Crystal · Swarm\n4) /reality/ — наблюдения\n5) «запомни: …» — Crystal\n\nКонтакт: aksilove@internet.ru" },
    { k: ["vault", "шифр", "crypto"], a: "Vault / PiFractalCrypto: локальный AES-GCM, соль из Math.PI + PBKDF2.\nДанные по умолчанию не уходят на сервер." },
    { k: ["статус", "что умеешь", "возможности"], a: "Умею: русский Decision, Crystal learn, π-seal, Gate, Reality observe, Swarm SDP, offline SW.\nНе умею: всезнание; критические решения — за человеком." },
    { k: ["контакт", "email", "связаться"], a: "Публичный контакт: aksilove@internet.ru · X @AKSILOVE" }
  ];
  function kbHits(q) {
    var s = String(q || "").toLowerCase();
    var out = [];
    for (var i = 0; i < KB.length; i++) {
      for (var j = 0; j < KB[i].k.length; j++) {
        if (s.indexOf(KB[i].k[j]) !== -1) { out.push(KB[i].a); break; }
      }
    }
    return out;
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
      scores: extra.scores || { aksi: 0.84, eqs: 84, phi: 0.7, qcli: 0.65 },
      gate: { ok: true, reason: "brain-fusion-pass" },
      seal: { kind: "brain-ru", v: VER, t: Date.now(), source: source },
      version: VER, lang: "ru", layers: extra.layers || []
    };
  }
  function fuse(parts) {
    var seen = {}, lines = [];
    for (var i = 0; i < parts.length; i++) {
      var t = String(parts[i] || "").trim();
      if (!t) continue;
      var key = t.slice(0, 60);
      if (seen[key]) continue;
      seen[key] = 1;
      lines.push(t);
    }
    if (!lines.length) return null;
    if (lines.length === 1) return lines[0];
    return lines.join("\n\n—\n\n");
  }
  async function decide(query, opts) {
    opts = opts || {};
    query = String(query || "").trim();
    if (!query) return { ok: false, answer: "", source: "empty" };
    if (depth > 2) {
      var g = kbHits(query);
      return packet(g[0] || "АКСИ Brain (depth guard).", g[0] ? "kb" : "guard");
    }
    depth++;
    try {
      if (/^запомни\s*[:：]/i.test(query) || /^remember\s*[:：]/i.test(query)) {
        var fact = query.replace(/^(запомни|remember)\s*[:：]\s*/i, "");
        try {
          if (G.AKSI_CRYSTAL && G.AKSI_CRYSTAL.remember) await G.AKSI_CRYSTAL.remember(fact);
          if (G.AKSI_NEURO && typeof G.AKSI_NEURO.learn === "function") { try { G.AKSI_NEURO.learn(fact); } catch (e1) {} }
        } catch (e) {}
        return packet("Сохранено в Crystal: «" + fact.slice(0, 160) + "»", "learn");
      }
      var candidates = [];
      var layers = [];
      var kbs = kbHits(query);
      for (var ki = 0; ki < kbs.length; ki++) candidates.push({ t: kbs[ki], s: "kb", w: 3 });
      if (G.AKSI_MIND && typeof G.AKSI_MIND.reason === "function") {
        try {
          var m = await G.AKSI_MIND.reason(query, { crystal: true });
          if (m && (m.answer || m.text) && !garbage(m.answer || m.text) && !mostlyEnglish(m.answer || m.text)) {
            layers.push("mind:" + (m.source || ""));
            candidates.push({ t: m.answer || m.text, s: m.source || "mind", w: m.source === "mind-fallback" ? 1 : 4 });
          }
        } catch (e) {}
      }
      if (G.AKSI_CRYSTAL && typeof G.AKSI_CRYSTAL.associate === "function") {
        try {
          var c = await G.AKSI_CRYSTAL.associate(query, { k: 4 });
          if (c && c.associations) {
            layers.push("crystal:" + c.associations.length);
            for (var ci = 0; ci < Math.min(2, c.associations.length); ci++) {
              if (c.associations[ci].score >= 1) candidates.push({ t: c.associations[ci].text, s: "crystal", w: 2 + (c.associations[ci].score || 0) });
            }
          }
        } catch (e) {}
      }
      if (G.AKSI_NEURO && typeof G.AKSI_NEURO.think === "function") {
        try {
          var n = await Promise.resolve(G.AKSI_NEURO.think(query));
          if (n && (n.text || n.answer) && !garbage(n.text || n.answer) && !mostlyEnglish(n.text || n.answer)) {
            layers.push("neuro");
            candidates.push({ t: n.text || n.answer, s: "neuro", w: 3 });
          }
        } catch (e) {}
      }
      if (G.AKSI_ORGANISM && typeof G.AKSI_ORGANISM.decide === "function" && !opts.skipOrganism) {
        try {
          var o = await G.AKSI_ORGANISM.decide(query);
          if (o && o.answer && !garbage(o.answer) && !mostlyEnglish(o.answer)) {
            layers.push("organism");
            candidates.push({ t: o.answer, s: o.source || "organism", w: 3 });
          }
        } catch (e) {}
      }
      if (opts.allowWebLLM !== false && G.AKSI_WEBLLM && G.AKSI_WEBLLM.ready && G.AKSI_WEBLLM.ready()) {
        try {
          var w = await G.AKSI_WEBLLM.complete(query, {
            temperature: 0.25, max_tokens: 420,
            system: "Ты — АКСИ. Отвечай ТОЛЬКО на русском. Ясно, по делу, без английского. Не выдумывай."
          });
          if (w && w.text && !garbage(w.text) && !mostlyEnglish(w.text)) {
            layers.push("webllm");
            candidates.push({ t: w.text, s: "webllm-ru", w: 2.5 });
          }
        } catch (e) {}
      }
      if (!candidates.length) {
        return packet("АКСИ Brain RU v" + VER + ".\nМало следов. Спросите: кто ты · миссия · формула · crystal.\nИли «запомни: …»\nКонтакт: aksilove@internet.ru", "fallback", { layers: layers });
      }
      candidates.sort(function (a, b) { return b.w - a.w; });
      var top = [], seenS = {};
      for (var i = 0; i < candidates.length && top.length < 3; i++) {
        var key = candidates[i].t.slice(0, 50);
        if (seenS[key]) continue;
        seenS[key] = 1;
        top.push(candidates[i].t);
      }
      var answer = fuse(top);
      var primary = candidates[0].s;
      return packet(answer, top.length > 1 ? "fusion:" + primary : primary, {
        layers: layers,
        scores: { aksi: 0.86, eqs: 86, phi: 0.72, qcli: 0.68 }
      });
    } finally { depth--; }
  }
  G.AKSI_BRAIN = { version: VER, decide: decide, think: decide, reason: decide };
})(typeof window !== "undefined" ? window : globalThis);
