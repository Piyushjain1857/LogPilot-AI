import pytest
from app.models.source import LogSource
from app.models.log import LogEntry


def test_log_sources_crud(client, db_session):
    # 1. Create source
    create_res = client.post(
        "/api/v1/log-sources",
        json={
            "name": "Production Kubernetes",
            "service_name": "k8s-cluster",
            "source_type": "file",
            "description": "Production pod log streams",
        },
    )
    assert create_res.status_code == 201
    source_data = create_res.json()
    assert source_data["name"] == "Production Kubernetes"
    src_id = source_data["id"]

    # 2. Get source
    get_res = client.get(f"/api/v1/log-sources/{src_id}")
    assert get_res.status_code == 200
    assert get_res.json()["service_name"] == "k8s-cluster"
    assert get_res.json()["total_records"] == 0

    # 3. Update source
    patch_res = client.patch(
        f"/api/v1/log-sources/{src_id}",
        json={"name": "Staging Kubernetes", "status": "paused"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["name"] == "Staging Kubernetes"
    assert patch_res.json()["status"] == "paused"

    # 4. List sources
    list_res = client.get("/api/v1/log-sources")
    assert list_res.status_code == 200
    assert list_res.json()["total"] >= 1
