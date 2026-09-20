/**
 * AKSI MATRIX — WebLLM bridge
 * Fully in-page generation: load → Send → answer in chat (no external site).
 * Tries larger models first, falls back on OOM / missing id.
 */

const CDN_CANDIDATES = [
  'https://esm.run/@mlc-ai/web-llm',
  'https://esm.sh/@mlc-ai/web-llm@0.2.79',
  'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.79/+esm',
  'https://esm.sh/@mlc-ai/web-llm'
];

const MODEL_CANDIDATES = [
  'Llama-3.2-3B-Instruct-q4f16_1-MLC',
  'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
  'Phi-3.5-mini-instruct-q4f16_1-MLC',
  'Llama-3.2-1B-Instruct-q4f16_1-MLC',
  'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
  'Qwen2-0.5B-Instruct-q4f16_1-MLC',
  'SmolLM2-360M-Instruct-q4f16_1-MLC',
  'TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC'
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
    this.tried = [];
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
          onProgress({
            progress: 0.02 + i * 0.015,
            text: 'import · ' + (url.split('/')[2] || url)
          });
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
    throw lastErr || new Error('Не удалось импортировать @mlc-ai/web-llm');
  }

  _availableIds() {
    const list =
      this._webllm &&
      this._webllm.prebuiltAppConfig &&
      this._webllm.prebuiltAppConfig.model_list
        ? this._webllm.prebuiltAppConfig.model_list
        : [];
    return list.map((m) => m.model_id || m.model_lib || '').filter(Boolean);
  }

  _buildTryList(preferred) {
    const ids = this._availableIds();
    const out = [];
    const push = (id) => {
      if (id && out.indexOf(id) === -1) out.push(id);
    };
    if (preferred) push(preferred);
    MODEL_CANDIDATES.forEach(push);
    ids.forEach((id) => {
      if (/3B|1\.5B|Phi-3|Qwen2\.5-1|Llama-3\.2-3/i.test(id)) push(id);
    });
    ids.forEach((id) => {
      if (/0\.5B|1B|360M|TinyLlama|SmolLM/i.test(id)) push(id);
    });
    if (!out.length && ids.length) push(ids[0]);
    return out;
  }

  async load(onProgress, modelId) {
    if (this.isLoaded && this.engine) return this.engine;
    if (this.loading) throw new Error('Загрузка уже идёт');

    if (!WebLLMBridge.hasWebGPU()) {
      throw new Error(
        'WebGPU недоступен. Chrome или Edge, включите GPU, сайт по HTTPS.'
      );
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) throw new Error('GPU adapter = null');
    } catch (e) {
      throw new Error('WebGPU: ' + (e.message || e));
    }

    this.loading = true;
    this.lastError = null;
    this.tried = [];

    try {
      const webllm = await this._importWebLLM(onProgress);
      const CreateMLCEngine = webllm.CreateMLCEngine;
      const tryList = this._buildTryList(modelId);
      if (!tryList.length) throw new Error('Нет model_id в prebuilt списке');

      let lastFail = null;
      for (let i = 0; i < tryList.length; i++) {
        const id = tryList[i];
        this.model = id;
        this.tried.push(id);
        if (onProgress) {
          onProgress({
            progress: 0.05 + (i / Math.max(tryList.length, 1)) * 0.1,
            text: 'try ' + id
          });
        }
        try {
          this.engine = await CreateMLCEngine(id, {
            initProgressCallback: (report) => {
              const progress =
                report && typeof report.progress === 'number' ? report.progress : 0;
              const text = (report && report.text) || id;
              this.progress = progress;
              this.progressText = text;
              if (typeof onProgress === 'function') {
                onProgress({ progress, text });
              }
            }
          });
          this.isLoaded = true;
          this.loading = false;
          this.progress = 1;
          this.progressText = 'ready · ' + id;
          if (onProgress) onProgress({ progress: 1, text: this.progressText });
          return this.engine;
        } catch (e) {
          lastFail = e;
          this.engine = null;
          if (onProgress) {
            onProgress({
              progress: 0.05,
              text: 'fail ' + id.slice(0, 28) + ' → next'
            });
          }
          if (i < tryList.length - 1) continue;
        }
      }

      this.loading = false;
      this.isLoaded = false;
      const msg = String((lastFail && lastFail.message) || lastFail || 'load failed');
      this.lastError = msg;
      throw new Error(
        'Не удалось загрузить модель. Пробовали: ' +
          this.tried.slice(0, 4).join(', ') +
          '. ' +
          msg
      );
    } catch (e) {
      this.loading = false;
      this.isLoaded = false;
      this.engine = null;
      const msg = String((e && e.message) || e);
      this.lastError = msg;
      throw e instanceof Error ? e : new Error(msg);
    }
  }

  async generate(userText, systemPrompt) {
    if (!this.engine || !this.isLoaded) {
      throw new Error('Сначала нажмите «Загрузить ИИ»');
    }
    const messages = [
      {
        role: 'system',
        content:
          systemPrompt ||
          'Ты локальный ИИ AKSI MATRIX в браузере. Отвечай по существу на языке пользователя. Кратко и ясно.'
      },
      { role: 'user', content: String(userText || '') }
    ];

    const reply = await this.engine.chat.completions.create({
      messages,
      temperature: 0.7,
      max_tokens: 768
    });

    const choice = reply && reply.choices && reply.choices[0];
    const content =
      choice && choice.message && choice.message.content
        ? choice.message.content
        : '';
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
      cdn: this.cdnUsed,
      tried: this.tried.slice()
    };
  }
}

export default WebLLMBridge;
