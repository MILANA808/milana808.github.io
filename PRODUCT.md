# AKSI — продукт, не демо

## Аудит (честно)

### Реально работает
- Главная (index.html + index-app.js): чат, Википедия, заметки IndexedDB, квант-демо 2 кубита, счёт, голос, DID-строка
- aksi-brain.js v7: Wikipedia opensearch, погода wttr, курсы CoinGecko, локальные эвристики, SHA-подпись
- Много модулей в корне (memory, quantum, proof…) — разрозненно, не единый продукт
- Backend (Milana-backend): FastAPI/агент/globe — существует, не обязан для главной

### Маркетинг / долг
- «Ed25519 DID» часто = SHA-256 от строки, не настоящий keypair
- AGI, self-mod, P2P mesh, NFT — не production
- Десятки MD с обещаниями без единого start path

### Вывод
Есть рабочий offline/online клиентский мозг. Нет одного продукта «открыл → пользуешься каждый день» с чистой границей local / optional backend.

## Целевая архитектура

```
UI (app/ или index)
  → AksiCore (intent, memory, KB, wiki, optional LLM)
  → Identity (подпись + ledger)
  → IndexedDB
Optional: FastAPI → Ollama | xAI | OpenAI-compatible
```

## Фазы
1. **Ядро** — AksiCore + chat UI + TTP + память (сделано: aksi-core.js, app/)
2. **Суверенитет** — настоящий Ed25519 (Web Crypto), export/import, offline toggle
3. **Backend** — docker-compose + OpenAI-compatible proxy
4. **Продукт** — PWA, README, убрать мёртвые модули с главной

## Запуск
- Браузер: https://milana808.github.io/app/
- С LLM: Ollama + backend/main.py, в UI указать http://127.0.0.1:8000

Контакт: aksilove@internet.ru
