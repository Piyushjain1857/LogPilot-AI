#!/usr/bin/env bash
set -e

# LogPilot AI — Setup Script
# Checks prerequisites, prepares virtual environment, installs dependencies, and initializes DB.

echo "=========================================================="
echo "          LogPilot AI — Full-Stack Setup (Phase 1)        "
echo "=========================================================="

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "--> Checking environment prerequisites..."

# 1. Check Python
PYTHON_BIN=""
if command -v python3.12 >/dev/null 2>&1; then
    PYTHON_BIN="python3.12"
elif [ -f "/Users/piyush/.local/bin/python3.12" ]; then
    PYTHON_BIN="/Users/piyush/.local/bin/python3.12"
elif command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="python3"
else
    echo "ERROR: Python 3.11 or 3.12 is required but not found."
    exit 1
fi
echo "✓ Python executable: $($PYTHON_BIN --version)"

# 2. Check Node & npm
if ! command -v node >/dev/null 2>&1; then
    echo "ERROR: Node.js is required but not found."
    exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
    echo "ERROR: npm is required but not found."
    exit 1
fi
echo "✓ Node.js version: $(node -v)"
echo "✓ npm version: $(npm -v)"

# 3. Check Git
if command -v git >/dev/null 2>&1; then
    echo "✓ Git version: $(git --version)"
fi

# 4. Create environment files from examples if missing
echo "--> Checking environment configuration files..."
if [ ! -f "backend/.env" ]; then
    echo "Creating backend/.env from backend/.env.example"
    cp backend/.env.example backend/.env
else
    echo "✓ backend/.env exists"
fi

if [ ! -f "frontend/.env" ]; then
    echo "Creating frontend/.env from frontend/.env.example"
    cp frontend/.env.example frontend/.env
else
    echo "✓ frontend/.env exists"
fi

# 5. Set up Python virtual environment in backend/.venv
echo "--> Setting up Python virtual environment..."
VENV_DIR="$PROJECT_ROOT/backend/.venv"
if [ ! -d "$VENV_DIR" ]; then
    $PYTHON_BIN -m venv "$VENV_DIR"
    echo "✓ Virtual environment created at $VENV_DIR"
else
    echo "✓ Existing virtual environment found at $VENV_DIR"
fi

# Activate virtual environment
source "$VENV_DIR/bin/activate"
pip install --upgrade pip setuptools wheel

# 6. Install backend dependencies
echo "--> Installing backend dependencies..."
pip install -r "$PROJECT_ROOT/backend/requirements.txt"

# 7. Install frontend dependencies
echo "--> Installing frontend dependencies..."
cd "$PROJECT_ROOT/frontend"
npm install
cd "$PROJECT_ROOT"

# 8. Initialize database
echo "--> Initializing LogPilot AI SQLite database..."
PYTHONPATH="$PROJECT_ROOT/backend" python -c "
from app.database.session import init_db
init_db()
print('✓ Database tables initialized successfully.')
"

echo ""
echo "=========================================================="
echo "  LogPilot AI Setup Completed Successfully!               "
echo "=========================================================="
echo "To start development servers:"
echo "  ./scripts/dev.sh"
echo ""
echo "Or start individually:"
echo "  Backend:  cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000"
echo "  Frontend: cd frontend && npm run dev"
echo "=========================================================="
