/**
 * AKSI MATRIX — WebLLM bridge (robust)
 * Multi-CDN + model fallback. Requires WebGPU.
 */

const CDN_CANDIDATES = [
  'https://esm.run/@mlc-ai/web-llm',
  'https://esm.sh/@mlc-ai/web-llm@0.2.85',
  'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.85/+esm'
];

const MODEL_CANDIDATES = [
  'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
  'Qwen2-0.5B-Instruct-q4f16_1-MLC',
  'Qwen2.5-0.5B-Instruct-q4f32_1-MLC',
  'SmolLM2-360M-Instruct-q4f16_1-MLC',
  'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  'Phi-3.5-mini-instruct-q4f16_1-MLC'
];

export class WebLLMBridge {
  constructor() {
    this.engine = null;
    this.isLoaded = false;
    this.loading = false;
    this.model = MODEL_CANDIDATES[0];
    this.lastError = null;
    this.progress = 0;
    this.progressText = '';
    this.cdnUsed = null;
    this._webllm = null;
  }

  static hasWebGPU() {
    return !!(typeof navigator !== 'undefined' && navigator.gpu);
  }

  async _importWebLLM(onProgress) {
    let lastErr = null;
    for (let i = 0; i < CDN_CANDIDATES.length; i++) {
      const url = CDN_CANDIDATES[i];
      try {
        if (onProgress) {
          onProgress({ progress: 0.02 + i * 0.02, text: 'import web-llm · ' + url.split('/')[2] });
        }
        const mod = await import(/* webpackIgnore: true */ url);
        if (mod && typeof mod.CreateMLCEngine === 'function') {
          this.cdnUsed = url;
          this._webllm = mod;
          return mod;
        }
        if (mod && mod.default && typeof mod.default.CreateMLCEngine === 'function') {
          this.cdnUsed = url;
          this._webllm = mod.default;
          return mod.default;
        }
        lastErr = new Error('CreateMLCEngine missing in ' + url);
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('Failed to import @mlc-ai/web-llm');
  }

  _resolveModelId(preferred) {
    const list =
      this._webllm && this._webllm.prebuiltAppConfig && this._webllm.prebuiltAppConfig.model_list
        ? this._webllm.prebuiltAppConfig.model_list
        : [];
    const ids = list.map((m) => m.model_id || '').filter(Boolean);
    const tryList = preferred ? [preferred].concat(MODEL_CANDIDATES) : MODEL_CANDIDATES.slice();
    for (let i = 0; i < tryList.length; i++) {
      const id = tryList[i];
      if (!ids.length || ids.indexOf(id) !== -1) return id;
    }
    for (let i = 0; i < ids.length; i++) {
      if (/0\.5B|360M|1B|SmolLM|Qwen2/i.test(ids[i])) return ids[i];
    }
    if (ids.length) return ids[0];
    return tryList[0];
  }

  async load(onProgress, modelId) {
    if (this.isLoaded && this.engine) return this.engine;
    if (this.loading) throw new Error('Загрузка уже идёт');

    if (!WebLLMBridge.hasWebGPU()) {
      throw new Error(
        'WebGPU недоступен. Откройте Chrome/Edge (не Firefox), включите GPU.'
      );
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) throw new Error('requestAdapter() = null');
    } catch (e) {
      throw new Error('WebGPU adapter: ' + (e.message || e));
    }

    this.loading = true;
    this.lastError = null;

    try {
      const webllm = await this._importWebLLM(onProgress);
      this.model = this._resolveModelId(modelId);

      if (onProgress) onProgress({ progress: 0.08, text: 'model: ' + this.model });

      this.engine = await webllm.CreateMLCEngine(this.model, {
        initProgressCallback: (report) => {
          const progress = report && typeof report.progress === 'number' ? report.progress : 0;
          const text = (report && report.text) || '';
          this.progress = progress;
          this.progressText = text;
          if (typeof onProgress === 'function') onProgress({ progress, text });
        }
      });

      this.isLoaded = true;
      this.loading = false;
      this.progress = 1;
      this.progressText = 'ready';
      return this.engine;
    } catch (e) {
      this.loading = false;
      this.isLoaded = false;
      this.engine = null;
      const msg = String((e && e.message) || e);
      this.lastError = msg;
      if (/not found|Unknown model|model_id|not in/i.test(msg)) {
        throw new Error('Модель не в prebuilt: ' + this.model + '. ' + msg);
      }
      if (/Failed to fetch|NetworkError|CORS/i.test(msg)) {
        throw new Error('Сеть/CDN: не скачались веса. Проверьте интернет. ' + msg);
      }
      if (/OOM|out of memory|Device lost/i.test(msg)) {
        throw new Error('Мало VRAM GPU. Закройте вкладки. ' + msg);
      }
      throw e instanceof Error ? e : new Error(msg);
    }
  }

  async generate(userText, systemPrompt) {
    if (!this.engine || !this.isLoaded) {
      throw new Error('WebLLM не загружен — нажмите Load LLM');
    }
    const messages = [
      {
        role: 'system',
        content:
          systemPrompt ||
          'Ты — локальный ИИ AKSI MATRIX в браузере. Отвечай кратко на языке пользователя.'
      },
      { role: 'user', content: String(userText || '') }
    ];
    const reply = await this.engine.chat.completions.create({
      messages,
      temperature: 0.7,
      max_tokens: 512
    });
    const choice = reply && reply.choices && reply.choices[0];
    const content =
      choice && choice.message && choice.message.content ? choice.message.content : '';
    return String(content || '').trim();
  }

  status() {
    return {
      loaded: this.isLoaded,
      loading: this.loading,
      model: this.model,
      progress: this.progress,
      progressText: this.progressText,
      error: this.lastError,
      webgpu: WebLLMBridge.hasWebGPU(),
      cdn: this.cdnUsed
    };
  }
}

export default WebLLMBridge;
