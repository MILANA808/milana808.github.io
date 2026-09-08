/**
 * AKSI WebLLM runtime v1.9.0 — надёжная загрузка через script module
 * WebGPU (MLC) + WASM (Transformers.js) · русский · прогресс 0–100
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";

  var VERSION = "1.9.0-webllm";
  var WEBLLM_VERSION = "0.2.79";

  var CDNS_WEBLLM = [
    "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@" + WEBLLM_VERSION + "/+esm",
    "https://esm.sh/@mlc-ai/web-llm@" + WEBLLM_VERSION,
    "https://unpkg.com/@mlc-ai/web-llm@" + WEBLLM_VERSION + "/+esm"
  ];
  var CDNS_XF = [
    "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/+esm",
    "https://esm.sh/@xenova/transformers@2.17.2",
    "https://unpkg.com/@xenova/transformers@2.17.2/+esm"
  ];

  var MODELS = [
    { id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", label: "Qwen 0.5B WebGPU", backend: "webllm" },
    { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", label: "Llama 3.2 1B WebGPU", backend: "webllm" },
    { id: "Xenova/LaMini-Flan-T5-248M", label: "LaMini WASM", backend: "transformers" },
    { id: "Xenova/flan-t5-small", label: "Flan-T5 small WASM", backend: "transformers" }
  ];

  var engine = null;
  var xfPipe = null;
  var backend = null;
  var currentModel = null;
  var loading = false;
  var progress = 0;
  var message = "не загружено";
  var lastError = null;
  var webgpu = null;
  var loadPromise = null;
  var bootstrapNetworkUsed = false;

  function status() {
    return {
      version: VERSION,
      webllm: WEBLLM_VERSION,
      ready: !!(engine || xfPipe),
      loading: loading,
      progress: progress,
      message: message,
      model: currentModel,
      backend: backend,
      webgpu: webgpu,
      error: lastError,
      models: MODELS.slice(),
      inference_local: !!(engine || xfPipe),
      network_required_for_bootstrap: bootstrapNetworkUsed
    };
  }

  function emit() {
    try { G.dispatchEvent(new CustomEvent("aksi-webllm-progress", { detail: status() })); } catch (e) {}
  }

  function setProgress(p, msg) {
    if (typeof p === "number" && !isNaN(p)) {
      progress = Math.max(0, Math.min(100, Math.round(p <= 1 ? p * 100 : p)));
    }
    if (msg) message = String(msg).slice(0, 240);
    emit();
  }

  function detectWebGPU() {
    if (webgpu !== null) return Promise.resolve(webgpu);
    if (!G.navigator || !G.navigator.gpu) {
      webgpu = false;
      return Promise.resolve(false);
    }
    return G.navigator.gpu.requestAdapter().then(function (a) {
      webgpu = !!a;
      return webgpu;
    }).catch(function () {
      webgpu = false;
      return false;
    });
  }

  function importEsm(url, timeoutMs) {
    timeoutMs = timeoutMs || 60000;
    bootstrapNetworkUsed = true;
    return new Promise(function (resolve, reject) {
      var id = "aksi_esm_" + Math.random().toString(36).slice(2, 9);
      var done = false;
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        cleanup();
        reject(new Error("таймаут " + timeoutMs + "ms · " + url.replace(/^https:\/\//, "").slice(0, 50)));
      }, timeoutMs);

      function cleanup() {
        try {
          var s = document.getElementById(id);
          if (s && s.parentNode) s.parentNode.removeChild(s);
        } catch (e) {}
        try { delete G[id + "_resolve"]; delete G[id + "_reject"]; } catch (e) {}
      }

      G[id + "_resolve"] = function (m) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        cleanup();
        resolve(m);
      };
      G[id + "_reject"] = function (err) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        cleanup();
        reject(err instanceof Error ? err : new Error(String(err)));
      };

      var script = document.createElement("script");
      script.type = "module";
      script.id = id;
      script.textContent =
        "import * as mod from " + JSON.stringify(url) + ";\n" +
        "window[" + JSON.stringify(id + "_resolve") + "](mod);\n";
      script.onerror = function () {
        G[id + "_reject"](new Error("script onerror · " + url.replace(/^https:\/\//, "").slice(0, 50)));
      };
      try {
        (document.head || document.documentElement).appendChild(script);
      } catch (e) {
        clearTimeout(timer);
        done = true;
        reject(e);
      }
    });
  }

  function importNative(url, timeoutMs) {
    timeoutMs = timeoutMs || 60000;
    bootstrapNetworkUsed = true;
    return new Promise(function (resolve, reject) {
      var done = false;
      var t = setTimeout(function () {
        if (done) return;
        done = true;
        reject(new Error("таймаут import " + timeoutMs + "ms"));
      }, timeoutMs);
      import(url).then(function (m) {
        if (done) return;
        done = true;
        clearTimeout(t);
        resolve(m);
      }).catch(function (e) {
        if (done) return;
        done = true;
        clearTimeout(t);
        reject(e);
      });
    });
  }

  function importFirst(urls) {
    var last = null;
    var i = 0;
    function next() {
      if (i >= urls.length) {
        return Promise.reject(last || new Error(
          "CDN недоступен. Разрешите cdn.jsdelivr.net и esm.sh в блокировщике или проверьте сеть."
        ));
      }
      var u = urls[i++];
      setProgress(Math.min(15, 3 + i * 3), "подключение… " + u.replace(/^https:\/\//, "").slice(0, 42));
      return importEsm(u, 60000).catch(function (e1) {
        last = e1;
        return importNative(u, 45000).catch(function (e2) {
          last = e2;
          return next();
        });
      });
    }
    return next();
  }

  function extractCreateEngine(mod) {
    if (!mod) return null;
    if (typeof mod.CreateMLCEngine === "function") return mod.CreateMLCEngine;
    if (mod.default && typeof mod.default.CreateMLCEngine === "function") return mod.default.CreateMLCEngine;
    return null;
  }

  function extractPipeline(mod) {
    if (!mod) return null;
    if (typeof mod.pipeline === "function") return mod.pipeline;
    if (mod.default && typeof mod.default.pipeline === "function") return mod.default.pipeline;
    return null;
  }

  function loadWebLLM(modelId, onProgress) {
    modelId = modelId || MODELS[0].id;
    if (/Xenova\//i.test(modelId)) modelId = MODELS[0].id;
    setProgress(5, "проверка WebGPU…");
    return detectWebGPU().then(function (ok) {
      if (!ok) throw new Error("WebGPU нет — нажмите «Только WASM»");
      setProgress(8, "загрузка runtime WebLLM (~6 МБ)…");
      return importFirst(CDNS_WEBLLM);
    }).then(function (mod) {
      var createEngine = extractCreateEngine(mod);
      if (typeof createEngine !== "function") throw new Error("CreateMLCEngine не найден");
      setProgress(12, "скачивание модели " + modelId + " (первый раз 2–10 мин)…");
      return createEngine(modelId, {
        initProgressCallback: function (info) {
          var p = 12;
          if (info && typeof info.progress === "number") {
            p = 12 + Math.max(0, Math.min(1, info.progress)) * 85;
          }
          var msg = (info && info.text) ? String(info.text).slice(0, 180) : "загрузка весов…";
          setProgress(p, msg);
          if (typeof onProgress === "function") onProgress(status());
        }
      });
    }).then(function (instance) {
      engine = instance;
      xfPipe = null;
      backend = "webllm";
      currentModel = modelId;
      lastError = null;
      setProgress(100, "готово · WebLLM · " + modelId);
      try { G.localStorage.setItem("aksi_webllm_model", modelId); } catch (e) {}
      try { G.dispatchEvent(new CustomEvent("aksi:webllm-ready", { detail: status() })); } catch (e) {}
      if (typeof onProgress === "function") onProgress(status());
      return status();
    });
  }

  function loadTransformers(modelId, onProgress) {
    modelId = modelId || "Xenova/LaMini-Flan-T5-248M";
    setProgress(5, "загрузка Transformers.js (WASM)…");
    return importFirst(CDNS_XF).then(function (mod) {
      var pipeline = extractPipeline(mod);
      if (typeof pipeline !== "function") throw new Error("pipeline не найден");
      try {
        var env = mod.env || (mod.default && mod.default.env);
        if (env) {
          env.allowLocalModels = false;
          env.useBrowserCache = true;
          env.allowRemoteModels = true;
        }
      } catch (e) {}
      setProgress(15, "скачивание модели " + modelId + "…");
      var task = /T5|flan|LaMini/i.test(modelId) ? "text2text-generation" : "text-generation";
      return pipeline(task, modelId, {
        progress_callback: function (info) {
          var p = 15;
          if (info && typeof info.progress === "number") {
            var pr = info.progress;
            if (pr > 1) pr = pr / 100;
            p = 15 + Math.max(0, Math.min(1, pr)) * 80;
          }
          var msg = (info && info.status) ? String(info.status) : "загрузка WASM…";
          if (info && info.file) msg += " · " + String(info.file).slice(-36);
          setProgress(p, msg);
          if (typeof onProgress === "function") onProgress(status());
        }
      });
    }).then(function (pipe) {
      xfPipe = pipe;
      engine = null;
      backend = "transformers";
      currentModel = modelId;
      lastError = null;
      setProgress(100, "готово · WASM · " + modelId);
      try { G.localStorage.setItem("aksi_webllm_model", modelId); } catch (e) {}
      try { G.dispatchEvent(new CustomEvent("aksi:webllm-ready", { detail: status() })); } catch (e) {}
      if (typeof onProgress === "function") onProgress(status());
      return status();
    });
  }

  function loadModel(modelId, onProgress, opts) {
    opts = opts || {};
    if (typeof modelId === "object" && modelId !== null && !Array.isArray(modelId)) {
      opts = modelId;
      modelId = opts.model || opts.modelId || null;
      onProgress = opts.onProgress || onProgress;
    }
    if (typeof onProgress === "object" && onProgress !== null && onProgress.forceWasm != null) {
      opts = onProgress;
      onProgress = opts.onProgress || null;
    }
    if (loading && loadPromise) return loadPromise;

    loading = true;
    progress = 0;
    lastError = null;
    bootstrapNetworkUsed = false;
    message = "старт…";
    emit();
    if (typeof onProgress === "function") onProgress(status());

    var preferred = modelId || null;
    try { if (!preferred) preferred = G.localStorage.getItem("aksi_webllm_model"); } catch (e) {}

    var forceWasm = !!(opts && opts.forceWasm) ||
      (preferred && /Xenova|transformers|flan|LaMini/i.test(preferred));

    loadPromise = detectWebGPU().then(function (gpu) {
      if (forceWasm || !gpu) {
        setProgress(3, forceWasm ? "WASM (принудительно)" : "нет WebGPU → WASM");
        return loadTransformers(
          preferred && /Xenova|flan|LaMini/i.test(preferred) ? preferred : "Xenova/LaMini-Flan-T5-248M",
          onProgress
        );
      }
      setProgress(3, "WebGPU → WebLLM");
      return loadWebLLM(preferred || MODELS[0].id, onProgress).catch(function (err) {
        var first = String((err && err.message) || err);
        lastError = first;
        setProgress(progress || 15, "WebLLM сбой → WASM: " + first.slice(0, 80));
        return loadTransformers("Xenova/LaMini-Flan-T5-248M", onProgress).catch(function (e2) {
          lastError = first + " | WASM: " + String((e2 && e2.message) || e2);
          throw new Error(lastError);
        });
      });
    }).then(function (st) {
      loading = false;
      loadPromise = null;
      return st;
    }).catch(function (error) {
      loading = false;
      loadPromise = null;
      lastError = lastError || String((error && error.message) || error);
      message = "ошибка: " + lastError.slice(0, 200);
      progress = 0;
      emit();
      if (typeof onProgress === "function") onProgress(status());
      throw error;
    });

    return loadPromise;
  }

  function autoLoad(options) {
    options = options || {};
    if (engine || xfPipe) return Promise.resolve(status());
    try {
      if (G.localStorage.getItem("aksi_webllm_skip") === "1") return Promise.resolve(status());
    } catch (e) {}
    return loadModel(options.modelId || options.model || null, options.onProgress || null, options);
  }

  function unload() {
    engine = null;
    xfPipe = null;
    backend = null;
    currentModel = null;
    loading = false;
    loadPromise = null;
    progress = 0;
    lastError = null;
    message = "выгружено";
    try { G.localStorage.removeItem("aksi_webllm_model"); } catch (e) {}
    emit();
  }

  function complete(prompt, options) {
    options = options || {};
    var system = options.system ||
      "Ты — АКСИ, локальный ИИ-ассистент. Всегда отвечай на русском языке, ясно и по делу. Не выдумывай факты.";
    var temperature = options.temperature != null ? options.temperature : 0.55;
    var maxTokens = options.max_tokens || options.maxTokens || 512;

    if (backend === "webllm" && engine) {
      return engine.chat.completions.create({
        messages: [
          { role: "system", content: system },
          { role: "user", content: String(prompt || "").slice(0, 6000) }
        ],
        temperature: temperature,
        max_tokens: maxTokens,
        stream: false
      }).then(function (reply) {
        var text = reply && reply.choices && reply.choices[0] && reply.choices[0].message
          ? String(reply.choices[0].message.content || "").trim() : "";
        if (!text) throw new Error("WebLLM вернул пустой ответ");
        return { text: text, source: "webllm", inference_local: true, model: currentModel, backend: backend };
      }).catch(function (error) {
        return { text: null, source: "webllm", error: String((error && error.message) || error), model: currentModel, backend: backend };
      });
    }

    if (backend === "transformers" && xfPipe) {
      var q = String(prompt || "").slice(0, 1500);
      var isT5 = /T5|flan|LaMini/i.test(currentModel || "");
      var input = isT5 ? ("Ответь полностью на русском языке.\nВопрос: " + q) : q;
      return Promise.resolve().then(function () {
        return xfPipe(input, {
          max_new_tokens: Math.min(320, maxTokens),
          temperature: temperature,
          do_sample: temperature > 0.05
        });
      }).then(function (output) {
        var text = "";
        if (Array.isArray(output) && output[0]) {
          text = output[0].generated_text || output[0].translation_text || "";
        } else if (typeof output === "string") text = output;
        text = String(text || "").replace(input, "").trim();
        if (text.indexOf(q) === 0) text = text.slice(q.length).trim();
        if (!text) throw new Error("WASM-модель вернула пустой ответ");
        return { text: text, source: "transformers", inference_local: true, model: currentModel, backend: backend };
      }).catch(function (error) {
        return { text: null, source: "transformers", error: String((error && error.message) || error), model: currentModel, backend: backend };
      });
    }

    return Promise.resolve({
      text: null,
      source: "none",
      error: "модель не загружена — нажмите «Только WASM» (рекомендуется) или «Загрузить WebLLM»",
      inference_local: false,
      model: currentModel,
      backend: backend
    });
  }

  G.AKSI_WEBLLM = {
    version: VERSION,
    status: status,
    load: loadModel,
    autoLoad: autoLoad,
    unload: unload,
    complete: complete,
    think: complete,
    ask: complete,
    models: MODELS,
    ready: function () { return !!(engine || xfPipe); },
    loading: function () { return loading; },
    backend: function () { return backend; }
  };
})(typeof window !== "undefined" ? window : globalThis);
