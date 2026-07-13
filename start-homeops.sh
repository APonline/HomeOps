#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$ROOT_DIR/homeops-api"
APP_DIR="$ROOT_DIR/homeops-app"

if [[ ! -f "$API_DIR/artisan" || ! -f "$APP_DIR/package.json" ]]; then
  echo "Run this script from the folder containing homeops-api and homeops-app."
  exit 1
fi

cleanup() {
  if [[ -n "${API_PID:-}" ]] && kill -0 "$API_PID" 2>/dev/null; then
    kill "$API_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "Starting HomeOps API at http://127.0.0.1:8000 ..."
(
  cd "$API_DIR"
  php artisan serve --host=127.0.0.1 --port=8000
) &
API_PID=$!

sleep 1

if ! kill -0 "$API_PID" 2>/dev/null; then
  echo "The HomeOps API did not start. Check the Laravel terminal output above."
  exit 1
fi

echo "Starting HomeOps frontend ..."
cd "$APP_DIR"
npm run start
