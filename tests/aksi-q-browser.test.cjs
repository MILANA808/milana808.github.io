"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { Runtime, AksiError, tokenize, limits } = require("../aksi-q-browser.js");

class TestMemory {
  constructor() { this.records = new Map(); }
  async put(key, value) { this.records.set(key.toLowerCase(), { key, value: typeof value === "string" ? value : JSON.stringify(value), updatedAt: "2026-01-01T00:00:00.000Z" }); }
  async get(key) { return this.records.get(key.toLowerCase()) || null; }
  async search(query) { return [...this.records.values()].filter(x => (x.key + " " + x.value).toLowerCase().includes(query.toLowerCase())); }
  async remove(key) { this.records.delete(key.toLowerCase()); }
}

test("AKSI Q browser runtime exposes explicit resource limits", () => {
  assert.equal(limits.qubits, 10);
  assert.equal(limits.lines, 2000);
  assert.ok(tokenize("2 + 2").length > 1);
});

test("Pratt parser respects precedence, right-associative power and unary minus", async () => {
  const r = new Runtime({ memory: new TestMemory() });
  assert.deepEqual(await r.run("print 2 + 3 * 4\nprint 2 ** 3 ** 2\nprint -2 ** 2"), [14, 512, -4]);
});

test("complex arithmetic, conjugate dot product and norm", async () => {
  const r = new Runtime({ memory: new TestMemory() });
  const result = await r.run("print complex(1, 1) * complex(1, -1)\nprint abs(complex(3, 4))\nprint norm(vector(complex(3, 4)))\nprint dot(vector(complex(1, 1)), vector(complex(1, 1)))");
  assert.equal(result[0].re, 2);
  assert.equal(result[0].im, 0);
  assert.equal(result[1], 5);
  assert.equal(result[2], 5);
  assert.equal(result[3].re, 2);
  assert.equal(result[3].im, 0);
});

test("boolean expressions and chained comparisons", async () => {
  const r = new Runtime({ memory: new TestMemory() });
  assert.deepEqual(await r.run("print not (2 > 3) and 4 >= 4\nprint 1 < 2 < 3"), [true, true]);
});

test("registered functions only; unknown names and injection are rejected", async () => {
  const r = new Runtime({ memory: new TestMemory() });
  await assert.rejects(() => r.run('print __import__("os")'), AksiError);
  await assert.rejects(() => r.run("print not_defined"), AksiError);
});

test("concept definitions and explicit transitive is_a inference", async () => {
  const r = new Runtime({ memory: new TestMemory() });
  const result = await r.run('concept "cat" means "mammal"\nconcept "mammal" means "animal"\nrelate "cat" -> "mammal" as "is_a"\nrelate "mammal" -> "animal" as "is_a"\nask "cat"\ninfer "cat"');
  assert.equal(result[0], "mammal; relations: is_a: mammal");
  assert.deepEqual(result[1], ["mammal", "animal"]);
});

test("Bell state probabilities are 0.5 on |00> and |11>", async () => {
  const r = new Runtime({ memory: new TestMemory() });
  const result = await r.run("let zero = qstate(2)\nlet plus = h(zero, 0)\nlet bell = cnot(plus, 0, 1)\nprint probabilities(bell)");
  assert.ok(Math.abs(result[0][0] - 0.5) < 1e-10);
  assert.ok(Math.abs(result[0][3] - 0.5) < 1e-10);
  assert.ok(Math.abs(result[0][1]) < 1e-10);
  assert.ok(Math.abs(result[0][2]) < 1e-10);
});

test("seeded measurement is deterministic and keyword arguments work", async () => {
  const r = new Runtime({ memory: new TestMemory() });
  const result = await r.run("let state = h(qstate(1))\nprint measure(state, shots=32, seed=9)");
  assert.equal(Object.values(result[0]).reduce((a, b) => a + b, 0), 32);
  assert.deepEqual(await r.run("print measure(state, shots=32, seed=9)"), result);
});

test("persistent-memory language statements use the memory adapter", async () => {
  const memory = new TestMemory();
  const r = new Runtime({ memory });
  assert.deepEqual(await r.run('remember "project" = "AKSI Q browser runtime"\nrecall "project"\nsearch "browser"'), [
    "MEMORY SAVED: project",
    "AKSI Q browser runtime",
    [{ key: "project", value: "AKSI Q browser runtime", updatedAt: "2026-01-01T00:00:00.000Z" }]
  ]);
  assert.deepEqual(await r.run('forget "project"\nrecall "project"'), ["MEMORY DELETED: project", "MEMORY NOT FOUND: project"]);
});

test("resource bounds reject oversized programs and registers", async () => {
  const r = new Runtime({ memory: new TestMemory() });
  await assert.rejects(() => r.run("print qstate(11)"), AksiError);
  await assert.rejects(() => r.run("print 2 ** 2000"), AksiError);
  await assert.rejects(() => r.run("x\n".repeat(2001)), AksiError);
});

test("assertions fail loudly with source line information", async () => {
  const r = new Runtime({ memory: new TestMemory() });
  await assert.rejects(() => r.run("print 1\nassert 2 + 2 == 5"), /line 2: assertion failed/);
});
