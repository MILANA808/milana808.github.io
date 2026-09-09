/**
 * AKSI Pi Contour v1 — вычислительный контур на Math.PI
 * query → SHA-256 → угол [0, 2π) → sin/cos-признаки → rank → seal
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.0.0-pi-contour";
  var PI = Math.PI;
  var TAU = 2 * PI;
  var PI_DIGITS = "14159265358979323846264338327950288419716939937510";

  function te(s) {
    return new TextEncoder().encode(String(s));
  }

  function hex(buf) {
    var u = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    var h = "";
    for (var i = 0; i < u.length; i++) {
      var x = u[i].toString(16);
      h += x.length === 1 ? "0" + x : x;
    }
    return h;
  }

  function fnv1a(str) {
    var h = 0x811c9dc5;
    var s = String(str);
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  async function sha256(str) {
    if (G.crypto && G.crypto.subtle) {
      var dig = await G.crypto.subtle.digest("SHA-256", te(str));
      return new Uint8Array(dig);
    }
    var out = new Uint8Array(32);
    var h = fnv1a(str);
    for (var i = 0; i < 32; i++) {
      h = Math.imul(h ^ (i * 2654435761), 0x01000193) >>> 0;
      out[i] = (h >>> ((i % 4) * 8)) & 0xff;
    }
    return out;
  }

  function angleFromDigest(digest) {
    var acc = 0;
    for (var i = 0; i < 8; i++) acc = acc * 256 + digest[i];
    var unit = acc / Math.pow(2, 64);
    return unit * TAU;
  }

  function featuresFromAngle(theta) {
    var s1 = Math.sin(theta);
    var c1 = Math.cos(theta);
    var s2 = Math.sin(theta * PI);
    var c2 = Math.cos(theta * PI);
    var s3 = Math.sin(theta * PI * PI);
    var c3 = Math.cos(theta * PI * PI);
    var di = Math.floor(((theta / TAU) * PI_DIGITS.length)) % PI_DIGITS.length;
    var digit = parseInt(PI_DIGITS.charAt(di), 10) / 9;
    return {
      theta: theta,
      thetaDeg: (theta * 180) / PI,
      sin: s1,
      cos: c1,
      sinPi: s2,
      cosPi: c2,
      sinPi2: s3,
      cosPi2: c3,
      digit: digit,
      digitIndex: di,
      piDigit: PI_DIGITS.charAt(di),
      energy: Math.sqrt(s1 * s1 + c1 * c1)
    };
  }

  function resonance(text, feat) {
    var s = String(text || "");
    if (!s) return 0;
    var h = fnv1a(s);
    var phase = ((h % 10000) / 10000) * TAU;
    var d = Math.abs(Math.sin(phase - feat.theta));
    var lenBoost = Math.min(0.25, s.length / 400);
    var piBoost = /π|pi|пи|формул|aksi|акси|gate|eqs/i.test(s) ? 0.12 : 0;
    return Math.max(0, Math.min(1, (1 - d) * 0.7 + lenBoost + piBoost + feat.digit * 0.05));
  }

  function scoreCandidates(cands, feat) {
    return (cands || []).map(function (c, i) {
      var text = c.text || c.answer || "";
      var r = resonance(text, feat);
      var base = c.score != null ? Number(c.score) : 0.5;
      var blended = 0.55 * base + 0.45 * r;
      return {
        i: i,
        text: text,
        source: c.source || "cand",
        resonance: Math.round(r * 1000) / 1000,
        score: Math.round(blended * 1000) / 1000,
        selected: false
      };
    }).sort(function (a, b) {
      return b.score - a.score;
    });
  }

  function localPiAnswer(query, feat) {
    var q = String(query || "").toLowerCase();
    var lines = [];
    if (/кто ты|who are you|привет/.test(q)) {
      lines.push(
        "Я АКСИ. Ответ прошёл через π-контур: угол θ = " +
          feat.theta.toFixed(6) +
          " рад (" +
          feat.thetaDeg.toFixed(2) +
          "°), цифра π[" +
          feat.digitIndex +
          "] = " +
          feat.piDigit +
          "."
      );
      lines.push(
        "Формула: AKSI = (A × I × S) × (1 + 0.4√n). Контакт: aksilove@internet.ru"
      );
    } else if (/формул|formula|π|pi|пи/.test(q)) {
      lines.push(
        "π ≈ 3.1415926535… Контур использует угол θ ∈ [0, 2π) из SHA-256 запроса."
      );
      lines.push(
        "Признаки: sinθ=" +
          feat.sin.toFixed(4) +
          " cosθ=" +
          feat.cos.toFixed(4) +
          " · sin(θπ)=" +
          feat.sinPi.toFixed(4) +
          " · digit=" +
          feat.piDigit
      );
      lines.push("AKSI = (A × I × S) × (1 + 0.4√n)");
    } else if (/gate|гейт/.test(q)) {
      lines.push(
        "Gate τ ≈ 0.55. В π-контуре: τ_π = 0.55 + 0.05·sinθ = " +
          (0.55 + 0.05 * feat.sin).toFixed(3)
      );
    } else if (/статус|status|контур|contour/.test(q)) {
      lines.push(
        "π-Contour v" +
          VER +
          " · θ=" +
          feat.theta.toFixed(5) +
          " · energy≈" +
          feat.energy.toFixed(4) +
          " · offline"
      );
    } else {
      lines.push(
        "Ответ АКСИ через π-контур. θ = " +
          feat.theta.toFixed(5) +
          " рад, π-digit[" +
          feat.digitIndex +
          "]=" +
          feat.piDigit +
          "."
      );
      lines.push(
        "Запрос учтён детерминированно (тот же текст → тот же угол)."
      );
      lines.push("Контакт: aksilove@internet.ru");
    }
    return lines.join("\n");
  }

  function seal(query, feat, answer) {
    var payload =
      String(query) +
      "|" +
      feat.theta.toFixed(12) +
      "|" +
      String(answer).slice(0, 200);
    var h = fnv1a(payload);
    return {
      kind: "pi-contour",
      version: VER,
      theta: feat.theta,
      thetaDeg: feat.thetaDeg,
      piDigit: feat.piDigit,
      digitIndex: feat.digitIndex,
      fnv: h.toString(16),
      t: Date.now()
    };
  }

  async function process(query, opts) {
    opts = opts || {};
    query = String(query || "").trim();
    if (!query) {
      return { ok: false, error: "empty", answer: "" };
    }

    var digest = await sha256(query + "|AKSI|π");
    var theta = angleFromDigest(digest);
    var feat = featuresFromAngle(theta);

    var ranked = null;
    var answer = null;
    var source = "pi-contour";

    if (opts.candidates && opts.candidates.length) {
      ranked = scoreCandidates(opts.candidates, feat);
      if (ranked.length) {
        ranked[0].selected = true;
        answer = ranked[0].text;
        source = ranked[0].source + "+pi";
      }
    }

    if (!answer) {
      answer = localPiAnswer(query, feat);
    }

    var tau = 0.55 + 0.05 * feat.sin;
    var score = ranked && ranked[0] ? ranked[0].score : 0.62 + 0.08 * feat.digit;
    var gateOk = score >= tau;

    return {
      ok: true,
      answer: answer,
      text: answer,
      source: source,
      features: feat,
      ranked: ranked,
      scores: {
        aksi: Math.round(score * 1000) / 1000,
        eqs: Math.round(score * 100),
        phi: Math.round((0.5 + 0.5 * feat.cos) * 1000) / 1000,
        qcli: Math.round((0.5 + 0.5 * feat.sinPi) * 1000) / 1000,
        piResonance: ranked && ranked[0] ? ranked[0].resonance : null
      },
      gate: { ok: gateOk, reason: gateOk ? "pi-pass" : "pi-below-tau", tau: tau },
      seal: seal(query, feat, answer),
      digestHex: hex(digest).slice(0, 16),
      version: VER
    };
  }

  async function think(query, opts) {
    return process(query, opts);
  }

  function status() {
    return {
      version: VER,
      pi: PI,
      digits: PI_DIGITS.length,
      path: "query→SHA-256→θ∈[0,2π)→sin/cos features→rank→seal",
      contact: "aksilove@internet.ru"
    };
  }

  G.AKSI_PI_CONTOUR = {
    version: VER,
    PI: PI,
    process: process,
    think: think,
    featuresFromAngle: featuresFromAngle,
    resonance: resonance,
    status: status
  };
})(typeof window !== "undefined" ? window : globalThis);
