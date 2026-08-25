# AKSI DKV — инструкция по интеграции

**Модуль:** Decentralized Knowledge Verifier  
**Файлы:** `aksi-dkv.js`, `aksi-dkv.html`, `aksi-dkv-facts.json`  
**Контакт:** aksilove@internet.ru · @AKSILOVE

## Что это

Полностью локальный верификатор текстовых документов для AKSI:

1. Загрузка TXT (рекомендуется) / вставка текста / best-effort PDF·DOCX  
2. Эвристическое извлечение утверждений (claim extraction) без LLM  
3. SHA-256 каждого утверждения + документ целиком  
4. Append-only **proof ledger** (`prev_hash`) в `localStorage`  
5. Сверка с локальной JSON-базой фактов → подтверждено / опровергнуто / неизвестно  
6. Canvas-граф утверждений + список с цветами  

Подмена документа ломает `docHash` и/или цепочку `prev_hash`.

## Быстрый старт

Откройте `aksi-dkv.html` (самодостаточная страница с inline-модулем).

## Подключение к агенту

```html
<script src="aksi-dkv.js"></script>
<button type="button" data-tab="dkv">DKV</button>
<section class="panel" id="tab-dkv"><div id="dkv-root"></div></section>
<script>if (window.DKV) DKV.mount("#dkv-root", { factsUrl: "aksi-dkv-facts.json" });</script>
```

## API

```js
var eng = new DKV.DKVEngine({ facts: [...] });
eng.verifyText("Текст...").then(() => console.log(eng.getSummary()));
DKV.verifyLedger();
DKV.mount("#root", { factsUrl: "aksi-dkv-facts.json" });
```

## Ограничения

TXT/MD — полная поддержка. PDF/DOCX — best-effort без внешних парсеров (лучше экспорт в TXT).
