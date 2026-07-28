#!/usr/bin/env bash
# AKSI MATRIX — local start (Ollama + backend + static UI)
set -e
cd "$(dirname "$0")"

echo "🌌 AKSI MATRIX starting..."

# Ollama (if installed)
if command -v ollama >/dev/null 2>&1; then
  if ! curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
    echo "→ starting ollama serve"
    ollama serve &
    sleep 2
  fi
  if ! ollama list 2>/dev/null | grep -qiE 'mistral|llama'; then
    echo "→ pulling mistral (first time may take a while)"
    ollama pull mistral || true
  fi
else
  echo "⚠ Ollama not found — chat will use offline knowledge fallback"
  echo "  Install: curl -fsSL https://ollama.com/install.sh | sh && ollama pull mistral"
fi

# Backend
cd backend
if [ ! -d .venv ]; then
  python3 -m venv .venv
  . .venv/bin/activate
  pip install -r requirements.txt
else
  . .venv/bin/activate
fi

echo "→ uvicorn on :8000"
uvicorn main:app --host 0.0.0.0 --port 8000 &
BACK_PID=$!
cd ..

echo "→ static UI on :3000"
python3 -m http.server 3000 &
UI_PID=$!

echo ""
echo "✅ AKSI live"
echo "   UI:     http://localhost:3000"
echo "   API:    http://localhost:8000"
echo "   Docs:   http://localhost:8000/docs"
echo "   Stop:   kill $BACK_PID $UI_PID"
wait
