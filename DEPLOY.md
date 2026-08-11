# Развёртывание АКСИ

## 1. Публичный сайт (уже live)
https://milana808.github.io/

GitHub Pages · ветка `main` · корень репозитория `milana808.github.io`

## 2. Backend API (VPS / локально)
```bash
git clone https://github.com/MILANA808/Milana-backend.git
cd Milana-backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```
Или: `docker compose up --build`

Swagger: http://HOST:8000/docs

## 3. Связка фронта с API
В браузере (консоль на сайте):
```js
localStorage.setItem('AKSI_API', 'https://YOUR-API-HOST')
```

## 4. Проверка
- /aksi/ — диалог
- / — вход
- /matrix.html — lab
- backend /health — ok
