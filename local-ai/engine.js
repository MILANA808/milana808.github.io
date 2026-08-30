/**
 * AKSI Local Engine v3.0 — full offline AI pipeline with visible execution
 * INPUT → MEMORY → KERNEL (Compose|Neuro|WebLLM) → QUANTUM → METRICS → VERIFY
 * Remote only with explicit allowLocalServer. Contact: aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VERSION = "3.0.0";
  var DB = "aksi-local-v3";
  var STORE = "memory";
  var LOCAL_ENDPOINT = "http://127.0.0.1:8080/v1/chat/completions";
  var MODELS = [
    { id: "Phi-3.5-mini-instruct-q4f16_1-MLC", label: "Phi 3.5 Mini · сильнее" },
    { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", label: "Qwen 2.5 1.5B · мультиязык" },
    { id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", label: "Qwen 2.5 0.5B · мало памяти" },
    { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", label: "Llama 3.2 1B" },
    { id: "gemma-2-2b-it-q4f16_1-MLC", label: "Gemma 2 2B" }
  ];
  var engine = null, model = null, busy = false, trace = [], network = false, listeners = [];
  function now() { return Date.now(); }
  function emit(type, data) {
    var event = { id: (crypto.randomUUID ? crypto.randomUUID() : String(now() + Math.random())), ts: now(), type: type, data: data || {} };
    trace.push(event); if (trace.length > 400) trace.shift();
    listeners.slice().forEach(function (fn) { try { fn(event, trace.slice()); } catch (_) {} });
    return event;
  }
  function subscribe(fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (x) { return x !== fn; }); }; }
  function capabilities() {
    return {
      version: VERSION, webgpu: !!(navigator.gpu), indexedDB: !!G.indexedDB, serviceWorker: "serviceWorker" in navigator,
      webllm: !!G.AKSI_WEBLLM, compose: !!(G.AKSI_COMPOSE && G.AKSI_COMPOSE.think), neuro: !!(G.AKSI_NEURO && G.AKSI_NEURO.think),
      quantum: !!(G.AKSI_QUANTUM && G.AKSI_QUANTUM.answerGate), metrics: !!G.AKSI_ALGORITHM,
      model: model, ready: !!engine, busy: busy, network: network,
      mode: engine ? "webgpu-local" : (G.AKSI_COMPOSE ? "compose-kernel" : "offline-kernel")
    };
  }
  function openDB() {
    return new Promise(function (resolve, reject) {
      if (!G.indexedDB) return resolve(null);
      var r = indexedDB.open(DB, 1);
      r.onupgradeneeded = function () { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: "id" }); };
      r.onsuccess = function () { resolve(r.result); }; r.onerror = function () { reject(r.error); };
    });
  }
  async function memoryPut(text, meta) {
    var item = { id: crypto.randomUUID ? crypto.randomUUID() : String(now() + Math.random()), text: String(text), meta: meta || {}, createdAt: now() };
    var db = await openDB(); if (!db) return item;
    await new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).put(item);
      tx.oncomplete = resolve; tx.onerror = function () { reject(tx.error); };
    });
    db.close(); emit("memory.write", { id: item.id, chars: item.text.length }); return item;
  }
  async function memoryAll() {
    var db = await openDB(); if (!db) return [];
    return new Promise(function (resolve, reject) {
      var r = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
      r.onsuccess = function () { db.close(); resolve(r.result || []); };
      r.onerror = function () { db.close(); reject(r.error); };
    });
  }
  function tokenize(s) {
    return String(s || "").toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(function (x) { return x.length > 2; });
  }
  async function retrieve(query, limit) {
    var docs = await memoryAll(), q = tokenize(query);
    var scored = docs.map(function (d) {
      var words = tokenize(d.text), score = 0;
      q.forEach(function (t) { if (words.indexOf(t) !== -1) score += 1; });
      return { d: d, score: score };
    }).filter(function (x) { return x.score > 0; }).sort(function (a, b) { return b.score - a.score; }).slice(0, limit || 6);
    emit("memory.retrieve", { query: String(query).slice(0, 160), hits: scored.length, documents: docs.length });
    return scored.map(function (x) { return x.d; });
  }
  async function load(modelId, onProgress) {
    if (!G.AKSI_WEBLLM) throw new Error("WebLLM адаптер не загружен");
    if (busy) throw new Error("движок занят");
    busy = true; emit("model.load.start", { model: modelId });
    try {
      await G.AKSI_WEBLLM.load(modelId, function (s) {
        emit("model.load.progress", { progress: s.progress, message: s.message });
        if (onProgress) onProgress(s);
      });
      engine = G.AKSI_WEBLLM; model = modelId; emit("model.ready", { model: modelId });
      return capabilities();
    } finally { busy = false; }
  }
  async function unload() {
    if (G.AKSI_WEBLLM) G.AKSI_WEBLLM.unload();
    engine = null; model = null; emit("model.unload", {});
  }
  function quantumSeal(query, answer) {
    if (!G.AKSI_QUANTUM || !G.AKSI_QUANTUM.answerGate) return null;
    try {
      var qx = G.AKSI_QUANTUM.answerGate(query, answer);
      emit("quantum.seal", { QCLI: qx.QCLI, resonance: qx.resonance, band: qx.band, bits: qx.bits, backend: qx.backend || "local-ideal" });
      return qx;
    } catch (e) { emit("quantum.error", { message: String(e.message || e) }); return null; }
  }
  function metricsEval(query, answer) {
    if (!G.AKSI_ALGORITHM || !G.AKSI_ALGORITHM.evaluate) return null;
    try {
      var m = G.AKSI_ALGORITHM.evaluate(query, answer, { offline: true, source: "local", seal: false });
      var met = m.metrics || m;
      emit("metrics.eval", { EQS: met.EQS != null ? met.EQS : met.eqs, DIMAX: met.DIMAX, resonance: met.resonance, QCLI: met.QCLI });
      return m;
    } catch (e) { emit("metrics.error", { message: String(e.message || e) }); return null; }
  }
  function runCompose(prompt) {
    if (G.AKSI_COMPOSE && typeof G.AKSI_COMPOSE.think === "function") {
      emit("kernel.compose", { engine: "Resonance-Composer" });
      var c = G.AKSI_COMPOSE.think(prompt);
      if (c && c.text) return { text: c.text, source: "compose", offline: true, model: c.arch || "composer", confidence: c.confidence, mode: c.mode };
    }
    return null;
  }
  function runNeuro(prompt) {
    if (G.AKSI_NEURO && typeof G.AKSI_NEURO.think === "function") {
      emit("kernel.neuro", { engine: "Neuro" });
      var n = G.AKSI_NEURO.think(prompt);
      if (n && n.text) return { text: n.text, source: "neuro", offline: true, model: n.arch || "neuro", mode: n.mode };
    }
    return null;
  }
  function offlineKernel(prompt) {
    emit("kernel.offline", { reason: "нет LLM — Composer/Neuro" });
    var c = runCompose(prompt); if (c) return c;
    var n = runNeuro(prompt); if (n) return n;
    var p = String(prompt || "").trim();
    if (!p) return { text: "Готова к работе. Напишите запрос.", source: "offline-kernel", offline: true };
    return {
      text: "Локальная LLM ещё не загружена, Composer/Neuro не дали опоры.\nЗапрос в облако не отправлялся.\nЗагрузите модель WebGPU или используйте MATRIX «запомни:».",
      source: "offline-kernel", offline: true, model: null
    };
  }
  async function ask(prompt, options) {
    options = options || {};
    if (busy) throw new Error("АКСИ уже обрабатывает запрос");
    busy = true; trace = []; var started = performance.now();
    emit("input.received", { chars: String(prompt || "").length, preview: String(prompt || "").slice(0, 80) });
    try {
      var memories = options.useMemory === false ? [] : await retrieve(prompt, options.memoryLimit || 6);
      emit("context.built", { memoryHits: memories.length, contextChars: memories.reduce(function (n, x) { return n + x.text.length; }, 0) });
      var system = "Ты локальный AI-ассистент АКСИ. Отвечай по-русски, честно. Отделяй факты от предположений. Этапы видны в execution trace.\nЛокальная память:\n" +
        memories.map(function (x) { return "- " + x.text; }).join("\n");
      var result;
      if (engine && G.AKSI_WEBLLM && G.AKSI_WEBLLM.ready && G.AKSI_WEBLLM.ready()) {
        emit("inference.start", { engine: "WebLLM/WebGPU", model: model });
        result = await G.AKSI_WEBLLM.complete(prompt, { system: system, temperature: options.temperature != null ? options.temperature : 0.55, maxTokens: options.maxTokens || 700 });
        result.source = result.source || "webllm"; result.offline = true;
      } else if (options.allowLocalServer === true) {
        emit("inference.start", { engine: "llama.cpp-localhost", endpoint: LOCAL_ENDPOINT });
        var r = await fetch(LOCAL_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "system", content: system }, { role: "user", content: String(prompt) }], temperature: options.temperature != null ? options.temperature : 0.55, max_tokens: options.maxTokens || 700, stream: false }) });
        if (!r.ok) throw new Error("Local llama.cpp вернул " + r.status);
        var j = await r.json();
        result = { text: (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || "", source: "llama.cpp-localhost", offline: true, model: j.model || "local" };
      } else {
        emit("inference.fallback", { engine: "compose/neuro-kernel", reason: "no local LLM loaded" });
        result = offlineKernel(prompt);
      }
      emit("inference.complete", { source: result.source, chars: (result.text || "").length, mode: result.mode || null });
      var qx = quantumSeal(prompt, result.text);
      var met = metricsEval(prompt, result.text);
      var elapsed = Math.round(performance.now() - started);
      emit("verification.complete", { local: true, offline: !!result.offline, traceEvents: trace.length, latencyMs: elapsed, QCLI: qx && qx.QCLI, source: result.source });
      return { text: result.text, source: result.source, offline: result.offline !== false, model: result.model || model, memories: memories, quantum: qx, metrics: met && (met.metrics || met), confidence: result.confidence, trace: trace.slice(), latencyMs: elapsed };
    } finally { busy = false; }
  }
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js", { scope: "/local-ai/" }).catch(function () {});
  G.AKSI_LOCAL_ENGINE = { version: VERSION, models: MODELS, capabilities: capabilities, subscribe: subscribe, load: load, unload: unload, ask: ask, memoryPut: memoryPut, memoryAll: memoryAll, retrieve: retrieve, getTrace: function () { return trace.slice(); }, setNetwork: function (v) { network = !!v; emit("policy.network", { enabled: network }); } };
})(window);
