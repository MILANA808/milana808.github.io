# АКСИ UNIFIED — аудит и сборка

Дата: 2026-08-26  
Контакт: aksilove@internet.ru

## Репозитории

| Repo | Роль |
|------|------|
| milana808.github.io | Публичный UI / Pages |
| Milana-backend | API, agent, globe, Ollama bridge |
| aksi_apps | Скелеты приложений |
| AKSI-GROK-HYBRID* | Эксперименты Resonance/Globe |
| milana_site | Старый портал |

## Что сломано / не прошло

1. **Stub-модули (33 байта)** — маркетинг-заглушки:
   `aksi-control-plane`, `counterfactual`, `enhancements`, `evidence`, `explain`, `frontier`, `orchestrator`, `passport`, `precedent`, `proof-graph`, `sovereign`, `wow`
2. **Пустые маршруты (~197 B)** — universe, pulse, showcase, dreams, earn…
3. **Разрозненные entry points** — index, aksi/, app/, lab/, wake/, matrix/, chat/
4. **Чат «ищет — нет ответа»** — модули не склеены, таймауты
5. **CDN/кэш** — без Ctrl+F5 виден старый HTML

## Единый слой

**`aksi-one.js`** — единый runtime:

- память · proof ledger · EQS · Bell sim
- local answers · Core.query · Ollama optional
- UI: send, chips, teach, metrics, proof, LLM

Пайплайн: **команда → local → memory → Core → Ollama → fallback** (всегда текст).

## Как пользоваться

1. https://milana808.github.io/ → **Ctrl+F5**
2. Баннер «Единый АКСИ ONE»
3. Чат: привет / что такое … / запомни: …
4. MATRIX: /aksi-matrix/

Self / Neuro / DKV / Vision — опциональные вкладки, не блокируют чат.
