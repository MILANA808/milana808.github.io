/**
 * AKSI WHOLE Runtime v1.0 — one pipeline, offline-first
 * FAQ → Memory → Neuro-SEED → ADIA rank/seal → optional note on WebLLM
 * Contact: aksilove@internet.ru · Proprietary
 */
(function (G) {
  'use strict';
  var VERSION = '1.0.0-whole';
  var MEM_KEY = 'aksi_whole_memory_v1';
  var LEDGER_KEY = 'aksi_whole_ledger_v1';
  var POLICY = { companion: 55, lab: 70, strict: 80 };

  function clamp01(x) {
    x = Number(x);
    if (isNaN(x)) return 0;
    return x < 0 ? 0 : x > 1 ? 1 : x;
  }
  function round(x, d) {
    d = d == null ? 2 : d;
    var p = Math.pow(10, d);
    return Math.round(Number(x) * p) / p;
  }
  function fnv(s) {
    var h = 0x811c9dc5;
    s = String(s || '');
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return ('00000000' + (h >>> 0).toString(16)).slice(-8);
  }
  function tokenize(s) {
    return String(s || '')
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter(function (w) {
        return w.length > 1;
      });
  }

  var FAQ = [
    {
      keys: ['кто ты', 'что ты', 'who are you', 'представься'],
      a: 'Я АКСИ WHOLE — единый offline runtime: память, метрики ADIA, gate, seal. Без обязательного сервера. Контакт: aksilove@internet.ru'
    },
    {
      keys: ['aksi', 'акси', 'что такое aksi', 'что такое акси'],
      a: 'АКСИ — суверенный агентный слой: offline-first, свои метрики (EQS/QCLI), формула AKSI=(A×I×S)×(1+0.4√n), память на устройстве, integrity seal. Сайт: milana808.github.io'
    },
    {
      keys: ['помощь', 'help', 'команды', 'как пользоваться', 'инструкция'],
      a: 'Команды:\n• вопрос — ответ из FAQ / SEED / памяти + оценка ADIA\n• запомни: факт — сохранить локально\n• seal — в цепочке integrity (FNV)\n• Export — скачать память JSON\nWebLLM (большая модель) — отдельно, нужен Chrome/Edge + GPU.'
    },
    {
      keys: ['adia', 'eqs', 'формула', 'метрики'],
      a: 'ADIA 3.0: кандидаты → EQS/QCLI/structure → rank → seal.\nEQS 0–100 (энтропия, связность, trust, overlap).\nAKSI=(A×I×S)×(1+0.4√n). Сигналы engineering, не «доказательство сознания».'
    },
    {
      keys: ['привет', 'hello', 'здравствуй', 'хай'],
      a: 'Привет. Я WHOLE на твоём устройстве. Спроси «помощь», «что такое АКСИ» или «запомни: …».'
    },
    {
      keys: ['память', 'memory', 'запомни'],
      a: 'Память локальная (localStorage). «запомни: текст» пишет факт. Recall по словам + score. Export скачивает JSON.'
    },
    {
      keys: ['webgpu', 'llm', 'модель', 'не работает', 'не грузится'],
      a: 'Большая LLM (WebLLM) нужна только для генерации «как ChatGPT». WHOLE отвечает без GPU: FAQ + SEED + память + ADIA. GPU — опция, не требование.'
    },
    {
      keys: ['контакт', 'почта', 'email'],
      a: 'aksilove@internet.ru · X @AKSILOVE'
    },
    {
      keys: ['offline', 'офлайн', 'сервер'],
      a: 'Ядро offline. Данные на устройстве. Сервер не обязателен.'
    },
    {
      keys: ['seal', 'ledger', 'подпись', 'proof'],
      a: 'Каждый ответ может получить FNV integrity seal в локальный ledger (query|answer|EQS|prev). Это product integrity chain, не блокчейн и не юр. proof.'
    }
  ];

  function faqAnswer(q) {
    var low = String(q || '').toLowerCase().trim();
    if (!low) return null;
    var best = null;
    var bestScore = 0;
    for (var i = 0; i < FAQ.length; i++) {
      var item = FAQ[i];
      var score = 0;
      for (var k = 0; k < item.keys.length; k++) {
        if (low.indexOf(item.keys[k]) !== -1) score += 2 + item.keys[k].length / 20;
      }
      if (score > bestScore) {
        bestScore = score;
        best = item.a;
      }
    }
    return bestScore >= 2 ? best : null;
  }

  var SEED = [
    {
      q: ['что такое adia', 'adia'],
      a: 'ADIA — Resonance Decision Engine АКСИ: ranking ответов по EQS, QCLI, structure, source trust; optional FNV seal.'
    },
    {
      q: ['что умеешь', 'возможности'],
      a: 'Offline ответ, обучение «запомни:», метрики EQS/QCLI/AKSI, gate, seal, export памяти. Опционально WebLLM при GPU.'
    },
    {
      q: ['протокол', 'agent-v1'],
      a: 'Agent protocol: envelope handshake / query / response + identity. WHOLE — product surface поверх протокола и ADIA.'
    },
    {
      q: ['quantum', 'квант'],
      a: 'В продукте — классическая симуляция state-vector для UX/route. Не физический квантовый компьютер.'
    },
    {
      q: ['white-label', 'лицензия', 'купить'],
      a: 'Коммерция: runtime + ADIA + white-label (Studio/Business/Enterprise). Письмо: aksilove@internet.ru. Не продаём «магическую LLM».'
    }
  ];

  function seedAnswer(q) {
    var low = String(q || '').toLowerCase();
    var words = tokenize(low);
    var best = null;
    var bestScore = 0;
    for (var i = 0; i < SEED.length; i++) {
      var s = 0;
      var keys = SEED[i].q;
      for (var k = 0; k < keys.length; k++) {
        if (low.indexOf(keys[k]) !== -1) s += 3;
      }
      for (var w = 0; w < words.length; w++) {
        for (var k2 = 0; k2 < keys.length; k2++) {
          if (keys[k2].indexOf(words[w]) !== -1) s += 1;
        }
      }
      if (s > bestScore) {
        bestScore = s;
        best = SEED[i].a;
      }
    }
    return bestScore >= 2 ? best : null;
  }

  function loadMem() {
    try {
      var raw = localStorage.getItem(MEM_KEY);
      var a = raw ? JSON.parse(raw) : [];
      return Array.isArray(a) ? a : [];
    } catch (e) {
      return [];
    }
  }
  function saveMem(arr) {
    try {
      localStorage.setItem(MEM_KEY, JSON.stringify(arr.slice(-200)));
    } catch (e) {}
  }
  function remember(text, tag) {
    var t = String(text || '').trim();
    if (!t) return null;
    var arr = loadMem();
    var rec = {
      id: 'm_' + fnv(t + Date.now()),
      text: t,
      tag: tag || 'fact',
      ts: Date.now()
    };
    arr.push(rec);
    saveMem(arr);
    return rec;
  }
  function recall(q, k) {
    k = k || 5;
    var words = tokenize(q);
    var arr = loadMem();
    var scored = [];
    for (var i = 0; i < arr.length; i++) {
      var t = String(arr[i].text || '').toLowerCase();
      var s = 0;
      for (var w = 0; w < words.length; w++) {
        if (t.indexOf(words[w]) !== -1) s += 1;
      }
      if (s > 0) scored.push({ text: arr[i].text, score: s, id: arr[i].id });
    }
    scored.sort(function (a, b) {
      return b.score - a.score;
    });
    return scored.slice(0, k);
  }

  function entropy(s) {
    s = String(s || '');
    if (!s.length) return 0;
    var freq = {};
    var i;
    for (i = 0; i < s.length; i++) freq[s[i]] = (freq[s[i]] || 0) + 1;
    var h = 0;
    var n = s.length;
    Object.keys(freq).forEach(function (c) {
      var p = freq[c] / n;
      h -= p * Math.log2(p);
    });
    return h;
  }
  function qcli(s) {
    var h = entropy(s);
    var alpha = {};
    String(s || '').split('').forEach(function (c) {
      alpha[c] = 1;
    });
    var k = Object.keys(alpha).length || 1;
    return clamp01(h / Math.log2(Math.max(k, 2)));
  }
  function coherence(s) {
    s = String(s || '');
    var lines = s.split(/\n/).filter(Boolean).length;
    var words = s.split(/\s+/).filter(Boolean).length;
    var hasList = /[-•*]|\d\./.test(s) ? 0.1 : 0;
    return clamp01(0.35 + Math.min(0.4, words / 80) + Math.min(0.15, lines / 10) + hasList);
  }
  function overlap(q, a) {
    var qw = tokenize(q);
    var aw = tokenize(a);
    if (!qw.length || !aw.length) return 0;
    var set = {};
    aw.forEach(function (w) {
      set[w] = 1;
    });
    var hit = 0;
    qw.forEach(function (w) {
      if (set[w]) hit++;
    });
    return hit / qw.length;
  }
  function structureOf(text) {
    var s = String(text || '');
    var bullets = (s.match(/^[\s]*[-•*\d]/gm) || []).length;
    var paras = s.split(/\n\n/).filter(Boolean).length;
    return clamp01(0.4 + Math.min(0.3, bullets * 0.05) + Math.min(0.3, paras * 0.08));
  }
  function eqs(text, o) {
    o = o || {};
    var h = entropy(text);
    var rel = clamp01(0.5 + (o.overlap || 0) * 0.5);
    var coh = coherence(text);
    var trust = o.trust != null ? o.trust : 0.7;
    var mem = clamp01(o.overlap || 0);
    var raw =
      0.3 * clamp01(h / 5) + 0.35 * rel + 0.25 * coh + 0.1 * trust * 0.5 + 0.15 * mem;
    return round(Math.min(100, raw * 100), 1);
  }
  function aksiScore(eqsValue, structure, n) {
    var A = 0.9;
    var I = clamp01((eqsValue || 0) / 100);
    var S = clamp01(structure || 0.5);
    n = Math.max(0, Number(n) || 0);
    return round(A * I * S * (1 + 0.4 * Math.sqrt(n)), 4);
  }
  function score(query, answer, opts) {
    opts = opts || {};
    var text = typeof answer === 'string' ? answer : answer.text || '';
    var src = typeof answer === 'string' ? opts.source || 'local' : answer.source || 'local';
    var ov = overlap(query, text);
    var trust =
      src === 'faq' ? 0.85 : src === 'seed' ? 0.75 : src === 'memory' ? 0.8 : 0.65;
    var EQS = eqs(text, { overlap: ov, trust: trust });
    var struct = structureOf(text);
    var n = loadLedger().length;
    return {
      EQS: EQS,
      QCLI: round(qcli(text), 3),
      H: round(entropy(text), 3),
      overlap: round(ov, 3),
      structure: round(struct, 3),
      AKSI: aksiScore(EQS, struct, n),
      source: src
    };
  }

  function loadLedger() {
    try {
      var a = JSON.parse(localStorage.getItem(LEDGER_KEY) || '[]');
      return Array.isArray(a) ? a : [];
    } catch (e) {
      return [];
    }
  }
  function saveLedger(a) {
    try {
      localStorage.setItem(LEDGER_KEY, JSON.stringify(a.slice(-100)));
    } catch (e) {}
  }
  function seal(query, answer, metrics) {
    var prev = loadLedger();
    var prevHash = prev.length ? prev[prev.length - 1].hash : 'genesis';
    var payload =
      String(query).slice(0, 200) +
      '|' +
      String(answer).slice(0, 400) +
      '|' +
      (metrics && metrics.EQS) +
      '|' +
      prevHash;
    var hash = fnv(payload);
    var entry = {
      hash: hash,
      prev: prevHash,
      at: new Date().toISOString(),
      EQS: metrics && metrics.EQS,
      AKSI: metrics && metrics.AKSI,
      q: String(query).slice(0, 80)
    };
    prev.push(entry);
    saveLedger(prev);
    return entry;
  }

  function gate(metrics, q) {
    var eqs = (metrics && metrics.EQS) || 0;
    var low = String(q || '').toLowerCase();
    if (/удали всё|взлом|hack|password dump/i.test(low)) {
      return { decision: 'DENY', reason: 'policy', conf: 0.9 };
    }
    if (eqs >= 70) return { decision: 'ALLOW', reason: 'high_eqs', conf: 0.85 };
    if (eqs >= 55) return { decision: 'ALLOW', reason: 'companion', conf: 0.7 };
    if (eqs >= 40) return { decision: 'ALLOW', reason: 'weak_ok', conf: 0.55 };
    return { decision: 'ALLOW', reason: 'fallback', conf: 0.4 };
  }

  function ask(query, opts) {
    opts = opts || {};
    var q = String(query || '').trim();
    if (!q) {
      return { ok: false, text: '', source: 'empty' };
    }

    var teach = q.match(/^(?:запомни|remember)\s*[:：]\s*(.+)$/i);
    if (teach) {
      var rec = remember(teach[1].trim());
      return {
        ok: true,
        text: '✓ Сохранено в локальную память (' + (rec && rec.id) + ')',
        source: 'memory_write',
        metrics: null,
        gate: { decision: 'ALLOW', reason: 'teach' },
        seal: null
      };
    }

    var candidates = [];
    var f = faqAnswer(q);
    if (f) candidates.push({ text: f, source: 'faq' });
    var s = seedAnswer(q);
    if (s) candidates.push({ text: s, source: 'seed' });
    var hits = recall(q, 3);
    for (var i = 0; i < hits.length; i++) {
      candidates.push({ text: hits[i].text, source: 'memory' });
    }

    if (!candidates.length) {
      var fallback =
        'Пока нет сильного совпадения. Напиши «помощь» или «запомни: факт», чтобы наполнить память.';
      candidates.push({ text: fallback, source: 'safe' });
    }

    var ranked = [];
    for (var j = 0; j < candidates.length; j++) {
      var c = candidates[j];
      var m = score(q, c, {});
      ranked.push({ text: c.text, source: c.source, metrics: m, pass: m.EQS >= POLICY.companion });
    }
    ranked.sort(function (a, b) {
      if (b.metrics.EQS !== a.metrics.EQS) return b.metrics.EQS - a.metrics.EQS;
      return b.metrics.AKSI - a.metrics.AKSI;
    });

    var best = ranked[0];
    for (var r = 0; r < ranked.length; r++) {
      if (ranked[r].source === 'faq' || ranked[r].source === 'seed') {
        best = ranked[r];
        break;
      }
    }

    var g = gate(best.metrics, q);
    var sealed = null;
    if (opts.seal !== false) {
      sealed = seal(q, best.text, best.metrics);
    }

    return {
      ok: true,
      text: best.text,
      source: best.source,
      metrics: best.metrics,
      gate: g,
      seal: sealed,
      ranked: ranked.slice(0, 5),
      version: VERSION,
      formula: 'AKSI=(A×I×S)×(1+0.4√n)'
    };
  }

  function status() {
    return {
      version: VERSION,
      name: 'AKSI WHOLE',
      memory: loadMem().length,
      ledger: loadLedger().length,
      formula: 'AKSI=(A×I×S)×(1+0.4√n)',
      modules: ['faq', 'seed', 'memory', 'adia', 'gate', 'seal'],
      contact: 'aksilove@internet.ru'
    };
  }

  function exportMemory() {
    var payload = {
      format: 'aksi-whole-export',
      version: VERSION,
      exportedAt: new Date().toISOString(),
      memory: loadMem(),
      ledger: loadLedger()
    };
    return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  }

  function clearMemory() {
    saveMem([]);
    return true;
  }

  G.AKSI_WHOLE = {
    version: VERSION,
    ask: ask,
    remember: remember,
    recall: recall,
    status: status,
    exportMemory: exportMemory,
    clearMemory: clearMemory,
    score: score,
    faqAnswer: faqAnswer
  };
})(typeof window !== 'undefined' ? window : globalThis);
