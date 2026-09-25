/**
 * AKSI WebLLM v4.3 — wider practical context
 * Multi-turn + memory + Neuro. Not 128k cloud.
 * aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VERSION = "4.3.0";
  var WEBLLM_VERSION = "0.2.79";
  var CDNS = [
    "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@" + WEBLLM_VERSION + "/+esm",
    "https://esm.sh/@mlc-ai/web-llm@" + WEBLLM_VERSION
  ];
  var MODELS = [
    { id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", label: "Qwen2.5 0.5B · mobile · ~2–4k ctx", mobile: true },
    { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", label: "Llama 3.2 1B · ~4k ctx", mobile: true },
    { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", label: "Qwen2.5 1.5B · desktop · wider", mobile: false },
    { id: "Phi-3.5-mini-instruct-q4f16_1-MLC", label: "Phi 3.5 mini · heavy", mobile: false }
  ];
  var BASE_SYS =
    "Ты АКСИ — локальный помощник. Используй ВЕСЬ переданный контекст (память, история, SEED). " +
    "Отвечай на языке пользователя. Если в контексте есть ответ — опирайся на него. " +
    "Различай факт и догадку. Не выдумывай источники. Не AGI.";

  var engine = null, currentModel = null, loading = false, progress = 0;
  var message = "ожидание", lastError = null, webgpu = null, loadPromise = null, adaptedHint = "";

  function isMobile() {
    try {
      var ua = (G.navigator && G.navigator.userAgent) || "";
      return /iPhone|iPad|iPod|Android|Mobile/i.test(ua);
    } catch (e) { return false; }
  }
  function isIOS() {
    try { return /iPhone|iPad|iPod/i.test((G.navigator && G.navigator.userAgent) || ""); }
    catch (e) { return false; }
  }
  function modelsForDevice() {
    return isMobile() ? MODELS.filter(function (m) { return m.mobile; }) : MODELS.slice();
  }
  function defaultModel() { return modelsForDevice()[0].id; }
  function budgets() {
    if (isMobile()) return { sys: 3500, hist: 2500, user: 1500, max_tokens: 256, turns: 6 };
    return { sys: 9000, hist: 8000, user: 4000, max_tokens: 512, turns: 16 };
  }
  function status() {
    var b = budgets();
    return {
      version: VERSION, webllm: WEBLLM_VERSION, ready: !!engine && !loading, loading: loading,
      progress: progress, message: message, model: currentModel, webgpu: webgpu, error: lastError,
      mobile: isMobile(), ios: isIOS(), adapted: !!adaptedHint, models: modelsForDevice(),
      context: { system_chars: b.sys, history_chars: b.hist, user_chars: b.user, turns: b.turns, max_tokens: b.max_tokens },
      note: "Практический контекст ограничен моделью (не 128k cloud)."
    };
  }
  function emit() {
    try { G.dispatchEvent(new CustomEvent("aksi-webllm-progress", { detail: status() })); } catch (e) {}
  }
  function setProgress(p, msg) {
    progress = Math.max(0, Math.min(100, Math.round(p <= 1 ? p * 100 : p)));
    if (msg) message = String(msg).slice(0, 240);
    emit();
  }
  function detectWebGPU() {
    if (webgpu !== null) return Promise.resolve(webgpu);
    if (!G.navigator || !G.navigator.gpu) { webgpu = false; return Promise.resolve(false); }
    return G.navigator.gpu.requestAdapter().then(function (a) {
      webgpu = !!a; return webgpu;
    }).catch(function () { webgpu = false; return false; });
  }
  function importFirst(urls, i) {
    i = i || 0;
    if (i >= urls.length) return Promise.reject(new Error("WebLLM CDN недоступен"));
    return import(urls[i]).catch(function () { return importFirst(urls, i + 1); });
  }
  function adapt(facts) {
    var list = Array.isArray(facts) ? facts : [facts];
    var lines = list.map(function (f) {
      return typeof f === "string" ? f : f && (f.text || f.t);
    }).filter(Boolean).map(function (s) { return "• " + String(s).slice(0, 400); });
    adaptedHint = (adaptedHint ? adaptedHint + "\n" : "") + lines.join("\n");
    adaptedHint = adaptedHint.slice(-6000);
    try { G.localStorage.setItem("aksi_webllm_adapt", adaptedHint); } catch (e) {}
    return { ok: true, mode: "prompt+memory", chars: adaptedHint.length };
  }
  try { adaptedHint = G.localStorage.getItem("aksi_webllm_adapt") || ""; } catch (e) {}

  function loadMemAll() {
    var parts = [];
    ["aksi_prod_mem", "aksi_mem_v2", "aksi_rwkv_mem_v5"].forEach(function (k) {
      try {
        var a = JSON.parse(G.localStorage.getItem(k) || "[]");
        if (!Array.isArray(a)) return;
        a.forEach(function (x) {
          var t = typeof x === "string" ? x : x && (x.t || x.text || x.answer);
          if (t) parts.push(String(t).slice(0, 400));
        });
      } catch (e) {}
    });
    return parts;
  }
  function packSystem(prompt) {
    var b = budgets();
    var chunks = [BASE_SYS];
    if (adaptedHint) chunks.push("Адаптация:\n" + adaptedHint);
    var mem = loadMemAll();
    if (mem.length) chunks.push("Память (" + mem.length + "):\n" + mem.slice(-40).join("\n"));
    try {
      if (G.AKSI_NEURO && G.AKSI_NEURO.query) {
        var r = G.AKSI_NEURO.query(prompt);
        if (r && (r.answer || r.text)) chunks.push("SEED:\n" + String(r.answer || r.text).slice(0, 1200));
      }
    } catch (e) {}
    var sys = chunks.join("\n\n");
    if (sys.length > b.sys) sys = sys.slice(0, b.sys);
    return sys;
  }
  function packMessages(prompt, history, options) {
    var b = budgets();
    var sys = packSystem(prompt);
    if (options && options.system) sys += "\n" + String(options.system).slice(0, 1000);
    var msgs = [{ role: "system", content: sys }];
    var hist = Array.isArray(history) ? history.slice(-b.turns) : [];
    var acc = 0, kept = [], i, h, piece;
    for (i = hist.length - 1; i >= 0; i--) {
      h = hist[i];
      if (!h || !h.content) continue;
      piece = String(h.content).slice(0, 800);
      if (acc + piece.length > b.hist) break;
      kept.unshift({ role: h.role === "assistant" || h.role === "ai" ? "assistant" : "user", content: piece });
      acc += piece.length;
    }
    kept.forEach(function (m) { msgs.push(m); });
    msgs.push({ role: "user", content: String(prompt || "").slice(0, b.user) });
    return msgs;
  }

  function loadModel(modelId, onProgress) {
    if (engine && currentModel && (!modelId || modelId === currentModel)) return Promise.resolve(status());
    if (loading && loadPromise) return loadPromise;
    loading = true; progress = 0; lastError = null; message = "проверяю GPU…"; emit();
    var mid = modelId || defaultModel();
    if (isMobile()) {
      var ok = modelsForDevice().map(function (m) { return m.id; });
      if (ok.indexOf(mid) < 0) mid = defaultModel();
    }
    loadPromise = detectWebGPU().then(function (gpu) {
      if (!gpu) {
        throw new Error(isIOS()
          ? "WebGPU нет на этом iPhone. Большой контекст: Memory+Neuro в Chat."
          : "WebGPU недоступен.");
      }
      setProgress(5, "библиотека…");
      return importFirst(CDNS).then(function (mod) {
        var create = mod.CreateMLCEngine || (mod.default && mod.default.CreateMLCEngine);
        if (!create) throw new Error("CreateMLCEngine не найден");
        setProgress(8, "веса " + mid + "…");
        return create(mid, {
          initProgressCallback: function (info) {
            var p = 10 + (info && typeof info.progress === "number" ? info.progress * 88 : 0);
            setProgress(p, (info && info.text) || "загрузка…");
            if (typeof onProgress === "function") try { onProgress(status()); } catch (e) {}
          }
        });
      });
    }).then(function (inst) {
      engine = inst; currentModel = mid; lastError = null;
      setProgress(100, "готово · " + mid);
      try { G.localStorage.setItem("aksi_webllm_model", mid); } catch (e) {}
      loading = false; loadPromise = null; return status();
    }).catch(function (err) {
      loading = false; loadPromise = null; engine = null; currentModel = null;
      lastError = String((err && err.message) || err);
      message = "ошибка: " + lastError.slice(0, 200); progress = 0; emit();
      return status();
    });
    return loadPromise;
  }

  function complete(prompt, options) {
    options = options || {};
    if (!engine) return Promise.resolve({ text: null, error: "модель не загружена", source: "none" });
    if (loading) return Promise.resolve({ text: null, error: "загрузка…", source: "none" });
    var b = budgets();
    var msgs = packMessages(prompt, options.history || options.messages, options);
    var maxTok = options.max_tokens || options.maxTokens || b.max_tokens;
    return engine.chat.completions.create({
      messages: msgs,
      temperature: options.temperature != null ? options.temperature : 0.4,
      max_tokens: maxTok
    }).then(function (reply) {
      var t = reply && reply.choices && reply.choices[0] && reply.choices[0].message && reply.choices[0].message.content;
      return {
        text: String(t || "").trim(), source: "webllm", model: currentModel,
        context_msgs: msgs.length,
        context_chars: msgs.reduce(function (n, m) { return n + String(m.content || "").length; }, 0)
      };
    }).catch(function (error) {
      return { text: null, source: "webllm", error: String((error && error.message) || error) };
    });
  }

  function unload() {
    try { if (engine && engine.unload) engine.unload(); } catch (e) {}
    engine = null; currentModel = null; loading = false; loadPromise = null;
    progress = 0; message = "выгружено"; lastError = null; emit();
  }

  G.AKSI_WEBLLM = {
    version: VERSION, status: status, load: loadModel, autoLoad: loadModel, unload: unload,
    complete: complete, think: complete, ask: complete, adapt: adapt, packMessages: packMessages,
    models: MODELS, modelsForDevice: modelsForDevice,
    ready: function () { return !!engine && !loading; },
    loading: function () { return loading; },
    isMobile: isMobile
  };
})(typeof window !== "undefined" ? window : globalThis);
