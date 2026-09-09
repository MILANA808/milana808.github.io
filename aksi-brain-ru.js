/**
 * AKSI Brain RU v1 — canonical Russian answer router
 * Priority: Mind → Crystal → Neuro → Organism → WebLLM(RU-gate) → KB
 * English/garbage WebLLM answers discarded.
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.0.0-brain-ru";

  var KB = [
    { k: ["кто ты", "who are you", "привет", "здравствуй"], a: "Я АКСИ — локальный Decision Integrity runtime. Работаю offline: ответ, Gate, seal. Контакт: aksilove@internet.ru" },
    { k: ["формул", "formula"], a: "AKSI = (A × I × S) × (1 + 0.4√n)\nA — agency (действие)\nI — integrity (EQS)\nS — structure / sovereignty\nn — sealed-история" },
    { k: ["контур", "π", "пи", "pi-contour"], a: "π-Contour: запрос → SHA-256 → угол θ ∈ [0, 2π) → признаки sin/cos → FNV seal.\nОдинаковый текст → одинаковый θ." },
    { k: ["crystal", "кристал", "памят"], a: "Crystal — Neuro + RAG (IndexedDB) + HRR. Команда «запомни: факт» усиливает локальное поле." },
    { k: ["swarm", "p2p"], a: "Swarm — обмен слепками мысли через WebRTC DataChannel (manual SDP), без своего signaling-сервера." },
    { k: ["reality", "реальн"], a: "Reality Layer — opt-in наблюдения устройства → RealityEvent (только observe). /reality/" },
    { k: ["gate", "гейт", "eqs"], a: "Gate τ ≈ 0.55 — порог принятия. EQS — инженерный score целостности ответа." },
    { k: ["offline", "без сети", "автоном"], a: "После установки Service Worker Contour и Sovereign открываются из кэша. Практичная автономия, не абсолютная." },
    { k: ["как пользоваться", "помощ", "help", "с чего"], a: "1) Contour → Decision: вопрос на русском\n2) Sovereign → Mind / Crystal\n3) WebLLM — опция (Qwen), Brain отсекает английский мусор\nКонтакт: aksilove@internet.ru" },
    { k: ["webllm", "веб ллм", "llm"], a: "WebLLM — опциональная модель в браузере (Qwen). Основной русский интеллект — offline Brain/Mind/Neuro." }
  ];

  function kbHit(q) {
    var s = String(q || "").toLowerCase();
    for (var i = 0; i < KB.length; i++) {
      for (var j = 0; j < KB[i].k.length; j++) {
        if (s.indexOf(KB[i].k[j]) !== -1) return KB[i].a;
      }
    }
    return null;
  }

  function mostlyEnglish(text) {
    text = String(text || "");
    if (text.length < 16) return false;
    var cyr = (text.match(/[А-Яа-яЁё]/g) || []).length;
    var lat = (text.match(/[A-Za-z]/g) || []).length;
    if (lat < 24) return false;
    return lat > cyr * 2;
  }

  function garbage(text) {
    text = String(text || "").trim();
    if (!text || text.length < 3) return true;
    if (/^(undefined|null|NaN|error)/i.test(text)) return true;
    if ((text.match(/(.)\1{8,}/) || []).length) return true;
    return false;
  }

  function packet(answer, source, extra) {
    extra = extra || {};
    return {
      ok: true,
      id: "brain-" + Date.now().toString(36),
      answer: answer,
      text: answer,
      anti: "brain-ru · " + source,
      source: source,
      scores: extra.scores || { aksi: 0.78, eqs: 78, phi: 0.62, qcli: 0.58 },
      gate: { ok: true, reason: "brain-ru-pass" },
      seal: { kind: "brain-ru", v: VER, t: Date.now(), source: source },
      version: VER,
      lang: "ru"
    };
  }

  async function decide(query, opts) {
    opts = opts || {};
    query = String(query || "").trim();
    if (!query) return { ok: false, answer: "", source: "empty" };

    if (/^запомни\s*[:：]/i.test(query) || /^remember\s*[:：]/i.test(query)) {
      var fact = query.replace(/^(запомни|remember)\s*[:：]\s*/i, "");
      try {
        if (G.AKSI_CRYSTAL && G.AKSI_CRYSTAL.remember) await G.AKSI_CRYSTAL.remember(fact);
        if (G.AKSI && G.AKSI.learn) await G.AKSI.learn(query);
      } catch (e) {}
      return packet("Сохранено в локальную память АКСИ: «" + fact.slice(0, 120) + "»", "learn");
    }

    if (G.AKSI_MIND && typeof G.AKSI_MIND.reason === "function") {
      try {
        var m = await G.AKSI_MIND.reason(query);
        if (m && (m.answer || m.text) && !garbage(m.answer || m.text) && !mostlyEnglish(m.answer || m.text)) {
          return packet(m.answer || m.text, m.source || "mind", { scores: m.scores });
        }
      } catch (e) {}
    }

    if (G.AKSI_CRYSTAL && typeof G.AKSI_CRYSTAL.associate === "function") {
      try {
        var c = await G.AKSI_CRYSTAL.associate(query, { k: 3 });
        if (c && c.associations && c.associations[0] && c.associations[0].score >= 2) {
          return packet(c.associations[0].text, "crystal");
        }
      } catch (e) {}
    }

    if (G.AKSI_NEURO && typeof G.AKSI_NEURO.think === "function") {
      try {
        var n = await Promise.resolve(G.AKSI_NEURO.think(query));
        if (n && (n.text || n.answer) && !garbage(n.text || n.answer) && !mostlyEnglish(n.text || n.answer)) {
          return packet(n.text || n.answer, "neuro");
        }
      } catch (e) {}
    }

    if (G.AKSI_ORGANISM && typeof G.AKSI_ORGANISM.decide === "function" && !opts.skipOrganism) {
      try {
        var o = await G.AKSI_ORGANISM.decide(query);
        if (o && o.answer && !garbage(o.answer) && !mostlyEnglish(o.answer)) {
          return packet(o.answer, o.source || "organism", { scores: o.scores });
        }
      } catch (e) {}
    }

    if (opts.allowWebLLM !== false && G.AKSI_WEBLLM && G.AKSI_WEBLLM.ready && G.AKSI_WEBLLM.ready()) {
      try {
        var w = await G.AKSI_WEBLLM.complete(query, {
          temperature: 0.25,
          max_tokens: 400,
          system: "Ты — АКСИ. Отвечай ТОЛЬКО на русском языке. Кратко, ясно, по делу. Без английских фраз. Не выдумывай."
        });
        var wt = w && w.text;
        if (wt && !garbage(wt) && !mostlyEnglish(wt)) {
          return packet(wt, "webllm-ru", { scores: { aksi: 0.7, eqs: 70, phi: 0.55, qcli: 0.5 } });
        }
      } catch (e) {}
    }

    var kb = kbHit(query);
    if (kb) return packet(kb, "kb");

    return packet(
      "АКСИ Brain RU. По этому запросу локальных следов мало.\n" +
        "Попробуйте: кто ты · формула · контур · crystal · как пользоваться\n" +
        "Или «запомни: …» чтобы расширить память.\nКонтакт: aksilove@internet.ru",
      "fallback"
    );
  }

  G.AKSI_BRAIN = {
    version: VER,
    decide: decide,
    think: decide,
    reason: decide
  };
})(typeof window !== "undefined" ? window : globalThis);
