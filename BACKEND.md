# АКСИ Backend — локальная LLM

## За 2 минуты

```bash
# 1. Ollama (один раз)
# macOS/Linux: https://ollama.com
ollama pull qwen2.5:3b
ollama serve

# 2. Backend
cd backend
chmod +x start.sh
./start.sh
```

Откройте https://milana808.github.io/chat/ → **Настройки**:

- Backend URL: `http://127.0.0.1:8000`
- ☑ Использовать LLM
- Сохранить

Или нажмите **Проверить backend** — авто-подключение.

## Docker

```bash
docker compose up
```

## API

| Метод | Путь | Назначение |
|-------|------|------------|
| GET | `/health` | статус + ollama |
| GET | `/api/identity` | DID |
| POST | `/v1/chat/completions` | OpenAI-compatible (фронт) |
| POST | `/api/chat` | простой JSON |

## Провайдеры (env)

```bash
export AKSI_LLM_PROVIDER=auto   # auto | ollama | openai | xai
export OLLAMA_MODEL=qwen2.5:3b
export XAI_API_KEY=...          # опционально
export OPENAI_API_KEY=...       # опционально
```

Без Ollama и ключей backend отвечает из offline-KB — сайт не ломается.

Контакт: aksilove@internet.ru
