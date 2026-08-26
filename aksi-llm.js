/**
 * AKSI Universal LLM Router v1.1
 * Provider-agnostic · local-first · BYOK (keys only in browser)
 * Ollama · OpenAI-compat · xAI · OpenAI · Anthropic · Gemini · Custom
 * © AKSI · aksilove@internet.ru · Proprietary
 */
(function (global) {
  "use strict";

  var VER = "1.1.0";
  var SECRETS_KEY = "aksi:llm:secrets:v1";
  var CFG_KEY = "aksi:llm:cfg:v1";
  var HIST_KEY = "aksi:llm:hist:v1";
  var DEFAULT_ORDER = ["ollama", "custom", "xai", "openai", "anthropic", "gemini"];
  var DEFAULT_SYSTEM =
    "Ты АКСИ — суверенный local-first цифровой напарник. " +
    "Отвечай по делу, на языке пользователя. Не выдумывай факты. " +
    "Контакт автора: aksilove@internet.ru. Идентичность AKSI proprietary.";

  function loadJSON(k, fb) {
    try {
      var v = JSON.parse(localStorage.getItem(k) || "null");
      return v == null ? fb : v;
    } catch (e) {
      return fb;
    }
  }
  function saveJSON(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {}
  }

  function getSecret(id) {
    var all = loadJSON(SECRETS_KEY, {});
    return (all[id] && all[id].key) || null;
  }
  function setSecret(id, key) {
    var all = loadJSON(SECRETS_KEY, {});
    if (!key) delete all[id];
    else all[id] = { key: String(key), updatedAt: Date.now() };
    saveJSON(SECRETS_KEY, all);
  }
  function listSecrets() {
    var all = loadJSON(SECRETS_KEY, {});
    return Object.keys(all).filter(function (k) {
      return all[k] && all[k].key;
    });
  }

  function cfg() {
    return Object.assign(
      {
        order: DEFAULT_ORDER.slice(),
        system: DEFAULT_SYSTEM,
        temperature: 0.7,
        maxTokens: 1024,
        history: true,
        historyMax: 12,
        enabled: true,
      },
      loadJSON(CFG_KEY, {})
    );
  }
  function saveCfg(patch) {
    var c = Object.assign(cfg(), patch || {});
    saveJSON(CFG_KEY, c);
    return c;
  }

  function hist() {
    return loadJSON(HIST_KEY, []);
  }
  function pushHist(role, content) {
    var h = hist();
    h.push({ role: role, content: String(content || "").slice(0, 8000) });
    var max = cfg().historyMax || 12;
    if (h.length > max * 2) h = h.slice(-max * 2);
    saveJSON(HIST_KEY, h);
  }
  function clearHist() {
    saveJSON(HIST_KEY, []);
  }

  function catalog() {
    var c = cfg();
    return [
      {
        id: "ollama",
        label: "Ollama (local)",
        kind: "local",
        baseURL: (loadJSON("aksi_llm_cfg_v1", {}).base || "http://127.0.0.1:11434") + "/v1",
        model: loadJSON("aksi_llm_cfg_v1", {}).model || "llama3.2",
        needsKey: false,
      },
      {
        id: "custom",
        label: "Custom OpenAI-API",
        kind: "local",
        baseURL: c.customBase || "http://127.0.0.1:8080/v1",
        model: c.customModel || "local-model",
        needsKey: false,
      },
      {
        id: "xai",
        label: "xAI Grok",
        kind: "cloud",
        baseURL: "https://api.x.ai/v1",
        model: c.xaiModel || "grok-2-latest",
        needsKey: true,
      },
      {
        id: "openai",
        label: "OpenAI",
        kind: "cloud",
        baseURL: "https://api.openai.com/v1",
        model: c.openaiModel || "gpt-4o",
        needsKey: true,
      },
      {
        id: "anthropic",
        label: "Anthropic Claude",
        kind: "cloud",
        baseURL: "https://api.anthropic.com",
        model: c.anthropicModel || "claude-sonnet-4-20250514",
        needsKey: true,
      },
      {
        id: "gemini",
        label: "Google Gemini",
        kind: "cloud",
        baseURL: "https://generativelanguage.googleapis.com/v1beta",
        model: c.geminiModel || "gemini-2.0-flash",
        needsKey: true,
      },
    ];
  }

  function findProv(id) {
    return catalog().find(function (p) {
      return p.id === id;
    });
  }

  async function fetchJSON(url, opts) {
    var res = await fetch(url, opts);
    var text = await res.text();
    var data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      data = { raw: text };
    }
    if (!res.ok) {
      var err = new Error(
        (data && data.error && data.error.message) || data.message || res.status + " " + url
      );
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  async function completeOpenAI(p, messages, opts) {
    opts = opts || {};
    var headers = { "Content-Type": "application/json" };
    var key = getSecret(p.id);
    if (key) headers.Authorization = "Bearer " + key;
    var body = {
      model: opts.model || p.model,
      messages: messages,
      temperature: opts.temperature != null ? opts.temperature : cfg().temperature,
      max_tokens: opts.maxTokens || cfg().maxTokens,
      stream: false,
    };
    var data = await fetchJSON(p.baseURL.replace(/\/$/, "") + "/chat/completions", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
      signal: opts.signal,
    });
    var choice = data.choices && data.choices[0];
    var msg = choice && choice.message;
    return {
      text: (msg && msg.content) || "",
      providerId: p.id,
      model: body.model,
      usage: data.usage || null,
      done: true,
    };
  }

  async function completeAnthropic(p, messages, opts) {
    opts = opts || {};
    var key = getSecret(p.id);
    if (!key) throw new Error("нет API key Anthropic");
    var system = "";
    var msgs = [];
    messages.forEach(function (m) {
      if (m.role === "system") system += (system ? "\n" : "") + m.content;
      else msgs.push({ role: m.role === "assistant" ? "assistant" : "user", content: m.content });
    });
    var data = await fetchJSON("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: opts.model || p.model,
        max_tokens: opts.maxTokens || cfg().maxTokens || 1024,
        system: system || undefined,
        messages: msgs,
      }),
      signal: opts.signal,
    });
    var text = "";
    (data.content || []).forEach(function (b) {
      if (b.type === "text") text += b.text;
    });
    return { text: text, providerId: p.id, model: data.model || p.model, done: true, usage: data.usage };
  }

  async function completeGemini(p, messages, opts) {
    opts = opts || {};
    var key = getSecret(p.id);
    if (!key) throw new Error("нет API key Gemini");
    var contents = [];
    var system = "";
    messages.forEach(function (m) {
      if (m.role === "system") system += m.content + "\n";
      else
        contents.push({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        });
    });
    var url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      encodeURIComponent(opts.model || p.model) +
      ":generateContent?key=" +
      encodeURIComponent(key);
    var body = { contents: contents };
    if (system) body.systemInstruction = { parts: [{ text: system }] };
    var data = await fetchJSON(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
    var text = "";
    var cand = data.candidates && data.candidates[0];
    if (cand && cand.content && cand.content.parts) {
      cand.content.parts.forEach(function (pt) {
        if (pt.text) text += pt.text;
      });
    }
    return { text: text, providerId: p.id, model: p.model, done: true };
  }

  async function completeProvider(p, messages, opts) {
    if (p.id === "anthropic") return completeAnthropic(p, messages, opts);
    if (p.id === "gemini") return completeGemini(p, messages, opts);
    return completeOpenAI(p, messages, opts);
  }

  async function isAvailable(p) {
    if (p.needsKey && !getSecret(p.id)) return false;
    if (p.kind === "local") {
      try {
        var url = p.baseURL.replace(/\/$/, "") + "/models";
        var res = await fetch(url, { signal: AbortSignal.timeout(2000) });
        return res.ok || res.status === 401;
      } catch (e) {
        return false;
      }
    }
    return true;
  }

  async function complete(userText, opts) {
    opts = opts || {};
    var c = cfg();
    if (c.enabled === false && !opts.force) throw new Error("LLM выключен в настройках");
    var system = opts.system || c.system || DEFAULT_SYSTEM;
    var messages = [{ role: "system", content: system }];
    if (c.history !== false && !opts.noHistory) {
      hist().forEach(function (m) {
        messages.push(m);
      });
    }
    messages.push({ role: "user", content: String(userText) });

    var order = opts.order || c.order || DEFAULT_ORDER;
    var prefer = opts.provider;
    if (prefer)
      order = [prefer].concat(
        order.filter(function (x) {
          return x !== prefer;
        })
      );

    var errors = [];
    for (var i = 0; i < order.length; i++) {
      var p = findProv(order[i]);
      if (!p) continue;
      try {
        if (!(await isAvailable(p))) {
          errors.push(p.id + ": offline");
          continue;
        }
        var result = await completeProvider(p, messages, {
          model: opts.model,
          temperature: opts.temperature,
          maxTokens: opts.maxTokens,
          signal: opts.signal,
        });
        if (result && result.text) {
          if (c.history !== false && !opts.noHistory) {
            pushHist("user", userText);
            pushHist("assistant", result.text);
          }
          result.providerLabel = p.label;
          return result;
        }
        errors.push(p.id + ": empty");
      } catch (e) {
        errors.push(p.id + ": " + (e.message || e));
      }
    }
    var err = new Error("LLM: " + (errors.join(" · ") || "нет провайдеров"));
    err.errors = errors;
    throw err;
  }

  async function health() {
    var list = catalog();
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      var ok = false;
      var detail = "";
      try {
        ok = await isAvailable(p);
        detail = ok ? "ready" : p.needsKey && !getSecret(p.id) ? "no key" : "unreachable";
      } catch (e) {
        detail = String(e.message || e);
      }
      out.push({
        id: p.id,
        label: p.label,
        kind: p.kind,
        ok: ok,
        detail: detail,
        hasKey: !!getSecret(p.id),
      });
    }
    return out;
  }

  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;
    var c = cfg();

    root.innerHTML =
      '<div class="card">' +
      "<h2>LLM Router · v" +
      VER +
      "</h2>" +
      '<p class="muted">Universal adapter · local-first · ключи только в браузере (BYOK).</p>' +
      '<label class="muted" style="display:flex;gap:8px;align-items:center;margin:12px 0">' +
      '<input type="checkbox" id="llmROn"' +
      (c.enabled !== false ? " checked" : "") +
      "> Включить router</label>' +
      '<p class="muted" style="margin-bottom:6px">Провайдер (приоритет сверху)</p>' +
      '<select id="llmPrefer" style="margin-bottom:8px"></select>' +
      '<p class="muted" style="margin-bottom:6px">API key (для облака)</p>' +
      '<input id="llmKey" type="password" placeholder="sk-… / xai-… / AIza…" autocomplete="off" style="margin-bottom:8px">' +
      '<div class="row">' +
      '<button type="button" class="btn p" id="llmSaveKey">Сохранить key</button>' +
      '<button type="button" class="btn" id="llmClearKey">Стереть key</button>' +
      '<button type="button" class="btn" id="llmHealth">Health</button>' +
      "</div>" +
      '<p class="muted" style="margin:12px 0 6px">Ollama base · model</p>' +
      '<input id="llmBase" value="" style="margin-bottom:8px">' +
      '<input id="llmModel" value="" style="margin-bottom:8px">' +
      '<p class="muted" style="margin:12px 0 6px">Custom OpenAI-compatible base · model</p>' +
      '<input id="llmCustomBase" placeholder="http://127.0.0.1:8080/v1" style="margin-bottom:8px">' +
      '<input id="llmCustomModel" placeholder="model-id" style="margin-bottom:8px">' +
      '<p class="muted" style="margin:12px 0 6px">System prompt</p>' +
      '<textarea id="llmSystem" style="min-height:72px"></textarea>' +
      '<div class="row">' +
      '<button type="button" class="btn p" id="llmSaveCfg">Сохранить</button>' +
      '<button type="button" class="btn" id="llmTest">Тест chat</button>' +
      '<button type="button" class="btn" id="llmClearHist">Очистить history</button>' +
      "</div>" +
      '<pre id="llmOut" class="out" style="margin-top:12px;max-height:220px">—</pre>' +
      "</div>";

    var prefer = document.getElementById("llmPrefer");
    catalog().forEach(function (p) {
      var o = document.createElement("option");
      o.value = p.id;
      o.textContent = p.label + (p.kind === "local" ? " · local" : " · cloud");
      prefer.appendChild(o);
    });
    prefer.value = (c.order && c.order[0]) || "ollama";

    var legacy = loadJSON("aksi_llm_cfg_v1", {});
    document.getElementById("llmBase").value = legacy.base || "http://127.0.0.1:11434";
    document.getElementById("llmModel").value = legacy.model || "llama3.2";
    document.getElementById("llmCustomBase").value = c.customBase || "";
    document.getElementById("llmCustomModel").value = c.customModel || "";
    document.getElementById("llmSystem").value = c.system || DEFAULT_SYSTEM;

    function show(x) {
      var el = document.getElementById("llmOut");
      if (el) el.textContent = typeof x === "string" ? x : JSON.stringify(x, null, 2);
    }

    document.getElementById("llmSaveKey").onclick = function () {
      var id = prefer.value;
      var key = document.getElementById("llmKey").value;
      setSecret(id, key);
      document.getElementById("llmKey").value = "";
      show("Key для «" + id + "» сохранён локально. Не уходит на сервер АКСИ.");
    };
    document.getElementById("llmClearKey").onclick = function () {
      setSecret(prefer.value, null);
      show("Key «" + prefer.value + "» удалён");
    };
    document.getElementById("llmHealth").onclick = function () {
      show("probe…");
      health().then(show).catch(function (e) {
        show(String(e.message || e));
      });
    };
    document.getElementById("llmSaveCfg").onclick = function () {
      var base = document.getElementById("llmBase").value.trim();
      var model = document.getElementById("llmModel").value.trim();
      saveJSON("aksi_llm_cfg_v1", { on: true, base: base, model: model });
      var order = [prefer.value].concat(
        DEFAULT_ORDER.filter(function (x) {
          return x !== prefer.value;
        })
      );
      saveCfg({
        enabled: document.getElementById("llmROn").checked,
        order: order,
        system: document.getElementById("llmSystem").value,
        customBase: document.getElementById("llmCustomBase").value.trim(),
        customModel: document.getElementById("llmCustomModel").value.trim(),
      });
      show("Конфиг сохранён · prefer=" + prefer.value);
    };
    document.getElementById("llmTest").onclick = function () {
      show("test…");
      complete("Ответь одним словом: ок", { provider: prefer.value, noHistory: true })
        .then(function (r) {
          show({ ok: true, provider: r.providerId, text: r.text });
        })
        .catch(function (e) {
          show({ ok: false, error: e.message, errors: e.errors });
        });
    };
    document.getElementById("llmClearHist").onclick = function () {
      clearHist();
      show("history cleared");
    };
  }

  global.AKSI_LLM = {
    version: VER,
    complete: complete,
    health: health,
    catalog: catalog,
    getSecret: getSecret,
    setSecret: setSecret,
    listSecrets: listSecrets,
    cfg: cfg,
    saveCfg: saveCfg,
    clearHist: clearHist,
    hist: hist,
    mount: mount,
    DEFAULT_SYSTEM: DEFAULT_SYSTEM,
  };
})(typeof window !== "undefined" ? window : this);
