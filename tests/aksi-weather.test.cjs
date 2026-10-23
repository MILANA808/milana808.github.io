const assert = require("node:assert/strict");
const weather = require("../aksi-weather.js");

assert.deepEqual(weather.detect("Команда - узнай погоду в Анапе"), { handled: true, city: "Анапе" });
assert.deepEqual(weather.detect("Акси, какая погода в Москве сегодня?"), { handled: true, city: "Москве" });
assert.equal(weather.detect("Команда - посчитай 2+2"), null);
assert.equal(weather.detect("узнай погоду").error, "city_missing");

(async () => {
  const calls = [];
  const fakeFetch = async url => {
    calls.push(String(url));
    if (String(url).includes("geocoding-api")) return {
      ok: true, json: async () => ({ results: [{ name: "Анапа", admin1: "Краснодарский край", country: "Россия", country_code: "RU", latitude: 44.89, longitude: 37.32 }] })
    };
    return {
      ok: true, json: async () => ({
        timezone: "Europe/Moscow",
        current: { time: "2026-10-23T21:00", temperature_2m: 14, apparent_temperature: 13, relative_humidity_2m: 70, precipitation: 0, weather_code: 2, wind_speed_10m: 8 },
        daily: { temperature_2m_min: [11], temperature_2m_max: [18], precipitation_probability_max: [20] }
      })
    };
  };
  const answer = await weather.answer("Команда - узнай погоду в Анапе", fakeFetch);
  assert.equal(answer.handled, true);
  assert.match(answer.text, /Погода в Анапа/);
  assert.match(answer.text, /14 °C/);
  assert.match(answer.text, /Open-Meteo/);
  assert.equal(calls.length, 2);
  const fail = await weather.answer("узнай погоду в Анапе", async () => ({ ok: false, status: 503 }));
  assert.match(fail.text, /не удалось получить актуальную погоду/i);
  assert.match(fail.text, /не буду подставлять выдуманные значения/i);
  console.log("AKSI weather command tests passed");
})().catch(err => { console.error(err); process.exitCode = 1; });
