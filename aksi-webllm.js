/**
 * AKSI WebLLM v4.2 — mobile-first + local adaptation
 * iPhone/Android: 0.5B only; no WebGPU → clear fallback message
 * adapt() = system+memory (NOT weight fine-tune)
 * aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VERSION = "4.2.0";
  var WEBLLM_VERSION = "0.2.79";
  var CDNS = [
    "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@" + WEBLLM_VERSION + "/+esm",
    "https://esm.sh/@mlc-ai/web-llm@" + WEBLLM_VERSION
  ];
  var MODELS_DESKTOP = [
    { id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", label: "Qwen2.5 0.5B · mobile-safe", mobile: true, mb: 500 },
    { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", label: "Llama 3.2 1B", mobile: true, mb: 800 },
    { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", label: "Qwen2.5 1.5B · desktop", mobile: false, mb: 1000 },
    { id: "Phi-3.5-mini-instruct-q4f16_1-MLC", label: "Phi 3.5 mini · heavy", mobile: false, mb: 2000 }
  ];
  var BASE_SYS =
    "Ты АКСИ — локальный помощник на устройстве пользователя. " +
    "Отвечай кратко на языке пользователя. Различай факт и предположение. " +
    "Не выдумывай источники. Не утверждай, что ты AGI или сознание. " +
    "Если данных мало — скажи об этом. Технология служит человеку.";

  var engine = null, currentModel = null, loading = false, progress = 0;
  var message = "ожидание", lastError = null, webgpu = null, loadPromise = null, adaptedHint = "";

  function isMobile() {
    try {
      var ua = (G.navigator && G.navigator.userAgent) || "";
      return /iPhone|iPad|iPod|Android|Mobile/i.test(ua) ||
        (G.navigator && G.navigator.maxTouchPoints > 1 && G.screen && G.screen.width < 900);
    } catch (e) { return false; }
  }
  function isIOS() {
    try { return /iPhone|iPad|iPod/i.test((G.navigator && G.navigator.userAgent) || ""); }
    catch (e) { return false; }
  }
  function modelsForDevice() {
    if (isMobile()) return MODELS_DESKTOP.filter(function (m) { return m.mobile; });
    return MODELS_DESKTOP.slice();
  }
  function defaultModel() { return modelsForDevice()[0].id; }

  function status() {
    return {
      version: VERSION, webllm: WEBLLM_VERSION, ready: !!engine && !loading, loading: loading,
      progress: progress, message: message, model: currentModel, webgpu: webgpu, error: lastError,
      mobile: isMobile(), ios: isIOS(), adapted: !!adaptedHint, models: modelsForDevice(),
      note: isIOS() ? "iOS: WebGPU есть не на всех Safari. Без GPU — Neuro/seed." : null
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
  function buildSystem(extra) {
    var sys = BASE_SYS;
    if (adaptedHint) sys += "\n\nАдаптация АКСИ:\n" + adaptedHint.slice(0, 2500);
    if (extra) sys += "\n" + String(extra).slice(0, 1500);
    return sys;
  }
  function adapt(facts) {
    var list = Array.isArray(facts) ? facts : [facts];
    var lines = list.map(function (f) {
      return typeof f === "string" ? f : f && (f.text || f.t);
    }).filter(Boolean).map(function (s) { return "• " + String(s).slice(0, 300); });
    adaptedHint = (adaptedHint ? adaptedHint + "\n" : "") + lines.join("\n");
    adaptedHint = adaptedHint.slice(-4000);
    try { G.localStorage.setItem("aksi_webllm_adapt", adaptedHint); } catch (e) {}
    return { ok: true, mode: "prompt+memory", chars: adaptedHint.length, note: "не fine-tune весов" };
  }
  try { adaptedHint = G.localStorage.getItem("aksi_webllm_adapt") || ""; } catch (e) { adaptedHint = ""; }

  function loadModel(modelId, onProgress) {
    if (engine && currentModel && (!modelId || modelId === currentModel)) return Promise.resolve(status());
    if (loading && loadPromise) return loadPromise;
    loading = true; progress = 0; lastError = null; message = "проверяю GPU…"; emit();
    var mid = modelId || defaultModel();
    if (isMobile()) {
      var allowed = modelsForDevice().map(function (m) { return m.id; });
      if (allowed.indexOf(mid) < 0) mid = defaultModel();
    }
    loadPromise = detectWebGPU().then(function (gpu) {
      if (!gpu) {
        throw new Error(isIOS()
          ? "На этом iPhone/iPad WebGPU недоступен. Chat работает через Neuro/seed без WebLLM."
          : "WebGPU недоступен. Chrome/Edge с WebGPU или локальный режим без LLM.");
      }
      setProgress(5, "библиотека…");
      return importFirst(CDNS).then(function (mod) {
        var create = mod.CreateMLCEngine || (mod.default && mod.default.CreateMLCEngine);
        if (!create) throw new Error("CreateMLCEngine не найден");
        setProgress(8, "скачивание " + mid + "…");
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
      try { G.dispatchEvent(new CustomEvent("aksi:webllm-ready", { detail: status() })); } catch (e2) {}
      loading = false; loadPromise = null; return status();
    }).catch(function (err) {
      loading = false; loadPromise = null; engine = null; currentModel = null;
      lastError = String((err && err.message) || err);
      message = "ошибка: " + lastError.slice(0, 200); progress = 0; emit();
      return status();
    });
    return loadPromise;
  }

  function memorySnippet() {
    var parts = [];
    try {
      var raw = G.localStorage.getItem("aksi_prod_mem") || G.localStorage.getItem("aksi_mem_v2") || "[]";
      var arr = JSON.parse(raw);
      if (Array.isArray(arr)) arr.slice(-12).forEach(function (x) {
        var t = typeof x === "string" ? x : x && (x.t || x.text);
        if (t) parts.push(String(t).slice(0, 200));
      });
    } catch (e) {}
    return parts.join("\n");
  }
  function neuroSnippet(prompt) {
    try {
      if (G.AKSI_NEURO && typeof G.AKSI_NEURO.query === "function") {
        var r = G.AKSI_NEURO.query(prompt);
        if (r && (r.answer || r.text)) return String(r.answer || r.text).slice(0, 800);
      }
    } catch (e) {}
    return "";
  }

  function complete(prompt, options) {
    options = options || {};
    if (!engine) return Promise.resolve({ text: null, error: "модель не загружена", source: "none", mobile: isMobile() });
    if (loading) return Promise.resolve({ text: null, error: "модель ещё загружается", source: "none" });
    var system = buildSystem(options.system);
    var mem = memorySnippet();
    if (mem) system += "\n\nПамять пользователя:\n" + mem.slice(0, 2000);
    var seed = neuroSnippet(prompt);
    if (seed) system += "\n\nЛокальный SEED:\n" + seed;
    var maxTok = options.max_tokens || options.maxTokens || (isMobile() ? 256 : 384);
    return engine.chat.completions.create({
      messages: [
        { role: "system", content: system },
        { role: "user", content: String(prompt || "").slice(0, isMobile() ? 2500 : 4000) }
      ],
      temperature: options.temperature != null ? options.temperature : 0.4,
      max_tokens: maxTok
    }).then(function (reply) {
      var t = reply && reply.choices && reply.choices[0] && reply.choices[0].message && reply.choices[0].message.content;
      return { text: String(t || "").trim(), source: "webllm", inference_local: true, model: currentModel, adapted: !!adaptedHint, backend: "webllm" };
    }).catch(function (error) {
      return { text: null, source: "webllm", error: String((error && error.message) || error), model: currentModel };
    });
  }

  function unload() {
    try { if (engine && typeof engine.unload === "function") engine.unload(); } catch (e) {}
    engine = null; currentModel = null; loading = false; loadPromise = null;
    progress = 0; message = "выгружено"; lastError = null; emit();
  }

  G.AKSI_WEBLLM = {
    version: VERSION, status: status, load: loadModel, autoLoad: loadModel, unload: unload,
    complete: complete, think: complete, ask: complete, adapt: adapt,
    models: MODELS_DESKTOP, modelsForDevice: modelsForDevice, system: BASE_SYS,
    ready: function () { return !!engine && !loading; },
    loading: function () { return loading; },
    isMobile: isMobile, isIOS: isIOS
  };
})(typeof window !== "undefined" ? window : globalThis);
