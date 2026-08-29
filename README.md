# АКСИ (AKSI) — offline-first AI companion

**EN** · Local-first browser AI with a measurable decision layer (**ADIA 2.0**).  
**RU** · Локальный ИИ в браузере с измеримым слоем решений (**ADIA 2.0**).

| | |
|--|--|
| **Live** | https://milana808.github.io |
| **Contact** | aksilove@internet.ru · X [@AKSILOVE](https://x.com/AKSILOVE) |
| **License** | [Proprietary](./LICENSE) — not open source |
| **Algorithm** | [ALGORITHM.md](./ALGORITHM.md) · ADIA 2.0 |
| **Structure** | [STRUCTURE.md](./STRUCTURE.md) |

---

## English

### What it is

AKSI is a **sovereign offline-first AI companion** in the browser — not a thin ChatGPT wrapper.

- **ADIA 2.0** — Resonance Decision Engine (EQS, memory resonance, candidate rank, integrity seal)
- **Neuro** — pure-JS RWKV-style offline LLM (CPU, zero download)
- **WebLLM** — optional MLC WebGPU model (user loads once, then offline)
- **Mind** — router: Brain → WebLLM? → Neuro → **ADIA** → Web? → Ollama
- **Memory / Teach** — local facts (`remember: …` / `запомни: …`)
- **Proof / PRECEDENT** — offline policy attestation
- **Photo OCR** — Tesseract.js
- **Trust · Quantum · DKV** — lab modules

**Network is off by default.** Internet only after the **Сеть / Network** consent toggle.

### Product UI

| Tab | Role |
|-----|------|
| **Home** | Offline proof, status, teach, PRECEDENT |
| **Chat** | Single dialogue via Mind + ADIA seal |
| **Memory** | Local facts |
| **Photo** | OCR |
| **Lab** | ADIA · Neuro · WebLLM · Ollama · Mind · Quantum · Trust · DKV |

### Architecture

```text
Intent → Quantum meta → Brain
  → WebLLM (if loaded)
  → Neuro RWKV (always offline)
  → ADIA 2.0 (EQS · rank · seal)
  → Web (only with consent)
  → Ollama / Core
```

### Quick start

1. Open https://milana808.github.io
2. Hard refresh (Ctrl+F5)
3. Chat: “Who are you?”, “Does it work offline?”
4. Home → **Докажи offline**
5. Lab → ADIA / Neuro / WebLLM

### Principles

1. Offline-first
2. Explicit network consent
3. Measurable answers (EQS, ledger)
4. One product surface (`/`) — no parallel SPA forks
5. No prices on public pages
6. Proprietary license (evaluation ≠ production rights)

### Search / discovery keywords

AKSI, АКСИ, offline AI, local LLM browser, RWKV browser, WebLLM, ADIA, EQS, decision integrity, sovereign AI, privacy-first assistant, milana808, aksilove

---

## Русский

### Что это

АКСИ — **суверенный offline-first цифровой напарник** в браузере, а не обёртка над чужим чатом.

- **ADIA 2.0** — Resonance Decision Engine (EQS, резонанс памяти, rank, seal)
- **Neuro** — чистый JS RWKV offline (CPU, без загрузки модели)
- **WebLLM** — опциональная MLC WebGPU-модель (скачать один раз)
- **Mind** — маршрутизатор: Brain → WebLLM? → Neuro → **ADIA** → Web? → Ollama
- **Память** — локальные факты (`запомни: …`)
- **Proof / PRECEDENT** — проверяемая offline-политика
- **Фото OCR** — Tesseract.js
- **Trust · Quantum · DKV** — лабораторные модули

**Сеть выключена по умолчанию.** Интернет — только после галочки **Сеть**.

### Интерфейс

| Вкладка | Назначение |
|---------|------------|
| **Home** | Proof offline, статус, teach, PRECEDENT |
| **Чат** | Единый диалог через Mind + ADIA |
| **Память** | Локальные факты |
| **Фото** | OCR |
| **Lab** | ADIA · Neuro · WebLLM · Ollama · Mind · Quantum · Trust · DKV |

### Быстрый старт

1. https://milana808.github.io
2. Ctrl+F5
3. Чат: «Кто ты?», «Работает ли без интернета?»
4. Home → **Докажи offline**
5. Lab → ADIA / Neuro / WebLLM

### Принципы

1. Offline-first
2. Явное согласие на сеть
3. Измеримость (EQS, ledger)
4. Один продукт (`/`)
5. Без цен на публичных страницах
6. Проприетарная лицензия

### Ключевые слова для поиска

АКСИ, AKSI, локальный ИИ, offline ИИ, RWKV браузер, WebLLM, ADIA, EQS, суверенный агент, приватный ассистент, milana808, aksilove@internet.ru

---

## Key files / Ключевые файлы

| File | Role |
|------|------|
| `index.html` | Product shell |
| `aksi-algorithm.js` | ADIA 2.0 |
| `aksi-mind.js` | Router |
| `aksi-neuro.js` | Offline RWKV |
| `aksi-webllm.js` | Optional WebGPU |
| `PRECEDENT.json` | Policy claim |
| `ALGORITHM.md` | ADIA specification |
| `LICENSE` | Proprietary terms |
| `robots.txt` / `sitemap.xml` | Indexing |

## License / Лицензия

**Proprietary.** See [LICENSE](./LICENSE) and [PROPRIETARY.md](./PROPRIETARY.md).  
Same policy family as **Milana-backend**: all rights reserved; commercial use requires written permission.

© AKSI · aksilove@internet.ru
