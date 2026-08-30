/**
 * AKSI Local Engine v2.0
 * Browser-local inference orchestration.
 * - WebLLM/WebGPU when available
 * - optional localhost llama.cpp-compatible endpoint
 * - IndexedDB memory
 * - observable execution trace (no hidden chain-of-thought)
 * - strict offline policy by default
 */
(function (G) {
  'use strict';
  const VERSION = '2.0.0';
  const DB = 'aksi-local-v2';
  const STORE = 'memory';
  const LOCAL_ENDPOINT = 'http://127.0.0.1:8080/v1/chat/completions';
  const MODELS = [
    { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', label: 'Qwen 2.5 1.5B · fast · multilingual' },
    { id: 'Phi-3.5-mini-instruct-q4f16_1-MLC', label: 'Phi 3.5 Mini · stronger reasoning' },
    { id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', label: 'Qwen 2.5 0.5B · low memory' },
    { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', label: 'Llama 3.2 1B' },
    { id: 'gemma-2-2b-it-q4f16_1-MLC', label: 'Gemma 2 2B' }
  ];
  let engine = null;
  let model = null;
  let busy = false;
  let trace = [];
  let network = false;
  let listeners = [];

  function emit(type, data) {
    const event = { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()), ts: Date.now(), type, data: data || {} };
    trace.push(event);
    if (trace.length > 200) trace.shift();
    listeners.forEach(fn => { try { fn(event, trace.slice()); } catch (_) {} });
    return event;
  }
  function subscribe(fn) { listeners.push(fn); return () => { listeners = listeners.filter(x => x !== fn); }; }
  function capabilities() {
    return {
      version: VERSION,
      webgpu: !!(navigator.gpu),
      indexedDB: !!G.indexedDB,
      serviceWorker: 'serviceWorker' in navigator,
      webllm: !!G.AKSI_WEBLLM,
      model: model,
      ready: !!engine,
      busy,
      network,
      mode: engine ? 'webgpu-local' : 'offline-kernel'
    };
  }
  function openDB() {
    return new Promise((resolve, reject) => {
      if (!G.indexedDB) return resolve(null);
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: 'id' }); };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  async function memoryPut(text, meta) {
    const item = { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()), text: String(text), meta: meta || {}, createdAt: Date.now() };
    const db = await openDB();
    if (!db) return item;
    await new Promise((resolve, reject) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(item); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
    db.close();
    emit('memory.write', { id: item.id });
    return item;
  }
  async function memoryAll() {
    const db = await openDB();
    if (!db) return [];
    return new Promise((resolve, reject) => {
      const r = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      r.onsuccess = () => { db.close(); resolve(r.result || []); };
      r.onerror = () => { db.close(); reject(r.error); };
    });
  }
  function tokenize(s) { return String(s || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(x => x.length > 2); }
  async function retrieve(query, limit) {
    const docs = await memoryAll();
    const q = tokenize(query), scored = docs.map(d => {
      const words = new Set(tokenize(d.text));
      let score = 0; q.forEach(t => { if (words.has(t)) score += 1; });
      return { d, score };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, limit || 6);
    emit('memory.retrieve', { query: String(query).slice(0, 160), hits: scored.length });
    return scored.map(x => x.d);
  }
  async function load(modelId, onProgress) {
    if (!G.AKSI_WEBLLM) throw new Error('WebLLM adapter is not loaded');
    if (busy) throw new Error('engine busy');
    busy = true; emit('model.load.start', { model: modelId });
    try {
      await G.AKSI_WEBLLM.load(modelId, st => { emit('model.load.progress', { progress: st.progress, message: st.message }); if (onProgress) onProgress(st); });
      engine = G.AKSI_WEBLLM; model = modelId; emit('model.ready', { model: modelId });
      return capabilities();
    } finally { busy = false; }
  }
  async function unload() { if (G.AKSI_WEBLLM) G.AKSI_WEBLLM.unload(); engine = null; model = null; emit('model.unload'); }
  async function ask(prompt, options) {
    options = options || {};
    if (busy) throw new Error('АКСИ уже обрабатывает запрос');
    busy = true; trace = [];
    const started = performance.now();
    emit('input.received', { chars: String(prompt || '').length });
    try {
      const memories = options.useMemory === false ? [] : await retrieve(prompt, options.memoryLimit || 6);
      emit('context.built', { memoryHits: memories.length, contextChars: memories.reduce((n, x) => n + x.text.length, 0) });
      const system = 'Ты АКСИ — локальный приватный ИИ. Отвечай честно. Не утверждай то, чего не знаешь. Не раскрывай скрытые chain-of-thought; вместо этого кратко описывай проверяемые этапы обработки.\nПамять пользователя:\n' + memories.map(x => '- ' + x.text).join('\n');
      let result;
      if (engine && G.AKSI_WEBLLM && G.AKSI_WEBLLM.ready()) {
        emit('inference.start', { engine: 'WebLLM/WebGPU', model });
        result = await G.AKSI_WEBLLM.complete(prompt, { system, temperature: options.temperature ?? 0.55, max_tokens: options.maxTokens || 700 });
      } else if (options.allowLocalServer) {
        emit('inference.start', { engine: 'llama.cpp-localhost', endpoint: LOCAL_ENDPOINT });
        const r = await fetch(LOCAL_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: system }, { role: 'user', content: String(prompt) }], temperature: options.temperature ?? 0.55, stream: false }) });
        if (!r.ok) throw new Error('Local llama.cpp server returned ' + r.status);
        const j = await r.json();
        result = { text: j.choices?.[0]?.message?.content || '', source: 'llama.cpp-localhost', offline: true, model: j.model || 'local' };
      } else {
        emit('inference.fallback', { engine: 'offline-kernel' });
        result = { text: localFallback(prompt), source: 'offline-kernel', offline: true, model: null };
      }
      emit('inference.complete', { source: result.source, chars: (result.text || '').length });
      const elapsed = Math.round(performance.now() - started);
      emit('verification.complete', { local: true, traceEvents: trace.length });
      return { ...result, memories, trace: trace.slice(), metrics: { latencyMs: elapsed, traceEvents: trace.length } };
    } finally { busy = false; }
  }
  function localFallback(prompt) {
    const p = String(prompt || '').trim();
    if (!p) return 'Я готова. Напиши запрос.';
    if (/кто ты|кто такая/i.test(p)) return 'Я АКСИ. Сейчас я работаю в offline-kernel режиме. Для полноценной локальной LLM загрузи модель WebLLM/WebGPU или подключи локальный llama.cpp на этом устройстве.';
    if (/статус|режим/i.test(p)) return 'Режим: локальный. Интернет для ответа не требуется. Полноценная генерация доступна после загрузки локальной модели.';
    return 'Я получила запрос, но локальная языковая модель ещё не загружена. Никакого облачного запроса не выполняю. Загрузите локальную модель в лаборатории — после этого генерация будет выполняться на устройстве.';
  }
  G.AKSI_LOCAL_ENGINE = { version: VERSION, models: MODELS, capabilities, subscribe, load, unload, ask, memoryPut, memoryAll, retrieve, getTrace: () => trace.slice(), setNetwork: v => { network = !!v; emit('policy.network', { enabled: network }); } };
})(window);
