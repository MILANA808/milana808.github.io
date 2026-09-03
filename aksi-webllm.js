/**
 * AKSI-WebLLM v1.3 — optional local LLM (MLC) + autoLoad
 * First load may download weights; then local. Default auto model: Qwen2.5-0.5B
 * Skip: localStorage aksi_webllm_skip=1
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.3.0-webllm";
  var WEBLLM_VERSION = "0.2.84";
  var CDN = "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@" + WEBLLM_VERSION + "/+esm";
  var engine = null, loading = false, loadProgress = 0, loadMsg = "", currentModel = null, lastError = null, webgpuOk = null;
  var autoPromise = null;
  var MODELS = [
    { id: "Phi-3.5-mini-instruct-q4f16_1-MLC", label: "Phi 3.5 Mini ~2.3GB" },
    { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", label: "Qwen 2.5 1.5B ~1GB" },
    { id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", label: "Qwen 2.5 0.5B ~0.4GB" },
    { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", label: "Llama 3.2 1B ~0.8GB" },
    { id: "gemma-2-2b-it-q4f16_1-MLC", label: "Gemma 2 2B ~1.6GB" }
  ];
  function detectWebGPU() {
    if (webgpuOk !== null) return Promise.resolve(webgpuOk);
    if (!navigator.gpu) { webgpuOk = false; return Promise.resolve(false); }
    return navigator.gpu.requestAdapter().then(function (a) { webgpuOk = !!a; return webgpuOk; }).catch(function () { webgpuOk = false; return false; });
  }
  function status() {
    return { version: VER, webllm: WEBLLM_VERSION, ready: !!engine, loading: loading, progress: loadProgress, message: loadMsg, model: currentModel, webgpu: webgpuOk, error: lastError, models: MODELS.slice() };
  }
  function loadModel(modelId, onProgress) {
    if (loading) return Promise.reject(new Error("already loading"));
    modelId = modelId || MODELS[2].id;
    loading = true; loadProgress = 0; loadMsg = "init\u2026"; lastError = null;
    if (typeof onProgress === "function") onProgress(status());
    return detectWebGPU().then(function (ok) {
      if (!ok) throw new Error("WebGPU unavailable");
      loadMsg = "loading WebLLM runtime\u2026"; if (typeof onProgress === "function") onProgress(status());
      return import(CDN);
    }).then(function (webllm) {
      var CreateMLCEngine = webllm.CreateMLCEngine || (webllm.default && webllm.default.CreateMLCEngine);
      if (!CreateMLCEngine) throw new Error("CreateMLCEngine missing");
      loadMsg = "loading model (first time may download)\u2026"; if (typeof onProgress === "function") onProgress(status());
      return CreateMLCEngine(modelId, { initProgressCallback: function (report) {
        if (report && typeof report.progress === "number") loadProgress = Math.max(0, Math.min(100, Math.round(report.progress * 100)));
        if (report && report.text) loadMsg = String(report.text).slice(0, 160);
        if (typeof onProgress === "function") onProgress(status());
      }});
    }).then(function (eng) {
      engine = eng; currentModel = modelId; loading = false; loadProgress = 100; loadMsg = "ready \u00b7 local inference";
      try { localStorage.setItem("aksi_webllm_model", modelId); } catch (e) {}
      if (onProgress) onProgress(status()); return status();
    }).catch(function (e) {
      loading = false; lastError = String(e && e.message ? e.message : e); loadMsg = "error: " + lastError.slice(0, 120);
      if (onProgress) onProgress(status()); throw e;
    });
  }
  function autoLoad(opts) {
    opts = opts || {};
    if (engine) return Promise.resolve(status());
    if (autoPromise) return autoPromise;
    try {
      if (opts.force !== true && localStorage.getItem("aksi_webllm_skip") === "1") {
        loadMsg = "auto-load skipped"; return Promise.resolve(status());
      }
    } catch (e) {}
    var mid = opts.modelId || "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
    try { var saved = localStorage.getItem("aksi_webllm_model"); if (saved) mid = saved; } catch (e) {}
    var onP = opts.onProgress || function () {};
    autoPromise = loadModel(mid, onP).then(function (s) {
      try { localStorage.setItem("aksi_webllm_autoload_ok", "1"); } catch (e) {}
      return s;
    }).catch(function (e) {
      autoPromise = null;
      lastError = String(e && e.message ? e.message : e);
      loadMsg = "auto-load failed: " + lastError.slice(0, 100);
      onP(status());
      return status();
    });
    return autoPromise;
  }
  function unload() {
    try { if (engine && engine.unload) engine.unload(); } catch (_) {}
    engine = null; currentModel = null; loadProgress = 0; loadMsg = "unloaded"; autoPromise = null; return status();
  }
  function complete(prompt, opts) {
    opts = opts || {};
    if (!engine) return Promise.resolve({ text: null, meta: "webllm-not-loaded", source: "webllm", offline: true, error: "Load a local model first" });
    var system = opts.system || "\u0422\u044b \u0410\u041a\u0421\u0418 \u2014 local-first \u0418\u0418. \u041e\u0442\u0432\u0435\u0447\u0430\u0439 \u0447\u0435\u0441\u0442\u043d\u043e.";
    return engine.chat.completions.create({
      messages: [{ role: "system", content: system }, { role: "user", content: String(prompt || "").slice(0, 8000) }],
      temperature: opts.temperature != null ? opts.temperature : 0.55,
      max_tokens: opts.max_tokens || 700,
      stream: false
    }).then(function (reply) {
      var text = reply && reply.choices && reply.choices[0] && reply.choices[0].message ? String(reply.choices[0].message.content || "").trim() : "";
      return { text: text, meta: "webllm " + WEBLLM_VERSION, source: "webllm", offline: true, model: currentModel, usage: reply.usage || null };
    }).catch(function (e) {
      return { text: null, meta: "webllm-error", source: "webllm", offline: true, error: String(e && e.message ? e.message : e) };
    });
  }
  function think(q) { return complete(q).then(function (r) { return r && r.text ? r : null; }); }
  function maybeAuto() {
    try {
      if (G.AKSI_WEBLLM_AUTO === false) return;
      var flag = G.AKSI_WEBLLM_AUTO === true;
      if (typeof document !== "undefined") {
        if (document.documentElement.getAttribute("data-aksi-autoload") === "1") flag = true;
        if (document.body && document.body.getAttribute("data-aksi-autoload") === "1") flag = true;
        if (document.querySelector("[data-aksi-autoload=\"1\"]")) flag = true;
      }
      if (!flag) return;
      setTimeout(function () {
        autoLoad({ onProgress: function (s) {
          try { window.dispatchEvent(new CustomEvent("aksi-webllm-progress", { detail: s })); } catch (e) {}
        }});
      }, 350);
    } catch (e) {}
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", maybeAuto);
    else maybeAuto();
  }
  G.AKSI_WEBLLM = {
    version: VER, webllmVersion: WEBLLM_VERSION, status: status, load: loadModel, autoLoad: autoLoad,
    unload: unload, complete: complete, think: think, ask: think, models: MODELS,
    ready: function () { return !!engine; }, loading: function () { return loading; }
  };
})(typeof window !== "undefined" ? window : this);
