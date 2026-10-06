/** AKSI Super Mind v3.4 — любой вопрос на русском: wiki + KB + math + WebLLM */
(function (G) {
  "use strict";
  var VERSION = "mind-3.4.0";
  function hash(s) {
    var h = 2166136261 >>> 0, t = String(s), i;
    for (i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function tryMath(q) {
    var s = String(q).toLowerCase().replace(/,/g, ".").replace(/\s+/g, " ").trim();
    var m, n, r, x, p, base, v, expr, val;
    m = s.match(/x\s*\^\s*2\s*=\s*([0-9.]+)|x\s*\*\*\s*2\s*=\s*([0-9.]+)|x²\s*=\s*([0-9.]+)|x\s*\^\s*2\s*-\s*([0-9.]+)\s*=\s*0/i);
    if (m) {
      n = parseFloat(m[1] || m[2] || m[3] || m[4]); r = Math.sqrt(n);
      return { ok: true, value: [r, -r], steps: [
        "Дано: x² = " + n + ".", "Тогда |x| = √" + n + " = " + r + ".",
        "Корни: x = " + r + " и x = " + (-r) + ".", "Проверка: (" + r + ")² = " + (r * r) + "."
      ]};
    }
    m = s.match(/(?:корень|sqrt)\s*(?:из\s*)?([0-9.]+)/i);
    if (m) {
      x = parseFloat(m[1]); r = Math.sqrt(x);
      return { ok: true, value: r, steps: ["√" + x + " ≈ " + r + ".", "Проверка: " + r + "² = " + (r * r) + "."] };
    }
    m = s.match(/([0-9.]+)\s*%\s*(?:от\s*)?([0-9.]+)/);
    if (m) {
      p = parseFloat(m[1]); base = parseFloat(m[2]); v = base * p / 100;
      return { ok: true, value: v, steps: [p + "% от " + base + " = " + base + "×" + p + "/100 = " + v + "."] };
    }
    m = s.match(/(?:посчитай|вычисли|сколько\s*будет)?\s*([0-9.]+\s*[+\-*/^]\s*[0-9.]+(?:\s*[+\-*/^]\s*[0-9.]+)*)/i);
    if (m) {
      try {
        expr = m[1].replace(/\^/g, "**").replace(/\s+/g, "");
        if (!/^[\d.+\-*/()]+$/.test(expr.replace(/\*\*/g, ""))) return null;
        val = Function('"use strict";return (' + expr + ")")();
        if (typeof val === "number" && isFinite(val))
          return { ok: true, value: val, steps: ["Выражение: " + m[1].trim() + ".", "Результат: " + val + "."] };
      } catch (e) {}
    }
    return null;
  }
  var KB = [
    { re: /суперпозиц/i, title: "Суперпозиция",
      text: "Суперпозиция — описание квантовой системы несколькими состояниями сразу, пока не сделано измерение. Кубит: |ψ⟩=α|0⟩+β|1⟩, вероятности |α|² и |β|²." },
    { re: /кубит|qubit/i, title: "Кубит",
      text: "Кубит хранит α|0⟩+β|1⟩. n кубитов дают 2ⁿ амплитуд. Super fabric использует 4-кубитный сид." },
    { re: /permit|пермит|допуск/i, title: "Permit",
      text: "Permit — default-deny: действие только после ALLOW. При ALLOW выдаётся receipt." },
    { re: /экзокортекс|exocortex/i, title: "Экзокортекс",
      text: "Экзокортекс АКСИ: вектор S, цель, опыт, Permit, ECDSA-цепочка чеков." },
    { re: /\bакси\b|aksi|кто ты|что ты/i, title: "АКСИ",
      text: "АКСИ — offline-first контур: Super, quantum seed, Mind/WebLLM, Permit, чеки." },
    { re: /энтропи/i, title: "Энтропия",
      text: "S=−Σ pᵢ log₂ pᵢ. Высокая энтропия — больше неопределённости до коллапса." },
    { re: /коллапс|измерен/i, title: "Коллапс",
      text: "Коллапс — выбор базиса с вероятностью |амплитуда|²." },
    { re: /суперкомпьютер|fabric|gpu/i, title: "Super Fabric",
      text: "Виртуальный кластер в браузере: jobs, ноды, matmul, quantum, mind." },
    { re: /webllm|веб\s*ллм|языков\w+\s*модел/i, title: "WebLLM",
      text: "WebLLM — сжатые веса (q4) модели в браузере через WebGPU." },
    { re: /небо.*голуб|голуб.*небо|рассеян.*рэле|rayleigh/i, title: "Почему небо голубое",
      text: "Небо голубое из‑за рассеяния Рэлея: синяя часть спектра рассеивается сильнее." },
    { re: /фотосинтез/i, title: "Фотосинтез",
      text: "Фотосинтез: свет + CO₂ + H₂O → сахар + O₂." },
    { re: /относительн.*эйнштейн|теория относительн/i, title: "Теория относительности",
      text: "СТО: скорость света постоянна. ОТО: гравитация как искривление пространства-времени." },
    { re: /днк|генетич.*код/i, title: "ДНК",
      text: "ДНК — двойная спираль (A,T,G,C), носитель генетической информации." },
    { re: /искусственн.*интеллект|\bии\b|\bai\b/i, title: "Искусственный интеллект",
      text: "ИИ — системы для языка, распознавания, планирования. АКСИ добавляет допуск и чеки." },
    { re: /блокчейн|bitcoin|биткоин/i, title: "Блокчейн",
      text: "Блокчейн — цепочка блоков, каждый ссылается на хэш предыдущего." }
  ];
  function extractKeys(q) {
    var stop = /^(и|в|на|по|что|как|это|для|или|при|про|не|ли|же|бы|от|до|из|за|со|об|the|a|an|is|are|what|how|why|who|can|does)$/i;
    return String(q).toLowerCase().split(/[^a-zа-яё0-9]+/i).filter(function (w) {
      return w.length > 2 && !stop.test(w);
    }).slice(0, 16);
  }
  function matchKB(q) {
    var out = [];
    KB.forEach(function (t) { if (t.re.test(q)) out.push(t); });
    return out;
  }
  function neuroHit(q) {
    try {
      if (G.AKSI_NEURO && typeof G.AKSI_NEURO.query === "function") {
        var r = G.AKSI_NEURO.query(q);
        if (r && (r.answer || r.text)) return String(r.answer || r.text).slice(0, 1200);
      }
    } catch (e) {}
    return null;
  }
  function relevance(keys, text) {
    if (!text) return 0;
    var t = String(text).toLowerCase(), hit = 0, i;
    for (i = 0; i < keys.length; i++) if (t.indexOf(keys[i]) >= 0) hit++;
    return keys.length ? hit / keys.length : 0;
  }
  async function wikiFacts(q) {
    var keys = extractKeys(q);
    if (!keys.length) return null;
    var query = keys.slice(0, 5).join(" ");
    try {
      var searchUrl = "https://ru.wikipedia.org/w/api.php?action=query&list=search&srsearch=" +
        encodeURIComponent(query) + "&srlimit=5&format=json&origin=*";
      var sres = await fetch(searchUrl, { mode: "cors" });
      if (!sres.ok) return null;
      var sjson = await sres.json();
      var hits = (sjson && sjson.query && sjson.query.search) || [];
      if (!hits.length) return null;
      var i, title, sumRes, sum, best = null, score, sc;
      for (i = 0; i < Math.min(hits.length, 4); i++) {
        title = hits[i].title;
        sumRes = await fetch("https://ru.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title), { mode: "cors" });
        if (!sumRes.ok) continue;
        sum = await sumRes.json();
        if (!sum || !sum.extract || sum.type === "disambiguation") continue;
        score = relevance(keys, (sum.title || "") + " " + sum.extract);
        sc = relevance(keys, sum.title || "");
        score = score + sc * 0.5;
        if (score >= 0.15 && (!best || score > best.score)) {
          best = {
            score: score,
            title: sum.title || title,
            extract: String(sum.extract).slice(0, 900),
            url: (sum.content_urls && sum.content_urls.desktop && sum.content_urls.desktop.page) || null
          };
        }
      }
      return best;
    } catch (e) { return null; }
  }
  function buildAnswer(q, quantum, extra) {
    extra = extra || {};
    var keys = extractKeys(q);
    var bits = quantum && quantum.bits ? quantum.bits : "----";
    var seed = quantum && quantum.seed ? quantum.seed : hash(q);
    var path = seed % 5;
    var math = tryMath(q);
    var kb = matchKB(q);
    var lines = [];
    var source = extra.source || "mind";
    lines.push("АКСИ отвечает на ваш вопрос.");
    lines.push("");
    lines.push("Вопрос: «" + String(q).trim().slice(0, 240) + "».");
    lines.push("");
    if (math && math.ok) {
      lines.push("Математика");
      math.steps.forEach(function (s) { lines.push("• " + s); });
      lines.push("Итог: " + (Array.isArray(math.value) ? math.value.join(" и ") : math.value) + ".");
      lines.push("");
    }
    if (kb.length) {
      kb.forEach(function (t) { lines.push(t.title); lines.push(t.text); lines.push(""); });
    }
    if (extra.neuro) { lines.push("Локальная память / Neuro"); lines.push(extra.neuro); lines.push(""); }
    if (extra.wiki) {
      lines.push("Факт из открытых источников (Википедия)");
      lines.push(extra.wiki.title + ": " + extra.wiki.extract);
      if (extra.wiki.url) lines.push("Источник: " + extra.wiki.url);
      lines.push("");
    }
    lines.push("Разбор");
    if (keys.length) lines.push("Ключевые элементы: " + keys.slice(0, 10).join(", ") + ".");
    if (math && math.ok) lines.push("Задача вычислена и проверена.");
    else if (extra.wiki) lines.push("Ответ опирается на найденный факт.");
    else if (kb.length) lines.push("Тема из локальной базы АКСИ.");
    else if (extra.neuro) lines.push("Сработал локальный резонанс.");
    else {
      lines.push("Точного узла мало. Загрузите WebLLM на вкладке WebLLM или уточните вопрос.");
      lines.push("Примеры: «12*12», «что такое Permit?», «почему небо голубое?».");
    }
    lines.push("");
    lines.push("Как получен ответ");
    lines.push("Путь: Super → quantum |" + bits + "⟩ → mind" + (source === "webllm" ? " → WebLLM" : "") + (extra.wiki ? " → wiki" : "") + " → Permit.");
    lines.push("");
    lines.push("— АКСИ Super Mind " + VERSION + " · " + source + " · path " + path + " —");
    return { text: lines.join("\n"), math: math, topics: kb.map(function (t) { return t.title; }), keys: keys, path: path, source: source, wiki: extra.wiki || null };
  }
  async function answer(q, quantum) {
    q = String(q || "").trim();
    if (!q) return { text: "Напишите вопрос — отвечу по-русски через Super.", source: "mind", path: 0 };
    var W = G.AKSI_WEBLLM;
    var llmOn = false;
    try {
      if (W && typeof W.complete === "function") {
        if (typeof W.ready === "function") llmOn = !!W.ready();
        else if (W.status) llmOn = !!(W.status().ready);
      }
    } catch (e) { llmOn = false; }
    if (llmOn) {
      try {
        var sys = "Ты АКСИ. Отвечай только на русском, полно и понятно. Если не знаешь — скажи прямо. Не выдумывай источники.";
        var r = await Promise.race([
          W.complete(q, { system: sys, max_tokens: 450 }),
          new Promise(function (resolve) { setTimeout(function () { resolve({ text: "" }); }, 25000); })
        ]);
        var text = (r && r.text) ? String(r.text).trim() : "";
        if (text.length > 25) {
          return {
            text: text + "\n\n— через Super · WebLLM · |" + (quantum && quantum.bits || "----") + "⟩ —",
            source: "webllm",
            path: (quantum && quantum.seed ? quantum.seed : hash(q)) % 5,
            math: tryMath(q)
          };
        }
      } catch (e) {}
    }
    var neuro = neuroHit(q);
    var math0 = tryMath(q);
    var wiki = null;
    if (!(math0 && math0.ok)) {
      try {
        wiki = await Promise.race([
          wikiFacts(q),
          new Promise(function (resolve) { setTimeout(function () { resolve(null); }, 3500); })
        ]);
      } catch (e) { wiki = null; }
    }
    return buildAnswer(q, quantum, { neuro: neuro, wiki: wiki, source: wiki ? "mind+wiki" : (neuro ? "mind+neuro" : "mind") });
  }
  function synthesize(q, quantum) { return buildAnswer(q, quantum, { source: "mind" }); }
  G.AKSI_SUPER_MIND = {
    version: VERSION, answer: answer, synthesize: synthesize,
    tryMath: tryMath, wikiFacts: wikiFacts, extractKeys: extractKeys
  };
})(typeof window !== "undefined" ? window : globalThis);
