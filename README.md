# AKSI — основной репозиторий

**Главная точка проекта:** https://milana808.github.io/

Этот репозиторий **MILANA808/milana808.github.io является главным репозиторием AKSI**: здесь находится публичный продукт, Web UI, протоколы, верификация, демонстрации, документация, тесты и интеграционные контракты.
## Основной пользовательский продукт

Главный экран сайта — единое рабочее пространство AKSI, а не только каталог демонстраций.

- **Локальная языковая модель в браузере:** загрузка/выгрузка через общий aksi-webllm.js, выбор модели, прогресс и видимая ошибка совместимости. Требуется совместимый WebGPU-браузер, память устройства и загрузка весов с CDN.
- **Инструментальные ответы:** детерминированный математический калькулятор отделён от генерации текста.
- **Поиск источников по согласию:** веб-поиск выключен по умолчанию; при включении запрос отправляется внешним публичным сервисам, а найденные выдержки и URL показываются в интерфейсе.
- **Локальная история:** сохранение диалогов выключено по умолчанию; при включении контекст хранится в локальном хранилище браузера и может быть удалён пользователем.
- **Честная деградация:** без локальной модели приложение сохраняет инструменты, может показывать сырые найденные источники и пробует настроенный backend. Это не равнозначно работе полноценной LLM.
- **Ограничения:** нет заявлений об AGI или квантовом преимуществе; оценка языковой модели не считается независимой проверкой истины.


## Единая архитектура репозиториев

Карта интеграции и критерии готовности: [docs/AKSI_REPOSITORY_UNIFICATION.md](docs/AKSI_REPOSITORY_UNIFICATION.md). Она фиксирует роли репозиториев, общий цикл, контракты и проверяемые acceptance gates.

## Архитектура

```text
milana808.github.io  ← PRIMARY / CONTROL PLANE
│
├── Web Product / UI
├── AKSI Runtime interfaces
├── Evidence / Proof / Verification
├── Protocols & contracts
├── Benchmarks / tests
└── Documentation
        │
        ▼
Milana-backend       ← EXECUTION PLANE
│
├── agent runtime
├── web / browser tools
├── research & discovery
├── memory / state
└── server-side execution
```

### Правило репозиториев

- **github.io — источник истины для продукта и публичного интерфейса.**
- **Milana-backend — исполнительный сервис**, подключаемый к главному репозиторию.
- Новая функция сначала получает контракт/демо/тест в github.io, затем серверную реализацию — в backend.
- Никаких заявлений об AGI, сознании или «прорыве» без воспроизводимого теста.

## Главный цикл AKSI

```text
intent → plan → hypotheses → experiment → tool/action → observation
→ evidence → verification → receipt → memory/state → next action
```

## Что уже есть

- Web-продукт и интерактивные поверхности.
- Proof / verification / provenance-контуры.
- AKSI-VAI/1 как публичный протокол.
- Тестовый контур.
- Интеграционные точки для backend/runtime.
- Offline/local-first поверхности.

## Связанные проекты

- Backend: https://github.com/MILANA808/Milana-backend
- Главный сайт: https://milana808.github.io/

**Статус:** главный репозиторий AKSI.
**Лицензия:** proprietary — см. LICENSE.

## Scientific research and simulation

- **[AKSI Virtual World Lab](https://milana808.github.io/world-lab/)** — browser-only toy-world simulation with adjustable parameters, repeatable seed, local experiment history, JSON export and hypothesis checks.
- **[Scientific Foundations & Research Map](https://github.com/MILANA808/milana808.github.io/blob/main/research/AKSI_SCIENTIFIC_FOUNDATIONS.md)** — model registry architecture, mathematics/physics/AI research areas, open-problem integrity rules and starter bibliography.

The Virtual World is an illustrative energy-balance model, not a calibrated digital twin. It runs locally and does not require a server. Its PASS/FAIL checks apply to the code and this model, not to real-world infrastructure.
