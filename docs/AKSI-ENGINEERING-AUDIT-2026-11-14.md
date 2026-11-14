# AKSI — снимок инженерного аудита репозиториев

**Дата:** 2026-11-14  
**Главный продукт:** `MILANA808/milana808.github.io`  
**Канонический backend:** `MILANA808/Milana-backend`

> Это предварительная карта по GitHub-метаданным, выбранным README и исходникам главного продукта. Это НЕ полный построчный аудит всех 21 репозитория, лицензий, зависимостей и истории коммитов. Неизученные проекты не считаются безопасными или готовыми к слиянию.

## 1. Что проверено в главном продукте

### Объединено в main

- PR #241 — AKSI Q Python reference language v0.2.0, 19 tests passed; merged.
- PR #242 — browser-native AKSI Q runtime and IndexedDB memory; merged.
- PR #246 — Integrity key storage, honest CSPRNG labels, generated-history/knowledge separation; 11 workflows passed before merge.
- PR #247 — capability documentation corrected to native-first behavior.
- PR #253 — clear-memory action now clears IndexedDB, native generator feedback/history, unified-core memory, user knowledge-base facts, dialogue context and UI history; all 10 workflows passed.
- PR #254 — shared Python/JavaScript conformance corpus (six deterministic cases); all eight workflows passed.
- PR #256 — local Node.js AKSI Seal CLI (SHA-256 + Ed25519 receipts); all nine workflows passed.
- PR #257 — browser AKSI Seal (SHA-256 + ECDSA P-256, non-extractable IndexedDB key); all nine workflows passed.
- PR #258 — World Lab offline integrity checks; all eight workflows passed.
- PR #259 — GitHub Actions updates: checkout v7, setup-node v7, github-script v9, configure-pages v6, upload-pages-artifact v5.
- PR #260 — AKSI Seal added to main product navigation; all nine PR checks passed.
- PR #248 — this repository/security audit snapshot; merged.
- Latest main commit at time of update: `fb511dd4efbbd0e168a2dad0bfd78855bc7d86b2`. The Pages deployment for this exact commit is still running at the time of this audit update.

### Реальный статус ядра

Основной чат — ограниченный классический native-first контур. В нём есть математический парсер, понятийный граф, ограниченный символьный вывод, правила диалога, маршрутизация намерений и retrieval/recombination по локальному корпусу.

Текущий Native Generator не является обученной языковой моделью. Он ищет близкие материалы и собирает ответ из них. Неподдержанный вопрос должен приводить к отказу или уточнению, а не к выдуманному факту. WebLLM остаётся отдельным экспериментальным runtime и не требуется для основного native-first пути.

История сгенерированных ответов больше не добавляется автоматически в корпус знаний. В retrieval допускаются встроенные материалы и пользовательские записи, явно отмеченные положительной обратной связью. Такая обратная связь означает полезность для пользователя, а не доказанную истинность.

## 2. Инвентаризация 21 доступного репозитория

| Репозиторий | Предварительная роль | Решение сейчас |
|---|---|---|
| `milana808.github.io` | Канонический публичный продукт, UI, протоколы и тесты | Единственный источник истины для продукта |
| `Milana-backend` | Канонический серверный исполнительный контур | Сохранять отдельно; интегрировать через проверяемый API-контракт |
| `aksi_apps` | Каркас приложения: frontend/backend/tests/Docker | Сравнить уникальные функции и тесты до переноса |
| `milana_site` | Старый сайт/портал; README не найден | Проверить маршруты, файлы и историю до объединения |
| `AKSI-TEST-1` | Полноценный альтернативный full-stack прототип | Проверить секреты, персональные данные и происхождение кода; не копировать целиком |
| `AKSI-` | Небольшая архитектура personal agent с принципами разрешений и аудита | Кандидат на перенос отдельных контрактов после тестирования |
| `AKSI-GROK-HYBRID` | Экспериментальный demo | Архивировать как эксперимент; не повторять заявления о сознании без доказательств |
| `AKSI-GROK-HYBRID-v1` | Малый экспериментальный demo | Проверить уникальный код и лицензию; не считать отдельным production runtime |
| `Agi` | README содержит в основном уведомление о правах | Назначение и код не классифицированы |
| `Aksi-love` | Частный репозиторий | Оставить приватным; не переносить и не публиковать содержимое |
| `glorious-potato` | README указывает на GitHub Codespaces/GitHub Models starter | Не считать собственным ядром AKSI без проверки истории |
| `SuperAGI` | Крупный репозиторий; README не найден | Не сливать; сначала проверить происхождение, лицензию и уникальный код |
| `openai-cookbook` | Репозиторий примеров и руководств по OpenAI API; README ссылается на официальный OpenAI Cookbook | Внешняя справочная база; не считать оригинальной разработкой AKSI |
| `gpt-oss-safeguard` | README описывает модели безопасности gpt-oss-safeguard | Внешний модельный reference; не считать собственной моделью AKSI |
| `plugins-quickstart` | Старый шаблон ChatGPT Plugins | Не является ядром; плагины заменены более современными механизмами интеграции |
| `AKSI-TEST` | Второй старый шаблон ChatGPT Plugins | Дубликат/справочный шаблон; не переносить как AI-ядро |
| `codex` | Крупный репозиторий, назначение не установлено | Нужны tree, лицензия, ancestry и dependency audit |
| `MILANA808` | Профильный репозиторий с минимальным README | Не является runtime |
| `Bulat` | Малый репозиторий, README не найден | Назначение не установлено |
| `Test-site` | Малый репозиторий, README не найден | Назначение не установлено |
| `MCP-GitLab-insights-` | Малый репозиторий, README не найден | Проверить назначение и возможную связь с GitLab-интеграцией |

