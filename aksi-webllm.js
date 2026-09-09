/**
 * AKSI WebLLM runtime v2.0.0-ru — Russian-first
 * WebGPU (MLC Qwen) + WASM fallback · language retry
 * © AKSI · aksilove@internet.ru
 *
 * Note: browser WebLLM cannot be fine-tuned here. Quality = model choice + prompts + params.
 */
(function (G) {
  "use strict";

  var VERSION = "2.0.0-ru";
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
    { id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", label: "Qwen 0.5B RU (рекомендуется)", backend: "webllm" },
    { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", label: "Qwen 1.5B RU (если хватает VRAM)", backend: "webllm" },
    { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", label: "Llama 3.2 1B (слабее по-русски)", backend: "webllm" },
    { id: "Xenova/LaMini-Flan-T5-248M", label: "LaMini WASM (fallback)", backend: "transformers" }
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
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(new Error("timeout " + url)); }, timeoutMs);
      import(url).then(function (m) {
        clearTimeout(t);
        bootstrapNetworkUsed = true;
        resolve(m);
      }).catch(function (e) {
        clearTimeout(t);
        reject(e);
      });
    });
  }

  function importNative(url, timeoutMs) {
    timeoutMs = timeoutMs || 45000;
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(new Error("timeout script " + url)); }, timeoutMs);
      var s = document.createElement("script");
      s.type = "module";
      s.src = url;
      s.onload = function () {
        clearTimeout(t);
        bootstrapNetworkUsed = true;
        reject(new Error("native module load does not expose exports — use ESM import"));
      };
      s.onerror = function () {
        clearTimeout(t);
        reject(new Error("script error " + url));
      };
      document.head.appendChild(s);
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
      loading = false;
      setProgress(100, "готово · " + modelId);
      return status();
    });
  }

  function loadTransformers(modelId, onProgress) {
    modelId = modelId || "Xenova/LaMini-Flan-T5-248M";
    setProgress(5, "загрузка Transformers.js…");
    return importFirst(CDNS_XF).then(function (mod) {
      var pipeline = extractPipeline(mod);
      if (typeof pipeline !== "function") throw new Error("pipeline не найден");
      setProgress(20, "скачивание WASM-модели…");
      var task = /T5|flan|LaMini/i.test(modelId) ? "text2text-generation" : "text-generation";
      return pipeline(task, modelId, {
        progress_callback: function (info) {
          if (info && typeof info.progress === "number") {
            setProgress(20 + info.progress * 75, info.status || "загрузка…");
          }
          if (typeof onProgress === "function") onProgress(status());
        }
      });
    }).then(function (pipe) {
      xfPipe = pipe;
      engine = null;
      backend = "transformers";
      currentModel = modelId;
      lastError = null;
      loading = false;
      setProgress(100, "WASM готов · " + modelId);
      return status();
    });
  }

  function loadModel(modelId, onProgress, opts) {
    opts = opts || {};
    if (loading && loadPromise) return loadPromise;
    loading = true;
    lastError = null;
    setProgress(1, "старт…");
    var forceWasm = !!(opts.forceWasm);
    var id = modelId || (forceWasm ? "Xenova/LaMini-Flan-T5-248M" : MODELS[0].id);
    var isXf = forceWasm || /Xenova\//i.test(id);
    loadPromise = (isXf ? loadTransformers(id, onProgress) : loadWebLLM(id, onProgress))
      .catch(function (e) {
        lastError = String((e && e.message) || e);
        loading = false;
        setProgress(progress, "ошибка: " + lastError.slice(0, 120));
        if (!isXf) {
          setProgress(5, "WebGPU/MLC не вышло — пробуем WASM…");
          return loadTransformers("Xenova/LaMini-Flan-T5-248M", onProgress);
        }
        throw e;
      })
      .finally(function () {
        loading = false;
        loadPromise = null;
      });
    return loadPromise;
  }

  function autoLoad(onProgress) {
    return detectWebGPU().then(function (ok) {
      if (ok) return loadModel(MODELS[0].id, onProgress);
      return loadModel("Xenova/LaMini-Flan-T5-248M", onProgress, { forceWasm: true });
    });
  }

  function unload() {
    engine = null;
    xfPipe = null;
    backend = null;
    currentModel = null;
    progress = 0;
    message = "выгружено";
    lastError = null;
    emit();
  }

  var RU_SYSTEM =
    "Ты — АКСИ, локальный русскоязычный ассистент Decision Integrity.\n" +
    "Правила:\n" +
    "1) Отвечай ТОЛЬКО на русском языке. Никогда не переключайся на английский.\n" +
    "2) Пиши ясно, по делу, полными предложениями.\n" +
    "3) Не выдумывай факты. Если не уверен — скажи честно.\n" +
    "4) Без «As an AI…». Без лишнего английского.\n" +
    "5) Если вопрос на русском — ответ тоже на русском.";

  function looksMostlyEnglish(text) {
    text = String(text || "");
    if (text.length < 12) return false;
    var cyr = (text.match(/[А-Яа-яЁё]/g) || []).length;
    var lat = (text.match(/[A-Za-z]/g) || []).length;
    if (lat < 20) return false;
    return lat > cyr * 2.2;
  }

  function forceRuUser(prompt) {
    prompt = String(prompt || "").trim();
    if (!prompt) return prompt;
    if (!/ответь на русском/i.test(prompt)) {
      return "Ответь на русском языке.\n\n" + prompt;
    }
    return prompt;
  }

  function complete(prompt, options) {
    options = options || {};
    var system = options.system || RU_SYSTEM;
    var maxTokens = options.max_tokens || options.maxTokens || 480;
    var temperature = options.temperature != null ? options.temperature : 0.35;
    var userMsg = forceRuUser(prompt);

    function runChat(sys, user, temp) {
      return engine.chat.completions.create({
        messages: [
          { role: "system", content: sys },
          { role: "user", content: String(user || "").slice(0, 6000) }
        ],
        temperature: temp,
        max_tokens: maxTokens,
        stream: false
      }).then(function (reply) {
        var text = reply && reply.choices && reply.choices[0] && reply.choices[0].message
          ? String(reply.choices[0].message.content || "").trim() : "";
        if (!text) throw new Error("WebLLM вернул пустой ответ");
        return text;
      });
    }

    if (backend === "webllm" && engine) {
      return runChat(system, userMsg, temperature).then(function (text) {
        if (looksMostlyEnglish(text)) {
          var strict =
            system +
            "\n\nСтоп. Предыдущий ответ был на английском — это ошибка. " +
            "Перепиши ответ полностью по-русски. Только русский.";
          return runChat(strict, userMsg + "\n\n(Повтори ответ строго по-русски.)", 0.2).then(function (t2) {
            if (t2) text = t2;
            return {
              text: text,
              source: "webllm",
              inference_local: true,
              model: currentModel,
              backend: backend,
              language_retry: true
            };
          }).catch(function () {
            return { text: text, source: "webllm", inference_local: true, model: currentModel, backend: backend, language_warn: true };
          });
        }
        return { text: text, source: "webllm", inference_local: true, model: currentModel, backend: backend };
      }).catch(function (error) {
        return { text: null, source: "webllm", error: String((error && error.message) || error), model: currentModel, backend: backend };
      });
    }

    if (backend === "transformers" && xfPipe) {
      var q = String(prompt || "").slice(0, 1500);
      var input = "Ответь полностью на русском языке, без английских фраз.\nВопрос: " + q;
      return Promise.resolve().then(function () {
        return xfPipe(input, {
          max_new_tokens: Math.min(280, maxTokens),
          temperature: Math.min(0.5, temperature),
          do_sample: temperature > 0.05
        });
      }).then(function (output) {
        var text = "";
        if (Array.isArray(output) && output[0]) {
          text = output[0].generated_text || output[0].translation_text || "";
        } else if (typeof output === "string") text = output;
        text = String(text || "").replace(input, "").trim();
        if (text.indexOf(q) === 0) text = text.slice(q.length).trim();
        text = text.replace(/^(Answer:|Response:)\s*/i, "").trim();
        if (!text) throw new Error("WASM-модель вернула пустой ответ");
        return { text: text, source: "transformers", inference_local: true, model: currentModel, backend: backend };
      }).catch(function (error) {
        return { text: null, source: "transformers", error: String((error && error.message) || error), model: currentModel, backend: backend };
      });
    }

    return Promise.resolve({
      text: null,
      source: "none",
      error: "модель не загружена — выберите Qwen 0.5B (WebGPU) или WASM fallback",
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
