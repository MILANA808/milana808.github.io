/** AKSI Integrity Bridge v1.1 — awaits Decision.decide Promise */
(function (G) {
  "use strict";
  var KEY = "aksi_decision_packets_v2";
  function load() { try { var x = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(x) ? x : []; } catch (e) { return []; } }
  function save(x) { try { localStorage.setItem(KEY, JSON.stringify(x.slice(-200))); } catch (e) {} }
  function last() { var x = load(); return x.length ? x[x.length - 1].id : "genesis"; }
  function maybe(v) { return v && typeof v.then === "function" ? v : Promise.resolve(v); }
  async function decide(query, opts) {
    opts = opts || {};
    if (!G.AKSI_DECISION) throw new Error("AKSI_DECISION required");
    var legacy = await maybe(G.AKSI_DECISION.decide(query));
    if (G.AKSI_DECISION_PACKET && G.AKSI_DECISION_PACKET.make) {
      var p = G.AKSI_DECISION_PACKET.make({
        id: legacy.id,
        request: { query: String(query || ""), received_at: new Date().toISOString() },
        candidates: [{ id: "c1", answer: legacy.answer, source: legacy.source || "runtime", score: legacy.scores || {} }],
        selected_decision: { candidate_id: "c1", answer: legacy.answer, source: legacy.source || "runtime" },
        evaluation: legacy.scores || {},
        uncertainty: legacy.scores ? legacy.scores.uncertainty : null,
        policy: opts.policy || { name: "default", version: "1", mode: "observe" },
        gate: legacy.gate || { ok: false },
        model_identity: { type: legacy.source || "local-runtime", id: "AKSI Decision Runtime", version: legacy.version || "2.0" },
        reality: opts.reality || null,
        parent: last(),
        trace: legacy.trace || [],
        claims: [{ text: legacy.answer, status: "generated", verification: "not-established" }]
      });
      var signed = await G.AKSI_DECISION_PACKET.seal(p);
      var arr = load(); arr.push(signed); save(arr);
      return Object.assign({}, legacy, { packet: signed, proof: signed });
    }
    return legacy;
  }
  async function verify(packet) {
    if (G.AKSI_DECISION_PACKET && G.AKSI_DECISION_PACKET.verify) {
      return G.AKSI_DECISION_PACKET.verify(packet);
    }
    if (G.AKSI_DECISION && G.AKSI_DECISION.verify) return G.AKSI_DECISION.verify(packet);
    return { ok: false, error: "no verifier" };
  }
  G.AKSI_INTEGRITY = { version: "1.1.0", decide: decide, verify: verify, list: load };
})(typeof window !== "undefined" ? window : globalThis);
