/**
 * AKSI-WebLLM v1.4 — WebGPU WebLLM + WASM Transformers fallback
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.4.0-webllm";
  var WEBLLM_VERSION = "0.2.84";
  var CDNS = [
    "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@" + WEBLLM_VERSION + "/+esm",
    "https://unpkg.com/@mlc-ai/web-llm@" + WEBLLM_VERSION + "/+esm"
  ];
  var engine = null, backend = null, xfPipe = null;
  var loading = false, loadProgress = 0, loadMsg = "", currentModel = null, lastError = null, webgpuOk = null;
  var autoPromise = null;
  var MODELS = [
    { id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", label: "Qwen 0.5B WebGPU", backend: "webllm" },
    { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", label: "Qwen 1.5B WebGPU", backend: "webllm" },
    { id: "Xenova/LaMini-Flan-T5-248M", label: "LaMini WASM light", backend: "transformers" },
    { id: "Xenova/Qwen1.5-0.5B-Chat", label: "Qwen1.5 WASM", backend: "transformers" },
    { id: "Xenova/TinyLlama-1.1B-Chat-v1.0", label: "TinyLlama WASM", backend: "transformers" }
  ];
  function status() {
    return { version: VER, webllm: WEBLLM_VERSION, ready: !!(engine || xfPipe), loading: loading, progress: loadProgress, message: loadMsg, model: currentModel, backend: backend, webgpu: webgpuOk, error: lastError, models: MODELS.slice() };
  }
  function emit(s) { try { window.dispatchEvent(new CustomEvent("aksi-webllm-progress", { detail: s || status() })); } catch (e) {} }
  function detectWebGPU() {
    if (webgpuOk !== null) return Promise.resolve(webgpuOk);
    if (typeof navigator === "undefined" || !navigator.gpu) { webgpuOk = false; return Promise.resolve(false); }
    return navigator.gpu.requestAdapter().then(function (a) { webgpuOk = !!a; return webgpuOk; }).catch(function () { webgpuOk = false; return false; });
  }
  function importFirst(urls) {
    var i = 0;
    function next() {
      if (i >= urls.length) return Promise.reject(new Error("CDN unreachable"));
      var u = urls[i++];
      loadMsg = "import " + u.split("/").slice(-2).join("/"); emit();
      return import(u).catch(function () { return next(); });
    }
    return next();
  }
  function loadWebLLM(modelId, onProgress) {
    modelId = modelId || "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
    loadMsg = "\u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 WebGPU\u2026"; if (onProgress) onProgress(status()); emit();
    return detectWebGPU().then(function (ok) {
      if (!ok) throw new Error("WebGPU \u043d\u0435\u0442 \u2192 WASM");
      loadMsg = "runtime WebLLM\u2026"; if (onProgress) onProgress(status()); emit();
      return importFirst(CDNS);
    }).then(function (webllm) {
      var CreateMLCEngine = webllm.CreateMLCEngine || (webllm.default && webllm.default.CreateMLCEngine);
      if (!CreateMLCEngine) throw new Error("CreateMLCEngine missing");
      loadMsg = "\u0441\u043a\u0430\u0447\u0438\u0432\u0430\u043d\u0438\u0435 \u0432\u0435\u0441\u043e\u0432 (\u043f\u0435\u0440\u0432\u044b\u0439 \u0440\u0430\u0437)\u2026"; if (onProgress) onProgress(status()); emit();
      return CreateMLCEngine(modelId, { initProgressCallback: function (report) {
        if (report && typeof report.progress === "number") loadProgress = Math.max(0, Math.min(100, Math.round(report.progress * 100)));
        if (report && report.text) loadMsg = String(report.text).slice(0, 180);
        if (onProgress) onProgress(status()); emit();
      }});
    }).then(function (eng) {
      engine = eng; xfPipe = null; backend = "webllm"; currentModel = modelId; loading = false; loadProgress = 100;
      loadMsg = "\u0433\u043e\u0442\u043e\u0432\u043e \u00b7 WebLLM"; try { localStorage.setItem("aksi_webllm_model", modelId); } catch (e) {}
      if (onProgress) onProgress(status()); emit(); return status();
    });
  }
  function loadTransformers(modelId, onProgress) {
    modelId = modelId || "Xenova/LaMini-Flan-T5-248M";
    loadMsg = "WASM Transformers.js\u2026"; loadProgress = 5; if (onProgress) onProgress(status()); emit();
    var urls = ["https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2", "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/+esm"];
    return importFirst(urls).then(function (mod) {
      var pipeline = mod.pipeline || (mod.default && mod.default.pipeline);
      if (!pipeline) throw new Error("pipeline missing");
      try { if (mod.env) { mod.env.allowLocalModels = false; mod.env.useBrowserCache = true; } } catch (e) {}
      loadMsg = "WASM model " + modelId; loadProgress = 20; if (onProgress) onProgress(status()); emit();
      var task = /T5|t5|flan|LaMini/i.test(modelId) ? "text2text-generation" : "text-generation";
      return pipeline(task, modelId, { progress_callback: function (p) {
        if (p && p.progress != null) loadProgress = Math.max(20, Math.min(95, Math.round(p.progress)));
        if (p && p.status) loadMsg = String(p.status) + (p.file ? " \u00b7 " + p.file : "");
        if (onProgress) onProgress(status()); emit();
      }});
    }).then(function (pipe) {
      xfPipe = pipe; engine = null; backend = "transformers"; currentModel = modelId; loading = false; loadProgress = 100;
      loadMsg = "\u0433\u043e\u0442\u043e\u0432\u043e \u00b7 WASM \u00b7 " + modelId;
      try { localStorage.setItem("aksi_webllm_model", modelId); } catch (e) {}
      if (onProgress) onProgress(status()); emit(); return status();
    });
  }
  function loadModel(modelId, onProgress) {
    if (loading) return Promise.reject(new Error("already loading"));
    loading = true; loadProgress = 0; lastError = null; loadMsg = "init\u2026"; if (onProgress) onProgress(status()); emit();
    var preferXf = modelId && String(modelId).indexOf("Xenova/") === 0;
    var chain = preferXf
      ? loadTransformers(modelId, onProgress)
      : loadWebLLM(modelId || "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", onProgress).catch(function (e) {
          lastError = String(e && e.message ? e.message : e);
          loadMsg = "WebLLM: " + lastError.slice(0, 80) + " \u2192 WASM"; if (onProgress) onProgress(status()); emit();
          loading = true;
          return loadTransformers("Xenova/LaMini-Flan-T5-248M", onProgress);
        });
    return chain.catch(function (e) {
      loading = false; lastError = String(e && e.message ? e.message : e); loadMsg = "\u043e\u0448\u0438\u0431\u043a\u0430: " + lastError.slice(0, 140);
      if (onProgress) onProgress(status()); emit(); return status();
    });
  }
  function autoLoad(opts) {
    opts = opts || {};
    if (engine || xfPipe) return Promise.resolve(status());
    if (autoPromise) return autoPromise;
    try { if (opts.force !== true && localStorage.getItem("aksi_webllm_skip") === "1") { loadMsg = "skip"; emit(); return Promise.resolve(status()); } } catch (e) {}
    var mid = opts.modelId || null;
    try { var saved = localStorage.getItem("aksi_webllm_model"); if (saved) mid = saved; } catch (e) {}
    var onP = opts.onProgress || function () {};
    autoPromise = detectWebGPU().then(function (ok) {
      if (!ok && (!mid || String(mid).indexOf("MLC") !== -1)) mid = "Xenova/LaMini-Flan-T5-248M";
      else if (!mid) mid = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
      return loadModel(mid, onP);
    });
    return autoPromise;
  }
  function unload() {
    try { if (engine && engine.unload) engine.unload(); } catch (e) {}
    engine = null; xfPipe = null; backend = null; currentModel = null; loadProgress = 0; loadMsg = "unloaded"; autoPromise = null; emit(); return status();
  }
  function complete(prompt, opts) {
    opts = opts || {};
    var system = opts.system || "\u0422\u044b \u0410\u041a\u0421\u0418. \u041e\u0442\u0432\u0435\u0447\u0430\u0439 \u043a\u0440\u0430\u0442\u043a\u043e \u0438 \u0447\u0435\u0441\u0442\u043d\u043e.";
    if (backend === "webllm" && engine) {
      return engine.chat.completions.create({
        messages: [{ role: "system", content: system }, { role: "user", content: String(prompt || "").slice(0, 6000) }],
        temperature: 0.6, max_tokens: opts.max_tokens || 512, stream: false
      }).then(function (reply) {
        var text = reply && reply.choices && reply.choices[0] && reply.choices[0].message ? String(reply.choices[0].message.content || "").trim() : "";
        return { text: text, source: "webllm", offline: true, model: currentModel, backend: backend };
      }).catch(function (e) { return { text: null, source: "webllm", error: String(e.message || e) }; });
    }
    if (backend === "transformers" && xfPipe) {
      var q = String(prompt || "").slice(0, 1500);
      var input = /T5|t5|flan|LaMini/i.test(currentModel || "") ? q : ("<|user|>\n" + q + "\n<|assistant|>\n");
      return Promise.resolve().then(function () {
        return xfPipe(input, { max_new_tokens: opts.max_tokens || 180, temperature: 0.7, do_sample: true });
      }).then(function (out) {
        var text = "";
        if (Array.isArray(out) && out[0]) text = out[0].generated_text || out[0].translation_text || "";
        text = String(text || "").replace(input, "").trim();
        if (text.indexOf(q) === 0) text = text.slice(q.length).trim();
        return { text: text, source: "transformers", offline: true, model: currentModel, backend: backend };
      }).catch(function (e) { return { text: null, source: "transformers", error: String(e.message || e) }; });
    }
    return Promise.resolve({ text: null, source: "none", error: "\u043c\u043e\u0434\u0435\u043b\u044c \u043d\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043d\u0430", offline: true });
  }
  function think(q) { return complete(q).then(function (r) { return r && r.text ? r : null; }); }
  function maybeAuto() {
    try {
      if (G.AKSI_WEBLLM_AUTO === false) return;
      var flag = G.AKSI_WEBLLM_AUTO === true;
      if (typeof document !== "undefined") {
        if (document.documentElement.getAttribute("data-aksi-autoload") === "1") flag = true;
        if (document.body && document.body.getAttribute("data-aksi-autoload") === "1") flag = true;
      }
      if (!flag) return;
      setTimeout(function () { autoLoad({ onProgress: function () { emit(); } }); }, 500);
    } catch (e) {}
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", maybeAuto);
    else maybeAuto();
  }
  G.AKSI_WEBLLM = { version: VER, status: status, load: loadModel, autoLoad: autoLoad, unload: unload, complete: complete, think: think, ask: think, models: MODELS, ready: function () { return !!(engine || xfPipe); }, loading: function () { return loading; }, backend: function () { return backend; } };
})(typeof window !== "undefined" ? window : this);
