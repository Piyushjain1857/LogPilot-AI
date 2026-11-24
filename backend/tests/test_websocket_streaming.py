import json
import time
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.source import LogSource
from app.models.stream_event import StreamEvent
from app.database.session import SessionLocal

client = TestClient(app)


def test_stream_status_and_metrics_endpoints():
    status_resp = client.get("/api/v1/stream/status")
    assert status_resp.status_code == 200
    data = status_resp.json()
    assert data["service_status"] == "ONLINE"
    assert "queue_depth" in data
    assert "queue_capacity" in data

    metrics_resp = client.get("/api/v1/stream/metrics")
    assert metrics_resp.status_code == 200
    m_data = metrics_resp.json()
    assert "total_received" in m_data
    assert "logs_per_second" in m_data
    assert "requests_per_minute" in m_data
    assert "severity_distribution" in m_data


def test_stream_events_replay_endpoint():
    db = SessionLocal()
    # Insert a synthetic stream event
    ev = StreamEvent(
        event_type="log.created",
        payload_json=json.dumps({
            "id": "log-test-1",
            "severity": "CRITICAL",
            "service_name": "db-service",
            "message": "Connection refused to primary database",
        }),
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)
    seq = ev.sequence_id
    db.close()

    # Query events replay
    resp = client.get(f"/api/v1/stream/events?after_sequence={seq - 1}&limit=10")
    assert resp.status_code == 200
    replay_data = resp.json()
    assert replay_data["total_returned"] >= 1
    assert replay_data["high_water_mark"] >= seq
    found = any(e["sequence"] == seq for e in replay_data["events"])
    assert found is True


def test_websocket_connection_and_subscription():
    with client.websocket_connect("/ws/v1/logs") as websocket:
        # 1. First event is connection.ready
        ready_frame = websocket.receive_text()
        ready_data = json.loads(ready_frame)
        assert ready_data["type"] == "connection.ready"
        assert "client_id" in ready_data["data"]

        # 2. Send ping frame
        websocket.send_text(json.dumps({"type": "ping"}))
        ack_frame = websocket.receive_text()
        ack_data = json.loads(ack_frame)
        assert ack_data["type"] == "heartbeat.ack"
        assert ack_data["data"]["pong"] is True

        # 3. Send subscription update
        websocket.send_text(json.dumps({
            "type": "subscribe",
            "filters": {
                "severities": ["ERROR", "CRITICAL"],
                "services": ["payment-service"],
            },
        }))
        sub_ack_frame = websocket.receive_text()
        sub_ack_data = json.loads(sub_ack_frame)
        assert sub_ack_data["type"] == "subscription.updated"
        assert sub_ack_data["data"]["status"] == "active"
