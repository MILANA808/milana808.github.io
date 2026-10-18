import test from "node:test";
import assert from "node:assert/strict";
import { createAKSICore, AKSI_STATUS } from "../src/core.mjs";

const evidence = (supports, id = "e1") => ({
  id, text: "Observed source text", source: "test fixture",
  observedAt: "2026-10-19T00:00:00Z", supports
});

test("exports explicit finite status vocabulary", () => {
  assert.deepEqual(AKSI_STATUS, [
    "SUPPORTED", "INSUFFICIENT_EVIDENCE", "CONFLICTING_EVIDENCE", "REJECTED"
  ]);
});

test("does not promote an unsupported claim", async () => {
  const core = createAKSICore();
  const result = await core.evaluate({ claim: "Claim without evidence", evidence: [] });
  assert.equal(result.status, "INSUFFICIENT_EVIDENCE");
  assert.equal(result.evidenceCount, 0);
});

test("reports support only when explicitly annotated", async () => {
  const core = createAKSICore();
  const result = await core.evaluate({ claim: "Example claim", evidence: [evidence(true)] });
  assert.equal(result.status, "SUPPORTED");
  assert.equal(result.supportingEvidenceCount, 1);
  assert.ok(result.limitations.length >= 2);
});

test("preserves conflict rather than hiding contradictory evidence", async () => {
  const core = createAKSICore();
  const result = await core.evaluate({
    claim: "Conflicted claim",
    evidence: [evidence(true, "support"), evidence(false, "refute")]
  });
  assert.equal(result.status, "CONFLICTING_EVIDENCE");
});

test("explicit contradictions prevent an unqualified supported result", async () => {
  const core = createAKSICore();
  const result = await core.evaluate({
    claim: "Claim with contradiction",
    evidence: [evidence(true)],
    contradictions: ["A conflicting observation"]
  });
  assert.equal(result.status, "CONFLICTING_EVIDENCE");
});

test("rejects oversized evidence collections", async () => {
  const core = createAKSICore({ maxEvidencePerClaim: 1 });
  await assert.rejects(() => core.evaluate({
    claim: "Limit test", evidence: [evidence(true), evidence(true, "e2")]
  }), /Evidence limit exceeded/);
});

test("trace is sequence numbered and hash chain verifies where Web Crypto exists", async () => {
  const core = createAKSICore();
  await core.evaluate({ claim: "Trace test", evidence: [evidence(true)] });
  const trace = core.getTrace();
  assert.equal(trace.length, 1);
  assert.equal(trace[0].sequence, 1);
  assert.equal(typeof trace[0].previousHash, "string");
  const verified = await core.verifyTrace();
  if (globalThis.crypto?.subtle) assert.equal(verified.valid, true);
  else assert.equal(verified.verifiable, false);
});

test("rejects malformed annotations instead of guessing", async () => {
  const core = createAKSICore();
  await assert.rejects(() => core.evaluate({
    claim: "Malformed evidence", evidence: [{ text: "x", supports: "probably" }]
  }), /supports must be/);
});
