/**
 * AKSI Agent Bridge v1.0
 * - Local activity reports → site (localStorage + download)
 * - OpenClaw: USER installs & registers; bridge only talks to gateway URL user provides
 * Does NOT auto-register third-party accounts. Not full model training.
 * aksilove@internet.ru
 */
(function (G) {
  'use strict';
  var VERSION = '1.0.0';
  var REPORT_KEY = 'aksi_agent_reports_v1';
  var CFG_KEY = 'aksi_agent_cfg_v1';

  function now() {
    return new Date().toISOString();
  }
  function uid() {
    return 'rpt_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  }

  function loadReports() {
    try {
      var raw = G.localStorage.getItem(REPORT_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function saveReports(arr) {
    try {
      G.localStorage.setItem(REPORT_KEY, JSON.stringify(arr.slice(0, 200)));
    } catch (e) {}
  }

  function getCfg() {
    try {
      return JSON.parse(G.localStorage.getItem(CFG_KEY) || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function setCfg(partial) {
    var c = Object.assign(getCfg(), partial || {}, { updated_at: now() });
    try {
      G.localStorage.setItem(CFG_KEY, JSON.stringify(c));
    } catch (e) {}
    return c;
  }

  function writeReport(input) {
    var r = {
      id: uid(),
      at: now(),
      agent: (input && input.agent) || 'AKSI',
      title: (input && input.title) || 'Activity',
      status: (input && input.status) || 'done',
      summary: (input && input.summary) || '',
      steps: (input && input.steps) || [],
      links: (input && input.links) || [],
      source: (input && input.source) || 'local',
      openclaw: !!(input && input.openclaw)
    };
    var all = loadReports();
    all.unshift(r);
    saveReports(all);
    try {
      G.dispatchEvent(new CustomEvent('aksi-agent-report', { detail: r }));
    } catch (e) {}
    return r;
  }

  function listReports(limit) {
    return loadReports().slice(0, limit || 50);
  }

  function clearReports() {
    saveReports([]);
  }

  function openclawStatus() {
    var c = getCfg();
    if (!c.gatewayUrl) {
      return Promise.resolve({
        ok: false,
        reason: 'no_gateway',
        hint: 'Укажите URL Gateway после установки OpenClaw (часто http://127.0.0.1:18789)'
      });
    }
    var headers = { Accept: 'application/json' };
    if (c.gatewayToken) headers['Authorization'] = 'Bearer ' + c.gatewayToken;
    return fetch(String(c.gatewayUrl).replace(/\/$/, '') + '/health', {
      method: 'GET',
      headers: headers,
      mode: 'cors'
    })
      .then(function (res) {
        return { ok: res.ok, status: res.status, gatewayUrl: c.gatewayUrl };
      })
      .catch(function (err) {
        return {
          ok: false,
          reason: 'network_or_cors',
          error: String((err && err.message) || err),
          hint: 'Gateway должен разрешать CORS, или пишите отчёты локальным скриптом'
        };
      });
  }

  function runLocalCycle(goal) {
    goal = String(goal || 'Самопроверка агента').trim();
    var steps = [
      { t: now(), text: 'Получена цель: ' + goal },
      { t: now(), text: 'Режим: локальный AKSI (без авто-регистрации на чужих сервисах)' },
      { t: now(), text: 'OpenClaw: регистрацию выполняет человек; агент только пишет отчёт' }
    ];
    if (G.AKSI_RUNTIME && typeof G.AKSI_RUNTIME.startGoal === 'function') {
      steps.push({ t: now(), text: 'Запуск Runtime startGoal…' });
      return G.AKSI_RUNTIME.startGoal(goal, {}).then(function (session) {
        steps.push({
          t: now(),
          text:
            'Runtime: ' +
            (session && session.status) +
            ', evidence=' +
            ((session && session.evidence && session.evidence.length) || 0)
        });
        return writeReport({
          title: 'Runtime cycle',
          status: (session && session.status) || 'done',
          summary: goal,
          steps: steps,
          source: 'runtime',
          links: [{ label: 'Runtime', href: '/runtime/' }]
        });
      });
    }
    steps.push({ t: now(), text: 'Runtime не подключён — отчёт только локальный' });
    return Promise.resolve(
      writeReport({
        title: 'Local cycle',
        status: 'done',
        summary: goal,
        steps: steps,
        source: 'local'
      })
    );
  }

  G.AKSI_AGENT = {
    VERSION: VERSION,
    writeReport: writeReport,
    listReports: listReports,
    clearReports: clearReports,
    getCfg: getCfg,
    setCfg: setCfg,
    openclawStatus: openclawStatus,
    runLocalCycle: runLocalCycle,
    openclawSetupHint: function () {
      return {
        official: 'https://docs.openclaw.ai/start/getting-started',
        install: 'curl -fsSL https://openclaw.ai/install.sh | bash',
        onboard: 'openclaw onboard --install-daemon',
        dashboard: 'openclaw dashboard',
        note: 'Регистрацию и API-ключи делает человек. AKSI хранит только URL/token Gateway, который вы сами вставите.'
      };
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
