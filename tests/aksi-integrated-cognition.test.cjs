"use strict";
const assert = require("node:assert/strict");
const evidence = require("../aksi-evidence-kernel.js");
const bridge = require("../aksi-language-claim-bridge.js");
const cognitionApi = require("../aksi-integrated-cognition.js");
class MemoryStorage {
  constructor() { this.data = new Map(); }
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}
const storage = new MemoryStorage();
let cognition = cognitionApi.create({ storage, kernelApi: evidence, bridgeApi: bridge });
const first = cognition.ingest("Кошки — это млекопитающие");
assert.equal(first.accepted, true);
assert.equal(first.persisted, true);
assert.equal(cognition.ingest("Млекопитающие являются животными").accepted, true);
assert.equal(cognition.answer("Является ли Кошки животными").status, "supported");
assert.equal(cognition.answer("Является ли Кошки растениями").status, "unknown");
assert.equal(cognition.ingest("Гипотеза: кошки — это растения").requiresReview, true);
assert.equal(cognition.status().claims, 2);
cognition = cognitionApi.create({ storage, kernelApi: evidence, bridgeApi: bridge });
assert.equal(cognition.status().claims, 2, "claims survive runtime recreation");
assert.equal(cognition.answer("Является ли Кошки животными").status, "supported");
cognition.ingest("Кошки не являются млекопитающие");
assert.equal(cognition.answer("Является ли Кошки млекопитающие").status, "conflicted");
const volatile = cognitionApi.create({ storage: null, kernelApi: evidence, bridgeApi: bridge });
assert.equal(volatile.status().persistence, "memory-only");
assert.deepEqual(cognition.clear(), { ok: true, persisted: true, claims: 0 });
assert.equal(cognition.status().claims, 0);
cognition = cognitionApi.create({ storage, kernelApi: evidence, bridgeApi: bridge });
assert.equal(cognition.status().claims, 0, "cleared claims do not return after runtime recreation");
assert.deepEqual(volatile.clear(), { ok: true, persisted: false, claims: 0 });
const failingStorage = {
  getItem() { return null; },
  setItem() {},
  removeItem() { throw new Error("storage removal blocked"); }
};
const protectedRuntime = cognitionApi.create({ storage: failingStorage, kernelApi: evidence, bridgeApi: bridge });
assert.equal(protectedRuntime.ingest("Луна — это спутник Земли").accepted, true);
const failedClear = protectedRuntime.clear();
assert.equal(failedClear.ok, false, "a storage removal failure must not be reported as success");
assert.equal(failedClear.persisted, false);
assert.equal(protectedRuntime.status().claims, 1, "runtime claims remain intact when durable deletion fails");
console.log("AKSI integrated cognition tests: OK");
