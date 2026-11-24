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
            conn.commit()

        # Check log_sources columns
        res_src = conn.exec_driver_sql("PRAGMA table_info(log_sources)").fetchall()
        src_cols = {row[1] for row in res_src}
        if src_cols:
            if "description" not in src_cols:
                conn.exec_driver_sql("ALTER TABLE log_sources ADD COLUMN description TEXT")
            if "last_ingested_at" not in src_cols:
                conn.exec_driver_sql("ALTER TABLE log_sources ADD COLUMN last_ingested_at DATETIME")
            conn.commit()


def init_db():
    """Idempotently initialize all database tables and apply column upgrades."""
    import app.models  # Ensure all models are registered with Base.metadata
    Base.metadata.create_all(bind=engine)
    migrate_sqlite_columns()
