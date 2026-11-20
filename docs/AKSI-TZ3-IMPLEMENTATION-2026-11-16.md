# AKSI ТЗ-3 — проверяемая унификация языка, ядра и продукта

Дата сверки: 2026-11-16
Основной репозиторий: MILANA808/milana808.github.io
Рабочая ветка: aksi-q-site-rewrite; PR #264. Merge/deploy не выполняются.

## Решение

Развивать AKSI как AKSI Fieldstation — открытую рабочую станцию проверки и исследования. Отличие от обычного чата: воспроизводимая цепочка «запрос → задача → инструменты → исходные данные → проверка → результат/отказ», с видимыми источниками, трассой вычислений, состоянием модулей и пределами. Не имитировать полноценную ОС. Не переписывать все страницы разом.

## 1. Покрытие и достоверность

GitHub-коннектор вернул 21 доступный репозиторий для MILANA808. Ответ API не предоставил надёжно все поля full_name/visibility; поэтому это список доступных результатов, а не доказательство полного охвата организации или приватных репозиториев.

Проверены выборочно:
- milana808.github.io: README.md, package.json, kernel, bootstrap, evidence, router, status manifest, AKSI Q lexer/parser/interpreter, parser spec, conformance fixtures, tests, workflow, index.html, sw.js.
- Milana-backend: README.md и main.py. В main.py есть FastAPI bootstrap и динамическая загрузка optional routers. Наличие endpoint в документации не доказывает его runtime-доступность.
- aksi_apps: README.md описывает frontend/backend/tests/docker skeleton; кодовая интеграция не подтверждена.
- Agi: только README/proprietary notice; внутренний код не аудирован.
- AKSI-: README описывает personal agent и намерение подключаться к backend; тесты интеграции не проверены.
- AKSI-GROK-HYBRID: только README; код не аудирован.
- milana_site: README.md по указанному пути вернул 404; содержимое не оценено.
Другие найденные проекты (Aksi-love, AKSI-TEST*, AKSI-GROK-HYBRID-v1, Test-site, SuperAGI и др.) требуют отдельной инвентаризации. Не объединять их только по названию.

## 2. Фактические находки в главном репозитории

1. aksi-language/aksi_lexer.py — source-positioned lexer с лимитами размера source/token/identifier/string.
2. aksi-language/aksi_frontend.py — новый declaration parser и immutable AST с source spans.
3. aksi-language/aksi_parser.py — отдельный legacy expression Pratt parser.
4. aksi-language/aksi_q.py — Python reference interpreter, который импортирует legacy aksi_parser. Следовательно, новый AST из aksi_frontend.py пока не является AST, исполняемым этим interpreter.
5. PARSER-SPEC.md прямо исключает resolver, type/effect checking, execution нового AST, bytecode/WASM.
6. common-v1.json содержит общие runtime fixtures; workflow запускает Python tests, examples и parity scripts. Это не доказывает сквозную интеграцию AKSI Q с kernel.
7. modules/aksi-system-kernel.js — browser kernel API 0.1.0; system/aksi-boot.js регистрирует evidence.core и answer.router.
8. modules/claim-evidence.js экспортирует assess и prepareCandidates. assess использует явно записанные reviewer assessments; lexical overlap — только candidate screening.
9. aksi-answer-router.js задаёт VERSION 2.0.0. Нужно отдельно подтвердить фактический экспорт answer и script ordering в runtime.
10. system/aksi-os-status.json честно описывает browser-first prototype, not standalone OS; hard_isolation=false; AbortSignal cooperative.
11. index.html — крупный существующий интерфейс; sw.js проверен на cache v311. Нужен параллельный новый маршрут, а не destructive rewrite.
12. package.json запускает длинную последовательность Node tests; lint покрывает только перечисленные пути. Наличие тестов не означает полное покрытие.

## 3. Исправления к исходному черновику ТЗ

