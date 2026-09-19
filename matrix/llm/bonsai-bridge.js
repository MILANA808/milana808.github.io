/**
 * AKSI MATRIX — Bonsai 2 27B ternary bridge
 *
 * Ternary weights {-1,0,+1} from PrismML (Qwen3.8-27B base), ~5.9 GB PTQ1_0.
 * Not loadable via standard WebLLM/MLC — requires PrismML WebGPU kernels.
 *
 * Browser path:
 *  1) OPFS prep / cache for weight shards
 *  2) External WebGPU Space runner (webml-community/ternary-bonsai-2-webgpu-kernels)
 *  3) HRR context injected into the prompt before hand-off
 */

import { OPFSWeightCache } from './opfs-cache.js';

export const BONSAI_WEBGPU_SPACE =
  'https://huggingface.co/spaces/webml-community/ternary-bonsai-2-webgpu-kernels';

export const BONSAI_ARTIFACTS = {
  id: 'Ternary-Bonsai-2-27B',
  family: 'bonsai2',
  bits: 1.76,
  params: '27B',
  sizeGB: 5.93,
  format: 'ternary-g128-PTQ1_0',
  repo: 'prism-ml/Ternary-Bonsai-2-27B-gguf',
  ggufCandidates: [],
  docs: 'https://docs.prismml.com/bonsai-2-27b',
  collection: 'https://huggingface.co/collections/prism-ml/bonsai-2'
};

export class BonsaiBridge {
  constructor() {
    this.isPrepared = false;
    this.isLoaded = false;
    this.loading = false;
    this.model = BONSAI_ARTIFACTS.id;
    this.progress = 0;
    this.progressText = '';
    this.lastError = null;
    this.cache = new OPFSWeightCache('bonsai2-27b');
    this.spaceUrl = BONSAI_WEBGPU_SPACE;
    this.lastPrompt = null;
    this.provider = 'bonsai';
  }

  static hasWebGPU() {
    return !!(typeof navigator !== 'undefined' && navigator.gpu);
  }

  async prepare(onProgress) {
    if (this.loading) throw new Error('Bonsai prepare already running');
    this.loading = true;
    this.lastError = null;
    this.progress = 0;
    this.progressText = 'probe storage';

    try {
      if (!BonsaiBridge.hasWebGPU()) {
        throw new Error(
          'WebGPU required for Bonsai 2 27B. Use Chrome/Edge with GPU enabled.'
        );
      }

      const avail = await this.cache.available();
      if (onProgress) onProgress({ progress: 0.1, text: 'storage: ' + avail.kind });

      if (!avail.ok) {
        throw new Error('OPFS and Cache API unavailable — cannot cache ~5.9 GB weights');
      }

      let quotaNote = '';
      try {
        if (navigator.storage && navigator.storage.estimate) {
          const est = await navigator.storage.estimate();
          const free = (est.quota || 0) - (est.usage || 0);
          quotaNote = ' free≈' + Math.round(free / 1e9) + ' GB';
          if (free > 0 && free < 6.5e9) {
            this.progressText = 'warning: storage may be tight' + quotaNote;
            if (onProgress) onProgress({ progress: 0.2, text: this.progressText });
          }
        }
      } catch (e) {}

      this.progress = 0.35;
      this.progressText = 'OPFS ready · ternary 27B path';
      if (onProgress) onProgress({ progress: this.progress, text: this.progressText + quotaNote });

      const manifest = {
        model: this.model,
        preparedAt: new Date().toISOString(),
        sizeGB: BONSAI_ARTIFACTS.sizeGB,
        format: BONSAI_ARTIFACTS.format,
        space: this.spaceUrl,
        storage: avail.kind
      };
      const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
      await this.cache.put('manifest.json', blob, (p) => {
        this.progress = 0.35 + (p.progress || 0) * 0.4;
        this.progressText = p.text || 'write manifest';
        if (onProgress) onProgress({ progress: this.progress, text: this.progressText });
      });

      this.progress = 0.9;
      this.progressText = 'Bonsai path prepared · open WebGPU Space to run 27B';
      if (onProgress) onProgress({ progress: this.progress, text: this.progressText });

      this.isPrepared = true;
      this.isLoaded = true;
      this.progress = 1;
      this.progressText = 'Bonsai 2 27B ready (WebGPU Space + OPFS)';
      if (onProgress) onProgress({ progress: 1, text: this.progressText });

      return this.status();
    } catch (e) {
      this.lastError = String(e.message || e);
      this.isPrepared = false;
      this.isLoaded = false;
      throw e;
    } finally {
      this.loading = false;
    }
  }

  buildPrompt(query, contextText) {
    const q = String(query || '').trim();
    const ctx = String(contextText || '').trim().slice(0, 6000);
    let prompt;
    if (ctx) {
      prompt =
        'Ты — локальный контур АКСИ MATRIX с доступом к запечатанной памяти пользователя.\n' +
        'Используй только релевантный контекст. Отвечай по существу.\n\n' +
        '=== ЛОКАЛЬНЫЙ КОНТЕКСТ (HRR) ===\n' +
        ctx +
        '\n=== КОНЕЦ КОНТЕКСТА ===\n\n' +
        'Вопрос: ' +
        q;
    } else {
      prompt = q;
    }
    this.lastPrompt = prompt;
    return prompt;
  }

  async generate(promptOrQuery, options) {
    const opts = options || {};
    const context = opts.context || '';
    const openSpace = opts.openSpace !== false;

    if (!this.isPrepared && !this.isLoaded) {
      throw new Error('Сначала Prepare Bonsai (OPFS + WebGPU path)');
    }

    const prompt = this.buildPrompt(promptOrQuery, context);
    this.progressText = 'prompt sealed · ' + prompt.length + ' chars';

    if (openSpace && typeof window !== 'undefined') {
      try {
        window.open(this.spaceUrl, '_blank', 'noopener,noreferrer');
      } catch (e) {}
    }

    return (
      '[Bonsai 2 27B · ternary WebGPU]\n' +
      'Промпт с HRR-контекстом подготовлен (' +
      prompt.length +
      ' символов).\n' +
      'Открыт официальный WebGPU runner PrismML.\n' +
      'Вставьте промпт в Space для генерации на 27B ternary kernels.\n\n' +
      '--- prompt preview ---\n' +
      prompt.slice(0, 900) +
      (prompt.length > 900 ? '\n…' : '')
    );
  }

  getLastPrompt() {
    return this.lastPrompt;
  }

  openSpace() {
    if (typeof window !== 'undefined') {
      window.open(this.spaceUrl, '_blank', 'noopener,noreferrer');
    }
    return this.spaceUrl;
  }

  status() {
    return {
      loaded: this.isLoaded,
      prepared: this.isPrepared,
      loading: this.loading,
      model: this.model,
      progress: this.progress,
      progressText: this.progressText,
      error: this.lastError,
      webgpu: BonsaiBridge.hasWebGPU(),
      provider: 'bonsai',
      sizeGB: BONSAI_ARTIFACTS.sizeGB,
      format: BONSAI_ARTIFACTS.format,
      space: this.spaceUrl,
      cache: this.cache.status()
    };
  }
}

export default BonsaiBridge;
