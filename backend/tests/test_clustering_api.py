import pytest
import datetime
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.log import LogEntry
from app.models.source import LogSource
from app.models.cluster import LogCluster


def test_clustering_mining_and_lifecycle(client: TestClient, db_session: Session):
    """
    Test Drain3 template mining, signature generation, cluster querying, and lifecycle transitions.
    """
    # 1. Create a log source
    src = LogSource(
        name="Payment Gateway",
        source_type="file",
        service_name="payment-service",
        status="active",
    )
    db_session.add(src)
    db_session.commit()
    db_session.refresh(src)

    now = datetime.datetime.now(datetime.timezone.utc)

    # Seed 5 logs with template: "Payment timeout for user <NUM> on gateway <IP>"
    for i in range(5):
        msg = f"Payment timeout for user {1000 + i} on gateway 192.168.1.{10 + i}"
        entry = LogEntry(
            source_id=src.id,
            service_name="payment-service",
            severity="ERROR",
            message=msg,
            raw_message=msg,
            timestamp=now - datetime.timedelta(minutes=i * 2),
            trace_id=f"tr-pay-{i}",
        )
        db_session.add(entry)

    # Seed 3 logs with template: "Authentication failed for user <UUID>"
    for i in range(3):
        fake_uuid = f"550e8400-e29b-41d4-a716-44665544000{i}"
        msg = f"Authentication failed for user {fake_uuid}"
        entry = LogEntry(
            source_id=src.id,
            service_name="payment-service",
            severity="WARNING",
            message=msg,
            raw_message=msg,
            timestamp=now - datetime.timedelta(minutes=i * 3),
            trace_id=f"tr-auth-{i}",
        )
        db_session.add(entry)

    db_session.commit()

    # 2. Trigger Batch Clustering
    mine_resp = client.post(
        "/api/v1/clusters/mine",
        json={"service_name": "payment-service", "hours": 24, "limit": 100},
    )
    assert mine_resp.status_code == 200
    mine_data = mine_resp.json()
    assert mine_data["status"] == "COMPLETED"
    assert mine_data["logs_processed"] >= 8
    assert mine_data["clusters_created"] >= 2

    # 3. List clusters
    list_resp = client.get("/api/v1/clusters?service=payment-service&status=ACTIVE")
    assert list_resp.status_code == 200
    clusters = list_resp.json()["items"]
    assert len(clusters) >= 2

    # Verify template mining
    templates = [c["template"] for c in clusters]
    assert any("Payment timeout for user" in t for t in templates)

    first_cluster = clusters[0]
    cluster_id = first_cluster["id"]
    assert first_cluster["service_name"] == "payment-service"
    assert first_cluster["status"] == "ACTIVE"
    assert first_cluster["occurrence_count"] >= 1

    # 4. Search clusters by query term
    search_resp = client.get("/api/v1/clusters?search=timeout")
    assert search_resp.status_code == 200
    search_items = search_resp.json()["items"]
    assert len(search_items) >= 1

    # 5. Get cluster detail
    detail_resp = client.get(f"/api/v1/clusters/{cluster_id}")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["id"] == cluster_id
    assert "timeline" in detail
    assert "member_logs" in detail

    # 6. Status update: ACTIVE -> MUTED -> RESOLVED
    mute_resp = client.patch(
        f"/api/v1/clusters/{cluster_id}/status",
        json={"status": "MUTED"},
    )
    assert mute_resp.status_code == 200
    assert mute_resp.json()["status"] == "MUTED"

    resolve_resp = client.patch(
        f"/api/v1/clusters/{cluster_id}/status",
        json={"status": "RESOLVED"},
    )
    assert resolve_resp.status_code == 200
    assert resolve_resp.json()["status"] == "RESOLVED"

    # 7. Cluster statistics
    stats_resp = client.get("/api/v1/clusters/statistics")
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert "total_clusters" in stats
    assert "resolved_clusters" in stats
    assert stats["resolved_clusters"] >= 1
    assert "top_clusters" in stats
