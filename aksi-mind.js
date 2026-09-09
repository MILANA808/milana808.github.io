/**
 * AKSI Mind Core v1.1 — multi-layer local intelligence
 * Path: Crystal → Organism/API → Neuro → structured local KB
 * No AGI claims. Contact: aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.1.0-mind";

  var KB = [
    { k: ["кто ты", "what are you", "привет", "hello"], a: "Я АКСИ — локальный Decision Integrity runtime. Ответ · Gate · seal. Работаю offline. Контакт: aksilove@internet.ru" },
    { k: ["формул", "formula"], a: "AKSI = (A × I × S) × (1 + 0.4√n)\nA — agency (действие)\nI — integrity (EQS/100)\nS — structure / sovereignty\nn — число sealed-записей в истории" },
    { k: ["контур", "π", "pi", "пи"], a: "π-Contour: запрос → SHA-256 → угол θ ∈ [0, 2π) → признаки sin/cos → FNV seal.\nДетерминировано: тот же текст → тот же θ." },
    { k: ["crystal", "кристал", "памят", "memory", "hrr"], a: "Crystal — трёхслойная память: Neuro (лексика) + RAG (IndexedDB) + HRR (голографическое поле).\nКоманда «запомни: факт» вписывает след во все доступные слои." },
    { k: ["swarm", "p2p", "пир"], a: "Swarm — обмен слепками мысли по WebRTC DataChannel.\nManual SDP: Offer → Answer, без своего signaling-сервера." },
    { k: ["gate", "гейт", "eqs"], a: "Gate τ ≈ 0.55 — порог принятия решения.\nEQS — инженерный score целостности ответа (не научная константа)." },
    { k: ["vault", "шифр", "crypto"], a: "Vault / PiFractal: локальное AES-GCM. Соль из геометрии Math.PI + PBKDF2. Данные по умолчанию не уходят в облако." },
    { k: ["offline", "автоном", "без сети", "sovereign"], a: "Service Worker кэширует shell. Contour и Sovereign работают без сети после установки SW.\nПрактичная автономия — не абсолютная «неубиваемость»." },
    { k: ["как пользоваться", "с чего начать", "help", "помощ"], a: "1) Contour → Decision\n2) Sovereign → Mind / Crystal\n3) Swarm: обмен через SDP\nСтарт: /contour/ и /sovereign/index.html" },
    { k: ["статус", "status", "что умеешь"], a: "Умею: decide/think, π-seal, Crystal-резонанс, Swarm SDP, offline SW, Vault.\nНе умею: всезнание; критические решения — за человеком." }
  ];

  function kbAnswer(q) {
    var s = String(q || "").toLowerCase();
    for (var i = 0; i < KB.length; i++) {
      for (var j = 0; j < KB[i].k.length; j++) {
        if (s.indexOf(KB[i].k[j]) !== -1) return KB[i].a;
      }
    }
    return null;
  }

  async function reason(query, opts) {
    opts = opts || {};
    query = String(query || "").trim();
    if (!query) return { ok: false, answer: "", source: "empty" };

    var layers = [];
    var answer = null;
    var source = "mind";

    if (G.AKSI_CRYSTAL && typeof G.AKSI_CRYSTAL.associate === "function" && opts.crystal !== false) {
      try {
        var cr = await G.AKSI_CRYSTAL.associate(query, { k: 4 });
        if (cr && cr.associations && cr.associations.length) {
          layers.push({ layer: "crystal", n: cr.associations.length });
          if (!answer && cr.associations[0].score >= 1) {
            answer = cr.associations[0].text;
            source = "crystal";
          }
        }
      } catch (e) {}
    }

    if (!answer && G.AKSI && typeof G.AKSI.decide === "function") {
      try {
        var d = await G.AKSI.decide(query);
        if (d && d.answer) {
          answer = d.answer;
          source = d.source || "api";
          layers.push({ layer: "api", source: source });
        }
      } catch (e) {}
    }

    if (!answer && G.AKSI_ORGANISM && typeof G.AKSI_ORGANISM.decide === "function") {
      try {
        var o = await G.AKSI_ORGANISM.decide(query);
        if (o && o.answer) {
          answer = o.answer;
          source = o.source || "organism";
          layers.push({ layer: "organism" });
        }
      } catch (e) {}
    }

    if (!answer && G.AKSI_NEURO && typeof G.AKSI_NEURO.think === "function") {
      try {
        var n = await Promise.resolve(G.AKSI_NEURO.think(query));
        if (n && (n.text || n.answer)) {
          answer = n.text || n.answer;
          source = "neuro";
          layers.push({ layer: "neuro", score: n.score });
        }
      } catch (e) {}
    }

    if (!answer) {
      var kb = kbAnswer(query);
      if (kb) {
        answer = kb;
        source = "mind-kb";
        layers.push({ layer: "kb" });
      }
    }

    if (!answer) {
      answer = "АКСИ Mind v" + VER + ".\nСпросите: кто ты, формула, контур, crystal, swarm, gate, offline, как пользоваться.\nИли: «запомни: …»\nКонтакт: aksilove@internet.ru";
      source = "mind-fallback";
    }

    return {
      ok: true,
      answer: answer,
      text: answer,
      source: source,
      layers: layers,
      version: VER,
      scores: { aksi: 0.75, eqs: 72, phi: 0.6, qcli: 0.55 },
      gate: { ok: true, reason: "mind-pass" },
      seal: { kind: "mind", v: VER, t: Date.now() }
    };
  }

  G.AKSI_MIND = {
    version: VER,
    reason: reason,
    think: reason,
    decide: reason,
    kb: KB
  };
})(typeof window !== "undefined" ? window : globalThis);
