/**
 * AKSI Comprehend v1.0 — find → understand → answer
 * Evidence in → coherent Russian answer out (heuristic + optional WebLLM)
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.0.0-comprehend";

  function clean(s) {
    return String(s || "")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/\[[^\]]*\]\(https?:\/\/duckduckgo\.com[^)]*\)/g, " ")
      .replace(/https?:\/\/\S+/g, " ")
      .replace(/Title:\s*/gi, " ")
      .replace(/URL Source:\s*/gi, " ")
      .replace(/Markdown Content:\s*/gi, " ")
      .replace(/Published Time:\s*\S+/gi, " ")
      .replace(/\*\*/g, "")
      .replace(/#{1,6}\s*/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function sentences(text) {
    text = clean(text);
    if (!text) return [];
    var parts = text.split(/(?<=[.!?…])\s+|\n+/);
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].trim();
      if (p.length < 25) continue;
      if (p.length > 320) p = p.slice(0, 317) + "…";
      if (/cookie|подпишись|javascript|captcha/i.test(p)) continue;
      out.push(p);
    }
    return out;
  }

  function tokenize(q) {
    return String(q || "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter(function (w) {
        return w.length > 2;
      });
  }

  function scoreSentence(sent, words) {
    var low = sent.toLowerCase();
    var s = 0;
    for (var i = 0; i < words.length; i++) {
      if (low.indexOf(words[i]) !== -1) s += 2;
    }
    if (/это |является |представляет |называ|означает /i.test(sent)) s += 3;
    if (sent.length > 60 && sent.length < 220) s += 1;
    return s;
  }

  function extractFacts(evidence, query) {
    var words = tokenize(query);
    var scored = [];
    for (var i = 0; i < (evidence || []).length; i++) {
      var e = evidence[i];
      var blob = clean((e.text || e.snippet || "") + " " + (e.title || ""));
      var sents = sentences(blob);
      if (!sents.length && blob.length > 30) sents = [blob.slice(0, 280)];
      for (var j = 0; j < sents.length; j++) {
        scored.push({
          text: sents[j],
          score: scoreSentence(sents[j], words),
          source: e.source || "?",
          url: e.url || "",
          title: e.title || ""
        });
      }
    }
    scored.sort(function (a, b) {
      return b.score - a.score;
    });
    var seen = {};
    var uniq = [];
    for (var k = 0; k < scored.length; k++) {
      var key = scored[k].text.slice(0, 50).toLowerCase();
      if (seen[key]) continue;
      seen[key] = 1;
      uniq.push(scored[k]);
      if (uniq.length >= 8) break;
    }
    return uniq;
  }

  function detectIntent(query) {
    var q = String(query || "").toLowerCase();
    if (/^(что такое|что это|кто так|кто такой|кто такая|определ)/i.test(q) || /что такое/.test(q))
      return "define";
    if (/как |каким образом|как работает|как устроен/.test(q)) return "how";
    if (/почему|зачем/.test(q)) return "why";
    if (/когда|в каком году|дата/.test(q)) return "when";
    if (/где /.test(q)) return "where";
    if (/сравн|отличие|разница|vs|versus/.test(q)) return "compare";
    if (/список|какие|перечисли/.test(q)) return "list";
    return "general";
  }

  function writeHeuristic(query, facts, evidence) {
    var intent = detectIntent(query);
    var lines = [];
    var top = facts.slice(0, 5);

    if (!top.length) {
      return {
        answer:
          "По запросу «" +
          query +
          "» не удалось собрать достаточно ясных фактов. Переформулируйте вопрос или проверьте сеть.",
        mode: "heuristic-empty",
        facts: []
      };
    }

    if (intent === "define") {
      lines.push(top[0].text);
      if (top[1]) {
        lines.push("");
        lines.push("Простыми словами: " + top[1].text);
      }
    } else if (intent === "how") {
      lines.push("Кратко, как это устроено:");
      lines.push("");
      for (var i = 0; i < Math.min(3, top.length); i++) {
        lines.push(i + 1 + ". " + top[i].text);
      }
    } else if (intent === "why") {
      lines.push("Почему так:");
      lines.push("");
      lines.push(top[0].text);
      if (top[1]) lines.push(top[1].text);
    } else if (intent === "list") {
      lines.push("По доступным источникам:");
      lines.push("");
      for (var j = 0; j < Math.min(5, top.length); j++) {
        lines.push("• " + top[j].text);
      }
    } else {
      lines.push(top[0].text);
      if (top[1]) {
        lines.push("");
        lines.push(top[1].text);
      }
      if (top[2]) {
        lines.push("");
        lines.push("Дополнительно: " + top[2].text);
      }
    }

    lines.push("");
    lines.push("—");
    var srcTitles = [];
    var seenU = {};
    for (var s = 0; s < top.length; s++) {
      var t = top[s].title || top[s].source;
      if (t && !seenU[t]) {
        seenU[t] = 1;
        srcTitles.push(t);
      }
    }
    if (srcTitles.length) {
      lines.push("Опора на источники: " + srcTitles.slice(0, 4).join("; ") + ".");
    }
    lines.push("АКСИ собрала факты, отфильтровала шум и сформулировала ответ. Это не замена эксперту по спорным темам.");

    var links = [];
    var seenL = {};
    for (var e = 0; e < (evidence || []).length && links.length < 5; e++) {
      var u = evidence[e].url;
      if (!u || seenL[u]) continue;
      seenL[u] = 1;
      links.push("→ " + (evidence[e].title || "Источник") + " — " + u);
    }
    if (links.length) {
      lines.push("");
      lines.push("Ссылки:");
      lines = lines.concat(links);
    }

    return { answer: lines.join("\n"), mode: "heuristic", intent: intent, facts: top };
  }

  function buildLlmPrompt(query, facts) {
    var block = facts
      .slice(0, 6)
      .map(function (f, i) {
        return i + 1 + ". " + f.text;
      })
      .join("\n");
    return (
      "Ты — АКСИ, русскоязычный помощник. По фактам ниже дай ясный связный ответ на вопрос пользователя.\n" +
      "Правила: только русский; не выдумывай сверх фактов; 4–8 предложений; сначала суть, потом детали.\n\n" +
      "Вопрос: " +
      query +
      "\n\nФакты:\n" +
      block +
      "\n\nОтвет:"
    );
  }

  async function maybeWebLLM(query, facts) {
    try {
      if (!G.AKSI_WEBLLM || !AKSI_WEBLLM.ready || !AKSI_WEBLLM.ready()) return null;
      if (!facts || !facts.length) return null;
      var prompt = buildLlmPrompt(query, facts);
      var r = await AKSI_WEBLLM.complete(prompt, {
        temperature: 0.35,
        max_tokens: 450,
        system:
          "Ты АКСИ. Отвечай только по-русски. Осмысли факты и дай понятный ответ человеку. Не копируй сырые сниппеты."
      });
      var text = clean((r && (r.text || r.answer)) || "");
      if (text.length < 40) return null;
      if (!/[а-яёА-ЯЁ]/.test(text)) return null;
      return text;
    } catch (e) {
      return null;
    }
  }

  async function comprehend(query, opts) {
    opts = opts || {};
    query = String(query || "").trim();
    var evidence = opts.evidence || (opts.pack && opts.pack.evidence) || [];
    var facts = extractFacts(evidence, query);
    var heur = writeHeuristic(query, facts, evidence);

    var llmText = null;
    if (opts.useLLM !== false) {
      llmText = await maybeWebLLM(query, facts);
    }

    if (llmText) {
      var withSrc = llmText;
      var links = [];
      var seen = {};
      for (var i = 0; i < evidence.length && links.length < 4; i++) {
        if (evidence[i].url && !seen[evidence[i].url]) {
          seen[evidence[i].url] = 1;
          links.push("→ " + (evidence[i].title || "Источник") + " — " + evidence[i].url);
        }
      }
      if (links.length) withSrc += "\n\nСсылки:\n" + links.join("\n");
      return {
        ok: true,
        answer: withSrc,
        text: withSrc,
        source: "comprehend:webllm",
        mode: "webllm",
        intent: heur.intent,
        facts: facts,
        version: VER
      };
    }

    return {
      ok: true,
      answer: heur.answer,
      text: heur.answer,
      source: "comprehend:heuristic",
      mode: heur.mode,
      intent: heur.intent,
      facts: facts,
      version: VER
    };
  }

  async function answer(query, opts) {
    opts = opts || {};
    query = String(query || "").trim();
    if (!query) return { ok: false, answer: "", error: "empty" };

    var evidence = opts.evidence || [];
    var errors = [];

    if (!evidence.length && opts.skipWeb !== true) {
      try {
        if (G.AKSI_INTERNET && AKSI_INTERNET.gather) {
          var pack = await AKSI_INTERNET.gather(query, { mode: "full", deepPages: opts.deepPages || 2 });
          evidence = pack.evidence || [];
          errors = pack.errors || [];
        } else if (G.AKSI_INTERNET && AKSI_INTERNET.research) {
          var r = await AKSI_INTERNET.research(query);
          evidence = r.evidence || [];
        }
      } catch (e) {
        errors.push(String(e.message || e));
      }
    }

    try {
      var K = G.AKSI_KNOWLEDGE || G.AKSIKnowledge;
      if (K && K.search) {
        var k = K.search(query);
        if (k && k.body) {
          evidence = evidence.concat([{ title: k.title, text: k.body, url: "", source: "knowledge" }]);
        }
      }
    } catch (e) {}

    var c = await comprehend(query, { evidence: evidence, useLLM: opts.useLLM });
    c.evidence = evidence;
    c.errors = errors;
    c.query = query;
    c.pipeline = "find→understand→answer";
    return c;
  }

  G.AKSI_COMPREHEND = {
    version: VER,
    comprehend: comprehend,
    answer: answer,
    extractFacts: extractFacts
  };
})(typeof window !== "undefined" ? window : globalThis);
