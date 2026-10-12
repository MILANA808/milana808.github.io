/* AKSI Cognitive Core v0.1
 * Deterministic evidence ledger and calibrated claim assessment.
 * This is a transparent classical algorithm, not an LLM, AGI, or quantum computer.
 * UMD: window.AKSICognitiveCore / module.exports
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AKSICognitiveCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const VERSION = "0.1.0";
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const clean = (s, max = 2000) => String(s == null ? "" : s).trim().slice(0, max);
  const canonical = value => {
    if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
    if (value && typeof value === "object") {
      return "{" + Object.keys(value).sort().map(k => JSON.stringify(k) + ":" + canonical(value[k])).join(",") + "}";
    }
    return JSON.stringify(value);
  };
  function createCase(claim) {
    const statement = clean(claim, 1000);
    if (!statement) throw new TypeError("Claim must not be empty");
    return { schema: "AKSI-EVIDENCE/1", version: VERSION, claim: statement, evidence: [] };
  }
  function addEvidence(record, input) {
    if (!record || record.schema !== "AKSI-EVIDENCE/1") throw new TypeError("Invalid AKSI evidence record");
    if (!input || !["supports", "refutes", "context"].includes(input.stance)) throw new TypeError("stance must be supports, refutes, or context");
    const url = clean(input.url, 2000);
    const text = clean(input.text, 4000);
    if (!text) throw new TypeError("Evidence text must not be empty");
    const reliability = Number(input.reliability == null ? 0.5 : input.reliability);
    if (!Number.isFinite(reliability) || reliability < 0 || reliability > 1) throw new RangeError("reliability must be between 0 and 1");
    const sourceGroup = clean(input.sourceGroup || url || ("unattributed-" + (record.evidence.length + 1)), 300);
    const item = {
      id: "E" + String(record.evidence.length + 1).padStart(4, "0"),
      stance: input.stance, text, url, sourceGroup, reliability,
      observedAt: clean(input.observedAt || "", 80)
    };
    record.evidence.push(item);
    return item;
  }
  function assess(record) {
    if (!record || record.schema !== "AKSI-EVIDENCE/1") throw new TypeError("Invalid AKSI evidence record");
    let support = 0, refute = 0;
    const used = { supports: new Set(), refutes: new Set() };
    const contributions = [];
    for (const e of record.evidence) {
      if (e.stance === "context") { contributions.push({ id: e.id, weight: 0, reason: "context does not count as direct support" }); continue; }
      const seen = used[e.stance];
      const novelty = seen.has(e.sourceGroup) ? 0.25 : 1;
      seen.add(e.sourceGroup);
      const weight = clamp(e.reliability, 0, 1) * novelty;
      if (e.stance === "supports") support += weight;
      else refute += weight;
      contributions.push({ id: e.id, weight: Number(weight.toFixed(4)), reason: novelty === 1 ? "first item from source group" : "same source group discounted" });
    }
    const total = support + refute;
    const balance = total ? (support - refute) / total : 0;
    const independentGroups = new Set(record.evidence.filter(e => e.stance !== "context").map(e => e.sourceGroup)).size;
    const status = total === 0 ? "insufficient_evidence" :
      support > 0 && refute > 0 && Math.min(support, refute) / Math.max(support, refute) >= 0.5 ? "contested" :
      balance >= 0.35 ? "supported_by_available_evidence" :
      balance <= -0.35 ? "challenged_by_available_evidence" : "mixed_or_weak";
    // This is a transparent heuristic index, explicitly not a probability of truth.
    const evidenceStrength = Number((1 - Math.exp(-total / 2)).toFixed(4));
    const balanceIndex = Number(Math.abs(balance).toFixed(4));
    return {
      schema: "AKSI-ASSESSMENT/1", version: VERSION, claim: record.claim, status,
      supportWeight: Number(support.toFixed(4)), refuteWeight: Number(refute.toFixed(4)),
      balance: Number(balance.toFixed(4)), evidenceStrength, balanceIndex,
      independentSourceGroups: independentGroups, evidenceCount: record.evidence.length,
      contributions, warning: "Heuristic assessment of supplied evidence only; not a probability of truth. Source quality and independence require external validation."
    };
  }
  async function receipt(record, assessment) {
    const payload = { record, assessment: assessment || assess(record) };
    const bytes = new TextEncoder().encode(canonical(payload));
    const subtle = typeof crypto !== "undefined" && crypto.subtle ? crypto.subtle :
      (typeof globalThis !== "undefined" && globalThis.crypto && globalThis.crypto.subtle ? globalThis.crypto.subtle : null);
    if (!subtle) throw new Error("SHA-256 unavailable: Web Crypto is required");
    const digest = await subtle.digest("SHA-256", bytes);
    const hex = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
    return { schema: "AKSI-RECEIPT/1", algorithm: "SHA-256", digest: hex, payload };
  }
  return { version: VERSION, createCase, addEvidence, assess, receipt, canonical };
});
