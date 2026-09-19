/**
 * AKSI MATRIX — OPFS chunked cache for large weight blobs
 */
const ROOT_DIR = 'aksi-matrix-weights';

async function getOpfsRoot() {
  if (!navigator.storage || !navigator.storage.getDirectory) return null;
  try {
    const root = await navigator.storage.getDirectory();
    return root.getDirectoryHandle(ROOT_DIR, { create: true });
  } catch (e) {
    return null;
  }
}

export class OpfsWeightCache {
  constructor() {
    this.root = null;
    this.backend = 'none';
  }

  async init() {
    this.root = await getOpfsRoot();
    if (this.root) {
      this.backend = 'opfs';
      return this.backend;
    }
    if (typeof caches !== 'undefined') {
      this.backend = 'cache';
      return this.backend;
    }
    this.backend = 'none';
    return this.backend;
  }

  async has(key) {
    if (this.backend === 'opfs' && this.root) {
      try {
        await this.root.getFileHandle(key);
        return true;
      } catch (e) {
        return false;
      }
    }
    if (this.backend === 'cache') {
      const c = await caches.open(ROOT_DIR);
      return c.match(key).then((r) => !!r);
    }
    return false;
  }

  async putFromUrl(key, url, onProgress) {
    await this.init();
    if (this.backend === 'none') throw new Error('OPFS and Cache API unavailable');
    const res = await fetch(url);
    if (!res.ok) throw new Error('fetch ' + res.status + ' ' + url);
    const total = Number(res.headers.get('content-length') || 0);
    const reader = res.body && res.body.getReader();
    if (!reader) {
      const blob = await res.blob();
      await this._writeBlob(key, blob);
      if (onProgress) onProgress({ loaded: blob.size, total: blob.size, pct: 1, text: 'done' });
      return blob.size;
    }
    let loaded = 0;
    if (this.backend === 'opfs' && this.root && this.root.getFileHandle) {
      const fh = await this.root.getFileHandle(key, { create: true });
      if (fh.createWritable) {
        const w = await fh.createWritable();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          await w.write(value);
          loaded += value.byteLength;
          if (onProgress) {
            onProgress({
              loaded,
              total,
              pct: total ? loaded / total : 0,
              text: 'opfs ' + Math.round((total ? loaded / total : 0) * 100) + '%'
            });
          }
        }
        await w.close();
        return loaded;
      }
    }
    const parts = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      loaded += value.byteLength;
      if (onProgress) {
        onProgress({
          loaded,
          total,
          pct: total ? loaded / total : 0,
          text: 'buffer ' + Math.round((total ? loaded / total : 0) * 100) + '%'
        });
      }
    }
    const blob = new Blob(parts);
    await this._writeBlob(key, blob);
    return loaded;
  }

  async _writeBlob(key, blob) {
    if (this.backend === 'opfs' && this.root) {
      const fh = await this.root.getFileHandle(key, { create: true });
      const w = await fh.createWritable();
      await w.write(blob);
      await w.close();
      return;
    }
    if (this.backend === 'cache') {
      const c = await caches.open(ROOT_DIR);
      await c.put(key, new Response(blob));
    }
  }

  async getBlob(key) {
    if (this.backend === 'opfs' && this.root) {
      const fh = await this.root.getFileHandle(key);
      return fh.getFile();
    }
    if (this.backend === 'cache') {
      const c = await caches.open(ROOT_DIR);
      const r = await c.match(key);
      return r ? r.blob() : null;
    }
    return null;
  }

  async estimate() {
    if (navigator.storage && navigator.storage.estimate) return navigator.storage.estimate();
    return null;
  }
}

export default OpfsWeightCache;
