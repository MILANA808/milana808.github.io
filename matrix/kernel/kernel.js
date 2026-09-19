/**
 * AKSI MATRIX — Core Kernel
 * Central event hub, hardware probe, IndexedDB vault, lifecycle orchestrator.
 */
import { QuantumRouter } from '../quantum/router.js';
import { Exocortex } from '../exocortex/hrr.js';
import { TrustVault } from '../crypto/vault.js';
import { WebLLMBridge } from '../llm/webllm-bridge.js';

const DB_NAME = 'aksi_matrix_vault';
const DB_VERSION = 1;
const STORES = ['memory_chunks', 'secure_state', 'event_log'];

export class AksiKernel {
  constructor() {
    this.version = '1.1.0-matrix';
    this.ready = false;
    this.capabilities = {
      webgpu: false,
      indexedDB: typeof indexedDB !== 'undefined',
      webCrypto: !!(globalThis.crypto && crypto.subtle),
      storageEstimate: null
    };
    this.state = { bootAt: null, lastEvent: null, memoryCount: 0, sealed: false, status: 'cold' };
    this._subs = new Set();
    this._db = null;
    this.router = null;
    this.exocortex = null;
    this.vault = null;
    this.llm = null;
    this.llmPrefer = false;
  }

  subscribe(fn) {
    if (typeof fn !== 'function') return () => {};
    this._subs.add(fn);
    return () => this._subs.delete(fn);
  }

  emit(type, payload) {
    const evt = { type: String(type), payload: payload === undefined ? null : payload, at: new Date().toISOString() };
    this.state.lastEvent = evt;
    this._subs.forEach((fn) => { try { fn(evt); } catch (e) {} });
    return evt;
  }

  async probeHardware() {
    this.emit('probe:start', null);
    try {
      if (navigator.gpu) {
        const adapter = await navigator.gpu.requestAdapter();
        this.capabilities.webgpu = !!adapter;
      }
    } catch (e) { this.capabilities.webgpu = false; }
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        this.capabilities.storageEstimate = { usage: est.usage || 0, quota: est.quota || 0 };
      }
    } catch (e) { this.capabilities.storageEstimate = null; }
    this.emit('probe:done', { ...this.capabilities });
    return this.capabilities;
  }

  openDB() {
    return new Promise((resolve, reject) => {
      if (!this.capabilities.indexedDB) { reject(new Error('IndexedDB unavailable')); return; }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => reject(req.error || new Error('IDB open failed'));
      req.onupgradeneeded = () => {
        const db = req.result;
        STORES.forEach((name) => {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath: 'id', autoIncrement: name === 'event_log' });
            if (name === 'memory_chunks') {
              store.createIndex('by_tag', 'tag', { unique: false });
              store.createIndex('by_ts', 'ts', { unique: false });
            }
          }
        });
      };
      req.onsuccess = () => { this._db = req.result; resolve(this._db); };
    });
  }

  idbPut(storeName, record) {
    return new Promise((resolve, reject) => {
      if (!this._db) { reject(new Error('DB not open')); return; }
      const tx = this._db.transaction(storeName, 'readwrite');
      const r = tx.objectStore(storeName).put(record);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }

  idbGetAll(storeName) {
    return new Promise((resolve, reject) => {
      if (!this._db) { reject(new Error('DB not open')); return; }
      const r = this._db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
      r.onsuccess = () => resolve(r.result || []);
      r.onerror = () => reject(r.error);
    });
  }

  idbClear(storeName) {
    return new Promise((resolve, reject) => {
      if (!this._db) { reject(new Error('DB not open')); return; }
      const r = this._db.transaction(storeName, 'readwrite').objectStore(storeName).clear();
      r.onsuccess = () => resolve(true);
      r.onerror = () => reject(r.error);
    });
  }

  async boot() {
    this.state.status = 'booting';
    this.state.bootAt = new Date().toISOString();
    this.emit('boot:start', { version: this.version });
    await this.probeHardware();
    if (!this.capabilities.webCrypto) this.emit('boot:warn', { msg: 'Web Crypto missing — vault limited' });
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
    this.llm = new WebLLMBridge();
    await this.exocortex.init();
    this.state.memoryCount = await this.exocortex.count();
    this.ready = true;
    this.state.status = 'ready';
    this.emit('boot:ready', { version: this.version, capabilities: this.capabilities, memoryCount: this.state.memoryCount });
    return this;
  }

  async loadLocalLLM(onProgress) {
    if (!this.llm) this.llm = new WebLLMBridge();
    this.emit('llm:load_start', { model: this.llm.model });
    try {
      await this.llm.load(onProgress);
      this.llmPrefer = true;
      this.emit('llm:load_done', this.llm.status());
      return this.llm.status();
    } catch (e) {
      this.emit('llm:load_error', { error: String(e.message || e) });
      throw e;
    }
  }

  setLLMPrefer(on) {
    this.llmPrefer = !!on;
    this.emit('llm:prefer', { on: this.llmPrefer });
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
      text = hits.map((h, i) => (i + 1) + '. ' + h.text).join('\n');
      source = 'hrr';
    } else if (gate.weights.Safe_Gate_Weight > 0.55 && hits.length === 0) {
      text = 'Safe Gate: недостаточно локального знания. Добавьте факт: запомни: …';
      source = 'safe_gate';
    } else {
      text = hits.length > 0 ? hits.map((h) => h.text).join('\n') : 'Локальный контур не нашёл ассоциаций. Напишите: запомни: ваш факт';
      source = hits.length ? 'hrr_low' : 'empty_memory';
    }
    if (this.llm && this.llm.isLoaded && (this.llmPrefer || gate.weights.Deep_LLM_Weight >= 0.35)) {
      try {
        this.emit('ask:llm_start', null);
        const context = hits.length ? hits.map((h) => h.text).join('\n').slice(0, 1200) : '';
        const prompt = context ? ('Контекст из локальной памяти:\n' + context + '\n\nВопрос: ' + q) : q;
        const gen = await this.llm.generate(prompt);
        if (gen) { text = gen; source = 'webllm'; }
        this.emit('ask:llm_done', { chars: (gen || '').length });
      } catch (e) {
        this.emit('ask:llm_error', { error: String(e.message || e) });
      }
    } else if (gate.weights.Deep_LLM_Weight > 0.45 && this.capabilities.webgpu && !(this.llm && this.llm.isLoaded)) {
      this.emit('ask:deep_hook', { note: 'WebGPU present — load Local LLM for on-device generation' });
    }
    const result = { text, source, gate, hits: hits.map((h) => ({ id: h.id, score: h.score, text: h.text.slice(0, 120) })), at: new Date().toISOString() };
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

  getStatus() {
    return {
      version: this.version,
      ready: this.ready,
      status: this.state.status,
      bootAt: this.state.bootAt,
      memoryCount: this.state.memoryCount,
      capabilities: this.capabilities,
      lastEvent: this.state.lastEvent,
      llm: this.llm ? this.llm.status() : null
    };
  }
}

export default AksiKernel;
