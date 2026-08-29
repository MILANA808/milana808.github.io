# АКСИ (AKSI) — offline-first AI system

**Полноценный локальный ИИ в браузере.**  
Стек: **ADIA 2.0** + Neuro (RWKV CPU) + WebLLM (WebGPU) + OCR + proof + согласие на сеть.

**Live:** https://milana808.github.io  
**Contact:** aksilove@internet.ru · X [@AKSILOVE](https://x.com/AKSILOVE)

---

## Интерфейс

| Вкладка | Назначение |
|---------|------------|
| **Home** | Proof offline, статус, teach, PRECEDENT |
| **Чат** | Диалог через Mind → ADIA seal |
| **Память** | Локальные факты (`запомни: …`) |
| **Фото** | OCR (Tesseract) |
| **Lab** | ADIA · Neuro · WebLLM · Ollama · Mind · Quantum · Trust · DKV |

**Offline по умолчанию.** Сеть — только после галочки **Сеть**.

## Архитектура

```text
Intent → Quantum meta → Brain
  → WebLLM (если загружен)
  → Neuro RWKV (offline CPU)
  → ADIA 2.0 (EQS · rank · seal)
  → Web (если согласие)
  → Ollama / Core
```

## Ключевые файлы

| Файл | Роль |
|------|------|
| `index.html` | Product shell |
| `aksi-algorithm.js` | ADIA 2.0 |
| `aksi-mind.js` | Router |
| `aksi-neuro.js` | RWKV offline LLM |
| `aksi-webllm.js` | Optional WebGPU |
| `PRECEDENT.json` | Policy claim |
| `ALGORITHM.md` | Спецификация ADIA |
| `STRUCTURE.md` | Канон структуры |

## Быстрый старт

1. Откройте https://milana808.github.io  
2. Ctrl+F5  
3. Чат: «Кто ты?», «Работает ли без интернета?»  
4. Home → **Докажи offline**  
5. Lab → ADIA / Neuro / WebLLM  

## Принципы

1. Offline-first  
2. Согласие на сеть  
3. Измеримость (EQS, ledger)  
4. Один продукт, без параллельных SPA  
5. Без цен на публичных страницах  

© AKSI · aksilove@internet.ru
