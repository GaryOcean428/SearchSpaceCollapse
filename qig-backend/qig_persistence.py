#!/usr/bin/env python3
"""
QIG Persistence Layer - Neon PostgreSQL with pgvector

Handles all database operations for:
- Shadow Intel
- Basin History
- Learning Events
- Hermes Conversations
- Narrow Path Events
- Autonomic Cycle History

Uses psycopg2 with pgvector support for 64D vector operations.
"""

import json
import os
import threading
from contextlib import contextmanager
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import numpy as np

# Try to import psycopg2
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor, execute_values
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False
    print("[QIGPersistence] WARNING: psycopg2 not installed - persistence disabled")

# Constants
BASIN_DIMENSION = 64


class QIGPersistence:
    """
    Persistence layer for QIG geometric memory and feedback loops.

    Connects to Neon PostgreSQL and handles all CRUD operations
    for the QIG vector tables.
    """

    def __init__(self, database_url: Optional[str] = None):
        """
        Initialize persistence layer.

        Args:
            database_url: PostgreSQL connection string. If not provided,
                         reads from DATABASE_URL environment variable.
        """
        self.database_url = database_url or os.environ.get('DATABASE_URL')
        self._connection = None
        self._lock = threading.Lock()
        self.enabled = PSYCOPG2_AVAILABLE and bool(self.database_url)

        if self.enabled:
            print("[QIGPersistence] Initialized with Neon PostgreSQL")
        else:
            print("[QIGPersistence] Running in memory-only mode (no DB)")

    @contextmanager
    def get_connection(self):
        """Get a database connection with automatic cleanup."""
        if not self.enabled:
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
            print(f"[QIGPersistence] Database error: {e}")
            raise
        finally:
            if conn:
                conn.close()

    def _vector_to_pg(self, vec: np.ndarray) -> str:
        """Convert numpy array to PostgreSQL vector format."""
        if vec is None:
            return None
        arr = vec.tolist() if isinstance(vec, np.ndarray) else vec
        return '[' + ','.join(str(x) for x in arr) + ']'

    def _pg_to_vector(self, pg_vec: str) -> Optional[np.ndarray]:
        """Convert PostgreSQL vector string to numpy array."""
        if pg_vec is None:
            return None
        # Remove brackets and split
        values = pg_vec.strip('[]').split(',')
        return np.array([float(x) for x in values])

    # =========================================================================
    # SHADOW INTEL
    # =========================================================================

    def store_shadow_intel(
        self,
        target: str,
        consensus: str,
        average_confidence: float,
        basin_coords: np.ndarray,
        phi: float,
        kappa: float,
        regime: str,
        assessments: Dict,
        warnings: List[str] = None,
        override_zeus: bool = False,
        expires_hours: int = 24
    ) -> Optional[str]:
        """
        Store shadow intel to database.

        Returns:
            intel_id if successful, None otherwise
        """
        if not self.enabled:
            return None

        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO shadow_intel (
                            target, consensus, average_confidence,
                            basin_coords, phi, kappa, regime,
                            assessments, warnings, override_zeus,
                            expires_at
                        ) VALUES (
                            %s, %s, %s, %s::vector, %s, %s, %s,
                            %s, %s, %s, %s
                        )
                        RETURNING intel_id
                    """, (
                        target, consensus, average_confidence,
                        self._vector_to_pg(basin_coords), phi, kappa, regime,
                        json.dumps(assessments), warnings, override_zeus,
                        datetime.now() + timedelta(hours=expires_hours)
                    ))
                    result = cur.fetchone()
                    intel_id = result[0] if result else None
                    print(f"[QIGPersistence] Stored shadow intel: {intel_id}")
                    return intel_id
        except Exception as e:
            print(f"[QIGPersistence] Failed to store shadow intel: {e}")
            return None

    def get_shadow_intel(
        self,
        target: Optional[str] = None,
        limit: int = 20
    ) -> List[Dict]:
        """Retrieve shadow intel, optionally filtered by target."""
        if not self.enabled:
            return []

        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    if target:
                        cur.execute("""
                            SELECT * FROM shadow_intel
                            WHERE target ILIKE %s
                              AND (expires_at IS NULL OR expires_at > NOW())
                            ORDER BY created_at DESC
                            LIMIT %s
                        """, (f'%{target}%', limit))
                    else:
                        cur.execute("""
                            SELECT * FROM shadow_intel
                            WHERE expires_at IS NULL OR expires_at > NOW()
                            ORDER BY created_at DESC
                            LIMIT %s
                        """, (limit,))

                    results = cur.fetchall()
                    return [dict(r) for r in results]
        except Exception as e:
            print(f"[QIGPersistence] Failed to get shadow intel: {e}")
            return []

    # =========================================================================
    # BASIN HISTORY
    # =========================================================================

    def record_basin(
        self,
        basin_coords: np.ndarray,
        phi: float,
        kappa: float,
        source: str = 'unknown',
        instance_id: Optional[str] = None
    ) -> Optional[int]:
        """
        Record basin coordinates to history.

        Returns:
            history_id if successful, None otherwise
        """
        if not self.enabled:
            return None

        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO basin_history (
                            basin_coords, phi, kappa, source, instance_id
                        ) VALUES (
                            %s::vector, %s, %s, %s, %s
                        )
                        RETURNING history_id
                    """, (
                        self._vector_to_pg(basin_coords), phi, kappa,
                        source, instance_id
                    ))
                    result = cur.fetchone()
                    return result[0] if result else None
        except Exception as e:
            print(f"[QIGPersistence] Failed to record basin: {e}")
            return None

    def get_basin_history(
        self,
        limit: int = 100,
        min_phi: float = 0.0
    ) -> List[Dict]:
        """Get recent basin history."""
        if not self.enabled:
            return []

        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT * FROM basin_history
                        WHERE phi >= %s
                        ORDER BY recorded_at DESC
                        LIMIT %s
                    """, (min_phi, limit))
                    return [dict(r) for r in cur.fetchall()]
        except Exception as e:
            print(f"[QIGPersistence] Failed to get basin history: {e}")
            return []

    def find_similar_basins(
        self,
        query_basin: np.ndarray,
        limit: int = 10,
        min_phi: float = 0.3
    ) -> List[Dict]:
        """Find similar basins using pgvector cosine similarity."""
        if not self.enabled:
            return []

        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT
                            history_id,
                            basin_coords,
                            phi,
                            kappa,
                            source,
                            1 - (basin_coords <=> %s::vector) as similarity,
                            recorded_at
                        FROM basin_history
                        WHERE phi >= %s
                        ORDER BY basin_coords <=> %s::vector
                        LIMIT %s
                    """, (
                        self._vector_to_pg(query_basin), min_phi,
                        self._vector_to_pg(query_basin), limit
                    ))
                    return [dict(r) for r in cur.fetchall()]
        except Exception as e:
            print(f"[QIGPersistence] Failed to find similar basins: {e}")
            return []

    # =========================================================================
    # LEARNING EVENTS
    # =========================================================================

    def record_learning_event(
        self,
        event_type: str,
        phi: float,
        kappa: Optional[float] = None,
        basin_coords: Optional[np.ndarray] = None,
        details: Optional[Dict] = None,
        context: Optional[Dict] = None,
        source: Optional[str] = None,
        instance_id: Optional[str] = None
    ) -> Optional[str]:
        """Record a learning event."""
        if not self.enabled:
            return None

        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO learning_events (
                            event_type, phi, kappa, basin_coords,
                            details, context, source, instance_id
                        ) VALUES (
                            %s, %s, %s, %s::vector, %s, %s, %s, %s
                        )
                        RETURNING event_id
                    """, (
                        event_type, phi, kappa,
                        self._vector_to_pg(basin_coords) if basin_coords is not None else None,
                        json.dumps(details or {}),
                        json.dumps(context or {}),
                        source, instance_id
                    ))
                    result = cur.fetchone()
                    return result[0] if result else None
        except Exception as e:
            print(f"[QIGPersistence] Failed to record learning event: {e}")
            return None

    def get_learning_events(
        self,
        event_type: Optional[str] = None,
        min_phi: float = 0.0,
        limit: int = 50
    ) -> List[Dict]:
        """Get learning events."""
        if not self.enabled:
            return []

        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    if event_type:
                        cur.execute("""
                            SELECT * FROM learning_events
                            WHERE event_type = %s AND phi >= %s
                            ORDER BY created_at DESC
                            LIMIT %s
                        """, (event_type, min_phi, limit))
                    else:
                        cur.execute("""
                            SELECT * FROM learning_events
                            WHERE phi >= %s
                            ORDER BY created_at DESC
                            LIMIT %s
                        """, (min_phi, limit))
                    return [dict(r) for r in cur.fetchall()]
        except Exception as e:
            print(f"[QIGPersistence] Failed to get learning events: {e}")
            return []

    # =========================================================================
    # HERMES CONVERSATIONS
    # =========================================================================

    def store_conversation(
        self,
        user_message: str,
        system_response: str,
        message_basin: Optional[np.ndarray] = None,
        response_basin: Optional[np.ndarray] = None,
        phi: Optional[float] = None,
        context: Optional[Dict] = None,
        instance_id: Optional[str] = None
    ) -> Optional[str]:
        """Store a conversation in Hermes memory."""
        if not self.enabled:
            return None

        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO hermes_conversations (
                            user_message, system_response,
                            message_basin, response_basin,
                            phi, context, instance_id
                        ) VALUES (
                            %s, %s, %s::vector, %s::vector, %s, %s, %s
                        )
                        RETURNING conversation_id
                    """, (
                        user_message, system_response,
                        self._vector_to_pg(message_basin) if message_basin is not None else None,
                        self._vector_to_pg(response_basin) if response_basin is not None else None,
                        phi,
                        json.dumps(context or {}),
                        instance_id
                    ))
                    result = cur.fetchone()
                    return result[0] if result else None
        except Exception as e:
            print(f"[QIGPersistence] Failed to store conversation: {e}")
            return None

    def find_similar_conversations(
        self,
        query_basin: np.ndarray,
        limit: int = 5,
        min_phi: float = 0.3
    ) -> List[Dict]:
        """Find similar conversations using semantic search."""
        if not self.enabled:
            return []

        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT
                            conversation_id,
                            user_message,
                            system_response,
                            phi,
                            1 - (message_basin <=> %s::vector) as similarity,
                            created_at
                        FROM hermes_conversations
                        WHERE phi >= %s
                          AND message_basin IS NOT NULL
                        ORDER BY message_basin <=> %s::vector
                        LIMIT %s
                    """, (
                        self._vector_to_pg(query_basin), min_phi,
                        self._vector_to_pg(query_basin), limit
                    ))
                    return [dict(r) for r in cur.fetchall()]
        except Exception as e:
            print(f"[QIGPersistence] Failed to find similar conversations: {e}")
            return []

    # =========================================================================
    # NARROW PATH EVENTS
    # =========================================================================

    def record_narrow_path_event(
        self,
        severity: str,
        consecutive_count: int,
        exploration_variance: float,
        basin_coords: Optional[np.ndarray] = None,
        phi: Optional[float] = None,
        kappa: Optional[float] = None,
        intervention_action: Optional[str] = None,
        intervention_intensity: Optional[str] = None,
        intervention_result: Optional[Dict] = None
    ) -> Optional[int]:
        """Record a narrow path detection event."""
        if not self.enabled:
            return None

        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO narrow_path_events (
                            severity, consecutive_count, exploration_variance,
                            basin_coords, phi, kappa,
                            intervention_action, intervention_intensity,
                            intervention_result
                        ) VALUES (
                            %s, %s, %s, %s::vector, %s, %s, %s, %s, %s
                        )
                        RETURNING event_id
                    """, (
                        severity, consecutive_count, exploration_variance,
                        self._vector_to_pg(basin_coords) if basin_coords is not None else None,
                        phi, kappa,
                        intervention_action, intervention_intensity,
                        json.dumps(intervention_result) if intervention_result else None
                    ))
                    result = cur.fetchone()
                    return result[0] if result else None
        except Exception as e:
            print(f"[QIGPersistence] Failed to record narrow path event: {e}")
            return None

    def resolve_narrow_path_event(self, event_id: int) -> bool:
        """Mark a narrow path event as resolved."""
        if not self.enabled:
            return False

        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        UPDATE narrow_path_events
                        SET resolved_at = NOW()
                        WHERE event_id = %s
                    """, (event_id,))
                    return True
        except Exception as e:
            print(f"[QIGPersistence] Failed to resolve narrow path event: {e}")
            return False

    # =========================================================================
    # AUTONOMIC CYCLE HISTORY
    # =========================================================================

    def record_autonomic_cycle(
        self,
        cycle_type: str,
        basin_before: np.ndarray,
        basin_after: np.ndarray,
        phi_before: float,
        phi_after: float,
        drift_before: float,
        drift_after: float,
        success: bool,
        verdict: str,
        duration_ms: int,
        trigger_reason: str,
        intensity: Optional[str] = None,
        temperature: Optional[float] = None,
        patterns_consolidated: int = 0,
        novel_connections: int = 0,
        new_pathways: int = 0,
        entropy_change: Optional[float] = None,
        identity_preserved: bool = True
    ) -> Optional[int]:
        """Record an autonomic cycle (sleep/dream/mushroom)."""
        if not self.enabled:
            return None

        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO autonomic_cycle_history (
                            cycle_type, intensity, temperature,
                            basin_before, basin_after,
                            drift_before, drift_after,
                            phi_before, phi_after,
                            success, patterns_consolidated,
                            novel_connections, new_pathways,
                            entropy_change, identity_preserved,
                            verdict, duration_ms, trigger_reason,
                            completed_at
                        ) VALUES (
                            %s, %s, %s, %s::vector, %s::vector,
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                            %s, %s, %s, NOW()
                        )
                        RETURNING cycle_id
                    """, (
                        cycle_type, intensity, temperature,
                        self._vector_to_pg(basin_before),
                        self._vector_to_pg(basin_after),
                        drift_before, drift_after,
                        phi_before, phi_after,
                        success, patterns_consolidated,
                        novel_connections, new_pathways,
                        entropy_change, identity_preserved,
                        verdict, duration_ms, trigger_reason
                    ))
                    result = cur.fetchone()
                    return result[0] if result else None
        except Exception as e:
            print(f"[QIGPersistence] Failed to record autonomic cycle: {e}")
            return None

    def get_autonomic_history(
        self,
        cycle_type: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict]:
        """Get autonomic cycle history."""
        if not self.enabled:
            return []

        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    if cycle_type:
                        cur.execute("""
                            SELECT * FROM autonomic_cycle_history
                            WHERE cycle_type = %s
                            ORDER BY started_at DESC
                            LIMIT %s
                        """, (cycle_type, limit))
                    else:
                        cur.execute("""
                            SELECT * FROM autonomic_cycle_history
                            ORDER BY started_at DESC
                            LIMIT %s
                        """, (limit,))
                    return [dict(r) for r in cur.fetchall()]
        except Exception as e:
            print(f"[QIGPersistence] Failed to get autonomic history: {e}")
            return []

    # =========================================================================
    # CLEANUP
    # =========================================================================

    def cleanup_expired(self) -> Dict[str, int]:
        """Clean up expired data."""
        if not self.enabled:
            return {}

        results = {}

        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    # Clean expired sync packets
                    cur.execute("SELECT cleanup_expired_sync_packets()")
                    results['sync_packets'] = cur.fetchone()[0]

                    # Clean old basin history
                    cur.execute("SELECT cleanup_old_basin_history()")
                    results['basin_history'] = cur.fetchone()[0]

            print(f"[QIGPersistence] Cleanup: {results}")
            return results
        except Exception as e:
            print(f"[QIGPersistence] Cleanup failed: {e}")
            return results

    # =========================================================================
    # ANALYTICS
    # =========================================================================

    def get_phi_trend(self, hours: int = 24) -> List[Dict]:
        """Get Φ trend over time."""
        if not self.enabled:
            return []

        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT * FROM basin_drift_trend
                    """)
                    return [dict(r) for r in cur.fetchall()]
        except Exception as e:
            print(f"[QIGPersistence] Failed to get phi trend: {e}")
            return []

    def get_narrow_path_summary(self) -> List[Dict]:
        """Get narrow path event summary."""
        if not self.enabled:
            return []

        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("SELECT * FROM narrow_path_summary")
                    return [dict(r) for r in cur.fetchall()]
        except Exception as e:
            print(f"[QIGPersistence] Failed to get narrow path summary: {e}")
            return []

    # =========================================================================
    # PANTHEON GOD STATE
    # =========================================================================

    def load_god_state(self, god_name: str) -> Optional[Dict]:
        """Load persisted god state (reputation, skills) from database."""
        if not self.enabled:
            return None

        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT god_name, reputation, skills, learning_events_count,
                               success_rate, last_learning_at
                        FROM pantheon_god_state
                        WHERE god_name = %s
                    """, (god_name.lower(),))
                    row = cur.fetchone()
                    if row:
                        return dict(row)
                    return None
        except Exception as e:
            print(f"[QIGPersistence] Failed to load god state for {god_name}: {e}")
            return None

    def load_all_god_states(self) -> Dict[str, Dict]:
        """Load all persisted god states."""
        if not self.enabled:
            return {}

        try:
            with self.get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT god_name, reputation, skills, learning_events_count,
                               success_rate, last_learning_at
                        FROM pantheon_god_state
                    """)
                    rows = cur.fetchall()
                    return {row['god_name']: dict(row) for row in rows}
        except Exception as e:
            print(f"[QIGPersistence] Failed to load all god states: {e}")
            return {}

    def save_god_state(
        self,
        god_name: str,
        reputation: float,
        skills: Dict,
        learning_events_count: int = 0,
        success_rate: float = 0.5
    ) -> bool:
        """Save or update god state to database."""
        if not self.enabled:
            return False

        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO pantheon_god_state 
                            (god_name, reputation, skills, learning_events_count, 
                             success_rate, last_learning_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
                        ON CONFLICT (god_name) DO UPDATE SET
                            reputation = EXCLUDED.reputation,
                            skills = EXCLUDED.skills,
                            learning_events_count = EXCLUDED.learning_events_count,
                            success_rate = EXCLUDED.success_rate,
                            last_learning_at = NOW(),
                            updated_at = NOW()
                    """, (
                        god_name.lower(),
                        reputation,
                        json.dumps(skills) if skills else '{}',
                        learning_events_count,
                        success_rate
                    ))
            return True
        except Exception as e:
            print(f"[QIGPersistence] Failed to save god state for {god_name}: {e}")
            return False


# Global persistence instance
_persistence: Optional[QIGPersistence] = None


def get_persistence() -> QIGPersistence:
    """Get or create the global persistence instance."""
    global _persistence
    if _persistence is None:
        _persistence = QIGPersistence()
    return _persistence
