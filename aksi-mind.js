/**
 * AKSI Mind v1.1 — conscious answer pipeline
 * Personal Net → Internet (Wikipedia) → WebLLM (optional, timeout) → never empty
 * Attested 2026-09-17 · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.1.0";
  function looksFactual(q) {
    q = String(q || "").toLowerCase();
    return /^(что|кто|где|когда|как|почему|зачем|сколько|какой|какая|какие|what|who|where|when|how|why)\b/i.test(q) ||
      /что такое|кто такой|расскажи|объясни|исследуй|найди|новост|сейчас/i.test(q);
  }
  function needsInternet(q) {
    q = String(q || "").toLowerCase();
    return looksFactual(q) || /вики|wikipedia|факт|определен|столиц|президент|год /i.test(q);
  }
  async function research(topic) {
    if (G.AKSI_BOT && G.AKSI_BOT.research) return G.AKSI_BOT.research(topic);
    topic = String(topic || "").trim().replace(/^(исследуй|изучи|найди|research)\s*[:：]?\s*/i, "");
    var lang = /[а-яё]/i.test(topic) ? "ru" : "en";
    var api = "https://" + lang + ".wikipedia.org/w/api.php?action=opensearch&search=" +
      encodeURIComponent(topic) + "&limit=4&namespace=0&format=json&origin=*";
    var a = await fetch(api, { cache: "no-store" }).then(function (r) { return r.json(); });
    var titles = a[1] || [], urls = a[3] || [], sources = [];
    for (var i = 0; i < Math.min(titles.length, 3); i++) {
      try {
        var p = await fetch("https://" + lang + ".wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(titles[i]), { cache: "no-store" }).then(function (r) { return r.json(); });
        if (p && (p.extract || p.description))
          sources.push({ title: p.title || titles[i], url: urls[i], text: p.extract || p.description });
      } catch (e) {}
    }
    var lines = [];
    sources.forEach(function (s, i) {
      lines.push((i + 1) + ". " + s.title + " — " + String(s.text || "").slice(0, 280));
      if (s.url) lines.push("   " + s.url);
    });
    return { text: lines.join("\n"), sources: sources, topic: topic };
  }
  function personal(q) {
    if (!G.AKSI_PERSONAL) return null;
    try {
      if (G.AKSI_PERSONAL.ensure) G.AKSI_PERSONAL.ensure();
      var r = G.AKSI_PERSONAL.ask(q);
      if (!r || !r.text || r.low) return null;
      if ((r.confidence || 0) < 0.35) return null;
      return r;
    } catch (e) { return null; }
  }
  function withTimeout(promise, ms, label) {
    return new Promise(function (resolve) {
      var done = false;
      var t = setTimeout(function () {
        if (done) return; done = true;
        resolve({ text: null, error: "timeout " + (label || ""), source: "timeout" });
      }, ms);
      Promise.resolve(promise).then(function (v) {
        if (done) return; done = true; clearTimeout(t); resolve(v);
      }).catch(function (e) {
        if (done) return; done = true; clearTimeout(t);
        resolve({ text: null, error: String(e && e.message || e), source: "error" });
      });
    });
  }
  async function llm(q, context) {
    if (!G.AKSI_WEBLLM || !G.AKSI_WEBLLM.ready || !G.AKSI_WEBLLM.ready()) return null;
    var system = "Ты АКСИ — спокойный русскоязычный помощник. Отвечай только по-русски, ясно, по делу. Не выдумывай факты. Если дан контекст — опирайся на него.";
    var prompt = context
      ? ("Контекст:\n" + String(context).slice(0, 1800) + "\n\nВопрос: " + q + "\n\nКраткий ответ на русском:")
      : q;
    var r = await withTimeout(G.AKSI_WEBLLM.complete(prompt, { system: system, max_tokens: 360, temperature: 0.35 }), 55000, "webllm");
    if (r && r.text && String(r.text).trim().length > 8)
      return { text: String(r.text).trim(), source: r.source || "webllm", model: r.model, backend: r.backend };
    return null;
  }
  function compose(q, parts) {
    if (parts.llm && parts.llm.text) {
      var meta = "большая LLM";
      if (parts.research && parts.research.sources && parts.research.sources.length)
        meta += " + интернет (" + parts.research.sources.length + " ист.)";
      return { text: parts.llm.text, source: "mind-llm", meta: meta, parts: parts };
    }
    if (parts.personal && parts.personal.text && parts.research && parts.research.sources && parts.research.sources.length) {
      return {
        text: parts.personal.text + "\n\n— Из интернета (Wikipedia) —\n" + parts.research.text + "\n\nЭто выдержки из открытых источников; проверяйте важное.",
        source: "mind-hybrid", meta: "личная сеть + интернет", parts: parts
      };
    }
    if (parts.research && parts.research.sources && parts.research.sources.length) {
      return {
        text: "По открытым источникам по запросу «" + (parts.research.topic || q) + "»:\n\n" + parts.research.text + "\n\nЭто не окончательная истина — сверяйте важное.",
        source: "mind-web", meta: "интернет · " + parts.research.sources.length + " источников", parts: parts
      };
    }
    if (parts.personal && parts.personal.text) {
      return {
        text: parts.personal.text,
        source: "mind-personal",
        meta: "личная нейросеть" + (parts.personal.confidence != null ? " · " + Math.round(parts.personal.confidence * 100) + "%" : ""),
        parts: parts
      };
    }
    return {
      text: "Пока не собрала уверенный ответ.\n• Уточните вопрос\n• Или: исследуй: тема\n• Контакт: aksilove@internet.ru",
      source: "mind-empty", meta: "нет данных", parts: parts
    };
  }
  async function think(q, opts) {
    opts = opts || {};
    q = String(q || "").trim();
    if (!q) return { text: "Напишите вопрос.", source: "empty", meta: "" };
    if (/^(исследуй|изучи|research)\s*[:：]?\s*/i.test(q)) {
      q = q.replace(/^(исследуй|изучи|research)\s*[:：]?\s*/i, "").trim() || q;
      opts.forceWeb = true;
    }
    var parts = { personal: null, research: null, llm: null };
    parts.personal = personal(q);
    var doWeb = opts.forceWeb || needsInternet(q) || !parts.personal || (parts.personal.confidence || 0) < 0.45;
    if (doWeb) {
      try {
        parts.research = await withTimeout(research(q), 12000, "wiki");
        if (parts.research && parts.research.error) parts.research = { sources: [], text: "", topic: q };
      } catch (e) { parts.research = { sources: [], text: "", topic: q }; }
    }
    if (opts.useLlm || (G.AKSI_WEBLLM && G.AKSI_WEBLLM.ready && G.AKSI_WEBLLM.ready())) {
      var ctx = parts.research && parts.research.text ? parts.research.text : "";
      parts.llm = await llm(q, ctx);
    }
    return compose(q, parts);
  }
  G.AKSI_MIND = { version: VER, think: think, ask: think, research: research, needsInternet: needsInternet };
})(typeof window !== "undefined" ? window : globalThis);
