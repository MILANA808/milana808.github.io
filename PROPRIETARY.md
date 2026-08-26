# AKSI — проприетарный продукт

**Лицензия:** Proprietary (см. [LICENSE](./LICENSE))  
**Контакт:** aksilove@internet.ru · X [@AKSILOVE](https://x.com/AKSILOVE)

## Что это значит

| | |
|--|--|
| Исходники на GitHub | **не** open source — только демонстрация / evaluation |
| Коммерческое использование | только по договору (Studio / Business / Enterprise) |
| White-label | Enterprise pack |
| Копирование / форки «в прод» | запрещены без лицензии |

Ранее мог отображаться Apache-2.0 — **отозван**. Действует только файл `LICENSE` (Proprietary).

## TURN / «свой сервер на github.io»

**Невозможно.** GitHub Pages отдаёт только статику (HTML/JS/CSS).

TURN (coturn) нужен как процесс с UDP/TCP:

- `3478`, `5349`
- relay `49152–49200`

Это только **VPS** (или облако), не Pages.

Готовый пакет: папка [`/turn`](./turn/) — Docker coturn + API ключей.

```text
Браузер  ←WebRTC→  TURN на вашем VPS  ←signaling→  PeerJS cloud
         ↑
   milana808.github.io (статика P2P UI)
```

Подключение UI:

```js
window.AKSI_P2P_TURN_URL = "https://api.ваш-vps/turn";
// или
window.AKSI_P2P_TURN = { urls: ["turn:IP:3478"], username: "…", credential: "…" };
```

## Сделать репозиторий приватным

GitHub → Settings → General → **Change visibility** → Private  
(или оставить Public demo + закрыть коммерческие ветки).

## Коммерческие материалы

- `/offer` — тарифы DIP / Protocol  
- `aksi-commercial/` — kit, white-label, enterprise pack  

© 2024–2026 AKSI · aksilove@internet.ru
