/**
 * AKSI Resonance Composer v1.0
 * Offline reasoning: evidence → structured novel answer (not canned Q&A dump)
 * Contact: aksilove@internet.ru
 */
(function (global) {
  "use strict";
  var VER = "1.0.0-compose";
  function tokens(s) {
    return String(s || "").toLowerCase().replace(/[^a-zа-яё0-9\s]/gi, " ").split(/\s+/).filter(function (t) { return t.length > 1; });
  }
  function uniq(arr) {
    var o = {}, out = [], i;
    for (i = 0; i < arr.length; i++) if (arr[i] && !o[arr[i]]) { o[arr[i]] = 1; out.push(arr[i]); }
    return out;
  }
  function intentOf(q) {
    var s = String(q || "").toLowerCase().trim();
    if (/^(привет|здравствуй|hello|hi)\b/.test(s)) return "greet";
    if (/кто ты|who are you|что ты такое|what are you/.test(s)) return "identity";
    if (/как (тебя )?звать|тво[её] имя/.test(s)) return "identity";
    if (/посчитай|вычисли|сколько будет|^calc\b/.test(s)) return "calc";
    if (/запомни|выучи|remember/.test(s)) return "teach";
    if (/что такое|what is|what are|определени/.test(s)) return "define";
    if (/сравни|отличи|versus|\bvs\b/.test(s)) return "compare";
    if (/помоги|совет|что делать/.test(s)) return "advice";
    if (/^почему\b|^зачем\b|\bwhy\b/.test(s)) return "why";
    if (/^как\b|\bhow\b/.test(s)) return "how";
    if (/\bгде\b|\bwhen\b|\bкогда\b/.test(s)) return "fact";
    return "general";
  }
  function stripQA(text) {
    text = String(text || "");
    var i = text.indexOf("Ответ:");
    if (i !== -1) text = text.slice(i + 6);
    i = text.indexOf("Answer:");
    if (i !== -1) text = text.slice(i + 7);
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
    for (i = 0; i < meaningful.length; i++) {
      if (meaningful[i].length >= 4 && low.indexOf(meaningful[i]) !== -1) cov += 0.15;
    }
    if (cov < 0.34) return cov * 0.5;
    return cov;
  }
  function gatherEvidence(q, limit) {
    limit = limit || 8;
    var qTok = tokens(q);
    var pool = [];
    var i, t, sc;
    try {
      if (global.AKSI_NEURO && typeof global.AKSI_NEURO.retrieve === "function") {
        var hits = global.AKSI_NEURO.retrieve(q, 8) || [];
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
    try {
      var mem = JSON.parse(localStorage.getItem("aksi_whole_mem_v3") || "[]");
      if (Array.isArray(mem)) {
        for (i = 0; i < Math.min(mem.length, 80); i++) {
          if (mem[i] && mem[i].t) {
            sc = scoreEvidence(qTok, mem[i].t);
            if (sc >= 0.15) pool.push({ text: mem[i].t, score: sc + 0.1, src: "memory" });
          }
        }
      }
    } catch (e) {}
    pool.sort(function (a, b) { return b.score - a.score; });
    var out = [], seen = {};
    var floor = 0.22;
    for (i = 0; i < pool.length && out.length < limit; i++) {
      if (out.length && (pool[i].score || 0) < floor) break;
      if (!out.length && (pool[i].score || 0) < 0.12) break;
      var key = pool[i].text.slice(0, 48);
      if (seen[key]) continue;
      seen[key] = 1;
      out.push(pool[i]);
      if (out.length === 1 && (pool[i].score || 0) >= 0.35) floor = 0.28;
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
    var top = ev[0].score || 0;
    var n = Math.min(ev.length, 4);
    var avg = 0, i;
    for (i = 0; i < n; i++) avg += ev[i].score || 0;
    avg /= n;
    return Math.max(0.1, Math.min(0.95, 0.35 * top + 0.5 * avg + 0.05 * n));
  }
  function joinClaims(claims, maxLen) {
    maxLen = maxLen || 520;
    var s = "", i;
    for (i = 0; i < claims.length; i++) {
      var c = claims[i].replace(/\s+/g, " ").trim();
      if (!c) continue;
      if (s.indexOf(c.slice(0, 36)) !== -1) continue;
      if (s.length + c.length > maxLen) break;
      if (s) s += " ";
      if (!/[.!?…]$/.test(c)) c += ".";
      s += c;
    }
    return s;
  }
  function composeText(q, intent, ev, conf) {
    var claims = [];
    var iC;
    for (iC = 0; iC < ev.length; iC++) {
      if (iC > 0 && (ev[iC].score || 0) < 0.28 && (ev[0].score || 0) >= 0.4) break;
      claims.push(ev[iC].text);
    }
    var body = joinClaims(claims, 480);
    var lead = "", tail = "";
    if (intent === "greet") {
      return "Привет. Я АКСИ — локальный offline-напарник. Могу отвечать по знаниям на устройстве, без обязательной сети. Спросите о чём угодно или напишите «запомни: …».";
    }
    if (intent === "identity") {
      return "Я АКСИ — суверенный цифровой напарник. Отвечаю offline через Resonance Composer (сбор доказательств → сборка ответа) и при наличии GPU — через WebLLM. Алгоритм целостности — ADIA 2.0. Контакт: aksilove@internet.ru.";
    }
    if (intent === "teach") {
      return body || "Чтобы сохранить факт: «запомни: ваш текст». Он останется только на этом устройстве.";
    }
    if (!body || conf < 0.2) {
      return "По локальным данным уверенного ответа нет. Можно: 1) уточнить вопрос, 2) «запомни: факт», 3) файл в RAG, 4) на ПК с WebGPU — «Перезагрузить модель». Я не выдумываю факты ради полноты — принцип ADIA.";
    }
    if (intent === "define") lead = "Кратко: ";
    else if (intent === "why") lead = "По доступным локальным основаниям: ";
    else if (intent === "how") lead = "Как это устроено (по локальным знаниям): ";
    else if (intent === "advice") {
      lead = "Не совет вместо специалиста, а опора на локальные факты: ";
      tail = " Важные решения (здоровье, право, финансы) — с человеком-специалистом.";
    } else if (intent === "compare") lead = "Сравнение по локальным данным: ";
    var srcN = uniq(ev.map(function (e) { return e.src; })).length;
    var frame = "";
    if (srcN > 1 && conf >= 0.35) frame = "Сборка из нескольких локальных источников. ";
    else if (conf < 0.55 && conf >= 0.3) frame = "Частичное совпадение с локальной базой: ";
    var confLine = "\n\n· уверенность ~" + Math.round(conf * 100) + "% · offline composer · не облачный LLM";
    return (frame + lead + body + tail).replace(/\s+/g, " ").replace(/\s+\./g, ".").trim() + confLine;
  }
  function think(query) {
    query = String(query || "").trim();
    if (!query) return { text: "", mode: "empty", confidence: 0, evidence: [], intent: "none", offline: true, source: "compose" };
    var intent = intentOf(query);
    var ev = gatherEvidence(query, 8);
    var conf = confidence(ev);
    var text = composeText(query, intent, ev, conf);
    var adia = null;
    try {
      if (global.AKSI_ALGORITHM && typeof global.AKSI_ALGORITHM.evaluate === "function") {
        adia = global.AKSI_ALGORITHM.evaluate(query, text, { seal: true });
      }
    } catch (e) {}
    return {
      text: text,
      mode: conf >= 0.2 ? "compose-resonance" : "compose-weak",
      confidence: conf,
      evidence: ev.slice(0, 5).map(function (e) { return { score: e.score, src: e.src, preview: e.text.slice(0, 80) }; }),
      intent: intent,
      offline: true,
      source: "compose",
      arch: "Resonance-Composer-v1",
      adia: adia,
      version: VER
    };
  }
  function status() {
    return { name: "Resonance Composer", version: VER, ready: true, offline: true, role: "evidence → novel structured answer" };
  }
  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;
    root.innerHTML = "";
    var card = document.createElement("div");
    card.className = "card";
    var h = document.createElement("h2"); h.textContent = "Resonance Composer v1";
    var p = document.createElement("p"); p.className = "muted"; p.textContent = "Офлайн-сборка ответа из доказательств. Не FAQ. Не AGI.";
    var ta = document.createElement("textarea"); ta.rows = 2; ta.placeholder = "Вопрос…";
    var out = document.createElement("pre"); out.className = "out"; out.textContent = JSON.stringify(status(), null, 2);
    var btn = document.createElement("button"); btn.type = "button"; btn.className = "btn p"; btn.textContent = "Собрать ответ";
    btn.onclick = function () {
      var r = think(ta.value || "");
      out.textContent = "[" + r.mode + " · conf " + (r.confidence * 100).toFixed(0) + "% · " + r.intent + "]\n\n" + r.text;
    };
    card.appendChild(h); card.appendChild(p); card.appendChild(ta); card.appendChild(btn); card.appendChild(out);
    root.appendChild(card);
  }
  global.AKSI_COMPOSE = {
    version: VER, name: "Resonance Composer",
    think: think, ask: think, compose: think,
    gatherEvidence: gatherEvidence, intentOf: intentOf, status: status, mount: mount
  };
  global.AKSI_REASON = global.AKSI_COMPOSE;
})(typeof window !== "undefined" ? window : this);
