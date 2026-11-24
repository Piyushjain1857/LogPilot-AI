# ==============================================================================
# LogPilot AI — Multi-Stage Production Dockerfile
# Detect. Diagnose. Resolve.
# Tech Fusion 4.0 — Codestorm (PS-01A)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Frontend Assets (Node.js 20 Alpine)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Runtime Production Image (Python 3.12 Slim)
# ------------------------------------------------------------------------------
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/backend \
    PORT=8000 \
    HOST=0.0.0.0

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python backend requirements
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r ./backend/requirements.txt

# Copy backend application code
COPY backend/ ./backend/

# Copy simulators & sample logs
COPY simulators/ ./simulators/
COPY sample-logs/ ./sample-logs/

# Copy compiled frontend dist from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create storage directory for SQLite persistence
RUN mkdir -p /app/storage /app/storage/uploads

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

CMD ["python", "-m", "uvicorn", "app.main:app", "--app-dir", "backend", "--host", "0.0.0.0", "--port", "8000"]
