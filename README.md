# LogPilot AI — Detect. Diagnose. Resolve.

**Hackathon:** Tech Fusion 4.0 — Codestorm  
**Track:** Enterprise & Industry  
**Problem Statement ID:** PS-01A  
**Problem Statement:** Logs Analyser & Troubleshooter Agent  
**Domain:** AIOps and Autonomous Debugging  

---

## Project Overview

Modern cloud architectures and distributed microservices produce massive volumes of high-velocity system logs. When incidents strike, engineers face alert fatigue, noisy logs, and fragmented telemetry across disparate services.

**LogPilot AI** is an intelligent AIOps agent designed to automate the entire lifecycle of log incident triage:
1. **Ingest & Parse:** High-throughput streaming and batch log normalization using Drain3 pattern mining.
2. **Detect & Cluster:** Statistical and template-based anomaly detection to filter signal from noise.
3. **Correlate:** Distributed trace ID correlation and microservice topology mapping.
4. **Diagnose:** LLM-powered root cause analysis using the Google Gen AI SDK (Gemini).
5. **Remediate:** Generating human-in-the-loop, actionable remediation playbooks and runbooks.

---

## Current Status (Phase 1: Full-Stack Project Foundation)

Phase 1 establishes the enterprise-grade full-stack monorepo foundation:
- Modular, decoupled architecture separating frontend and backend.
- SQLite database persistence with SQLAlchemy 2.0 ORM models for logs, clusters, incidents, analysis runs, and playbooks.
- FastAPI backend with structured error handling, request ID tracing, process timing, and restricted CORS.
- React 18 frontend built with Vite and pure CSS (Zero Tailwind, Zero Bootstrap).
- Complete 12-page application route structure with active Overview dashboard and transparent placeholders for future phases.
- Truthful database-driven summary metrics (zero counts when empty, no fabricated stats).
- Synthetic multi-scenario test dataset in plain log, JSONL, and CSV formats.
- Comprehensive automated test suites (Pytest + Vitest + React Testing Library).

---

## Technology Stack

### Frontend
- **Framework:** React 18 (JavaScript ES6+, JSX)
- **Build Tool:** Vite
- **Styling:** Pure Modern CSS with CSS custom variables (Dark AIOps theme)
- **Routing:** React Router DOM (v6)
- **HTTP Client:** Axios
- **Icons:** Lucide React
- **Data Visualization:** Recharts
- **Topology / Flow Diagrams:** React Flow

### Backend
- **Framework:** FastAPI (Python 3.12)
- **ASGI Server:** Uvicorn
- **Validation:** Pydantic v2 & Pydantic Settings
- **Database & ORM:** SQLAlchemy 2.0 with SQLite (Foreign Key Enforcement enabled)
- **Data Processing:** Pandas, NumPy, Scikit-learn
- **Log Parsing:** Drain3 template miner
- **AI Core:** Google Gen AI SDK (`google-genai`)
- **HTTP / Async:** HTTPX, WebSockets

### Quality & CI/CD
- **Testing:** Pytest, Vitest, React Testing Library
- **Linting:** ESLint
- **Automation:** Bash scripts (`setup.sh`, `dev.sh`), GitHub Actions CI (`ci.yml`)

---

## Monorepo Directory Structure

