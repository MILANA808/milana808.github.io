/**
 * AKSI Bond Protocol v1.0 — Evidence-Bound Sealed Memory
 *
 * NEW TECHNOLOGY (client-side, open, no server):
 *   Evidence cards are content-hashed.
 *   Sealed facts may bind to those hashes.
 *   Decisions emit a Bond Receipt: query + answer + evidence root + gate + time.
 *   Anyone can verify integrity offline (SHA-256). Optional Ed25519 via AKSI_RECEIPT.
 *
 * Not a new LLM. A verifiable binding layer between research, memory, and answers.
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var PROTOCOL = "aksi-bond";
  var VERSION = "1.0.0";
  var STORE_KEY = "aksi_bond_v1";
  var PREV_KEY = "aksi_bond_prev";

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
  async function sha256(s) {
    var dig = await crypto.subtle.digest("SHA-256", enc(s));
    return toHex(dig);
  }
  function canon(obj) {
    if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
    if (Array.isArray(obj))
      return "[" + obj.map(canon).join(",") + "]";
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

  async function hashEvidence(card) {
    var payload = canon({
      title: String((card && card.title) || ""),
      url: String((card && card.url) || ""),
      text: String((card && card.text) || "").slice(0, 2000),
    });
    var h = await sha256(payload);
    return {
      id: h.slice(0, 16),
      hash: h,
      title: (card && card.title) || "",
      url: (card && card.url) || "",
    };
  }

  async function evidenceRoot(hashes) {
    var list = (hashes || []).slice().filter(Boolean).sort();
    if (!list.length) return await sha256("empty");
    return await sha256(list.join("|"));
  }

  function loadStore() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || '{"bonds":[],"evidence":{}}');
    } catch (e) {
      return { bonds: [], evidence: {} };
    }
  }
  function saveStore(st) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(st));
    } catch (e) {}
  }

  async function registerEvidence(sources) {
    var st = loadStore();
    var ids = [];
    var hashes = [];
    var cards = sources || [];
    for (var i = 0; i < cards.length; i++) {
      var e = await hashEvidence(cards[i]);
      st.evidence[e.id] = {
        hash: e.hash,
        title: e.title,
        url: e.url,
        t: Date.now(),
      };
      ids.push(e.id);
      hashes.push(e.hash);
    }
    var root = await evidenceRoot(hashes);
    saveStore(st);
    return { root: root, ids: ids, hashes: hashes, count: ids.length };
  }

  async function createBond(fields) {
    fields = fields || {};
    var prev = null;
    try {
      prev = localStorage.getItem(PREV_KEY) || null;
    } catch (e) {}

    var body = {
      protocol: PROTOCOL,
      version: VERSION,
      ts: new Date().toISOString(),
      query: String(fields.query || ""),
      answer_hash: await sha256(String(fields.answer || "")),
      answer_preview: String(fields.answer || "").slice(0, 160),
      source: String(fields.source || "unknown"),
      gate: fields.gate ? String(fields.gate) : null,
      evidence_root: fields.evidence_root || (await sha256("empty")),
      evidence_ids: fields.evidence_ids || [],
      cortex_id: fields.cortex_id || null,
      eqs: fields.eqs != null ? Number(fields.eqs) : null,
      prev_bond: prev,
    };

    body.bond_id = (await sha256(canon(body))).slice(0, 24);
    body.integrity = await sha256(canon(body));

    if (G.AKSI_RECEIPT && fields.sign) {
      try {
        if (G.AKSI_RECEIPT.seal && fields.privateKey) {
          var rec = await G.AKSI_RECEIPT.seal(
            {
              query: body.query,
              decision: body.gate === "DEFERRED" ? "DEFERRED" : "ALLOWED",
              final_answer: fields.answer || "",
              confidence: (fields.eqs || 50) / 100,
              engine: "aksi-bond",
              prev_receipt_hash: prev,
            },
            fields.privateKey,
            fields.pubHex
          );
          body.ed25519_receipt = rec;
        }
      } catch (e) {
        body.sign_error = String(e.message || e).slice(0, 80);
      }
    }

    var st = loadStore();
    st.bonds.push({
      id: body.bond_id,
      integrity: body.integrity,
      ts: body.ts,
      query: body.query,
      source: body.source,
      evidence_root: body.evidence_root,
    });
    st.bonds = st.bonds.slice(-100);
    saveStore(st);
    try {
      localStorage.setItem(PREV_KEY, body.integrity);
    } catch (e) {}

    return body;
  }

  async function verifyBond(bond) {
    if (!bond || !bond.integrity) return { ok: false, reason: "missing" };
    var forId = {};
    Object.keys(bond).forEach(function (k) {
      if (k === "bond_id" || k === "integrity" || k === "ed25519_receipt" || k === "sign_error")
        return;
      forId[k] = bond[k];
    });
    var expectId = (await sha256(canon(forId))).slice(0, 24);
    if (expectId !== bond.bond_id) return { ok: false, reason: "bond_id mismatch" };
    var withId = Object.assign({}, forId, { bond_id: bond.bond_id });
    var expectInt = await sha256(canon(withId));
    if (expectInt !== bond.integrity) return { ok: false, reason: "integrity mismatch" };
    return { ok: true, protocol: PROTOCOL, version: VERSION, bond_id: bond.bond_id };
  }

  function listBonds() {
    return loadStore().bonds || [];
  }

  G.AKSI_BOND = {
    protocol: PROTOCOL,
    version: VERSION,
    hashEvidence: hashEvidence,
    evidenceRoot: evidenceRoot,
    registerEvidence: registerEvidence,
    createBond: createBond,
    verifyBond: verifyBond,
    listBonds: listBonds,
    bondFromThink: async function (query, out) {
      out = out || {};
      var ev = { root: await sha256("empty"), ids: [] };
      if (out.sources && out.sources.length) {
        ev = await registerEvidence(out.sources);
      }
      return createBond({
        query: query,
        answer: out.text,
        source: out.source,
        gate: out.gate && out.gate.decision,
        evidence_root: ev.root,
        evidence_ids: ev.ids,
        cortex_id: out.cortexId || (out.cortex && out.cortex.id) || null,
        eqs: out.eqs,
      });
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
