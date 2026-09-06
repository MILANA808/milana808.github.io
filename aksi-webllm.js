/** AKSI WebLLM runtime — browser-local inference with truthful status. */
(function (G) {
  'use strict';

  const VERSION = '1.6.1-webllm';
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
      models: MODELS.slice()
    };
  }

  function emit(type, detail) {
    try {
      G.dispatchEvent(new CustomEvent(type, { detail: detail || status() }));
    } catch (_) {}
  }

  function progressEvent() {
    emit('aksi-webllm-progress', status());
  }

  function readyEvent() {
    emit('aksi:webllm-ready', status());
  }

  async function detectWebGPU() {
    if (webgpu !== null) return webgpu;
    if (!G.navigator || !G.navigator.gpu) {
      webgpu = false;
      return webgpu;
    }
    try {
      const adapter = await G.navigator.gpu.requestAdapter();
      webgpu = Boolean(adapter);
    } catch (_) {
      webgpu = false;
    }
    return webgpu;
  }

  async function importFirst(urls) {
    let last;
    for (const url of urls) {
      try {
        message = 'подключение runtime…';
        progressEvent();
        return await import(url);
      } catch (error) {
        last = error;
      }
    }
    throw last || new Error('CDN недоступен');
  }

  async function loadWebLLM(modelId, onProgress) {
    const gpu = await detectWebGPU();
    if (!gpu) throw new Error('WebGPU недоступен');

    message = 'загрузка WebLLM…';
    progressEvent();
    const webllm = await importFirst(CDNS);
    const CreateMLCEngine = webllm.CreateMLCEngine ||
      (webllm.default && webllm.default.CreateMLCEngine);
    if (typeof CreateMLCEngine !== 'function') {
      throw new Error('CreateMLCEngine не найден');
    }

    const engineInstance = await CreateMLCEngine(modelId, {
      initProgressCallback: function (info) {
        if (info && typeof info.progress === 'number') {
          progress = Math.max(0, Math.min(100, Math.round(info.progress * 100)));
        }
        if (info && info.text) message = String(info.text).slice(0, 180);
        const s = status();
        if (typeof onProgress === 'function') onProgress(s);
        progressEvent();
      }
    });

    engine = engineInstance;
    xfPipe = null;
    backend = 'webllm';
    currentModel = modelId;
    loading = false;
    progress = 100;
    lastError = null;
    message = 'готово · WebLLM';
    try { localStorage.setItem('aksi_webllm_model', modelId); } catch (_) {}
    progressEvent();
    readyEvent();
    return status();
  }

  async function loadTransformers(modelId, onProgress) {
    modelId = modelId || MODELS[2].id;
    message = 'загрузка Transformers.js…';
    progress = 5;
    progressEvent();
    const mod = await importFirst(XF_CDNS);
    const pipeline = mod.pipeline || (mod.default && mod.default.pipeline);
    if (typeof pipeline !== 'function') throw new Error('pipeline не найден');

    try {
      if (mod.env) {
        mod.env.allowLocalModels = false;
        mod.env.useBrowserCache = true;
      }
    } catch (_) {}

    const task = /T5|flan|LaMini/i.test(modelId) ? 'text2text-generation' : 'text-generation';
    const pipe = await pipeline(task, modelId, {
      progress_callback: function (info) {
        if (info && typeof info.progress === 'number') {
          progress = Math.max(5, Math.min(95, Math.round(5 + info.progress * 90)));
        }
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
    loading = false;
    progress = 100;
    lastError = null;
    message = 'готово · WASM';
    try { localStorage.setItem('aksi_webllm_model', modelId); } catch (_) {}
    progressEvent();
    readyEvent();
    return status();
  }

  async function loadModel(modelId, onProgress) {
    if (loading && loadPromise) return loadPromise;
    loading = true;
    progress = 0;
    lastError = null;

    let preferred = modelId || null;
    try {
      if (!preferred) preferred = localStorage.getItem('aksi_webllm_model');
    } catch (_) {}

    loadPromise = (async function () {
      const gpu = await detectWebGPU();
      const isTransformers = preferred && /Xenova|transformers/i.test(preferred);
      if (gpu && !isTransformers) {
        try {
          return await loadWebLLM(preferred || MODELS[0].id, onProgress);
        } catch (webllmError) {
          lastError = String(webllmError && webllmError.message || webllmError);
          message = 'WebLLM недоступен → пробуем WASM';
          progressEvent();
          return loadTransformers(MODELS[2].id, onProgress);
        }
      }
      return loadTransformers(isTransformers ? preferred : MODELS[2].id, onProgress);
    })();

    try {
      return await loadPromise;
    } catch (error) {
      loading = false;
      lastError = String(error && error.message || error);
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
    try {
      if (localStorage.getItem('aksi_webllm_skip') === '1') return status();
    } catch (_) {}
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
        return { text, source: 'webllm', offline: true, model: currentModel, backend };
      } catch (error) {
        return { text: null, source: 'webllm', error: String(error && error.message || error), offline: true, model: currentModel, backend };
      }
    }

    if (backend === 'transformers' && xfPipe) {
      const q = String(prompt || '').slice(0, 1500);
      const isT5 = /T5|flan|LaMini/i.test(currentModel || '');
      const input = isT5 ? q : '<|user|>\n' + q + '\n<|assistant|>\n';
      try {
        const output = await xfPipe(input, {
          max_new_tokens: Math.min(200, maxTokens),
          temperature,
          do_sample: temperature > 0.05
        });
        let text = '';
        if (Array.isArray(output) && output[0]) {
          text = output[0].generated_text || output[0].translation_text || '';
        } else if (typeof output === 'string') {
          text = output;
        }
        text = String(text || '').replace(input, '').trim();
        if (!text) throw new Error('Transformers.js вернул пустой ответ');
        return { text, source: 'transformers', offline: true, model: currentModel, backend };
      } catch (error) {
        return { text: null, source: 'transformers', error: String(error && error.message || error), offline: true, model: currentModel, backend };
      }
    }

    return { text: null, source: 'none', error: 'модель не загружена', offline: true };
  }

  async function think(question) {
    const result = await complete(question);
    return result && result.text ? result : null;
  }

  G.AKSI_WEBLLM = {
    version: VERSION,
    status,
    load: loadModel,
    autoLoad,
    unload,
    complete,
    think,
    ask: think,
    models: MODELS,
    ready: function () { return Boolean(engine || xfPipe); },
    loading: function () { return loading; },
    backend: function () { return backend; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
