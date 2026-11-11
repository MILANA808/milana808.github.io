const assert = require('node:assert/strict');
const engine = require('../aksi-semantic-reasoning.js');

function ask(q, status) {
  const result = engine.answer(q);
  assert.ok(result && result.handled, 'must handle: ' + q);
  assert.equal(result.status, status, q + ' status');
  assert.ok(result.text.length > 10, 'must return a meaningful response: ' + q);
  return result;
}

const definition = ask('Что такое математика?', 'defined');
assert.match(definition.text, /структуры, количества/i);
assert.equal(definition.proof[0].type, 'definition_lookup');

const alias = ask('Что такое ИИ?', 'defined');
assert.match(alias.text, /Искусственный интеллект/i);

const comparison = ask('Чем отличается математика и логика?', 'compared');
assert.equal(comparison.proof[0].type, 'feature_comparison');
assert.ok(comparison.proof[0].onlyA.length + comparison.proof[0].onlyB.length > 0);

const relation = ask('Является ли математика наукой?', 'entailed');
assert.ok(relation.proof[0].path.includes('наука'));

const unknownDefinition = ask('Что такое флуксометр?', 'unknown_concept');
assert.match(unknownDefinition.text, /не буду заменять пробел догадкой/i);

const unknownRelation = ask('Является ли флуксометр наукой?', 'unknown_relation');
assert.match(unknownRelation.text, /не равна ложной/i);

const commonPath = engine.explainRelation("нейронная сеть", "языковая модель");
assert.equal(commonPath.status, "shared_category");
assert.equal(commonPath.proof[0].ancestor, "вычислительная модель");
const subtypePath = engine.explainRelation("геометрия", "математика");
assert.equal(subtypePath.status, "directed_relation");
assert.deepEqual(subtypePath.proof[0].path, ["геометрия", "математика"]);
const unknownPath = engine.explainRelation("флуксометр", "математика");
assert.equal(unknownPath.status, "unknown_concept");

assert.equal(engine.answer('Привет'), null, 'unrelated queries must fall through to the existing router');
assert.equal(engine.answer(''), null, 'empty input must not be handled');

const inflectedComparison = ask('В чём разница между математикой и логикой?', 'compared');
assert.deepEqual(inflectedComparison.proof[0].concepts, ['математика', 'логика']);

const alternateComparison = ask('Чем отличается нейросеть от языковой модели?', 'compared');
assert.deepEqual(alternateComparison.proof[0].concepts, ['нейронная сеть', 'языковая модель']);

const explainConcept = ask('Объясни понятие алгоритм', 'defined');
assert.match(explainConcept.text, /последовательность шагов/i);

const tellAbout = ask('Расскажи мне про геометрию', 'defined');
assert.match(tellAbout.text, /пространстве/i);
console.log('AKSI semantic reasoning tests: OK (8 assertions groups)');
