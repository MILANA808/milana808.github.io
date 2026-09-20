/**
 * AKSI MATRIX — offline FAQ / keyword answers
 * Always works without WebGPU. Used before/alongside HRR + WebLLM.
 */

const FAQ = [
  {
    keys: ['кто ты', 'что ты', 'what are you', 'who are you', 'представься'],
    a: 'Я AKSI MATRIX — суверенный offline runtime в браузере. Память HRR, quantum gate, TrustVault. Отвечаю локально; опционально WebLLM на твоём GPU.'
  },
  {
    keys: ['aksi', 'акси', 'что такое aksi', 'что такое акси'],
    a: 'АКСИ (AKSI) — суверенный агентный runtime: offline-first, память в IndexedDB (HRR), integrity gate, AES-GCM vault, опциональный on-device LLM. Сайт: milana808.github.io. Контакт: aksilove@internet.ru'
  },
  {
    keys: ['как пользоваться', 'help', 'помощь', 'команды', 'что умеешь'],
    a: 'Команды:\n• вопрос — ответ из памяти / FAQ / WebLLM\n• запомни: факт — сохранить в локальную память\n• Загрузить ИИ (Load) — on-device WebLLM (нужен Chrome/Edge + WebGPU)\n• Export .aksi — зашифрованная капсула памяти\nРаботает offline без сервера.'
  },
  {
    keys: ['webgpu', 'llm', 'загрузить', 'модель', 'не грузится', 'не работает'],
    a: 'WebLLM нужен Chrome или Edge с WebGPU и GPU. Если «adapter null» — обнови драйвер GPU, закрой другие вкладки, проверь chrome://gpu. Без WebGPU чат всё равно отвечает из локальной памяти и FAQ.'
  },
  {
    keys: ['bonsai', 'бонсай', '27b', 'ternary'],
    a: 'Bonsai 2 27B (PrismML ternary) — отдельный WebGPU runtime (~5.9 GB). В MATRIX: Prepare Bonsai монтирует официальный Space на странице. Полный auto-ответ в чате даёт WebLLM (до ~3B), не 27B.'
  },
  {
    keys: ['память', 'memory', 'запомни', 'hrr'],
    a: 'Память — Exocortex HRR: тексты + голографические векторы в IndexedDB. «запомни: …» пишет факт. Recall по cosine + lexical overlap. Экспорт/импорт через .aksi (AES-GCM).'
  },
  {
    keys: ['контакт', 'почта', 'email', 'связаться'],
    a: 'Публичный контакт: aksilove@internet.ru · X @AKSILOVE'
  },
  {
    keys: ['привет', 'hello', 'здравствуй', 'хай'],
    a: 'Привет. Я MATRIX на твоём устройстве. Спроси про AKSI, память, WebLLM — или напиши «запомни: …».'
  },
  {
    keys: ['offline', 'офлайн', 'без сервера', 'сервер'],
    a: 'Да: ядро offline. IndexedDB + Web Crypto + опциональный WebLLM. Сервер не обязателен. Данные не уходят, пока ты сам не экспортируешь капсулу.'
  },
  {
    keys: ['формула', 'eqs', 'adia', 'gate'],
    a: 'Маршрут ответа: QuantumRouter (state-vector → H/Phase → answerGate). Веса Local_RAG / Deep_LLM / Safe_Gate. HRR recall + FAQ + WebLLM если загружен.'
  }
];

export function localFaqAnswer(query) {
  const q = String(query || '').toLowerCase().trim();
  if (!q) return null;
  let best = null;
  let bestScore = 0;
  for (let i = 0; i < FAQ.length; i++) {
    const item = FAQ[i];
    let score = 0;
    for (let k = 0; k < item.keys.length; k++) {
      if (q.indexOf(item.keys[k]) !== -1) score += 2 + item.keys[k].length / 20;
    }
    if (score > bestScore) {
      bestScore = score;
      best = item.a;
    }
  }
  return bestScore >= 2 ? best : null;
}

export default { localFaqAnswer, FAQ };
