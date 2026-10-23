const assert = require("node:assert/strict");
const engine = require("../aksi-semantic-reasoning.js");

const corpus = [
  ["Что такое математика?", "defined"],
  ["Расскажи о математике", "defined"],
  ["Объясни, что такое физика", "defined"],
  ["Что означает ИИ?", "defined"],
  ["Что такое нейросеть?", "defined"],
  ["Что такое квантовый компьютер?", "defined"],
  ["Что такое программирование?", "defined"],
  ["Что означает данные?", "defined"],
  ["Что такое информация?", "defined"],
  ["Что такое интернет?", "defined"],
  ["Что такое химия?", "defined"],
  ["Что такое энергия?", "defined"],
  ["Чем отличается математика и логика?", "compared"],
  ["В чем разница между физика и химия?", "compared"],
  ["Сравни нейросеть и языковую модель", "compared"],
  ["Является ли математика наукой?", "entailed"],
  ["Является ли геометрия разделом математики?", "entailed"],
  ["Что такое флуксометр?", "unknown_concept"],
  ["Является ли флуксометр наукой?", "unknown_relation"],
  ["Привет", null]
];

let passed = 0;
const failures = [];
for (const [prompt, expected] of corpus) {
  const result = engine.answer(prompt);
  const actual = result ? result.status : null;
  if (actual !== expected) failures.push({ prompt, expected, actual });
  else passed++;
}
assert.deepEqual(failures, [], "semantic benchmark failures");
assert.equal(engine.version, "1.1.0");
console.log("AKSI semantic benchmark: " + passed + "/" + corpus.length + " prompts passed");
