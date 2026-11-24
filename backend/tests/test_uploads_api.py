import io
import pytest
from app.models.source import LogSource
from app.models.upload_batch import UploadBatch


def test_upload_preview_endpoint(client):
    csv_data = b"timestamp,severity,service,message\n2026-11-24T10:00:00Z,INFO,api-gateway,Request ok\n"
    response = client.post(
        "/api/v1/uploads/preview",
        files={"file": ("test.csv", io.BytesIO(csv_data), "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "test.csv"
    assert data["file_format"] == "CSV"
    assert "timestamp" in data["detected_columns"]
    assert len(data["preview_records"]) == 1


def test_upload_creation_and_lifecycle(client, db_session, monkeypatch):
    from tests.conftest import TestingSessionLocal
    monkeypatch.setattr("app.ingestion.ingestion_pipeline.SessionLocal", TestingSessionLocal)
    monkeypatch.setattr("app.services.upload_service.ingestion_manager.submit_job", lambda **kw: None)

    # 1. Create source
    src = LogSource(name="API Source", source_type="file", service_name="api-gateway")
    db_session.add(src)
    db_session.commit()

    log_data = b"2026-11-24T10:00:00Z [INFO] [api-gateway] Incoming call\n"
    response = client.post(
        "/api/v1/uploads",
        files={"file": ("app.log", io.BytesIO(log_data), "text/plain")},
        data={"source_id": src.id},
    )
    assert response.status_code == 202
    res_data = response.json()
    assert res_data["status"] == "PENDING"
    upload_id = res_data["upload_id"]

    # 2. Get upload details
    get_res = client.get(f"/api/v1/uploads/{upload_id}")
    assert get_res.status_code == 200
    assert get_res.json()["original_filename"] == "app.log"

    # 3. List uploads
    list_res = client.get("/api/v1/uploads")
    assert list_res.status_code == 200
    assert list_res.json()["total"] >= 1


def test_upload_duplicate_conflict(client, db_session, monkeypatch):
    from tests.conftest import TestingSessionLocal
    monkeypatch.setattr("app.ingestion.ingestion_pipeline.SessionLocal", TestingSessionLocal)
    monkeypatch.setattr("app.services.upload_service.ingestion_manager.submit_job", lambda **kw: None)

    src = LogSource(name="API Source", source_type="file", service_name="api-gateway")
    db_session.add(src)
    db_session.commit()

    log_data = b"2026-11-24T10:00:00Z [INFO] [api-gateway] Static content for duplicate check\n"
    # First upload
    res1 = client.post(
        "/api/v1/uploads",
        files={"file": ("unique.log", io.BytesIO(log_data), "text/plain")},
        data={"source_id": src.id},
    )
    assert res1.status_code == 202
    u_id = res1.json()["upload_id"]

    # Mark first upload as COMPLETED
    b = db_session.query(UploadBatch).filter(UploadBatch.id == u_id).first()
    b.status = "COMPLETED"
    db_session.commit()

    # Second upload with identical bytes without confirm_duplicate -> 409
    res2 = client.post(
        "/api/v1/uploads",
        files={"file": ("unique.log", io.BytesIO(log_data), "text/plain")},
        data={"source_id": src.id, "confirm_duplicate": "false"},
    )
    assert res2.status_code == 409
    detail = res2.json()["detail"]
    assert detail["is_duplicate"] is True

    # Re-import with confirm_duplicate=true -> 202
    res3 = client.post(
        "/api/v1/uploads",
        files={"file": ("unique.log", io.BytesIO(log_data), "text/plain")},
        data={"source_id": src.id, "confirm_duplicate": "true"},
    )
    assert res3.status_code == 202
