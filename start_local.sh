#!/usr/bin/env bash
set -euo pipefail

# Resolve repository root regardless of where the script is invoked from
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
FRONTEND_DIR="$REPO_ROOT/frontend"
BACKEND_VENV="$BACKEND_DIR/venv"

cleanup() {
  local exit_code=$?
  if [[ -n "${BACKEND_PID:-}" ]]; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "${FRONTEND_PID:-}" ]]; then
    kill "$FRONTEND_PID" >/dev/null 2>&1 || true
  fi
  wait >/dev/null 2>&1 || true
  exit "$exit_code"
}
trap cleanup EXIT INT TERM

echo "📦 Starting FromFatToFit local environment"

# Activate backend virtual environment if it exists
if [[ -d "$BACKEND_VENV" ]]; then
  # shellcheck source=/dev/null
  source "$BACKEND_VENV/bin/activate"
  echo "✅ Activated backend virtual environment: $BACKEND_VENV"
else
  echo "⚠️  Backend virtual environment not found at $BACKEND_VENV"
  echo "   Create it with: python -m venv backend/venv && source backend/venv/bin/activate && pip install -r backend/requirements.txt"
fi

echo "🚀 Launching FastAPI backend on http://127.0.0.1:8000"
(
  cd "$BACKEND_DIR"
  uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
) &
BACKEND_PID=$!
sleep 2

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  echo "📥 Installing frontend dependencies"
  (
    cd "$FRONTEND_DIR"
    npm install
  )
fi

echo "🌐 Launching Next.js frontend on http://127.0.0.1:3000"
(
  cd "$FRONTEND_DIR"
  npm run dev -- --hostname 127.0.0.1 --port 3000
) &
FRONTEND_PID=$!

echo
echo "✅ Local environment running:"
echo "   - Backend:  http://127.0.0.1:8000/docs"
echo "   - Frontend: http://127.0.0.1:3000"
echo
echo "Press Ctrl+C to stop both services."

wait

