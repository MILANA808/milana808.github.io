/**
 * AKSI-WebLLM — optional strong local LLM (MLC WebLLM / WebGPU)
 * Open-source: https://github.com/mlc-ai/web-llm
 * Explicit local-model loading. Remote model downloads occur only during first setup.
 */
(function (G) {
  "use strict";
  var VER = "1.1.0-webllm";
  var CDN = "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.84/+esm";
  var engine = null, loading = false, loadProgress = 0, loadMsg = "", currentModel = null, lastError = null, webgpuOk = null;
  var MODELS = [
    { id: "Phi-3.5-mini-instruct-q4f16_1-MLC", label: "Phi-3.5 Mini (~2.3 GB)", note: "reasoning" },
    { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", label: "Qwen2.5 1.5B (~1.0 GB)", note: "fast multilingual" },
    { id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", label: "Qwen2.5 0.5B (~0.4 GB)", note: "mobile" },
    { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", label: "Llama 3.2 1B (~0.8 GB)", note: "Meta" },
    { id: "gemma-2-2b-it-q4f16_1-MLC", label: "Gemma 2 2B (~1.6 GB)", note: "Google" }
  ];
  function detectWebGPU() {
    if (webgpuOk !== null) return Promise.resolve(webgpuOk);
    if (!navigator.gpu) { webgpuOk = false; return Promise.resolve(false); }
    return navigator.gpu.requestAdapter().then(function (a) { webgpuOk = !!a; return webgpuOk; }).catch(function () { webgpuOk = false; return false; });
  }
  function status() { return { version: VER, ready: !!engine, loading: loading, progress: loadProgress, message: loadMsg, model: currentModel, webgpu: webgpuOk, error: lastError, models: MODELS.slice() }; }
  function loadModel(modelId, onProgress) {
    if (loading) return Promise.reject(new Error("already loading"));
    modelId = modelId || MODELS[1].id; loading = true; loadProgress = 0; loadMsg = "init…"; lastError = null;
    if (typeof onProgress === "function") onProgress(status());
    return detectWebGPU().then(function (ok) {
      if (!ok) throw new Error("WebGPU unavailable. Use a local native engine such as llama.cpp.");
      loadMsg = "loading WebLLM…"; if (typeof onProgress === "function") onProgress(status()); return import(CDN);
    }).then(function (webllm) {
      var CreateMLCEngine = webllm.CreateMLCEngine || (webllm.default && webllm.default.CreateMLCEngine);
      if (!CreateMLCEngine) throw new Error("CreateMLCEngine missing");
      loadMsg = "downloading weights once…"; if (typeof onProgress === "function") onProgress(status());
      return CreateMLCEngine(modelId, { initProgressCallback: function (report) {
        if (report && typeof report.progress === "number") loadProgress = Math.round(report.progress * 100);
        if (report && report.text) loadMsg = String(report.text).slice(0, 120);
        if (typeof onProgress === "function") onProgress(status());
      }});
    }).then(function (eng) { engine = eng; currentModel = modelId; loading = false; loadProgress = 100; loadMsg = "ready local"; if (onProgress) onProgress(status()); return status(); })
      .catch(function (e) { loading = false; lastError = String(e && e.message ? e.message : e); loadMsg = "error: " + lastError.slice(0, 100); if (onProgress) onProgress(status()); throw e; });
  }
  function unload() { try { if (engine && engine.unload) engine.unload(); } catch (_) {} engine = null; currentModel = null; loadProgress = 0; loadMsg = "unloaded"; return status(); }
  function complete(prompt, opts) {
    opts = opts || {};
    if (!engine) return Promise.resolve({ text: null, meta: "webllm-not-loaded", source: "webllm", offline: true, error: "Load a local model first" });
    var system = opts.system || "Ты АКСИ — local-first ИИ. Отвечай честно. Не выдумывай проверки. Не раскрывай скрытую chain-of-thought.";
    return engine.chat.completions.create({ messages: [{ role: "system", content: system }, { role: "user", content: String(prompt || "").slice(0, 8000) }], temperature: opts.temperature != null ? opts.temperature : 0.55, max_tokens: opts.max_tokens || 700, stream: false })
      .then(function (reply) { var text = reply && reply.choices && reply.choices[0] && reply.choices[0].message ? String(reply.choices[0].message.content || "").trim() : ""; return { text: text, meta: "webllm · " + (currentModel || "mlc"), source: "webllm", offline: true, model: currentModel, usage: reply.usage || null }; })
      .catch(function (e) { return { text: null, meta: "webllm-error", source: "webllm", offline: true, error: String(e && e.message ? e.message : e) }; });
  }
  function think(q) { return complete(q).then(function (r) { return r && r.text ? r : null; }); }
  G.AKSI_WEBLLM = { version: VER, status: status, load: loadModel, unload: unload, complete: complete, think: think, ask: think, models: MODELS, ready: function () { return !!engine; } };
})(typeof window !== "undefined" ? window : this);
