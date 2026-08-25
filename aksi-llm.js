/**
 * AKSI LLM + Core bridge v1.1
 * Pipeline: memory cmds → Internet Core → LLM → local agent
 * Contact: aksilove@internet.ru · @AKSILOVE
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
      return {
        on: j.on !== false,
        base: String(j.base || LLM_DEFAULTS.base).replace(/\/$/, ""),
        key: String(j.key != null ? j.key : LLM_DEFAULTS.key),
        model: String(j.model || LLM_DEFAULTS.model),
        maxTokens: Number(j.maxTokens) || 800
      };
    } catch (e) { return Object.assign({}, LLM_DEFAULTS); }
  }
  function saveLlmCfg(cfg) {
    try { localStorage.setItem(LLM_CFG_KEY, JSON.stringify(cfg)); } catch (e) {}
  }
  function getMemFacts() {
    try {
      var a = JSON.parse(localStorage.getItem("aksi_whole_mem_v3") || "[]");
      return (Array.isArray(a) ? a : []).filter(function (x) { return x && x.t && x.src !== "core"; }).slice(0, 12)
        .map(function (x) { return "- " + x.t; }).join("\n");
    } catch (e) { return ""; }
  }
  function systemPrompt() {
    var mem = getMemFacts();
    return "Ты — АКСИ, суверенный цифровой напарник. Отвечай по-русски, ясно и по делу.\n" +
      "Помогаешь с анализом, кодом, документами, решениями. Помнишь факты пользователя.\n" +
      "Контакт проекта: aksilove@internet.ru · @AKSILOVE\n" +
      "Не выдумывай личные данные. Если не знаешь — скажи прямо.\n" +
      (mem ? ("Факты из памяти пользователя:\n" + mem) : "");
  }
  function buildMessages(q) {
    var msgs = [{ role: "system", content: systemPrompt() }];
    chatHistory.slice(-16).forEach(function (m) {
      msgs.push({ role: m.role === "user" ? "user" : "assistant", content: m.content });
    });
    msgs.push({ role: "user", content: q });
    return msgs;
  }
  function callLLM(q) {
    var cfg = loadLlmCfg();
    if (!cfg.on || !cfg.base) return Promise.resolve(null);
    var headers = { "Content-Type": "application/json" };
    if (cfg.key) headers["Authorization"] = "Bearer " + cfg.key;
    return fetch(cfg.base + "/v1/chat/completions", {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        model: cfg.model || "llama3.2",
        messages: buildMessages(q),
        temperature: 0.7,
        max_tokens: cfg.maxTokens || 800
      })
    }).then(function (r) {
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
    fetch(cfg.base + "/v1/models", {
      headers: cfg.key ? { Authorization: "Bearer " + cfg.key } : {}
    }).then(function (r) { if (cb) cb(!!r.ok); }).catch(function () { if (cb) cb(false); });
  }
  function bubble(role, text, meta) {
    var th = $("thread");
    if (!th) return;
    var d = document.createElement("div");
    d.className = "msg " + (role === "me" ? "me" : "ai");
    d.innerHTML = "<div class='bub'></div>";
    d.querySelector(".bub").textContent = text;
    if (meta) {
      var md = document.createElement("div");
      md.className = "meta";
      md.textContent = meta;
      d.querySelector(".bub").appendChild(md);
    }
    th.appendChild(d);
    var main = document.querySelector("main");
    if (main) main.scrollTop = main.scrollHeight;
  }
  function removeThinking() {
    var th = $("thread");
    if (!th || !th.lastChild) return;
    var b = th.lastChild.querySelector && th.lastChild.querySelector(".bub");
    if (b && /(Думаю|Ядро ищет)/.test(b.textContent || "")) th.removeChild(th.lastChild);
  }

  var origChat = global.AKSI_CHAT;

  function chatAI(q) {
    q = String(q || "").trim();
    if (!q || busy) return;
    if (/^(запомни|выучи)\s*[:\s]/i.test(q) || /забудь всё|что ты помнишь|что ты знаешь/i.test(q)) {
      if (typeof origChat === "function") return origChat(q);
    }
    busy = true;
    bubble("me", q);
    chatHistory.push({ role: "user", content: q });
    if ($("inp")) $("inp").value = "";
    bubble("ai", "Ядро ищет…");

    function finish(text, meta) {
      removeThinking();
      bubble("ai", text, meta || "АКСИ");
      chatHistory.push({ role: "assistant", content: text });
      if (chatHistory.length > 40) chatHistory = chatHistory.slice(-40);
      busy = false;
    }

    function tryLLM(context) {
      var prompt = context
        ? ("Контекст из интернета (Ядро АКСИ):\n" + String(context).slice(0, 2500) +
           "\n\nВопрос пользователя: " + q +
           "\n\nОтветь по-русски, опираясь на контекст. Не выдумывай факты сверх данных.")
        : q;
      return callLLM(prompt).then(function (llm) {
        if (llm && llm.text) {
          finish(llm.text, context ? "Ядро+LLM" : "LLM · АКСИ");
          return true;
        }
        return false;
      }).catch(function () { return false; });
    }

    var useCore = global.AKSI_CORE && (
      (typeof global.AKSI_CORE.needsNet === "function" && global.AKSI_CORE.needsNet(q)) ||
      /^(поиск|найди|search|что такое|кто такой|wiki)/i.test(q)
    );

    if (useCore && typeof global.AKSI_CORE.ask === "function") {
      global.AKSI_CORE.ask(q).then(function (res) {
        if (res && res.ok && res.text) {
          if (res.refined) {
            finish(res.text, "Ядро+LLM");
            return;
          }
          tryLLM(res.text).then(function (ok) {
            if (ok) return;
            finish(res.text, "Ядро · интернет");
          });
          return;
        }
        tryLLM(null).then(function (ok) {
          if (ok) return;
          busy = false;
          if (typeof origChat === "function") origChat(q);
          else finish("Сеть не дала ответа. Уточни вопрос.", "ядро");
        });
      }).catch(function () {
        tryLLM(null).then(function (ok) {
          if (ok) return;
          busy = false;
          if (typeof origChat === "function") origChat(q);
        });
      });
      return;
    }

    tryLLM(null).then(function (ok) {
      if (ok) return;
      busy = false;
      if (typeof origChat === "function") origChat(q);
      else finish(
        "Нейросеть offline. Ядро интернета: спроси «что такое …» / «кто такой …» / «найди …».\nOllama: вкладка О себе.",
        "локально"
      );
    });
  }

  global.AKSI_CHAT = chatAI;

  document.addEventListener("click", function (e) {
    var el = e.target.closest ? e.target.closest("#send, #btnLlmSave, #btnLlmTest") : e.target;
    if (!el) return;
    if (el.id === "send") {
      e.stopPropagation();
      e.preventDefault();
      chatAI(($("inp") || {}).value || "");
      return;
    }
    if (el.id === "btnLlmSave") {
      var cfg = {
        on: $("llmOn") ? !!$("llmOn").checked : true,
        base: (($("llmBase") || {}).value || "").trim().replace(/\/$/, "") || LLM_DEFAULTS.base,
        key: (($("llmKey") || {}).value || "").trim() || "ollama",
        model: (($("llmModel") || {}).value || "").trim() || "llama3.2",
        maxTokens: 800
      };
      saveLlmCfg(cfg);
      if ($("llmStatus")) $("llmStatus").textContent = "сохранено · проверка…";
      probeLLM(function (ok) {
        if ($("llmStatus")) $("llmStatus").textContent = ok ? "✓ нейросеть online · " + cfg.model : "офлайн — Ollama/API · Ядро интернета работает без них";
      });
      return;
    }
    if (el.id === "btnLlmTest") {
      if ($("llmStatus")) $("llmStatus").textContent = "тест…";
      callLLM("Скажи одним предложением: ты АКСИ и готова помогать.").then(function (r) {
        if ($("llmStatus")) $("llmStatus").textContent = r ? "✓ OK" : "LLM нет · Ядро интернета всё равно доступно";
        if (r) bubble("ai", "LLM тест: " + r.text, "тест");
      });
    }
  }, true);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target && e.target.id === "inp") {
      e.preventDefault();
      e.stopPropagation();
      chatAI(e.target.value);
    }
  }, true);

  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("[data-ask]");
    if (!el) return;
    e.stopPropagation();
    chatAI(el.getAttribute("data-ask"));
  }, true);

  function initUi() {
    var cfg = loadLlmCfg();
    if ($("llmOn")) $("llmOn").checked = !!cfg.on;
    if ($("llmBase")) $("llmBase").value = cfg.base;
    if ($("llmKey") && cfg.key !== "ollama") $("llmKey").value = cfg.key;
    if ($("llmModel")) $("llmModel").value = cfg.model;
    probeLLM(function (ok) {
      if ($("llmStatus")) {
        $("llmStatus").textContent = ok
          ? "✓ нейросеть online · " + cfg.model
          : "Ядро интернета ON · LLM опционально (Ollama/API)";
      }
      if ($("stBadge")) $("stBadge").textContent = ok ? "LLM" : "Ядро";
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initUi);
  else setTimeout(initUi, 100);

  global.AKSI_LLM = { call: callLLM, probe: probeLLM, chat: chatAI, version: "1.1.0-core" };
})(window);
