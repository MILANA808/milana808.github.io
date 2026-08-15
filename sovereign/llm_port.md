# LLM Port — контракт для суверенного контура АКСИ

Цель: ядро агента не знает конкретного вендора. Ollama, GigaChat, YandexGPT, T-Pro подключаются драйверами.

## Interface

```text
complete(request) -> stream tokens | final text

request:
  messages: [{role, content}]
  temperature?: number
  max_tokens?: number
  stream?: boolean

response meta:
  model_id: string
  vendor: ollama | gigachat | yandex | tpro | other
  latency_ms: number
```

## Drivers (план)

| Driver | Где | Статус |
|--------|-----|--------|
| ollama | Milana-backend / локально | задел |
| webllm | Pages /matrix | demo |
| gigachat | только доверенный backend | не реализовано |
| yandexgpt | только доверенный backend | не реализовано |
| tpro | только доверенный backend | не реализовано |

## Правила

1. Секреты и ГОСТ-TLS — только вне публичного репозитория.
2. Pages не хранит ключи вендоров.
3. Аудит: каждый ответ может нести model_id + подпись журнала мыслей.
