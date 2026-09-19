/**
 * AKSI MATRIX — Bonsai 2 27B ternary bridge (in-page embed)
 *
 * Ternary {-1,0,+1} PrismML (Qwen3.8-27B), ~5.9 GB.
 * Official browser runtime lives in webml-community WebGPU Space (custom WGSL kernels).
 * There is no public npm SDK — so MATRIX hosts the Space as a same-page iframe.
 * Inference still runs on the user's GPU; UI stays on milana808.github.io.
 *
 * Flow: prepare() → OPFS probe → mountEmbed() → generate() builds HRR prompt,
 * copies to clipboard, focuses embed so user pastes / chats without leaving the site.
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
    this._iframe = null;
    this._host = null;
  }

  static hasWebGPU() {
    return !!(typeof navigator !== 'undefined' && navigator.gpu);
  }

  async prepare(onProgress) {
    if (this.loading) throw new Error('Bonsai prepare already running');
    this.loading = true;
    this.lastError = null;
    this.progress = 0;
    this.progressText = 'probe WebGPU + storage';

    try {
      if (!BonsaiBridge.hasWebGPU()) {
        throw new Error(
          'WebGPU required. Open Chrome/Edge, enable GPU, use HTTPS or localhost.'
        );
      }
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) throw new Error('GPU adapter null');
      } catch (e) {
        throw new Error('WebGPU adapter: ' + (e.message || e));
      }
      if (onProgress) onProgress({ progress: 0.25, text: 'WebGPU OK' });

      const avail = await this.cache.available();
      if (onProgress) onProgress({ progress: 0.55, text: 'storage: ' + avail.kind });

      this.isPrepared = true;
      this.isLoaded = true;
      this.progress = 1;
      this.progressText = 'ready · embed WebGPU runtime';
      this.loading = false;
      if (onProgress) onProgress({ progress: 1, text: this.progressText });
      return this.status();
    } catch (e) {
      this.loading = false;
      this.isPrepared = false;
      this.isLoaded = false;
      this.lastError = String(e.message || e);
      throw e;
    }
  }

  mountEmbed(hostEl) {
    if (!hostEl) return null;
    this._host = hostEl;
    hostEl.innerHTML = '';
    hostEl.style.position = 'relative';
    hostEl.style.minHeight = '420px';
    hostEl.style.background = '#05050a';
    hostEl.style.border = '1px solid #cfc6b6';
    hostEl.style.borderRadius = '4px';
    hostEl.style.overflow = 'hidden';

    const bar = document.createElement('div');
    bar.style.cssText =
      'display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;background:#1a1814;color:#ebe4d7;font:11px/1.3 ui-monospace,monospace';
    bar.innerHTML =
      '<span>Bonsai 2 27B · WebGPU runtime (локальный GPU)</span>' +
      '<span style="opacity:.6">веса ~5.9 GB с HF CDN</span>';
    hostEl.appendChild(bar);

    const iframe = document.createElement('iframe');
    iframe.src = this.spaceUrl;
    iframe.title = 'Ternary Bonsai 2 27B WebGPU';
    iframe.allow = 'webgpu; accelerometer; clipboard-read; clipboard-write';
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.style.cssText =
      'display:block;width:100%;height:min(62vh,560px);border:0;background:#05050a';
    hostEl.appendChild(iframe);

    const tip = document.createElement('div');
    tip.style.cssText =
      'padding:8px 10px;font:12px/1.4 system-ui,sans-serif;color:#6b6560;background:#f7f3ea';
    tip.textContent =
      'Инференс на твоём GPU. Промпт с HRR копируется в буфер — вставь в чат рантайма ниже. Не уходишь с сайта.';
    hostEl.appendChild(tip);

    this._iframe = iframe;
    this.isLoaded = true;
    return iframe;
  }

  unmountEmbed() {
    if (this._host) {
      this._host.innerHTML = '';
    }
    this._iframe = null;
    this._host = null;
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

  async generate(userText, opts) {
    const hrrHits = opts && opts.context
      ? String(opts.context)
          .split('\n')
          .filter(Boolean)
          .map((t) => ({ text: t }))
      : opts && opts.hits
        ? opts.hits
        : [];
    const prompt = this.buildPrompt(userText, hrrHits);
    this.lastPrompt = prompt;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(prompt);
      }
    } catch (e) {}

    if (opts && opts.hostEl) {
      this.mountEmbed(opts.hostEl);
    } else if (this._host && !this._iframe) {
      this.mountEmbed(this._host);
    }

    if (this._iframe) {
      try {
        this._iframe.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch (e) {}
    }

    return (
      '✓ Промпт с HRR-контекстом скопирован в буфер обмена.\n' +
      '↓ Вставь его в чат Bonsai runtime (панель ниже) и отправь.\n' +
      'Инференс 27B ternary идёт на твоём GPU прямо на этой странице.\n\n' +
      '— prompt preview —\n' +
      prompt.slice(0, 900) +
      (prompt.length > 900 ? '\n…' : '')
    );
  }

  openExternal() {
    window.open(this.spaceUrl, '_blank', 'noopener,noreferrer');
    return this.spaceUrl;
  }

  status() {
    return {
      provider: 'bonsai-prismml',
      id: BONSAI_ARTIFACTS.id,
      name: 'Bonsai 2 27B Ternary',
      ready: this.isPrepared,
      loaded: this.isLoaded,
      loading: this.loading,
      progress: this.progress,
      progressText: this.progressText,
      error: this.lastError,
      diskGB: BONSAI_ARTIFACTS.sizeGB,
      space: this.spaceUrl,
      embedded: !!this._iframe,
      note:
        'In-page iframe of official WebGPU Space. Weights from HF CDN → local GPU. No MLC/WebLLM.'
    };
  }
}

export default BonsaiBridge;
