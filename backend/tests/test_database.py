import pytest
from datetime import datetime, timezone
from sqlalchemy.exc import IntegrityError
from app.models.source import LogSource
from app.models.log import LogEntry
from app.models.cluster import LogCluster
from app.models.incident import Incident, IncidentLog
from app.models.analysis import AnalysisRun
from app.models.playbook import RemediationPlaybook
from app.models.event import SystemEvent


def test_database_models_creation(db_session):
    # 1. Create a LogSource
    source = LogSource(
        name="API Gateway Cluster",
        source_type="api",
        service_name="api-gateway",
        status="active",
    )
    db_session.add(source)
    db_session.commit()
    assert source.id is not None

    # 2. Create LogEntries
    now = datetime.now(timezone.utc)
    entry1 = LogEntry(
        source_id=source.id,
        timestamp=now,
        severity="INFO",
        service_name="api-gateway",
        message="Request processed successfully",
        raw_message="[INFO] Request processed successfully",
        trace_id="tr-1001",
    )
    entry2 = LogEntry(
        source_id=source.id,
        timestamp=now,
        severity="ERROR",
        service_name="api-gateway",
        message="Connection reset by peer",
        raw_message="[ERROR] Connection reset by peer",
        trace_id="tr-1002",
    )
    db_session.add_all([entry1, entry2])
    db_session.commit()

    # Verify relationship
    assert len(source.logs) == 2

    # 3. Create Incident
    incident = Incident(
        title="High Error Rate in API Gateway",
        description="Spike in connection timeouts",
        severity="HIGH",
        status="active",
        affected_services_json='["api-gateway"]',
    )
    db_session.add(incident)
    db_session.commit()

    # Link incident to log
    inc_log = IncidentLog(incident_id=incident.id, log_entry_id=entry2.id)
    db_session.add(inc_log)
    db_session.commit()

    assert len(incident.incident_logs) == 1
    assert incident.incident_logs[0].log_entry.severity == "ERROR"

    # 4. Create AnalysisRun & RemediationPlaybook
    analysis = AnalysisRun(
        incident_id=incident.id,
        analysis_type="root_cause",
        status="completed",
        result_json='{"hypothesis": "Network interface saturated"}',
    )
    playbook = RemediationPlaybook(
        incident_id=incident.id,
        title="Scale Gateway Replicas",
        description="Increase pool capacity",
        steps_json='["kubectl scale deployment api-gateway --replicas=5"]',
        risk_level="LOW",
    )
    event = SystemEvent(
        event_type="deployment",
        service_name="api-gateway",
        description="Deployed v2.0.1",
    )
    db_session.add_all([analysis, playbook, event])
    db_session.commit()

    assert len(incident.analysis_runs) == 1
    assert len(incident.playbooks) == 1


def test_foreign_key_enforcement(db_session):
    # Attempting to insert a LogEntry with a non-existent source_id should fail
    entry = LogEntry(
        source_id="non-existent-source-id",
        timestamp=datetime.now(timezone.utc),
        severity="ERROR",
        service_name="test-service",
        message="Fail test",
        raw_message="Fail test",
    )
    db_session.add(entry)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_cascade_delete(db_session):
    source = LogSource(
        name="Test Service",
        source_type="file",
        service_name="test-service",
        status="active",
    )
    db_session.add(source)
    db_session.commit()

    entry = LogEntry(
        source_id=source.id,
        timestamp=datetime.now(timezone.utc),
        severity="WARNING",
        service_name="test-service",
        message="Test warning",
        raw_message="Test warning",
    )
    db_session.add(entry)
    db_session.commit()

    assert db_session.query(LogEntry).count() == 1

    # Delete source -> should cascade delete log entries
    db_session.delete(source)
    db_session.commit()

    assert db_session.query(LogEntry).count() == 0
