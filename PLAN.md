# АКСИ — план (исполнен)

## Анализ сайта milana808.github.io

| Путь | HTTP | Назначение |
|------|------|------------|
| `/` | 200 | Хаб входа |
| `/wake/` | 200 | Агент: ход мыслей, Resonance, tools |
| `/quantum/` | 200 | Statevector, текст→схема |
| `/matrix/` | 200 | WebLLM + RAG + Mermaid |
| `/app/` | 200 | Чат + личная сеть |
| `/nav/` | 200 | GPS навигатор |
| `/globe/` `/earth3d/` | 200 | Глобус |
| `/precedent/` | 200 | DID + ECDSA + квант |
| `/backup/` | 200 | Бэкап данных |

## Стиль
- Тёмный фон `#070b16` / фиолет `#7c3aed` / cyan акцент
- Мобильный first, крупные кнопки
- Короткий русский тон, подпись 🔏

## Логика агента
1. Net (localStorage AKSI_NET_V1)
2. Ядро KB
3. Tool quantum при ключевых словах
4. WebLLM опционально
5. Wikipedia
6. Fallback + Resonance SHA-256

## Контрольные точки
- [x] Маршруты 200
- [x] Белл P00=P11=0.5
- [x] /wake отвечает с ходом мыслей
- [x] Публично только aksilove@internet.ru
