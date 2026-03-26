#!/bin/bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
APP_NAME="pingpong-tourney"
PORT=3001
FRONTEND_PORT=3002

if [ "${1:-}" = "--stop" ]; then
    tmux kill-session -t "${APP_NAME}-backend" 2>/dev/null && echo "Stopped backend" || echo "Backend not running"
    tmux kill-session -t "${APP_NAME}-frontend" 2>/dev/null && echo "Stopped frontend" || echo "Frontend not running"
    exit 0
fi

# Stop existing sessions
tmux kill-session -t "${APP_NAME}-backend" 2>/dev/null || true
tmux kill-session -t "${APP_NAME}-frontend" 2>/dev/null || true

# Start backend
tmux new-session -d -s "${APP_NAME}-backend" \
    "cd $DIR/backend && source .venv/bin/activate && PORT=$PORT uvicorn app.main:app --host 0.0.0.0 --port $PORT --reload 2>&1 | tee $DIR/backend.log"

# Start frontend
tmux new-session -d -s "${APP_NAME}-frontend" \
    "cd $DIR/frontend && npm run dev 2>&1 | tee $DIR/frontend.log"

echo "Started $APP_NAME"
echo "  Backend:  http://localhost:$PORT (tmux: ${APP_NAME}-backend)"
echo "  Frontend: http://localhost:$FRONTEND_PORT (tmux: ${APP_NAME}-frontend)"
echo "  Public:   https://${APP_NAME}.scrytime.com"
echo "  Stop:     $0 --stop"
