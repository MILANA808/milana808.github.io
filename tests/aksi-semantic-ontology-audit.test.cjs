const assert = require("node:assert/strict");
const engine = require("../aksi-semantic-reasoning.js");

assert.equal(typeof engine.auditGraph, "function", "semantic engine exposes ontology audit");
const report = engine.auditGraph();
assert.equal(report.schema, "aksi-ontology-audit/1.0");
assert.ok(report.concept_count >= 20, "audit covers the built-in concept graph");

const byType = type => report.issues.filter(issue => issue.type === type);
assert.deepEqual(byType("dangling_parent"), [], "all parent references resolve");
assert.deepEqual(byType("dangling_alias_target"), [], "all inflection targets resolve");
assert.deepEqual(byType("parent_cycle"), [], "parent graph is acyclic");
assert.deepEqual(byType("malformed_concept"), [], "all concept records have valid shape");
assert.deepEqual(byType("malformed_parent_definition"), [], "all parent definitions are non-empty");
assert.deepEqual(byType("empty_alias"), [], "no empty aliases exist");
assert.deepEqual(byType("alias_collision"), [], "each normalized alias maps to exactly one concept");

assert.equal(engine.resolve("нейросеть"), "нейронная сеть");
assert.equal(engine.resolve("нейронная сеть"), "нейронная сеть");
assert.equal(engine.resolve("искусственный интеллект"), "искусственный интеллект");

console.log("AKSI semantic ontology audit tests: OK (" + report.concept_count + " concepts, " + report.issue_count + " issues)");
