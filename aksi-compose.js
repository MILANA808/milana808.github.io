/**
 * AKSI Resonance Composer v2.0 — generative offline core + self-growth
 * query → intent → evidence → GENERATE → ADIA → GROW
 * Contact: aksilove@internet.ru
 */
(function (global) {
  "use strict";
  var VER = "2.0.0-grow";
  var GROW_KEY = "aksi_core_grow_v2";
  var STATS_KEY = "aksi_core_stats_v2";
  var LAST_KEY = "aksi_core_last_v2";
  var MAX_GROW = 400;
  function tokens(s) {
    return String(s || "").toLowerCase().replace(/[^a-zа-яё0-9\s]/gi, " ").split(/\s+/).filter(function (t) { return t.length > 1; });
  }
  function loadGrow() {
    try { var a = JSON.parse(localStorage.getItem(GROW_KEY) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function saveGrow(arr) {
    try { if (arr.length > MAX_GROW) arr = arr.slice(-MAX_GROW); localStorage.setItem(GROW_KEY, JSON.stringify(arr)); } catch (e) {}
  }
  function loadStats() {
    try { return JSON.parse(localStorage.getItem(STATS_KEY) || "{}") || {}; } catch (e) { return {}; }
  }
  function saveStats(s) { try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch (e) {} }
  function bump(field, n) {
    var s = loadStats(); s[field] = (s[field] || 0) + (n || 1); s.updated = Date.now(); saveStats(s); return s;
  }
  function intentOf(q) {
    var s = String(q || "").toLowerCase().trim();
    if (/^(привет|здравствуй|hello|hi)\b/.test(s)) return "greet";
    if (/кто ты|who are you|что ты такое|what are you/.test(s)) return "identity";
    if (/^(запомни|выучи|remember)\s*:/i.test(s) || /^(запомни|выучи)\s+/i.test(s)) return "teach";
    if (/^(исправь|поправь|correct)\s*:/i.test(s)) return "correct";
    if (/^(верно|правильно|ok|👍)/i.test(s)) return "reinforce";
    if (/^(неверно|неправильно|ошибка|👎)/i.test(s)) return "punish";
    if (/посчитай|вычисли|сколько будет|^calc\b/.test(s)) return "calc";
    if (/что такое|what is|what are|определени/.test(s)) return "define";
    if (/сравни|отличи|versus|\bvs\b/.test(s)) return "compare";
    if (/помоги|совет|что делать/.test(s)) return "advice";
    if (/^почему\b|^зачем\b|\bwhy\b/.test(s)) return "why";
    if (/^как\b|\bhow\b/.test(s)) return "how";
    if (/статус ядра|рост ядра|growth|self.?dev/.test(s)) return "growth_status";
    return "general";
  }
  function stripQA(text) {
    text = String(text || "");
    var i = text.indexOf("Ответ:"); if (i !== -1) text = text.slice(i + 6);
    i = text.indexOf("Answer:"); if (i !== -1) text = text.slice(i + 7);
    return text.replace(/^вопрос:[^\n]*\n?/i, "").trim();
  }
  function scoreEvidence(qTok, text) {
    var tt = tokens(text), set = {}, i, hit = 0;
    for (i = 0; i < tt.length; i++) set[tt[i]] = 1;
    var stop = { что:1, такое:1, how:1, what:1, is:1, the:1, a:1, для:1, или:1, and:1, это:1 };
    var meaningful = qTok.filter(function (t) { return !stop[t] && t.length > 2; });
    if (!meaningful.length) meaningful = qTok;
    for (i = 0; i < meaningful.length; i++) if (set[meaningful[i]]) hit++;
    if (!meaningful.length) return 0;
    var cov = hit / meaningful.length;
    var low = String(text).toLowerCase();
    for (i = 0; i < meaningful.length; i++) if (meaningful[i].length >= 4 && low.indexOf(meaningful[i]) !== -1) cov += 0.15;
    if (cov < 0.34) return cov * 0.5;
    return cov;
  }
  function gatherEvidence(q, limit) {
    limit = limit || 10;
    var qTok = tokens(q), pool = [], i, t, sc;
    try {
      if (global.AKSI_NEURO && typeof global.AKSI_NEURO.retrieve === "function") {
        var hits = global.AKSI_NEURO.retrieve(q, 10) || [];
        for (i = 0; i < hits.length; i++) {
          t = stripQA(hits[i].text || hits[i]);
          if (t.length > 12) pool.push({ text: t, score: hits[i].score != null ? hits[i].score : scoreEvidence(qTok, t), src: "neuro" });
        }
      }
    } catch (e) {}
    try {
      if (global.AKSIKnowledge) {
        if (typeof global.AKSIKnowledge.search === "function") {
          var k = global.AKSIKnowledge.search(q);
          if (k && k.body) pool.push({ text: (k.title ? k.title + " — " : "") + k.body, score: 0.55, src: "knowledge" });
        }
        if (typeof global.AKSIKnowledge.all === "function") {
          var all = global.AKSIKnowledge.all() || [];
          for (i = 0; i < all.length; i++) {
            t = (all[i].title || "") + " " + (all[i].body || "");
            sc = scoreEvidence(qTok, t + " " + (all[i].tags || []).join(" "));
            if (sc >= 0.2) pool.push({ text: (all[i].title ? all[i].title + " — " : "") + all[i].body, score: sc, src: "knowledge" });
          }
        }
      }
    } catch (e) {}
    var grow = loadGrow();
    for (i = 0; i < grow.length; i++) {
      if (!grow[i] || !grow[i].text) continue;
      sc = scoreEvidence(qTok, grow[i].text + " " + (grow[i].q || ""));
      if (sc >= 0.18) pool.push({ text: grow[i].text, score: sc + 0.12 + (grow[i].w || 0) * 0.05, src: "grow" });
    }
    try {
      var mem = JSON.parse(localStorage.getItem("aksi_whole_mem_v3") || "[]");
      if (Array.isArray(mem)) {
        for (i = 0; i < Math.min(mem.length, 100); i++) {
          if (mem[i] && mem[i].t) {
            sc = scoreEvidence(qTok, mem[i].t);
            if (sc >= 0.15) pool.push({ text: mem[i].t, score: sc + 0.1, src: "memory" });
          }
        }
      }
    } catch (e) {}
    pool.sort(function (a, b) { return b.score - a.score; });
    var out = [], seen = {}, floor = 0.2;
    for (i = 0; i < pool.length && out.length < limit; i++) {
      if (out.length && (pool[i].score || 0) < floor) break;
      if (!out.length && (pool[i].score || 0) < 0.12) break;
      var key = pool[i].text.slice(0, 48);
      if (seen[key]) continue;
      seen[key] = 1;
      out.push(pool[i]);
      if (out.length === 1 && (pool[i].score || 0) >= 0.35) floor = 0.26;
    }
    if (out.length > 1) {
      var stop2 = { что:1, такое:1, how:1, what:1, is:1, the:1, для:1, или:1, and:1, это:1, как:1 };
      var keys = qTok.filter(function (t) { return !stop2[t] && t.length > 2; });
      if (keys.length) {
        out = out.filter(function (e, idx) {
          if (idx === 0) return true;
          var low = e.text.toLowerCase();
          return keys.some(function (k) { return low.indexOf(k) !== -1; });
        });
      }
    }
    return out;
  }
  function confidence(ev) {
    if (!ev.length) return 0.12;
    var top = ev[0].score || 0, n = Math.min(ev.length, 4), avg = 0, i;
    for (i = 0; i < n; i++) avg += ev[i].score || 0;
    avg /= n;
    return Math.max(0.1, Math.min(0.95, 0.35 * top + 0.5 * avg + 0.05 * n));
  }
  function uniqSentences(parts) {
    var out = [], seen = {}, i, p, key;
    for (i = 0; i < parts.length; i++) {
      p = String(parts[i] || "").replace(/\s+/g, " ").trim();
      if (!p) continue;
      if (!/[.!?…]$/.test(p)) p += ".";
      key = p.slice(0, 40).toLowerCase();
      if (seen[key]) continue;
      seen[key] = 1;
      out.push(p);
    }
    return out;
  }
  function generateAnswer(q, intent, ev, conf) {
    var claims = [], i;
    for (i = 0; i < ev.length; i++) {
      if (i > 0 && (ev[i].score || 0) < 0.28 && (ev[0].score || 0) >= 0.4) break;
      claims.push(ev[i].text);
    }
    var sents = uniqSentences(claims).slice(0, 5);
    if (intent === "greet") return "Привет. Я АКСИ — локальное ядро с саморазвитием. Отвечаю offline, учусь через «запомни:» и обратную связь.";
    if (intent === "identity") return "Я АКСИ. Ядро: Resonance Composer v2 + Neuro + ADIA. Генерирую ответ из доказательств и могу записать его в рост ядра. На GPU — WebLLM. Контакт: aksilove@internet.ru.";
    if (intent === "growth_status") {
      var st = loadStats(), g = loadGrow();
      return "Статус ядра: рост-фактов " + g.length + "/" + MAX_GROW + ", генераций " + (st.generations || 0) + ", обучений " + (st.teaches || 0) + ", подкреплений " + (st.reinforce || 0) + ". Саморазвитие только локально.";
    }
    if (!sents.length || conf < 0.18) {
      return "Ядра пока не хватает опоры. Напишите «запомни: факт» — встрою в рост. Или RAG. Не выдумываю без основания (ADIA).";
    }
    var openers = {
      define: ["Сформулирую так:", "По сути:", "Краткое определение:"],
      why: ["Причина в следующем.", "Это связано с тем, что", "Логика такая:"],
      how: ["Как это работает:", "Пошагово:", "Механика такая:"],
      advice: ["Опираясь на локальные факты (не замена специалисту):", "Практическая опора:"],
      compare: ["Сравнение по доступным данным:", "Если сопоставить:"],
      general: ["", "Соберу ответ так:", "Исходя из локального ядра:"]
    };
    var ops = openers[intent] || openers.general;
    var opener = ops[Math.floor((tokens(q).join("").length + sents.length) % ops.length)] || "";
    var body = sents.join(" ");
    var tail = "";
    if (intent === "advice") tail = " Важные решения по здоровью, праву и финансам — с человеком-специалистом.";
    if (conf < 0.45) tail += " Уверенность средняя — уточните или «запомни:».";
    return ((opener ? opener + " " : "") + body + tail).replace(/\s+/g, " ").replace(/\s+\./g, ".").trim();
  }
  function growAbsorb(q, answer, conf, src) {
    if (!answer || conf < 0.38 || answer.length < 24) return false;
    if (/уверенного ответа нет|не хватает опоры|не выдумываю/i.test(answer)) return false;
    var grow = loadGrow();
    var entry = { q: String(q || "").slice(0, 160), text: String(answer).replace(/\n·[^\n]*$/g, "").trim().slice(0, 600), conf: conf, src: src || "compose", w: 1, ts: Date.now() };
    var key = entry.text.slice(0, 50);
    for (var i = 0; i < grow.length; i++) {
      if (grow[i].text && grow[i].text.slice(0, 50) === key) {
        grow[i].w = (grow[i].w || 1) + 1; grow[i].ts = Date.now(); saveGrow(grow); bump("reinforce", 1); return true;
      }
    }
    grow.push(entry); saveGrow(grow); bump("growth", 1);
    try { if (global.AKSI_NEURO && global.AKSI_NEURO.learn) global.AKSI_NEURO.learn("Вопрос: " + entry.q + " Ответ: " + entry.text); } catch (e) {}
    return true;
  }
  function teach(raw) {
    var text = String(raw || "").trim().replace(/^(запомни|выучи|remember)\s*:?\s*/i, "").trim();
    if (text.length < 3) return { ok: false, msg: "Пустой факт." };
    var grow = loadGrow();
    grow.push({ q: "", text: text.slice(0, 600), conf: 1, src: "teach", w: 2, ts: Date.now() });
    saveGrow(grow); bump("teaches", 1);
    try { if (global.AKSI_NEURO && global.AKSI_NEURO.learn) global.AKSI_NEURO.learn(text); } catch (e) {}
    try {
      var mem = JSON.parse(localStorage.getItem("aksi_whole_mem_v3") || "[]");
      if (!Array.isArray(mem)) mem = [];
      mem.unshift({ t: text, ts: Date.now() });
      localStorage.setItem("aksi_whole_mem_v3", JSON.stringify(mem.slice(0, 200)));
    } catch (e) {}
    return { ok: true, msg: "Ядро обучено. Факт в росте (" + grow.length + ").", n: grow.length };
  }
  function correct(raw) {
    var text = String(raw || "").trim().replace(/^(исправь|поправь|correct)\s*:?\s*/i, "").trim();
    if (text.length < 3) return { ok: false, msg: "Укажите текст после «исправь:»." };
    var last = null; try { last = JSON.parse(localStorage.getItem(LAST_KEY) || "null"); } catch (e) {}
    var r = teach((last && last.q ? last.q + " → " : "") + text);
    bump("correct", 1);
    return { ok: true, msg: "Исправление принято. " + r.msg };
  }
  function reinforceLast(ok) {
    var last = null; try { last = JSON.parse(localStorage.getItem(LAST_KEY) || "null"); } catch (e) {}
    if (!last || !last.text) return { ok: false, msg: "Нет предыдущего ответа." };
    if (ok) {
      growAbsorb(last.q, last.text, Math.max(0.5, last.conf || 0.5), "reinforce");
      bump("reinforce", 1);
      return { ok: true, msg: "Подкрепила ответ — вес в ядре вырос." };
    }
    var grow = loadGrow();
    var key = String(last.text).slice(0, 40);
    grow = grow.filter(function (g) {
      if (!g.text) return true;
      if (g.text.slice(0, 40) === key) { g.w = (g.w || 1) - 2; return g.w > 0; }
      return true;
    });
    saveGrow(grow); bump("punish", 1);
    return { ok: true, msg: "Отметила ошибку. Ответ ослаблен. Можно «исправь: …»." };
  }
  function think(query) {
    query = String(query || "").trim();
    if (!query) return { text: "", mode: "empty", confidence: 0, evidence: [], intent: "none", offline: true, source: "compose" };
    var intent = intentOf(query);
    if (intent === "teach") { var tr = teach(query); return { text: tr.msg, mode: "teach", confidence: 1, intent: intent, offline: true, source: "compose", grew: tr.ok }; }
    if (intent === "correct") { var cr = correct(query); return { text: cr.msg, mode: "correct", confidence: 1, intent: intent, offline: true, source: "compose" }; }
    if (intent === "reinforce") { var rr = reinforceLast(true); return { text: rr.msg, mode: "reinforce", confidence: 1, intent: intent, offline: true, source: "compose" }; }
    if (intent === "punish") { var pr = reinforceLast(false); return { text: pr.msg, mode: "punish", confidence: 1, intent: intent, offline: true, source: "compose" }; }
    var ev = gatherEvidence(query, 10);
    var conf = confidence(ev);
    var text = generateAnswer(query, intent, ev, conf);
    bump("generations", 1);
    var grew = false;
    if (conf >= 0.42 && intent !== "greet" && intent !== "identity") grew = growAbsorb(query, text, conf, "auto");
    try { localStorage.setItem(LAST_KEY, JSON.stringify({ q: query, text: text, conf: conf, ts: Date.now() })); } catch (e) {}
    var adia = null;
    try { if (global.AKSI_ALGORITHM && global.AKSI_ALGORITHM.evaluate) adia = global.AKSI_ALGORITHM.evaluate(query, text, { seal: true }); } catch (e) {}
    return {
      text: text + (grew ? "\n\n· ядро: факт поглощён в рост" : "") + "\n· gen ~" + Math.round(conf * 100) + "% · composer v2 · offline",
      mode: conf >= 0.2 ? "generate" : "generate-weak",
      confidence: conf,
      evidence: ev.slice(0, 5).map(function (e) { return { score: e.score, src: e.src, preview: e.text.slice(0, 80) }; }),
      intent: intent, offline: true, source: "compose", arch: "Resonance-Composer-v2-grow",
      grew: grew, growthSize: loadGrow().length, adia: adia, version: VER
    };
  }
  function status() {
    var st = loadStats();
    return { name: "Resonance Composer", version: VER, ready: true, offline: true, growth: loadGrow().length, maxGrowth: MAX_GROW, generations: st.generations || 0, teaches: st.teaches || 0, role: "generate + self-grow local core" };
  }
  function installBridge() {
    try {
      if (global.AKSI_NEURO && typeof global.AKSI_NEURO.think === "function" && !global.AKSI_NEURO._composeWrapped) {
        var _neuroThink = global.AKSI_NEURO.think.bind(global.AKSI_NEURO);
        global.AKSI_NEURO.think = function (q) {
          try {
            var c = think(q);
            if (c && c.text && c.mode !== "generate-weak" && c.mode !== "empty") {
              return { text: c.text, mode: c.mode, score: c.confidence, offline: true, source: "compose", arch: "Resonance-Composer-v2-grow", steps: c.growthSize || 0 };
            }
          } catch (e) {}
          return _neuroThink(q);
        };
        global.AKSI_NEURO._composeWrapped = true;
      }
    } catch (e) {}
  }
  installBridge();
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installBridge);
    else setTimeout(installBridge, 0);
  }
  global.AKSI_COMPOSE = {
    version: VER, name: "Resonance Composer v2",
    think: think, ask: think, compose: think, generate: think,
    teach: teach, growAbsorb: growAbsorb, gatherEvidence: gatherEvidence,
    intentOf: intentOf, status: status, loadGrow: loadGrow,
    resetGrowth: function () { try { localStorage.removeItem(GROW_KEY); } catch (e) {} return { ok: true }; }
  };
  global.AKSI_REASON = global.AKSI_COMPOSE;
  global.AKSI_CORE = global.AKSI_COMPOSE;
})(typeof window !== "undefined" ? window : this);
