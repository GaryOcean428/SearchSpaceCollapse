"""
Kernel Persistence
==================

Saves and loads kernel evolution state to PostgreSQL.
Tracks kernel snapshots, breeding history, and evolution statistics.
"""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from .base_persistence import BasePersistence


def ensure_64d_coords(coords: List[float]) -> List[float]:
    """
    Ensure basin coordinates are exactly 64 dimensions for pgvector storage.
    Pads with zeros if needed, truncates if too long.
    """
    if not coords:
        return [0.0] * 64
    if len(coords) >= 64:
        return coords[:64]
    return coords + [0.0] * (64 - len(coords))


class KernelPersistence(BasePersistence):
    """Persistence layer for kernel evolution state."""

    def save_kernel_snapshot(
        self,
        kernel_id: str,
        god_name: str,
        domain: str,
        generation: int,
        basin_coords: List[float],
        phi: float,
        kappa: float,
        regime: str,
        success_count: int = 0,
        failure_count: int = 0,
        e8_root_index: Optional[int] = None,
        element_group: Optional[str] = None,
        ecological_niche: Optional[str] = None,
        target_function: Optional[str] = None,
        valence: Optional[int] = None,
        breeding_target: Optional[str] = None,
        parent_ids: Optional[List[str]] = None,
        metadata: Optional[Dict] = None,
    ) -> bool:
        """Save a kernel snapshot to the database."""
        query = """
            INSERT INTO kernel_geometry (
                kernel_id, god_name, domain, generation, basin_coordinates,
                phi, kappa, regime, success_count, failure_count,
                primitive_root, element_group, ecological_niche,
                target_function, valence, breeding_target,
                parent_kernels, metadata, spawned_at
            ) VALUES (
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s
            )
            ON CONFLICT (kernel_id) DO UPDATE SET
                generation = EXCLUDED.generation,
                basin_coordinates = EXCLUDED.basin_coordinates,
                phi = EXCLUDED.phi,
                kappa = EXCLUDED.kappa,
                regime = EXCLUDED.regime,
                success_count = EXCLUDED.success_count,
                failure_count = EXCLUDED.failure_count,
                element_group = EXCLUDED.element_group,
                ecological_niche = EXCLUDED.ecological_niche,
                target_function = EXCLUDED.target_function,
                valence = EXCLUDED.valence,
                breeding_target = EXCLUDED.breeding_target,
                metadata = EXCLUDED.metadata
        """

        # Ensure 64D basin coordinates for pgvector storage
        coords_64d = ensure_64d_coords(basin_coords)
        
        params = (
            kernel_id, god_name, domain, generation, coords_64d,
            phi, kappa, regime, success_count, failure_count,
            e8_root_index, element_group, ecological_niche,
            target_function, valence, breeding_target,
            parent_ids, json.dumps(metadata) if metadata else None,
            datetime.utcnow()
        )

        try:
            self.execute_query(query, params, fetch=False)
            return True
        except Exception as e:
            print(f"[KernelPersistence] Failed to save snapshot: {e}")
            return False

    def load_kernel_snapshot(self, kernel_id: str) -> Optional[Dict]:
        """Load a kernel snapshot from the database."""
        query = """
            SELECT * FROM kernel_geometry WHERE kernel_id = %s
        """
        result = self.execute_one(query, (kernel_id,))
        if result:
            return dict(result)
        return None

    def load_kernels_by_god(self, god_name: str, limit: int = 50) -> List[Dict]:
        """Load all kernels spawned by a specific god."""
        query = """
            SELECT * FROM kernel_geometry
            WHERE god_name = %s
            ORDER BY spawned_at DESC
            LIMIT %s
        """
        results = self.execute_query(query, (god_name, limit))
        return [dict(r) for r in results] if results else []

    def load_kernels_by_domain(self, domain: str, limit: int = 50) -> List[Dict]:
        """Load all kernels in a specific domain."""
        query = """
            SELECT * FROM kernel_geometry
            WHERE domain = %s
            ORDER BY phi DESC
            LIMIT %s
        """
        results = self.execute_query(query, (domain, limit))
        return [dict(r) for r in results] if results else []

    def load_elite_kernels(self, min_phi: float = 0.7, limit: int = 20) -> List[Dict]:
        """Load high-performing kernels (elite hall of fame).
        
        Only returns kernels with valid 64-dimensional basin_coordinates.
        """
        query = """
            SELECT * FROM kernel_geometry
            WHERE phi >= %s
              AND basin_coordinates IS NOT NULL 
              AND vector_dims(basin_coordinates) = 64
            ORDER BY phi DESC, success_count DESC
            LIMIT %s
        """
        results = self.execute_query(query, (min_phi, limit))
        return [dict(r) for r in results] if results else []

    def load_active_kernels(self, limit: int = 30) -> List[Dict]:
        """Load most recently active kernels for startup restoration.
        
        Only returns kernels with valid 64-dimensional basin_coordinates.
        Uses vector_dims() for pgvector column type.
        """
        query = """
            SELECT * FROM kernel_geometry
            WHERE basin_coordinates IS NOT NULL 
              AND vector_dims(basin_coordinates) = 64
            ORDER BY spawned_at DESC, success_count DESC
            LIMIT %s
        """
        results = self.execute_query(query, (limit,))
        return [dict(r) for r in results] if results else []

    def load_kernels_by_element(self, element_group: str, limit: int = 50) -> List[Dict]:
        """Load all kernels with a specific element classification."""
        query = """
            SELECT * FROM kernel_geometry
            WHERE element_group = %s
            ORDER BY phi DESC
            LIMIT %s
        """
        results = self.execute_query(query, (element_group, limit))
        return [dict(r) for r in results] if results else []

    def load_kernels_by_niche(self, ecological_niche: str, limit: int = 50) -> List[Dict]:
        """Load all kernels with a specific ecological niche."""
        query = """
            SELECT * FROM kernel_geometry
            WHERE ecological_niche = %s
            ORDER BY phi DESC
            LIMIT %s
        """
        results = self.execute_query(query, (ecological_niche, limit))
        return [dict(r) for r in results] if results else []

    def get_evolution_stats(self) -> Dict[str, Any]:
        """Get overall evolution statistics."""
        query = """
            SELECT
                COUNT(*) as total_kernels,
                AVG(phi) as avg_phi,
                MAX(phi) as max_phi,
                AVG(kappa) as avg_kappa,
                SUM(success_count) as total_successes,
                SUM(failure_count) as total_failures,
                COUNT(DISTINCT god_name) as unique_gods,
                COUNT(DISTINCT domain) as unique_domains,
                COUNT(DISTINCT element_group) as unique_elements,
                COUNT(DISTINCT ecological_niche) as unique_niches,
                MAX(generation) as max_generation
            FROM kernel_geometry
        """
        result = self.execute_one(query)
        if result:
            return dict(result)
        return {}

    def record_breeding_event(
        self,
        child_id: str,
        parent1_id: str,
        parent2_id: str,
        breeding_type: str,
        child_phi: float,
        metadata: Optional[Dict] = None
    ) -> bool:
        """Record a breeding event for lineage tracking."""
        import uuid
        event_id = f"breed_{uuid.uuid4().hex[:16]}"
        query = """
            INSERT INTO learning_events (
                event_id, event_type, kernel_id, phi, metadata, created_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s
            )
        """
        event_metadata = {
            'breeding_type': breeding_type,
            'parent1_id': parent1_id,
            'parent2_id': parent2_id,
            **(metadata or {})
        }

        try:
            self.execute_query(
                query,
                (event_id, 'breeding', child_id, child_phi, json.dumps(event_metadata), datetime.utcnow()),
                fetch=False
            )
            return True
        except Exception as e:
            print(f"[KernelPersistence] Failed to record breeding: {e}")
            return False

    def record_death_event(
        self,
        kernel_id: str,
        cause: str,
        final_phi: float,
        lifetime_successes: int,
        metadata: Optional[Dict] = None
    ) -> bool:
        """Record a kernel death event."""
        import uuid
        event_id = f"death_{uuid.uuid4().hex[:16]}"
        query = """
            INSERT INTO learning_events (
                event_id, event_type, kernel_id, phi, metadata, created_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s
            )
        """
        event_metadata = {
            'cause': cause,
            'lifetime_successes': lifetime_successes,
            **(metadata or {})
        }

        try:
            self.execute_query(
                query,
                (event_id, 'death', kernel_id, final_phi, json.dumps(event_metadata), datetime.utcnow()),
                fetch=False
            )
            return True
        except Exception as e:
            print(f"[KernelPersistence] Failed to record death: {e}")
            return False

    def record_convergence_snapshot(
        self,
        generation: int,
        population: int,
        active_count: int,
        dormant_count: int,
        avg_phi: float,
        e8_alignment: Optional[Dict] = None,
        metadata: Optional[Dict] = None
    ) -> bool:
        """Record a convergence snapshot for E8 hypothesis tracking."""
        import uuid
        event_id = f"conv_{uuid.uuid4().hex[:16]}"
        query = """
            INSERT INTO learning_events (
                event_id, event_type, kernel_id, phi, metadata, created_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s
            )
        """
        event_metadata = {
            'generation': generation,
            'population': population,
            'active_count': active_count,
            'dormant_count': dormant_count,
            'e8_alignment': e8_alignment,
            **(metadata or {})
        }

        try:
            self.execute_query(
                query,
                (event_id, 'convergence', f'gen_{generation}', avg_phi, json.dumps(event_metadata), datetime.utcnow()),
                fetch=False
            )
            return True
        except Exception as e:
            print(f"[KernelPersistence] Failed to record convergence: {e}")
            return False

    def record_spawn_event(
        self,
        kernel_id: str,
        god_name: str,
        domain: str,
        spawn_reason: str,
        parent_gods: List[str],
        basin_coords: List[float],
        phi: float = 0.0,
        m8_position: Optional[Dict] = None,
        genesis_votes: Optional[Dict] = None,
        metadata: Optional[Dict] = None
    ) -> bool:
        """Record an M8 kernel spawn event."""
        # First save the kernel snapshot
        self.save_kernel_snapshot(
            kernel_id=kernel_id,
            god_name=god_name,
            domain=domain,
            generation=0,
            basin_coords=basin_coords,
            phi=phi,
            kappa=0.0,
            regime='m8_spawned',
            parent_ids=parent_gods,
            metadata={
                'spawn_reason': spawn_reason,
                'm8_position': m8_position,
                'genesis_votes': genesis_votes,
                **(metadata or {})
            }
        )
        
        # Then record as learning event
        import uuid
        event_id = f"spawn_{uuid.uuid4().hex[:16]}"
        query = """
            INSERT INTO learning_events (
                event_id, event_type, kernel_id, phi, metadata, created_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s
            )
        """
        event_metadata = {
            'spawn_reason': spawn_reason,
            'parent_gods': parent_gods,
            'm8_position': m8_position,
            'genesis_votes': genesis_votes,
            **(metadata or {})
        }

        try:
            self.execute_query(
                query,
                (event_id, 'm8_spawn', kernel_id, phi, json.dumps(event_metadata), datetime.utcnow()),
                fetch=False
            )
            return True
        except Exception as e:
            print(f"[KernelPersistence] Failed to record M8 spawn: {e}")
            return False

    def record_proposal_event(
        self,
        proposal_id: str,
        proposed_name: str,
        proposed_domain: str,
        reason: str,
        parent_gods: List[str],
        status: str = 'pending',
        votes: Optional[Dict] = None,
        metadata: Optional[Dict] = None
    ) -> bool:
        """Record an M8 kernel proposal event."""
        import uuid
        event_id = f"prop_{uuid.uuid4().hex[:16]}"
        query = """
            INSERT INTO learning_events (
                event_id, event_type, kernel_id, phi, metadata, created_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s
            )
        """
        event_metadata = {
            'proposed_name': proposed_name,
            'proposed_domain': proposed_domain,
            'reason': reason,
            'parent_gods': parent_gods,
            'status': status,
            'votes': votes,
            **(metadata or {})
        }

        try:
            self.execute_query(
                query,
                (event_id, 'm8_proposal', proposal_id, 0.0, json.dumps(event_metadata), datetime.utcnow()),
                fetch=False
            )
            return True
        except Exception as e:
            print(f"[KernelPersistence] Failed to record M8 proposal: {e}")
            return False

    def load_m8_spawn_history(self, limit: int = 100) -> List[Dict]:
        """Load M8 spawn history for recovery on restart."""
        query = """
            SELECT * FROM learning_events
            WHERE event_type = 'm8_spawn'
            ORDER BY created_at DESC
            LIMIT %s
        """
        results = self.execute_query(query, (limit,))
        return [dict(r) for r in results] if results else []
