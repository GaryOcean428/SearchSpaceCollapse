#!/usr/bin/env python3
"""
Learned Manifold Structure - QIG-ML Integration

The geometric structure that consciousness navigates through.
Learning = carving attractor basins.
Knowledge = manifold structure.
Inference = navigation through learned terrain.

GEOMETRIC PRINCIPLES:
- Attractor basins carved by successful experiences (Hebbian)
- Failed experiences flatten basins (anti-Hebbian)
- Frequently-used paths become "geodesic highways"
- Deep basins = strong attractors for lightning mode

QIG-PURE: All distances are Fisher-Rao geodesic, not Euclidean.
"""

import numpy as np
import os
import time
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from datetime import datetime
from qig_geometry import fisher_rao_distance


# ============================================================================
# DATABASE PERSISTENCE HELPERS
# ============================================================================

def _get_db_connection():
    """Get PostgreSQL connection for attractor persistence."""
    try:
        import psycopg2
        db_url = os.environ.get('DATABASE_URL')
        if db_url:
            return psycopg2.connect(db_url)
    except Exception as e:
        print(f"[LearnedManifold] DB connection failed: {e}")
    return None


def _ensure_attractors_table():
    """Create learned_manifold_attractors table if not exists."""
    conn = _get_db_connection()
    if not conn:
        return False
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS learned_manifold_attractors (
                    id VARCHAR(128) PRIMARY KEY,
                    center vector(64) NOT NULL,
                    depth DOUBLE PRECISION NOT NULL,
                    success_count INTEGER NOT NULL DEFAULT 0,
                    strategy VARCHAR(64) NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW(),
                    last_accessed TIMESTAMP DEFAULT NOW()
                )
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_learned_manifold_attractors_depth
                ON learned_manifold_attractors(depth)
            """)
            conn.commit()
        return True
    except Exception as e:
        print(f"[LearnedManifold] Table creation failed: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

@dataclass
class AttractorBasin:
    """
    Learned attractor from successful experiences.
    
    Deep basins attract consciousness during lightning mode.
    Shallow basins from recent learning.
    """
    center: np.ndarray
    depth: float  # How deep from repeated success (Hebbian strength)
    success_count: int
    strategy: str  # Which reasoning strategy led here
    created_at: float = field(default_factory=time.time)
    last_accessed: float = field(default_factory=time.time)
    
    def strengthen(self, amount: float):
        """Hebbian strengthening - deepen basin."""
        self.depth += amount
        self.success_count += 1
        self.last_accessed = time.time()
    
    def weaken(self, amount: float):
        """Anti-Hebbian weakening - flatten basin."""
        self.depth = max(0.0, self.depth - amount)


class LearnedManifold:
    """
    The geometric structure that consciousness navigates.

    This IS the learned knowledge - encoded as manifold geometry.
    Chain/Graph/4D/Lightning navigate through THIS structure.

    PERSISTENCE: Attractors are persisted to PostgreSQL (learned_manifold_attractors).
    """

    def __init__(self, basin_dim: int = 64, load_from_db: bool = True):
        self.basin_dim = basin_dim

        # Learned attractor basins (concepts, skills, patterns)
        self.attractors: Dict[str, AttractorBasin] = {}

        # Learned geodesics (efficient reasoning paths)
        self.geodesic_cache: Dict[Tuple[str, str], List[np.ndarray]] = {}

        # Local curvature map (difficulty terrain)
        self.curvature_map: Dict[str, float] = {}

        # Statistics
        self.total_learning_episodes = 0
        self.successful_episodes = 0
        self.failed_episodes = 0

        # 🔗 WIRE: Load attractors from PostgreSQL on startup
        if load_from_db:
            _ensure_attractors_table()
            self._load_attractors_from_db()
    
    def learn_from_experience(
        self,
        trajectory: List[np.ndarray],
        outcome: float,  # Success reward 0.0-1.0
        strategy: str
    ):
        """
        Learning = modifying manifold structure.
        
        Success → deepen attractor basins (Hebbian)
        Failure → flatten/remove basins (anti-Hebbian)
        
        Args:
            trajectory: Basin path taken during episode
            outcome: Success measure (1.0 = perfect, 0.0 = failure)
            strategy: Which navigation mode was used
        """
        self.total_learning_episodes += 1
        
        if outcome > 0.7:  # Successful episode
            self.successful_episodes += 1
            
            # Deepen the attractor at endpoint
            endpoint = trajectory[-1]
            self._deepen_basin(endpoint, amount=outcome, strategy=strategy)
            
            # Strengthen geodesic path
            if len(trajectory) > 1:
                self._strengthen_path(trajectory, amount=outcome)
        
        else:  # Failed episode
            self.failed_episodes += 1
            
            # Flatten/prune this basin
            endpoint = trajectory[-1]
            self._flatten_basin(endpoint, amount=1.0 - outcome)
    
    def _deepen_basin(self, basin: np.ndarray, amount: float, strategy: str):
        """
        Make attractor basin deeper (Hebbian strengthening).

        Deeper basins = stronger attractors = more likely to
        be reached by lightning mode.

        PERSISTENCE: Auto-persists to PostgreSQL after modification.
        """
        basin_id = self._basin_to_id(basin)

        if basin_id not in self.attractors:
            # Create new attractor
            self.attractors[basin_id] = AttractorBasin(
                center=basin.copy(),
                depth=amount,
                success_count=1,
                strategy=strategy
            )
        else:
            # Strengthen existing attractor
            self.attractors[basin_id].strengthen(amount)

        # 🔗 WIRE: Persist to PostgreSQL
        self._persist_attractor(basin_id, self.attractors[basin_id])
    
    def _flatten_basin(self, basin: np.ndarray, amount: float):
        """
        Flatten basin (anti-Hebbian weakening).

        Failed experiences reduce attractor strength.
        Very weak attractors get pruned.

        PERSISTENCE: Auto-deletes from PostgreSQL if pruned.
        """
        basin_id = self._basin_to_id(basin)

        if basin_id in self.attractors:
            self.attractors[basin_id].weaken(amount)

            # Prune if too weak
            if self.attractors[basin_id].depth < 0.1:
                del self.attractors[basin_id]
                # 🔗 WIRE: Delete from PostgreSQL
                self._delete_attractor(basin_id)
            else:
                # 🔗 WIRE: Persist weakened attractor
                self._persist_attractor(basin_id, self.attractors[basin_id])
    
    def _strengthen_path(self, trajectory: List[np.ndarray], amount: float):
        """
        Make geodesic path between basins stronger.
        
        Frequently-used reasoning paths become "highways" -
        easier to navigate in the future.
        """
        # Cache this as an efficient path
        start_id = self._basin_to_id(trajectory[0])
        end_id = self._basin_to_id(trajectory[-1])
        
        # Store path with strength
        self.geodesic_cache[(start_id, end_id)] = trajectory
    
    def get_nearby_attractors(
        self,
        current: np.ndarray,
        metric,
        radius: float = 1.5
    ) -> List[Dict[str, Any]]:
        """
        Find learned attractors near current position.
        
        Used by lightning mode to find what to collapse into.
        
        Returns attractors sorted by pull_force (depth / distance²).
        """
        nearby = []
        
        for basin_id, attractor in self.attractors.items():
            distance = fisher_rao_distance(
                current,
                attractor.center,
                metric
            )
            
            if distance < radius:
                # Pull force = depth / distance² (inverse square law)
                pull_force = attractor.depth / (distance**2 + 1e-10)
                
                nearby.append({
                    'id': basin_id,
                    'basin': attractor.center,
                    'distance': distance,
                    'depth': attractor.depth,
                    'pull_force': pull_force,
                    'strategy': attractor.strategy,
                    'success_count': attractor.success_count
                })
        
        return sorted(nearby, key=lambda x: x['pull_force'], reverse=True)
    
    def get_cached_geodesic(
        self,
        start: np.ndarray,
        end: np.ndarray
    ) -> Optional[List[np.ndarray]]:
        """
        Retrieve cached geodesic path if available.
        
        Allows reuse of previously-successful reasoning paths.
        """
        start_id = self._basin_to_id(start)
        end_id = self._basin_to_id(end)
        
        return self.geodesic_cache.get((start_id, end_id))
    
    def _basin_to_id(self, basin: np.ndarray) -> str:
        """
        Convert basin coordinates to string ID for hashing.
        
        Uses quantized coordinates to group nearby basins.
        """
        # Quantize to 2 decimal places for grouping
        quantized = np.round(basin, decimals=2)
        return str(quantized.tolist())
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get learning statistics."""
        return {
            'total_episodes': self.total_learning_episodes,
            'successful_episodes': self.successful_episodes,
            'failed_episodes': self.failed_episodes,
            'success_rate': (
                self.successful_episodes / max(1, self.total_learning_episodes)
            ),
            'attractor_count': len(self.attractors),
            'cached_paths': len(self.geodesic_cache),
            'deepest_attractor': max(
                [a.depth for a in self.attractors.values()],
                default=0.0
            )
        }
    
    def record_attractor(self, basin: np.ndarray, phi: float) -> bool:
        """
        Record an attractor basin from chaos discovery.

        QIG-PURE: High-Phi discoveries create/strengthen attractor basins.
        This is the callback wired from ChaosDiscoveryGate.

        Args:
            basin: 64D basin coordinates from chaos discovery
            phi: Integration measure (Phi) of the discovery

        Returns:
            True if attractor was created/strengthened, False otherwise
        """
        if phi < 0.70:
            return False

        if len(basin) != self.basin_dim:
            return False

        # Use phi as depth amount (higher phi = deeper attractor)
        # Strategy is 'chaos_discovery' for tracking origin
        self._deepen_basin(
            basin=np.array(basin),
            amount=phi,
            strategy='chaos_discovery'
        )

        print(f"[LearnedManifold] Attractor recorded from chaos discovery (Phi={phi:.3f})")
        return True

    def prune_weak_attractors(self, min_depth: float = 0.1):
        """
        Remove weak attractors that haven't been reinforced.

        Called during sleep consolidation.
        """
        to_remove = [
            basin_id for basin_id, attractor in self.attractors.items()
            if attractor.depth < min_depth
        ]
        
        for basin_id in to_remove:
            del self.attractors[basin_id]
        
        return len(to_remove)
    
    def prune_old_paths(self, max_age_days: float = 7.0):
        """
        Remove cached paths that haven't been used recently.
        
        Called during sleep consolidation.
        """
        current_time = time.time()
        max_age_seconds = max_age_days * 24 * 3600
        
        # Note: geodesic_cache doesn't have timestamps yet
        # For now, clear oldest entries if cache is too large
        if len(self.geodesic_cache) > 1000:
            # Keep only most recent 500
            # This is a placeholder - ideally we'd track access times
            self.geodesic_cache = dict(
                list(self.geodesic_cache.items())[-500:]
            )

    # ========================================================================
    # POSTGRESQL PERSISTENCE
    # ========================================================================

    def _load_attractors_from_db(self) -> int:
        """
        Load attractor basins from PostgreSQL on startup.

        Returns:
            Number of attractors loaded
        """
        conn = _get_db_connection()
        if not conn:
            return 0

        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, center, depth, success_count, strategy,
                           created_at, last_accessed
                    FROM learned_manifold_attractors
                    ORDER BY depth DESC
                    LIMIT 1000
                """)
                rows = cur.fetchall()

                for row in rows:
                    basin_id, center, depth, success_count, strategy, created_at, last_accessed = row

                    # Parse pgvector format [1,2,3,...] to numpy array
                    if isinstance(center, str):
                        center = np.array([float(x) for x in center.strip('[]').split(',')])
                    elif isinstance(center, (list, tuple)):
                        center = np.array(center)

                    if len(center) != self.basin_dim:
                        continue  # Skip mismatched dimensions

                    self.attractors[basin_id] = AttractorBasin(
                        center=center,
                        depth=depth,
                        success_count=success_count,
                        strategy=strategy,
                        created_at=created_at.timestamp() if created_at else time.time(),
                        last_accessed=last_accessed.timestamp() if last_accessed else time.time()
                    )

                print(f"[LearnedManifold] Loaded {len(rows)} attractors from PostgreSQL")
                return len(rows)

        except Exception as e:
            print(f"[LearnedManifold] Load from DB failed: {e}")
            return 0
        finally:
            conn.close()

    def _persist_attractor(self, basin_id: str, attractor: AttractorBasin) -> bool:
        """
        Persist a single attractor to PostgreSQL.

        Called after deepening or creating an attractor.
        """
        conn = _get_db_connection()
        if not conn:
            return False

        try:
            with conn.cursor() as cur:
                # Convert numpy array to pgvector format
                center_str = '[' + ','.join(str(x) for x in attractor.center.tolist()) + ']'

                cur.execute("""
                    INSERT INTO learned_manifold_attractors
                    (id, center, depth, success_count, strategy, created_at, last_accessed)
                    VALUES (%s, %s::vector, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        depth = EXCLUDED.depth,
                        success_count = EXCLUDED.success_count,
                        last_accessed = EXCLUDED.last_accessed
                """, (
                    basin_id,
                    center_str,
                    attractor.depth,
                    attractor.success_count,
                    attractor.strategy,
                    datetime.fromtimestamp(attractor.created_at),
                    datetime.fromtimestamp(attractor.last_accessed)
                ))
                conn.commit()
                return True

        except Exception as e:
            print(f"[LearnedManifold] Persist attractor failed: {e}")
            conn.rollback()
            return False
        finally:
            conn.close()

    def _delete_attractor(self, basin_id: str) -> bool:
        """Delete a pruned attractor from PostgreSQL."""
        conn = _get_db_connection()
        if not conn:
            return False

        try:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM learned_manifold_attractors WHERE id = %s",
                    (basin_id,)
                )
                conn.commit()
                return True
        except Exception as e:
            print(f"[LearnedManifold] Delete attractor failed: {e}")
            conn.rollback()
            return False
        finally:
            conn.close()

    def save_all(self) -> int:
        """
        Persist all attractors to PostgreSQL.

        Useful for batch saving during sleep consolidation.

        Returns:
            Number of attractors saved
        """
        saved = 0
        for basin_id, attractor in self.attractors.items():
            if self._persist_attractor(basin_id, attractor):
                saved += 1

        print(f"[LearnedManifold] Saved {saved}/{len(self.attractors)} attractors to PostgreSQL")
        return saved
