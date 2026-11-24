from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# SQLite connection args
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False,
    future=True,
)

# Enable SQLite foreign key constraint enforcement, WAL mode, and busy timeout
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if settings.DATABASE_URL.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True,
)

Base = declarative_base()


def get_db():
    """Dependency that yields a database session and safely closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def migrate_sqlite_columns():
    """
    Idempotent schema upgrade for SQLite: adds newly introduced columns
    if an existing database was created under an earlier phase.
    """
    if not settings.DATABASE_URL.startswith("sqlite"):
        return
    with engine.connect() as conn:
        # Check log_entries columns
        res = conn.exec_driver_sql("PRAGMA table_info(log_entries)").fetchall()
        cols = {row[1] for row in res}
        if cols:
            if "upload_batch_id" not in cols:
                conn.exec_driver_sql("ALTER TABLE log_entries ADD COLUMN upload_batch_id VARCHAR(36)")
            if "line_number" not in cols:
                conn.exec_driver_sql("ALTER TABLE log_entries ADD COLUMN line_number INTEGER")
            if "parsing_status" not in cols:
                conn.exec_driver_sql("ALTER TABLE log_entries ADD COLUMN parsing_status VARCHAR(32) DEFAULT 'SUCCESS'")
            if "ingestion_batch_id" not in cols:
                conn.exec_driver_sql("ALTER TABLE log_entries ADD COLUMN ingestion_batch_id VARCHAR(36)")
            if "external_event_id" not in cols:
                conn.exec_driver_sql("ALTER TABLE log_entries ADD COLUMN external_event_id VARCHAR(128)")
            if "ingestion_method" not in cols:
                conn.exec_driver_sql("ALTER TABLE log_entries ADD COLUMN ingestion_method VARCHAR(32) DEFAULT 'FILE_UPLOAD'")
            if "received_at" not in cols:
                conn.exec_driver_sql("ALTER TABLE log_entries ADD COLUMN received_at DATETIME")
            if "persisted_at" not in cols:
                conn.exec_driver_sql("ALTER TABLE log_entries ADD COLUMN persisted_at DATETIME")
            
            # Idempotent unique partial index for source_id + external_event_id
            try:
                conn.exec_driver_sql(
                    "CREATE UNIQUE INDEX IF NOT EXISTS uq_log_entries_source_external_event "
                    "ON log_entries(source_id, external_event_id) WHERE external_event_id IS NOT NULL"
                )
            except Exception:
                pass
            conn.commit()

        # Check log_sources columns
        res_src = conn.exec_driver_sql("PRAGMA table_info(log_sources)").fetchall()
        src_cols = {row[1] for row in res_src}
        if src_cols:
            if "description" not in src_cols:
                conn.exec_driver_sql("ALTER TABLE log_sources ADD COLUMN description TEXT")
            if "last_ingested_at" not in src_cols:
                conn.exec_driver_sql("ALTER TABLE log_sources ADD COLUMN last_ingested_at DATETIME")
            if "connection_status" not in src_cols:
                conn.exec_driver_sql("ALTER TABLE log_sources ADD COLUMN connection_status VARCHAR(32) DEFAULT 'UNKNOWN'")
            if "last_seen_at" not in src_cols:
                conn.exec_driver_sql("ALTER TABLE log_sources ADD COLUMN last_seen_at DATETIME")
            if "last_error_at" not in src_cols:
                conn.exec_driver_sql("ALTER TABLE log_sources ADD COLUMN last_error_at DATETIME")
            if "last_error_message" not in src_cols:
                conn.exec_driver_sql("ALTER TABLE log_sources ADD COLUMN last_error_message TEXT")
            if "ingestion_enabled" not in src_cols:
                conn.exec_driver_sql("ALTER TABLE log_sources ADD COLUMN ingestion_enabled BOOLEAN DEFAULT 1")
            if "total_ingested_records" not in src_cols:
                conn.exec_driver_sql("ALTER TABLE log_sources ADD COLUMN total_ingested_records INTEGER DEFAULT 0")
            if "total_failed_records" not in src_cols:
                conn.exec_driver_sql("ALTER TABLE log_sources ADD COLUMN total_failed_records INTEGER DEFAULT 0")
            conn.commit()

        # Check analysis_runs table schema to ensure incident_id is nullable for window/ad-hoc scans
        res_ar = conn.exec_driver_sql("PRAGMA table_info(analysis_runs)").fetchall()
        for row in res_ar:
            if row[1] == "incident_id" and row[3] == 1:
                conn.exec_driver_sql("""
                    CREATE TABLE IF NOT EXISTS analysis_runs_new (
                        id VARCHAR(36) NOT NULL, 
                        incident_id VARCHAR(36), 
                        analysis_type VARCHAR(64) NOT NULL, 
                        status VARCHAR(32) NOT NULL, 
                        summary TEXT, 
                        confidence_score FLOAT, 
                        top_root_cause_service VARCHAR(128), 
                        causal_graph_json TEXT, 
                        hypotheses_json TEXT, 
                        result_json TEXT, 
                        evidence_json TEXT, 
                        created_at DATETIME NOT NULL, 
                        completed_at DATETIME, 
                        PRIMARY KEY (id), 
                        FOREIGN KEY(incident_id) REFERENCES incidents (id) ON DELETE CASCADE
                    )
                """)
                conn.exec_driver_sql("INSERT INTO analysis_runs_new SELECT * FROM analysis_runs")
                conn.exec_driver_sql("DROP TABLE analysis_runs")
                conn.exec_driver_sql("ALTER TABLE analysis_runs_new RENAME TO analysis_runs")
                conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_analysis_runs_incident_id ON analysis_runs (incident_id)")
                conn.commit()
                break


def init_db():
    """Idempotently initialize all database tables and apply column upgrades."""
    import app.models  # Ensure all models are registered with Base.metadata
    Base.metadata.create_all(bind=engine)
    migrate_sqlite_columns()
    try:
        from app.services.fts_service import FTSService
        FTSService.setup_fts_tables(engine)
    except Exception:
        pass
