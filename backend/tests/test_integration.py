import os
import tempfile
import pytest
from sqlalchemy import create_engine
from starlette.testclient import TestClient
from app.database.session import Base, get_db
from app.main import app
from app.models.source import LogSource
from app.models.log import LogEntry
from app.models.incident import Incident
from datetime import datetime, timezone


def test_end_to_end_integration_flow():
    """
    Smoke test simulating real backend startup with file-based SQLite database,
    verifying table creation, live counts query, and API responses.
    """
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp_db:
        db_path = tmp_db.name

    try:
        engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=engine)

        from sqlalchemy.orm import sessionmaker
        Session = sessionmaker(bind=engine)
        session = Session()

        def override_get_db():
            try:
                yield session
            finally:
                pass

        app.dependency_overrides[get_db] = override_get_db

        with TestClient(app) as client:
            # 1. Health probe
            health_res = client.get("/api/v1/health")
            assert health_res.status_code == 200
            assert health_res.json()["status"] == "healthy"

            # 2. System Status probe
            status_res = client.get("/api/v1/system/status")
            assert status_res.status_code == 200
            assert status_res.json()["database_connected"] is True

            # 3. Initially empty summary
            summary_res = client.get("/api/v1/overview/summary")
            assert summary_res.status_code == 200
            assert summary_res.json()["total_logs"] == 0

            # 4. Insert real records into the DB
            src = LogSource(
                name="Payment Service",
                source_type="microservice",
                service_name="payment-service",
            )
            session.add(src)
            session.commit()

            entry = LogEntry(
                source_id=src.id,
                timestamp=datetime.now(timezone.utc),
                severity="ERROR",
                service_name="payment-service",
                message="Stripe timeout",
                raw_message="[ERROR] Stripe timeout",
            )
            inc = Incident(
                title="Payment Outage",
                description="Gateway timeout",
                severity="CRITICAL",
                status="active",
            )
            session.add_all([entry, inc])
            session.commit()

            # 5. Query summary again and verify updated counts
            summary_updated = client.get("/api/v1/overview/summary")
            assert summary_updated.status_code == 200
            data = summary_updated.json()
            assert data["total_logs"] == 1
            assert data["error_logs"] == 1
            assert data["configured_sources"] == 1
            assert data["active_incidents"] == 1

        app.dependency_overrides.clear()
        session.close()
    finally:
        if os.path.exists(db_path):
            os.remove(db_path)
