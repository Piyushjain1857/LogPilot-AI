#!/usr/bin/env python3
"""
LogPilot AI — Universal Multi-Service Development Launcher
Starts the entire LogPilot AI platform concurrently:
  1. FastAPI Backend:       http://127.0.0.1:8000
  2. Vite Frontend:         http://localhost:5173
  3. Hackathon Fault Demo:  http://localhost:5174

Gracefully intercepts Ctrl+C (SIGINT) to shut down all background child processes.
"""
import os
import sys
import time
import signal
import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"
DEMO_DIR = ROOT_DIR / "demo-app"

VENV_PYTHON = BACKEND_DIR / ".venv" / "bin" / "python3"
VENV_UVICORN = BACKEND_DIR / ".venv" / "bin" / "uvicorn"

processes = []

def signal_handler(sig, frame):
    print("\n🛑 Received shutdown signal. Terminating LogPilot AI services...")
    for proc, name in processes:
        if proc.poll() is None:
            print(f"   Shutting down {name} (PID: {proc.pid})...")
            try:
                proc.terminate()
                proc.wait(timeout=3)
            except Exception:
                proc.kill()
    print("✓ All services stopped cleanly.")
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

def main():
    python_bin = str(VENV_PYTHON) if VENV_PYTHON.exists() else sys.executable
    uvicorn_bin = str(VENV_UVICORN) if VENV_UVICORN.exists() else "uvicorn"

    print("======================================================================")
    print("🚀  LogPilot AI — Enterprise Observability & Website Monitoring")
    print("======================================================================")
    print(f"📁 Workspace Root:  {ROOT_DIR}")
    print(f"🐍 Python Runtime:  {python_bin}")
    print("======================================================================")

    # 1. Start Backend
    print("--> [1/3] Starting FastAPI Backend on http://127.0.0.1:8000...")
    backend_env = os.environ.copy()
    backend_env["PYTHONPATH"] = str(BACKEND_DIR)
    backend_proc = subprocess.Popen(
        [uvicorn_bin, "app.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
        cwd=str(BACKEND_DIR),
        env=backend_env,
    )
    processes.append((backend_proc, "FastAPI Backend"))

    # 2. Start Hackathon Demo Application
    print("--> [2/3] Starting Hackathon Fault Demo App on http://localhost:5174...")
    demo_script = DEMO_DIR / "server.py"
    demo_proc = subprocess.Popen(
        [python_bin, str(demo_script)],
        cwd=str(DEMO_DIR),
    )
    processes.append((demo_proc, "Fault Demo App"))

    # 3. Start Frontend
    print("--> [3/3] Starting Vite Frontend on http://localhost:5173...")
    frontend_proc = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=str(FRONTEND_DIR),
    )
    processes.append((frontend_proc, "Vite Frontend"))

    time.sleep(2)
    print("")
    print("======================================================================")
    print("✨  LogPilot AI Platform Ready for Evaluation:")
    print("   • Observability Console:   http://localhost:5173/app/websites")
    print("   • Live Fault Demo App:     http://localhost:5174")
    print("   • Backend API & Docs:      http://127.0.0.1:8000/docs")
    print("   • Health Check Probe:      http://127.0.0.1:8000/api/v1/health")
    print("======================================================================")
    print("Press Ctrl+C to terminate all servers.\n")

    while True:
        time.sleep(1)
        for proc, name in processes:
            if proc.poll() is not None:
                print(f"⚠️  Process '{name}' exited with code {proc.returncode}.")
                signal_handler(None, None)

if __name__ == "__main__":
    main()