- Новый frontend parser и interpreter разделены. Это P0 для языка.
- Retrieval score/MiniLM/TF-IDF не равно пониманию смысла и не равно истинности.
- supported/contradicted/mixed нельзя выводить из lexical overlap. В текущем evidence API это статусы, основанные на reviewer assessments, и они тоже не являются объективным доказательством истины.
- Capability registry не доказывает enforcement. Каждая host operation должна проверять capability на runtime boundary.
- AbortSignal не может принудительно остановить код, который игнорирует отмену в том же JS context.
- Backend README/endpoint contract не доказывает, что optional routers загружены и доступны в production.
- AES-GCM/DID/signed logs — не security guarantee без аудита key lifecycle, nonce handling, XSS, recovery и verification.
- Порог <300 ms и «линейная масштабируемость» нельзя заявлять без измерений на реальных устройствах и p50/p95/p99.

## 4. Продукт: AKSI Fieldstation

Основные разделы:
1. Workbench — запрос, текущая задача, результат, источники, журнал.
2. Evidence Desk — документы, URL, фрагменты, происхождение, дата, ручная оценка, конфликты.
3. Lab — AKSI Q editor/runner, математические и симуляционные задачи, трасса.
4. Knowledge Map — граф понятий; каждое ребро имеет тип и происхождение.
5. System Monitor — модули, зависимости, health, очередь, лимиты, ошибки, версия.
6. Memory & Privacy — локальные данные, разрешения, экспорт/импорт.
7. Developer Studio — AST, диагностики, пакеты, conformance fixtures.

Визуальный язык: research workstation, не имитация desktop OS. Desktop — навигация, основная рабочая область, инспектор. Mobile — одна колонка и нижняя навигация. Нейтральная палитра; цвет только для статусов. Результат всегда показывает данные, метод, статус и предел. Не показывать некалиброванный «процент доверия».

## 5. Целевая архитектура

UI (HTML/CSS, постепенно AKSI UI DSL) → typed host bridge → browser kernel → AKSI Q runtime (AST/resolver/checker/interpreter) → capability-checked stdlib/FFI → adapters (answer/evidence/memory/math/semantic/RAG) → optional backend gateway.

AKSI Q описывает бизнес-логику и декларативный UI. Host runtime выполняет IO, WebCrypto, IndexedDB, fetch, DOM и системные операции. Произвольного доступа к host globals у программы нет.

## 6. Требования P0

P0.1 ABI/schema contracts: ModuleDescriptor, TaskRequest, TaskResult, KernelEvent, EvidenceClaim, EvidenceItem. Версия схемы, обязательные поля, лимиты размера, валидация на границе, стабильные error codes.

P0.2 Capability enforcement: минимальные права memory.read, memory.write, network.fetch, evidence.assess, ui.render, crypto.sign. Каждая host-функция проверяет capability context. Отсутствие права даёт E_CAPABILITY_DENIED. Никаких произвольных динамических imports в MVP.

P0.3 Task lifecycle: created → queued → running → completed|failed|cancelled|timed_out; rejected — отказ до enqueue. Очередь и история ограничены. Timeout не должен освобождать concurrency slot до фактического завершения/fencing handler. Shutdown: stop intake, cancel queued, signal running, bounded grace period, report remaining handlers. Property tests на races/double-release.

P0.4 Event log: append-only session log, eventId, schemaVersion, timestamp, taskId/moduleId, severity, code, redacted data. Не хранить секреты. Hash-chain не называть подписью; сначала key custody и независимая проверка.

P0.5 Integration: подключать только адаптеры с проверенными API. Проверить bootstrap health, router export, script order, dependency order. Browser smoke test и CI на точном head SHA.

## 7. Требования P1: единый AKSI Q

P1.1 Один lexer → parser → immutable AST → diagnostics. Старый Pratt parser временно оставить compatibility layer, но не второй публичный язык. Stable AST serialization.

