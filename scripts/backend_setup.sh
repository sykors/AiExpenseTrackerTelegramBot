#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DEFAULT_DB_URL="sqlite:///./expensebot.db"
if [ -z "${DATABASE_URL:-}" ]; then
  export DATABASE_URL="$DEFAULT_DB_URL"
  echo "ℹ️  DATABASE_URL not set in environment. Using local SQLite database: $DATABASE_URL"
fi

echo "🔧 Preparing Python backend environment (no Docker)..."

if ! command -v python3 >/dev/null 2>&1; then
  echo "❌ python3 is required but was not found in PATH." >&2
  exit 1
fi

VENV_PATH="${ROOT_DIR}/venv"

if [ ! -d "$VENV_PATH" ]; then
  echo "📦 Creating virtual environment at ${VENV_PATH}"
  python3 -m venv "$VENV_PATH"
fi

source "${VENV_PATH}/bin/activate"
PYTHON_BIN="${VENV_PATH}/bin/python"

echo "⬆️  Updating pip and installing backend dependencies"
"${PYTHON_BIN}" -m pip install --upgrade pip
"${PYTHON_BIN}" -m pip install -r requirements-local.txt

if [ ! -f ".env" ]; then
  echo "⚠️  Missing .env file. Copy .env.example and add your keys before continuing." >&2
  exit 1
fi

echo "🗄️  Applying database migrations (uses DATABASE_URL from .env)"
"${PYTHON_BIN}" -m alembic upgrade head

echo "✅ Backend environment ready"
