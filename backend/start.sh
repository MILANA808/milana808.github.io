#!/usr/bin/env bash
# АКСИ Backend — один скрипт запуска
set -e
cd "$(dirname "$0")"

echo "=== АКСИ Backend ==="

if [ ! -d .venv ]; then
  python3 -m venv .venv
  . .venv/bin/activate
  pip install -q -r requirements.txt
else
  . .venv/bin/activate
fi

export OLLAMA_URL="${OLLAMA_URL:-http://127.0.0.1:11434}"
export OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5:3b}"
export AKSI_LLM_PROVIDER="${AKSI_LLM_PROVIDER:-auto}"
export RESONANCE_SEED="${RESONANCE_SEED:-AKSI_DIMAX_v3_2026}"
export PORT="${PORT:-8000}"

if command -v ollama >/dev/null 2>&1; then
  if ! curl -sf "$OLLAMA_URL/api/tags" >/dev/null 2>&1; then
    echo "Запускаю ollama serve в фоне…"
    ollama serve >/tmp/aksi-ollama.log 2>&1 &
    sleep 2
  fi
  if ! curl -sf "$OLLAMA_URL/api/tags" | grep -q "${OLLAMA_MODEL%%:*}"; then
    echo "Тяну модель $OLLAMA_MODEL (один раз)…"
    ollama pull "$OLLAMA_MODEL" || true
  fi
else
  echo "Ollama не найдена. Backend ответит offline-KB."
  echo "Установка: https://ollama.com  →  ollama pull $OLLAMA_MODEL"
fi

echo "Identity: did:aksi:ed25519:sovereign-2026"
echo "Docs:    http://127.0.0.1:$PORT/docs"
echo "Health:  http://127.0.0.1:$PORT/health"
echo "Чат UI:  https://milana808.github.io/chat/  (Backend URL = http://127.0.0.1:$PORT)"
exec python main.py
