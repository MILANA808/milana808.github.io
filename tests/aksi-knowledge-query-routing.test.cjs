const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const store = new Map();
const context = {
  console, Date, Set, Map, JSON, Math, URL,
  localStorage: {
    getItem: key => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: key => store.delete(key)
  }
};
context.window = context;
vm.createContext(context);
for (const file of ["aksi-knowledge-base.js", "aksi-semantic-reasoning.js", "aksi-answer-router.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
(async () => {
  const kb = context.AKSIKnowledgeBase;
  kb.clear();
  assert.equal(kb.answer("запомни факт: кошка --has--> хвост").status, "fact_added");
  assert.equal(kb.answer("запомни факт: кошка --is-a--> животное").status, "fact_added");

  let result = await context.AKSIAnswerRouter.answer("что у кошки есть?");
  assert.equal(result.route, "local-knowledge-base");
  assert.equal(result.knowledge.status, "facts_listed");
  assert.match(result.text, /кошка --has--> хвост/);
  result = await context.AKSIAnswerRouter.answer("что связано с животным?");
  assert.equal(result.route, "local-knowledge-base");
  assert.match(result.text, /кошка --is-a--> животное/);
  assert.match(result.text, /пользовательским|пользовательским утверждениям/i);
  console.log("AKSI knowledge query routing: OK");
})().catch(error => { console.error(error); process.exitCode = 1; });
