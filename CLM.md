# AKSI CLM — Closed-Loop Memory v1.0

## Что это

Алгоритм локальной памяти для агента в браузере:

1. **Write** — факт пишется в seed + Cortex (AES-GCM).
2. **Probe** — из факта строятся короткие вопросы-зонды.
3. **Score** — система пытается *сама* достать факт (resonance + lexical).
4. **Tier** — `sealed` | `provisional` | `weak`.
5. **Read** — при ответе сначала берутся `sealed`.

Человек видит: **проверено воспроизведением** / частично / слабо.

## Почему это слой технологии

Обычный чат: `save(text)`.
CLM: `save → self-test → trust rank → prefer on answer`.

Замкнутый контур «запись ↔ проверка» — отдельный слой поверх хранилища.

## Честно

- Это не новая нейросеть и не квантовый процессор.
- Это **алгоритм доверия к собственной памяти** offline-агента.
- Оценка зондов эвристическая; пороги можно калибровать.

## API

```js
AKSI_CLM.seal(fact, { cortex, ingestResult })
AKSI_CLM.lookup(query)
AKSI_CLM.stats()
```

© AKSI · aksilove@internet.ru
