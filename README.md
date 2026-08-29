# АКСИ (AKSI)

**Полноценная offline AI-система** с локальным ИИ в браузере.

Local-first · explicit network consent · verifiable policy · single product interface.

**Live:** https://milana808.github.io  
**Contact:** aksilove@internet.ru · X [@AKSILOVE](https://x.com/AKSILOVE)

---

## Что это

Готовый продукт в браузере (без установки):

| Поверхность | Назначение |
|-------------|------------|
| **Chat** | Единый ответ: Brain → **Neuro (offline LLM)** → Web (opt-in) → Core → Ollama |
| **Memory** | Факты в этом браузере (`запомни: …`) |
| **Photo** | Локальный OCR / vision path |
| **Home** | Offline proof demo, teach, export proof, статус системы |
| **Lab** | Neuro UI, Mind, Quantum, Trust, DKV, Web, Ollama |

**По умолчанию — offline.** Интернет только после галочки **Сеть**.

Наследие **АКСИ MATRIX** (суверенная когнитивная оболочка, proof ledger, identity) сведено в один понятный mobile-first интерфейс.

---

## Принципы

1. **Local first** — диалог, память и локальный ИИ работают без сервера.
2. **Consent for network** — поиск/API только после явного включения пользователем.
3. **Provable policy** — [`PRECEDENT.json`](./PRECEDENT.json) + proof/export сессии.
4. **Ключи на устройстве** — identity и память не уходят на серверы оператора по умолчанию.
5. **Честный scope** — не AGI и не замена frontier-моделей. **Суверенный companion layer**.

---

## Архитектура

```text
UI (index.html) — единый продукт
  ├─ Home / Chat / Memory / Photo / Lab
  └─ Orchestration
       AKSI_MIND.think()
         → Quantum shot (meta)
         → Brain (локальная KB)
         → Neuro  (offline LLM · retrieve + learn)   ← локальный ИИ
         → Web    (только если consent ON)
         → Core   (wiki/ddg при разрешении)
         → LLM    (Ollama / OpenAI-compatible BYOK)
         → Trust  (verify / ledger)
```

### Ключевые файлы

| Файл | Роль |
|------|------|
| `index.html` | Продуктовый shell (Home / Chat / Memory / Photo / Lab) |
| `aksi-neuro.js` | **Offline local AI** (RWKV-style, pure JS, CPU) |
| `aksi-mind.js` | Единый маршрутизатор |
| `aksi-one.js` | Chat runtime / wire |
| `aksi-brain.js` | Локальная knowledge base |
| `aksi-web.js` | Opt-in интернет |
| `aksi-llm.js` | Ollama / cloud providers (BYOK) |
| `aksi-product-ui.js` | Proof demo, teach, export |
| `aksi-quantum.js` | Quantum simulator |
| `aksi-trust.js` | Trust / ledger hooks |
| `aksi-dkv.js` | Document claim graph |
| `aksi-photo.js` | Photo / OCR path |
| `aksi-core.js` | Стабильный core |
| `PRECEDENT.json` | Машиночитаемая offline-first политика |

Legacy surfaces (`/aksi-matrix/`, system/omega) остаются доступны. **Точка входа продукта — `/`.**

---

## Локальный ИИ (Neuro)

- Полностью в браузере (CPU, без GPU, без сети).
- Архитектура: RWKV-style (рекуррентное состояние O(1), без KV-cache).
- Ответы из встроенного ядра + фактов, которым вы научили.
- Обучение: `запомни: …` в чате или Lab → Neuro → Выучить.
- Не заменяет большие cloud-модели — это **всегда доступный offline brain**.

### Быстрая проверка offline

1. Галочка **Сеть** выключена.
2. В чате: `Кто ты?`, `Работает ли без интернета?`
3. Home → **Докажи offline**.
4. Откройте [`PRECEDENT.json`](https://milana808.github.io/PRECEDENT.json).

---

## Quick start

1. Откройте **https://milana808.github.io** и hard-refresh (**Ctrl+F5**).
2. Чат: `Кто ты?`, `запомни: мой факт`.
3. Опционально сеть: включите **Сеть**, затем поисковые вопросы.
4. Более сильная модель (опционально):

```bash
ollama run llama3.2
```

Затем Lab → Ollama.

---

## Маршрут ответа (Mind)

```
Intent
  → Quantum (meta)
  → Brain (локальные знания)
  → Neuro (offline LLM)          ← основной локальный путь
  → Web (только с consent)
  → Core / LLM (Ollama)
  → Trust (подпись / ledger)
```

Команды в чате:
- `кто ты` / `whoami`
- `запомни: …` / `выучи: …`
- `статус`
- `что ты помнишь`
- `/demo`

---

## Проверка политики

1. Оставьте **Сеть** выключенной.
2. Home → **Докажи offline**.
3. Сверьте [`PRECEDENT.json`](./PRECEDENT.json).
4. Export proof session с Home (когда доступен).

Технические контроли:
- `localStorage` flag сети по умолчанию выключен
- `AKSI_WEB.search` не ходит в сеть без `isEnabled()`
- `AKSI_MIND` пропускает Web, если consent off
- ключи и память — только в браузере пользователя

---

## Стек

- Pure JS (no framework on product path)
- IndexedDB / localStorage persistence
- RWKV-style offline model (Neuro)
- Ed25519 / seal hooks (где доступны)
- Optional Ollama (local) and BYOK cloud
- GitHub Pages static deploy

---

## Лицензия и контакт

Proprietary. См. `LICENSE`, `PROPRIETARY.md`.

**Контакт:** aksilove@internet.ru  
**X:** [@AKSILOVE](https://x.com/AKSILOVE)  
**Репозиторий:** [MILANA808/milana808.github.io](https://github.com/MILANA808/milana808.github.io)

---

*AKSI — sovereign digital companion. Offline by default.*
