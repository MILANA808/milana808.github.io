/**
 * AKSI Skills — teach → offline skill
 * навык: имя | инструкция
 * Контакт: aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var KEY = "aksi_skills_v1";
  var skills = [];
  function load() {
    try { skills = JSON.parse(localStorage.getItem(KEY) || "[]"); if (!Array.isArray(skills)) skills = []; }
    catch (e) { skills = []; }
    return skills;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(skills.slice(-80))); } catch (e) {} }
  function normalize(name) { return String(name || "").toLowerCase().replace(/\s+/g, " ").trim(); }
  function upsert(name, body, tags) {
    name = normalize(name);
    if (!name || !body) return null;
    load();
    var existing = skills.find(function (s) { return s.name === name; });
    if (existing) { existing.body = String(body).slice(0, 2000); existing.tags = tags || existing.tags || []; existing.updated = Date.now(); }
    else { skills.push({ name: name, body: String(body).slice(0, 2000), tags: tags || [], created: Date.now(), updated: Date.now(), uses: 0 }); }
    save();
    return skills.find(function (s) { return s.name === name; });
  }
  function remove(name) { load(); var n = normalize(name); skills = skills.filter(function (s) { return s.name !== n; }); save(); }
  function list() { return load().slice().sort(function (a, b) { return (b.updated || 0) - (a.updated || 0); }); }
  function find(query) {
    load();
    var q = normalize(query);
    if (!q) return null;
    var exact = skills.find(function (s) { return s.name === q || q.indexOf(s.name) !== -1; });
    if (exact) return exact;
    var best = null, bestScore = 0;
    skills.forEach(function (s) {
      var score = 0;
      if (q.indexOf(s.name) !== -1) score += 3;
      if (s.name.indexOf(q) !== -1) score += 2;
      (s.tags || []).forEach(function (t) { if (q.indexOf(normalize(t)) !== -1) score += 1; });
      if (score > bestScore) { bestScore = score; best = s; }
    });
    return bestScore > 0 ? best : null;
  }
  function use(nameOrQuery) {
    var s = find(nameOrQuery);
    if (!s) return null;
    s.uses = (s.uses || 0) + 1; s.updated = Date.now(); save(); return s;
  }
  function parseTeach(text) {
    text = String(text || "").trim();
    var m = text.match(/^(?:навык|skill)\s*[:：]\s*([^|]+)\s*[|—\-]\s*([\s\S]+)$/i);
    if (m) return { name: m[1].trim(), body: m[2].trim() };
    m = text.match(/^(?:запомни\s+навык|remember\s+skill)\s+([^:：]+)[:：]\s*([\s\S]+)$/i);
    if (m) return { name: m[1].trim(), body: m[2].trim() };
    return null;
  }
  function answer(q) {
    q = String(q || "");
    var teach = parseTeach(q);
    if (teach) {
      var s = upsert(teach.name, teach.body);
      return { text: "Навык «" + s.name + "» сохранён offline.\nВызов: спроси «навык " + s.name + "»\n\n" + s.body.slice(0, 400), source: "skills", score: 1 };
    }
    if (/^(?:список\s+навыков|list\s+skills|какие\s+навыки)/i.test(q.trim())) {
      var all = list();
      if (!all.length) return { text: "Навыков пока нет.\nСоздай: навык: имя | инструкция", source: "skills", score: 0.9 };
      return { text: "Навыки offline (" + all.length + "):\n\n" + all.map(function (s) { return "• " + s.name + (s.uses ? " · uses " + s.uses : ""); }).join("\n"), source: "skills", score: 0.95 };
    }
    var used = use(q);
    if (used && (/навык|skill|примени|вызови/i.test(q) || (q.toLowerCase().indexOf(used.name) !== -1 && q.length < 80))) {
      return { text: "Навык «" + used.name + "»:\n\n" + used.body, source: "skills", score: 0.88, skill: used };
    }
    return null;
  }
  function injectContext(query) {
    var s = find(query);
    if (!s) return "";
    return "\n[skill:" + s.name + "] " + s.body.slice(0, 300);
  }
  load();
  G.AKSI_SKILLS = { list: list, upsert: upsert, remove: remove, find: find, use: use, parseTeach: parseTeach, answer: answer, injectContext: injectContext };
})(typeof window !== "undefined" ? window : globalThis);
