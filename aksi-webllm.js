/**
 * AKSI-WebLLM v1.5 — auto-load + WebGPU WebLLM + WASM Transformers fallback
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.5.0-webllm";
  var WEBLLM_VERSION = "0.2.84";
  var CDNS = [
    "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@" + WEBLLM_VERSION + "/+esm",
    "https://esm.sh/@mlc-ai/web-llm@" + WEBLLM_VERSION
  ];
  var XF_CDNS = [
    "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/+esm",
    "https://esm.sh/@xenova/transformers@2.17.2"
  ];
  var engine = null, backend = null, xfPipe = null;
  var loading = false, loadProgress = 0, loadMsg = "", currentModel = null, lastError = null, webgpuOk = null;
  var autoPromise = null;
  var MODELS = [
    { id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", label: "Qwen 0.5B WebGPU", backend: "webllm" },
    { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", label: "Qwen 1.5B WebGPU", backend: "webllm" },
    { id: "Xenova/LaMini-Flan-T5-248M", label: "LaMini WASM (быстрый)", backend: "transformers" },
    { id: "Xenova/flan-t5-small", label: "Flan-T5 small WASM", backend: "transformers" },
    { id: "Xenova/Qwen1.5-0.5B-Chat", label: "Qwen1.5 WASM", backend: "transformers" }
  ];

  function status() {
    return {
      version: VER,
      webllm: WEBLLM_VERSION,
      ready: !!(engine || xfPipe),
      loading: loading,
      progress: loadProgress,
      message: loadMsg,
      model: currentModel,
      backend: backend,
      webgpu: webgpuOk,
      error: lastError,
      models: MODELS.slice()
    };
  }
  function emit(s) {
    try { window.dispatchEvent(new CustomEvent("aksi-webllm-progress", { detail: s || status() })); } catch (e) {}
  }
  function detectWebGPU() {
    if (webgpuOk !== null) return Promise.resolve(webgpuOk);
    if (typeof navigator === "undefined" || !navigator.gpu) {
      webgpuOk = false;
      return Promise.resolve(false);
    }
    return navigator.gpu.requestAdapter()
      .then(function (a) { webgpuOk = !!a; return webgpuOk; })
      .catch(function () { webgpuOk = false; return false; });
  }
  function importFirst(urls) {
    var i = 0;
    function next() {
      if (i >= urls.length) return Promise.reject(new Error("CDN недоступен"));
      var u = urls[i++];
      loadMsg = "import " + u.replace(/^https:\/\//, "").slice(0, 48);
      emit();
      return import(u).catch(function () { return next(); });
    }
    return next();
  }

  function loadWebLLM(modelId, onProgress) {
    modelId = modelId || "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
    loadMsg = "проверка WebGPU…";
    if (onProgress) onProgress(status());
    emit();
    return detectWebGPU().then(function (ok) {
      if (!ok) throw new Error("WebGPU нет → WASM");
      loadMsg = "runtime WebLLM…";
      if (onProgress) onProgress(status());
      emit();
      return importFirst(CDNS);
    }).then(function (webllm) {
      var CreateMLCEngine = webllm.CreateMLCEngine || (webllm.default && webllm.default.CreateMLCEngine);
      if (!CreateMLCEngine) throw new Error("CreateMLCEngine missing");
      loadMsg = "скачивание весов (первый раз дольше)…";
      if (onProgress) onProgress(status());
      emit();
      return CreateMLCEngine(modelId, {
        initProgressCallback: function (report) {
          if (report && typeof report.progress === "number") {
            loadProgress = Math.max(0, Math.min(100, Math.round(report.progress * 100)));
          }
          if (report && report.text) loadMsg = String(report.text).slice(0, 180);
          if (onProgress) onProgress(status());
          emit();
        }
      });
    }).then(function (eng) {
      engine = eng;
      xfPipe = null;
      backend = "webllm";
      currentModel = modelId;
      loading = false;
      loadProgress = 100;
      lastError = null;
      loadMsg = "готово · WebLLM · " + modelId;
      try { localStorage.setItem("aksi_webllm_model", modelId); } catch (e) {}
      if (onProgress) onProgress(status());
      emit();
      return status();
    });
  }

  function loadTransformers(modelId, onProgress) {
    modelId = modelId || "Xenova/LaMini-Flan-T5-248M";
    loadMsg = "WASM Transformers.js…";
    loadProgress = 5;
    if (onProgress) onProgress(status());
    emit();
    return importFirst(XF_CDNS).then(function (mod) {
      var pipeline = mod.pipeline || (mod.default && mod.default.pipeline);
      if (!pipeline) throw new Error("pipeline missing");
      try {
        if (mod.env) {
          mod.env.allowLocalModels = false;
          mod.env.useBrowserCache = true;
        }
      } catch (e) {}
      loadMsg = "модель " + modelId;
      loadProgress = 20;
      if (onProgress) onProgress(status());
      emit();
      var task = /T5|t5|flan|LaMini/i.test(modelId) ? "text2text-generation" : "text-generation";
      return pipeline(task, modelId, {
        progress_callback: function (p) {
          if (p && typeof p.progress === "number") {
            loadProgress = Math.max(20, Math.min(95, Math.round(20 + p.progress * 75)));
          }
          if (p && p.status) loadMsg = String(p.status) + (p.file ? " · " + String(p.file).slice(-24) : "");
          if (onProgress) onProgress(status());
          emit();
        }
      });
    }).then(function (pipe) {
      xfPipe = pipe;
      engine = null;
      backend = "transformers";
      currentModel = modelId;
      loading = false;
      loadProgress = 100;
      lastError = null;
      loadMsg = "готово · WASM · " + modelId;
      try { localStorage.setItem("aksi_webllm_model", modelId); } catch (e) {}
      if (onProgress) onProgress(status());
      emit();
      return status();
    });
  }

  function loadModel(modelId, onProgress) {
    if (loading) return autoPromise || Promise.resolve(status());
    loading = true;
    lastError = null;
    loadProgress = 0;
    var prefer = modelId || null;
    try {
      if (!prefer) prefer = localStorage.getItem("aksi_webllm_model") || "";
    } catch (e) {}

    function doneOk(s) {
      loading = false;
      return s;
    }
    function fail(e) {
      loading = false;
      lastError = String(e && e.message ? e.message : e);
      loadMsg = "ошибка: " + lastError;
      emit();
      if (onProgress) onProgress(status());
      return Promise.reject(e);
    }

    return detectWebGPU().then(function (gpu) {
      var isXf = prefer && /Xenova|transformers/i.test(prefer);
      if (gpu && !isXf) {
        loadMsg = "WebGPU найден → WebLLM";
        emit();
        return loadWebLLM(prefer || "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", onProgress).catch(function (e) {
          loadMsg = "WebLLM сбой → WASM: " + (e && e.message ? e.message : e);
          lastError = String(e && e.message ? e.message : e);
          emit();
          return loadTransformers("Xenova/LaMini-Flan-T5-248M", onProgress);
        });
      }
      loadMsg = gpu ? "WASM по выбору…" : "нет WebGPU → WASM Transformers";
      emit();
      return loadTransformers(
        isXf ? prefer : "Xenova/LaMini-Flan-T5-248M",
        onProgress
      );
    }).then(doneOk, fail);
  }

  function autoLoad(opts) {
    opts = opts || {};
    if (engine || xfPipe) return Promise.resolve(status());
    if (autoPromise) return autoPromise;
    try {
      if (localStorage.getItem("aksi_webllm_skip") === "1") {
        loadMsg = "автозагрузка отключена (aksi_webllm_skip)";
        emit();
        return Promise.resolve(status());
      }
    } catch (e) {}
    var onP = opts.onProgress || function () {};
    autoPromise = loadModel(opts.modelId || null, onP).then(function (s) {
      autoPromise = null;
      return s;
    }).catch(function (e) {
      autoPromise = null;
      return status();
    });
    return autoPromise;
  }

  function unload() {
    engine = null;
    xfPipe = null;
    backend = null;
    currentModel = null;
    loadMsg = "выгружено";
    loadProgress = 0;
    emit();
  }

  function complete(prompt, opts) {
    opts = opts || {};
    var system = opts.system || "Ты АКСИ — локальный ИИ. Отвечай кратко по-русски.";
    var temp = opts.temperature != null ? opts.temperature : 0.6;
    var maxTok = opts.max_tokens || 256;
    if (backend === "webllm" && engine) {
      return engine.chat.completions.create({
        messages: [
          { role: "system", content: system },
          { role: "user", content: String(prompt || "").slice(0, 6000) }
        ],
        temperature: temp,
        max_tokens: maxTok,
        stream: false
      }).then(function (reply) {
        var text = reply && reply.choices && reply.choices[0] && reply.choices[0].message
          ? String(reply.choices[0].message.content || "").trim()
          : "";
        return { text: text, source: "webllm", offline: true, model: currentModel, backend: backend };
      }).catch(function (e) {
        return { text: null, source: "webllm", error: String(e.message || e) };
      });
    }
    if (backend === "transformers" && xfPipe) {
      var q = String(prompt || "").slice(0, 1500);
      var isT5 = /T5|t5|flan|LaMini/i.test(currentModel || "");
      var input = isT5 ? q : ("<|user|>\n" + q + "\n<|assistant|>\n");
      return Promise.resolve()
        .then(function () {
          return xfPipe(input, {
            max_new_tokens: maxTok > 200 ? 200 : maxTok,
            temperature: temp,
            do_sample: temp > 0.05
          });
        })
        .then(function (out) {
          var text = "";
          if (Array.isArray(out) && out[0]) {
            text = out[0].generated_text || out[0].translation_text || "";
          } else if (typeof out === "string") text = out;
          text = String(text || "").replace(input, "").trim();
          if (text.indexOf(q) === 0) text = text.slice(q.length).trim();
          return { text: text, source: "transformers", offline: true, model: currentModel, backend: backend };
        })
        .catch(function (e) {
          return { text: null, source: "transformers", error: String(e.message || e) };
        });
    }
    return Promise.resolve({
      text: null,
      source: "none",
      error: "модель не загружена — вызовите AKSI_WEBLLM.load()",
      offline: true
    });
  }

  function think(q) {
    return complete(q).then(function (r) { return r && r.text ? r : null; });
  }

  function shouldAuto() {
    try {
      if (G.AKSI_WEBLLM_AUTO === false) return false;
      if (G.AKSI_WEBLLM_AUTO === true) return true;
      if (typeof document === "undefined") return false;
      if (document.documentElement.getAttribute("data-aksi-autoload") === "1") return true;
      if (document.body && document.body.getAttribute("data-aksi-autoload") === "1") return true;
      var path = (location && location.pathname) || "";
      if (/superpose|matrix|local-ai|\/ai\/?/i.test(path)) return true;
    } catch (e) {}
    return false;
  }

  function maybeAuto() {
    try {
      if (!shouldAuto()) return;
      setTimeout(function () {
        autoLoad({ onProgress: function () { emit(); } });
      }, 400);
    } catch (e) {}
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", maybeAuto);
    else maybeAuto();
  }

  G.AKSI_WEBLLM = {
    version: VER,
    status: status,
    load: loadModel,
    autoLoad: autoLoad,
    unload: unload,
    complete: complete,
    think: think,
    ask: think,
    models: MODELS,
    ready: function () { return !!(engine || xfPipe); },
    loading: function () { return loading; },
    backend: function () { return backend; }
  };
})(typeof window !== "undefined" ? window : this);
