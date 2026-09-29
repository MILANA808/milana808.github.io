/**
 * AKSI Mandate Protocol v1.1 — Decision Receipt + fail-closed gate
 * ECDSA P-256 sign/verify · offline · no personal data · no LLM required
 * Schema: aksi-mandate/v1
 * Contact: aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.1.0";
  var SCHEMA = "aksi-mandate/v1";
  var DID = "did:aksi:mandate:v1";
  var KEY_DB = "aksi_mandate_keys_v1";
  var CHAIN_KEY = "aksi_mandate_chain_v1";

  function enc(s) {
    return new TextEncoder().encode(String(s));
  }
  function toHex(buf) {
    return Array.from(new Uint8Array(buf))
      .map(function (b) {
        return b.toString(16).padStart(2, "0");
      })
      .join("");
  }
  function fromHex(hex) {
    var u = new Uint8Array(hex.length / 2);
    for (var i = 0; i < u.length; i++) u[i] = parseInt(hex.substr(i * 2, 2), 16);
    return u;
  }
  async function sha256Hex(s) {
    var d = await crypto.subtle.digest("SHA-256", enc(s));
    return toHex(d);
  }
  function canon(obj) {
    if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
    if (Array.isArray(obj)) return "[" + obj.map(canon).join(",") + "]";
    var keys = Object.keys(obj)
      .filter(function (k) {
        return obj[k] !== undefined;
      })
      .sort();
    return (
      "{" +
      keys
        .map(function (k) {
          return JSON.stringify(k) + ":" + canon(obj[k]);
        })
        .join(",") +
      "}"
    );
  }
  function uid() {
    var a = new Uint8Array(8);
    crypto.getRandomValues(a);
    return "m_" + toHex(a);
  }
  function now() {
    return new Date().toISOString();
  }

  async function loadOrCreateKeys() {
    try {
      var raw = localStorage.getItem(KEY_DB);
      if (raw) {
        var pack = JSON.parse(raw);
        var priv = await crypto.subtle.importKey(
          "jwk",
          pack.privateKey,
          { name: "ECDSA", namedCurve: "P-256" },
          true,
          ["sign"]
        );
        var pub = await crypto.subtle.importKey(
          "jwk",
          pack.publicKey,
          { name: "ECDSA", namedCurve: "P-256" },
          true,
          ["verify"]
        );
        return { privateKey: priv, publicKey: pub, publicJwk: pack.publicKey, kid: pack.kid };
      }
    } catch (e) {}
    var kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
      "sign",
      "verify"
    ]);
    var privJ = await crypto.subtle.exportKey("jwk", kp.privateKey);
    var pubJ = await crypto.subtle.exportKey("jwk", kp.publicKey);
    var kid = (await sha256Hex(JSON.stringify(pubJ))).slice(0, 16);
    try {
      localStorage.setItem(
        KEY_DB,
        JSON.stringify({ privateKey: privJ, publicKey: pubJ, kid: kid })
      );
    } catch (e2) {}
    return { privateKey: kp.privateKey, publicKey: kp.publicKey, publicJwk: pubJ, kid: kid };
  }

  async function signBytes(priv, bytes) {
    var sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, priv, bytes);
    return toHex(sig);
  }
  async function verifyBytes(pub, bytes, sigHex) {
    try {
      return await crypto.subtle.verify(
        { name: "ECDSA", hash: "SHA-256" },
        pub,
        fromHex(sigHex),
        bytes
      );
    } catch (e) {
      return false;
    }
  }

  function chainPrev() {
    try {
      var c = JSON.parse(localStorage.getItem(CHAIN_KEY) || "[]");
      return c.length ? c[c.length - 1].receipt_hash : null;
    } catch (e) {
      return null;
    }
  }
  function chainPush(entry) {
    try {
      var c = JSON.parse(localStorage.getItem(CHAIN_KEY) || "[]");
      c.push(entry);
      if (c.length > 100) c = c.slice(-100);
      localStorage.setItem(CHAIN_KEY, JSON.stringify(c));
    } catch (e) {}
  }

  function evaluateGate(input) {
    var policy = String(input.policy || "strict").toLowerCase();
    var evidence = input.evidence || [];
    var action = String(input.action || input.goal || "").trim();
    var answer = String(input.answer || "").trim();
    var reasons = [];

    if (!action && !answer) {
      reasons.push("empty_goal");
      return { gate: "BLOCK", reasons: reasons, policy: policy };
    }

    if (policy === "lab") {
      return { gate: "ALLOW", reasons: ["lab_policy"], policy: policy };
    }

    var hasEv = evidence.length > 0;
    var weak = evidence.filter(function (e) {
      return e.tier === "weak" || e.tier === "none";
    });
    var strong = evidence.filter(function (e) {
      return !e.tier || e.tier === "sealed" || e.tier === "provisional" || e.tier === "ok";
    });

    if (policy === "strict") {
      if (!hasEv) {
        reasons.push("no_evidence");
        return { gate: "BLOCK", reasons: reasons, policy: policy };
      }
      if (strong.length === 0 && weak.length > 0) {
        reasons.push("only_weak_evidence");
        return { gate: "BLOCK", reasons: reasons, policy: policy };
      }
      if (/без evidence|без доказат|ungrounded/i.test(answer) && strong.length === 0) {
        reasons.push("answer_admits_ungrounded");
        return { gate: "BLOCK", reasons: reasons, policy: policy };
      }
      return { gate: "ALLOW", reasons: ["evidence_ok"], policy: policy };
    }

    if (!hasEv && !input.allow_ungrounded) {
      reasons.push("no_evidence_companion");
      return { gate: "BLOCK", reasons: reasons, policy: policy };
    }
    return {
      gate: "ALLOW",
      reasons: hasEv ? ["evidence_ok"] : ["explicit_ungrounded_ok"],
      policy: policy
    };
  }

  async function createMandate(input) {
    input = input || {};
    var keys = await loadOrCreateKeys();
    var gateRes = evaluateGate(input);
    var evidence = (input.evidence || []).map(function (e, i) {
      return {
        id: e.id || "ev_" + (i + 1),
        source: String(e.source || "local").slice(0, 120),
        tier: e.tier || "ok",
        snippet: String(e.snippet || e.text || "").slice(0, 400)
      };
    });

    var body = {
      schema: SCHEMA,
      version: VER,
      id: uid(),
      ts: now(),
      did: DID,
      kid: keys.kid,
      goal: String(input.goal || input.action || "").slice(0, 500),
      action: String(input.action || input.goal || "").slice(0, 500),
      answer: String(input.answer || "").slice(0, 2000),
      policy: gateRes.policy,
      gate: gateRes.gate,
      reasons: gateRes.reasons,
      evidence: evidence,
      evidence_root: null,
      prev: chainPrev(),
      no_llm: true
    };

    var evHashes = [];
    for (var i = 0; i < evidence.length; i++) {
      evHashes.push(await sha256Hex(canon(evidence[i])));
    }
    body.evidence_root = evHashes.length
      ? await sha256Hex(evHashes.slice().sort().join("|"))
      : await sha256Hex("empty");

    var toSign = canon(body);
    var payload_hash = await sha256Hex(toSign);
    var signature = await signBytes(keys.privateKey, enc(payload_hash));

    var receipt = Object.assign({}, body, {
      payload_hash: payload_hash,
      signature: signature,
      alg: "ECDSA-P256-SHA256",
      publicJwk: keys.publicJwk
    });

    chainPush({ id: receipt.id, receipt_hash: payload_hash, gate: receipt.gate, ts: receipt.ts });

    return {
      ok: true,
      allowed: receipt.gate === "ALLOW",
      gate: receipt.gate,
      receipt: receipt,
      verify_hint: "AKSI_MANDATE.verify(receipt) → true|false"
    };
  }

  async function verify(receipt) {
    if (!receipt || !receipt.signature || !receipt.payload_hash) {
      return { ok: false, error: "missing_signature" };
    }
    var copy = {};
    Object.keys(receipt).forEach(function (k) {
      if (k === "signature" || k === "payload_hash" || k === "alg" || k === "publicJwk") return;
      copy[k] = receipt[k];
    });
    var expected = await sha256Hex(canon(copy));
    if (expected !== receipt.payload_hash) {
      return {
        ok: false,
        error: "payload_hash_mismatch",
        expected: expected,
        got: receipt.payload_hash
      };
    }
    var pub;
    try {
      pub = await crypto.subtle.importKey(
        "jwk",
        receipt.publicJwk,
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["verify"]
      );
    } catch (e) {
      return { ok: false, error: "bad_public_key" };
    }
    var good = await verifyBytes(pub, enc(receipt.payload_hash), receipt.signature);
    return {
      ok: good,
      gate: receipt.gate,
      id: receipt.id,
      alg: receipt.alg,
      integrity: good ? "valid" : "invalid"
    };
  }

  async function importAndVerify(jsonOrObj) {
    var r = typeof jsonOrObj === "string" ? JSON.parse(jsonOrObj) : jsonOrObj;
    return verify(r);
  }

  async function demo(name) {
    name = String(name || "allow").toLowerCase();
    if (name === "block" || name === "no_evidence") {
      return createMandate({
        goal: "Отправить внешний API-запрос",
        action: "http.post",
        answer: "Выполняю вызов без дополнительных оснований.",
        policy: "strict",
        evidence: []
      });
    }
    if (name === "weak") {
      return createMandate({
        goal: "Изменить конфигурацию",
        action: "config.write",
        answer: "Меняю параметр.",
        policy: "strict",
        evidence: [{ source: "rumor", tier: "weak", snippet: "кто-то сказал что можно" }]
      });
    }
    return createMandate({
      goal: "Сохранить локальный факт в памяти",
      action: "memory.write",
      answer: "Факт записан в локальное хранилище после проверки.",
      policy: "strict",
      evidence: [
        {
          id: "ev_1",
          source: "user_explicit",
          tier: "sealed",
          snippet: "Пользователь явно подтвердил запись факта."
        },
        {
          id: "ev_2",
          source: "policy",
          tier: "ok",
          snippet: "policy=strict, memory.write разрешён при sealed evidence."
        }
      ]
    });
  }

  function exportJSON(receipt) {
    return JSON.stringify(receipt, null, 2);
  }

  G.AKSI_MANDATE = {
    version: VER,
    schema: SCHEMA,
    did: DID,
    create: createMandate,
    verify: verify,
    demo: demo,
    evaluateGate: evaluateGate,
    exportJSON: exportJSON,
    importAndVerify: importAndVerify,
    status: function () {
      return { version: VER, schema: SCHEMA, did: DID, alg: "ECDSA-P256-SHA256", no_llm: true };
    }
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
