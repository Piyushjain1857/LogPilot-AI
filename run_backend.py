#!/usr/bin/env python3
"""
LogPilot AI — Universal Backend Launcher.
Ensures correct virtual environment, python path, and starts Uvicorn cleanly.
"""
import os
import sys
import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
VENV_PYTHON = BACKEND_DIR / ".venv" / "bin" / "python3"
VENV_UVICORN = BACKEND_DIR / ".venv" / "bin" / "uvicorn"

def main():
    os.chdir(str(BACKEND_DIR))
    if str(BACKEND_DIR) not in sys.path:
        sys.path.insert(0, str(BACKEND_DIR))

    python_executable = str(VENV_PYTHON) if VENV_PYTHON.exists() else sys.executable
    uvicorn_executable = str(VENV_UVICORN) if VENV_UVICORN.exists() else "uvicorn"

    print("==================================================")
    print("🚀 Starting LogPilot AI Backend on http://127.0.0.1:8000")
    print(f"📁 Working Directory: {BACKEND_DIR}")
    print(f"🐍 Python Executable: {python_executable}")
    print("📖 API Documentation: http://127.0.0.1:8000/docs")
    print("💡 Health Check:     http://127.0.0.1:8000/api/v1/health")
    print("==================================================")

    cmd = [
        str(uvicorn_executable),
        "app.main:app",
        "--host", "127.0.0.1",
        "--port", "8000",
        "--reload",
    ]
    try:
        subprocess.run(cmd, cwd=str(BACKEND_DIR))
    except KeyboardInterrupt:
        print("\n🛑 Backend server stopped.")

if __name__ == "__main__":
    main()
