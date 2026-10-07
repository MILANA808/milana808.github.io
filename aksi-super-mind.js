/** AKSI Super Mind v3.6 — useful Russian answers: math + KB + filtered wiki + Neuro
 * Offline-first. No junk wiki. aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VERSION = "mind-3.6.0";

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
        "Дано: x² = " + n + ".",
        "Тогда |x| = √" + n + " = " + r + ".",
        "Корни: x = " + r + " и x = " + (-r) + ".",
        "Проверка: (" + r + ")² = " + (r * r) + "."
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
    { re: /привет|здравствуй|добрый\s*(день|вечер)|hello|hi\b/i, title: "Приветствие",
      text: "Привет. Я АКСИ — локальный агент Decision Integrity. Считаю, объясняю, пропускаю ответы через Gate (ALLOW/BLOCK) и quantum-seed. Сервер не обязателен." },
    { re: /что\s*умеешь|твои\s*возможн|что\s*ты\s*можешь|help|помощь/i, title: "Возможности",
      text: "1) Математика на устройстве. 2) Локальная база (Permit, кванты, ИИ). 3) При WebGPU — WebLLM. 4) Gate + receipt на каждый ответ. 5) Cluster 16×4 в браузере. Спросите «12*12», «что такое Permit», «почему небо голубое»." },
    { re: /как\s*работа|как\s*ты\s*работа/i, title: "Как работаю",
      text: "Запрос → Gate (вероятность допуска) → Math/Neuro/Mind/WebLLM → quantum-метка → ответ. Всё в браузере. Нет обязательного облака." },
    { re: /\bакси\b|aksi|кто\s*ты|что\s*ты\s*такое|представ/i, title: "АКСИ",
      text: "АКСИ — offline-first Decision Integrity Runtime: quantum-seed, Neuro, Mind, опциональный WebLLM, Permit/Gate, подписанные receipts. Не чатбот-обёртка, а слой допуска и доказательств. Контакт: aksilove@internet.ru" },
    { re: /permit|пермит|допуск|gate|гейт/i, title: "Permit / Gate",
      text: "Permit — default-deny: действие или ответ получают ALLOW / REVIEW / BLOCK с вероятностью и receipt-hash. Это ядро продукта для аудита и агентов." },
    { re: /суперпозиц/i, title: "Суперпозиция",
      text: "Суперпозиция — система одновременно в нескольких состояниях до измерения. Кубит: |ψ⟩ = α|0⟩ + β|1⟩, вероятности |α|² и |β|²." },
    { re: /кубит|qubit/i, title: "Кубит",
      text: "Кубит хранит α|0⟩+β|1⟩. n кубитов → 2ⁿ амплитуд. В АКСИ — 6-кубитный statevector в JS (64 состояния)." },
    { re: /энтропи/i, title: "Энтропия",
      text: "S = −Σ pᵢ log₂ pᵢ. Высокая S — больше неопределённости до коллапса. На экране Super видна энтропия после pulse." },
    { re: /коллапс|измерен/i, title: "Коллапс",
      text: "Коллапс — выбор базисного состояния с вероятностью |амплитуда|². В UI это битовая строка |bits⟩." },
    { re: /экзокортекс|exocortex/i, title: "Экзокортекс",
      text: "Экзокортекс АКСИ: локальная память сессии, цель, опыт, цепочка Permit-чеков." },
    { re: /суперкомпьютер|fabric|кластер/i, title: "Super Fabric",
      text: "Виртуальный кластер 16×4 в браузере: jobs, ноды, scheduler, quantum, mind. Не заменяет реальный HPC — демонстрирует pipeline агента." },
    { re: /webllm|веб\s*ллм|языков\w+\s*модел/i, title: "WebLLM",
      text: "WebLLM — квантованные модели (q4) через WebGPU в браузере. На телефоне — 0.5B/1B. Без WebGPU работают Neuro и Mind." },
    { re: /небо.*голуб|голуб.*небо|рассеян.*рэле|rayleigh/i, title: "Почему небо голубое",
      text: "Из‑за рэлеевского рассеяния: короткие (синие) волны рассеиваются в атмосфере сильнее длинных. Поэтому днём небо кажется голубым." },
    { re: /фотосинтез/i, title: "Фотосинтез",
      text: "Свет + CO₂ + H₂O → углеводы + O₂. Хлорофилл поглощает свет; энергия идёт на синтез органики." },
    { re: /относительн.*эйнштейн|теория относительн/i, title: "Теория относительности",
      text: "СТО: c постоянна, время и длина зависят от системы отсчёта. ОТО: гравитация — кривизна пространства-времени." },
    { re: /днк|генетич.*код/i, title: "ДНК",
      text: "ДНК — двойная спираль (A–T, G–C), носитель генетической информации клеток." },
    { re: /искусственн.*интеллект|\bии\b(?!\w)|\bai\b/i, title: "Искусственный интеллект",
      text: "ИИ — алгоритмы для языка, зрения, планирования. АКСИ добавляет слой допуска (Gate) и проверяемые receipts, а не только генерацию текста." },
    { re: /блокчейн|bitcoin|биткоин/i, title: "Блокчейн",
      text: "Цепочка блоков с хэшами: история транзакций устойчива к незаметной подмене. Биткоин — первая массовая реализация." },
    { re: /квантов\w+\s*(компьютер|вычисл)|quantum\s*comput/i, title: "Квантовые вычисления",
      text: "Используют суперпозицию и запутанность. Полезны для отдельных задач (факторизация, симуляция). АКСИ симулирует малый statevector локально." },
    { re: /безопасн|security|ciso|комплаенс|аудит/i, title: "Безопасность решений",
      text: "Ценность АКСИ для мира: не «ещё LLM», а Decision Integrity — каждый ответ/действие с gate, вероятностью и receipt для аудита агентов." },
    { re: /запомни|научи|память/i, title: "Память",
      text: "Факты можно учить локально (запомни: …) в других поверхностях АКСИ. Super использует Neuro SEED и session history в браузере." },
    { re: /контакт|связ|email|почта/i, title: "Контакт",
      text: "Публичный контакт автора: aksilove@internet.ru · X @AKSILOVE" }
  ];

  function extractKeys(q) {
    var stop = /^(и|в|на|по|что|как|это|для|или|при|про|не|ли|же|бы|от|до|из|за|со|об|кто|ты|the|a|an|is|are|what|how|why|who|can|does)$/i;
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
      if (G.AKSI_NEURO && typeof G.AKSI_NEURO.think === "function") {
        var n = G.AKSI_NEURO.think(q);
        if (n && n.mode !== "fallback" && (Number(n.score) || 0) >= 0.45) {
          var t = String(n.answer || n.text || "").trim();
          if (t.length > 8) return t.slice(0, 1200);
        }
      }
      if (G.AKSI_NEURO && typeof G.AKSI_NEURO.query === "function") {
        var r = G.AKSI_NEURO.query(q);
        if (r && (r.answer || r.text)) return String(r.answer || r.text).slice(0, 1200);
      }
    } catch (e) {}
    return null;
  }

  function relevance(keys, text) {
    if (!text || !keys.length) return 0;
    var t = String(text).toLowerCase(), hit = 0, i;
    for (i = 0; i < keys.length; i++) if (t.indexOf(keys[i]) >= 0) hit++;
    return hit / keys.length;
  }

  async function wikiFacts(q) {
    var keys = extractKeys(q);
    if (keys.length < 1) return null;
    if (/^(кто ты|привет|hello|что умеешь|как дела)[\s?!.]*$/i.test(String(q).trim())) return null;
    var query = keys.slice(0, 4).join(" ");
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
        score = score + sc * 0.8;
        if (score >= 0.35 && (!best || score > best.score)) {
          best = {
            score: score,
            title: sum.title || title,
            extract: String(sum.extract).slice(0, 700),
            url: (sum.content_urls && sum.content_urls.desktop && sum.content_urls.desktop.page) || null
          };
        }
      }
      return best;
    } catch (e) { return null; }
  }

  function buildAnswer(q, quantum, extra) {
    extra = extra || {};
    var bits = quantum && quantum.bits ? quantum.bits : "------";
    var math = tryMath(q);
    var kb = matchKB(q);
    var lines = [];
    var source = extra.source || "mind";

    if (math && math.ok) {
      lines.push("Математика");
      math.steps.forEach(function (s) { lines.push("• " + s); });
      lines.push("Итог: " + (Array.isArray(math.value) ? math.value.join(" и ") : math.value) + ".");
      lines.push("");
    }
    if (kb.length) {
      kb.forEach(function (t) {
        lines.push(t.title);
        lines.push(t.text);
        lines.push("");
      });
    }
    if (extra.neuro && !kb.length) {
      lines.push(extra.neuro);
      lines.push("");
    }
    if (extra.wiki && extra.wiki.score >= 0.35) {
      lines.push("Справка (Википедия)");
      lines.push(extra.wiki.title + ": " + extra.wiki.extract);
      if (extra.wiki.url) lines.push(extra.wiki.url);
      lines.push("");
    }
    if (!(math && math.ok) && !kb.length && !extra.wiki && !extra.neuro) {
      lines.push("Локально точного факта нет. Уточните вопрос или нажмите «Загрузить WebLLM» (нужен WebGPU).");
      lines.push("Работают всегда: математика, Gate, quantum-метка, база АКСИ.");
      lines.push("");
    }
    lines.push("· " + source + " · |" + bits + "⟩ · " + VERSION);
    return {
      text: lines.join("\n").trim(),
      math: math,
      topics: kb.map(function (t) { return t.title; }),
      source: source,
      wiki: extra.wiki || null
    };
  }

  async function answer(q, quantum) {
    q = String(q || "").trim();
    if (!q) return { text: "Напишите вопрос — отвечу по-русски.", source: "mind" };

    var kb = matchKB(q);
    var math0 = tryMath(q);

    if ((math0 && math0.ok) || kb.length) {
      return buildAnswer(q, quantum, { source: math0 && math0.ok ? "mind+math" : "mind+kb" });
    }

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
        var sys = "Ты АКСИ — локальный Decision Integrity агент. Отвечай по-русски ясно и по делу. Не выдумывай источники.";
        var r = await Promise.race([
          W.complete(q, { system: sys, max_tokens: 450 }),
          new Promise(function (resolve) { setTimeout(function () { resolve({ text: "" }); }, 25000); })
        ]);
        var text = (r && r.text) ? String(r.text).trim() : "";
        if (text.length > 25) {
          return {
            text: text + "\n\n· webllm · |" + (quantum && quantum.bits || "------") + "⟩ · " + VERSION,
            source: "webllm",
            math: tryMath(q)
          };
        }
      } catch (e) {}
    }

    var neuro = neuroHit(q);
    var wiki = null;
    try {
      wiki = await Promise.race([
        wikiFacts(q),
        new Promise(function (resolve) { setTimeout(function () { resolve(null); }, 3200); })
      ]);
    } catch (e) { wiki = null; }

    return buildAnswer(q, quantum, {
      neuro: neuro,
      wiki: wiki,
      source: wiki ? "mind+wiki" : (neuro ? "mind+neuro" : "mind")
    });
  }

  function synthesize(q, quantum) { return buildAnswer(q, quantum, { source: "mind" }); }

  G.AKSI_SUPER_MIND = {
    version: VERSION,
    answer: answer,
    synthesize: synthesize,
    tryMath: tryMath,
    wikiFacts: wikiFacts,
    extractKeys: extractKeys
  };
})(typeof window !== "undefined" ? window : globalThis);
