const assert = require("node:assert/strict");
const router = require("../aksi-answer-router.js");

async function run() {
  const root = globalThis;
  const previous = {};
  for (const name of ["AKSIWeather","AKSISemanticReasoning","AKSICalculator","AKSISymbolicInference","AKSI_INTERNET","AKSI_WEBLLM"]) previous[name] = root[name];
  try {
    root.AKSIWeather = {
      detect: q => /погод/i.test(q) ? { handled: true } : null,
      answer: async q => ({ handled: true, text: "Погода для теста", data: { city: "Анапа" } })
    };
    root.AKSISemanticReasoning = { answer: q => /^что такое математика/i.test(q) ? { handled: true, status: "defined", text: "Математика изучает структуры.", proof: [{type:"definition"}] } : null };
    root.AKSICalculator = { evaluate: expression => expression === "2+2" ? { ok: true, value: 4, formatted: "4" } : expression === "sqrt(81)" ? { ok: true, value: 9, formatted: "9" } : { ok: false, error: "bad expression" } };
    let result = await router.answer("Команда - узнай погоду в Анапе");
    assert.equal(result.route, "weather");
    assert.match(result.text, /Погода для теста/);
    result = await router.answer("Что такое математика?");
    assert.equal(result.route, "semantic-reasoning");
    assert.match(result.text, /структуры/);
    result = await router.answer("помощь");
    assert.equal(result.route, "help");
    assert.match(result.text, /локальная база знаний/i);
    result = await router.answer("сколько будет 2+2");
    assert.equal(result.route, "calculator");
    assert.match(result.text, /4/);
    result = await router.answer("сколько будет 2+2?");
    assert.equal(result.route, "calculator");
    assert.match(result.text, /4/);
    result = await router.answer("sqrt(81)");
    assert.equal(result.route, "calculator");
    assert.match(result.text, /9/);
    result = await router.answer("Команда - найди в интернете причины приливов");
    assert.equal(router.isExplicitSearch("Команда - найди в интернете причины приливов"), true);
    assert.equal(result.route, "web-evidence");
    assert.match(result.text, /не удалось|источников|материалов/i);
    root.AKSI_INTERNET = { gather: async () => ({ ok: true, evidence: [{ title: "Test source", text: "Evidence snippet", url: "https://example.org" }], errors: [] }) };
    result = await router.answer("найди причины приливов");
    assert.equal(result.route, "web-evidence");
    assert.match(result.text, /Evidence snippet/);
    assert.match(result.text, /https:\/\/example.org/);
    root.AKSI_WEBLLM = { ready: () => true, complete: async (q, options) => ({ text: "Сводка по источнику.", model: "test-model", receivedSystem: options.system }) };
    result = await router.answer("объясни причины приливов", { useWeb: true });
    assert.equal(result.route, "webllm+evidence");
    assert.match(result.text, /Источники для проверки/);
    root.AKSISemanticReasoning = { answer: q => /^что такое флуксометр/i.test(q) ? { handled: true, status: "unknown_concept", text: "unknown concept" } : null };
    result = await router.answer("Что такое флуксометр?");
    assert.equal(result.route, "webllm");
    assert.match(result.text, /Сводка по источнику/);
    root.AKSI_WEBLLM = null;
    result = await router.answer("почему небо голубое?");
    assert.equal(result.route, "honest-abstention");
    assert.match(result.text, /не могу надёжно ответить/);
    console.log("AKSI answer router tests: OK (7 scenarios)");
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete root[name]; else root[name] = value;
    }
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
