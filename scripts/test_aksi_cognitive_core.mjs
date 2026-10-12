import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import Core from "../aksi-cognitive-core.js";

if (!globalThis.crypto) Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });

const empty = Core.createCase("The claim");
assert.equal(Core.assess(empty).status, "insufficient_evidence");

Core.addEvidence(empty, { stance: "supports", text: "First observation", url: "https://a.example/1", sourceGroup: "publisher-a", reliability: 0.8 });
const one = Core.assess(empty);
assert.equal(one.status, "supported_by_available_evidence");
assert.equal(one.supportWeight, 0.8);

Core.addEvidence(empty, { stance: "supports", text: "Same publisher repeats claim", url: "https://a.example/2", sourceGroup: "publisher-a", reliability: 0.8 });
assert.equal(Core.assess(empty).supportWeight, 1.0); // repeated source group gets 0.25 weight

Core.addEvidence(empty, { stance: "refutes", text: "Counterevidence", url: "https://b.example/report", sourceGroup: "publisher-b", reliability: 0.9 });
assert.equal(Core.assess(empty).status, "contested");
assert.equal(Core.assess(empty).independentSourceGroups, 2);

const before = Core.assess(empty);
Core.addEvidence(empty, { stance: "context", text: "Background only", sourceGroup: "context-only", reliability: 1 });
const after = Core.assess(empty);
assert.equal(after.supportWeight, before.supportWeight);
assert.equal(after.refuteWeight, before.refuteWeight);

assert.throws(() => Core.createCase(" "), /must not be empty/);
assert.throws(() => Core.addEvidence(empty, { stance: "supports", text: "x", reliability: 2 }), /between 0 and 1/);
assert.throws(() => Core.addEvidence(empty, { stance: "maybe", text: "x" }), /stance/);

const receipt1 = await Core.receipt(empty);
const receipt2 = await Core.receipt(empty);
assert.match(receipt1.digest, /^[a-f0-9]{64}$/);
assert.equal(receipt1.digest, receipt2.digest);
assert.equal(receipt1.algorithm, "SHA-256");
console.log("AKSI cognitive core tests: OK");
