const assert = require("node:assert/strict");
const semantic = require("../aksi-semantic-reasoning.js");
const core = require("../aksi-native-language-core.js");
globalThis.AKSISemanticReasoning = semantic;
const cases = [
  ["Объясни своими словами, что такое логика?", "explain", /Логика изучает правила корректного вывода/],
  ["Как работает алгоритм?", "operation", /конечная, определённая последовательность шагов/],
  ["Зачем нужна математика?", "purpose", /Математика изучает структуры/],
  ["Почему работает искусственный интеллект?", "cause", /нет причинной цепочки/]
];
for (const [query,intent,expected] of cases) {
  assert.equal(core.classify(query),intent,query);
  const result=core.answer(query);
  assert.equal(result.handled,true,query);
  assert.equal(result.route,"native-language-core");
  assert.match(result.text,expected);
  assert.ok(result.proof.length>0);
}
const unknown=core.answer("Как работает флуксометр?");
assert.equal(unknown.status,"unknown_concept");
assert.match(unknown.text,/не могу надёжно определить/);
assert.equal(core.answer("Привет"),null);
console.log("AKSI native language core tests: OK (grounded explanations, operation, purpose, cause abstention, unknown)");
