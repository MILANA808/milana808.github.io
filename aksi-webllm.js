/** AKSI WebLLM runtime — browser-local inference with truthful network/runtime status. */
(function (G) {
  'use strict';

  const VERSION = '1.6.3-webllm';
  const WEBLLM_VERSION = '0.2.84';
  const CDNS = [
    'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@' + WEBLLM_VERSION + '/+esm',
    'https://esm.sh/@mlc-ai/web-llm@' + WEBLLM_VERSION
  ];
  const XF_CDNS = [
    'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/+esm',
    'https://esm.sh/@xenova/transformers@2.17.2'
  ];
  const MODELS = [
    { id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', label: 'Qwen 0.5B WebGPU', backend: 'webllm' },
    { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', label: 'Qwen 1.5B WebGPU', backend: 'webllm' },
    { id: 'Xenova/LaMini-Flan-T5-248M', label: 'LaMini WASM', backend: 'transformers' },
    { id: 'Xenova/flan-t5-small', label: 'Flan-T5 small WASM', backend: 'transformers' },
    { id: 'Xenova/Qwen1.5-0.5B-Chat', label: 'Qwen1.5 WASM', backend: 'transformers' }
  ];

  let engine = null;
  let xfPipe = null;
  let backend = null;
  let currentModel = null;
  let loading = false;
  let progress = 0;
  let message = 'не загружено';
  let lastError = null;
  let webgpu = null;
  let loadPromise = null;
  let bootstrapNetworkUsed = false;

  function status() {
    return {
      version: VERSION,
      webllm: WEBLLM_VERSION,
      ready: Boolean(engine || xfPipe),
      loading,
      progress,
      message,
      model: currentModel,
      backend,
      webgpu,
      error: lastError,
      models: MODELS.slice(),
      inference_local: Boolean(engine || xfPipe),
      network_required_for_bootstrap: bootstrapNetworkUsed
    };
  }

  function emit(type) {
    try { G.dispatchEvent(new CustomEvent(type, { detail: status() })); } catch (_) {}
  }

  function progressEvent() { emit('aksi-webllm-progress'); }
  function readyEvent() { emit('aksi:webllm-ready'); }

  async function detectWebGPU() {
    if (webgpu !== null) return webgpu;
    if (!G.navigator || !G.navigator.gpu) {
      webgpu = false;
      return false;
    }
    try {
      webgpu = Boolean(await G.navigator.gpu.requestAdapter());
    } catch (_) {
      webgpu = false;
    }
    return webgpu;
  }

  async function importFirst(urls) {
    let lastError = null;
    for (const url of urls) {
      try {
        bootstrapNetworkUsed = true;
        message = 'подключение runtime…';
        progressEvent();
        return await import(url);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('runtime недоступен');
  }

  async function loadWebLLM(modelId, onProgress) {
    if (!(await detectWebGPU())) throw new Error('WebGPU недоступен');
    message = 'загрузка WebLLM…';
    progressEvent();
    const mod = await importFirst(CDNS);
    const createEngine = mod.CreateMLCEngine || (mod.default && mod.default.CreateMLCEngine);
    if (typeof createEngine !== 'function') throw new Error('CreateMLCEngine не найден');
    const instance = await createEngine(modelId, {
      initProgressCallback(info) {
        if (info && typeof info.progress === 'number') progress = Math.round(Math.max(0, Math.min(1, info.progress)) * 100);
        if (info && info.text) message = String(info.text).slice(0, 180);
        const s = status();
        if (typeof onProgress === 'function') onProgress(s);
        progressEvent();
      }
    });
    engine = instance;
    xfPipe = null;
    backend = 'webllm';
    currentModel = modelId;
    progress = 100;
    lastError = null;
    message = 'готово · WebLLM';
    try { G.localStorage.setItem('aksi_webllm_model', modelId); } catch (_) {}
    progressEvent();
    readyEvent();
    return status();
  }

  async function loadTransformers(modelId, onProgress) {
    const mod = await importFirst(XF_CDNS);
    const pipeline = mod.pipeline || (mod.default && mod.default.pipeline);
    if (typeof pipeline !== 'function') throw new Error('pipeline не найден');
    message = 'загрузка Transformers.js…';
    progress = 5;
    progressEvent();
    try {
      if (mod.env) {
        mod.env.allowLocalModels = false;
        mod.env.useBrowserCache = true;
      }
    } catch (_) {}
    const task = /T5|flan|LaMini/i.test(modelId || '') ? 'text2text-generation' : 'text-generation';
    const pipe = await pipeline(task, modelId, {
      progress_callback(info) {
        if (info && typeof info.progress === 'number') progress = Math.round(5 + Math.max(0, Math.min(1, info.progress)) * 90);
        if (info && info.status) message = String(info.status).slice(0, 180);
        const s = status();
        if (typeof onProgress === 'function') onProgress(s);
        progressEvent();
      }
    });
    xfPipe = pipe;
    engine = null;
    backend = 'transformers';
    currentModel = modelId;
    progress = 100;
    lastError = null;
    message = 'готово · WASM';
    try { G.localStorage.setItem('aksi_webllm_model', modelId); } catch (_) {}
    progressEvent();
    readyEvent();
    return status();
  }

  async function loadModel(modelId, onProgress) {
    if (loading && loadPromise) return loadPromise;
    loading = true;
    progress = 0;
    lastError = null;
    bootstrapNetworkUsed = false;
    let preferred = modelId || null;
    try { if (!preferred) preferred = G.localStorage.getItem('aksi_webllm_model'); } catch (_) {}
    loadPromise = (async function () {
      const gpu = await detectWebGPU();
      const useTransformers = preferred && /Xenova|transformers/i.test(preferred);
      if (gpu && !useTransformers) {
        try {
          return await loadWebLLM(preferred || MODELS[0].id, onProgress);
        } catch (webllmError) {
          const first = String(webllmError && webllmError.message || webllmError);
          lastError = first;
          message = 'WebLLM недоступен → пробуем WASM';
          progressEvent();
          try {
            return await loadTransformers(MODELS[2].id, onProgress);
          } catch (transformersError) {
            const second = String(transformersError && transformersError.message || transformersError);
            lastError = first + ' | WASM: ' + second;
            throw new Error(lastError);
          }
        }
      }
      return loadTransformers(useTransformers ? preferred : MODELS[2].id, onProgress);
    })();
    try {
      return await loadPromise;
    } catch (error) {
      loading = false;
      lastError = lastError || String(error && error.message || error);
      message = 'ошибка: ' + lastError;
      progressEvent();
      if (typeof onProgress === 'function') onProgress(status());
      throw error;
    } finally {
      loadPromise = null;
      loading = false;
    }
  }

  async function autoLoad(options) {
    options = options || {};
    if (engine || xfPipe) return status();
    try { if (G.localStorage.getItem('aksi_webllm_skip') === '1') return status(); } catch (_) {}
    return loadModel(options.modelId || null, options.onProgress || null);
  }

  function unload() {
    engine = null;
    xfPipe = null;
    backend = null;
    currentModel = null;
    loading = false;
    progress = 0;
    message = 'выгружено';
    progressEvent();
  }

  async function complete(prompt, options) {
    options = options || {};
    const system = options.system || 'Ты АКСИ — локальный ИИ. Отвечай кратко по-русски.';
    const temperature = options.temperature != null ? options.temperature : 0.6;
    const maxTokens = options.max_tokens || 256;
    if (backend === 'webllm' && engine) {
      try {
        const reply = await engine.chat.completions.create({
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: String(prompt || '').slice(0, 6000) }
          ],
          temperature,
          max_tokens: maxTokens,
          stream: false
        });
        const text = reply && reply.choices && reply.choices[0] && reply.choices[0].message
          ? String(reply.choices[0].message.content || '').trim() : '';
        if (!text) throw new Error('WebLLM вернул пустой ответ');
        return { text, source: 'webllm', inference_local: true, bootstrap_network_used: bootstrapNetworkUsed, model: currentModel, backend };
      } catch (error) {
        return { text: null, source: 'webllm', error: String(error && error.message || error), inference_local: true, bootstrap_network_used: bootstrapNetworkUsed, model: currentModel, backend };
      }
    }
    if (backend === 'transformers' && xfPipe) {
      const q = String(prompt || '').slice(0, 1500);
      const isT5 = /T5|flan|LaMini/i.test(currentModel || '');
      const input = isT5 ? q : '<|user|>\n' + q + '\n<|assistant|>\n';
      try {
        const output = await xfPipe(input, { max_new_tokens: Math.min(200, maxTokens), temperature, do_sample: temperature > 0.05 });
        let text = '';
        if (Array.isArray(output) && output[0]) text = output[0].generated_text || output[0].translation_text || '';
        else if (typeof output === 'string') text = output;
        text = String(text || '').replace(input, '').trim();
        if (!text) throw new Error('Transformers.js вернул пустой ответ');
        return { text, source: 'transformers', inference_local: true, bootstrap_network_used: bootstrapNetworkUsed, model: currentModel, backend };
      } catch (error) {
        return { text: null, source: 'transformers', error: String(error && error.message || error), inference_local: true, bootstrap_network_used: bootstrapNetworkUsed, model: currentModel, backend };
      }
    }
    return { text: null, source: 'none', error: 'модель не загружена', inference_local: false, bootstrap_network_used: bootstrapNetworkUsed, model: currentModel, backend };
  }

  G.AKSI_WEBLLM = {
    version: VERSION,
    status,
    load: loadModel,
    autoLoad,
    unload,
    complete,
    think: complete,
    ask: complete,
    models: MODELS,
    ready: function () { return Boolean(engine || xfPipe); },
    loading: function () { return loading; },
    backend: function () { return backend; }
  };
}(typeof window !== 'undefined' ? window : globalThis));
