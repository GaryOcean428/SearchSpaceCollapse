"""
War History Persistence
=======================

Persists war declarations and outcomes to database.
"""

import json
from datetime import datetime
from typing import Optional

from psycopg2.extras import RealDictCursor

from .base_persistence import BasePersistence


class WarPersistence(BasePersistence):
    """Persist war declarations and outcomes."""

    def record_war_start(
        self,
        mode: str,
        target: str,
        strategy: str = None,
        gods_engaged: list = None
    ) -> Optional[str]:
        """Record start of a war."""
        try:
            war_id = f"war_{int(datetime.utcnow().timestamp())}_{mode.lower()}"

            conn = self._get_connection()
            with conn.cursor() as cur:
                cur.execute('''
                    INSERT INTO war_history (
                        id, mode, target, status, strategy,
                        gods_engaged, declared_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                ''', (
                    war_id,
                    mode,
                    target,
                    'active',
                    strategy,
                    gods_engaged,
                    datetime.utcnow()
                ))
                conn.commit()

            print(f"⚔️ War started: {war_id} ({mode} on {target})")
            return war_id

        except Exception as e:
            print(f"⚠️ Failed to record war start: {e}")
            if self._conn:
                self._conn.rollback()
            return None

    def record_war_end(
        self,
        war_id: str,
        outcome: str,
        convergence_score: float = None,
        metrics: dict = None
    ) -> bool:
        """Record end of a war."""
        try:
            conn = self._get_connection()
            with conn.cursor() as cur:
                cur.execute('''
                    UPDATE war_history SET
                        status = 'completed',
                        outcome = %s,
                        convergence_score = %s,
                        metrics = %s,
                        ended_at = %s
                    WHERE id = %s
                ''', (
                    outcome,
                    convergence_score,
                    json.dumps(metrics or {}),
                    datetime.utcnow(),
                    war_id
                ))
                conn.commit()

            print(f"⚔️ War ended: {war_id} ({outcome})")
            return True

        except Exception as e:
            print(f"⚠️ Failed to record war end: {e}")
            if self._conn:
                self._conn.rollback()
            return False

    def get_active_war(self) -> Optional[dict]:
        """Get currently active war."""
        try:
            conn = self._get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute('''
                    SELECT * FROM war_history
                    WHERE status = 'active'
                    ORDER BY declared_at DESC
                    LIMIT 1
                ''')
                return cur.fetchone()
        except Exception as e:
            print(f"⚠️ Failed to get active war: {e}")
            return None

    def get_war_history(self, limit: int = 20) -> list:
        """Get recent war history."""
        try:
            conn = self._get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute('''
                    SELECT * FROM war_history
                    ORDER BY declared_at DESC
                    LIMIT %s
                ''', (limit,))
                return cur.fetchall()
        except Exception as e:
            print(f"⚠️ Failed to get war history: {e}")
            return []
