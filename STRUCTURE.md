# AKSI — единая структура (канон)

**Репозиторий:** MILANA808/milana808.github.io  
**Единственная рабочая ветка:** `main`  
**Live:** https://milana808.github.io  
**Контакт:** aksilove@internet.ru

Все экспериментальные ветки (`aksi-*`, `codex-*`, `fix/*`, `refactor/*`) закрыты по PR и **не используются**. Продукт живёт только на `main`.

## Карта продукта (не раздувать)

| Слой | Файлы | Роль |
|------|--------|------|
| Shell | `index.html` | Home · Chat · Memory · Photo · Lab |
| ADIA 2.0 | `aksi-algorithm.js`, `ALGORITHM.md`, `algorithm.html` | Решение · EQS · seal · ledger |
| Mind | `aksi-mind.js` | Brain → WebLLM? → Neuro → ADIA → Web? |
| Offline LLM | `aksi-neuro.js` | CPU · pure JS · offline always |
| GPU optional | `aksi-webllm.js` | MLC WebGPU по согласию |
| Core | `aksi-brain.js`, `aksi-core.js`, `aksi-one.js` | KB · wire · chat |
| Trust | `aksi-trust.js`, `aksi-seal.js`, `PRECEDENT.json` | Политика · proof |
| Vision | `aksi-photo.js`, `aksi-vision.js` | OCR |
| Net opt-in | `aksi-web.js` | Только после **Сеть** |
| Docs | `README.md`, `PRODUCT.md`, `PLATFORM.md` | Без цен на публичных страницах |

## Второстепенное (legacy, не удалять сразу)

- `aksi-matrix/`, `matrix/`, `aksii-matrix/` — лабораторные оболочки
- `backend/`, `server/` — optional локальный API / Ollama bridge
- `sdk/` — протокол verifier
- `docs/` — тезисы

Канонический вход пользователя: **`/`** (`index.html`).

## Правила объединения

1. Новый код — в модули таблицы выше или Lab-вкладки, **не** новая корневая SPA.
2. Не создавать параллельные `index-vN.html` как продукт.
3. ADIA `evaluate` остаётся на каждом ответе Mind.
4. Offline по умолчанию.
5. Публичный контакт только aksilove@internet.ru.

## Ветки (удалить вручную в GitHub)

После закрытия PR остаются только refs — удалите на  
https://github.com/MILANA808/milana808.github.io/branches :

- aksi/visual-upgrade-2026-08
- aksi-everything-core
- aksi-integrity-hardening
- aksi-product-ready-2026-08
- aksi-sovereign-core
- aksi-unification-v1
- codex/-milana808.github.io
- codex-cwh18w
- fix/p2p-stable-calls
- refactor/aksi-platform-audit-2026-08

Оставить: **main**.

## Поглощённый смысл веток

| Бывшая ветка | Что уже на main |
|--------------|-----------------|
| aksi-product-ready | product shell, neuro, proof, PRECEDENT |
| aksi-everything-core | identity docs, backend trust hooks |
| aksi-sovereign-core / integrity | seal, attestation, LEGAL-RU |
| visual-upgrade | console/lab UI patterns в Lab |
| unification / codex | polish absorbed or superseded by ADIA product |

Дата канона: 2026-08-30.
