const test = require('node:test');
const assert = require('node:assert/strict');
const inference = require('../aksi-symbolic-inference.js');

test('derives a conclusion through a chain of explicit rules', () => {
  const result = inference.infer('логика: если идет дождь, то земля мокрая; если земля мокрая, то скользко; идет дождь; следует ли скользко?');
  assert.equal(result.ok, true);
  assert.equal(result.status, 'proven');
  assert.equal(result.query, 'скользко');
  assert.equal(result.proof.at(-1).to, 'скользко');
  assert.ok(result.proof.some(step => step.type === 'rule'));
});

test('does not claim an unproven conclusion is false', () => {
  const result = inference.infer('логика: идет дождь; следует ли земля мокрая?');
  assert.equal(result.status, 'not_derived');
  assert.match(result.text, /не доказывает, что утверждение ложно/);
});

test('accepts explicit facts and simple implication rules', () => {
  const result = inference.infer('выведи: факт: сервер доступен; если сервер доступен, то можно проверить API; следует ли можно проверить API?');
  assert.equal(result.status, 'proven');
});

test('rejects requests without a query', () => {
  const result = inference.infer('логика: если a, то b; a');
  assert.equal(result.ok, false);
  assert.equal(result.status, 'invalid_input');
});

test('keeps propositions exact rather than guessing semantic equivalence', () => {
  const result = inference.infer('логика: идет дождь; следует ли улица мокрая?');
  assert.equal(result.status, 'not_derived');
});

console.log('AKSI symbolic inference tests: OK');
