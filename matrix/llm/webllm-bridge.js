/**
 * AKSI MATRIX — WebLLM bridge (optional, opt-in)
 * Correct MLC API via esm.sh. Requires WebGPU.
 */

const DEFAULT_MODEL = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
const WEBLLM_CDN = 'https://esm.sh/@mlc-ai/web-llm@0.2.85';

export class WebLLMBridge {
  constructor() {
    this.engine = null;
    this.isLoaded = false;
    this.loading = false;
    this.model = DEFAULT_MODEL;
    this.lastError = null;
    this.progress = 0;
    this.progressText = '';
  }

  static hasWebGPU() {
    return !!(typeof navigator !== 'undefined' && navigator.gpu);
  }

  async load(onProgress, modelId) {
    if (this.isLoaded && this.engine) return this.engine;
    if (this.loading) throw new Error('Load already in progress');
    if (!WebLLMBridge.hasWebGPU()) {
      throw new Error('WebGPU not available — use Chrome/Edge with GPU');
    }

    this.loading = true;
    this.lastError = null;
    this.model = modelId || DEFAULT_MODEL;

    try {
      const webllm = await import(WEBLLM_CDN);
      const CreateMLCEngine = webllm.CreateMLCEngine;
      if (typeof CreateMLCEngine !== 'function') {
        throw new Error('CreateMLCEngine not found in @mlc-ai/web-llm export');
      }

      this.engine = await CreateMLCEngine(this.model, {
        initProgressCallback: (report) => {
          const progress = typeof report.progress === 'number' ? report.progress : 0;
          const text = report.text || '';
          this.progress = progress;
          this.progressText = text;
          if (typeof onProgress === 'function') onProgress({ progress, text });
        }
      });

      this.isLoaded = true;
      this.loading = false;
      return this.engine;
    } catch (e) {
      this.loading = false;
      this.isLoaded = false;
      this.engine = null;
      this.lastError = String(e.message || e);
      throw e;
    }
  }

  async generate(userText, systemPrompt) {
    if (!this.engine || !this.isLoaded) {
      throw new Error('WebLLM not loaded — call load() first');
    }
    const messages = [
      {
        role: 'system',
        content:
          systemPrompt ||
          'Ты — суверенный локальный ИИ ядра AKSI MATRIX. Отвечай кратко и по делу на языке пользователя. Не выдумывай доступ к серверам.'
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
      webgpu: WebLLMBridge.hasWebGPU()
    };
  }
}

export default WebLLMBridge;
