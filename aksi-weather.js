/* AKSI weather command: live observations from Open-Meteo, no API key. */
(function (root) {
  "use strict";
  function cleanCommand(input) {
    return String(input || "")
      .replace(/^\s*(?:команда\s*[-—:]\s*|акси[,!]?\s*)/i, "")
      .replace(/^\s*(?:пожалуйста[,!]?\s*)/i, "")
      .trim();
  }
  function detect(input) {
    const text = cleanCommand(input);
    if (!/(?:погод|температур|прогноз|осадк|ветер|weather|forecast)/i.test(text)) return null;
    const m = text.match(/(?:^|\s)(?:в|во|для|in|for)\s+([а-яёa-z][а-яёa-z\s.-]{1,60}?)(?=\s+(?:сейчас|сегодня|завтра|на\s|пожалуйста)|[?!.,;:]|$)/i);
    if (!m) return { handled: true, city: null, error: "city_missing" };
    const city = m[1].trim().replace(/\s+/g, " ").replace(/[.]+$/, "");
    return city ? { handled: true, city } : { handled: true, city: null, error: "city_missing" };
  }
  function describeCode(code) {
    const map = {
      0:"ясно",1:"преимущественно ясно",2:"переменная облачность",3:"пасмурно",
      45:"туман",48:"туман с изморозью",51:"слабая морось",53:"умеренная морось",55:"сильная морось",
      56:"слабая ледяная морось",57:"сильная ледяная морось",61:"слабый дождь",63:"умеренный дождь",65:"сильный дождь",
      66:"слабый ледяной дождь",67:"сильный ледяной дождь",71:"слабый снег",73:"умеренный снег",75:"сильный снег",
      77:"снежные зёрна",80:"слабые ливни",81:"умеренные ливни",82:"сильные ливни",
      85:"слабые снежные заряды",86:"сильные снежные заряды",95:"гроза",96:"гроза с небольшим градом",99:"гроза с сильным градом"
    };
    return map[Number(code)] || "условия не определены";
  }
  async function getWeather(city, fetchImpl) {
    const fetcher = fetchImpl || root.fetch;
    if (typeof fetcher !== "function") throw new Error("fetch_unavailable");
    const variants = [city];
    // Commands naturally use the prepositional case ("в Анапе", "в Москве").
    if (/е$/i.test(city)) variants.push(city.slice(0, -1) + "а", city.slice(0, -1) + "я");
    if (/и$/i.test(city)) variants.push(city.slice(0, -1) + "я");
    let places = [];
    for (const candidate of Array.from(new Set(variants))) {
      const geoUrl = "https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(candidate) + "&count=10&language=ru&format=json";
      const geoResponse = await fetcher(geoUrl);
      if (!geoResponse.ok) throw new Error("geocoding_http_" + geoResponse.status);
      const geo = await geoResponse.json();
      places = Array.isArray(geo.results) ? geo.results : [];
      if (places.length) break;
    }
    const isRussia = p => String(p.country_code || "").toUpperCase() === "RU" || /russia|россия/i.test(String(p.country || ""));
    const place = places.find(p => String(p.name || "").toLocaleLowerCase("ru") === city.toLocaleLowerCase("ru") && isRussia(p))
      || places.find(isRussia)
      || places[0];
    if (!place || !Number.isFinite(Number(place.latitude)) || !Number.isFinite(Number(place.longitude))) {
      throw new Error("city_not_found");
    }
    const params = new URLSearchParams({
      latitude: String(place.latitude), longitude: String(place.longitude), timezone: "auto",
      current: "temperature_2m,apparent_temperature,relative_humidity_2m,is_day,precipitation,weather_code,wind_speed_10m",
      daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
      forecast_days: "1"
    });
    const response = await fetcher("https://api.open-meteo.com/v1/forecast?" + params.toString());
    if (!response.ok) throw new Error("forecast_http_" + response.status);
    const data = await response.json();
    if (!data.current || !data.daily) throw new Error("weather_data_missing");
    return {
      city: place.name || city,
      region: place.admin1 || "",
      country: place.country || "",
      timezone: data.timezone || place.timezone || "",
      time: data.current.time || "",
      temperature: data.current.temperature_2m,
      feelsLike: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      precipitation: data.current.precipitation,
      wind: data.current.wind_speed_10m,
      condition: describeCode(data.current.weather_code),
      min: data.daily.temperature_2m_min && data.daily.temperature_2m_min[0],
      max: data.daily.temperature_2m_max && data.daily.temperature_2m_max[0],
      rainChance: data.daily.precipitation_probability_max && data.daily.precipitation_probability_max[0],
      source: "Open-Meteo"
    };
  }
  function format(result) {
    const lines = ["Погода в " + result.city + (result.region ? " (" + result.region + ")" : "") + (result.time ? " на " + result.time.replace("T", " ") : "") + ":"];
    lines.push("• Сейчас: " + result.temperature + " °C, " + result.condition + ".");
    if (result.feelsLike != null) lines.push("• Ощущается как: " + result.feelsLike + " °C.");
    if (result.min != null && result.max != null) lines.push("• Сегодня: от " + result.min + " до " + result.max + " °C.");
    if (result.wind != null) lines.push("• Ветер: " + result.wind + " км/ч.");
    if (result.humidity != null) lines.push("• Влажность: " + result.humidity + "%.");
    if (result.rainChance != null) lines.push("• Вероятность осадков сегодня: " + result.rainChance + "%.");
    lines.push("Источник: " + result.source + " (данные получены онлайн).");
    return lines.join("\n");
  }
  async function answer(input, fetchImpl) {
    const intent = detect(input);
    if (!intent) return { handled: false };
    if (!intent.city) return { handled: true, text: "Уточни город: например, «Команда — узнай погоду в Анапе»." };
    try {
      const result = await getWeather(intent.city, fetchImpl);
      return { handled: true, text: format(result), data: result, source: "open-meteo" };
    } catch (error) {
      const reason = String(error && error.message || error);
      const userMessage = reason === "city_not_found"
        ? "Не нашла город «" + intent.city + "» в геокодере. Проверь написание или укажи регион."
        : "Не удалось получить актуальную погоду для «" + intent.city + "»: " + (reason.indexOf("http_") >= 0 ? "сервис погоды вернул ошибку." : "сервис недоступен или браузер заблокировал запрос.");
      return { handled: true, text: userMessage + " Я не буду подставлять выдуманные значения.", error: reason };
    }
  }
  root.AKSIWeather = { detect, getWeather, format, answer, describeCode };
  if (typeof module === "object" && module.exports) module.exports = root.AKSIWeather;
})(typeof window !== "undefined" ? window : globalThis);
