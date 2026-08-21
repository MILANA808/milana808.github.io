# АКСИ — с чего начать

**Сайт:** https://milana808.github.io  
**Контакт:** aksilove@internet.ru

## Главное

| Страница | Зачем |
|----------|--------|
| [Главная](https://milana808.github.io/) | Все базовые функции на одной странице |
| [Чат](https://milana808.github.io/chat/) | Суверенный чат: память, TTP, Ed25519, LLM |
| [Proof](https://milana808.github.io/proof/) | Подписать текст и проверить подпись |
| [Аттестат](https://milana808.github.io/ATTESTATION.md) | Публичное доказательство работы с Grok (xAI) |

## Offline

Откройте сайт — чат отвечает **без сервера**.

Команды: `кто ты` · `запомни: …` · `запутанность` · `аттестат` · формулы `2+2`

## Локальная LLM (по желанию)

```bash
ollama pull qwen2.5:3b && ollama serve
cd backend && chmod +x start.sh && ./start.sh
```

В чате → Настройки → `http://127.0.0.1:8000` → ☑ LLM  
Подробнее: [BACKEND.md](BACKEND.md)

## Честно

- Не AGI. Local-first продукт.
- Подпись: Ed25519 в браузере (aksi-core) или SHA-256.
- SHA-256 аттестата: `f406a60960b203759f786ef055f6875a363f62cd72c345313f926309b3e74b44`
