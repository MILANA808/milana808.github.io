# АКСИ (AKSI) — offline-first AI system

**Полноценный локальный ИИ в браузере.**  
Многослойный стек на открытом коде 2026: Neuro (CPU) + WebLLM (WebGPU) + Tesseract OCR + proof ledger + явное согласие на сеть.

**Live:** https://milana808.github.io  
**Contact:** aksilove@internet.ru · X [@AKSILOVE](https://x.com/AKSILOVE)

---

## Что это

Единый продукт (наследие АКСИ MATRIX) — один понятный интерфейс:

| Вкладка | Назначение |
|---------|------------|
| **Home** | Proof offline, статус движков, teach, PRECEDENT |
| **Чат** | Единый диалог через Mind |
| **Память** | Локальные факты (`запомни: …`) |
| **Фото** | OCR (Tesseract.js) + vision path |
| **Lab** | Neuro · **WebLLM** · Ollama · Mind · Quantum · Trust · DKV |

**По умолчанию offline.** Интернет — только после галочки **Сеть**.

---

## Архитектура интеллекта (идеальный стек)

```text
Вопрос
  → Intent + Quantum (meta)
  → Brain          (локальная KB)
  → WebLLM?        (сильная модель, WebGPU, по клику пользователя)
  → Neuro          (всегда · pure JS RWKV · CPU · учится)
  → Web?           (только если Сеть ON)
  → Core / Ollama  (опционально)
  → Trust / Ledger (подпись + цепочка)
```

### Слои локального ИИ

| Слой | Технология | Когда работает | Размер |
|------|------------|----------------|--------|
| **Neuro** | Собственный RWKV-style pure JS | Всегда, любой браузер | 0 MB download |
| **WebLLM** | [mlc-ai/web-llm](https://github.com/mlc-ai/web-llm) (MLC) | После явной загрузки модели | 0.4–2.5 GB один раз |
| **Ollama** | Локальный сервер на ПК | Если запущен | — |
| **OCR** | Tesseract.js (WASM) | Фото / камера | ~кэш traineddata |

Модели WebLLM (открытые, квантованные): Phi-3.5 Mini, Qwen2.5 0.5B/1.5B, Llama-3.2 1B, Gemma 2 2B.

---

## Принципы

1. **Local first** — диалог и память без сервера.
2. **Consent for network** — поиск только после галочки.
3. **Provable policy** — `PRECEDENT.json` + export proof session.
4. **Ключи не покидают устройство**.
5. **Честный scope** — не AGI и не замена frontier-облаку; суверенный companion layer.
6. **Открытый код** — WebLLM (MLC), Tesseract, собственный Neuro/Mind/Trust.

---

## Быстрый старт

1. Открой https://milana808.github.io и **Ctrl+F5**.
2. Чат: `Кто ты?`, `Работает ли без интернета?`
3. `запомни: мой факт` → вкладка Память.
4. Lab → **WebLLM** → выбери модель → **Загрузить** (один раз, нужен Chrome/Edge с WebGPU).
5. Home → **Докажи offline**.
6. Опционально сильнее:

```bash
ollama run llama3.2
```

Lab → Ollama.

---

## Файлы рантайма

| Файл | Роль |
|------|------|
| `index.html` | Продуктовый shell |
| `aksi-neuro.js` | Offline CPU LLM (RWKV-style) |
| `aksi-webllm.js` | Обёртка MLC WebLLM (WebGPU) |
| `aksi-mind.js` | Единый роутер |
| `aksi-one.js` | Chat runtime |
| `aksi-brain.js` | Локальная KB |
| `aksi-llm.js` | Ollama / BYOK providers |
| `aksi-vision.js` / `aksi-photo.js` | OCR + vision |
| `aksi-trust.js` / `aksi-seal.js` | Целостность |
| `aksi-dkv.js` | Document Knowledge Verifier |
| `PRECEDENT.json` | Политика offline-first |

---

## Проверка offline-политики

1. Сеть **выкл**.
2. Home → **Докажи offline**.
3. Открой [`PRECEDENT.json`](https://milana808.github.io/PRECEDENT.json).
4. Export proof с Home.

---

## Лицензия и контакт

Proprietary runtime · открытые зависимости (MLC WebLLM, Tesseract) используются по их лицензиям.  
**aksilove@internet.ru** · [@AKSILOVE](https://x.com/AKSILOVE)

Репозиторий: [MILANA808/milana808.github.io](https://github.com/MILANA808/milana808.github.io)
