/**
 * AKSI Brain RU v2.2 — fusion + Comprehend (find	o understand	o answer)
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "2.2.0-comprehend";
  var depth = 0;
  var KB = [
    { k: ["кто ты", "who are you", "привет", "здравствуй", "представься"], a: "Я АКСИ — суверенная локальная платформа Decision Integrity.\nКонвейер: найти → понять → ответить → коллапс.\nКонтакт: aksilove@internet.ru" },
    { k: ["формул", "formula", "aksi ="], a: "AKSI = (A × I × S) × (1 + 0.4√n)\nA — agency, I — integrity, S — structure, n — sealed history." },
    { k: ["как пользоваться", "помощ", "help", "миссия", "платформ"], a: "1) /ask.html — спросить\n2) /aksi.html — лаборатория\n3) Вопрос → поиск фактов → осмысление → ответ.\naksilove@internet.ru" },
    { k: ["comprehend", "найти", "понять", "осмысли"], a: "Comprehend: найти факты (Wikipedia/веб) → извлечь смысл → связный ответ на русском + ссылки." }
  ];

  function packet(answer, source, extra) {
    extra = extra || {};
    return Object.assign({ ok: true, answer: answer, text: answer, source: source, version: VER }, extra);
  }
  function mostlyEnglish(text) {
    text = String(text || "");
    if (text.length < 16) return false;
    var cyr = (text.match(/[а-яёА-ЯЁ]/g) || []).length;
    var lat = (text.match(/[a-zA-Z]/g) || []).length;
    if (lat < 24) return false;
    return lat > cyr * 2;
  }
  function garbage(text) {
    if (!text || text.length < 3) return true;
    if (/^(undefined|null|NaN|error)/i.test(text)) return true;
    return false;
  }
  function kbHits(query) {
    var q = String(query || "").toLowerCase();
    var out = [];
    for (var i = 0; i < KB.length; i++) {
      for (var j = 0; j < KB[i].k.length; j++) {
        if (q.indexOf(KB[i].k[j]) !== -1) { out.push(KB[i].a); break; }
      }
    }
    return out;
  }
  function fuse(lines) {
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
        } catch (e) {}
        return packet("Сохранено в Crystal: «" + fact.slice(0, 160) + "»", "learn");
      }
      var candidates = [];
      var layers = [];
      var kbs = kbHits(query);
      for (var ki = 0; ki < kbs.length; ki++) candidates.push({ t: kbs[ki], s: "kb", w: 5 });

      if (G.AKSI_MIND && typeof G.AKSI_MIND.reason === "function") {
        try {
          var m = await G.AKSI_MIND.reason(query, { crystal: true });
          if (m && (m.answer || m.text) && !garbage(m.answer || m.text) && !mostlyEnglish(m.answer || m.text)) {
            layers.push("mind");
            candidates.push({ t: m.answer || m.text, s: m.source || "mind", w: 4 });
          }
        } catch (e) {}
      }
      if (G.AKSI_CRYSTAL && typeof G.AKSI_CRYSTAL.associate === "function") {
        try {
          var c = await G.AKSI_CRYSTAL.associate(query, { k: 4 });
          if (c && c.associations) {
            layers.push("crystal");
            for (var ci = 0; ci < Math.min(2, c.associations.length); ci++) {
              if (c.associations[ci].score >= 1)
                candidates.push({ t: c.associations[ci].text, s: "crystal", w: 2 + (c.associations[ci].score || 0) });
            }
          }
        } catch (e) {}
      }
      if (G.AKSI_NEURO && typeof G.AKSI_NEURO.think === "function") {
        try {
          var n = await Promise.resolve(G.AKSI_NEURO.think(query));
          if (n && (n.text || n.answer) && !garbage(n.text || n.answer) && !mostlyEnglish(n.text || n.answer)) {
            layers.push("neuro");
            candidates.push({ t: n.text || n.answer, s: "neuro", w: 2.2 });
          }
        } catch (e) {}
      }

      var strongKb = candidates.some(function (c) { return c.w >= 5; });
      if (!strongKb && opts.web !== false && G.AKSI_COMPREHEND && typeof G.AKSI_COMPREHEND.answer === "function") {
        try {
          var ca = await G.AKSI_COMPREHEND.answer(query, { useLLM: opts.useLLM !== false });
          if (ca && ca.answer && !garbage(ca.answer) && !mostlyEnglish(ca.answer)) {
            layers.push("comprehend:" + (ca.mode || ""));
            candidates.push({ t: ca.answer, s: ca.source || "comprehend", w: 6.5 });
          }
        } catch (eC) {}
      }

      if (G.AKSI_WEBLLM && typeof G.AKSI_WEBLLM.ready === "function" && AKSI_WEBLLM.ready() && opts.webllm !== false && !strongKb) {
        try {
          var w = await AKSI_WEBLLM.complete(query, { temperature: 0.3, system: "Ты АКСИ. Только русский. Кратко и по делу." });
          var wt = (w && (w.text || w.answer)) || "";
          if (wt && !garbage(wt) && !mostlyEnglish(wt)) {
            layers.push("webllm");
            candidates.push({ t: wt, s: "webllm", w: 3.5 });
          }
        } catch (e) {}
      }

      if (!candidates.length) {
        return packet("АКСИ Brain RU v" + VER + ".\nМало следов. Спросите: кто ты · миссия · формула.\nИли включите поиск источников.\naksilove@internet.ru", "fallback", { layers: layers });
      }
      candidates.sort(function (a, b) { return b.w - a.w; });
      var top = candidates.slice(0, 2);
      var primary = top[0].s;
      var answer = strongKb ? top[0].t : fuse(top.map(function (x) { return x.t; }));
      if (strongKb) answer = top[0].t;
      else answer = top[0].t;
      return packet(answer, top.length > 1 ? "fusion:" + primary : primary, {
        layers: layers,
        weight: top[0].w
      });
    } finally {
      depth--;
    }
  }

  G.AKSI_BRAIN = { version: VER, decide: decide, think: decide, reason: decide };
})(typeof window !== "undefined" ? window : globalThis);
