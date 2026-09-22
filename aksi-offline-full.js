/**
 * AKSI Offline Full v1.0 — unified offline-first mind
 * Pipeline: teach → memory → Neuro → Knowledge → heuristics → optional WebLLM → Receipt
 * NOT conscious. NOT a fully trained foundation model from scratch.
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VERSION = "1.0.0-offline-full";
  var MEM_KEY = "aksi_offline_mem_v1";
  var LOG_KEY = "aksi_offline_log_v1";

  function now() { return new Date().toISOString(); }
  function loadArr(k) {
    try { var a = JSON.parse(G.localStorage.getItem(k) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function saveArr(k, a) {
    try { G.localStorage.setItem(k, JSON.stringify((a || []).slice(-400))); } catch (e) {}
  }
  function tokens(s) {
    return String(s || "").toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu, " ").split(/\s+/).filter(function (w) { return w.length > 1; });
  }
  function score(q, text) {
    var qt = tokens(q), tt = tokens(text);
    if (!qt.length || !tt.length) return 0;
    var set = {}; tt.forEach(function (w) { set[w] = 1; });
    var n = 0; qt.forEach(function (w) { if (set[w]) n++; });
    return n / qt.length;
  }

  var CORE = [
    "Я АКСИ Offline Full — локальный контур на вашем устройстве. Не обладаю сознанием. Понимание = поиск по знаниям, памяти и (опционально) локальной LLM.",
    "Обучение: «запомни: …» сохраняет факт в память браузера. Это не дообучение нейросети, а knowledge + retrieval.",
    "Полный offline: Neuro SEED, память, Decision Receipt, эвристики. WebLLM — только если есть WebGPU и вы загрузили веса.",
    "Decision Receipt: каждый ответ может получить gate ALLOW/BLOCK и классы FACT/HYPOTHESIS/UNGROUNDED.",
    "Контакт: aksilove@internet.ru. Публично без ФИО.",
    "AKSI DIP — Decision Integrity Platform: квитанция на решение ИИ для аудита.",
    "Технология служит человеку: ясность важнее «вау», факт важнее уверенного тона."
  ];

  function memorySearch(q) {
    var mem = loadArr(MEM_KEY), best = null, bs = 0;
    mem.forEach(function (m) {
      var t = m.text || m.a || m;
      var s = score(q, String(t));
      if (s > bs) { bs = s; best = String(t); }
    });
    return bs >= 0.25 ? { text: best, score: bs, source: "memory" } : null;
  }
  function coreSearch(q) {
    var best = null, bs = 0;
    CORE.forEach(function (t) {
      var s = score(q, t);
      if (s > bs) { bs = s; best = t; }
    });
    return bs >= 0.2 ? { text: best, score: bs, source: "core" } : null;
  }
  function neuroSearch(q) {
    try {
      if (G.AKSI_NEURO && typeof G.AKSI_NEURO.query === "function") {
        var r = G.AKSI_NEURO.query(q);
        if (r && (r.answer || r.text)) return { text: String(r.answer || r.text), score: r.score || 0.5, source: "neuro" };
      }
    } catch (e) {}
    return null;
  }
  function knowledgeSearch(q) {
    try {
      if (G.AKSI_KNOWLEDGE && typeof G.AKSI_KNOWLEDGE.search === "function") {
        var hits = G.AKSI_KNOWLEDGE.search(q);
        if (hits && hits.length) {
          var h = hits[0];
          return { text: String(h.text || h.a || h.answer || ""), score: 0.4, source: "knowledge" };
        }
      }
    } catch (e) {}
    return null;
  }
  function teach(line) {
    var m = String(line || "").match(/^(?:запомни|запомнить|remember)\s*[:：]\s*(.+)$/i);
    if (!m) return null;
    var fact = m[1].trim();
    if (!fact) return null;
    var mem = loadArr(MEM_KEY);
    mem.unshift({ text: fact, at: now() });
    saveArr(MEM_KEY, mem);
    return {
      text: "Запомнено локально: «" + fact.slice(0, 200) + "». Это запись в памяти браузера, не переобучение весов нейросети.",
      source: "teach",
      taught: fact
    };
  }
  function heuristic(q) {
    var ql = String(q || "").toLowerCase();
    if (/созна|осозна|sentien|conscious|самосозна|живой\s*разум/.test(ql)) {
      return {
        text: "У меня нет сознания и субъективного опыта. Есть программы: поиск по SEED/памяти, опциональная локальная LLM, правила квитанций. «Понимание» здесь — сопоставление запроса с данными, не осознание.",
        source: "honest"
      };
    }
    if (/обуч|train|pretrain|веса/.test(ql)) {
      return {
        text: "Полноценное предобучение foundation-модели здесь не выполняется. Offline AKSI = SEED/Neuro + ваша память + при желании WebLLM (готовые веса на устройство). «Обучение» через «запомни:» — факты в localStorage.",
        source: "honest"
      };
    }
    if (/привет|здравств|hello/.test(ql)) {
      return { text: "Привет. Я AKSI Offline Full — локальный контур. Спросите о продукте или напишите «запомни: факт».", source: "heuristic" };
    }
    if (/кто ты|что ты|что такое акси/.test(ql)) {
      return {
        text: "AKSI — offline-first runtime: Neuro, память, Decision Receipt, опционально WebLLM. Контакт aksilove@internet.ru. Не AGI.",
        source: "heuristic"
      };
    }
    return {
      text: "По SEED/памяти точного ответа нет. Уточните вопрос или «запомни: …». При WebGPU — локальная LLM на /llm/.",
      source: "fallback"
    };
  }
  function pickBest(q) {
    var cands = [];
    function add(x) { if (x && x.text) cands.push(x); }
    add(memorySearch(q)); add(neuroSearch(q)); add(knowledgeSearch(q)); add(coreSearch(q));
    cands.sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
    if (cands.length && (cands[0].score || 0) >= 0.28) return cands[0];
    return heuristic(q);
  }
  function sealReceipt(answer, q, source) {
    try {
      if (G.AKSI_RECEIPT && typeof G.AKSI_RECEIPT.wrapAnswer === "function") {
        var ev = [];
        if (source && source !== "fallback" && source !== "honest") {
          ev.push({ source: "offline:" + source, snippet: String(answer).slice(0, 240) });
        }
        return G.AKSI_RECEIPT.wrapAnswer(answer, {
          goal: q,
          evidence: ev,
          policy: source === "fallback" ? "strict" : "companion"
        });
      }
    } catch (e) {}
    return null;
  }
  function think(q, options) {
    options = options || {};
    q = String(q || "").trim();
    if (!q) return Promise.resolve({ text: "Пустой запрос.", source: "error" });
    var taught = teach(q);
    if (taught) {
      return Promise.resolve(Object.assign({ ok: true }, taught, { receipt: sealReceipt(taught.text, q, "teach") }));
    }
    var useLlm = options.useLlm || /^(подумай|развёрнуто|llm:)/i.test(q) || options.preferWebLLM;
    var baseQ = q.replace(/^(подумай|развёрнуто|llm:)\s*/i, "").trim() || q;
    function finish(hit) {
      var seal = sealReceipt(hit.text, baseQ, hit.source);
      var out = { ok: true, text: hit.text, source: hit.source, score: hit.score, receipt: seal, gate: seal && seal.gate, version: VERSION, at: now() };
      var log = loadArr(LOG_KEY);
      log.unshift({ q: baseQ, source: hit.source, at: out.at, gate: out.gate });
      saveArr(LOG_KEY, log);
      return out;
    }
    if (useLlm && G.AKSI_WEBLLM && G.AKSI_WEBLLM.ready && G.AKSI_WEBLLM.ready() && typeof G.AKSI_WEBLLM.complete === "function") {
      return G.AKSI_WEBLLM.complete(baseQ, { temperature: 0.35, max_tokens: 400 })
        .then(function (r) {
          if (r && r.text) return finish({ text: r.text, source: "webllm", score: 0.7 });
          return finish(pickBest(baseQ));
        })
        .catch(function () { return finish(pickBest(baseQ)); });
    }
    return Promise.resolve(finish(pickBest(baseQ)));
  }
  function status() {
    return {
      version: VERSION,
      memory: loadArr(MEM_KEY).length,
      neuro: !!G.AKSI_NEURO,
      knowledge: !!G.AKSI_KNOWLEDGE,
      receipt: !!G.AKSI_RECEIPT,
      webllm: !!(G.AKSI_WEBLLM && G.AKSI_WEBLLM.ready && G.AKSI_WEBLLM.ready()),
      claim: "Offline retrieval + optional on-device LLM. Not conscious. Not from-scratch pretrained AGI."
    };
  }
  G.AKSI_OFFLINE = {
    VERSION: VERSION,
    think: think,
    ask: think,
    status: status,
    teach: function (fact) { return teach("запомни: " + fact); },
    memory: function () { return loadArr(MEM_KEY); },
    clearMemory: function () { saveArr(MEM_KEY, []); }
  };
})(typeof window !== "undefined" ? window : globalThis);
