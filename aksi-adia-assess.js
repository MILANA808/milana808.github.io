/**
 * AKSI ADIA Assess — 5 осей + порог 70% → реген
 * Опционально Transformers.js DistilBERT, если уже загружен (без forced GB download).
 */
(function (G) {
  "use strict";
  var REGEN_HINTS = [
    "уточни, будь более логичным и последовательным",
    "ответь релевантнее вопросу, без лишнего",
    "дополни ответ конкретными фактами",
    "добавь эмпатию и ясность формулировок",
    "избегай шаблонов, дай оригинальную опору на данные"
  ];
  function tokens(s) {
    return String(s || "").toLowerCase().replace(/ё/g, "е").split(/[^\p{L}\p{N}]+/u).filter(function (t) { return t.length > 1; });
  }
  function overlap(a, b) {
    var set = {}; b.forEach(function (t) { set[t] = 1; });
    var n = 0; a.forEach(function (t) { if (set[t]) n++; });
    return a.length ? n / a.length : 0;
  }
  function logicScore(text) {
    var t = String(text || ""); var s = 0.45;
    if (/потому|поэтому|если|значит|следовательно|из-за|так как|because|therefore/i.test(t)) s += 0.18;
    if (t.indexOf("\n") !== -1 || /•|\d[.)]/.test(t)) s += 0.1;
    if (/не знаю|нет данных|резонанс слаб|отказываюсь выдумывать/i.test(t)) s += 0.15;
    if (t.length < 20) s -= 0.15;
    return Math.max(0, Math.min(1, s));
  }
  function relevanceScore(text, context) {
    var qt = tokens(context && (context.query || context.q || context));
    var at = tokens(text);
    if (!qt.length) return 0.5;
    var o = overlap(qt, at);
    if (/акси|adia|pipeline|протокол|offline|памят/i.test(text) && /акси|adia|pipeline|протокол|памят/i.test(String(context && context.query || context || ""))) o = Math.min(1, o + 0.15);
    return Math.max(0.15, Math.min(1, o * 1.2));
  }
  function completenessScore(text) {
    var s = Math.min(1, String(text || "").length / 280);
    if (/•|\n-|\d[.)]/.test(text)) s = Math.min(1, s + 0.12);
    return s;
  }
  function empathyScore(text) {
    var s = 0.4;
    if (/понимаю|давай|вместе|можно|помог|важно|осторожн|рад|спасибо|пожалуйста/i.test(text)) s += 0.3;
    if (/ошиб|границ|не уверен|уточни/i.test(text)) s += 0.15;
    return Math.max(0, Math.min(1, s));
  }
  function originalityScore(text) {
    var t = String(text || ""); var s = 0.4;
    if (t.length > 80) s += 0.15;
    if (/не знаю|мало фактов|не утверждаю/i.test(t)) s += 0.25;
    if (/как языковая модель|chatgpt|openai/i.test(t)) s -= 0.3;
    return Math.max(0, Math.min(1, s));
  }
  async function optionalSentiment(text) {
    try {
      if (G.AKSI_TRANSFORMERS_PIPE && typeof G.AKSI_TRANSFORMERS_PIPE === "function") {
        var r = await G.AKSI_TRANSFORMERS_PIPE(String(text || "").slice(0, 512));
        return Array.isArray(r) && r[0] ? r[0] : r;
      }
    } catch (e) {}
    return null;
  }
  async function assessResponse(text, context) {
    var query = typeof context === "string" ? context : (context && (context.query || context.q)) || "";
    var axes01 = {
      logic: logicScore(text),
      relevance: relevanceScore(text, { query: query }),
      completeness: completenessScore(text),
      empathy: empathyScore(text),
      originality: originalityScore(text)
    };
    var sent = await optionalSentiment(text);
    if (sent && sent.label && String(sent.label).toUpperCase().indexOf("NEG") !== -1 && axes01.empathy < 0.7) axes01.empathy = Math.max(0, axes01.empathy - 0.08);
    var avg = (axes01.logic + axes01.relevance + axes01.completeness + axes01.empathy + axes01.originality) / 5;
    var score = Math.round(avg * 100);
    try {
      if (G.AKSI_ALGORITHM && typeof G.AKSI_ALGORITHM.evaluate === "function") {
        var ev = G.AKSI_ALGORITHM.evaluate(query || "assess", text, { offline: true, source: "assess", seal: false });
        var m = ev.metrics || ev;
        var eqs = m.EQS != null ? m.EQS : m.eqs;
        if (eqs != null) { var e = Number(eqs); if (e > 1) e = e / 100; score = Math.round(score * 0.7 + e * 100 * 0.3); }
      }
    } catch (e) {}
    var axes = { logic: Math.round(axes01.logic * 100), relevance: Math.round(axes01.relevance * 100), completeness: Math.round(axes01.completeness * 100), empathy: Math.round(axes01.empathy * 100), originality: Math.round(axes01.originality * 100) };
    var pass = score >= 70;
    var hint = null;
    if (!pass) {
      var worst = "logic", worstV = axes01.logic;
      Object.keys(axes01).forEach(function (k) { if (axes01[k] < worstV) { worstV = axes01[k]; worst = k; } });
      var map = { logic: 0, relevance: 1, completeness: 2, empathy: 3, originality: 4 };
      hint = REGEN_HINTS[map[worst] != null ? map[worst] : 0];
    }
    return { axes: axes, score: score, pass: pass, hint: hint, sentiment: sent, regenPrompt: !pass && query ? String(query) + "\n\n[ADIA] " + (hint || REGEN_HINTS[0]) : null };
  }
  function assessSync(text, context) {
    var query = typeof context === "string" ? context : (context && (context.query || context.q)) || "";
    var axes01 = { logic: logicScore(text), relevance: relevanceScore(text, { query: query }), completeness: completenessScore(text), empathy: empathyScore(text), originality: originalityScore(text) };
    var avg = (axes01.logic + axes01.relevance + axes01.completeness + axes01.empathy + axes01.originality) / 5;
    var score = Math.round(avg * 100);
    return { axes: { logic: Math.round(axes01.logic * 100), relevance: Math.round(axes01.relevance * 100), completeness: Math.round(axes01.completeness * 100), empathy: Math.round(axes01.empathy * 100), originality: Math.round(axes01.originality * 100) }, score: score, pass: score >= 70 };
  }
  G.AKSI_ADIA_ASSESS = { assessResponse: assessResponse, assessSync: assessSync, REGEN_HINTS: REGEN_HINTS };
})(typeof window !== "undefined" ? window : globalThis);
