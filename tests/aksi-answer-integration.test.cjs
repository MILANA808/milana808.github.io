const assert = require("node:assert/strict");

const previous = {};
for (const key of ["AKSIWeather", "AKSIAnswerRouter", "AKSI_WEBLLM", "AKSISemanticReasoning", "AKSIKnowledgeBase", "AKSICalculator", "AKSISymbolicInference", "AKSI_INTERNET"]) previous[key] = globalThis[key];
const previousFetch = globalThis.fetch;

const weather = require("../aksi-weather.js");
const router = require("../aksi-answer-router.js");

function response(ok, data, status = 200) {
  return { ok, status, json: async () => data };
}

(async () => {
  try {
    const calls = [];
    globalThis.fetch = async url => {
      const value = String(url);
      calls.push(value);
      if (value.includes("geocoding-api")) {
        const city = new URL(value).searchParams.get("name");
        if (city === "Анапе") return response(true, { results: [] });
        if (city === "Анапа") return response(true, { results: [{
          name: "Анапа", admin1: "Краснодарский край", country: "Россия",
          country_code: "RU", latitude: 44.89, longitude: 37.32, timezone: "Europe/Moscow"
        }] });
        return response(true, { results: [] });
      }
      return response(true, {
        timezone: "Europe/Moscow",
        current: {
          time: "2026-10-24T12:00", temperature_2m: 17,
          apparent_temperature: 16, relative_humidity_2m: 60,
          precipitation: 0, weather_code: 2, wind_speed_10m: 9
        },
        daily: {
          temperature_2m_min: [12], temperature_2m_max: [19],
          precipitation_probability_max: [10]
        }
      });
    };
    globalThis.AKSIWeather = weather;
    globalThis.AKSI_WEBLLM = undefined;
    globalThis.AKSISemanticReasoning = undefined;
    globalThis.AKSIKnowledgeBase = undefined;
    globalThis.AKSICalculator = undefined;
    globalThis.AKSISymbolicInference = undefined;
    globalThis.AKSI_INTERNET = undefined;

    let result = await router.answer("Команда - узнай погоду в Анапе");
    assert.equal(result.handled, true);
    assert.equal(result.route, "weather");
    assert.match(result.text, /Погода в Анапа/);
    assert.match(result.text, /17 °C/);
    assert.match(result.text, /Open-Meteo/);
    assert.equal(calls.length, 3, "Russian prepositional case resolves through geocoder and forecast");
    assert.ok(!/\[ЯДРО\]|\[ПРОЦЕСС\]|тополог/i.test(result.text), "normal answer must not expose diagnostics");

    globalThis.fetch = async () => response(false, {}, 503);
    result = await router.answer("Команда — узнай погоду в Анапе");
    assert.equal(result.route, "weather");
    assert.match(result.text, /не удалось получить актуальную погоду/i);
    assert.match(result.text, /не буду подставлять выдуманные значения/i);

    globalThis.AKSI_WEBLLM = {
      ready: () => true,
      complete: async () => { throw new Error("GPU backend crashed with internal stack"); }
    };
    result = await router.answer("Объясни, почему небо голубое");
    assert.equal(result.route, "model-error");
    assert.match(result.text, /локальная модель завершилась с ошибкой/i);
    assert.ok(!result.text.includes("internal stack"), "model internals must not leak into user answer");
    assert.ok(!/\[ЯДРО\]|\[ПРОЦЕСС\]|topology|fingerprint/i.test(result.text));

    globalThis.AKSI_WEBLLM = undefined;
    result = await router.answer("Что такое флуксометр?");
    assert.equal(result.route, "honest-abstention");
    assert.match(result.text, /не могу надёжно ответить/i);

    console.log("AKSI answer integration tests: OK (weather success/failure, model failure, honest abstention)");
  } finally {
    for (const key of Object.keys(previous)) {
      if (previous[key] === undefined) delete globalThis[key];
      else globalThis[key] = previous[key];
    }
    if (previousFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = previousFetch;
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
