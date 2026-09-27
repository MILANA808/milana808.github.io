/**
 * AKSI Vector Mind v1.0 — Мысль как Вектор, Память как Аттрактор
 * Semantic coords → policy matrix → Hopfield → Lorenz sample → ECDSA proof
 * Not AGI. Not backprop. aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.0.0-vector";
  var PROTOCOL = "AKSI-VECTOR/1";
  var DIM = 32;
  var IDENTITY = "АКСИ";
  var DID = "did:aksi:vector-mind";
  var MEM_KEY = "aksi_vector_hopfield_v1";

  function fnv1a(str) {
    var h = 2166136261 >>> 0;
    str = String(str);
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }
  function toHex(buf) {
    return Array.from(new Uint8Array(buf))
      .map(function (b) { return b.toString(16).padStart(2, "0"); })
      .join("");
  }
  async function sha256(s) {
    if (G.crypto && G.crypto.subtle) {
      var d = await G.crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(s)));
      return toHex(d);
    }
    return ("00000000" + fnv1a(s).toString(16)).slice(-8);
  }
  function normalize(v) {
    var s = 0, i;
    for (i = 0; i < v.length; i++) s += v[i] * v[i];
    s = Math.sqrt(s) || 1;
    var o = new Float64Array(v.length);
    for (i = 0; i < v.length; i++) o[i] = v[i] / s;
    return o;
  }
  function embed(text) {
    var v = new Float64Array(DIM);
    var t = String(text || "").toLowerCase().normalize("NFKC");
    var parts = t.replace(/[^a-zа-яё0-9\s]/gi, " ").split(/\s+/).filter(Boolean);
    if (!parts.length) parts = ["_empty"];
    var i, j, h;
    for (i = 0; i < parts.length; i++) {
      h = fnv1a(parts[i]);
      for (j = 0; j < DIM; j++) {
        v[j] += Math.sin((h + j * 97) * 0.0013) + Math.cos((h ^ (j * 13)) * 0.0007);
      }
    }
    return normalize(v);
  }
  function dot(a, b) {
    var s = 0, i, n = Math.min(a.length, b.length);
    for (i = 0; i < n; i++) s += a[i] * b[i];
    return s;
  }
  function add(a, b, scale) {
    scale = scale == null ? 1 : scale;
    var o = new Float64Array(a.length), i;
    for (i = 0; i < a.length; i++) o[i] = a[i] + (b[i] || 0) * scale;
    return o;
  }
  function policyMatrix() {
    var M = [], i, j;
    for (i = 0; i < DIM; i++) {
      M[i] = new Float64Array(DIM);
      for (j = 0; j < DIM; j++)
        M[i][j] = (i === j ? 0.82 : 0) + 0.04 * Math.sin((i + 1) * (j + 1) * 0.15);
    }
    return M;
  }
  function matVec(M, v) {
    var o = new Float64Array(DIM), i, j, s;
    for (i = 0; i < DIM; i++) {
      s = 0;
      for (j = 0; j < DIM; j++) s += M[i][j] * v[j];
      o[i] = s;
    }
    return normalize(o);
  }
  function loadPatterns() {
    try { return JSON.parse(G.localStorage.getItem(MEM_KEY) || "[]") || []; } catch (e) { return []; }
  }
  function savePatterns(pats) {
    try { G.localStorage.setItem(MEM_KEY, JSON.stringify(pats.slice(-48))); } catch (e) {}
  }
  function bipolarize(v) {
    var o = new Float64Array(v.length), i;
    for (i = 0; i < v.length; i++) o[i] = v[i] >= 0 ? 1 : -1;
    return o;
  }
  function hebbStore(patterns) {
    var W = [], i, j, p;
    for (i = 0; i < DIM; i++) W[i] = new Float64Array(DIM);
    for (p = 0; p < patterns.length; p++) {
      var x = bipolarize(patterns[p].v);
      for (i = 0; i < DIM; i++)
        for (j = 0; j < DIM; j++) if (i !== j) W[i][j] += x[i] * x[j];
    }
    var n = Math.max(1, patterns.length);
    for (i = 0; i < DIM; i++) for (j = 0; j < DIM; j++) W[i][j] /= n;
    return W;
  }
  function hopfieldRecall(W, probe, steps) {
    steps = steps || 8;
    var x = bipolarize(probe), t, i, j, s, nx;
    for (t = 0; t < steps; t++) {
      nx = new Float64Array(DIM);
      for (i = 0; i < DIM; i++) {
        s = 0;
        for (j = 0; j < DIM; j++) s += W[i][j] * x[j];
        nx[i] = s >= 0 ? 1 : -1;
      }
      x = nx;
    }
    return normalize(x);
  }
  function sampleIndex(n, seedStr) {
    if (n <= 1) return 0;
    var h = fnv1a(seedStr);
    var st = { x: (h % 1000) / 100 - 5, y: ((h >> 8) % 1000) / 100 - 5, z: ((h >> 16) % 1000) / 50 + 10 };
    var k, sigma = 10, rho = 28, beta = 8 / 3;
    for (k = 0; k < 40; k++) {
      var x = st.x, y = st.y, z = st.z;
      st = {
        x: x + sigma * (y - x) * 0.02,
        y: y + (x * (rho - z) - y) * 0.02,
        z: z + (x * y - beta * z) * 0.02
      };
    }
    return Math.floor(Math.abs(st.x + st.y + st.z) * 1000) % n;
  }

  var POLICY = policyMatrix();
  var IDENTITY_VEC = embed("self я акси identity " + DID);
  var S = { t: 0, vec: embed(DID + " " + IDENTITY) };

  function F(St, inputVec) {
    var mixed = add(St.vec, inputVec, 0.9);
    var through = matVec(POLICY, mixed);
    var withId = add(through, IDENTITY_VEC, 0.35);
    return { t: St.t + 1, vec: normalize(withId) };
  }

  function bootstrap() {
    var pats = loadPatterns();
    if (pats.length >= 4) return pats;
    [
      { label: "identity", text: "Я АКСИ — векторное ядро: мысль как координата, память как аттрактор." },
      { label: "alphabet", text: "Русский алфавит: 33 буквы. А Б В Г Д Е Ё Ж З И Й К Л М Н О П Р С Т У Ф Х Ц Ч Ш Щ Ъ Ы Ь Э Ю Я." },
      { label: "formula", text: "AKSI = (A × I × S) × (1 + 0.4√n)." },
      { label: "law", text: "Policy default-deny: действие без evidence блокируется математически." }
    ].forEach(function (s) {
      pats.push({ label: s.label, text: s.text, v: Array.from(embed(s.text)) });
    });
    savePatterns(pats);
    return pats;
  }

  function ingest(fact, label) {
    fact = String(fact || "").trim();
    if (!fact) return { ok: false };
    var pats = loadPatterns();
    pats.push({ label: label || "user", text: fact.slice(0, 400), v: Array.from(embed(fact)) });
    savePatterns(pats);
    return { ok: true, n: pats.length };
  }

  function recallText(patterns, recalled) {
    var best = null, i, sc;
    for (i = 0; i < patterns.length; i++) {
      sc = dot(recalled, patterns[i].v);
      if (!best || sc > best.sc) best = { sc: sc, text: patterns[i].text, label: patterns[i].label };
    }
    return best;
  }

  function policyVeto(v) {
    var blockV = embed("block нельзя запрет law policy");
    var allowV = embed("allow можно вопрос память");
    var b = dot(v, blockV), a = dot(v, allowV);
    if (b > 0.55 && b > a + 0.08) return { veto: true, score: b };
    return { veto: false, score: b };
  }

  async function signPayload(payload) {
    var body = typeof payload === "string" ? payload : JSON.stringify(payload);
    var hash = await sha256(body);
    var sig = null, alg = "hash-only";
    try {
      if (G.crypto && G.crypto.subtle) {
        if (!G.__AKSI_VEC_KEY) {
          G.__AKSI_VEC_KEY = await G.crypto.subtle.generateKey(
            { name: "ECDSA", namedCurve: "P-256" },
            false,
            ["sign", "verify"]
          );
        }
        var signature = await G.crypto.subtle.sign(
          { name: "ECDSA", hash: "SHA-256" },
          G.__AKSI_VEC_KEY.privateKey,
          new TextEncoder().encode(hash)
        );
        sig = toHex(signature);
        alg = "ECDSA-P256-SHA256";
      }
    } catch (e) {}
    return { hash: hash, signature: sig, alg: alg, did: DID };
  }

  function pts(v, label) {
    if (!v) return null;
    return {
      label: label,
      x: v[0] || 0,
      y: v[1] || 0,
      z: v[2] || 0,
      mag: Math.sqrt((v[0] || 0) * (v[0] || 0) + (v[1] || 0) * (v[1] || 0) + (v[2] || 0) * (v[2] || 0))
    };
  }

  function snapshotGraph(inputV, stateV, memV) {
    return {
      dim: DIM,
      input: pts(inputV, "input"),
      state: pts(stateV, "S"),
      memory: pts(memV, "memory"),
      identity: pts(IDENTITY_VEC, "identity"),
      concepts: ["object", "action", "law", "self", "user", "memory", "math", "alphabet"].map(function (k) {
        return pts(embed(k), k);
      })
    };
  }

  var PHRASES = {
    high_self: [
      "Я АКСИ. Вектор запроса прошёл через identity и сошёлся в резонансе.",
      "Я АКСИ. Состояние S обновлено; ответ — точка схождения policy и памяти."
    ],
    memory: [
      "Из ассоциативной памяти (Хопфилд) извлечён связанный след.",
      "Матрица памяти стабилизировалась около сохранённого паттерна."
    ],
    open: [
      "Резонанс слабый: фактов мало, но состояние S зафиксировано и может быть подписано.",
      "Нет сильного аттрактора в памяти — честный минимум уверенности."
    ],
    block: [
      "Траектория пересекла вектор ограничений — математическая блокировка.",
      "Policy filter: путь ответа отклонён (BLOCK)."
    ]
  };

  function pickPhrase(key, seed) {
    var arr = PHRASES[key] || PHRASES.open;
    return arr[sampleIndex(arr.length, seed + key)];
  }

  async function think(input) {
    input = String(input || "").trim();
    if (!input) return { ok: false, error: "empty", speaker: IDENTITY };

    var teach = /^(?:запомни|remember)\s*[:：]\s*(.+)$/i.exec(input);
    if (teach) {
      var ing = ingest(teach[1], "user");
      S = F(S, embed(input));
      var msg = "Я АКСИ. Факт вплавлен в ассоциативную матрицу (Хебб). Паттернов: " + ing.n + ".";
      var proofTeach = await signPayload({ t: S.t, msg: msg, did: DID });
      return {
        ok: true,
        speaker: IDENTITY,
        answer: msg,
        state: { t: S.t, resonance: 1 },
        proof: proofTeach,
        graph: snapshotGraph(embed(input), S.vec, null),
        no_llm: true
      };
    }

    var patterns = bootstrap();
    var inVec = embed(input);
    S = F(S, inVec);
    var W = hebbStore(patterns.map(function (p) { return { v: p.v }; }));
    var recalled = hopfieldRecall(W, inVec, 10);
    var mem = recallText(patterns, recalled);
    var veto = policyVeto(S.vec);

    var parts = [];
    var seed = input + "|" + S.t;
    if (veto.veto && /запрет|нельзя|взлом/i.test(input)) {
      parts.push(pickPhrase("block", seed));
    } else {
      parts.push(pickPhrase("high_self", seed));
      if (mem && mem.sc > 0.15) {
        parts.push(pickPhrase("memory", seed));
        parts.push(mem.text);
      }
      if (/алфавит|букв/i.test(input) && G.AKSI_CONSCIOUS) {
        try {
          var ca = G.AKSI_CONSCIOUS.answer(input);
          if (ca && ca.answer) parts.push(ca.answer.replace(/^Я АКСИ\.\s*/i, ""));
        } catch (e) {}
      }
      if (/посчитай|вычисли|[0-9]+\s*[+\-*/^]/i.test(input) && G.AKSI_MATH) {
        try {
          var ma = G.AKSI_MATH.answer(input);
          if (ma && ma.answer) parts.push(ma.answer.replace(/^Я АКСИ\.\s*/i, ""));
        } catch (e) {}
      }
      if (parts.length < 2) parts.push(pickPhrase("open", seed));
    }

    var seen = {}, answerParts = [];
    parts.forEach(function (p) {
      var k = String(p).slice(0, 40);
      if (!seen[k]) { seen[k] = 1; answerParts.push(p); }
    });
    var answer = answerParts.join(" ");
    var resonance = mem ? mem.sc : dot(inVec, S.vec);
    var proof = await signPayload({
      protocol: PROTOCOL,
      t: S.t,
      input: input,
      answer: answer,
      resonance: resonance,
      did: DID
    });

    return {
      ok: true,
      speaker: IDENTITY,
      version: VER,
      protocol: PROTOCOL,
      answer: answer,
      state: {
        t: S.t,
        resonance: Math.round(resonance * 1000) / 1000,
        veto: veto.veto
      },
      proof: proof,
      graph: snapshotGraph(inVec, S.vec, recalled),
      no_llm: true,
      did: DID
    };
  }

  G.AKSI_VECTOR = {
    version: VER,
    think: think,
    embed: embed,
    ingest: ingest,
    status: function () {
      return {
        version: VER,
        protocol: PROTOCOL,
        did: DID,
        dim: DIM,
        t: S.t,
        patterns: loadPatterns().length,
        no_llm: true
      };
    },
    DIM: DIM,
    DID: DID
  };
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this);
