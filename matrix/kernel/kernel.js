/**
 * AKSI MATRIX — Core Kernel v1.2
 * Central event hub, hardware probe, IndexedDB vault, dual LLM providers
 * (WebLLM micro + Bonsai 2 27B ternary), HRR context → prompt.
 */
import { QuantumRouter } from '../quantum/router.js';
import { Exocortex } from '../exocortex/hrr.js';
import { TrustVault } from '../crypto/vault.js';
import { WebLLMBridge } from '../llm/webllm-bridge.js';
import { BonsaiBridge } from '../llm/bonsai-bridge.js';

const DB_NAME = 'aksi_matrix_vault';
const DB_VERSION = 1;
const STORES = ['memory_chunks', 'secure_state', 'event_log'];

export class AksiKernel {
  constructor() {
    this.version = '1.2.0-matrix';
    this.ready = false;
    this.capabilities = {
      webgpu: false,
      indexedDB: typeof indexedDB !== 'undefined',
      webCrypto: !!(globalThis.crypto && crypto.subtle),
      storageEstimate: null
    };
    this.state = {
      bootAt: null,
      lastEvent: null,
      memoryCount: 0,
      sealed: false,
      status: 'cold',
      llmProvider: 'webllm'
    };
    this._subs = new Set();
    this._db = null;
    this.router = null;
    this.exocortex = null;
    this.vault = null;
    this.llm = null;
    this.webllm = null;
    this.bonsai = null;
    this.llmPrefer = false;
  }

  subscribe(fn) {
    if (typeof fn !== 'function') return () => {};
    this._subs.add(fn);
    return () => this._subs.delete(fn);
  }

  emit(type, payload) {
    const evt = {
      type: String(type),
      payload: payload === undefined ? null : payload,
      at: new Date().toISOString()
    };
    this.state.lastEvent = evt;
    this._subs.forEach((fn) => {
      try { fn(evt); } catch (e) {}
    });
    return evt;
  }

