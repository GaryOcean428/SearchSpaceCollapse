"""
Base Persistence Class
======================

DRY principle: Centralized database connection logic.
All persistence classes inherit from this base.
"""

import os
from contextlib import contextmanager
from pathlib import Path
from typing import Optional

# Load .env file if it exists
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent.parent / '.env'
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass  # dotenv not installed, rely on environment variables

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False
    print("[Persistence] psycopg2 not available - persistence disabled")


class BasePersistence:
    """Base class for all persistence operations."""

    def __init__(self, database_url: Optional[str] = None):
        self.database_url = database_url or os.getenv('DATABASE_URL')
        self._connection = None

    @contextmanager
    def get_connection(self):
        """Context manager for database connections with auto-cleanup."""
        if not PSYCOPG2_AVAILABLE:
            yield None
            return

        if not self.database_url:
            print("[Persistence] No DATABASE_URL configured")
            yield None
            return

        conn = None
        try:
            conn = psycopg2.connect(self.database_url)
            yield conn
            conn.commit()
        except Exception as e:
            if conn:
                conn.rollback()
            print(f"[Persistence] Database error: {e}")
            yield None
        finally:
            if conn:
                conn.close()

    @contextmanager
    def get_cursor(self, dict_cursor: bool = True):
        """Context manager for database cursors."""
        with self.get_connection() as conn:
            if conn is None:
                yield None
                return
            cursor_factory = RealDictCursor if dict_cursor else None
            cursor = conn.cursor(cursor_factory=cursor_factory)
            try:
                yield cursor
            finally:
                cursor.close()

    def execute_query(self, query: str, params: tuple = None, fetch: bool = True):
        """Execute a query and optionally fetch results."""
        with self.get_cursor() as cursor:
            if cursor is None:
                return [] if fetch else None
            cursor.execute(query, params)
            if fetch:
                return cursor.fetchall()
            return None

    def execute_one(self, query: str, params: tuple = None):
        """Execute a query and fetch one result."""
        with self.get_cursor() as cursor:
            if cursor is None:
                return None
            cursor.execute(query, params)
            return cursor.fetchone()
