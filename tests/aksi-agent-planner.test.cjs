const assert = require("node:assert/strict");
const planner = require("../modules/aksi-agent-planner.js");
const mathExpression = q => {
  const match = q.match(/^(?:сколько будет|посчитай|вычисли)?\s*([\d\s()+*/.^-]+)$/i);
  return match && /\d/.test(match[1]) && /[+*/^()-]/.test(match[1]) ? match[1].trim() : null;
};
assert.equal(planner.version, "0.2.0");
assert.equal(planner.plan("сколько будет 2+2", { mathExpression }).steps[0].action, "math.calculate");
assert.equal(planner.plan("запомни факт: кошка — это животное").steps[0].action, "knowledge.write");
assert.equal(planner.plan("что ты знаешь о кошке?").steps[0].action, "knowledge.read");
assert.equal(planner.plan("что такое математика?").steps[0].action, "semantic.query");
assert.equal(planner.plan("почему небо голубое?").steps[0].action, "answer.respond");
assert.throws(() => planner.plan(""), /non-empty/);
assert.throws(() => planner.plan("x".repeat(4001)), /4000/);
console.log("AKSI deterministic goal planner tests: OK");
