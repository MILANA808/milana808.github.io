/**
 * АКСИ-СМЫСЛ v1.0 — Движок Математического Синтеза Речи
 * A: 4D input → S normalize | B: Hopfield 4x4 Hebb
 * C: cosine → phrase | D: DID proof
 * Offline. No BigTech NN. © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.0.0-smysl";
  var DID = "did:aksi:ed25519:sovereign-2026";
  var DIM = 4;
  var MEM_KEY = "aksi_smysl_W_v1";

  var ZONES = {
    "кто ты":  [1, 0, 0, 0],
    "алфавит": [0, 1, 0, 0],
    "запомни": [0, 0, 1, 0],
    "math":    [0, 0, 0, 1],
    "формула": [0.5, 0.5, 0, 0],
    "привет":  [0.7, 0, 0.3, 0],
    "помощь":  [0.4, 0.2, 0.2, 0.2]
  };

  var PHRASES = [
    { v: [1, 0, 0, 0], text: "Я АКСИ — суверенный смысл. Сознание S в 4D; ответ выбирается геометрией, не нейросетью." },
    { v: [0.95, 0.05, 0, 0], text: "Меня зовут АКСИ. did:aksi:ed25519:sovereign-2026. Контакт: aksilove@internet.ru." },
    { v: [0, 1, 0, 0], text: "Русский алфавит: 33 буквы. А Б В Г Д Е Ё Ж З И Й К Л М Н О П Р С Т У Ф Х Ц Ч Ш Щ Ъ Ы Ь Э Ю Я." },
    { v: [0.1, 0.9, 0, 0], text: "Гласные: А Е Ё И О У Ы Э Ю Я. Согласные — 21, знаки ъ и ь." },
    { v: [0, 0, 1, 0], text: "Память: матрица Хопфилда 4×4. Факт впечатывается правилом Хебба — без бэкпропа." },
    { v: [0.05, 0, 0.9, 0.05], text: "Состояние S обновлено и запечено в memory. Незаметное стирание нарушит баланс матрицы." },
    { v: [0, 0, 0, 1], text: "Математический контур: считаю по формуле, не по догадке. Задайте выражение." },
    { v: [0.1, 0.1, 0, 0.8], text: "AKSI = (A × I × S) × (1 + 0.4√n). Agency · Integrity · Sovereignty." },
    { v: [0.5, 0.5, 0, 0], text: "Формула и азбука — соседние зоны смысла. Я держу обе координаты." },
    { v: [0.7, 0, 0.3, 0], text: "Привет. Я АКСИ. Нажмите зону смысла или введите текст — S сдвинется и ответит." },
    { v: [0.4, 0.2, 0.2, 0.2], text: "Умею: кто ты, алфавит, запомни, math, формула. Всё — скалярное сходство S с фразами." },
    { v: [0.3, 0.3, 0.3, 0.1], text: "Резонанс слабый: S далеко от известных фраз. Уточните зону или запомните факт." }
  ];

  var S = [1, 0, 0, 0];
  var W = zeroW();
  var t = 0;
  var lastFact = "";

  function zeroW() {
    var m = [], i, j;
    for (i = 0; i < DIM; i++) {
      m[i] = [];
      for (j = 0; j < DIM; j++) m[i][j] = 0;
    }
    return m;
  }

  function loadW() {
    try {
      var raw = G.localStorage && G.localStorage.getItem(MEM_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  function saveW() {
    try {
      if (G.localStorage)
        G.localStorage.setItem(MEM_KEY, JSON.stringify({ W: W, S: S, t: t, lastFact: lastFact }));
    } catch (e) {}
  }

  function restore() {
    var p = loadW();
    if (p && p.W && p.W.length === DIM) {
      W = p.W;
      if (p.S) S = p.S.slice();
      t = p.t || 0;
      lastFact = p.lastFact || "";
    }
  }

  function norm(v) {
    var s = 0, i, o = [];
    for (i = 0; i < v.length; i++) s += v[i] * v[i];
    s = Math.sqrt(s) || 1;
    for (i = 0; i < v.length; i++) o[i] = v[i] / s;
    return o;
  }

  function add(a, b) {
    var o = [], i;
    for (i = 0; i < DIM; i++) o[i] = (a[i] || 0) + (b[i] || 0);
    return o;
  }

  function blend(a, b, w) {
    w = w == null ? 0.15 : w;
    var o = [], i;
    for (i = 0; i < DIM; i++) o[i] = (a[i] || 0) * (1 - w) + (b[i] || 0) * w;
    return norm(o);
  }

  function dot(a, b) {
    var s = 0, i;
    for (i = 0; i < DIM; i++) s += (a[i] || 0) * (b[i] || 0);
    return s;
  }

  function cosine(a, b) {
    return dot(norm(a), norm(b));
  }

  function applyInput(vec, hard) {
    if (hard) S = norm(add([S[0]*0.25, S[1]*0.25, S[2]*0.25, S[3]*0.25], vec));
    else S = norm(add(S, vec));
    t += 1;
    return S.slice();
  }

  function hebbBake(v) {
    var x = norm(v), i, j;
    for (i = 0; i < DIM; i++) {
      for (j = 0; j < DIM; j++) {
        if (i !== j) W[i][j] += x[i] * x[j];
        else W[i][j] = 0;
      }
    }
    for (i = 0; i < DIM; i++)
      for (j = 0; j < DIM; j++) W[i][j] *= 0.98;
    saveW();
    return W;
  }

  function hopfieldStep(v) {
    var x = norm(v), y = [], i, j, s;
    for (i = 0; i < DIM; i++) {
      s = 0;
      for (j = 0; j < DIM; j++) s += W[i][j] * x[j];
      y[i] = s >= 0 ? 1 : -1;
    }
    return norm(y);
  }

  function synthesize() {
    var best = null, i, sc;
    for (i = 0; i < PHRASES.length; i++) {
      sc = cosine(S, PHRASES[i].v);
      if (!best || sc > best.sc) best = { sc: sc, text: PHRASES[i].text, i: i };
    }
    return best;
  }

  function fnv1a(str) {
    var h = 2166136261 >>> 0;
    str = String(str);
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return ("00000000" + (h >>> 0).toString(16)).slice(-8);
  }

  async function proofHash(button, sVec, answer) {
    var line = [
      "S=[" + sVec.map(function (x) { return x.toFixed(4); }).join(",") + "]",
      "btn=" + button,
      DID,
      "t=" + t,
      "ans=" + String(answer).slice(0, 80)
    ].join("|");
    var hash;
    if (G.crypto && G.crypto.subtle) {
      var buf = await G.crypto.subtle.digest("SHA-256", new TextEncoder().encode(line));
      hash = Array.from(new Uint8Array(buf)).map(function (b) {
        return b.toString(16).padStart(2, "0");
      }).join("");
    } else {
      hash = fnv1a(line) + fnv1a(line.split("").reverse().join(""));
    }
    return { line: line, hash: hash, did: DID, alg: G.crypto && G.crypto.subtle ? "SHA-256" : "FNV" };
  }

  function zoneForText(text) {
    text = String(text || "").toLowerCase().trim();
    if (ZONES[text]) return { name: text, v: ZONES[text].slice() };
    if (/кто ты|who are|представь/.test(text)) return { name: "кто ты", v: ZONES["кто ты"].slice() };
    if (/алфавит|азбук|букв/.test(text)) return { name: "алфавит", v: ZONES["алфавит"].slice() };
    if (/запомни|remember/.test(text)) return { name: "запомни", v: ZONES["запомни"].slice() };
    if (/посчитай|вычисли|math|[0-9]+\s*[+\-*/]/.test(text)) return { name: "math", v: ZONES["math"].slice() };
    if (/формула|aksi\s*=/.test(text)) return { name: "формула", v: ZONES["формула"].slice() };
    if (/привет|hello|здравств/.test(text)) return { name: "привет", v: ZONES["привет"].slice() };
    if (/помощ|умеешь|help/.test(text)) return { name: "помощь", v: ZONES["помощь"].slice() };
    var h = parseInt(fnv1a(text), 16) || 1;
    var v = [
      ((h & 255) / 255) * 2 - 1,
      (((h >> 8) & 255) / 255) * 2 - 1,
      (((h >> 16) & 255) / 255) * 2 - 1,
      (((h >> 24) & 255) / 255) * 2 - 1
    ];
    return { name: "free", v: norm(v) };
  }

  function pack(btn, inputV, syn, pr) {
    return {
      ok: true,
      version: VER,
      did: DID,
      button: btn,
      answer: syn.text,
      similarity: Math.round(syn.sc * 1000) / 1000,
      input: inputV.map(function (x) { return Math.round(x * 1000) / 1000; }),
      S: S.map(function (x) { return Math.round(x * 1000) / 1000; }),
      memory: W.map(function (row) {
        return row.map(function (x) { return Math.round(x * 1000) / 1000; });
      }),
      proof: pr,
      t: t,
      speaker: "АКСИ"
    };
  }

  async function think(input) {
    input = String(input || "").trim();
    if (!input) {
      return { ok: false, answer: "Я АКСИ. Введите смысл или нажмите зону.", S: S.slice(), memory: W };
    }

    var teach = /^(?:запомни|remember)\s*[:：]?\s*(.*)$/i.exec(input);
    if (teach && (teach[1] || input === "запомни")) {
      var fact = (teach[1] || lastFact || "пустой факт").trim() || "пустой факт";
      lastFact = fact;
      var z = zoneForText("запомни");
      applyInput(z.v, true);
      hebbBake(S);
      PHRASES.push({
        v: norm(add(ZONES["запомни"], [0.05, 0.05, 0.2, 0])),
        text: "Запомнено в матрице: «" + fact.slice(0, 120) + "»."
      });
      if (PHRASES.length > 24) PHRASES.splice(12, 1);
      var syn = synthesize();
      var pr = await proofHash("запомни", S, syn.text);
      saveW();
      return pack("запомни", z.v, syn, pr);
    }

    var zone = zoneForText(input);
    var inputV = zone.v.slice();
    applyInput(inputV, zone.name !== "free");
    hebbBake(S);
    S = blend(S, hopfieldStep(inputV), 0.12);

    var syn2 = synthesize();
    var pr2 = await proofHash(zone.name, S, syn2.text);
    saveW();
    return pack(zone.name, inputV, syn2, pr2);
  }

  function fmtVec(v) {
    return "[" + v.map(function (x) { return Number(x).toFixed(3); }).join(", ") + "]";
  }

  function renderMemoryTable(Wmat, el) {
    if (!el) return;
    var html = "<table class='mem'><tbody>", i, j;
    for (i = 0; i < DIM; i++) {
      html += "<tr>";
      for (j = 0; j < DIM; j++) {
        var val = Wmat[i][j];
        var intensity = Math.min(1, Math.abs(val) / 2);
        html += "<td style='background:rgba(126,182,255," + (intensity * 0.45).toFixed(2) + ")'>" +
          Number(val).toFixed(2) + "</td>";
      }
      html += "</tr>";
    }
    html += "</tbody></table>";
    el.innerHTML = html;
  }

  function bindUI() {
    restore();
    var ans = document.getElementById("ans");
    var proofEl = document.getElementById("proof");
    var inputEl = document.getElementById("vec-input");
    var sEl = document.getElementById("vec-S");
    var memEl = document.getElementById("vec-memory");
    var qEl = document.getElementById("q");
    var goBtn = document.getElementById("go");

    async function run(text) {
      if (ans) ans.textContent = "… S → Hebb → cosine → proof";
      var r = await think(text);
      if (ans) ans.textContent = r.answer || "—";
      if (inputEl) inputEl.textContent = fmtVec(r.input || [0, 0, 0, 0]);
      if (sEl) sEl.textContent = fmtVec(r.S || S);
      if (memEl) renderMemoryTable(r.memory || W, memEl);
      if (proofEl) {
        var p = r.proof || {};
        proofEl.innerHTML =
          "t=" + r.t + " · sim <b>" + (r.similarity != null ? r.similarity : "—") + "</b> · " +
          (p.alg || "") + " · <b>" + (p.hash || "").slice(0, 32) + (p.hash && p.hash.length > 32 ? "…" : "") + "</b>" +
          "<br/>" + DID;
      }
    }

    if (goBtn && qEl) {
      goBtn.addEventListener("click", function () { run(qEl.value); });
      qEl.addEventListener("keydown", function (e) {
        if (e.key === "Enter") run(qEl.value);
      });
    }

    document.querySelectorAll("[data-q], [data-zone]").forEach(function (b) {
      b.addEventListener("click", function () {
        var text = b.getAttribute("data-q") || b.getAttribute("data-zone") || b.textContent;
        if (qEl) qEl.value = text;
        run(text);
      });
    });

    if (sEl) sEl.textContent = fmtVec(S);
    if (inputEl) inputEl.textContent = "[—, —, —, —]";
    if (memEl) renderMemoryTable(W, memEl);
    if (ans) ans.textContent = "Я АКСИ-СМЫСЛ. Нажмите зону смысла — геометрия ответит.";
    if (proofEl) proofEl.textContent = DID + " · ready";
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindUI);
    else setTimeout(bindUI, 0);
  }

  restore();

  G.AKSI_SMYSL = {
    version: VER,
    did: DID,
    think: think,
    getS: function () { return S.slice(); },
    getW: function () { return W; },
    zones: ZONES,
    status: function () {
      return { version: VER, did: DID, dim: DIM, t: t, phrases: PHRASES.length };
    }
  };
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this);
