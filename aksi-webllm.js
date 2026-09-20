/**
 * AKSI WebLLM v3.0 — auto-load browser LLM
 * Not AGI. Does not know everything. aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VERSION = "3.0.0";
  var WEBLLM_VERSION = "0.2.85";
  var CDNS = [
    "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@" + WEBLLM_VERSION + "/+esm",
    "https://esm.sh/@mlc-ai/web-llm@" + WEBLLM_VERSION
  ];
  var MODELS = [
    { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", label: "Qwen2.5 1.5B" },
    { id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", label: "Qwen2.5 0.5B" },
    { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", label: "Llama 3.2 1B" }
  ];
  var SYS = "Ты AKSI — локальный ассистент. Отвечай на языке пользователя. Факты отделяй от догадок. Если не знаешь — скажи. Не притворяйся, что знаешь всё.";
  var engine = null, backend = null, currentModel = null, loading = false, progress = 0, message = "ожидание", lastError = null, webgpu = null, loadPromise = null, autoStarted = false;

  function status() {
    return { version: VERSION, webllm: WEBLLM_VERSION, ready: !!engine, loading: loading, progress: progress, message: message, model: currentModel, backend: backend, webgpu: webgpu, error: lastError, models: MODELS.slice(), autoStarted: autoStarted };
  }
  function emit() { try { G.dispatchEvent(new CustomEvent("aksi-webllm-progress", { detail: status() })); } catch (e) {} }
  function setProgress(p, msg) {
    if (typeof p === "number") progress = Math.max(0, Math.min(100, Math.round(p <= 1 ? p * 100 : p)));
    if (msg) message = String(msg).slice(0, 240);
    emit();
  }
  function detectWebGPU() {
    if (webgpu !== null) return Promise.resolve(webgpu);
    if (!G.navigator || !G.navigator.gpu) { webgpu = false; return Promise.resolve(false); }
    return G.navigator.gpu.requestAdapter().then(function (a) { webgpu = !!a; return webgpu; }).catch(function () { webgpu = false; return false; });
  }
  function importFirst(urls, i) {
    i = i || 0;
    if (i >= urls.length) return Promise.reject(new Error("CDN fail"));
    return import(urls[i]).catch(function () { return importFirst(urls, i + 1); });
  }
  function loadModel(modelId, onProgress) {
    if (loading && loadPromise) return loadPromise;
    loading = true; progress = 0; lastError = null; message = "старт…"; emit();
    var mid = modelId || null;
    try { if (!mid) mid = G.localStorage.getItem("aksi_webllm_model"); } catch (e) {}
    mid = mid || MODELS[0].id;
    loadPromise = detectWebGPU().then(function (gpu) {
      if (!gpu) throw new Error("WebGPU нет — нужен Chrome/Edge с GPU");
      setProgress(8, "runtime WebLLM…");
      return importFirst(CDNS).then(function (mod) {
        var create = mod.CreateMLCEngine || (mod.default && mod.default.CreateMLCEngine);
        if (!create) throw new Error("CreateMLCEngine missing");
        setProgress(12, "модель " + mid + "…");
        return create(mid, {
          initProgressCallback: function (info) {
            var p = 12 + (info && typeof info.progress === "number" ? info.progress * 86 : 0);
            setProgress(p, (info && info.text) || "загрузка…");
            if (typeof onProgress === "function") onProgress(status());
          }
        });
      });
    }).then(function (inst) {
      engine = inst; backend = "webllm"; currentModel = mid; lastError = null;
      setProgress(100, "готово · " + mid);
      try { G.localStorage.setItem("aksi_webllm_model", mid); } catch (e) {}
      try { G.dispatchEvent(new CustomEvent("aksi:webllm-ready", { detail: status() })); } catch (e2) {}
      loading = false; loadPromise = null;
      return status();
    }).catch(function (err) {
      loading = false; loadPromise = null;
      lastError = String((err && err.message) || err);
      message = "ошибка: " + lastError.slice(0, 180);
      progress = 0; emit();
      throw err;
    });
    return loadPromise;
  }
  function autoLoad(opts) {
    opts = opts || {};
    if (engine) return Promise.resolve(status());
    try { if (G.localStorage.getItem("aksi_webllm_skip") === "1") return Promise.resolve(status()); } catch (e) {}
    autoStarted = true;
    return loadModel(opts.modelId || opts.model || null, opts.onProgress || null);
  }
  function complete(prompt, options) {
    options = options || {};
    if (!engine) return Promise.resolve({ text: null, error: "модель не загружена", source: "none" });
    var system = options.system || SYS;
    try {
      if (G.AKSI_NEURO && G.AKSI_NEURO.query) {
        var r = G.AKSI_NEURO.query(prompt);
        if (r && r.answer) system += "\n\nЛокальный SEED:\n" + String(r.answer).slice(0, 800);
      }
    } catch (e) {}
    return engine.chat.completions.create({
      messages: [
        { role: "system", content: system },
        { role: "user", content: String(prompt || "").slice(0, 6000) }
      ],
      temperature: options.temperature != null ? options.temperature : 0.35,
      max_tokens: options.max_tokens || options.maxTokens || 512
    }).then(function (reply) {
      var text = reply && reply.choices && reply.choices[0] && reply.choices[0].message && reply.choices[0].message.content;
      return { text: String(text || "").trim(), source: "webllm", inference_local: true, model: currentModel, backend: backend };
    }).catch(function (error) {
      return { text: null, source: "webllm", error: String((error && error.message) || error), model: currentModel };
    });
  }
  function unload() { engine = null; backend = null; currentModel = null; loading = false; loadPromise = null; progress = 0; message = "выгружено"; emit(); }

  G.AKSI_WEBLLM = {
    version: VERSION, status: status, load: loadModel, autoLoad: autoLoad, unload: unload,
    complete: complete, think: complete, ask: complete, models: MODELS, system: SYS,
    ready: function () { return !!engine; }, loading: function () { return loading; }, backend: function () { return backend; }
  };

  function maybeAuto() {
    try {
      var params = new URLSearchParams(G.location && G.location.search);
      var body = G.document && G.document.body;
      var want = params.get("autollm") === "1" || (body && body.getAttribute("data-aksi-autollm") === "1") || G.AKSI_AUTOLLM === true;
      if (want) autoLoad({}).catch(function () {});
    } catch (e) {}
  }
  if (G.document) {
    if (G.document.readyState === "loading") G.document.addEventListener("DOMContentLoaded", maybeAuto);
    else maybeAuto();
  }
})(typeof window !== "undefined" ? window : globalThis);
