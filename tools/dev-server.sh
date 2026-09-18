#!/usr/bin/env bash
# Manages the Vite dev server as a background process: start, stop, restart, status.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="$ROOT_DIR/.dev-server"
PID_FILE="$STATE_DIR/pid"
LOG_FILE="$STATE_DIR/dev.log"

ensure_npm() {
  if command -v npm >/dev/null 2>&1; then
    return
  fi
  # npm isn't on PATH outside an interactive shell: load nvm explicitly.
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  # shellcheck disable=SC1091
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  if ! command -v npm >/dev/null 2>&1; then
    echo "npm not found (checked PATH and nvm at $NVM_DIR)" >&2
    exit 1
  fi
}

is_running() {
  [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null
}

do_start() {
  if is_running; then
    echo "Dev server already running (PID $(cat "$PID_FILE")). Try: $0 restart"
    return
  fi
  ensure_npm
  mkdir -p "$STATE_DIR"
  cd "$ROOT_DIR"
  nohup npm run dev -- --host >"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"
  sleep 1
  if is_running; then
    echo "Dev server started (PID $(cat "$PID_FILE")). Log: $LOG_FILE"
    grep -m1 'Network:' "$LOG_FILE" 2>/dev/null || true
  else
    echo "Dev server failed to start, see $LOG_FILE" >&2
    exit 1
  fi
}

do_stop() {
  if ! is_running; then
    echo "Dev server not running."
    rm -f "$PID_FILE"
    return
  fi
  local pid
  pid="$(cat "$PID_FILE")"
  # Kill the whole process group: npm spawns vite as a child process.
  kill -- "-$(ps -o pgid= "$pid" | tr -d ' ')" 2>/dev/null || kill "$pid" 2>/dev/null || true
  for _ in $(seq 1 10); do
    is_running || break
    sleep 0.5
  done
  rm -f "$PID_FILE"
  echo "Dev server stopped."
}

do_status() {
  if is_running; then
    echo "Dev server running (PID $(cat "$PID_FILE"))."
  else
    echo "Dev server not running."
  fi
}

case "${1:-}" in
  start) do_start ;;
  stop) do_stop ;;
  restart) do_stop; do_start ;;
  status) do_status ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}" >&2
    exit 1
    ;;
esac