P1.2 Resolver: lexical scopes, name resolution. Type checker: Unit, Bool, Int, Float, String, Array<T>, Map<K,V>, Option<T>, Result<T,E>, Task<T>, Module. Diagnostics с code/span/severity/expected/actual.

P1.3 Effects: pure, memory.read, memory.write, network, ui, crypto, task.spawn. Статическая метка не security boundary; runtime capability gate обязателен.

P1.4 Interpreter: выбрать canonical semantics. Рекомендация — Python reference interpreter для инструментов и тестов, JS runtime для браузера; одинаковые fixtures обязаны давать одинаковые значения и ошибки. WASM/JIT не делать до профиля нагрузки.

P1.5 Async semantics: async fn/await/spawn/cancel только после scheduler ABI. Task context immutable, deadline и cooperative cancellation.

P1.6 UI DSL: существующий .aksiui оставить ограниченным безопасным subset до объединения грамматики. Не разрешать произвольный JS. Мигрировать UI только после component schema, state/effect model, accessibility и route compatibility.

## 8. Предлагаемые примеры AKSI Q

Следующий синтаксис — проект предложения, он не утверждается как поддерживаемый текущим parser:

```aksi
module system.evidence
pub module EvidenceModule {
  version: "1.0.0"
  requires: [evidence.screen]
  capabilities: [evidence.assess]
  fn health(ctx: ModuleContext) -> Health {
    return Health.available()
  }
}
```

```aksi
pub async fn check_claim(input: ClaimInput) -> Result<ClaimReport, TaskError>
  effects [evidence.screen, memory.read] {
  let candidates = await evidence.screen(input.claim, input.documents)
  if candidates.is_empty() {
    return Ok(ClaimReport.insufficient("No usable evidence candidates"))
  }
  return Ok(ClaimReport.candidates(candidates))
}
```

```aksi
let screened = evidence.lexical_screen(claim, retrieved_documents)
let report = EvidenceReport {
  status: Insufficient,
  screening_method: "normalized-token-overlap-v1",
  candidates: screened,
  assessment_basis: None
}
```

```aksi
pub async fn save_note(ctx: TaskContext, note: Note) effects [memory.write] {
  await host.memory.put(ctx.capabilities.require("memory.write"), note.id, note)
}
```

## 9. ABI schemas (обязательные поля)

| Тип | Поля | Ограничения |
|---|---|---|
| ModuleDescriptor | id, version, dependencies, capabilities, init, health, shutdown | unique ID, SemVer, DAG, allowlisted capabilities |
| TaskRequest | taskId, moduleId, operation, payload, deadline, traceId | payload cap, operation allowlist, idempotency key |
| TaskResult | taskId, state, result OR error | terminal state, exactly one result/error |
| KernelEvent | eventId, schemaVersion, timestamp, type, severity | redacted, bounded |
| Claim | id, text, locale, createdAt | text length cap |
| EvidenceItem | id, claimId, sourceUri, excerpt, relation, reviewerStatus | validated URL, provenance, excerpt cap |

Error codes: E_PARSE, E_RESOLVE, E_TYPE, E_EFFECT, E_CAPABILITY_DENIED, E_MODULE_NOT_FOUND, E_DEPENDENCY_CYCLE, E_QUEUE_FULL, E_TASK_TIMEOUT, E_TASK_CANCELLED, E_TASK_FAILED, E_SCHEMA_VERSION, E_INVALID_INPUT, E_HOST_UNAVAILABLE.

## 10. План миграции

1. Сделать frontend parser canonical syntax; определить stable AST JSON serializer.
2. Ввести resolver и diagnostics без исполнения.
3. Реализовать interpreter для чистого subset: значения, арифметика, функции, ветвления.
4. Добавить host ABI и capability enforcement.
5. Перенести один kernel lifecycle adapter на AKSI Q; JS kernel остаётся host scheduler.
6. Перенести lexical evidence screening, не verdict; JS остаётся parity oracle.
7. Перенести memory adapter и math adapter.
8. Перенести answer orchestration только после task/effect semantics.
9. UI DSL и новый Fieldstation route; legacy HTML остаётся fallback.
10. Удалять legacy parser только после двух релизных циклов parity и нулевого использования.

