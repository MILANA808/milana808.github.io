/**
 * AKSI Decision Receipt v1 — corporate-buyable layer
 * FACT | HYPOTHESIS | CLAIM | UNGROUNDED + evidence + hash chain
 */
(function (G) {
  'use strict';
  var VERSION = '1.0.0';
  var SCHEMA = 'aksi-decision-receipt/v1';

  function now() { return new Date().toISOString(); }
  function uid() { return 'dr_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3); }

  function fnv1a(str) {
    var h = 0x811c9dc5;
    var s = String(str || '');
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return ('00000000' + (h >>> 0).toString(16)).slice(-8);
  }

  function classifyStatement(text, hasEvidence) {
    var t = String(text || '').trim();
    if (!t) return 'UNGROUNDED';
    if (!hasEvidence) return 'UNGROUNDED';
    if (/^(возможно|вероятно|кажется|допустим|предположим|might|maybe|perhaps)/i.test(t)) return 'HYPOTHESIS';
    if (/^(факт:|известно, что|согласно|по данным|according to)/i.test(t)) return 'FACT';
    return hasEvidence ? 'CLAIM' : 'UNGROUNDED';
  }

  function build(input) {
    input = input || {};
    var evidence = (input.evidence || []).map(function (e, i) {
      return {
        id: e.id || 'ev_' + (i + 1),
        source: e.source || 'unknown',
        url: e.url || null,
        snippet: String(e.snippet || e.text || '').slice(0, 500)
      };
    });
    var evIds = evidence.map(function (e) { return e.id; });
    var statements = (input.statements || []).map(function (s) {
      var based = s.based_on || s.basedOn || evIds.slice(0, 1);
      if (!Array.isArray(based)) based = based ? [based] : [];
      var has = based.some(function (id) { return evIds.indexOf(id) !== -1; });
      var cls = s.class || classifyStatement(s.text, has && based.length > 0);
      if (cls !== 'UNGROUNDED' && based.length === 0) cls = 'UNGROUNDED';
      return { text: String(s.text || '').slice(0, 2000), class: cls, based_on: based };
    });

    if (!statements.length && input.answer) {
      statements.push({
        text: String(input.answer).slice(0, 2000),
        class: evidence.length ? 'CLAIM' : 'UNGROUNDED',
        based_on: evIds.slice(0, 3)
      });
    }

    var ungrounded = statements.filter(function (s) { return s.class === 'UNGROUNDED'; }).length;
    var policy = input.policy || 'strict';
    var allowed =
      policy === 'lab' ? true :
      policy === 'companion' ? ungrounded < statements.length :
      ungrounded === 0 && statements.length > 0;

    var body = {
      schema: SCHEMA,
      version: VERSION,
      id: uid(),
      created_at: now(),
      goal: String(input.goal || '').slice(0, 500),
      policy: policy,
      gate: allowed ? 'ALLOW' : 'BLOCK',
      agent: input.agent || 'AKSI',
      evidence: evidence,
      statements: statements,
      metrics: {
        evidence_count: evidence.length,
        statement_count: statements.length,
        ungrounded_count: ungrounded,
        fact_count: statements.filter(function (s) { return s.class === 'FACT'; }).length,
        hypothesis_count: statements.filter(function (s) { return s.class === 'HYPOTHESIS'; }).length
      },
      human_note: input.human_note ||
        'Квитанция для аудита: не заменяет юридическую экспертизу. Технология служит проверке, не авторитету модели.'
    };

    var prev = input.previous_hash || 'GENESIS';
    var payload = JSON.stringify({
      id: body.id, goal: body.goal, gate: body.gate,
      statements: body.statements, evidence: body.evidence, prev: prev
    });
    body.proof = {
      alg: 'fnv1a-32',
      previous_hash: prev,
      content_hash: fnv1a(payload),
      chain_hash: fnv1a(prev + fnv1a(payload))
    };
    return body;
  }

  function toAuditText(receipt) {
    var r = receipt;
    var lines = [];
    lines.push('AKSI DECISION RECEIPT ' + r.id);
    lines.push('schema: ' + r.schema);
    lines.push('created: ' + r.created_at);
    lines.push('gate: ' + r.gate + ' | policy: ' + r.policy);
    lines.push('goal: ' + r.goal);
    lines.push('--- EVIDENCE ---');
    (r.evidence || []).forEach(function (e) {
      lines.push('[' + e.id + '] ' + e.source + (e.url ? ' ' + e.url : ''));
      if (e.snippet) lines.push('  ' + e.snippet.slice(0, 200));
    });
    lines.push('--- STATEMENTS ---');
    (r.statements || []).forEach(function (s, i) {
      lines.push(i + 1 + '. [' + s.class + '] ' + s.text);
      lines.push('   based_on: ' + (s.based_on || []).join(', '));
    });
    lines.push('--- PROOF ---');
    lines.push(JSON.stringify(r.proof));
    lines.push('--- NOTE ---');
    lines.push(r.human_note);
    return lines.join('\n');
  }

  function demo(scenario) {
    if (scenario === 'block') {
      return build({
        goal: 'Утвердить сумму штрафа без первичных документов',
        policy: 'strict',
        evidence: [],
        statements: [{ text: 'Штраф составляет ровно 2.4 млн без оснований в деле', based_on: [] }]
      });
    }
    return build({
      goal: 'Кратко: что такое Decision Receipt для корпоративного ИИ',
      policy: 'strict',
      evidence: [
        { id: 'ev_1', source: 'AKSI product surface', url: 'https://milana808.github.io/runtime/', snippet: 'Runtime: goal → evidence → report with fact/hypothesis separation' },
        { id: 'ev_2', source: 'AKSI Decision Receipt spec', url: 'https://milana808.github.io/receipt/', snippet: 'Receipt classes: FACT, HYPOTHESIS, CLAIM, UNGROUNDED; gate ALLOW/BLOCK' }
      ],
      statements: [
        { text: 'Decision Receipt — машиночитаемая квитанция к ответу ИИ с классом утверждений и ссылкой на evidence.', class: 'CLAIM', based_on: ['ev_1', 'ev_2'] },
        { text: 'В режиме strict ответ без evidence получает gate BLOCK.', class: 'FACT', based_on: ['ev_2'] },
        { text: 'Возможно, регуляторы начнут требовать подобные следы по умолчанию.', class: 'HYPOTHESIS', based_on: ['ev_2'] }
      ]
    });
  }

  G.AKSI_RECEIPT = {
    VERSION: VERSION,
    SCHEMA: SCHEMA,
    build: build,
    toAuditText: toAuditText,
    demo: demo,
    classifyStatement: classifyStatement
  };
})(typeof window !== 'undefined' ? window : globalThis);
