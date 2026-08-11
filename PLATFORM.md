# АКСИ — статус (2026-08-12)

## Живое на Pages
- `/aksi/` — Resonance + Codex + Wiki/arXiv + i18n
- `/avatar/` — Three.js
- `/messages/` — E2E AES-GCM
- `/earn/` — модель дохода
- `/admin/` — панель
- `/api/` — карта эндпоинтов
- `/CODEX.md` — этика

## Backend v0.5 (Milana-backend)
- `GET /api/codex`
- `POST /api/codex/check`
- `POST|GET /api/world/search` (Wikipedia + arXiv)
- chat / admin / identity — по наличию модулей
- CORS `*`

## Как поднять всё локально
```bash
git clone https://github.com/MILANA808/Milana-backend.git
cd Milana-backend && pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# Pages: открыть https://milana808.github.io/aksi/
```

## Следующие слои (не блокируют демо)
1. VPS + HTTPS API
2. PostgreSQL история
3. React-admin
4. RSS/PubMed
