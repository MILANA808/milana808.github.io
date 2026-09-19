/**
 * AKSI MATRIX — Bonsai 2 27B (PrismML ternary) integration
 * NOT WebLLM: requires PrismML/webml-community WebGPU kernels.
 */
import { OpfsWeightCache } from './opfs-cache.js';

export const BONSAI_META = {
  id: 'bonsai2-27b-ternary',
  name: 'Bonsai 2 27B (Ternary)',
  params: '27B',
  weights: '{-1,0,+1} + FP16 group scales',
  diskGB: 5.93,
  format: 'GGUF PTQ1_0 / PrismML kernels',
  hfGguF: 'https://huggingface.co/prism-ml/Ternary-Bonsai-2-27B-gguf',
  webgpuSpace: 'https://huggingface.co/spaces/webml-community/bonsai-webgpu-kernels',
  docs: 'https://docs.prismml.com/bonsai-2-27b',
  license: 'Apache-2.0'
};

export class BonsaiBridge {
  constructor() {
    this.selected = false;
    this.loading = false;
    this.ready = false;
    this.progress = 0;
    this.progressText = '';
    this.lastError = null;
    this.cache = new OpfsWeightCache();
    this.meta = BONSAI_META;
  }

  async prepare(onProgress) {
    this.loading = true;
    this.lastError = null;
    try {
      const backend = await this.cache.init();
      if (onProgress) onProgress({ progress: 0.3, text: 'cache backend: ' + backend });
      const est = await this.cache.estimate();
      if (onProgress) {
        onProgress({
          progress: 0.6,
          text: est ? 'quota ' + Math.round((est.quota || 0) / 1e9) + ' GB' : 'quota n/a'
        });
      }
      this.ready = true;
      this.progress = 1;
      this.progressText = 'armed · use WebGPU space for 27B';
      this.loading = false;
      if (onProgress) onProgress({ progress: 1, text: this.progressText });
      return this.status();
    } catch (e) {
      this.loading = false;
      this.ready = false;
      this.lastError = String(e.message || e);
      throw e;
    }
  }

  openWebGpuRunner() {
    window.open(BONSAI_META.webgpuSpace, '_blank', 'noopener,noreferrer');
  }

  buildPrompt(userText, hrrHits) {
    const ctx =
      hrrHits && hrrHits.length
        ? hrrHits
            .map((h, i) => i + 1 + '. ' + (h.text || h))
            .join('\n')
            .slice(0, 4000)
        : '';
    if (!ctx) return String(userText || '');
    return (
      'Контекст из локальной памяти AKSI (HRR):\n' +
      ctx +
      '\n\nВопрос пользователя:\n' +
      String(userText || '')
    );
  }

  async generate(userText, hrrHits) {
    if (!this.ready) {
      throw new Error('Сначала Prepare Bonsai (OPFS) или откройте WebGPU Space');
    }
    const prompt = this.buildPrompt(userText, hrrHits);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(prompt);
      }
    } catch (e) {}
    this.openWebGpuRunner();
    return (
      'Bonsai 2 27B не исполняется внутри MATRIX через WebLLM.\n' +
      'Нужны ядра PrismML (ternary + Hadamard).\n\n' +
      '1) Промпт с HRR-контекстом скопирован в буфер (если разрешено).\n' +
      '2) Открыт WebGPU Space: ' +
      BONSAI_META.webgpuSpace +
      '\n\nВеса ~' +
      BONSAI_META.diskGB +
      ' GB · ' +
      BONSAI_META.hfGguF
    );
  }

  status() {
    return {
      provider: 'bonsai-prismml',
      id: BONSAI_META.id,
      name: BONSAI_META.name,
      ready: this.ready,
      loading: this.loading,
      progress: this.progress,
      progressText: this.progressText,
      error: this.lastError,
      diskGB: BONSAI_META.diskGB,
      webgpuSpace: BONSAI_META.webgpuSpace,
      note: 'Requires PrismML WebGPU/native kernels — not MLC WebLLM'
    };
  }
}

export default BonsaiBridge;
