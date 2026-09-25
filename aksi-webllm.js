/**
 * AKSI WebLLM v4.1 — stable on-device loader
 * - Small default model (less OOM / tab kill)
 * - Never unhandled rejection on load failure
 * - Progress events only; no navigation
 * Contact: aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VERSION = "4.1.0";
  var WEBLLM_VERSION = "0.2.79";
  var CDNS = [
    "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@" + WEBLLM_VERSION + "/+esm",
    "https://esm.sh/@mlc-ai/web-llm@" + WEBLLM_VERSION
  ];
  var MODELS = [
    { id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", label: "Qwen2.5 0.5B · fast · ~0.5 GB", mobile: true },
    { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", label: "Qwen2.5 1.5B · ~1.0 GB", mobile: true },
    { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", label: "Llama 3.2 1B · ~0.8 GB", mobile: true },
    { id: "Phi-3.5-mini-instruct-q4f16_1-MLC", label: "Phi 3.5 mini · ~2 GB", mobile: false }
  ];
  var DEFAULT_MODEL = MODELS[0].id;
  var SYS =
    "Ты АКСИ — локальный помощник в браузере. Отвечай кратко на языке пользователя. " +
    "Различай факт и предположение. Не выдумывай источники. Ты не сознание.";

  var engine = null;
  var currentModel = null;
  var loading = false;
  var progress = 0;
  var message = "ожидание";
  var lastError = null;
  var webgpu = null;
  var loadPromise = null;

  function status() {
    return {
      version: VERSION,
      webllm: WEBLLM_VERSION,
      ready: !!engine,
      loading: loading,
      progress: progress,
      message: message,
      model: currentModel,
      webgpu: webgpu,
      error: lastError,
      models: MODELS.slice()
    };
  }

  function emit() {
    try {
      G.dispatchEvent(new CustomEvent("aksi-webllm-progress", { detail: status() }));
    } catch (e) {}
  }

  function setProgress(p, msg) {
    progress = Math.max(0, Math.min(100, Math.round(p <= 1 ? p * 100 : p)));
    if (msg) message = String(msg).slice(0, 240);
    emit();
  }

  function detectWebGPU() {
    if (webgpu !== null) return Promise.resolve(webgpu);
    if (!G.navigator || !G.navigator.gpu) {
      webgpu = false;
      return Promise.resolve(false);
    }
    return G.navigator.gpu
      .requestAdapter()
      .then(function (a) {
        webgpu = !!a;
        return webgpu;
      })
      .catch(function () {
        webgpu = false;
        return false;
      });
  }

  function importFirst(urls, i) {
    i = i || 0;
    if (i >= urls.length) return Promise.reject(new Error("WebLLM CDN недоступен"));
    return import(urls[i]).catch(function () {
      return importFirst(urls, i + 1);
    });
  }

  function loadModel(modelId, onProgress) {
    if (engine && currentModel && (!modelId || modelId === currentModel)) {
      return Promise.resolve(status());
    }
    if (loading && loadPromise) return loadPromise;

    loading = true;
    progress = 0;
    lastError = null;
    message = "проверяю GPU…";
    emit();

    var mid = modelId || DEFAULT_MODEL;
    loadPromise = detectWebGPU()
      .then(function (gpu) {
        if (!gpu) {
          throw new Error("WebGPU недоступен. Chrome/Edge на десктопе, флаг WebGPU.");
        }
        setProgress(5, "загрузка библиотеки…");
        return importFirst(CDNS).then(function (mod) {
          var create = mod.CreateMLCEngine || (mod.default && mod.default.CreateMLCEngine);
          if (!create) throw new Error("CreateMLCEngine не найден");
          setProgress(10, "скачивание весов " + mid + "…");
          return create(mid, {
            initProgressCallback: function (info) {
              var p = 10 + (info && typeof info.progress === "number" ? info.progress * 88 : 0);
              setProgress(p, (info && info.text) || "загрузка…");
              if (typeof onProgress === "function") {
                try {
                  onProgress(status());
                } catch (e) {}
              }
            }
          });
        });
      })
      .then(function (inst) {
        engine = inst;
        currentModel = mid;
        lastError = null;
        setProgress(100, "готово · " + mid);
        try {
          G.localStorage.setItem("aksi_webllm_model", mid);
        } catch (e) {}
        try {
          G.dispatchEvent(new CustomEvent("aksi:webllm-ready", { detail: status() }));
        } catch (e2) {}
        loading = false;
        loadPromise = null;
        return status();
      })
      .catch(function (err) {
        loading = false;
        loadPromise = null;
        engine = null;
        currentModel = null;
        lastError = String((err && err.message) || err);
        message = "ошибка: " + lastError.slice(0, 180);
        progress = 0;
        emit();
        return status();
      });

    return loadPromise;
  }

  function complete(prompt, options) {
    options = options || {};
    if (!engine) {
      return Promise.resolve({ text: null, error: "модель не загружена", source: "none" });
    }
    if (loading) {
      return Promise.resolve({ text: null, error: "модель ещё загружается", source: "none" });
    }
    var system = options.system || SYS;
    return engine.chat.completions
      .create({
        messages: [
          { role: "system", content: system },
          { role: "user", content: String(prompt || "").slice(0, 4000) }
        ],
        temperature: options.temperature != null ? options.temperature : 0.4,
        max_tokens: options.max_tokens || options.maxTokens || 384
      })
      .then(function (reply) {
        var t =
          reply &&
          reply.choices &&
          reply.choices[0] &&
          reply.choices[0].message &&
          reply.choices[0].message.content;
        return {
          text: String(t || "").trim(),
          source: "webllm",
          inference_local: true,
          model: currentModel,
          backend: "webllm"
        };
      })
      .catch(function (error) {
        return {
          text: null,
          source: "webllm",
          error: String((error && error.message) || error),
          model: currentModel
        };
      });
  }

  function unload() {
    try {
      if (engine && typeof engine.unload === "function") engine.unload();
    } catch (e) {}
    engine = null;
    currentModel = null;
    loading = false;
    loadPromise = null;
    progress = 0;
    message = "выгружено";
    lastError = null;
    emit();
  }

  G.AKSI_WEBLLM = {
    version: VERSION,
    status: status,
    load: loadModel,
    autoLoad: loadModel,
    unload: unload,
    complete: complete,
    think: complete,
    ask: complete,
    models: MODELS,
    system: SYS,
    ready: function () {
      return !!engine && !loading;
    },
    loading: function () {
      return loading;
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
