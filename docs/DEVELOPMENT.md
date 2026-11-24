# LogPilot AI — Development Guide

## Prerequisites

- **macOS** (compatible with Apple Silicon M1/M2/M3/M4 and Intel)
- **Node.js**: v20+ or v24+ (verified with v24.19.0)
- **npm**: v10+ (verified with 11.17.0)
- **Python**: 3.11 or 3.12 (verified with 3.12.13 at `/Users/piyush/.local/bin/python3.12`)
- **Git**: v2.40+

---

## Architectural Guidelines & Constraints

1. **Strictly No TypeScript:** All frontend code must use JavaScript ES6+ (`.jsx` / `.js`).
2. **Strictly No CSS Frameworks:** No Tailwind CSS, No Bootstrap. Use clean, modular Regular CSS with CSS custom properties (`var(--...)`).
3. **Strictly FastAPI on Backend:** Do not introduce Node.js or Express into the backend.
4. **No Secret Leaks:** Never expose `GEMINI_API_KEY` to frontend bundle or API responses.
5. **No Fabricated Data:** The backend queries actual database tables. Return zero if empty; do not invent fake telemetry.
6. **No Arbitrary Execution:** Remediation execution is disabled (`ENABLE_REMEDIATION_EXECUTION=false`).

---

## Quick Setup

Run the automated setup script from the project root:

```bash
chmod +x scripts/setup.sh scripts/dev.sh
./scripts/setup.sh
```

This will:
1. Verify Python, Node, npm, and Git versions.
2. Initialize `backend/.env` and `frontend/.env` from `.env.example` templates.
3. Create `backend/.venv` using Python 3.12.
4. Install all Python dependencies into the venv.
5. Install all Node dependencies in `frontend/`.
6. Initialize the SQLite database schema via SQLAlchemy.

---

## Running Development Servers

Start both backend and frontend concurrently:

```bash
./scripts/dev.sh
```

- Frontend: `http://localhost:5173`
- Backend: `http://127.0.0.1:8000`
- Swagger Docs: `http://127.0.0.1:8000/docs`

To stop, simply press `Ctrl+C`. Both background child processes will be cleanly terminated.

---

## Running Tests

### Backend Tests
```bash
cd backend
source .venv/bin/activate
python -m pytest -v
```

### Frontend Tests & Lint
```bash
cd frontend
npm run lint
npm run test -- --run
npm run build
```
