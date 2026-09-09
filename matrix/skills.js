// AKSI MATRIX skills — local utilities

function calcExpression(input) {
  const s = String(input || "").trim();
  if (!s || s.length > 256) return null;
  let i = 0;

  function skip() { while (/\s/.test(s[i] || "")) i++; }
  function number() {
    skip();
    const start = i;
    let dots = 0;
    while (i < s.length && /[0-9.]/.test(s[i])) {
      if (s[i] === ".") dots++;
      if (dots > 1) return null;
      i++;
    }
    if (start === i) return null;
    const n = Number(s.slice(start, i));
    return Number.isFinite(n) ? n : null;
  }
  function factor() {
    skip();
    if (s[i] === "+" || s[i] === "-") {
      const sign = s[i++] === "-" ? -1 : 1;
      const v = factor();
      return v == null ? null : sign * v;
    }
    if (s[i] === "(") {
      i++;
      const v = expr();
      skip();
      if (s[i] !== ")") return null;
      i++;
      return v;
    }
    return number();
  }
  function term() {
    let v = factor();
    if (v == null) return null;
    while (true) {
      skip();
      const op = s[i];
      if (op !== "*" && op !== "/" && op !== "%") break;
      i++;
      const rhs = factor();
      if (rhs == null) return null;
      if ((op === "/" || op === "%") && rhs === 0) return null;
      v = op === "*" ? v * rhs : op === "/" ? v / rhs : v % rhs;
      if (!Number.isFinite(v)) return null;
    }
    return v;
  }
  function expr() {
    let v = term();
    if (v == null) return null;
    while (true) {
      skip();
      const op = s[i];
      if (op !== "+" && op !== "-") break;
      i++;
      const rhs = term();
      if (rhs == null) return null;
      v = op === "+" ? v + rhs : v - rhs;
      if (!Number.isFinite(v)) return null;
    }
    return v;
  }

  const value = expr();
  skip();
  return i === s.length && value != null && Number.isFinite(value) ? value : null;
}

export async function runSkill(skill, sha256hex) {
  if (skill.name === "hash") {
    const h = await sha256hex(skill.arg || "");
    return "SHA-256: " + h;
  }
  if (skill.name === "uuid") {
    let id;
    if (crypto.randomUUID) id = crypto.randomUUID();
    else {
      const a = crypto.getRandomValues(new Uint8Array(16));
      a[6] = (a[6] & 0x0f) | 0x40;
      a[8] = (a[8] & 0x3f) | 0x80;
      const h = [...a].map(x => x.toString(16).padStart(2, "0")).join("");
      id = h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
    }
    return "UUID v4: " + id;
  }
  if (skill.name === "now") {
    const d = new Date();
    return "Время: " + d.toISOString() + " · local " + d.toLocaleString();
  }
  if (skill.name === "calc") {
    const v = calcExpression(skill.arg || "");
    return v == null ? "Не удалось вычислить выражение безопасно." : "Результат: " + v;
  }
  return null;
}

export function detectSkill(userText) {
  const low = String(userText || "").toLowerCase().trim();
  const hashM = low.match(/(?:hash|хеш|sha256)\s+(.+)/i) || low.match(/^sha256[:\s]+(.+)/i);
  if (hashM) return { name: "hash", arg: hashM[1].trim() };
  if (/(uuid|guid|сгенерируй id|новый id)/i.test(low)) return { name: "uuid" };
  if (/(который час|сколько времени|текущее время|timestamp|дата сейчас)/i.test(low)) return { name: "now" };
  const calcM = low.match(/(?:посчитай|вычисли|calc)\s+(.+)/i) || low.match(/^[\d\s+\-*/().%]+$/);
  if (calcM) return { name: "calc", arg: (calcM[1] || low).trim() };
  return null;
}
