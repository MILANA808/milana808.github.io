/**
 * AKSI Self-Architecture v2 — offline architecture knowledge
 * Контакт: aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "2.0";
  var CARDS = [
    { id: "what", tags: ["кто ты", "что такое акси", "what is aksi", "продукт", "описание"], title: "Что такое АКСИ",
      body: "АКСИ — локальный offline-first runtime: цифровой напарник + Decision Integrity.\nНе облачный чат-бот. Не AGI. Работает в браузере.\nЯдро: Composer + Neuro + ADIA + Pulse + Skills + память + hybrid crypto.\nСеть — только по согласию.\nКонтакт: aksilove@internet.ru" },
    { id: "pipeline", tags: ["pipeline", "пайплайн", "контур", "как работает", "цепочка"], title: "Путь ответа",
      body: "Запрос → priority (Skills/Pulse/Self-arch) → память → Swarm/Composer/Neuro → ADIA ≥70% → HRR meta → Trust seal.\nLocal показывает 6 шагов pipeline." },
    { id: "mvp34", tags: ["mvp", "v35", "v34", "что нового", "релиз"], title: "MVP v35",
      body: "• Pulse + Sovereign Brief\n• Skill Seeds\n• DistilBERT / эвристика\n• Swarm 1–3\n• Multi-chat IDB\n• Stats + HRR hologram\n• SDP P2P\n• SW auto-update\nКонтакт: aksilove@internet.ru" },
    { id: "pulse", tags: ["pulse", "пульс", "brief", "бриф", "sovereign"], title: "Pulse и Sovereign Brief",
      body: "AKSI Pulse — integrity pulse 0–100 (engineering signal) + карта модулей.\nСпроси «brief» или «пульс» для текстового отчёта демо." },
    { id: "skills", tags: ["навык", "skills", "teach skill"], title: "Skill Seeds",
      body: "навык: имя | инструкция\nсписок навыков\nнавык имя\nХранятся локально." },
    { id: "adia", tags: ["adia", "eqs", "метрики", "seal"], title: "ADIA",
      body: "5 осей: logic, relevance, completeness, empathy, originality. Порог 70% → реген.\nClassifier: DistilBERT online / эвристика offline.\nEQS — инженерный сигнал, не научная константа." },
    { id: "protocol", tags: ["protocol", "протокол", "живой разум", "hrr"], title: "Protocol",
      body: "/protocol/ — HRR, рой, гиперграф, WebRTC, тьютор, OCR, privacy." },
    { id: "crypto", tags: ["crypto", "крипто", "pq", "ecdsa", "trust"], title: "Trust / PQ",
      body: "ECDSA P-256 + AES-GCM. Optional ML-KEM-768. Ключи локальные." },
    { id: "limits", tags: ["ограничения", "limits", "не agi", "честно"], title: "Честные ограничения",
      body: "Не AGI. Три полных LLM параллельно — не default. Метрики — engineering signals. FNV ≠ ECDSA." },
    { id: "demo", tags: ["демо", "конференция", "сценарий"], title: "Сценарий демо",
      body: "1 Ctrl+F5  2 Offline  3 запомни  4 рой  5 brief  6 навык  7 HRR  8 Trust  9 /protocol/" }
  ];
  function norm(s) {
    return String(s || "").toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9\s]/gi, " ").replace(/\s+/g, " ").trim();
  }
  function scoreCard(q, card) {
    var nq = norm(q); if (!nq) return 0;
    var s = 0, title = norm(card.title), blob = norm(card.title + " " + card.body + " " + (card.tags || []).join(" "));
    (card.tags || []).forEach(function (t) {
      var nt = norm(t); if (!nt) return;
      if (nq === nt) s += 14; else if (nq.indexOf(nt) !== -1) s += 8; else if (nt.indexOf(nq) !== -1 && nq.length > 4) s += 5;
    });
    nq.split(" ").forEach(function (w) { if (w.length < 3) return; if (title.indexOf(w) !== -1) s += 4; if (blob.indexOf(w) !== -1) s += 1; });
    return s;
  }
  function search(q) {
    var best = null, score = 0;
    for (var i = 0; i < CARDS.length; i++) {
      var sc = scoreCard(q, CARDS[i]);
      if (sc > score) { score = sc; best = CARDS[i]; }
    }
    if (best && score >= 4) return { card: best, score: score };
    return null;
  }
  function answer(q) {
    var hit = search(q);
    if (!hit) return null;
    return { text: hit.card.title + "\n\n" + hit.card.body, meta: "self-arch · " + hit.card.id, id: hit.card.id, score: hit.score, offline: true };
  }
  function overview() {
    return "АКСИ — offline runtime.\n1) Pulse / Skills / Chat\n2) ADIA assess\n3) Swarm + HRR\n4) Trust PQ\n5) Protocol\nСпроси: brief, статус, навык, pipeline.\nКонтакт: aksilove@internet.ru";
  }
  G.AKSI_SELF_ARCH = { version: VER, search: search, answer: answer, overview: overview, all: function () { return CARDS.map(function (c) { return { id: c.id, title: c.title, tags: c.tags.slice() }; }); }, cards: CARDS };
})(typeof window !== "undefined" ? window : globalThis);
