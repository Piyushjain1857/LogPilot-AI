#!/usr/bin/env bash

# LogPilot AI — Development Server Launcher
# Starts both FastAPI backend and Vite frontend and gracefully shuts down on Ctrl+C.

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "=========================================================="
echo "          LogPilot AI — Starting Local Dev Environment     "
echo "=========================================================="

VENV_PYTHON="$PROJECT_ROOT/backend/.venv/bin/python"
if [ ! -f "$VENV_PYTHON" ]; then
    echo "Virtual environment not found at $VENV_PYTHON. Running setup first..."
    ./scripts/setup.sh
fi

BACKEND_PID=""
FRONTEND_PID=""
DEMO_PID=""

cleanup() {
    echo ""
    echo "--> Shutting down LogPilot AI services..."
    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        echo "Stopping Backend (PID: $BACKEND_PID)..."
        kill -TERM "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$DEMO_PID" ] && kill -0 "$DEMO_PID" 2>/dev/null; then
        echo "Stopping Fault Demo App (PID: $DEMO_PID)..."
        kill -TERM "$DEMO_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        echo "Stopping Frontend (PID: $FRONTEND_PID)..."
        kill -TERM "$FRONTEND_PID" 2>/dev/null || true
    fi
    wait "$BACKEND_PID" 2>/dev/null || true
    wait "$DEMO_PID" 2>/dev/null || true
    wait "$FRONTEND_PID" 2>/dev/null || true
    echo "✓ All services stopped cleanly."
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Start Backend
echo "--> Starting FastAPI Backend on http://127.0.0.1:8000..."
cd "$PROJECT_ROOT/backend"
source .venv/bin/activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

# Start Hackathon Fault Demo
echo "--> Starting Hackathon Fault Demo on http://localhost:5174..."
cd "$PROJECT_ROOT"
python3 demo-app/server.py &
DEMO_PID=$!

# Start Frontend
echo "--> Starting Vite Frontend on http://localhost:5173..."
cd "$PROJECT_ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

cd "$PROJECT_ROOT"

sleep 2

echo ""
echo "=========================================================="
echo "🚀 LogPilot AI Services are running:"
echo "   • Observability Console: http://localhost:5173/app/websites"
echo "   • Fault Injection Demo:  http://localhost:5174"
echo "   • FastAPI Backend:       http://127.0.0.1:8000"
echo "   • Swagger API Docs:      http://127.0.0.1:8000/docs"
echo "=========================================================="
echo "Press Ctrl+C to stop both servers."
echo ""

# Wait for children
wait
