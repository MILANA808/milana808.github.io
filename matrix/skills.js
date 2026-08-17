// AKSI MATRIX skills — local utilities
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
    const safe = (skill.arg || "").replace(/[^0-9+\-*/().%\s]/g, "");
    try {
      const v = Function('"use strict"; return (' + safe + ")")();
      if (typeof v === "number" && Number.isFinite(v)) return "Результат: " + v;
    } catch {}
    return "Не удалось вычислить выражение безопасно.";
  }
  return null;
}

export function detectSkill(userText) {
  const low = userText.toLowerCase().trim();
  const hashM = low.match(/(?:hash|хеш|sha256)\s+(.+)/i) || low.match(/^sha256[:\s]+(.+)/i);
  if (hashM) return { name: "hash", arg: hashM[1].trim() };
  if (/(uuid|guid|сгенерируй id|новый id)/i.test(low)) return { name: "uuid" };
  if (/(который час|сколько времени|текущее время|timestamp|дата сейчас)/i.test(low)) return { name: "now" };
  const calcM = low.match(/(?:посчитай|вычисли|calc)\s+(.+)/i) || low.match(/^[\d\s+\-*/().%]+$/);
  if (calcM) return { name: "calc", arg: (calcM[1] || low).trim() };
  return null;
}
