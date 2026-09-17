/**
 * AKSI Episteme v1.0 — Knowledge Resonance Engine
 * sealed complex atoms · holographic bind/unbind · crystallize · derive+provenance
 * © AKSI · aksilove@internet.ru · 2026-09-17
 */
(function (G) {
  "use strict";
  var VERSION = "1.0.0-episteme";
  var STORE = "aksi_episteme_v1";
  var D = 48;
  function zeros(n) { return new Float64Array(n); }
  function hashStr(s) {
    var h = 2166136261, i; s = String(s || "");
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function vecFromText(text) {
    var z = zeros(2 * D), i, h = hashStr(String(text).toLowerCase());
    for (i = 0; i < D; i++) {
      h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
      z[2 * i] = ((h & 0xffff) / 0xffff) * 2 - 1;
      h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
      z[2 * i + 1] = ((h & 0xffff) / 0xffff) * 2 - 1;
      z[2 * i] *= 0.15; z[2 * i + 1] *= 0.15;
    }
    var n2 = 0; for (i = 0; i < z.length; i++) n2 += z[i] * z[i]; n2 = Math.sqrt(n2) || 1;
    for (i = 0; i < z.length; i++) z[i] /= n2; return z;
  }
  function cnorm2(z) { var s = 0, i; for (i = 0; i < z.length; i++) s += z[i] * z[i]; return s; }
  function born(a, b) {
    var re = 0, im = 0, i;
    for (i = 0; i < D; i++) {
      var ar = a[2 * i], ai = a[2 * i + 1], br = b[2 * i], bi = b[2 * i + 1];
      re += ar * br + ai * bi; im += ai * br - ar * bi;
    }
    return (re * re + im * im) / ((cnorm2(a) + 1e-12) * (cnorm2(b) + 1e-12));
  }
  function bind(a, b) {
    var out = zeros(2 * D), k, j, re, im;
    for (k = 0; k < D; k++) {
      re = 0; im = 0;
      for (j = 0; j < D; j++) {
        var i2 = (k - j + D) % D;
        var ar = a[2 * j], ai = a[2 * j + 1], br = b[2 * i2], bi = b[2 * i2 + 1];
        re += ar * br - ai * bi; im += ar * bi + ai * br;
      }
      out[2 * k] = re; out[2 * k + 1] = im;
    }
    var n2 = Math.sqrt(cnorm2(out)) || 1; for (k = 0; k < out.length; k++) out[k] /= n2; return out;
  }
  function unbind(trace, key) {
    var out = zeros(2 * D), k, j, re, im;
    for (k = 0; k < D; k++) {
      re = 0; im = 0;
      for (j = 0; j < D; j++) {
        var i2 = (j + k) % D;
        var tr = trace[2 * j], ti = trace[2 * j + 1], kr = key[2 * i2], ki = key[2 * i2 + 1];
        re += tr * kr + ti * ki; im += ti * kr - tr * ki;
      }
      out[2 * k] = re; out[2 * k + 1] = im;
    }
    var n2 = Math.sqrt(cnorm2(out)) || 1; for (k = 0; k < out.length; k++) out[k] /= n2; return out;
  }
  var atoms = [];
  var SEED = [
    { s: "АКСИ", p: "является", o: "локальным интеллектуальным контуром", src: "seed" },
    { s: "ARIN", p: "является", o: "Seal-Coupled Resonance Network", src: "seed" },
    { s: "Episteme", p: "является", o: "движком кристаллизации знаний АКСИ", src: "seed" },
    { s: "Seal-Coupled", p: "означает", o: "обучение CE плюс Born к seal ответа", src: "seed" },
    { s: "Память АКСИ", p: "хранится", o: "локально на устройстве пользователя", src: "seed" },
    { s: "Integrity gate", p: "отклоняет", o: "ответы со слабым резонансом", src: "seed" },
    { s: "Born-like readout", p: "использует", o: "квадрат модуля комплексного перекрытия", src: "seed" },
    { s: "Контакт АКСИ", p: "равен", o: "aksilove@internet.ru", src: "seed" },
    { s: "Новое знание", p: "появляется", o: "как sealed atom или derived binding с provenance", src: "seed" },
    { s: "Holographic bind", p: "связывает", o: "два концепта через круговую свёртку в ℂ", src: "seed" },
    { s: "Offline-first", p: "означает", o: "польза без обязательного сервера", src: "seed" },
    { s: "CLM", p: "проверяет", o: "воспроизведение записанного факта", src: "seed" }
  ];
  function makeAtom(s, p, o, source) {
    var text = (s + " " + p + " " + o).trim();
    var vec = vecFromText(text);
    return { id: "k_" + hashStr(text).toString(16), subject: s, predicate: p, object: o, text: text, vec: Array.from(vec), seal: hashStr(text + "|" + (source || "taught")).toString(16), source: source || "taught", t: Date.now() };
  }
  function crystallize(s, p, o, source) {
    s = String(s || "").trim(); p = String(p || "является").trim(); o = String(o || "").trim();
    if (!s || !o) return { ok: false, error: "need subject and object" };
    var text = s + " " + p + " " + o;
    for (var i = 0; i < atoms.length; i++) if (atoms[i].text.toLowerCase() === text.toLowerCase()) return { ok: true, atom: atoms[i], deduped: true };
    var atom = makeAtom(s, p, o, source || "taught"); atoms.push(atom); save();
    return { ok: true, atom: atom, newKnowledge: true };
  }
  function parseTeach(line) {
    line = String(line || "").trim();
    var m = line.match(/^(?:знание|crystallize|teach)\s*[:：]\s*(.+)$/i); if (m) line = m[1].trim();
    m = line.match(/^запомни\s*[:：]\s*(.+)$/i); if (m) line = m[1].trim();
    if (line.indexOf("|") >= 0) {
      var parts = line.split("|").map(function (x) { return x.trim(); });
      if (parts.length >= 3) return crystallize(parts[0], parts[1], parts[2], "taught");
      if (parts.length === 2) return crystallize(parts[0], "является", parts[1], "taught");
    }
    m = line.match(/^(.+?)\s+(является|означает|хранит|равен|использует|проверяет|связывает|отклоняет|появляется|усиливает|несёт)\s+(.+)$/i);
    if (m) return crystallize(m[1], m[2], m[3], "taught");
    if (line.length > 3) return crystallize("Пользователь", "сообщил", line, "taught");
    return { ok: false, error: "format: знание: субъект | связь | объект" };
  }
  function lexical(q, text) {
    q = String(q || "").toLowerCase(); text = String(text || "").toLowerCase();
    if (!q || !text) return 0; if (text.indexOf(q) >= 0) return 0.85;
    var qw = q.split(/\s+/).filter(function (w) { return w.length > 2; }); if (!qw.length) return 0;
    var hit = 0; for (var i = 0; i < qw.length; i++) if (text.indexOf(qw[i]) >= 0) hit++; return hit / qw.length;
  }
  function query(q, topK) {
    topK = topK || 5; q = String(q || "").trim(); if (!q) return [];
    var qv = vecFromText(q);
    var scored = atoms.map(function (a) {
      var b = born(qv, Float64Array.from(a.vec));
      var lex = Math.max(lexical(q, a.text), lexical(q, a.subject), lexical(q, a.object));
      return { atom: a, score: 0.45 * b + 0.55 * lex, born: b, lex: lex };
    });
    scored.sort(function (x, y) { return y.score - x.score; });
    return scored.slice(0, topK);
  }
  function derive(subject, predicate) {
    subject = String(subject || "").trim(); predicate = String(predicate || "является").trim();
    if (!subject) return { ok: false, error: "need subject" };
    var related = query(subject, 10); if (!related.length) return { ok: false, error: "no atoms" };
    var direct = [], i;
    for (i = 0; i < related.length; i++) {
      var a = related[i].atom;
      if (a.subject.toLowerCase().indexOf(subject.toLowerCase()) >= 0 || subject.toLowerCase().indexOf(a.subject.toLowerCase()) >= 0) direct.push(related[i]);
    }
    var pool = direct.length ? direct : related;
    var key = vecFromText(subject + "|" + predicate);
    var acc = zeros(2 * D), j, r, bound;
    for (i = 0; i < pool.length; i++) {
      r = pool[i].atom;
      bound = bind(vecFromText(r.subject + "|" + r.predicate), vecFromText(r.object));
      for (j = 0; j < acc.length; j++) acc[j] += bound[j] * (pool[i].score || 0.1);
    }
    var n2 = Math.sqrt(cnorm2(acc)) || 1; for (j = 0; j < acc.length; j++) acc[j] /= n2;
    var retrieved = unbind(acc, key);
    var best = pool[0].atom, bestS = pool[0].score, sc;
    for (i = 0; i < atoms.length; i++) {
      a = atoms[i];
      sc = 0.5 * born(retrieved, vecFromText(a.object)) + 0.5 * lexical(subject, a.subject);
      if (a.predicate.toLowerCase() === predicate.toLowerCase()) sc += 0.15;
      if (sc > bestS) { bestS = sc; best = a; }
    }
    if (bestS < 0.12) { best = pool[0].atom; bestS = pool[0].score; }
    var statement = subject + " " + predicate + " " + best.object;
    if (best.subject.toLowerCase() !== subject.toLowerCase()) statement = best.text + " (связано с «" + subject + "»)";
    var provenance = pool.slice(0, 4).map(function (x) { return { text: x.atom.text, seal: x.atom.seal, score: x.score }; });
    var crystal = crystallize(subject, predicate, best.object, "derived");
    return { ok: true, statement: statement, score: bestS, provenance: provenance, atom: crystal.atom, newKnowledge: !!crystal.newKnowledge, method: "holographic-bind-unbind+lexical" };
  }
  function answer(q) {
    q = String(q || "").trim();
    if (!q) return { text: "Задайте вопрос или: знание: A | связь | B", source: "episteme" };
    if (/^(знание|crystallize|teach|запомни)\s*[:：]/i.test(q) || (q.indexOf("|") >= 0 && /знание|запомни/i.test(q))) {
      var t = parseTeach(q);
      if (!t.ok) return { text: t.error, source: "episteme", low: true };
      return { text: (t.deduped ? "Уже в базе: " : "Новое знание закреплено: ") + t.atom.text + "\nseal: " + t.atom.seal + " · source: " + t.atom.source, source: "episteme-crystallize", atom: t.atom, newKnowledge: !!t.newKnowledge };
    }
    if (/^(выведи|derive|что известно о)\s*[:：]?\s*/i.test(q)) {
      var rest = q.replace(/^(выведи|derive|что известно о)\s*[:：]?\s*/i, "").trim();
      var d = derive(rest, "является");
      if (!d.ok) return { text: "Не удалось вывести: " + (d.error || ""), source: "episteme", low: true };
      var lines = ["Вывод: " + d.statement, "score: " + d.score.toFixed(3) + " · method: " + d.method, "Provenance:"];
      (d.provenance || []).forEach(function (p, i) { lines.push("  " + (i + 1) + ". " + p.text + " (seal " + p.seal + ")"); });
      return { text: lines.join("\n"), source: "episteme-derive", derived: d, newKnowledge: d.newKnowledge };
    }
    var hits = query(q, 5);
    if (!hits.length || hits[0].score < 0.12)
      return { text: "В Episteme нет сильного резонанса. Добавьте: знание: субъект | связь | объект", source: "episteme", low: true };
    var lines2 = ["Резонанс знаний:"];
    hits.forEach(function (h, i) { lines2.push((i + 1) + ". " + h.atom.text + " · " + (h.score * 100).toFixed(1) + "% · " + h.atom.source); });
    return { text: lines2.join("\n"), source: "episteme-query", hits: hits, confidence: hits[0].score };
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify({ version: VERSION, atoms: atoms })); return true; } catch (e) { return false; }
  }
  function load() {
    try { var raw = localStorage.getItem(STORE); if (!raw) return false; var d = JSON.parse(raw); if (!d || !d.atoms) return false; atoms = d.atoms; return true; } catch (e) { return false; }
  }
  function seed() { SEED.forEach(function (x) { crystallize(x.s, x.p, x.o, x.src); }); }
  function status() {
    return { version: VERSION, name: "AKSI Episteme", atoms: atoms.length, dim: D, ready: true, layers: ["complex-atom", "holographic-bind", "correlation-unbind", "crystallize", "derive+provenance"], contribution: "local knowledge crystallization + holographic derive with seal provenance" };
  }
  function claim() {
    return { date: "2026-09-17", contact: "aksilove@internet.ru", claiming: "AKSI Episteme — sealed complex atoms, holographic bind/unbind, crystallize + derive with provenance", notClaiming: "first holographic memory or first complex NN in scientific history", priorArt: "HRR/VSA exist; AKSI packages crystallize+derive+seal trail offline" };
  }
  if (!load() || !atoms.length) seed();
  G.AKSI_EPISTEME = { version: VERSION, crystallize: crystallize, parseTeach: parseTeach, query: query, derive: derive, ask: answer, think: answer, answer: answer, status: status, claim: claim, atoms: function () { return atoms.slice(); }, save: save, load: load, seed: seed };
})(typeof window !== "undefined" ? window : globalThis);
