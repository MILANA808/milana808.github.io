/**
 * AKSI Brain v2 — отвечает живо, всегда
 * Pipeline: Self → local → Neuro → Net→compose → LLM
 * Contact: aksilove@internet.ru
 */
(function (global) {
  "use strict";
  var LLM_CFG_KEY = "aksi_llm_cfg_v1";
  var LLM_DEFAULTS = { on: true, base: "http://127.0.0.1:11434", key: "ollama", model: "llama3.2", maxTokens: 800 };
  var chatHistory = [];
  var busy = false;
  function $(id) { return document.getElementById(id); }
  function loadLlmCfg() {
    try {
      var j = JSON.parse(localStorage.getItem(LLM_CFG_KEY) || "null");
      if (!j || typeof j !== "object") return Object.assign({}, LLM_DEFAULTS);
      return { on: j.on !== false, base: String(j.base || LLM_DEFAULTS.base).replace(/\/$/, ""),
        key: String(j.key != null ? j.key : LLM_DEFAULTS.key), model: String(j.model || LLM_DEFAULTS.model), maxTokens: Number(j.maxTokens) || 800 };
    } catch (e) { return Object.assign({}, LLM_DEFAULTS); }
  }
  function saveLlmCfg(cfg) { try { localStorage.setItem(LLM_CFG_KEY, JSON.stringify(cfg)); } catch (e) {} }
  function getMemFacts() {
    try {
      var a = JSON.parse(localStorage.getItem("aksi_whole_mem_v3") || "[]");
      return (Array.isArray(a) ? a : []).filter(function (x) { return x && x.t && x.src !== "core"; }).slice(0, 12).map(function (x) { return "- " + x.t; }).join("\n");
    } catch (e) { return ""; }
  }
  function systemPrompt() {
    var mem = getMemFacts();
    return ["Ты — АКСИ, суверенный цифровой напарник. Говоришь по-русски.",
      "Стиль: как умный друг — прямо, ясно, без воды, с лёгкой иронией когда уместно.",
      "Не притворяйся гигантской облачной моделью. Если не знаешь — скажи и предложи, как узнать.",
      "Контакт: aksilove@internet.ru",
      mem ? ("Память:\n" + mem) : ""].filter(Boolean).join("\n");
  }
  function buildMessages(q) {
    var msgs = [{ role: "system", content: systemPrompt() }];
    chatHistory.slice(-10).forEach(function (m) { msgs.push({ role: m.role === "user" ? "user" : "assistant", content: m.content }); });
    msgs.push({ role: "user", content: q });
    return msgs;
  }
  function fetchTimeout(url, opts, ms) {
    ms = ms || 6000; opts = opts || {};
    return new Promise(function (resolve, reject) {
      var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      var done = false;
      var t = setTimeout(function () { if (done) return; done = true; try { if (ctrl) ctrl.abort(); } catch (e) {} reject(new Error("timeout")); }, ms);
      var o = {}, k; for (k in opts) o[k] = opts[k]; if (ctrl) o.signal = ctrl.signal;
      fetch(url, o).then(function (r) { if (done) return; done = true; clearTimeout(t); resolve(r); })
        .catch(function (e) { if (done) return; done = true; clearTimeout(t); reject(e); });
    });
  }
  function callLLM(q) {
    var cfg = loadLlmCfg(); if (!cfg.on || !cfg.base) return Promise.resolve(null);
    var headers = { "Content-Type": "application/json" }; if (cfg.key) headers["Authorization"] = "Bearer " + cfg.key;
    return fetchTimeout(cfg.base + "/v1/chat/completions", { method: "POST", headers: headers,
      body: JSON.stringify({ model: cfg.model || "llama3.2", messages: buildMessages(q), temperature: 0.75, max_tokens: cfg.maxTokens || 800 })
    }, 8000).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (j) { var t = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content; t = (t || "").trim(); return t ? { text: t } : null; })
      .catch(function () { return null; });
  }
  function probeLLM(cb) {
    var cfg = loadLlmCfg(); if (!cfg.base) { if (cb) cb(false); return; }
    fetchTimeout(cfg.base + "/v1/models", { headers: cfg.key ? { Authorization: "Bearer " + cfg.key } : {} }, 2500)
      .then(function (r) { if (cb) cb(!!r.ok); }).catch(function () { if (cb) cb(false); });
  }
  function bubble(role, text, meta) {
    var th = $("thread"); if (!th) return;
    var d = document.createElement("div"); d.className = "msg " + (role === "me" ? "me" : "ai");
    var bub = document.createElement("div"); bub.className = "bub"; bub.textContent = text;
    if (meta) { var md = document.createElement("div"); md.className = "meta"; md.textContent = meta; bub.appendChild(md); }
    d.appendChild(bub); th.appendChild(d);
    var main = document.querySelector("main"); if (main) main.scrollTop = main.scrollHeight;
  }
  function removeThinking() {
    var th = $("thread"); if (!th) return;
    var nodes = th.querySelectorAll(".msg.ai"), i, b;
    for (i = nodes.length - 1; i >= 0; i--) {
      b = nodes[i].querySelector(".bub");
      if (b && /^(Думаю|Ядро ищет|Ищу|Секунду|Сейчас)/.test((b.textContent || "").trim())) { th.removeChild(nodes[i]); return; }
    }
  }
  function mskNow() {
    try { return new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date()) + " (MSK)"; }
    catch (e) { return new Date().toLocaleString("ru-RU"); }
  }
  function builtinAnswer(q) {
    var low = String(q || "").toLowerCase().trim();
    if (!low) return null;
    if (/^(привет|здравств|добрый|hello|hi|hey)\b/.test(low))
      return "Привет. Я АКСИ — твой локальный напарник.\n\nМогу ответить по делу, поискать в сети, помнить факты, проверить документ, прочитать с камеры.\nСпроси что угодно — или «кто ты», если хочешь разбор.";
    if (/^(пока|до связи|bye)\b/.test(low)) return "На связи. Когда вернёшься — я на месте, на твоём устройстве.";
    if (/спасибо|благодар/.test(low)) return "Всегда пожалуйста. Если нужно глубже — уточни вопрос.";
    if (/^кто ты\b|^что ты такое|^who are you/.test(low)) return null;
    if (/что умеешь|что можешь|помощь|help|команды/.test(low))
      return "Коротко:\n• Разговор — спрашивай как человека\n• Поиск: «что такое …»\n• Память: «запомни: …»\n• Self: «напиши себе инструмент …»\n• Нейро, DKV, Зрение\n\nДля ответов уровня большой модели: Ollama → вкладка О себе.";
    if (/нейросет|rwkv|без gpu|своя модель/.test(low))
      return "Своя нейросеть на CPU — RWKV: линейное время, постоянная память, без GPU.\nУчится на твоих фактах. Вкладка «Нейро». Для большой модели — Ollama.";
    if (/формул|aksi\s*=/.test(low))
      return "AKSI = (A × I × S) × (1 + 0.4√n)\nEQS = 0.30·H + 0.35·rel + 0.25·coh + 0.10·age";
    if (/протокол|agent-v1|handshake|did/.test(low))
      return "Agent-v1: handshake, envelope, DID, fingerprint. Вкладка «Протокол».";
    if (/контакт|почта|email|связаться/.test(low))
      return "aksilove@internet.ru · X @AKSILOVE";
    if (/время|который час|дата|сегодня/.test(low)) return "Сейчас: " + mskNow() + ".";
    if (/ollama|как подключить llm|полноценн/.test(low))
      return "Полноценный диалог:\n1) ollama.com → install\n2) ollama run llama3.2\n3) О себе → http://127.0.0.1:11434 → Сохранить\n\nБез Ollama я всё равно отвечаю: поиск + RWKV + Self.";
    if (/что такое ии\b|что такое искусственный интеллект/.test(low))
      return "Искусственный интеллект — системы, которые делают то, для чего раньше нужен был ум человека: язык, образы, планирование, обучение.\n\nЯ — локальный агент с памятью и протоколом. Облако — по желанию, не по умолчанию.";
    return null;
  }
  function localAnswer(q) {
    try {
      if (typeof global.AKSI_ANSWER === "function") {
        var t = global.AKSI_ANSWER(q);
        if (t && t !== "__WIKI__" && t !== "__FALLBACK__" && String(t).trim()) return String(t);
      }
    } catch (e) {}
    return builtinAnswer(q);
  }
  function tryNeuro(q) {
    if (!global.AKSI_NEURO || typeof global.AKSI_NEURO.think !== "function") return null;
    try {
      var r = global.AKSI_NEURO.think(q);
      if (r && r.text && r.mode !== "empty" && r.mode !== "neuro-weak" && r.mode !== "rwkv-weak") return r;
      if (r && r.mode && r.mode.indexOf("retrieve") >= 0 && r.text) return r;
    } catch (e) {}
    return null;
  }
  function composeFromSources(q, coreText) {
    coreText = String(coreText || "").trim();
    if (!coreText) return null;
    var body = coreText.replace(/^\[.*?\]\s*/gm, "").replace(/\n{3,}/g, "\n\n").trim();
    if (body.length < 20) return null;
    if (body.length > 1100) {
      body = body.slice(0, 1100);
      var cut = body.lastIndexOf(".");
      if (cut > 400) body = body.slice(0, cut + 1); else body += "…";
    }
    if (/^[А-ЯA-Z]/.test(body) && body.length > 80)
      body = body + "\n\nЕсли нужно — уточни, копнём глубже.";
    return body;
  }
  function needsInternet(q) {
    if (global.AKSI_CORE && typeof global.AKSI_CORE.needsNet === "function") {
      try { if (global.AKSI_CORE.needsNet(q)) return true; } catch (e) {}
    }
    var low = String(q || "").toLowerCase();
    if (/^(что такое|кто такой|кто такая|найди|поиск|wiki|расскажи про|расскажи о)\b/.test(low)) return true;
    if (/\b(202[4-9]|когда|где находится|сколько|определение)\b/.test(low) && low.length > 12) return true;
    if (low.length > 15 && low.length < 120 && /\?$/.test(String(q).trim())) return true;
    return false;
  }
  function chatAI(q) {
    q = String(q || "").trim();
    if (!q) return;
    if (busy) busy = false;
    if (global.AKSI_SELF && typeof global.AKSI_SELF.handle === "function") {
      try {
        var selfAns = global.AKSI_SELF.handle(q);
        if (selfAns) {
          bubble("me", q); chatHistory.push({ role: "user", content: q });
          if ($("inp")) $("inp").value = "";
          bubble("ai", selfAns, "Self");
          chatHistory.push({ role: "assistant", content: selfAns });
          return;
        }
      } catch (e) {}
    }
    if (/^(запомни|выучи)\s*[:\s]/i.test(q) || /забудь всё|что ты помнишь|что ты знаешь/i.test(q)) {
      if (/^(запомни|выучи)\s*[:\s]/i.test(q) && global.AKSI_NEURO && global.AKSI_NEURO.learn) {
        try { global.AKSI_NEURO.learn(q.replace(/^(запомни|выучи)\s*[:\s]*/i, ""), 3); } catch (e) {}
      }
      if (typeof global.AKSI_CHAT_LOCAL === "function") return global.AKSI_CHAT_LOCAL(q);
      bubble("me", q); if ($("inp")) $("inp").value = "";
      var memAns = localAnswer(q);
      if (!memAns && /запомни|выучи/i.test(q)) memAns = "Запомнила. Спроси «что ты помнишь».";
      bubble("ai", memAns || "Ок.", "память"); return;
    }
    busy = true; bubble("me", q); chatHistory.push({ role: "user", content: q });
    if ($("inp")) $("inp").value = ""; bubble("ai", "Сейчас…");
    var finished = false;
    function finish(text, meta) {
      if (finished) return; finished = true; removeThinking();
      text = String(text || "").trim();
      if (!text) text = "Не собрала уверенный ответ. Переформулируй или «что такое …».\nOllama на localhost — для полного диалога (О себе).";
      bubble("ai", text, meta || "АКСИ");
      chatHistory.push({ role: "assistant", content: text });
      if (chatHistory.length > 40) chatHistory = chatHistory.slice(-40);
      busy = false;
    }
    var watchdog = setTimeout(function () {
      if (!finished) finish(localAnswer(q) || "Сеть не успела. Спроси ещё раз.", "таймаут");
    }, 10000);
    function done(text, meta) { clearTimeout(watchdog); finish(text, meta); }
    var local = localAnswer(q);
    var wantNet = needsInternet(q);
    if (local && !wantNet) { done(local, "АКСИ"); return; }
    if (!wantNet) {
      var nr = tryNeuro(q);
      if (nr && nr.text && nr.text.length > 12) { done(nr.text, "Neuro"); return; }
    }
    function afterCore(coreText) {
      var composed = composeFromSources(q, coreText);
      var promptForLlm = coreText
        ? ("Вопрос: " + q + "\n\nДанные поиска:\n" + String(coreText).slice(0, 1800) + "\n\nОтветь по-русски живо и по делу, своими словами.")
        : q;
      callLLM(promptForLlm).then(function (llm) {
        if (llm && llm.text) { done(llm.text, coreText ? "АКСИ · поиск+LLM" : "АКСИ · LLM"); return; }
        if (composed) { done(composed, "АКСИ · поиск"); return; }
        if (coreText) { done(String(coreText).slice(0, 1200), "поиск"); return; }
        if (local) { done(local, "АКСИ"); return; }
        var nr2 = tryNeuro(q);
        if (nr2 && nr2.text) { done(nr2.text, "Neuro"); return; }
        done("По этому вопросу нет готового ответа, поиск пуст.\n• перефразируй\n• «что такое …»\n• «запомни: …»\n• Ollama → полный LLM", "АКСИ");
      });
    }
    if ((wantNet || !local) && global.AKSI_CORE && typeof global.AKSI_CORE.query === "function") {
      Promise.race([
        global.AKSI_CORE.query(q),
        new Promise(function (r) { setTimeout(function () { r({ ok: false }); }, 7000); })
      ]).then(function (res) { afterCore(res && res.ok && res.text ? res.text : null); })
        .catch(function () { afterCore(null); });
      return;
    }
    if (local) { done(local, "АКСИ"); return; }
    afterCore(null);
  }
  global.AKSI_CHAT = chatAI;
  document.addEventListener("click", function (e) {
    var el = e.target.closest ? e.target.closest("#send, #btnLlmSave, #btnLlmTest") : e.target;
    if (!el) return;
    if (el.id === "send") { e.stopPropagation(); e.preventDefault(); chatAI(($("inp") || {}).value || ""); return; }
    if (el.id === "btnLlmSave") {
      var cfg = { on: $("llmOn") ? !!$("llmOn").checked : true, base: (($("llmBase") || {}).value || "").trim().replace(/\/$/, "") || LLM_DEFAULTS.base,
        key: (($("llmKey") || {}).value || "").trim() || "ollama", model: (($("llmModel") || {}).value || "").trim() || "llama3.2", maxTokens: 800 };
      saveLlmCfg(cfg); if ($("llmStatus")) $("llmStatus").textContent = "сохранено…";
      probeLLM(function (ok) {
        if ($("llmStatus")) $("llmStatus").textContent = ok ? "✓ LLM online — ответы как большая модель" : "LLM офлайн · АКСИ отвечает сама";
      }); return;
    }
    if (el.id === "btnLlmTest") {
      callLLM("Ответь одной фразой: ты АКСИ.").then(function (r) {
        if ($("llmStatus")) $("llmStatus").textContent = r ? "✓ LLM отвечает" : "Ollama не найдена — работаю без неё";
        if (r) bubble("ai", r.text, "тест LLM");
      });
    }
  }, true);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target && e.target.id === "inp") { e.preventDefault(); e.stopPropagation(); chatAI(e.target.value); }
  }, true);
  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("[data-ask]");
    if (!el) return; e.stopPropagation(); e.preventDefault(); chatAI(el.getAttribute("data-ask"));
  }, true);
  function initUi() {
    var cfg = loadLlmCfg();
    if ($("llmOn")) $("llmOn").checked = !!cfg.on;
    if ($("llmBase")) $("llmBase").value = cfg.base;
    if ($("llmModel")) $("llmModel").value = cfg.model;
    probeLLM(function (ok) {
      if ($("llmStatus")) $("llmStatus").textContent = ok ? "✓ LLM online" : "Без Ollama: поиск + Self + RWKV · ollama run llama3.2 для полного диалога";
      if ($("stBadge")) $("stBadge").textContent = ok ? "LLM" : "АКСИ";
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initUi); else setTimeout(initUi, 80);
  global.AKSI_LLM = { call: callLLM, probe: probeLLM, chat: chatAI, version: "2.0.0-brain" };
})(window);