### Правило миграции

Не объединять репозитории массовым копированием. Для каждого кандидата перед переносом требуются: дерево файлов, лицензия, зависимости, default branch, история/ancestry, уникальные модули, тесты и проверка секретов. Истории репозиториев сохраняются. Частные данные и ключи не переносятся в публичный продукт.

## 3. Открытые Pull Request и консолидация

После проверки дубликатов, устаревших веток и конфликтующих прототипов в главном репозитории остался один открытый PR: **#239 — tokenomics proposal**, переведённый в draft. Он не является утверждённой экономикой, выпущенным токеном или разрешением на продажу/фандрайзинг.

В главном репозитории закрыты как уже интегрированные, устаревшие или отдельные эксперименты PR #14, #11, #13, #42, #51, #56, #58, #48, #49, #50, #59, #121, #153, #156, #168, #169, #170, #177, #187, #240, #243, #244, #245, #249, #250, #252, #255 и другие заменённые ветки. Закрытие PR не удаляет исходные ветки или историю.

В backend закрыты устаревшие дублирующие PR #2, #17, #18, #20, #22 и экспериментальный #42. В репозиториях `milana_site`, `codex`, `aksi_apps`, `AKSI-TEST-1` и `glorious-potato` закрыты старые дублирующие UI/backend snapshots и несогласованные deployment/automation branches. Их код не копировался в production.

Правило: один канонический публичный продукт (`milana808.github.io`) и один отдельный optional backend (`Milana-backend`). Эксперименты не становятся production только из-за наличия PR.

## 4. Оставшиеся риски и незакрытые задачи

### Высокий приоритет — экспериментальный PQ vault

`aksi-pq.js` по-прежнему генерирует экспортируемые ECDH/ECDSA-ключи и сохраняет приватные JWK в IndexedDB; секретный ключ ML-KEM также сохраняется как base64 в записи хранилища. Это не защищённое хранилище для ценных ключей или конфиденциальных сообщений. Модуль не должен позиционироваться как production key custody до миграции на неэкспортируемые CryptoKey и защищённое хранение KEM-секрета, миграционных тестов и независимого review.

### Ограничения общего browser key provider

`aksi-crypto-provider.js` сохраняет приватный CryptoKey как non-extractable, но для импорта в таком виде временно экспортирует JWK в памяти страницы. Это устраняет постоянное plaintext-хранение приватного JWK в localStorage, но не защищает от same-origin XSS: скомпрометированный скрипт всё ещё может вызвать API подписи. Это не hardware-backed custody.

### Локальная память

IndexedDB-память AKSI ограничена квотой браузера, относится к текущему origin и устройству, не синхронизируется между устройствами и не является шифрованным сейфом. Не сохранять пароли, seed-фразы и приватные ключи.

### Backend

Live deployment blocker: GitHub Actions run [#43511696195](https://github.com/MILANA808/Milana-backend/actions/runs/43511696195) on 2026-11-13 timed out on all six attempts for `/health`, `/ready`, `/aksi/cluster/status` and `/api/core/runtime` at `https://aksi-backend.onrender.com`. This does not identify whether Render is suspended, the deploy failed, startup is blocked, or the URL/network is wrong. Tracking issue: [Milana-backend #55](https://github.com/MILANA808/Milana-backend/issues/55). Do not claim the live backend is online until the live smoke workflow passes.

Backend-контур существует отдельно. Успешные тесты статического сайта не доказывают доступность production backend. Для постоянной идентичности серверной подписи требуется стабильный секретный ключ в хранилище секретов хостинга; ephemeral key не обеспечивает непрерывность идентичности.

### Непроверенные границы

- Нет полного построчного аудита всех 21 репозитория.
- Нет независимого внешнего security audit.
- Нет подтверждённого end-to-end теста на реальном мобильном браузере для всех пользовательских потоков.
- Нет доказательства универсального понимания языка, AGI или квантового преимущества.
- Локальный retrieval score, graph score и оценка намерения — эвристики, не вероятность истины.
- Хеш/подпись подтверждают целостность и связь с ключом, но не истинность, автора без внешней привязки или доверенное время.

## 5. Следующие обязательные этапы

1. Защитить или отключить до исправления `aksi-pq.js` и все legacy key stores.
2. Создать общий corpus conformance fixtures для Python и JavaScript AKSI Q runtime.
3. Проверить воспроизводимость symbolic inference traces и различать explicit facts, derived facts и unknown.
4. Пройти все 37 открытых PR: duplicate detection, current-main comparison, CI, license/provenance, merge или закрытие с объяснением.
5. Провести browser integration tests: IndexedDB, Web Crypto, storage denial/quota, import/export, reload и key rotation.
6. Отдельно проверить backend health, stable signing identity, permissions и live task lifecycle.
7. Не объявлять продукт готовым до прохождения этих gates.

**Критерий готовности:** пользователь видит, какой модуль ответил, на каких данных он основан, что было выведено логически, что осталось неизвестным, какие действия разрешены и какой тест подтверждает состояние. Никакая декоративная метрика не заменяет проверку результата.
