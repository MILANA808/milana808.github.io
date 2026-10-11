/* AKSI Unified Runtime Gateway v1.0.0
 * One browser-side control plane for the canonical AKSI API.
 * Local-first: no secrets in this file; mutating requests are never replayed on another host.
 */
(function (G) {
  'use strict';
  if (G.AKSI_UNIFIED) return;
  var VERSION = '1.0.0';
  var DEFAULTS = ['https://aksi-backend.onrender.com', 'https://milana-backend.replit.app'];
  var cfgKey = 'AKSI_API';
  var breakers = Object.create(null);
  var inflight = Object.create(null);

  function cleanBase(value) {
    var s = String(value || '').trim().replace(/\/$/, '');
    if (!s) return '';
    try {
      var u = new URL(s, G.location && G.location.href);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') return '';
      if (u.username || u.password) return '';
      return u.origin + u.pathname.replace(/\/$/, '');
    } catch (_) { return ''; }
  }
  function candidates() {
    var q = '';
    try { q = new URLSearchParams(G.location.search).get('api') || ''; } catch (_) {}
    var saved = '';
    try { saved = G.localStorage.getItem(cfgKey) || G.localStorage.getItem('aksi_api') || ''; } catch (_) {}
    var configured = (G.AKSI_CONFIG && G.AKSI_CONFIG.apiBase) || q || saved;
    return Array.from(new Set([cleanBase(configured), ...DEFAULTS.map(cleanBase)].filter(Boolean)));
  }
  var bases = candidates();
  var activeBase = bases[0] || DEFAULTS[0];
  function setBase(value) {
    var b = cleanBase(value);
    if (!b) throw new Error('API URL must use http(s) and contain no credentials');
    activeBase = b;
    bases = Array.from(new Set([b, ...bases.filter(function (x) { return x !== b; })]));
    try { G.localStorage.setItem(cfgKey, b); } catch (_) {}
    return activeBase;
  }
  function timeoutSignal(ms) {
    var c = new AbortController();
    var timer = setTimeout(function () { c.abort(); }, ms);
    return { signal: c.signal, clear: function () { clearTimeout(timer); } };
  }
  function parseResponse(response) {
    return response.text().then(function (raw) {
      var data;
      try { data = raw ? JSON.parse(raw) : {}; } catch (_) { data = { raw: raw.slice(0, 2000) }; }
      if (!response.ok) {
        var err = new Error('HTTP ' + response.status);
        err.status = response.status; err.data = data; throw err;
      }
      return data;
    });
  }
  async function request(path, options) {
    options = options || {};
    var p = String(path || '');
    if (!p.startsWith('/') || p.startsWith('//')) throw new Error('API path must be an absolute path on the configured host');
    var method = String(options.method || 'GET').toUpperCase();
    var safeFailover = !options.noFailover && (method === 'GET' || p === '/api/chat' || p === '/api/aksi/chat');
    var hosts = [activeBase].concat(safeFailover ? bases.filter(function (b) { return b !== activeBase; }) : []);
    var last;
    for (var i = 0; i < hosts.length; i++) {
      var base = hosts[i];
      if (breakers[base] && breakers[base].until > Date.now() && i < hosts.length - 1) continue;
      var key = method + ' ' + base + p;
      if (method === 'GET' && inflight[key]) return inflight[key];
      var t = timeoutSignal(options.timeoutMs || (p === '/api/chat' ? 60000 : 12000));
      var headers = Object.assign({ Accept: 'application/json' }, options.headers || {});
      var init = Object.assign({}, options, { method: method, headers: headers, signal: t.signal });
      delete init.timeoutMs;
      delete init.noFailover;
      var promise = fetch(base + p, init).then(parseResponse).then(function (data) {
        breakers[base] = { failures: 0, until: 0 };
        activeBase = base;
        try { G.localStorage.setItem(cfgKey, base); } catch (_) {}
        return data;
      }).catch(function (err) {
        last = err;
        var old = breakers[base] || { failures: 0, until: 0 };
        old.failures++;
        if (old.failures >= 3) old.until = Date.now() + Math.min(60000, old.failures * 5000);
        breakers[base] = old;
        throw err;
      }).finally(function () {
        t.clear();
        delete inflight[key];
      });
      if (method === 'GET') inflight[key] = promise;
      try { return await promise; } catch (err) {
        if (!safeFailover || i === hosts.length - 1) throw err;
      }
    }
    throw last || new Error('No healthy AKSI API endpoint');
  }
  async function health() {
    var out = { version: VERSION, api: activeBase, online: !!(G.navigator && G.navigator.onLine), liveness: null, readiness: null, runtime: null, errors: [] };
    try { out.liveness = await request('/health', { timeoutMs: 8000, noFailover: true }); }
    catch (e) { out.errors.push({ check: 'health', error: String(e.message || e) }); }
    try { out.readiness = await request('/ready', { timeoutMs: 8000, noFailover: true }); }
    catch (e) { out.errors.push({ check: 'ready', error: String(e.message || e), status: e.status || null, details: e.data || null }); }
    try { out.runtime = await request('/api/core/runtime', { timeoutMs: 8000, noFailover: true }); }
    catch (e) { out.errors.push({ check: 'runtime', error: String(e.message || e) }); }
    out.alive = !!out.liveness;
    out.ready = !!(out.readiness && out.readiness.ready === true);
    out.runtimeAvailable = !!(out.runtime && out.runtime.ok);
    out.ok = out.alive && out.ready && out.runtimeAvailable;
    return out;
  }
  async function runTask(goal, options) {
    options = options || {};
    goal = String(goal || '').trim();
    if (!goal) throw new Error('Задача не может быть пустой');
    var permissions = Object.assign({
      internet: true, read_pages: true, browser_actions: false,
      downloads: false, memory: true, external_actions: false
    }, options.permissions || {});
    // Creation is a mutation: deliberately do not fail over after an ambiguous timeout.
    var created = await request('/api/agent/tasks', {
      method: 'POST', timeoutMs: 15000,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal: goal, permissions: permissions, max_sources: options.max_sources || 10 })
    });
    var task = created.task || {};
    var id = task.id;
    if (!id) throw new Error('Backend did not return a task id');
    var deadline = Date.now() + Math.min(300000, Math.max(5000, options.timeoutMs || 120000));
    var last = task;
    while (Date.now() < deadline) {
      if (['COMPLETED', 'FAILED', 'STOPPED', 'NEEDS_PERMISSION', 'RECOVERABLE'].includes(last.status)) break;
      await new Promise(function (resolve) { setTimeout(resolve, Math.max(500, options.pollMs || 1500)); });
      var data = await request('/api/agent/tasks/' + encodeURIComponent(id), { timeoutMs: 10000 });
      last = data.task || last;
      if (typeof options.onProgress === 'function') {
        try { options.onProgress({ id: id, status: last.status, journal: last.journal || [] }); } catch (_) {}
      }
    }
    return {
      id: id, status: last.status || 'UNKNOWN', report: last.report || null,
      receipt: last.receipt || null, verification: last.verification || null,
      sources: last.sources || [], journal: last.journal || [],
      timed_out: !['COMPLETED', 'FAILED', 'STOPPED', 'NEEDS_PERMISSION', 'RECOVERABLE'].includes(last.status)
    };
  }
  function status() {
    return { version: VERSION, api: activeBase, candidates: bases.slice(), breakers: JSON.parse(JSON.stringify(breakers)), online: !!(G.navigator && G.navigator.onLine) };
  }
  G.AKSI_UNIFIED = {
    version: VERSION, base: function () { return activeBase; },
    setBase: setBase, candidates: function () { return bases.slice(); },
    request: request, health: health, runTask: runTask, status: status
  };
})(typeof window !== 'undefined' ? window : globalThis);
