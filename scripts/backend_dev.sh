#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DEFAULT_DB_URL="sqlite:///./expensebot.db"
if [ -z "${DATABASE_URL:-}" ]; then
  export DATABASE_URL="$DEFAULT_DB_URL"
fi

VENV_PATH="${ROOT_DIR}/venv"

if [ ! -d "$VENV_PATH" ]; then
  echo "❌ Virtual environment missing. Run 'npm run backend:setup' first." >&2
  exit 1
fi

source "${VENV_PATH}/bin/activate"
PYTHON_BIN="${VENV_PATH}/bin/python"

PORT="${API_PORT:-8000}"
HOST="${API_HOST:-0.0.0.0}"

echo "🚀 Starting FastAPI dev server on http://${HOST}:${PORT}"
echo "   Swagger UI: http://${HOST}:${PORT}/docs"

"${PYTHON_BIN}" -m uvicorn app.main:app --reload --host "$HOST" --port "$PORT"
