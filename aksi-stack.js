/**
 * AKSI STACK — unified product technology
 * Bricks already in repo, joined into one decide path:
 *
 *   collect (seed/calc/mem/WebLLM/backend)
 *     → ADIA 4.0.1 (score→rank→claimThrottle→gate→seal)
 *     → AKSI_BOND (SHA-256 evidence root + bond receipt) if present
 *     → optional PQ status
 *
 * Not AGI. technology_serves_human. aksilove@internet.ru
 */
(function (G) {
  'use strict';
  var VERSION = '1.0.0';
  var NAME = 'AKSI STACK';

  function safeMath(q) {
    var s = String(q).replace(/(посчитай|вычисли|calculate)/gi, '').replace(',', '.').trim();
    if (!/^[\d\s+\-*/().]+$/.test(s) || !/[+*/\-]/.test(s)) return null;
    try {
      var v = Function('"use strict";return (' + s + ')')();
      return typeof v === 'number' && isFinite(v) ? v : null;
    } catch (e) {
      return null;
    }
  }

  function seed(q) {
    if (/акси|aksi|кто ты|bond|stack|what are you/i.test(q)) {
      return {
        text:
          'АКСИ STACK — единый контур: кандидаты → ADIA gate → Bond (SHA-256) квитанция. Не AGI. aksilove@internet.ru',
        source: 'seed'
      };
    }
    return null;
  }

  function fromMem(q, mem) {
    mem = mem || [];
    var ql = String(q).toLowerCase().split(/\s+/).filter(function (w) { return w.length > 2; });
    if (!ql.length) return [];
    var out = [];
    mem.forEach(function (m) {
      var t = String((m && (m.t || m.text)) || '');
      if (t.length < 8) return;
      var tl = t.toLowerCase(), n = 0, i;
      for (i = 0; i < ql.length; i++) if (tl.indexOf(ql[i]) >= 0) n++;
      if (n / ql.length >= 0.3) out.push({ text: t, source: 'memory' });
    });
    return out.slice(0, 5);
  }

  async function collect(query, opt) {
    opt = opt || {};
    var q = String(query || '').trim();
    var c = [];
    var calc = safeMath(q);
    if (calc != null) c.push({ text: 'Результат: ' + calc, source: 'calc' });
    var s = seed(q);
    if (s) c.push(s);
    c = c.concat(fromMem(q, opt.memory));
    if (opt.useWebLLM !== false && G.AKSI_WEBLLM && G.AKSI_WEBLLM.ready && G.AKSI_WEBLLM.ready()) {
      try {
        var L = await G.AKSI_WEBLLM.complete(q, { max_tokens: opt.maxTokens || 400 });
        if (L && L.text) c.push({ text: L.text, source: 'webllm' });
      } catch (e) {}
    }
    var bu = (opt.backendUrl || '').replace(/\/$/, '');
    if (opt.useBackend && bu) {
      try {
        var r = await fetch(bu + '/api/universal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: q, web: true })
        });
        if (r.ok) {
          var j = await r.json();
          if (j.answer) c.push({ text: j.answer, source: 'backend', evidence: j.sources || j.evidence });
        }
      } catch (e) {}
    }
    if (opt.extra) opt.extra.forEach(function (x) { if (x && x.text) c.push(x); });
    if (!c.length) {
      c.push({
        text: 'Нет кандидатов. WebLLM, «запомни:» или backend.',
        source: 'fallback'
      });
    }
    return c;
  }

  async function decide(query, opt) {
    opt = opt || {};
    var q = String(query || '').trim();
    if (!q) return { ok: false, error: 'empty' };

    var te = /^(?:запомни|remember)\s*[:：]\s*(.+)$/i.exec(q);
    if (te) {
      return {
        ok: true,
        teach: true,
        answer: 'Сохранено',
        fact: te[1].slice(0, 500),
        gate: { decision: 'ALLOW' },
        bricks: ['memory']
      };
    }

    var bricks = ['collect'];
    var cands = await collect(q, opt);
    var evidence = opt.evidence || [];
    cands.forEach(function (c) {
      if (c.evidence) evidence = evidence.concat(c.evidence);
    });

    var adia = null;
    var answer = cands[0].text;
    if (G.AKSI_ALGORITHM && G.AKSI_ALGORITHM.process) {
      adia = G.AKSI_ALGORITHM.process(q, cands, {
        policy: opt.policy || 'companion',
        evidence: evidence,
        seal: opt.seal !== false
      });
      bricks.push('adia-4');
      if (adia.best) answer = adia.best.text;
    } else {
      adia = {
        version: 'none',
        best: cands[0],
        gate: { decision: 'ALLOW' },
        throttle: { verdict: 'BIND', G: 1 }
      };
    }

    var bond = null;
    if (G.AKSI_BOND && G.AKSI_BOND.createBond) {
      try {
        var sources = evidence.map(function (e) {
          if (typeof e === 'string') return { text: e };
          return e;
        });
        if (!sources.length && adia.best) {
          sources = [{ title: adia.best.source || 'local', text: answer.slice(0, 500) }];
        }
        var reg =
          G.AKSI_BOND.registerEvidence && sources.length
            ? await G.AKSI_BOND.registerEvidence(sources)
            : { root: null, ids: [] };
        bond = await G.AKSI_BOND.createBond({
          query: q,
          answer: answer,
          source: (adia.best && adia.best.source) || 'local',
          gate: adia.gate && adia.gate.decision,
          evidence_root: reg.root,
          evidence_ids: reg.ids,
          eqs: adia.best && adia.best.metrics && adia.best.metrics.EQS
        });
        bricks.push('bond-sha256');
      } catch (e) {
        bond = { error: String(e && e.message || e).slice(0, 120) };
      }
    }

    if (G.AKSI_PQ) bricks.push('pq-module');

    return {
      ok: true,
      tech: NAME,
      version: VERSION,
      answer: answer,
      gate: adia.gate,
      throttle: adia.throttle,
      best: adia.best,
      adia: { version: adia.version, seal: adia.seal },
      bond: bond
        ? {
            bond_id: bond.bond_id,
            integrity: bond.integrity,
            evidence_root: bond.evidence_root,
            protocol: bond.protocol
          }
        : null,
      candidates: cands.length,
      bricks: bricks,
      principle: 'technology_serves_human'
    };
  }

  function status() {
    return {
      tech: NAME,
      version: VERSION,
      pipeline: 'collect → ADIA4 → Bond(SHA-256) → ±PQ',
      adia: G.AKSI_ALGORITHM && G.AKSI_ALGORITHM.version,
      bond: G.AKSI_BOND && G.AKSI_BOND.version,
      webllm: G.AKSI_WEBLLM && G.AKSI_WEBLLM.ready && G.AKSI_WEBLLM.ready(),
      pq: !!G.AKSI_PQ,
      bricks: {
        algorithm: !!G.AKSI_ALGORITHM,
        bond: !!G.AKSI_BOND,
        webllm: !!G.AKSI_WEBLLM,
        pq: !!G.AKSI_PQ
      }
    };
  }

  G.AKSI_STACK = {
    version: VERSION,
    name: NAME,
    decide: decide,
    collect: collect,
    status: status
  };
})(typeof window !== 'undefined' ? window : this);
