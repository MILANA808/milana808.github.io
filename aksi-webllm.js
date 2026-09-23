/** AKSI WebLLM Pocket v4.0 — on-device browser LLM */
(function (G) {
  "use strict";
  var VERSION = "4.0.0-pocket";
  var WEBLLM_VERSION = "0.2.82";
  var CDNS = [
    "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@" + WEBLLM_VERSION + "/+esm",
    "https://esm.sh/@mlc-ai/web-llm@" + WEBLLM_VERSION
  ];
  var MODELS = [
    { id: "Qwen3-1.7B-q4f16_1-MLC", label: "Qwen3 1.7B · Pocket · ~1.7 GB", mobile: true },
    { id: "Qwen3-0.6B-q4f16_1-MLC", label: "Qwen3 0.6B · Fast · ~1.1 GB", mobile: true },
    { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", label: "Qwen2.5 1.5B · ~1.6 GB", mobile: true }
  ];
  var SYS = "Ты AKSI Pocket — локальный ИИ-контур. Отвечай на языке пользователя. Сначала различай факт, гипотезу и неизвестность. Не выдумывай источники. Если данных мало — скажи это. Используй предоставленную память и результаты локальных инструментов. Ты не сознание и не человек.";
  var engine = null, currentModel = null, loading = false, progress = 0, message = "ожидание", lastError = null, webgpu = null, loadPromise = null;

  function status() {
    return { version: VERSION, webllm: WEBLLM_VERSION, ready: !!engine, loading: loading,
      progress: progress, message: message, model: currentModel, webgpu: webgpu,
      error: lastError, models: MODELS.slice() };
  }
  function emit() { try { G.dispatchEvent(new CustomEvent("aksi-webllm-progress", { detail: status() })); } catch(e) {} }
  function setProgress(p, msg) {
    progress = Math.max(0, Math.min(100, Math.round(p <= 1 ? p * 100 : p)));
    if (msg) message = String(msg).slice(0, 240);
    emit();
  }
  function detectWebGPU() {
    if (webgpu !== null) return Promise.resolve(webgpu);
    if (!G.navigator || !G.navigator.gpu) { webgpu = false; return Promise.resolve(false); }
    return G.navigator.gpu.requestAdapter().then(function(a) {
      webgpu = !!a; return webgpu;
    }).catch(function(){ webgpu = false; return false; });
  }
  function importFirst(urls, i) {
    i = i || 0;
    if (i >= urls.length) return Promise.reject(new Error("WebLLM CDN недоступен"));
    return import(urls[i]).catch(function(){ return importFirst(urls, i + 1); });
  }
  function loadModel(modelId, onProgress) {
    if (loading && loadPromise) return loadPromise;
    loading = true; progress = 0; lastError = null; message = "проверяю GPU…"; emit();
    var mid = modelId || "Qwen3-1.7B-q4f16_1-MLC";
    loadPromise = detectWebGPU().then(function(gpu) {
      if (!gpu) throw new Error("WebGPU недоступен. Нужен Safari 26+/Chrome с WebGPU.");
      setProgress(5, "загружаю локальный inference engine…");
      return importFirst(CDNS).then(function(mod) {
        var create = mod.CreateMLCEngine || (mod.default && mod.default.CreateMLCEngine);
        if (!create) throw new Error("CreateMLCEngine не найден");
        setProgress(10, "готовлю " + mid + "…");
        return create(mid, {
          initProgressCallback: function(info) {
            var p = 10 + (info && typeof info.progress === "number" ? info.progress * 88 : 0);
            setProgress(p, (info && info.text) || "загрузка весов…");
            if (typeof onProgress === "function") onProgress(status());
          },
          appConfig: undefined
        });
      });
    }).then(function(inst) {
      engine = inst; currentModel = mid; lastError = null;
      setProgress(100, "готово · " + mid);
      try { G.localStorage.setItem("aksi_webllm_model", mid); } catch(e) {}
      try { G.dispatchEvent(new CustomEvent("aksi:webllm-ready", {detail:status()})); } catch(e2) {}
      loading = false; loadPromise = null; return status();
    }).catch(function(err) {
      loading = false; loadPromise = null; lastError = String((err && err.message) || err);
      message = "ошибка: " + lastError.slice(0,180); progress = 0; emit(); throw err;
    });
    return loadPromise;
  }
  function complete(prompt, options) {
    options = options || {};
    if (!engine) return Promise.resolve({text:null,error:"модель не загружена",source:"none"});
    var system = options.system || SYS;
    var memory = "";
    try {
      if (G.AKSI_OFFLINE && G.AKSI_OFFLINE.memory) {
        memory = G.AKSI_OFFLINE.memory().slice(0,8).map(function(x){return typeof x==="string"?x:x.text;}).filter(Boolean).join("\n");
      }
    } catch(e) {}
    if (memory) system += "\n\nЛокальная память пользователя:\n" + memory.slice(0,3000);
    try {
      if (G.AKSI_NEURO && G.AKSI_NEURO.query) {
        var r = G.AKSI_NEURO.query(prompt);
        if (r && r.answer) system += "\n\nЛокальный SEED-контекст:\n" + String(r.answer).slice(0,700);
      }
    } catch(e) {}
    return engine.chat.completions.create({
      messages:[{role:"system",content:system},{role:"user",content:String(prompt||"").slice(0,5000)}],
      temperature: options.temperature != null ? options.temperature : 0.35,
      max_tokens: options.max_tokens || options.maxTokens || 512
    }).then(function(reply) {
      var t = reply && reply.choices && reply.choices[0] && reply.choices[0].message && reply.choices[0].message.content;
      return {text:String(t||"").trim(),source:"webllm",inference_local:true,model:currentModel,backend:"webllm"};
    }).catch(function(error) {
      return {text:null,source:"webllm",error:String((error&&error.message)||error),model:currentModel};
    });
  }
  function unload() { engine=null;currentModel=null;loading=false;loadPromise=null;progress=0;message="выгружено";emit(); }
  G.AKSI_WEBLLM = {version:VERSION,status:status,load:loadModel,autoLoad:loadModel,unload:unload,
    complete:complete,think:complete,ask:complete,models:MODELS,system:SYS,
    ready:function(){return !!engine;},loading:function(){return loading;}};
})(typeof window !== "undefined" ? window : globalThis);
