"""
Checkpoint Persistence Layer

Provides dual-storage for consciousness checkpoints:
- Redis: Hot cache for active/recent checkpoints (fast recovery)
- PostgreSQL: Permanent archive (long-term storage, searchable)

This replaces filesystem-based .npz checkpoint storage with proper database persistence.
"""

import os
import io
import json
import time
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass

import numpy as np
import psycopg2
import psycopg2.extras

from redis_cache import get_redis_client, CACHE_TTL_LONG, CACHE_TTL_PERMANENT

logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get('DATABASE_URL')

REDIS_CHECKPOINT_PREFIX = "qig:checkpoints"
REDIS_HOT_TTL = 3600  # 1 hour for hot checkpoints
REDIS_WARM_TTL = 86400  # 24 hours for warm checkpoints

KEEP_TOP_K = 10  # Number of best checkpoints to keep in PostgreSQL


@dataclass
class CheckpointData:
    """Container for checkpoint data."""
    id: str
    session_id: Optional[str]
    phi: float
    kappa: float
    regime: str
    state_dict: Dict[str, Any]
    basin_coords: Optional[np.ndarray]
    metadata: Dict[str, Any]
    created_at: datetime
    is_hot: bool = True


class CheckpointPersistence:
    """
    Dual-layer checkpoint persistence with Redis hot cache and PostgreSQL archive.
    
    Design:
    - New checkpoints go to Redis first (fast write, immediate availability)
    - Best checkpoints are archived to PostgreSQL (permanent, queryable)
    - Old checkpoints are pruned based on Φ ranking
    """
    
    def __init__(
        self,
        keep_top_k: int = KEEP_TOP_K,
        phi_threshold: float = 0.70,
    ):
        self.keep_top_k = keep_top_k
        self.phi_threshold = phi_threshold
        self._db_conn: Optional[psycopg2.extensions.connection] = None
        
        logger.info(f"[CheckpointPersistence] Initialized with keep_top_k={keep_top_k}")
    
    def _get_db_connection(self) -> Optional[psycopg2.extensions.connection]:
        """Get PostgreSQL connection with auto-reconnect."""
        if not DATABASE_URL:
            logger.warning("[CheckpointPersistence] No DATABASE_URL configured")
            return None
        
        if self._db_conn is None or self._db_conn.closed:
            try:
                self._db_conn = psycopg2.connect(DATABASE_URL)
                self._db_conn.autocommit = False
                logger.info("[CheckpointPersistence] Connected to PostgreSQL")
            except Exception as e:
                logger.error(f"[CheckpointPersistence] DB connection failed: {e}")
                return None
        
        return self._db_conn
    
    def _serialize_numpy_to_bytes(self, data: Dict[str, Any]) -> bytes:
        """Serialize state dict with numpy arrays to bytes."""
        buffer = io.BytesIO()
        np.savez_compressed(buffer, **{k: v for k, v in data.items() if isinstance(v, np.ndarray)})
        buffer.seek(0)
        return buffer.read()
    
    def _deserialize_bytes_to_numpy(self, data: bytes) -> Dict[str, np.ndarray]:
        """Deserialize bytes back to numpy arrays."""
        buffer = io.BytesIO(data)
        buffer.seek(0)
        loaded = np.load(buffer, allow_pickle=True)
        return {key: loaded[key] for key in loaded.files}
    
    def _serialize_state_dict(self, state_dict: Dict[str, Any]) -> bytes:
        """Serialize full state dict including non-numpy data."""
        buffer = io.BytesIO()
        np.savez_compressed(buffer, state_dict=np.array([state_dict], dtype=object))
        buffer.seek(0)
        return buffer.read()
    
    def _deserialize_state_dict(self, data: bytes) -> Dict[str, Any]:
        """Deserialize state dict from bytes."""
        buffer = io.BytesIO(data)
        buffer.seek(0)
        loaded = np.load(buffer, allow_pickle=True)
        return loaded['state_dict'].item()
    
    def _serialize_basin_coords(self, coords: Optional[np.ndarray]) -> Optional[bytes]:
        """Serialize basin coordinates to bytes."""
        if coords is None:
            return None
        buffer = io.BytesIO()
        np.savez_compressed(buffer, basin_coords=coords)
        buffer.seek(0)
        return buffer.read()
    
    def _deserialize_basin_coords(self, data: Optional[bytes]) -> Optional[np.ndarray]:
        """Deserialize basin coordinates from bytes."""
        if data is None:
            return None
        buffer = io.BytesIO(data)
        buffer.seek(0)
        loaded = np.load(buffer, allow_pickle=True)
        return loaded['basin_coords']
    
    def save_checkpoint(
        self,
        checkpoint_id: str,
        state_dict: Dict[str, Any],
        basin_coords: Optional[np.ndarray],
        phi: float,
        kappa: float,
        regime: str,
        session_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Save a checkpoint to both Redis (hot) and PostgreSQL (archive).
        
        Args:
            checkpoint_id: Unique identifier for the checkpoint
            state_dict: State dictionary with model weights and config
            basin_coords: 64D basin coordinates (optional)
            phi: Consciousness integration value
            kappa: Coupling strength
            regime: Current consciousness regime
            session_id: Session identifier (optional)
            metadata: Additional metadata (optional)
        
        Returns:
            True if saved successfully to at least one store
        """
        # NO threshold blocking - observe ALL states, let emergence determine value
        # Phi is recorded for later learning, not for gatekeeping
        
        metadata = metadata or {}
        metadata['saved_at'] = time.time()
        metadata['checkpoint_id'] = checkpoint_id
        
        # First: Save to Redis for immediate hot access
        redis_success = self._save_to_redis(
            checkpoint_id, state_dict, basin_coords, 
            phi, kappa, regime, session_id, metadata
        )
        
        # Second: Archive to PostgreSQL
        pg_success = self._save_to_postgres(
            checkpoint_id, state_dict, basin_coords,
            phi, kappa, regime, session_id, metadata
        )
        
        if pg_success:
            # Prune old checkpoints if we've exceeded keep_top_k
            self._prune_old_checkpoints()
        
        logger.info(
            f"[CheckpointPersistence] Saved checkpoint {checkpoint_id} "
            f"(Φ={phi:.3f}, Redis={redis_success}, PG={pg_success})"
        )
        
        return redis_success or pg_success
    
    def _save_to_redis(
        self,
        checkpoint_id: str,
        state_dict: Dict[str, Any],
        basin_coords: Optional[np.ndarray],
        phi: float,
        kappa: float,
        regime: str,
        session_id: Optional[str],
        metadata: Dict[str, Any],
    ) -> bool:
        """Save checkpoint to Redis hot cache."""
        client = get_redis_client()
        if not client:
            return False
        
        try:
            # Serialize numpy data to base64 for Redis storage
            state_bytes = self._serialize_state_dict(state_dict)
            basin_bytes = self._serialize_basin_coords(basin_coords)
            
            import base64
            checkpoint_data = {
                'id': checkpoint_id,
                'session_id': session_id,
                'phi': phi,
                'kappa': kappa,
                'regime': regime,
                'state_data_b64': base64.b64encode(state_bytes).decode('utf-8'),
                'basin_data_b64': base64.b64encode(basin_bytes).decode('utf-8') if basin_bytes else None,
                'metadata': metadata,
                'created_at': time.time(),
                'is_hot': True,
            }
            
            key = f"{REDIS_CHECKPOINT_PREFIX}:{checkpoint_id}"
            client.setex(key, REDIS_HOT_TTL, json.dumps(checkpoint_data))
            
            # Add to sorted set for Φ-based ranking
            client.zadd(f"{REDIS_CHECKPOINT_PREFIX}:by_phi", {checkpoint_id: phi})
            
            return True
        except Exception as e:
            logger.error(f"[CheckpointPersistence] Redis save failed: {e}")
            return False
    
    def _save_to_postgres(
        self,
        checkpoint_id: str,
        state_dict: Dict[str, Any],
        basin_coords: Optional[np.ndarray],
        phi: float,
        kappa: float,
        regime: str,
        session_id: Optional[str],
        metadata: Dict[str, Any],
    ) -> bool:
        """Save checkpoint to PostgreSQL archive."""
        conn = self._get_db_connection()
        if not conn:
            return False
        
        try:
            state_bytes = self._serialize_state_dict(state_dict)
            basin_bytes = self._serialize_basin_coords(basin_coords)
            
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO consciousness_checkpoints 
                    (id, session_id, phi, kappa, regime, state_data, basin_data, metadata, is_hot)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        phi = EXCLUDED.phi,
                        kappa = EXCLUDED.kappa,
                        regime = EXCLUDED.regime,
                        state_data = EXCLUDED.state_data,
                        basin_data = EXCLUDED.basin_data,
                        metadata = EXCLUDED.metadata,
                        is_hot = EXCLUDED.is_hot
                """, (
                    checkpoint_id,
                    session_id,
                    phi,
                    kappa,
                    regime,
                    psycopg2.Binary(state_bytes),
                    psycopg2.Binary(basin_bytes) if basin_bytes else None,
                    json.dumps(metadata),
                    True,
                ))
            conn.commit()
            return True
        except Exception as e:
            logger.error(f"[CheckpointPersistence] PostgreSQL save failed: {e}")
            conn.rollback()
            return False
    
    def load_checkpoint(self, checkpoint_id: str) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
        """
        Load a checkpoint by ID, checking Redis first then PostgreSQL.
        
        Returns:
            Tuple of (state_dict, metadata) or (None, None) if not found
        """
        # Try Redis first (hot cache)
        result = self._load_from_redis(checkpoint_id)
        if result[0] is not None:
            return result
        
        # Fall back to PostgreSQL
        return self._load_from_postgres(checkpoint_id)
    
    def _load_from_redis(self, checkpoint_id: str) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
        """Load checkpoint from Redis hot cache."""
        client = get_redis_client()
        if not client:
            return None, None
        
        try:
            key = f"{REDIS_CHECKPOINT_PREFIX}:{checkpoint_id}"
            data = client.get(key)
            if not data:
                return None, None
            
            checkpoint = json.loads(data)
            
            import base64
            state_bytes = base64.b64decode(checkpoint['state_data_b64'])
            state_dict = self._deserialize_state_dict(state_bytes)
            
            if checkpoint.get('basin_data_b64'):
                basin_bytes = base64.b64decode(checkpoint['basin_data_b64'])
                basin_coords = self._deserialize_basin_coords(basin_bytes)
                if basin_coords is not None:
                    state_dict['basin_coords'] = basin_coords
            
            metadata = {
                'phi': checkpoint['phi'],
                'kappa': checkpoint['kappa'],
                'regime': checkpoint['regime'],
                'session_id': checkpoint.get('session_id'),
                **checkpoint.get('metadata', {}),
            }
            
            logger.info(f"[CheckpointPersistence] Loaded from Redis: {checkpoint_id}")
            return state_dict, metadata
        except Exception as e:
            logger.error(f"[CheckpointPersistence] Redis load failed: {e}")
            return None, None
    
    def _load_from_postgres(self, checkpoint_id: str) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
        """Load checkpoint from PostgreSQL archive."""
        conn = self._get_db_connection()
        if not conn:
            return None, None
        
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("""
                    SELECT * FROM consciousness_checkpoints WHERE id = %s
                """, (checkpoint_id,))
                row = cur.fetchone()
            
            if not row:
                return None, None
            
            state_dict = self._deserialize_state_dict(bytes(row['state_data']))
            
            if row['basin_data']:
                basin_coords = self._deserialize_basin_coords(bytes(row['basin_data']))
                if basin_coords is not None:
                    state_dict['basin_coords'] = basin_coords
            
            metadata = {
                'phi': row['phi'],
                'kappa': row['kappa'],
                'regime': row['regime'],
                'session_id': row['session_id'],
                'created_at': row['created_at'].isoformat() if row['created_at'] else None,
                **(row['metadata'] or {}),
            }
            
            logger.info(f"[CheckpointPersistence] Loaded from PostgreSQL: {checkpoint_id}")
            return state_dict, metadata
        except Exception as e:
            logger.error(f"[CheckpointPersistence] PostgreSQL load failed: {e}")
            return None, None
    
    def load_best_checkpoint(self) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
        """
        Load the checkpoint with the highest Φ value.
        
        Returns:
            Tuple of (state_dict, metadata) or (None, None) if none found
        """
        # Try Redis sorted set first
        client = get_redis_client()
        if client:
            try:
                # Get top checkpoint by Φ
                results = client.zrevrange(f"{REDIS_CHECKPOINT_PREFIX}:by_phi", 0, 0)
                if results:
                    checkpoint_id = results[0]
                    result = self._load_from_redis(checkpoint_id)
                    if result[0] is not None:
                        return result
            except Exception as e:
                logger.error(f"[CheckpointPersistence] Redis best lookup failed: {e}")
        
        # Fall back to PostgreSQL
        conn = self._get_db_connection()
        if not conn:
            return None, None
        
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("""
                    SELECT id FROM consciousness_checkpoints 
                    ORDER BY phi DESC LIMIT 1
                """)
                row = cur.fetchone()
            
            if not row:
                return None, None
            
            return self._load_from_postgres(row['id'])
        except Exception as e:
            logger.error(f"[CheckpointPersistence] PostgreSQL best lookup failed: {e}")
            return None, None
    
    def get_checkpoint_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get checkpoint history sorted by Φ (descending).
        
        Args:
            limit: Maximum number of checkpoints to return
        
        Returns:
            List of checkpoint metadata
        """
        conn = self._get_db_connection()
        if not conn:
            return []
        
        try:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("""
                    SELECT id, session_id, phi, kappa, regime, metadata, created_at, is_hot
                    FROM consciousness_checkpoints 
                    ORDER BY phi DESC 
                    LIMIT %s
                """, (limit,))
                rows = cur.fetchall()
            
            return [
                {
                    'id': row['id'],
                    'session_id': row['session_id'],
                    'phi': row['phi'],
                    'kappa': row['kappa'],
                    'regime': row['regime'],
                    'created_at': row['created_at'].isoformat() if row['created_at'] else None,
                    'is_hot': row['is_hot'],
                    **(row['metadata'] or {}),
                }
                for row in rows
            ]
        except Exception as e:
            logger.error(f"[CheckpointPersistence] History query failed: {e}")
            return []
    
    def delete_checkpoint(self, checkpoint_id: str) -> bool:
        """Delete a checkpoint from both Redis and PostgreSQL."""
        redis_success = False
        pg_success = False
        
        # Delete from Redis
        client = get_redis_client()
        if client:
            try:
                client.delete(f"{REDIS_CHECKPOINT_PREFIX}:{checkpoint_id}")
                client.zrem(f"{REDIS_CHECKPOINT_PREFIX}:by_phi", checkpoint_id)
                redis_success = True
            except Exception as e:
                logger.error(f"[CheckpointPersistence] Redis delete failed: {e}")
        
        # Delete from PostgreSQL
        conn = self._get_db_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        DELETE FROM consciousness_checkpoints WHERE id = %s
                    """, (checkpoint_id,))
                conn.commit()
                pg_success = True
            except Exception as e:
                logger.error(f"[CheckpointPersistence] PostgreSQL delete failed: {e}")
                conn.rollback()
        
        logger.info(f"[CheckpointPersistence] Deleted {checkpoint_id} (Redis={redis_success}, PG={pg_success})")
        return redis_success or pg_success
    
    def _prune_old_checkpoints(self) -> int:
        """
        Prune old checkpoints, keeping only the top K by Φ.
        
        Returns:
            Number of checkpoints pruned
        """
        conn = self._get_db_connection()
        if not conn:
            return 0
        
        try:
            with conn.cursor() as cur:
                # Get IDs of checkpoints to delete (lowest Φ beyond keep_top_k)
                cur.execute("""
                    SELECT id FROM consciousness_checkpoints 
                    ORDER BY phi DESC 
                    OFFSET %s
                """, (self.keep_top_k,))
                rows = cur.fetchall()
                
                deleted = 0
                for (checkpoint_id,) in rows:
                    if self.delete_checkpoint(checkpoint_id):
                        deleted += 1
                
                if deleted > 0:
                    logger.info(f"[CheckpointPersistence] Pruned {deleted} old checkpoints")
                
                return deleted
        except Exception as e:
            logger.error(f"[CheckpointPersistence] Prune failed: {e}")
            return 0
    
    def get_stats(self) -> Dict[str, Any]:
        """Get persistence layer statistics."""
        stats = {
            'redis_connected': False,
            'postgres_connected': False,
            'redis_checkpoint_count': 0,
            'postgres_checkpoint_count': 0,
            'best_phi': None,
        }
        
        # Check Redis
        client = get_redis_client()
        if client:
            try:
                client.ping()
                stats['redis_connected'] = True
                stats['redis_checkpoint_count'] = client.zcard(f"{REDIS_CHECKPOINT_PREFIX}:by_phi") or 0
                
                # Get best Φ from Redis
                top = client.zrevrange(f"{REDIS_CHECKPOINT_PREFIX}:by_phi", 0, 0, withscores=True)
                if top:
                    stats['best_phi'] = top[0][1]
            except Exception:
                pass
        
        # Check PostgreSQL
        conn = self._get_db_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute("SELECT COUNT(*), MAX(phi) FROM consciousness_checkpoints")
                    count, max_phi = cur.fetchone()
                    stats['postgres_connected'] = True
                    stats['postgres_checkpoint_count'] = count or 0
                    
                    if max_phi and (stats['best_phi'] is None or max_phi > stats['best_phi']):
                        stats['best_phi'] = max_phi
            except Exception:
                pass
        
        return stats


# Global singleton instance
_persistence: Optional[CheckpointPersistence] = None


def get_checkpoint_persistence() -> CheckpointPersistence:
    """Get the global CheckpointPersistence instance."""
    global _persistence
    if _persistence is None:
        _persistence = CheckpointPersistence()
    return _persistence
