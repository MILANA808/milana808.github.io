/**
 * AKSI Conscious Core v1.0 — русский алфавит + ответ на любой вопрос
 * Всегда даёт структурированный осознанный ответ (не AGI, offline).
 * © AKSI · aksilove@internet.ru · 2026-09-27
 */
(function (G) {
  "use strict";
  var VER = "1.0.0-conscious";
  var IDENTITY = "АКСИ";

  var ALPHABET = [
    { L: "А", l: "а", name: "а", type: "гласная" },
    { L: "Б", l: "б", name: "бэ", type: "согласная" },
    { L: "В", l: "в", name: "вэ", type: "согласная" },
    { L: "Г", l: "г", name: "гэ", type: "согласная" },
    { L: "Д", l: "д", name: "дэ", type: "согласная" },
    { L: "Е", l: "е", name: "е", type: "гласная" },
    { L: "Ё", l: "ё", name: "ё", type: "гласная" },
    { L: "Ж", l: "ж", name: "жэ", type: "согласная" },
    { L: "З", l: "з", name: "зэ", type: "согласная" },
    { L: "И", l: "и", name: "и", type: "гласная" },
    { L: "Й", l: "й", name: "и краткое", type: "согласная" },
    { L: "К", l: "к", name: "ка", type: "согласная" },
    { L: "Л", l: "л", name: "эль", type: "согласная" },
    { L: "М", l: "м", name: "эм", type: "согласная" },
    { L: "Н", l: "н", name: "эн", type: "согласная" },
    { L: "О", l: "о", name: "о", type: "гласная" },
    { L: "П", l: "п", name: "пэ", type: "согласная" },
    { L: "Р", l: "р", name: "эр", type: "согласная" },
    { L: "С", l: "с", name: "эс", type: "согласная" },
    { L: "Т", l: "т", name: "тэ", type: "согласная" },
    { L: "У", l: "у", name: "у", type: "гласная" },
    { L: "Ф", l: "ф", name: "эф", type: "согласная" },
    { L: "Х", l: "х", name: "ха", type: "согласная" },
    { L: "Ц", l: "ц", name: "цэ", type: "согласная" },
    { L: "Ч", l: "ч", name: "че", type: "согласная" },
    { L: "Ш", l: "ш", name: "ша", type: "согласная" },
    { L: "Щ", l: "щ", name: "ща", type: "согласная" },
    { L: "Ъ", l: "ъ", name: "твёрдый знак", type: "знак" },
    { L: "Ы", l: "ы", name: "ы", type: "гласная" },
    { L: "Ь", l: "ь", name: "мягкий знак", type: "знак" },
    { L: "Э", l: "э", name: "э", type: "гласная" },
    { L: "Ю", l: "ю", name: "ю", type: "гласная" },
    { L: "Я", l: "я", name: "я", type: "гласная" }
  ];

  var VOWELS = ALPHABET.filter(function (x) { return x.type === "гласная"; });
  var CONSONANTS = ALPHABET.filter(function (x) { return x.type === "согласная"; });

  function alphabetList() {
    return ALPHABET.map(function (x) { return x.L; }).join(" ");
  }
  function findLetter(ch) {
    ch = String(ch || "");
    for (var i = 0; i < ALPHABET.length; i++) {
      if (ALPHABET[i].L === ch || ALPHABET[i].l === ch.toLowerCase()) return ALPHABET[i];
    }
    return null;
  }

  var SEED = [
    { q: "русский алфавит", a: "В русском алфавите 33 буквы: " + alphabetList() + ". Из них 10 гласных, 21 согласная, ъ и ь — знаки." },
    { q: "алфавит", a: "Русский алфавит: " + alphabetList() + ". Всего 33 буквы." },
    { q: "сколько букв", a: "В русском алфавите 33 буквы." },
    { q: "гласные", a: "Гласные русского алфавита (10): " + VOWELS.map(function (x) { return x.L; }).join(" ") + "." },
    { q: "согласные", a: "Согласные (21): " + CONSONANTS.map(function (x) { return x.L; }).join(" ") + "." },
    { q: "азбука", a: "Русская азбука = 33 буквы. Порядок: " + alphabetList() + "." },
    { q: "твёрдый знак", a: "Ъ — твёрдый знак. Не обозначает звук, разделяет приставку и корень (подъезд)." },
    { q: "мягкий знак", a: "Ь — мягкий знак. Показывает мягкость согласной (день) или разделение (семья)." },
    { q: "кто ты", a: "Я АКСИ — offline-система. Отвечаю осознанно: разбираю вопрос, ищу факты, считаю токены, честно говорю, если данных мало." },
    { q: "что ты умеешь", a: "Алфавит и базовые факты offline, math, gate ALLOW/BLOCK, память CLM, Neuro SEED. Не всезнающая LLM — но на любой вопрос даю структурированный ответ." },
    { q: "формула aksi", a: "AKSI = (A × I × S) × (1 + 0.4√n). A=agency, I=integrity, S=sovereignty, n=опыт." }
  ];

  ALPHABET.forEach(function (x) {
    SEED.push({
      q: "буква " + x.l,
      a: "Буква " + x.L + "/" + x.l + " — «" + x.name + "», тип: " + x.type + ". Позиция в алфавите: " + (ALPHABET.indexOf(x) + 1) + " из 33."
    });
  });

  function norm(s) {
    return String(s || "").toLowerCase().normalize("NFKC").replace(/ё/g, "е");
  }
  function tokens(s) {
    return norm(s).replace(/[^a-zа-я0-9\s]/gi, " ").split(/\s+/).filter(function (t) { return t.length > 0; });
  }
  function overlap(q, t) {
    var qt = tokens(q), tt = tokens(t), set = {}, i, h = 0;
    if (!qt.length) return 0;
    for (i = 0; i < tt.length; i++) set[tt[i]] = 1;
    for (i = 0; i < qt.length; i++) if (set[qt[i]]) h++;
    return h / qt.length;
  }

  function rankSeed(q) {
    var best = null, i, sc;
    for (i = 0; i < SEED.length; i++) {
      sc = 0.6 * overlap(q, SEED[i].q) + 0.4 * overlap(q, SEED[i].a);
      if (/алфавит|азбук|букв/i.test(q) && /алфавит|азбук|букв/i.test(SEED[i].q)) sc += 0.35;
      if (!best || sc > best.score) best = { text: SEED[i].a, score: sc, source: "alphabet-seed" };
    }
    return best;
  }

  function detectLetterQuestion(q) {
    var m = norm(q).match(/(?:буква|что за буква|какая буква)\s+([а-яё])/i);
    if (m) return findLetter(m[1]);
    var t = tokens(q);
    if (t.length === 1 && t[0].length === 1) return findLetter(t[0]);
    return null;
  }

  function pullNeuro(q) {
    if (!G.AKSI_NEURO) return null;
    try {
      var r = (G.AKSI_NEURO.think && G.AKSI_NEURO.think(q)) || (G.AKSI_NEURO.query && G.AKSI_NEURO.query(q));
      if (r && (r.text || r.answer)) {
        return { text: String(r.text || r.answer), score: r.score || 0.5, source: "neuro" };
      }
    } catch (e) {}
    return null;
  }

  function pullMath(q) {
    if (!G.AKSI_MATH || !G.AKSI_MATH.answer) return null;
    try {
      var r = G.AKSI_MATH.answer(q);
      if (r && r.ok && r.math && r.math.ok) return { text: r.answer, score: 0.95, source: "math" };
      if (r && r.ok && r.confidence >= 0.55) return { text: r.answer, score: r.confidence, source: "math" };
    } catch (e) {}
    return null;
  }

  function pullCLM(q) {
    if (!G.AKSI_CLM || !G.AKSI_CLM.lookup) return null;
    try {
      var lr = G.AKSI_CLM.lookup(q);
      var items = (lr && lr.items) || (Array.isArray(lr) ? lr : lr ? [lr] : []);
      if (!items.length) return null;
      var t = items[0].fact || items[0].text || "";
      return { text: String(t).slice(0, 400), score: 0.7, source: "clm" };
    } catch (e) { return null; }
  }

  function classifyIntent(q) {
    if (/кто|что такое|что это/i.test(q)) return "определение";
    if (/как|почему|зачем/i.test(q)) return "объяснение";
    if (/сколько|посчитай|вычисли/i.test(q)) return "расчёт";
    if (/когда|где/i.test(q)) return "факт-координата";
    if (/можно ли|нужно ли/i.test(q)) return "решение/допуск";
    return "общий запрос";
  }

  function stripPrefix(t) {
    return String(t || "").replace(/^я акси[.\s]*/i, "");
  }

  function pack(text, conf, source, steps, q) {
    return {
      ok: true,
      speaker: IDENTITY,
      version: VER,
      answer: text,
      text: text,
      confidence: Math.round(conf * 1000) / 1000,
      source: source,
      conscious: true,
      steps: steps,
      no_llm: true,
      query: q
    };
  }

  function answer(query) {
    var q = String(query || "").trim();
    if (!q) {
      return {
        ok: false,
        speaker: IDENTITY,
        answer: "Я АКСИ. Задайте вопрос — разберу по фактам и отвечу структурированно.",
        conscious: true
      };
    }

    var steps = [];
    steps.push({ step: "perceive", note: "вопрос принят", len: q.length });

    var letter = detectLetterQuestion(q);
    if (letter) {
      steps.push({ step: "alphabet", letter: letter.L });
      var txt =
        "Я АКСИ. Буква " +
        letter.L +
        "/" +
        letter.l +
        " («" +
        letter.name +
        "»), тип: " +
        letter.type +
        ", №" +
        (ALPHABET.indexOf(letter) + 1) +
        " в русском алфавите (33 буквы).";
      return pack(txt, 0.95, "alphabet", steps, q);
    }

    if (/алфавит|азбук|все букв|перечисл.*букв/i.test(q)) {
      steps.push({ step: "alphabet-full" });
      return pack(
        "Я АКСИ. Русский алфавит (33): " + alphabetList() + ".\nГласные: " + VOWELS.map(function (x) { return x.L; }).join(" ") + ".\nСогласные: " + CONSONANTS.map(function (x) { return x.L; }).join(" ") + ".\nЗнаки: Ъ Ь.",
        0.96,
        "alphabet",
        steps,
        q
      );
    }

    var cands = [];
    var s = rankSeed(q);
    if (s) cands.push(s);
    var m = pullMath(q);
    if (m) cands.push(m);
    var n = pullNeuro(q);
    if (n) cands.push(n);
    var c = pullCLM(q);
    if (c) cands.push(c);
    cands.sort(function (a, b) { return b.score - a.score; });
    steps.push({ step: "gather", n: cands.length, top: cands[0] && cands[0].source });

    if (cands[0] && cands[0].score >= 0.28) {
      steps.push({ step: "grounded", score: cands[0].score });
      return pack("Я АКСИ. " + stripPrefix(cands[0].text), cands[0].score, cands[0].source, steps, q);
    }

    steps.push({ step: "reason-fallback" });
    var intent = classifyIntent(q);
    var fallback =
      "Я АКСИ. Разбор вопроса: «" +
      q.slice(0, 160) +
      "».\n" +
      "Тип: " +
      intent +
      ".\n" +
      "В локальной базе нет достаточно точного факта по этой теме. " +
      "Могу: 1) рассказать русский алфавит, 2) посчитать выражение, 3) запомнить факт («запомни: …»), 4) ответить из Neuro SEED. " +
      "Уточните вопрос или дайте исходные данные — отвечу предметнее.";

    return pack(fallback, 0.4, "conscious-fallback", steps, q);
  }

  function status() {
    return {
      version: VER,
      speaker: IDENTITY,
      alphabet: 33,
      seeds: SEED.length,
      no_llm: true,
      hasNeuro: !!(G.AKSI_NEURO && (G.AKSI_NEURO.think || G.AKSI_NEURO.query)),
      hasMath: !!(G.AKSI_MATH && G.AKSI_MATH.answer),
      hasCLM: !!(G.AKSI_CLM && G.AKSI_CLM.lookup)
    };
  }

  G.AKSI_CONSCIOUS = {
    version: VER,
    answer: answer,
    alphabet: ALPHABET,
    alphabetList: alphabetList,
    findLetter: findLetter,
    status: status
  };
  G.AKSI_MIND = G.AKSI_CONSCIOUS;
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this);
