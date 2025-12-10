"""
War Persistence
===============

Tracks war declarations, outcomes, and god engagement history.
Persists war mode state for analysis and resumption.
"""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from .base_persistence import BasePersistence


class WarPersistence(BasePersistence):
    """Persistence layer for war mode tracking."""

    def record_war_start(
        self,
        war_id: str,
        mode: str,
        target: str,
        strategy: Optional[str] = None,
        gods_engaged: Optional[List[str]] = None,
        metadata: Optional[Dict] = None
    ) -> Optional[str]:
        """Record the start of a war."""
        query = """
            INSERT INTO war_history (
                id, mode, target, status, strategy,
                gods_engaged, declared_at, metadata
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s
            )
            RETURNING id
        """

        try:
            result = self.execute_one(
                query,
                (
                    war_id, mode, target, 'active', strategy,
                    gods_engaged, datetime.utcnow(),
                    json.dumps(metadata) if metadata else None
                )
            )
            return result['id'] if result else war_id
        except Exception as e:
            print(f"[WarPersistence] Failed to record war start: {e}")
            return None

    def record_war_end(
        self,
        war_id: str,
        outcome: str,
        convergence_score: Optional[float] = None,
        phrases_tested: Optional[int] = None,
        discoveries: Optional[int] = None,
        kernels_spawned: Optional[int] = None,
        metadata: Optional[Dict] = None
    ) -> bool:
        """Record the end of a war."""
        query = """
            UPDATE war_history SET
                status = 'completed',
                outcome = %s,
                convergence_score = %s,
                phrases_tested_during_war = %s,
                discoveries_during_war = %s,
                kernels_spawned_during_war = %s,
                ended_at = %s,
                metadata = COALESCE(metadata, '{}'::jsonb) || %s::jsonb
            WHERE id = %s
        """

        try:
            self.execute_query(
                query,
                (
                    outcome, convergence_score, phrases_tested,
                    discoveries, kernels_spawned, datetime.utcnow(),
                    json.dumps(metadata) if metadata else '{}',
                    war_id
                ),
                fetch=False
            )
            return True
        except Exception as e:
            print(f"[WarPersistence] Failed to record war end: {e}")
            return False

    def get_active_war(self) -> Optional[Dict]:
        """Get the currently active war, if any."""
        query = """
            SELECT * FROM war_history
            WHERE status = 'active'
            ORDER BY declared_at DESC
            LIMIT 1
        """
        result = self.execute_one(query)
        if result:
            return dict(result)
        return None

    def get_war_history(self, limit: int = 50) -> List[Dict]:
        """Get war history, most recent first."""
        query = """
            SELECT * FROM war_history
            ORDER BY declared_at DESC
            LIMIT %s
        """
        results = self.execute_query(query, (limit,))
        return [dict(r) for r in results] if results else []

    def get_war_by_id(self, war_id: str) -> Optional[Dict]:
        """Get a specific war by ID."""
        query = """
            SELECT * FROM war_history WHERE id = %s
        """
        result = self.execute_one(query, (war_id,))
        if result:
            return dict(result)
        return None

    def get_wars_by_mode(self, mode: str, limit: int = 20) -> List[Dict]:
        """Get wars of a specific mode."""
        query = """
            SELECT * FROM war_history
            WHERE mode = %s
            ORDER BY declared_at DESC
            LIMIT %s
        """
        results = self.execute_query(query, (mode, limit))
        return [dict(r) for r in results] if results else []

    def get_wars_by_outcome(self, outcome: str, limit: int = 20) -> List[Dict]:
        """Get wars with a specific outcome."""
        query = """
            SELECT * FROM war_history
            WHERE outcome = %s
            ORDER BY declared_at DESC
            LIMIT %s
        """
        results = self.execute_query(query, (outcome, limit))
        return [dict(r) for r in results] if results else []

    def get_war_stats(self) -> Dict[str, Any]:
        """Get overall war statistics."""
        query = """
            SELECT
                COUNT(*) as total_wars,
                COUNT(CASE WHEN outcome = 'success' THEN 1 END) as successful_wars,
                COUNT(CASE WHEN outcome = 'failure' THEN 1 END) as failed_wars,
                COUNT(CASE WHEN outcome = 'partial_success' THEN 1 END) as partial_wars,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_wars,
                AVG(convergence_score) as avg_convergence,
                SUM(phrases_tested_during_war) as total_phrases_tested,
                SUM(discoveries_during_war) as total_discoveries,
                SUM(kernels_spawned_during_war) as total_kernels_spawned
            FROM war_history
        """
        result = self.execute_one(query)
        if result:
            return dict(result)
        return {}