  async probeHardware() {
    this.emit('probe:start', null);
    try {
      if (navigator.gpu) {
        const adapter = await navigator.gpu.requestAdapter();
        this.capabilities.webgpu = !!adapter;
      }
    } catch (e) {
      this.capabilities.webgpu = false;
    }
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        this.capabilities.storageEstimate = { usage: est.usage || 0, quota: est.quota || 0 };
      }
    } catch (e) {
      this.capabilities.storageEstimate = null;
    }
    this.emit('probe:done', { ...this.capabilities });
    return this.capabilities;
  }

  openDB() {
    return new Promise((resolve, reject) => {
      if (!this.capabilities.indexedDB) {
        reject(new Error('IndexedDB unavailable'));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => reject(req.error || new Error('IDB open failed'));
      req.onupgradeneeded = () => {
        const db = req.result;
        STORES.forEach((name) => {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, {
              keyPath: 'id',
              autoIncrement: name === 'event_log'
            });
            if (name === 'memory_chunks') {
              store.createIndex('by_tag', 'tag', { unique: false });
              store.createIndex('by_ts', 'ts', { unique: false });
            }
          }
        });
      };
      req.onsuccess = () => {
        this._db = req.result;
        resolve(this._db);
      };
    });
  }

  idbPut(storeName, record) {
    return new Promise((resolve, reject) => {
      if (!this._db) { reject(new Error('DB not open')); return; }
      const tx = this._db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const r = store.put(record);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }

  idbGetAll(storeName) {
    return new Promise((resolve, reject) => {
      if (!this._db) { reject(new Error('DB not open')); return; }
      const tx = this._db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const r = store.getAll();
      r.onsuccess = () => resolve(r.result || []);
      r.onerror = () => reject(r.error);
    });
  }

  idbClear(storeName) {
    return new Promise((resolve, reject) => {
      if (!this._db) { reject(new Error('DB not open')); return; }
      const tx = this._db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const r = store.clear();
      r.onsuccess = () => resolve(true);
      r.onerror = () => reject(r.error);
    });
  }

  async boot() {
    this.state.status = 'booting';
    this.state.bootAt = new Date().toISOString();
    this.emit('boot:start', { version: this.version });
    await this.probeHardware();
    if (!this.capabilities.webCrypto) {
      this.emit('boot:warn', { msg: 'Web Crypto missing — vault limited' });
    }
    try {
      await this.openDB();
      this.emit('boot:db', { name: DB_NAME });
    } catch (e) {
      this.state.status = 'error';
      this.emit('boot:error', { stage: 'db', error: String(e.message || e) });
      throw e;
    }
    this.router = new QuantumRouter();
    this.exocortex = new Exocortex(this);
    this.vault = new TrustVault(this);
    this.webllm = new WebLLMBridge();
    this.bonsai = new BonsaiBridge();
    this.llm = this.webllm;
    this.state.llmProvider = 'webllm';
    await this.exocortex.init();
    this.state.memoryCount = await this.exocortex.count();
    this.ready = true;
    this.state.status = 'ready';
    this.emit('boot:ready', {
      version: this.version,
      capabilities: this.capabilities,
      memoryCount: this.state.memoryCount,
      providers: ['webllm', 'bonsai']
    });
    return this;
  }

  setLLMProvider(name) {
    const n = String(name || '').toLowerCase();
    if (n === 'bonsai') {
      if (!this.bonsai) this.bonsai = new BonsaiBridge();
      this.llm = this.bonsai;
      this.state.llmProvider = 'bonsai';
    } else {
      if (!this.webllm) this.webllm = new WebLLMBridge();
      this.llm = this.webllm;
      this.state.llmProvider = 'webllm';
    }
    this.emit('llm:provider', { provider: this.state.llmProvider });
    return this.state.llmProvider;
  }

  async ask(queryText) {
    if (!this.ready) throw new Error('Kernel not ready');
    const q = String(queryText || '').trim();
    if (!q) return { text: '', gate: null, source: 'empty' };
    this.emit('ask:start', { q });
    const vector = this.router.textToState(q);
    this.emit('ask:vector', { dim: vector.length, sample: Array.from(vector.slice(0, 8)) });
    const transformed = this.router.applyCircuit(vector, q);
    this.emit('ask:circuit', { dim: transformed.length });
    const gate = this.router.answerGate(transformed, q);
    this.emit('ask:gate', gate);
    const hits = await this.exocortex.recall(q, 5);
    this.emit('ask:recall', { hits: hits.length });
    let text, source;
    if (hits.length && gate.weights.Local_RAG_Weight >= 0.28) {
      text = hits.map((h, i) => i + 1 + '. ' + h.text).join('\n');
      source = 'hrr';
    } else if (gate.weights.Safe_Gate_Weight > 0.55 && hits.length === 0) {
      text = 'Safe Gate: недостаточно локального знания. Добавьте факт: запомни: …';
      source = 'safe_gate';
    } else {
      text = hits.length > 0
        ? hits.map((h) => h.text).join('\n')
        : 'Локальный контур не нашёл ассоциаций. Напишите: запомни: ваш факт';
      source = hits.length ? 'hrr_low' : 'empty_memory';
    }

    const wantLLM =
      this.llmPrefer ||
      gate.weights.Deep_LLM_Weight >= 0.35 ||
      (this.state.llmProvider === 'bonsai' && this.bonsai && this.bonsai.isLoaded);

    if (wantLLM && this.llm && this.llm.isLoaded) {
      try {
        this.emit('ask:llm_start', { provider: this.state.llmProvider });
        const context = hits.length ? hits.map((h) => h.text).join('\n').slice(0, 4000) : '';
        let gen;
        if (this.state.llmProvider === 'bonsai' && this.bonsai) {
          gen = await this.bonsai.generate(q, { context, openSpace: true });
          source = 'bonsai';
        } else {
          const prompt = context
            ? 'Контекст из локальной памяти:\n' + context + '\n\nВопрос: ' + q
            : q;
          gen = await this.webllm.generate(prompt);
          source = 'webllm';
        }
        if (gen) text = gen;
        this.emit('ask:llm_done', {
          chars: (gen || '').length,
          provider: this.state.llmProvider
        });
      } catch (e) {
        this.emit('ask:llm_error', {
          error: String(e.message || e),
          provider: this.state.llmProvider
        });
      }
    } else if (gate.weights.Deep_LLM_Weight > 0.45 && this.capabilities.webgpu) {
      this.emit('ask:deep_hook', {
        note:
          this.state.llmProvider === 'bonsai'
            ? 'Prepare Bonsai 2 27B (OPFS + WebGPU Space)'
            : 'Load Local LLM (micro WebLLM) for on-device generation'
      });
    }

    const result = {
      text,
      source,
      gate,
      hits: hits.map((h) => ({ id: h.id, score: h.score, text: h.text.slice(0, 120) })),
      provider: this.state.llmProvider,
      at: new Date().toISOString()
    };
    this.emit('ask:done', result);
    return result;
  }

  async remember(text, tag) {
    if (!this.ready) throw new Error('Kernel not ready');
    const t = String(text || '').trim();
    if (!t) return null;
    const rec = await this.exocortex.store(t, tag || 'fact');
    this.state.memoryCount = await this.exocortex.count();
    this.emit('memory:store', { id: rec.id, tag: rec.tag });
    return rec;
  }

  async exportCapsule(password) {
    if (!this.ready) throw new Error('Kernel not ready');
    const blob = await this.vault.exportEncrypted(password);
    this.emit('vault:export', { bytes: blob.size });
    return blob;
  }

  async importCapsule(fileOrBuffer, password) {
    if (!this.ready) throw new Error('Kernel not ready');
    const n = await this.vault.importEncrypted(fileOrBuffer, password);
    this.state.memoryCount = await this.exocortex.count();
    this.emit('vault:import', { restored: n });
    return n;
  }

  async loadLocalLLM(onProgress) {
    this.setLLMProvider('webllm');
    if (!this.webllm) this.webllm = new WebLLMBridge();
    this.llm = this.webllm;
    this.emit('llm:load_start', { model: this.webllm.model, provider: 'webllm' });
    try {
      await this.webllm.load(onProgress);
      this.llmPrefer = true;
      this.emit('llm:load_done', this.webllm.status());
      return this.webllm.status();
    } catch (e) {
      this.emit('llm:load_error', { error: String(e.message || e), provider: 'webllm' });
      throw e;
    }
  }

  async prepareBonsai(onProgress) {
    this.setLLMProvider('bonsai');
    if (!this.bonsai) this.bonsai = new BonsaiBridge();
    this.llm = this.bonsai;
    this.emit('llm:load_start', { model: 'Ternary-Bonsai-2-27B', provider: 'bonsai' });
    try {
      const st = await this.bonsai.prepare(onProgress);
      this.llmPrefer = true;
      this.emit('llm:load_done', st);
      return st;
    } catch (e) {
      this.emit('llm:load_error', { error: String(e.message || e), provider: 'bonsai' });
      throw e;
    }
  }

  setLLMPrefer(on) {
    this.llmPrefer = !!on;
    this.emit('llm:prefer', { on: this.llmPrefer });
  }

  getStatus() {
    return {
      version: this.version,
      ready: this.ready,
      status: this.state.status,
      bootAt: this.state.bootAt,
      memoryCount: this.state.memoryCount,
      capabilities: this.capabilities,
      lastEvent: this.state.lastEvent,
      llmProvider: this.state.llmProvider,
      llm: this.llm ? this.llm.status() : null,
      webllm: this.webllm ? this.webllm.status() : null,
      bonsai: this.bonsai ? this.bonsai.status() : null
    };
  }
}

export default AksiKernel;
