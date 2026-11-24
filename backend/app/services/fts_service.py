import logging
from typing import List, Dict, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.config import settings

logger = logging.getLogger("logpilot.fts")


class FTSService:
    _fts_available: Optional[bool] = None

    @classmethod
    def is_fts_supported(cls, db: Session) -> bool:
        if cls._fts_available is not None:
            return cls._fts_available
        try:
            db.execute(text("SELECT 1 FROM pragma_compile_options WHERE compile_options LIKE '%ENABLE_FTS5%'"))
            # Alternatively test a dummy virtual table
            db.execute(text("CREATE VIRTUAL TABLE IF NOT EXISTS _fts5_test USING fts5(dummy);"))
            db.execute(text("DROP TABLE IF EXISTS _fts5_test;"))
            cls._fts_available = True
        except Exception as e:
            logger.warning(f"SQLite FTS5 is not available: {e}. Fallback search will be used.")
            cls._fts_available = False
        return cls._fts_available

    @classmethod
    def setup_fts_tables(cls, engine) -> bool:
        """
        Creates the FTS5 virtual table and synchronization triggers on log_entries.
        """
        if not settings.DATABASE_URL.startswith("sqlite"):
            return False

        with engine.connect() as conn:
            try:
                # 1. Create virtual table
                conn.execute(
                    text(
                        """
                        CREATE VIRTUAL TABLE IF NOT EXISTS log_entries_fts USING fts5(
                            id UNINDEXED,
                            message,
                            service_name,
                            severity,
                            trace_id,
                            span_id,
                            template_id,
                            metadata_text,
                            content='log_entries',
                            content_rowid='rowid'
                        );
                        """
                    )
                )

                # 2. Synchronization triggers
                conn.execute(
                    text(
                        """
                        CREATE TRIGGER IF NOT EXISTS trg_log_entries_ai AFTER INSERT ON log_entries BEGIN
                          INSERT INTO log_entries_fts(rowid, id, message, service_name, severity, trace_id, span_id, template_id, metadata_text)
                          VALUES (new.rowid, new.id, new.message, new.service_name, new.severity, new.trace_id, new.span_id, new.template_id, new.metadata_json);
                        END;
                        """
                    )
                )
                conn.execute(
                    text(
                        """
                        CREATE TRIGGER IF NOT EXISTS trg_log_entries_ad AFTER DELETE ON log_entries BEGIN
                          INSERT INTO log_entries_fts(log_entries_fts, rowid, id, message, service_name, severity, trace_id, span_id, template_id, metadata_text)
                          VALUES ('delete', old.rowid, old.id, old.message, old.service_name, old.severity, old.trace_id, old.span_id, old.template_id, old.metadata_json);
                        END;
                        """
                    )
                )
                conn.execute(
                    text(
                        """
                        CREATE TRIGGER IF NOT EXISTS trg_log_entries_au AFTER UPDATE ON log_entries BEGIN
                          INSERT INTO log_entries_fts(log_entries_fts, rowid, id, message, service_name, severity, trace_id, span_id, template_id, metadata_text)
                          VALUES ('delete', old.rowid, old.id, old.message, old.service_name, old.severity, old.trace_id, old.span_id, old.template_id, old.metadata_json);
                          INSERT INTO log_entries_fts(rowid, id, message, service_name, severity, trace_id, span_id, template_id, metadata_text)
                          VALUES (new.rowid, new.id, new.message, new.service_name, new.severity, new.trace_id, new.span_id, new.template_id, new.metadata_json);
                        END;
                        """
                    )
                )

                # 3. Backfill any unindexed rows
                conn.execute(
                    text(
                        """
                        INSERT INTO log_entries_fts(rowid, id, message, service_name, severity, trace_id, span_id, template_id, metadata_text)
                        SELECT rowid, id, message, service_name, severity, trace_id, span_id, template_id, metadata_json
                        FROM log_entries
                        WHERE rowid NOT IN (SELECT rowid FROM log_entries_fts);
                        """
                    )
                )
                conn.commit()
                cls._fts_available = True
                logger.info("SQLite FTS5 full-text search index initialized successfully.")
                return True
            except Exception as e:
                logger.warning(f"Failed to setup FTS5 tables: {e}")
                cls._fts_available = False
                return False

    @classmethod
    def search(cls, db: Session, match_query: str, limit: int = 500) -> Dict[str, str]:
        """
        Executes an FTS5 MATCH query.
        Returns a dictionary mapping log_id -> highlight_snippet.
        """
        if not match_query or not cls.is_fts_supported(db):
            return {}

        try:
            # Safe parameterized query using FTS5 match
            sql = text(
                """
                SELECT id, snippet(log_entries_fts, 1, '<b>', '</b>', '...', 16) AS snip
                FROM log_entries_fts
                WHERE log_entries_fts MATCH :query
                LIMIT :limit
                """
            )
            rows = db.execute(sql, {"query": match_query, "limit": limit}).fetchall()
            return {row[0]: row[1] for row in rows if row[0]}
        except Exception as e:
            logger.debug(f"FTS5 query failed (likely syntax error in query), falling back: {e}")
            return {}
