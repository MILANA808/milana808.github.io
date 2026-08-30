/* АКСИ Local Engine v1.0
 * Browser-local inference adapter.
 * Uses WebLLM/WebGPU when available; no hidden chain-of-thought is exposed.
 * The UI receives safe execution telemetry: stages, timings, token counts and verification state.
 */
(function (global) {
  'use strict';
  var KEY = 'aksi_local_engine_v1';
  var state = { engine: null, model: null, ready: false, loading: false, webgpu: false };
  var listeners = [];

  function emit(stage, detail) {
    var event = Object.assign({ stage: stage, at: Date.now() }, detail || {});
    listeners.slice().forEach(function (fn) { try { fn(event); } catch (_) {} });
    return event;
  }

  function onTrace(fn) { if (typeof fn === 'function') listeners.push(fn); return function () { listeners = listeners.filter(function (x) { return x !== fn; }); }; }

  function webgpuAvailable() {
    return !!(navigator && navigator.gpu);
  }

  function config() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; }
  }

  function chooseModel(records) {
    var cfg = config();
    if (cfg.model) return cfg.model;
    var list = records || [];
    var preferred = list.filter(function (m) {
      var id = String(m.model_id || m.model || m.name || '').toLowerCase();
      return /qwen|gemma|phi|llama/.test(id);
    });
    return (preferred[0] || list[0] || {}).model_id || null;
  }

  async function load(modelId) {
    if (state.ready) return { ok: true, model: state.model, cached: true };
    if (state.loading) return { ok: false, reason: 'loading' };
    state.loading = true;
    emit('capabilities', { webgpu: webgpuAvailable(), local: true });
    if (!webgpuAvailable()) {
      state.loading = false;
      emit('unavailable', { reason: 'WebGPU is unavailable' });
      return { ok: false, reason: 'webgpu-unavailable' };
    }
    if (!global.WebLLM) {
      state.loading = false;
      emit('unavailable', { reason: 'WebLLM runtime is not loaded' });
      return { ok: false, reason: 'webllm-not-loaded' };
    }
    try {
      var records = global.WebLLM.prebuiltAppConfig && global.WebLLM.prebuiltAppConfig.model_list || [];
      var chosen = modelId || chooseModel(records);
      if (!chosen) throw new Error('No compatible local model record found');
      emit('model-select', { model: chosen });
      var started = performance.now();
      state.engine = await global.WebLLM.CreateMLCEngine(chosen, {
        initProgressCallback: function (p) {
          emit('model-load', { progress: typeof p.progress === 'number' ? p.progress : null, text: p.text || '' });
        }
      });
      state.model = chosen;
      state.ready = true;
      state.loading = false;
      emit('ready', { model: chosen, ms: Math.round(performance.now() - started) });
      try { localStorage.setItem(KEY, JSON.stringify({ model: chosen, readyAt: Date.now() })); } catch (_) {}
      return { ok: true, model: chosen, ms: Math.round(performance.now() - started) };
    } catch (e) {
      state.loading = false;
      emit('error', { message: e && e.message ? e.message : String(e) });
      return { ok: false, reason: 'load-error', error: e };
    }
  }

  async function generate(messages, options) {
    options = options || {};
    var started = performance.now();
    emit('input', { chars: String(messages[messages.length - 1] && messages[messages.length - 1].content || '').length });
    if (!state.ready) {
      var r = await load(options.model);
      if (!r.ok) return r;
    }
    emit('context', { messages: messages.length, model: state.model });
    var result = await state.engine.chat.completions.create({
      messages: messages,
      temperature: options.temperature == null ? 0.4 : options.temperature,
      max_tokens: options.max_tokens || 768,
      stream: false
    });
    var text = result && result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content || '';
    var usage = result && result.usage || {};
    emit('generation', {
      ms: Math.round(performance.now() - started),
      tokens: usage.completion_tokens || null,
      prompt_tokens: usage.prompt_tokens || null
    });
    return { ok: true, text: text, model: state.model, usage: usage, ms: Math.round(performance.now() - started) };
  }

  function status() {
    return { ready: state.ready, loading: state.loading, webgpu: webgpuAvailable(), model: state.model, local: true };
  }

  global.AKSILocalEngine = { load: load, generate: generate, status: status, onTrace: onTrace };
})(window);
