# AKSI — 21 приложений + интернет для ИИ

## 21 приложений (из backend)

| # | Имя | Описание | Категория |
|---|-----|----------|----------|
| 1 | MoodMirror | AI mood analysis | Health |
| 2 | MindMirror | Cognitive journaling | Health |
| 3 | MindLink | Connect ideas | Utility |
| 4 | HealthScan | Health metrics | Health |
| 5 | Mentor | AI mentor | Education |
| 6 | Family | Family organizer | Social |
| 7 | Aura | Energy tracker | Lifestyle |
| 8 | AksiLove | Compatibility | Social |
| 9 | MoodRadio | Mood playlists | Entertainment |
| 10 | AksiShopping | Smart shopping | Utility |
| 11 | AIStylist | Style advice | Lifestyle |
| 12 | EcoGaze | Eco metrics | Utility |
| 13 | DreamJournal | Dream diary | Health |
| 14 | AksiCompanion | AI friend | Social |
| 15 | DressUpAR | Virtual try-on | Lifestyle |
| 16 | GlobalID | Decentralized ID | Utility |
| 17 | AksiChat | Secure chat | Social |
| 18 | LifeScan | Life balance | Health |
| 19 | TimeCapsule | Future messages | Utility |
| 20 | TeleHelp | Emergency | Health |
| 21 | StoryAI | AI storytelling | Entertainment |

Плюс на сайте: QuantumLab, Globe5D, VoiceAKSI, Resonance.

## Как дать ИИ доступ в интернет

Статический сайт (GitHub Pages) **сам** в интернет для поиска не ходит (CORS + нет секретов).

Интернет даёт **backend** на твоём сервере:

1. Запусти backend (`./start.sh` или uvicorn на VPS)
2. Получи ключ [Tavily](https://tavily.com) или [Serper](https://serper.dev)
3. В `.env` backend:
```
AKSI_TAVILY_API_KEY=tvly-...
# или
AKSI_SERPER_API_KEY=...
```
4. В `Milana-backend` доступны:
   - `POST /aksi/v2/tools/search` — web search
   - `POST /api/aksi/chat` — чат с LLM (Ollama)

5. На сайте укажи API:
```js
localStorage.setItem('AKSI_API', 'https://твой-сервер.com')
```

Без ключей и backend чат работает offline (knowledge + poetic), quantum — в браузере.