```text
LogPilot-AI/
├── frontend/                     # React + Vite client
│   ├── public/                   # Static assets & favicon
│   ├── src/
│   │   ├── assets/               # Branding graphics
│   │   ├── components/           # Reusable UI primitives & layouts
│   │   │   ├── common/           # Button, Card, Badge, Modal, etc.
│   │   │   ├── layout/           # AppShell, Sidebar, Header, Breadcrumbs
│   │   │   ├── dashboard/        # Overview metric cards
│   │   │   ├── logs/             # Severity badges, log components
│   │   │   ├── incidents/        # Incident components
│   │   │   └── charts/           # Chart components
│   │   ├── pages/                # 12 application route views
│   │   ├── services/             # Axios API client & endpoints
│   │   ├── hooks/                # Custom React hooks
│   │   ├── context/              # Application state context
│   │   ├── config/               # App configuration & constants
│   │   ├── utils/                # Formatting & normalization helpers
│   │   ├── styles/               # CSS variables, reset & component styles
│   │   ├── tests/                # Vitest & RTL test suites
│   │   ├── App.jsx               # Application root & routing
│   │   └── main.jsx              # React DOM entry point
│   ├── .env.example              # Frontend environment template
│   ├── package.json              # NPM dependencies & scripts
│   └── vite.config.js            # Vite build configuration
├── backend/                      # Python FastAPI application
│   ├── app/
│   │   ├── api/v1/endpoints/     # Versioned REST API endpoints
│   │   ├── core/                 # App configuration & logging
│   │   ├── models/               # SQLAlchemy ORM database models
│   │   ├── schemas/              # Pydantic request & response models
│   │   ├── services/             # Business logic layer
│   │   ├── agents/               # Gemini AI agent integration hooks
│   │   ├── parsers/              # Drain3 & regex log parsers
│   │   ├── ingestion/            # File & stream log intake
│   │   ├── analytics/            # Statistical anomaly detection
│   │   ├── clustering/           # Log template clustering
│   │   ├── correlation/          # Trace & microservice correlation
│   │   ├── remediation/          # Playbook generation & safety guard
│   │   ├── websocket/            # Real-time WebSocket manager
│   │   ├── database/             # SQLAlchemy engine & session factory
│   │   ├── middleware/           # Request ID, CORS & Process Time
│   │   ├── utils/                # Sensitive data redaction utility
│   │   └── main.py               # FastAPI application entry point
│   ├── tests/                    # Pytest backend test suite
│   ├── storage/                  # Local isolated file directories
│   │   ├── uploads/              # Ingested raw files
│   │   ├── processed/            # Normalized log stores
│   │   └── reports/              # Exported audit reports
│   ├── .env.example              # Backend environment template
│   └── requirements.txt          # Python dependencies
├── sample-data/                  # Synthetic benchmark logs
│   ├── synthetic_logs.log        # Plain text logs
│   ├── synthetic_logs.jsonl      # JSON Lines logs
│   ├── synthetic_logs.csv        # Tabular logs
│   └── README.md                 # Scenario documentation
├── docs/                         # Technical documentation
│   ├── ARCHITECTURE.md           # System design & pipeline
│   ├── API_DOCUMENTATION.md      # OpenAPI specification reference
│   └── DEVELOPMENT.md            # Developer setup guide
├── scripts/                      # Developer tooling scripts
│   ├── setup.sh                  # One-click environment installer
│   └── dev.sh                    # Dual-server runner with graceful shutdown
├── .github/workflows/ci.yml      # GitHub Actions CI workflow
├── .gitignore                    # Monorepo git exclusion rules
└── README.md                     # Project master documentation
```

---

## Getting Started

### 1. Prerequisites
Ensure you have Node.js (v20+), npm, and Python 3.11 or 3.12 installed on your machine.

### 2. Setup
Run the automated setup script:
```bash
./scripts/setup.sh
```

### 3. Start Development Servers
```bash
./scripts/dev.sh
```
Open your browser to:
- **Frontend App:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive Swagger Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## Testing

Run backend tests:
```bash
cd backend
source .venv/bin/activate
python -m pytest -v
```

Run frontend tests, linting, and build:
```bash
cd frontend
npm run lint
npm run test -- --run
npm run build
```

---

## Security Foundation

- **Zero Secret Exposure:** Frontend never receives or stores Gemini API keys.
- **Data Redaction:** Built-in regex sanitization strips Bearer tokens, private keys, passwords, and API secrets.
- **Safe Execution Boundary:** Remediation command execution is disabled by default (`ENABLE_REMEDIATION_EXECUTION=false`).
- **Untrusted Input Handling:** Logs are treated as arbitrary text without shell evaluation.
- **Security Notice:** Authentication and role-based access control are not yet implemented; this Phase 1 foundation is designed for local development and benchmarking. High-throughput production deployments would replace SQLite with TimescaleDB / ClickHouse and an external message queue.

---

## Roadmap

- **Phase 1 (Complete):** Monorepo architecture, database models, core API, dark AIOps design system, overview dashboard.
- **Phase 2:** Drain3 log template parsing, high-throughput file ingestion, and statistical anomaly detection.
- **Phase 3:** Error clustering engine and distributed trace correlation.
- **Phase 4:** Gemini AI agent root cause diagnosis and playbook generator with human-in-the-loop validation.
- **Phase 5:** Production readiness, performance benchmarking, and live telemetry streaming.
