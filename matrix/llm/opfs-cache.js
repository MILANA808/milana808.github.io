/**
 * AKSI MATRIX — OPFS / Cache API weight cache
 * Chunked storage for multi-GB ternary models (Bonsai 2 27B ~5.9 GB).
 * Falls back to Cache API when OPFS is unavailable.
 * Never holds the full model in JS heap.
 */

const ROOT_DIR = 'aksi-matrix-weights';
const META_KEY = '__meta__';
const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MiB chunks

function hasOPFS() {
  return !!(typeof navigator !== 'undefined' && navigator.storage && navigator.storage.getDirectory);
}

function hasCacheAPI() {
  return typeof caches !== 'undefined';
}

async function getRoot() {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(ROOT_DIR, { create: true });
}

async function getFileHandle(dir, name, create) {
  return dir.getFileHandle(name, { create: !!create });
}

export class OPFSWeightCache {
  constructor(namespace) {
    this.ns = String(namespace || 'default').replace(/[^a-zA-Z0-9._-]/g, '_');
    this.progress = 0;
    this.progressText = '';
    this.lastError = null;
  }

  _prefix(name) {
    return this.ns + '__' + name;
  }

  async available() {
    if (hasOPFS()) return { kind: 'opfs', ok: true };
    if (hasCacheAPI()) return { kind: 'cache-api', ok: true };
    return { kind: 'none', ok: false };
  }

  async _writeOPFS(name, blob, onProgress) {
    const dir = await getRoot();
    const total = blob.size || 0;
    const metaName = this._prefix(name + META_KEY);
    const metaHandle = await getFileHandle(dir, metaName, true);
    const metaWritable = await metaHandle.createWritable();
    await metaWritable.write(JSON.stringify({
      name,
      size: total,
      chunks: Math.ceil(total / CHUNK_SIZE) || 1,
      updated: new Date().toISOString(),
      ns: this.ns
    }));
    await metaWritable.close();

    let offset = 0;
    let idx = 0;
    const nChunks = Math.max(1, Math.ceil(total / CHUNK_SIZE));
    while (offset < total || (total === 0 && idx === 0)) {
      const end = Math.min(offset + CHUNK_SIZE, total);
      const slice = total ? blob.slice(offset, end) : blob;
      const chunkName = this._prefix(name + '__c' + idx);
      const fh = await getFileHandle(dir, chunkName, true);
      const w = await fh.createWritable();
      await w.write(slice);
      await w.close();
      offset = end;
      idx += 1;
      this.progress = total ? offset / total : 1;
      this.progressText = 'OPFS chunk ' + idx + '/' + nChunks;
      if (onProgress) onProgress({ progress: this.progress, text: this.progressText, bytes: offset, total });
      if (total === 0) break;
    }
    return { kind: 'opfs', bytes: total, chunks: idx };
  }

  async _readOPFS(name) {
    const dir = await getRoot();
    const metaName = this._prefix(name + META_KEY);
    let meta;
    try {
      const mh = await getFileHandle(dir, metaName, false);
      const file = await mh.getFile();
      meta = JSON.parse(await file.text());
    } catch (e) {
      return null;
    }
    const parts = [];
    const n = meta.chunks || 1;
    for (let i = 0; i < n; i++) {
      const chunkName = this._prefix(name + '__c' + i);
      const fh = await getFileHandle(dir, chunkName, false);
      const file = await fh.getFile();
      parts.push(await file.arrayBuffer());
    }
    return new Blob(parts, { type: 'application/octet-stream' });
  }

  async _hasOPFS(name) {
    try {
      const dir = await getRoot();
      await getFileHandle(dir, this._prefix(name + META_KEY), false);
      return true;
    } catch (e) {
      return false;
    }
  }

  async _writeCacheAPI(name, blob, onProgress) {
    const cache = await caches.open('aksi-matrix-weights-v1');
    const url = 'https://aksi.local/weights/' + this._prefix(name);
    const res = new Response(blob, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-AKSI-Size': String(blob.size || 0),
        'X-AKSI-Ns': this.ns
      }
    });
    await cache.put(url, res);
    this.progress = 1;
    this.progressText = 'Cache API stored';
    if (onProgress) onProgress({ progress: 1, text: this.progressText, bytes: blob.size, total: blob.size });
    return { kind: 'cache-api', bytes: blob.size || 0, chunks: 1 };
  }

  async _readCacheAPI(name) {
    const cache = await caches.open('aksi-matrix-weights-v1');
    const url = 'https://aksi.local/weights/' + this._prefix(name);
    const res = await cache.match(url);
    if (!res) return null;
    return res.blob();
  }

  async _hasCacheAPI(name) {
    const cache = await caches.open('aksi-matrix-weights-v1');
    const url = 'https://aksi.local/weights/' + this._prefix(name);
    const res = await cache.match(url);
    return !!res;
  }

  async put(name, data, onProgress) {
    this.lastError = null;
    const blob = data instanceof Blob ? data : new Blob([data]);
    try {
      if (hasOPFS()) return await this._writeOPFS(name, blob, onProgress);
      if (hasCacheAPI()) return await this._writeCacheAPI(name, blob, onProgress);
      throw new Error('No durable storage (OPFS / Cache API)');
    } catch (e) {
      this.lastError = String(e.message || e);
      throw e;
    }
  }

  async get(name) {
    if (hasOPFS() && (await this._hasOPFS(name))) return this._readOPFS(name);
    if (hasCacheAPI()) return this._readCacheAPI(name);
    return null;
  }

  async has(name) {
    if (hasOPFS() && (await this._hasOPFS(name))) return true;
    if (hasCacheAPI()) return this._hasCacheAPI(name);
    return false;
  }

  async fetchAndCache(url, name, onProgress) {
    this.lastError = null;
    this.progress = 0;
    this.progressText = 'fetch ' + name;
    if (onProgress) onProgress({ progress: 0, text: this.progressText });

    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);

    const total = Number(res.headers.get('content-length') || 0);
    if (!res.body || !res.body.getReader) {
      const buf = await res.arrayBuffer();
      return this.put(name, buf, onProgress);
    }

    const reader = res.body.getReader();
    const parts = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      received += value.byteLength;
      this.progress = total ? Math.min(0.95, received / total) : 0.5;
      this.progressText = total
        ? ('download ' + Math.round((received / total) * 100) + '% · ' + Math.round(received / 1e6) + ' MB')
        : ('download ' + Math.round(received / 1e6) + ' MB');
      if (onProgress) onProgress({ progress: this.progress, text: this.progressText, bytes: received, total });
    }
    const blob = new Blob(parts, { type: 'application/octet-stream' });
    return this.put(name, blob, (p) => {
      const prog = 0.95 + (p.progress || 0) * 0.05;
      this.progress = prog;
      this.progressText = p.text || 'store';
      if (onProgress) onProgress({ progress: prog, text: this.progressText, bytes: received, total });
    });
  }

  status() {
    return {
      ns: this.ns,
      progress: this.progress,
      progressText: this.progressText,
      error: this.lastError,
      opfs: hasOPFS(),
      cacheApi: hasCacheAPI()
    };
  }
}

export default OPFSWeightCache;
