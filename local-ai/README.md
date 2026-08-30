# АКСИ Local AI

## Цель

Полноценный local-first слой АКСИ: генерация на устройстве, локальная память, retrieval, наблюдаемая телеметрия выполнения и криптографическая проверка через AKSI Runtime.

## Engines

### 1. WebLLM / WebGPU

Основной browser-native engine. Модель загружается явно, после загрузки inference выполняется на GPU устройства, без отправки текста в облачный LLM. WebGPU даёт браузеру GPU compute; WebLLM использует этот путь для локальной генерации.

### 2. llama.cpp localhost

Для компьютеров предусмотрен совместимый endpoint `http://127.0.0.1:8080/v1/chat/completions`. Это позволяет использовать большие GGUF-модели, CPU/GPU hybrid inference и native hardware acceleration через llama.cpp. Сервер llama.cpp предоставляет OpenAI-compatible API.

### 3. Offline kernel

Если полноценная модель не установлена, АКСИ не обращается к облаку. Она сообщает, что модель отсутствует, и использует только минимальный локальный fallback.

## Память

`IndexedDB` используется как локальное хранилище памяти. Перед генерацией выполняется локальный lexical retrieval; найденные записи добавляются в контекст модели. Сетевой RAG намеренно не используется в этом local-only workspace.

## Execution trace

АКСИ показывает не скрытую chain-of-thought, а проверяемые события runtime:

```text
input.received
      ↓
memory.retrieve
      ↓
context.built
      ↓
model.load / model.ready
      ↓
inference.start
      ↓
inference.complete
      ↓
verification.complete
```

Это принципиальное отличие: пользователь видит, **какие операции реально были выполнены**, но внутренняя скрытая цепочка рассуждений модели не выдается за достоверный журнал.

## Offline semantics

GitHub Pages не может вместить произвольную многогигабайтную модель в обычные файлы сайта. Поэтому browser-offline режим имеет две стадии:

1. первый запуск — установка runtime/весов;
2. последующие запуски — inference из локального cache.

Для air-gapped продукта нужна отдельная desktop/mobile сборка с заранее поставленными model artifacts. Веб-версия остаётся удобным zero-install вариантом.

## Security boundary

- удалённый LLM не является fallback по умолчанию;
- backend remote providers требуют `AKSI_ALLOW_REMOTE=1`;
- browser identity/signature принадлежат AKSI Runtime;
- SHA-256 ledger и Ed25519 verification отделены от LLM generation;
- execution trace не является доказательством истинности ответа сам по себе.

## Следующий production-уровень

- native llama.cpp packaging;
- GGUF model manager;
- model integrity manifests;
- signed model metadata;
- stronger local embeddings + vector index;
- local reranker;
- tool sandbox;
- multimodal local models;
- streaming tokens + token-rate telemetry;
- benchmark suite по устройствам;
- reproducible offline installation bundle.
