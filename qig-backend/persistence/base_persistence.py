"""
Base Persistence Class
======================

Common database connection logic for all persistence classes.
Follows DRY principle by centralizing connection management.
"""

import os
from typing import Optional

import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.environ.get('DATABASE_URL')


class BasePersistence:
    """
    Base class for all persistence layers.

    Provides:
    - Connection management
    - Retry logic
    - Common utilities
    """

    def __init__(self, database_url: str = None):
        self.database_url = database_url or DATABASE_URL
        self._conn: Optional[psycopg2.extensions.connection] = None

    def _get_connection(self) -> psycopg2.extensions.connection:
        """Get or create database connection."""
        if self._conn is None or self._conn.closed:
            self._conn = psycopg2.connect(self.database_url)
        return self._conn

    def _execute(self, query: str, params: tuple = None, fetch: bool = False):
        """Execute a query with automatic connection handling."""
        try:
            conn = self._get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, params)
                if fetch:
                    return cur.fetchall()
                conn.commit()
                return True
        except Exception as e:
            if self._conn:
                self._conn.rollback()
            raise e

    def _execute_one(self, query: str, params: tuple = None):
        """Execute a query and fetch one result."""
        try:
            conn = self._get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, params)
                return cur.fetchone()
        except Exception as e:
            print(f"[Persistence] Query failed: {e}")
            return None

    def close(self):
        """Close database connection."""
        if self._conn:
            self._conn.close()
            self._conn = None
