# AKSI Capsule v1.0

**Дата:** 2026-09-18  
**Контакт:** aksilove@internet.ru  

## Что внутри

- Локальная память фактов
- Поиск / ответы из памяти
- Печать ответа: **ECDSA P-256 + SHA-256**
- Проверка печатей (hash + signature)
- Экспорт / импорт файла **.aksi**
- Шаблоны: заметка, клиент, задача, решение, встреча
- DID на устройстве

## UI

https://milana808.github.io/capsule.html

## API

```js
AKSI_CAPSULE.remember(text)
AKSI_CAPSULE.ask(q)
AKSI_CAPSULE.sealLast()
AKSI_CAPSULE.verifySeal(seal)
AKSI_CAPSULE.downloadCapsule()
AKSI_CAPSULE.importCapsule(json)
```

Одна технология: переносимый интеллект с печатью.
