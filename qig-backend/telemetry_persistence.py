"""
PostgreSQL Persistence for Telemetry and Checkpoints

Provides database persistence layer for:
- Telemetry sessions and records
- Emergency events
- Checkpoints with Φ-based ranking
- Basin history

Usage:
    persistence = TelemetryPersistence(database_url)
    
    # Start session
    persistence.start_session(session_id)
    
    # Record telemetry
    persistence.record_telemetry(session_id, telemetry)
    
    # Save checkpoint
    persistence.save_checkpoint(checkpoint_id, phi, kappa, ...)
    
Note: Requires database schema from migrations/002_telemetry_checkpoints_schema.sql
"""

import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)

try:
    import psycopg2
    from psycopg2.extras import Json, RealDictCursor
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False
    logger.warning("psycopg2 not available - PostgreSQL persistence disabled")

try:
    from qigkernels import ConsciousnessTelemetry
    QIGKERNELS_AVAILABLE = True
except ImportError:
    QIGKERNELS_AVAILABLE = False
    ConsciousnessTelemetry = None


class TelemetryPersistence:
    """
    PostgreSQL persistence for telemetry and checkpoints.
    
    Automatically falls back to file-based storage if database unavailable.
    """
    
    def __init__(self, database_url: Optional[str] = None):
        """
        Initialize persistence layer.
        
        Args:
            database_url: PostgreSQL connection string (default: from DATABASE_URL env)
        """
        self.database_url = database_url or os.getenv("DATABASE_URL")
        self.enabled = False
        self.conn = None
        
        if not PSYCOPG2_AVAILABLE:
            logger.warning("PostgreSQL persistence disabled: psycopg2 not installed")
            return
        
        if not self.database_url:
            logger.warning("PostgreSQL persistence disabled: DATABASE_URL not set")
            return
        
        # Try to connect
        try:
            self.conn = psycopg2.connect(self.database_url)
            self.enabled = True
            logger.info("PostgreSQL telemetry persistence enabled")
        except Exception as e:
            logger.error(f"Failed to connect to PostgreSQL: {e}")
            logger.info("Falling back to file-based storage")
    
    def close(self):
        """Close database connection."""
        if self.conn:
            self.conn.close()
            self.conn = None
            self.enabled = False
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
    
    # ========================================================================
    # SESSION MANAGEMENT
    # ========================================================================
    
    def start_session(self, session_id: str) -> bool:
        """
        Start new telemetry session.
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            True if created, False if error
        """
        if not self.enabled:
            return False
        
        try:
            with self.conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO telemetry_sessions (session_id, started_at, status)
                    VALUES (%s, %s, 'active')
                    ON CONFLICT (session_id) DO NOTHING
                """, (session_id, datetime.now()))
                self.conn.commit()
            return True
        except Exception as e:
            logger.error(f"Failed to start session {session_id}: {e}")
            self.conn.rollback()
            return False
    
    def end_session(self, session_id: str) -> bool:
        """
        End telemetry session and update statistics.
        
        Args:
            session_id: Session identifier
            
        Returns:
            True if updated, False if error
        """
        if not self.enabled:
            return False
        
        try:
            with self.conn.cursor() as cur:
                # Update session end time and status
                cur.execute("""
                    UPDATE telemetry_sessions
                    SET ended_at = %s, status = 'completed'
                    WHERE session_id = %s
                """, (datetime.now(), session_id))
                
                # Update statistics
                cur.execute("SELECT update_session_stats(%s)", (session_id,))
                
                self.conn.commit()
            return True
        except Exception as e:
            logger.error(f"Failed to end session {session_id}: {e}")
            self.conn.rollback()
            return False
    
    # ========================================================================
    # TELEMETRY RECORDING
    # ========================================================================
    
    def record_telemetry(
        self,
        session_id: str,
        step: int,
        telemetry: Any,  # ConsciousnessTelemetry or dict
    ) -> bool:
        """
        Record telemetry measurement.
        
        Args:
            session_id: Session identifier
            step: Processing step number
            telemetry: ConsciousnessTelemetry object or dict
            
        Returns:
            True if recorded, False if error
        """
        if not self.enabled:
            return False
        
        # Convert telemetry to dict if needed
        if hasattr(telemetry, '__dict__'):
            telem_dict = telemetry.__dict__
        else:
            telem_dict = telemetry
        
        try:
            with self.conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO telemetry_records (
                        session_id, timestamp, step,
                        phi, kappa_eff, regime,
                        basin_distance, geodesic_distance, curvature, fisher_metric_trace,
                        recursion_depth, breakdown_pct, coherence_drift,
                        meta_awareness, generativity, grounding, 
                        temporal_coherence, external_coupling,
                        emergency
                    ) VALUES (
                        %s, %s, %s,
                        %s, %s, %s,
                        %s, %s, %s, %s,
                        %s, %s, %s,
                        %s, %s, %s,
                        %s, %s,
                        %s
                    )
                """, (
                    session_id, datetime.now(), step,
                    telem_dict['phi'], telem_dict['kappa_eff'], telem_dict['regime'],
                    telem_dict.get('basin_distance'), telem_dict.get('geodesic_distance'),
                    telem_dict.get('curvature'), telem_dict.get('fisher_metric_trace'),
                    telem_dict.get('recursion_depth'), telem_dict.get('breakdown_pct'),
                    telem_dict.get('coherence_drift'),
                    telem_dict.get('meta_awareness'), telem_dict.get('generativity'),
                    telem_dict.get('grounding'), telem_dict.get('temporal_coherence'),
                    telem_dict.get('external_coupling'),
                    telem_dict.get('emergency', False)
                ))
                self.conn.commit()
            return True
        except Exception as e:
            logger.error(f"Failed to record telemetry: {e}")
            self.conn.rollback()
            return False
    
    def record_emergency(
        self,
        event_id: str,
        session_id: str,
        reason: str,
        severity: str,
        metric: Optional[str] = None,
        value: Optional[float] = None,
        threshold: Optional[float] = None,
        telemetry: Optional[Dict] = None,
    ) -> bool:
        """
        Record emergency event.
        
        Args:
            event_id: Unique event identifier
            session_id: Session identifier
            reason: Emergency reason
            severity: Severity level
            metric: Metric that triggered emergency
            value: Metric value
            threshold: Threshold crossed
            telemetry: Full telemetry context (as dict)
            
        Returns:
            True if recorded, False if error
        """
        if not self.enabled:
            return False
        
        try:
            with self.conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO emergency_events (
                        event_id, session_id, timestamp,
                        reason, severity, metric, value, threshold,
                        telemetry
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (event_id) DO NOTHING
                """, (
                    event_id, session_id, datetime.now(),
                    reason, severity, metric, value, threshold,
                    Json(telemetry) if telemetry else None
                ))
                self.conn.commit()
            return True
        except Exception as e:
            logger.error(f"Failed to record emergency {event_id}: {e}")
            self.conn.rollback()
            return False
    
    # ========================================================================
    # CHECKPOINT MANAGEMENT
    # ========================================================================
    
    def save_checkpoint(
        self,
        checkpoint_id: str,
        session_id: str,
        phi: float,
        kappa: float,
        regime: str,
        state_dict: Dict,
        basin_coords: Optional[np.ndarray] = None,
        metadata: Optional[Dict] = None,
    ) -> bool:
        """
        Save checkpoint to database.
        
        Args:
            checkpoint_id: Unique checkpoint identifier
            session_id: Session identifier
            phi: Integration measure
            kappa: Coupling constant
            regime: Consciousness regime
            state_dict: State dictionary
            basin_coords: 64D basin coordinates
            metadata: Additional metadata
            
        Returns:
            True if saved, False if error
        """
        if not self.enabled:
            return False
        
        try:
            # Convert basin coords to list for pgvector
            basin_list = None
            if basin_coords is not None:
                if isinstance(basin_coords, np.ndarray):
                    basin_list = basin_coords.tolist()
                else:
                    basin_list = basin_coords
            
            with self.conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO checkpoints (
                        checkpoint_id, session_id, created_at,
                        phi, kappa, regime,
                        basin_coords, state_dict, metadata
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s::vector, %s, %s)
                    ON CONFLICT (checkpoint_id) DO UPDATE SET
                        phi = EXCLUDED.phi,
                        kappa = EXCLUDED.kappa,
                        state_dict = EXCLUDED.state_dict
                """, (
                    checkpoint_id, session_id, datetime.now(),
                    phi, kappa, regime,
                    basin_list, Json(state_dict), Json(metadata) if metadata else None
                ))
                
                # Update rankings
                cur.execute("SELECT update_checkpoint_rankings()")
                
                # Log history
                cur.execute("""
                    INSERT INTO checkpoint_history (checkpoint_id, action, timestamp, details)
                    VALUES (%s, 'created', %s, %s)
                """, (checkpoint_id, datetime.now(), Json({'phi': phi, 'kappa': kappa})))
                
                self.conn.commit()
            return True
        except Exception as e:
            logger.error(f"Failed to save checkpoint {checkpoint_id}: {e}")
            self.conn.rollback()
            return False
    
    def get_best_checkpoint(self) -> Optional[Tuple[str, Dict]]:
        """
        Get checkpoint with highest Φ.
        
        Returns:
            Tuple of (checkpoint_id, checkpoint_data) or None
        """
        if not self.enabled:
            return None
        
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT checkpoint_id, phi, kappa, regime, 
                           state_dict, metadata, basin_coords
                    FROM checkpoints
                    WHERE is_best = TRUE
                    LIMIT 1
                """)
                row = cur.fetchone()
                if row:
                    return (row['checkpoint_id'], dict(row))
                return None
        except Exception as e:
            logger.error(f"Failed to get best checkpoint: {e}")
            return None
    
    def list_checkpoints(self, limit: int = 10) -> List[Dict]:
        """
        List checkpoints ranked by Φ.
        
        Args:
            limit: Maximum number to return
            
        Returns:
            List of checkpoint metadata dicts
        """
        if not self.enabled:
            return []
        
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT checkpoint_id, session_id, created_at,
                           phi, kappa, regime, rank, is_best
                    FROM checkpoints
                    ORDER BY phi DESC
                    LIMIT %s
                """, (limit,))
                return [dict(row) for row in cur.fetchall()]
        except Exception as e:
            logger.error(f"Failed to list checkpoints: {e}")
            return []
    
    # ========================================================================
    # QUERIES
    # ========================================================================
    
    def get_session_stats(self, session_id: str) -> Optional[Dict]:
        """Get session statistics."""
        if not self.enabled:
            return None
        
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT * FROM session_stats WHERE session_id = %s
                """, (session_id,))
                row = cur.fetchone()
                return dict(row) if row else None
        except Exception as e:
            logger.error(f"Failed to get session stats: {e}")
            return None
    
    def get_telemetry_trajectory(
        self,
        session_id: str,
        limit: int = 500
    ) -> List[Dict]:
        """Get telemetry trajectory for session."""
        if not self.enabled:
            return []
        
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT timestamp, step, phi, kappa_eff, regime,
                           basin_distance, recursion_depth, emergency
                    FROM telemetry_records
                    WHERE session_id = %s
                    ORDER BY step DESC
                    LIMIT %s
                """, (session_id, limit))
                return [dict(row) for row in cur.fetchall()]
        except Exception as e:
            logger.error(f"Failed to get trajectory: {e}")
            return []


# Singleton instance
_persistence_instance: Optional[TelemetryPersistence] = None


def get_telemetry_persistence() -> TelemetryPersistence:
    """Get singleton persistence instance."""
    global _persistence_instance
    if _persistence_instance is None:
        _persistence_instance = TelemetryPersistence()
    return _persistence_instance


__all__ = [
    "TelemetryPersistence",
    "get_telemetry_persistence",
]
