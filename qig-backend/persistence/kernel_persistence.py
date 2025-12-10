"""
Kernel Geometry Persistence
===========================

CRITICAL: Without this, all kernel evolution is ephemeral!

Persists:
- Basin coordinates (64D)
- Φ, κ, regime metrics
- Success/failure counts
- Generation and parent lineage
- E8 root mapping
"""

import json
from datetime import datetime

from psycopg2.extras import RealDictCursor

from .base_persistence import BasePersistence


class KernelPersistence(BasePersistence):
    """
    Persist kernel evolution to PostgreSQL.

    CRITICAL: Without this, all evolution is lost on restart!
    """

    def save_kernel_snapshot(
        self,
        kernel_id: str,
        generation: int,
        basin_coords: list,
        phi: float,
        kappa: float = None,
        regime: str = None,
        success_count: int = 0,
        failure_count: int = 0,
        e8_root_index: int = None,
        parent_ids: list = None,
        metadata: dict = None,
        element_group: str = None,
        ecological_niche: str = None,
        target_function: str = None,
        valence: int = None,
        breeding_target: str = None
    ) -> bool:
        """
        Save full kernel state to kernel_geometry table.

        Uses UPSERT to handle both inserts and updates.
        Now includes functional evolution properties.
        """
        try:
            conn = self._get_connection()
            with conn.cursor() as cur:
                cur.execute('''
                    INSERT INTO kernel_geometry (
                        kernel_id, generation, basin_coords, phi, kappa, regime,
                        success_count, failure_count, e8_root_index, parent_ids,
                        metadata, element_group, ecological_niche, target_function,
                        valence, breeding_target, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (kernel_id) DO UPDATE SET
                        generation = EXCLUDED.generation,
                        basin_coords = EXCLUDED.basin_coords,
                        phi = EXCLUDED.phi,
                        kappa = EXCLUDED.kappa,
                        regime = EXCLUDED.regime,
                        success_count = EXCLUDED.success_count,
                        failure_count = EXCLUDED.failure_count,
                        e8_root_index = EXCLUDED.e8_root_index,
                        parent_ids = EXCLUDED.parent_ids,
                        metadata = EXCLUDED.metadata,
                        element_group = EXCLUDED.element_group,
                        ecological_niche = EXCLUDED.ecological_niche,
                        target_function = EXCLUDED.target_function,
                        valence = EXCLUDED.valence,
                        breeding_target = EXCLUDED.breeding_target,
                        updated_at = EXCLUDED.updated_at
                ''', (
                    kernel_id,
                    generation,
                    json.dumps(basin_coords),
                    phi,
                    kappa,
                    regime,
                    success_count,
                    failure_count,
                    e8_root_index,
                    json.dumps(parent_ids or []),
                    json.dumps(metadata or {}),
                    element_group,
                    ecological_niche,
                    target_function,
                    valence,
                    breeding_target,
                    datetime.utcnow(),
                    datetime.utcnow()
                ))
                conn.commit()
                return True
        except Exception as e:
            print(f"[KernelPersistence] Failed to save kernel {kernel_id}: {e}")
            if self._conn:
                self._conn.rollback()
            return False

    def save_kernel(self, kernel, event_type: str = None) -> bool:
        """
        Convenience method: Save a SelfSpawningKernel directly.
        """
        try:
            basin_coords = kernel.kernel.basin_coords.cpu().tolist()
            phi = kernel.kernel.compute_phi()
            kappa = getattr(kernel.kernel, 'compute_kappa', lambda: None)()
            regime = getattr(kernel.kernel, 'detect_regime', lambda: None)()

            return self.save_kernel_snapshot(
                kernel_id=kernel.kernel_id,
                generation=kernel.generation,
                basin_coords=basin_coords,
                phi=phi,
                kappa=kappa,
                regime=regime,
                success_count=kernel.success_count,
                failure_count=kernel.failure_count,
                e8_root_index=getattr(kernel, 'e8_root_index', None),
                parent_ids=getattr(kernel, 'parent_ids', []),
                metadata={'event_type': event_type} if event_type else None
            )
        except Exception as e:
            print(f"[KernelPersistence] Failed to save kernel: {e}")
            return False

    def save_evolution_event(
        self,
        event_type: str,
        kernel_ids: list,
        details: dict
    ) -> bool:
        """
        Record evolution events (spawn, death, breeding, mutation).

        Uses learning_events table for event tracking.
        """
        try:
            conn = self._get_connection()
            with conn.cursor() as cur:
                cur.execute('''
                    INSERT INTO learning_events (
                        event_type, agent_id, state_before, action_taken,
                        state_after, reward, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                ''', (
                    event_type,
                    kernel_ids[0] if kernel_ids else None,
                    json.dumps({'kernel_ids': kernel_ids}),
                    json.dumps(details),
                    json.dumps({}),
                    details.get('phi', 0.0),
                    datetime.utcnow()
                ))
                conn.commit()
                return True
        except Exception as e:
            print(f"[KernelPersistence] Failed to save evolution event: {e}")
            if self._conn:
                self._conn.rollback()
            return False

    def load_elite_kernels(self, min_phi: float = 0.7, limit: int = 50) -> list:
        """
        Load best performing kernels from history.

        Use for:
        - Resuming evolution after restart
        - Seeding new populations
        """
        try:
            conn = self._get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute('''
                    SELECT
                        kernel_id, generation, basin_coords, phi, kappa, regime,
                        success_count, failure_count, e8_root_index, created_at
                    FROM kernel_geometry
                    WHERE phi >= %s
                    ORDER BY phi DESC, created_at DESC
                    LIMIT %s
                ''', (min_phi, limit))

                rows = cur.fetchall()

                kernels = []
                for row in rows:
                    basin_coords = json.loads(row['basin_coords']) if isinstance(row['basin_coords'], str) else row['basin_coords']
                    kernels.append({
                        'kernel_id': row['kernel_id'],
                        'generation': row['generation'],
                        'basin_coords': basin_coords,
                        'phi': row['phi'],
                        'kappa': row['kappa'],
                        'regime': row['regime'],
                        'success_count': row['success_count'],
                        'failure_count': row['failure_count'],
                        'e8_root_index': row['e8_root_index'],
                        'created_at': row['created_at']
                    })

                return kernels
        except Exception as e:
            print(f"[KernelPersistence] Failed to load elite kernels: {e}")
            return []

    def get_evolution_statistics(self) -> dict:
        """
        Aggregate statistics across all evolution history.
        """
        try:
            conn = self._get_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute('''
                    SELECT
                        COUNT(DISTINCT kernel_id) as total_kernels,
                        MAX(generation) as max_generation,
                        AVG(phi) as avg_phi,
                        MAX(phi) as max_phi,
                        COUNT(DISTINCT e8_root_index) FILTER (WHERE e8_root_index IS NOT NULL) as e8_roots_occupied
                    FROM kernel_geometry
                ''')
                stats = cur.fetchone()

                cur.execute('''
                    SELECT
                        generation,
                        AVG(phi) as avg_phi,
                        MAX(phi) as max_phi,
                        COUNT(*) as kernel_count
                    FROM kernel_geometry
                    GROUP BY generation
                    ORDER BY generation
                    LIMIT 100
                ''')
                phi_by_gen = cur.fetchall()

                return {
                    'total_kernels': stats['total_kernels'] or 0,
                    'max_generation': stats['max_generation'] or 0,
                    'avg_phi': float(stats['avg_phi']) if stats['avg_phi'] else 0.0,
                    'max_phi': float(stats['max_phi']) if stats['max_phi'] else 0.0,
                    'e8_coverage': (stats['e8_roots_occupied'] or 0) / 240.0,
                    'phi_progression': [
                        {
                            'generation': row['generation'],
                            'avg_phi': float(row['avg_phi']),
                            'max_phi': float(row['max_phi']),
                            'count': row['kernel_count']
                        }
                        for row in phi_by_gen
                    ]
                }
        except Exception as e:
            print(f"[KernelPersistence] Failed to get evolution statistics: {e}")
            return {
                'total_kernels': 0,
                'max_generation': 0,
                'avg_phi': 0.0,
                'max_phi': 0.0,
                'e8_coverage': 0.0,
                'phi_progression': []
            }

    def snapshot_population(self, population: list) -> int:
        """
        Batch save entire population.

        Returns number of kernels saved.
        """
        saved = 0
        for kernel in population:
            if self.save_kernel(kernel, event_type='snapshot'):
                saved += 1

        print(f"[KernelPersistence] Snapshot: {saved}/{len(population)} kernels saved")
        return saved

    def close(self):
        """Close database connection."""
        if self._conn:
            self._conn.close()
            self._conn = None
