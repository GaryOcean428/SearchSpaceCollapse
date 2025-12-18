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
    from psycopg2 import pool
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False
    pool = None
    print("[Persistence] psycopg2 not available - persistence disabled")


# Global connection pool - shared across all persistence instances
_connection_pool = None
_pool_min_conn = 2
_pool_max_conn = 10  # Conservative limit for Neon serverless


def get_connection_pool():
    """Get or create the global connection pool."""
    global _connection_pool
    
    if not PSYCOPG2_AVAILABLE or pool is None:
        return None
    
    if _connection_pool is not None:
        return _connection_pool
    
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        return None
    
    try:
        _connection_pool = pool.ThreadedConnectionPool(
            _pool_min_conn,
            _pool_max_conn,
            database_url
        )
        print(f"[Persistence] Connection pool initialized (min={_pool_min_conn}, max={_pool_max_conn})")
        return _connection_pool
    except Exception as e:
        print(f"[Persistence] Failed to create connection pool: {e}")
        return None


class BasePersistence:
    """Base class for all persistence operations."""

    def __init__(self, database_url: Optional[str] = None):
        self.database_url = database_url or os.getenv('DATABASE_URL')
        self._connection = None

    @contextmanager
    def get_connection(self):
        """Context manager for database connections with auto-cleanup.
        
        Uses connection pool when available for better performance
        and to prevent connection exhaustion in production.
        """
        if not PSYCOPG2_AVAILABLE:
            yield None
            return

        if not self.database_url:
            print("[Persistence] No DATABASE_URL configured")
            yield None
            return

        conn = None
        conn_pool = get_connection_pool()
        use_pool = conn_pool is not None
        
        try:
            if use_pool:
                conn = conn_pool.getconn()
            else:
                # Fallback to direct connection if pool not available
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
                if use_pool and conn_pool:
                    conn_pool.putconn(conn)
                else:
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


def get_db_connection():
    """
    Get a raw PostgreSQL connection for scripts needing direct access.
    
    DRY: This is the single source of truth for database connections.
    All other modules should import this function instead of defining their own.
    
    Usage:
        from persistence.base_persistence import get_db_connection
        conn = get_db_connection()
        if conn:
            try:
                # use connection
            finally:
                conn.close()
    """
    if not PSYCOPG2_AVAILABLE:
        print("[Persistence] psycopg2 not available")
        return None
    
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("[Persistence] DATABASE_URL not configured")
        return None
    
    return psycopg2.connect(database_url)
