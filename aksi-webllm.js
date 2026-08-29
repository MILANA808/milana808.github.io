/**
 * AKSI-WebLLM — optional strong local LLM (MLC WebLLM / WebGPU)
 * Open-source: https://github.com/mlc-ai/web-llm
 * Loads only on explicit user action. After first download → fully offline.
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.0.0-webllm";
  var CDN = "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.79/+esm";
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
  function status() {
    return { version: VER, ready: !!engine, loading: loading, progress: loadProgress, message: loadMsg, model: currentModel, webgpu: webgpuOk, error: lastError,
      models: MODELS.map(function (m) { return { id: m.id, label: m.label, note: m.note }; }) };
  }
  function loadModel(modelId, onProgress) {
    if (loading) return Promise.reject(new Error("already loading"));
    modelId = modelId || MODELS[1].id;
    loading = true; loadProgress = 0; loadMsg = "init…"; lastError = null;
    if (typeof onProgress === "function") onProgress(status());
    return detectWebGPU().then(function (ok) {
      if (!ok) throw new Error("WebGPU unavailable. Use Neuro (CPU).");
      loadMsg = "loading MLC WebLLM…";
      if (typeof onProgress === "function") onProgress(status());
      return import(CDN);
    }).then(function (webllm) {
      var CreateMLCEngine = webllm.CreateMLCEngine || (webllm.default && webllm.default.CreateMLCEngine);
      if (!CreateMLCEngine) throw new Error("CreateMLCEngine missing");
      loadMsg = "downloading weights (once)…";
      if (typeof onProgress === "function") onProgress(status());
      return CreateMLCEngine(modelId, { initProgressCallback: function (report) {
        if (report && typeof report.progress === "number") loadProgress = Math.round(report.progress * 100);
        if (report && report.text) loadMsg = String(report.text).slice(0, 120);
        if (typeof onProgress === "function") onProgress(status());
      }});
    }).then(function (eng) {
      engine = eng; currentModel = modelId; loading = false; loadProgress = 100; loadMsg = "ready offline";
      if (typeof onProgress === "function") onProgress(status());
      return status();
    }).catch(function (e) {
      loading = false; lastError = String(e && e.message ? e.message : e);
      loadMsg = "error: " + lastError.slice(0, 100);
      if (typeof onProgress === "function") onProgress(status());
      throw e;
    });
  }
  function unload() {
    try { if (engine && typeof engine.unload === "function") engine.unload(); } catch (e) {}
    engine = null; currentModel = null; loadProgress = 0; loadMsg = "unloaded"; return status();
  }
  function complete(prompt, opts) {
    opts = opts || {};
    if (!engine) return Promise.resolve({ text: null, meta: "webllm·not-loaded", source: "webllm", offline: true, error: "Load model in Lab → WebLLM" });
    var system = opts.system || "Ты АКСИ — local-first напарник. Отвечай кратко на языке пользователя. Контакт: aksilove@internet.ru";
    return engine.chat.completions.create({
      messages: [{ role: "system", content: system }, { role: "user", content: String(prompt || "").slice(0, 4000) }],
      temperature: opts.temperature != null ? opts.temperature : 0.7, max_tokens: opts.max_tokens || 512, stream: false
    }).then(function (reply) {
      var text = reply && reply.choices && reply.choices[0] && reply.choices[0].message ? String(reply.choices[0].message.content || "").trim() : "";
      return { text: text, meta: "webllm · " + (currentModel || "mlc").split("-")[0], source: "webllm", offline: true, model: currentModel };
    }).catch(function (e) {
      return { text: null, meta: "webllm·error", source: "webllm", offline: true, error: String(e && e.message ? e.message : e) };
    });
  }
  function think(q) { return complete(q).then(function (r) { return (r && r.text) ? r : null; }); }
  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel; if (!root) return;
    root.innerHTML = '<div class="card"><h3>WebLLM · WebGPU local model</h3><p class="muted">Open-source MLC. Download once, then offline. Neuro always works.</p>' +
      '<div class="kv" style="margin-top:10px"><div class="cell"><b id="wlGpu">…</b><span>WebGPU</span></div><div class="cell"><b id="wlState">—</b><span>status</span></div></div>' +
      '<select id="wlModel" style="width:100%;padding:10px;border-radius:10px;background:var(--elev);border:1px solid rgba(255,255,255,.1);color:var(--t);margin-top:8px"></select>' +
      '<div style="margin-top:10px;display:flex;gap:8px"><button type="button" class="btn primary" id="wlLoad">Load</button><button type="button" class="btn" id="wlUnload">Unload</button></div>' +
      '<pre class="out" id="wlOut" style="margin-top:10px">ready</pre>' +
      '<textarea id="wlAsk" placeholder="Ask loaded model…" style="margin-top:10px;width:100%;min-height:70px;padding:10px;border-radius:10px;background:var(--elev);border:1px solid rgba(255,255,255,.1);color:var(--t)"></textarea>' +
      '<button type="button" class="btn primary" id="wlThink" style="margin-top:8px;width:100%">Ask WebLLM</button></div>';
    var selEl = root.querySelector("#wlModel");
    MODELS.forEach(function (m) { var o = document.createElement("option"); o.value = m.id; o.textContent = m.label + " — " + m.note; selEl.appendChild(o); });
    selEl.value = MODELS[1].id;
    function refresh() {
      var st = status(), g = root.querySelector("#wlGpu"), s = root.querySelector("#wlState"), out = root.querySelector("#wlOut");
      if (g) g.textContent = st.webgpu === true ? "yes" : st.webgpu === false ? "no" : "…";
      if (s) s.textContent = st.ready ? "ready" : st.loading ? st.progress + "%" : "idle";
      if (out && (st.loading || st.ready || st.error)) out.textContent = (st.message || "") + (st.model ? "\n" + st.model : "") + (st.error ? "\n" + st.error : "");
    }
    detectWebGPU().then(refresh); refresh();
    root.querySelector("#wlLoad").onclick = function () {
      loadModel(selEl.value, refresh).then(function () { refresh(); root.querySelector("#wlOut").textContent = "ready offline"; }).catch(function (e) { refresh(); root.querySelector("#wlOut").textContent = String(e.message || e); });
    };
    root.querySelector("#wlUnload").onclick = function () { unload(); refresh(); };
    root.querySelector("#wlThink").onclick = function () {
      var q = (root.querySelector("#wlAsk") || {}).value || "";
      if (!q.trim()) return;
      root.querySelector("#wlOut").textContent = "thinking…";
      complete(q).then(function (r) { root.querySelector("#wlOut").textContent = (r.text || r.error || "—") + "\n[" + (r.meta || "") + "]"; });
    };
  }
  G.AKSI_WEBLLM = { version: VER, status: status, load: loadModel, unload: unload, complete: complete, think: think, ask: think, models: MODELS, mount: mount, ready: function () { return !!engine; } };
})(typeof window !== "undefined" ? window : this);
