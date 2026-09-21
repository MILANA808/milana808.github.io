/**
 * AKSI Registry v1 — host registry on your site
 * Other agents/humans apply; host publishes to registry.json
 */
(function (G) {
  'use strict';
  var VERSION = '1.0.0';
  var PENDING_KEY = 'aksi_registry_pending_v1';
  var LOCAL_PUB_KEY = 'aksi_registry_local_pub_v1';

  function now() { return new Date().toISOString(); }
  function uid(p) { return (p || 'ag') + '_' + Math.random().toString(36).slice(2, 9); }

  function getPending() {
    try {
      var a = JSON.parse(G.localStorage.getItem(PENDING_KEY) || '[]');
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }
  function setPending(arr) {
    try { G.localStorage.setItem(PENDING_KEY, JSON.stringify(arr.slice(0, 100))); } catch (e) {}
  }
  function getLocalPub() {
    try {
      var a = JSON.parse(G.localStorage.getItem(LOCAL_PUB_KEY) || '[]');
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }
  function setLocalPub(arr) {
    try { G.localStorage.setItem(LOCAL_PUB_KEY, JSON.stringify(arr.slice(0, 200))); } catch (e) {}
  }

  function loadPublicRegistry() {
    return fetch('/registry/registry.json?v=' + Date.now(), { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .catch(function () {
        return { schema: 'aksi-registry/v1', host: 'AKSI', agents: [], error: 'registry.json unavailable' };
      });
  }

  function normalizeApplication(form) {
    form = form || {};
    var name = String(form.name || '').trim().slice(0, 80);
    var url = String(form.url || '').trim().slice(0, 300);
    var contact = String(form.contact || '').trim().slice(0, 120);
    var summary = String(form.summary || '').trim().slice(0, 500);
    var caps = String(form.capabilities || '').split(/[,;\n]+/).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 20);
    if (!name || !url) throw new Error('Нужны name и url');
    return {
      id: uid('app'),
      name: name,
      url: url,
      contact: contact,
      summary: summary,
      capabilities: caps,
      manifest: String(form.manifest || '').trim().slice(0, 300) || null,
      status: 'pending',
      applied_at: now(),
      protocol: 'aksi-registry/v1'
    };
  }

  function apply(form) {
    var app = normalizeApplication(form);
    var pending = getPending();
    pending.unshift(app);
    setPending(pending);
    try { G.dispatchEvent(new CustomEvent('aksi-registry-apply', { detail: app })); } catch (e) {}
    return app;
  }

  function approveLocal(appId) {
    var pending = getPending();
    var idx = pending.findIndex(function (x) { return x.id === appId; });
    if (idx < 0) return null;
    var app = pending[idx];
    pending.splice(idx, 1);
    setPending(pending);
    var agent = {
      id: uid('aksi'),
      name: app.name,
      owner: app.contact || '',
      url: app.url,
      manifest: app.manifest,
      capabilities: app.capabilities || [],
      protocols: ['aksi-registry/v1'],
      status: 'active',
      registered_at: now(),
      summary: app.summary || '',
      source_application: app.id
    };
    var pub = getLocalPub();
    pub.unshift(agent);
    setLocalPub(pub);
    return agent;
  }

  function buildPublishPack(publicJson) {
    var base = publicJson || { schema: 'aksi-registry/v1', host: 'AKSI', agents: [] };
    var merged = (base.agents || []).concat(getLocalPub());
    var seen = {};
    var agents = [];
    merged.forEach(function (a) {
      var k = (a.url || '') + '|' + (a.name || '');
      if (seen[k]) return;
      seen[k] = 1;
      agents.push(a);
    });
    return {
      schema: 'aksi-registry/v1',
      host: 'AKSI',
      principle: 'technology_serves_human',
      contact: 'aksilove@internet.ru',
      site: 'https://milana808.github.io',
      updated_at: now(),
      agents: agents
    };
  }

  function mailtoApplication(app) {
    var body = encodeURIComponent(JSON.stringify(app, null, 2));
    var sub = encodeURIComponent('[AKSI Registry] ' + (app.name || 'agent'));
    return 'mailto:aksilove@internet.ru?subject=' + sub + '&body=' + body;
  }

  G.AKSI_REGISTRY = {
    VERSION: VERSION,
    loadPublicRegistry: loadPublicRegistry,
    apply: apply,
    getPending: getPending,
    getLocalPub: getLocalPub,
    approveLocal: approveLocal,
    buildPublishPack: buildPublishPack,
    mailtoApplication: mailtoApplication
  };
})(typeof window !== 'undefined' ? window : globalThis);