## 11. Проверки и release gates

- Unit: lexer/parser/resolver/types/runtime/kernel/evidence.
- Contract: ABI, JSON schemas, UI/backend adapters.
- Property: scheduler state machine, parser invariants, limits.
- Fuzz: malformed source, deep AST, oversized JSON/URLs.
- Security: capability denial, XSS, URL validation, secret redaction, dependency audit.
- Integration: Q task → kernel → evidence adapter → report; deterministic trace.
- Browser E2E: main flow, offline, reload, mobile, accessibility.
- Performance: parse, dispatch, retrieval, math; baseline p50/p95/p99; >30% regression reviewed.
- Reproducibility: pinned toolchain, fixtures, lockfiles, artifact hashes where feasible.

Не ставить универсальный лимит ответа 300 ms до измерений. Разделять local route, cold start, model download, network retrieval и backend latency.

## 12. Backlog

Slice A — foundation:
- проверить PR head SHA, PR body и CI на exact SHA;
- проверить router export answer и порядок scripts;
- добавить canonical AST serialization и 5–10 fixtures;
- добавить тестовую фиксацию разницы AST frontend vs legacy interpreter;
- добавить JS/Python AST parity harness или явно пометить его отсутствие;
- прогнать CI на exact head SHA.

Slice B — язык:
- interpreter для ограниченного AST subset;
- resolver и type checker;
- effects/capabilities diagnostics;
- host adapter contract tests;
- один kernel lifecycle module на AKSI Q.

Slice C — продуктовый сценарий:
- evidence lexical screening на AKSI Q с JS parity;
- Workbench route: запрос, evidence candidates, report, system trace;
- Playwright E2E и offline test.

Slice D — постепенная интеграция:
- memory, math, semantic graph, RAG, answer router, optional backend gateway;
- UI DSL после component/state/effect contract.

Автоматизируется: source inventory, parser/runtime tests, schemas, CI, dependency scanning, browser E2E на runners.
Реальное устройство: WebGPU/WebGL, память, производительность, mobile offline/PWA, secure storage/recovery.
Люди: evidence annotation, 5–10 пилотных пользователей, UX/security review, лицензии и происхождение datasets.

Без отдельного подтверждения не выполнять merge/deploy, не менять main, не удалять legacy routes/data, не раскрывать private code, не перемещать secrets и не выполнять внешние действия от имени пользователя.

## 13. Definition of Done первого этапа

1. Документ находится в рабочей ветке и связан с PR #264.
2. Известен точный head SHA; CI относится именно к нему.
3. Тесты показывают границу нового AST frontend и legacy runtime.
4. AKSI Q не выполняет host IO без host adapter/capability.
5. Evidence retrieval не превращается в verdict без reviewer assessment.
6. UI показывает реальные module/task states.
7. Legacy сайт работает; main и production не менялись.

## 14. Источники

Центральный репозиторий: README.md, package.json, modules/aksi-system-kernel.js, system/aksi-boot.js, modules/claim-evidence.js, aksi-answer-router.js, system/aksi-os-status.json, aksi-language/aksi_lexer.py, aksi-language/aksi_frontend.py, aksi-language/aksi_parser.py, aksi-language/aksi_q.py, aksi-language/PARSER-SPEC.md, aksi-language/conformance/common-v1.json, aksi-language/tests/test_aksi_frontend.py, .github/workflows/aksi-language.yml, index.html, sw.js.

Другие проверенные источники: Milana-backend/README.md и main.py; aksi_apps/README.md; Agi/README.md; AKSI-/README.md; AKSI-GROK-HYBRID/README.md. milana_site/README.md вернул 404.

Итог: это исполнимое инженерное ТЗ, а не заявление о готовности системы. Полный аудит всех репозиториев/приватных проектов ещё не завершён.