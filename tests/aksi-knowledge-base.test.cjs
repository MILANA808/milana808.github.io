const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const source = fs.readFileSync(require("node:path").join(__dirname, "../aksi-knowledge-base.js"), "utf8");
const store = new Map();
const context = { console, Date, Set, Map, JSON, Math, localStorage: {
  getItem: key => store.has(key) ? store.get(key) : null,
  setItem: (key, value) => store.set(key, String(value))
} };
context.window = context;
vm.createContext(context);
vm.runInContext(source, context);
const kb = context.AKSIKnowledgeBase;

let r = kb.answer("запомни факт: кошка — это животное");
assert.equal(r.status, "fact_added");
assert.equal(r.proof[0].type, "user_asserted_fact");
r = kb.answer("запомни факт: животное --is-a--> живое существо");
assert.equal(r.status, "fact_added");
r = kb.answer("запомни факт: кошка --has--> хвост");
assert.equal(r.status, "fact_added");
r = kb.answer("что у кошки есть?");
assert.equal(r.status, "facts_listed");
assert.match(r.text, /кошка --has--> хвост/);
r = kb.answer("из чего состоит кошка?");
assert.equal(r.status, "facts_listed");
assert.match(r.text, /кошка --has--> хвост/);
r = kb.answer("что связано с животным?");
assert.equal(r.status, "facts_listed");
assert.match(r.text, /кошка --is-a--> животное/);
r = kb.answer("является ли кошка живым существом?");
assert.equal(r.status, "entailed_by_user_facts");
assert.match(r.text, /кошка → животное → живое существо/);
assert.equal(r.proof[0].edges.length, 2);
r = kb.answer("что ты знаешь о кошке?");
assert.equal(r.status, "facts_listed");
assert.match(r.text, /источник — пользовательские утверждения/);
r = kb.answer("запомни факт: кошка --not-is-a--> животное");
assert.equal(r.status, "fact_added");
r = kb.answer("является ли кошка животное?");
assert.equal(r.status, "contradiction");
assert.match(r.text, /противоречие/);
r = kb.answer("является ли единорог космическим кораблём?");
assert.equal(r, null);
assert.equal(kb.listFacts().length, 4);
const persisted = JSON.parse(store.get("aksi_knowledge_base_v1"));
assert.equal(persisted.schema, "AKSI-KB/1");
assert.equal(persisted.facts.length, 4);
console.log("AKSI knowledge base tests: OK (8 scenarios)");
