/**
 * AKSI LLM + Core bridge v1.2.1 — always answers, never hangs
 * local builtin KB → net core → LLM (timeouts)
 * Contact: aksilove@internet.ru · @AKSILOVE
 */
(function (global) {
  "use strict";
  var LLM_CFG_KEY = "aksi_llm_cfg_v1";
  var LLM_DEFAULTS = { on: true, base: "http://127.0.0.1:11434", key: "ollama", model: "llama3.2", maxTokens: 600 };
  var chatHistory = [];
  var busy = false;

  function $(id) { return document.getElementById(id); }
  function loadLlmCfg() {
    try {
      var j = JSON.parse(localStorage.getItem(LLM_CFG_KEY) || "null");
      if (!j || typeof j !== "object") return Object.assign({}, LLM_DEFAULTS);
      return {
        on: j.on !== false,
        base: String(j.base || LLM_DEFAULTS.base).replace(/\/$/, ""),
        key: String(j.key != null ? j.key : LLM_DEFAULTS.key),
        model: String(j.model || LLM_DEFAULTS.model),
        maxTokens: Number(j.maxTokens) || 600
      };
    } catch (e) { return Object.assign({}, LLM_DEFAULTS); }
  }
  function saveLlmCfg(cfg) {
    try { localStorage.setItem(LLM_CFG_KEY, JSON.stringify(cfg)); } catch (e) {}
  }
  function getMemFacts() {
    try {
      var a = JSON.parse(localStorage.getItem("aksi_whole_mem_v3") || "[]");
      return (Array.isArray(a) ? a : []).filter(function (x) { return x && x.t && x.src !== "core"; }).slice(0, 10)
        .map(function (x) { return "- " + x.t; }).join("\n");
    } catch (e) { return ""; }
  }
  function systemPrompt() {
    var mem = getMemFacts();
    return "Ты — АКСИ. Отвечай по-русски, кратко.\nКонтакт: aksilove@internet.ru\n" + (mem ? ("Память:\n" + mem) : "");
  }
  function buildMessages(q) {
    var msgs = [{ role: "system", content: systemPrompt() }];
    chatHistory.slice(-12).forEach(function (m) {
      msgs.push({ role: m.role === "user" ? "user" : "assistant", content: m.content });
    });
    msgs.push({ role: "user", content: q });
    return msgs;
  }

  function fetchTimeout(url, opts, ms) {
    ms = ms || 5000;
    opts = opts || {};
    return new Promise(function (resolve, reject) {
      var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      var done = false;
      var t = setTimeout(function () {
        if (done) return;
        done = true;
        try { if (ctrl) ctrl.abort(); } catch (e) {}
        reject(new Error("timeout"));
      }, ms);
      var o = {}, k;
      for (k in opts) o[k] = opts[k];
      if (ctrl) o.signal = ctrl.signal;
      fetch(url, o).then(function (r) {
        if (done) return;
        done = true; clearTimeout(t); resolve(r);
      }).catch(function (e) {
        if (done) return;
        done = true; clearTimeout(t); reject(e);
      });
    });
  }

  function callLLM(q) {
    var cfg = loadLlmCfg();
    if (!cfg.on || !cfg.base) return Promise.resolve(null);
    var headers = { "Content-Type": "application/json" };
    if (cfg.key) headers["Authorization"] = "Bearer " + cfg.key;
    return fetchTimeout(cfg.base + "/v1/chat/completions", {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        model: cfg.model || "llama3.2",
        messages: buildMessages(q),
        temperature: 0.7,
        max_tokens: cfg.maxTokens || 600
      })
    }, 5000).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    }).then(function (j) {
      var t = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      t = (t || "").trim();
      return t ? { text: t } : null;
    }).catch(function () { return null; });
  }

  function probeLLM(cb) {
    var cfg = loadLlmCfg();
    if (!cfg.base) { if (cb) cb(false); return; }
    fetchTimeout(cfg.base + "/v1/models", {
      headers: cfg.key ? { Authorization: "Bearer " + cfg.key } : {}
    }, 2000).then(function (r) { if (cb) cb(!!r.ok); }).catch(function () { if (cb) cb(false); });
  }

  function bubble(role, text, meta) {
    var th = $("thread");
    if (!th) return;
    var d = document.createElement("div");
    d.className = "msg " + (role === "me" ? "me" : "ai");
    var bub = document.createElement("div");
    bub.className = "bub";
    bub.textContent = text;
    if (meta) {
      var md = document.createElement("div");
      md.className = "meta";
      md.textContent = meta;
      bub.appendChild(md);
    }
    d.appendChild(bub);
    th.appendChild(d);
    var main = document.querySelector("main");
    if (main) main.scrollTop = main.scrollHeight;
  }

  function removeThinking() {
    var th = $("thread");
    if (!th) return;
    var nodes = th.querySelectorAll(".msg.ai");
    var i, b;
    for (i = nodes.length - 1; i >= 0; i--) {
      b = nodes[i].querySelector(".bub");
      if (b && /^(Думаю|Ядро ищет|Ищу|Секунду)/.test((b.textContent || "").trim())) {
        th.removeChild(nodes[i]);
        return;
      }
    }
  }

  function builtinAnswer(q) {
    var low = String(q || "").toLowerCase().trim();
    var now = "";
    try {
      now = new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit" }).format(new Date());
    } catch (e) {}
    if (/^(привет|здравств|добрый|hello|hi)\b/.test(low))
      return "Привет. Я АКСИ · " + now + " МСК.\nСпроси: кто ты · что умеешь · формула · что такое …";
    if (/кто ты|что ты такое|who are you|ты акси/.test(low))
      return "Я АКСИ — суверенный цифровой напарник.\n\n• Ядро: поиск Wikipedia\n• Память: запомни: факт\n• EQS · квант · DKV · Vision · Agent-v1\n• aksilove@internet.ru · @AKSILOVE";
    if (/что умеешь|что можешь|функци|помощь|help|команды/.test(low))
      return "Умею:\n• локальные ответы (кто ты, формула…)\n• поиск: что такое … / кто такой …\n• запомни: факт\n• вкладки DKV · Зрение · Метрики · Квант\n• LLM опционально (О себе)";
    if (/формул|aksi\s*=/.test(low))
      return "AKSI = (A×I×S)×(1+0.4√n)\nEQS = 0.30·H + 0.35·rel + 0.25·coh + 0.10·age";
    if (/протокол|agent-v1|handshake/.test(low))
      return "AKSI-Agent-v1: handshake · envelope · DID. Вкладка Протокол.";
    if (/контакт|почта|email/.test(low))
      return "aksilove@internet.ru · @AKSILOVE";
    if (/время|который час|дата|сегодня/.test(low)) {
      try {
        return new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date()) + " (MSK)";
      } catch (e) { return new Date().toLocaleString("ru-RU"); }
    }
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

  function chatAI(q) {
    q = String(q || "").trim();
    if (!q) return;
    if (busy) busy = false;

    if (/^(запомни|выучи)\s*[:\s]/i.test(q) || /забудь всё|что ты помнишь|что ты знаешь/i.test(q)) {
      if (typeof global.AKSI_CHAT_LOCAL === "function") return global.AKSI_CHAT_LOCAL(q);
      bubble("me", q);
      if ($("inp")) $("inp").value = "";
      bubble("ai", localAnswer(q) || "Напиши: запомни: твой факт", "память");
      return;
    }

    busy = true;
    bubble("me", q);
    chatHistory.push({ role: "user", content: q });
    if ($("inp")) $("inp").value = "";
    bubble("ai", "Секунду…");

    var finished = false;
    function finish(text, meta) {
      if (finished) return;
      finished = true;
      removeThinking();
      text = String(text || "Попробуй: кто ты · что умеешь · что такое …").trim();
      bubble("ai", text, meta || "АКСИ");
      chatHistory.push({ role: "assistant", content: text });
      if (chatHistory.length > 40) chatHistory = chatHistory.slice(-40);
      busy = false;
    }

    var watchdog = setTimeout(function () {
      if (!finished) finish(localAnswer(q) || "Сеть не успела. Спроси: кто ты · формула · что такое ИИ", "таймаут");
    }, 9000);

    function done(text, meta) {
      clearTimeout(watchdog);
      finish(text, meta);
    }

    var local = localAnswer(q);
    var needNet = global.AKSI_CORE && typeof global.AKSI_CORE.needsNet === "function"
      ? global.AKSI_CORE.needsNet(q)
      : /^(что такое|кто такой|найди|поиск|wiki)/i.test(q);

    if (local && !needNet) {
      done(local, "локально");
      return;
    }

    function afterCore(coreText) {
      callLLM(coreText
        ? ("Кратко по-русски по данным:\n" + String(coreText).slice(0, 1600) + "\n\nВопрос: " + q)
        : q
      ).then(function (llm) {
        if (llm && llm.text) { done(llm.text, coreText ? "Ядро+LLM" : "LLM"); return; }
        if (coreText) done(coreText, "Ядро · интернет");
        else if (local) done(local, "локально");
        else done("Нет ответа из сети.\n• что такое … · кто такой …\n• кто ты · формула\n• Ollama — вкладка О себе", "офлайн");
      });
    }

    if (needNet && global.AKSI_CORE && typeof global.AKSI_CORE.query === "function") {
      Promise.race([
        global.AKSI_CORE.query(q),
        new Promise(function (r) { setTimeout(function () { r({ ok: false }); }, 6500); })
      ]).then(function (res) {
        afterCore(res && res.ok && res.text ? res.text : null);
      }).catch(function () { afterCore(null); });
      return;
    }

    afterCore(null);
  }

  global.AKSI_CHAT = chatAI;

  document.addEventListener("click", function (e) {
    var el = e.target.closest ? e.target.closest("#send, #btnLlmSave, #btnLlmTest") : e.target;
    if (!el) return;
    if (el.id === "send") {
      e.stopPropagation(); e.preventDefault();
      chatAI(($("inp") || {}).value || "");
      return;
    }
    if (el.id === "btnLlmSave") {
      var cfg = {
        on: $("llmOn") ? !!$("llmOn").checked : true,
        base: (($("llmBase") || {}).value || "").trim().replace(/\/$/, "") || LLM_DEFAULTS.base,
        key: (($("llmKey") || {}).value || "").trim() || "ollama",
        model: (($("llmModel") || {}).value || "").trim() || "llama3.2",
        maxTokens: 600
      };
      saveLlmCfg(cfg);
      if ($("llmStatus")) $("llmStatus").textContent = "сохранено…";
      probeLLM(function (ok) {
        if ($("llmStatus")) $("llmStatus").textContent = ok ? "✓ LLM online" : "LLM офлайн · локальные ответы OK";
      });
      return;
    }
    if (el.id === "btnLlmTest") {
      callLLM("Скажи: ты АКСИ.").then(function (r) {
        if ($("llmStatus")) $("llmStatus").textContent = r ? "✓ OK" : "без Ollama — норма";
        if (r) bubble("ai", r.text, "тест");
      });
    }
  }, true);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target && e.target.id === "inp") {
      e.preventDefault(); e.stopPropagation();
      chatAI(e.target.value);
    }
  }, true);

  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("[data-ask]");
    if (!el) return;
    e.stopPropagation(); e.preventDefault();
    chatAI(el.getAttribute("data-ask"));
  }, true);

  function initUi() {
    var cfg = loadLlmCfg();
    if ($("llmOn")) $("llmOn").checked = !!cfg.on;
    if ($("llmBase")) $("llmBase").value = cfg.base;
    if ($("llmModel")) $("llmModel").value = cfg.model;
    probeLLM(function (ok) {
      if ($("llmStatus")) $("llmStatus").textContent = ok ? "✓ LLM" : "локально + ядро ON";
      if ($("stBadge")) $("stBadge").textContent = ok ? "LLM" : "Ядро";
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initUi);
  else setTimeout(initUi, 80);

  global.AKSI_LLM = { call: callLLM, probe: probeLLM, chat: chatAI, version: "1.2.1" };
})(window);
