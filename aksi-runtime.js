/* AKSI Runtime — browser-local capability layer. No network calls are made by this file. */
(function () {
  'use strict';
  const NS = 'AKSI_RUNTIME_V1';
  const LEDGER = 'AKSI_COGNITIVE_LEDGER_V1';
  const ID = 'AKSI_IDENTITY_V1';
  const encoder = new TextEncoder();

  function stable(v) {
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  }
  async function sha256(text) {
    const b = await crypto.subtle.digest('SHA-256', encoder.encode(text));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  function load(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (_) { return fallback; } }
  function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

  async function identity() {
    let state = load(ID, null);
    if (state && state.publicKey) return state;
    let algorithm = 'ECDSA-P256-fallback';
    let pair;
    try {
      pair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
      algorithm = 'Ed25519';
    } catch (_) {
      pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    }
    const publicKey = await crypto.subtle.exportKey('jwk', pair.publicKey);
    state = { schema: 'AKSI-IDENTITY-1', algorithm, publicKey, createdAt: new Date().toISOString() };
    save(ID, state);
    return state;
  }

  async function sign(data) {
    const state = load(ID, null);
    if (!state || !state.privateKey) return null;
    return null;
  }

  async function appendEvidence(subject, source, status) {
    const ledger = load(LEDGER, []);
    const previous = ledger.length ? ledger[ledger.length - 1].event_hash : 'GENESIS';
    const event = { schema: 'AKSI-EVIDENCE-2', subject: String(subject), source: source || 'local', status: status || 'unverified', created_at: new Date().toISOString(), previous_hash: previous };
    event.canonical = stable(event);
    event.event_hash = await sha256(event.canonical);
    ledger.push(event);
    save(LEDGER, ledger);
    return event;
  }

  async function verifyLedger() {
    const ledger = load(LEDGER, []);
    let previous = 'GENESIS';
    for (let i = 0; i < ledger.length; i++) {
      const e = ledger[i];
      const payload = { schema: e.schema, subject: e.subject, source: e.source, status: e.status, created_at: e.created_at, previous_hash: previous };
      const canonical = stable(payload);
      if (e.previous_hash !== previous || e.canonical !== canonical || e.event_hash !== await sha256(canonical)) return { ok: false, index: i, count: ledger.length };
      previous = e.event_hash;
    }
    return { ok: true, count: ledger.length, head: previous };
  }

  async function runtimeSelfTest() {
    const tests = [];
    try { tests.push(['WebCrypto', !!crypto.subtle]); } catch (_) { tests.push(['WebCrypto', false]); }
    try { const h = await sha256('AKSI'); tests.push(['SHA-256', /^[0-9a-f]{64}$/.test(h)]); } catch (_) { tests.push(['SHA-256', false]); }
    try { const x = await appendEvidence('runtime self-test', 'aksi-runtime', 'computed'); const v = await verifyLedger(); tests.push(['Ledger', v.ok && v.count > 0]); if (x) { const l = load(LEDGER, []); l.pop(); save(LEDGER, l); } } catch (_) { tests.push(['Ledger', false]); }
    return { ok: tests.every(x => x[1]), tests };
  }

  function installDiagnostics() {
    const badge = document.createElement('div');
    badge.id = 'aksi-runtime-badge';
    badge.setAttribute('aria-live', 'polite');
    badge.textContent = 'AKSI runtime · local';
    Object.assign(badge.style, { position:'fixed', right:'12px', bottom:'12px', zIndex:'9999', padding:'7px 10px', border:'1px solid rgba(160,180,255,.25)', borderRadius:'999px', background:'rgba(8,12,20,.88)', color:'#aab8ff', font:'11px ui-monospace,monospace', backdropFilter:'blur(10px)', cursor:'pointer' });
    badge.title = 'Нажмите для самопроверки АКСИ';
    badge.onclick = async function () { const r = await runtimeSelfTest(); badge.textContent = r.ok ? 'AKSI runtime · verified' : 'AKSI runtime · check failed'; badge.style.color = r.ok ? '#86efac' : '#fca5a5'; };
    document.body.appendChild(badge);
  }

  window.AKSI = Object.assign(window.AKSI || {}, { runtime: { version:'1.0.0', localOnly:true, stable, sha256, identity, appendEvidence, verifyLedger, runtimeSelfTest } });

  document.addEventListener('DOMContentLoaded', async function () {
    try { await identity(); } catch (_) {}
    installDiagnostics();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(function () {});
  });
})();
