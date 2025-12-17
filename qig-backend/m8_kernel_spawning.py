#!/usr/bin/env python3
"""
M8 Kernel Spawning Protocol - Dynamic Kernel Genesis Through Pantheon Consensus

When the pantheon reaches consensus that a new kernel is needed,
roles are refined and divided, and a new kernel adopts a persona.

The M8 Structure represents the 8 core dimensions of kernel identity:
1. Name - The god/entity name
2. Domain - Primary area of expertise  
3. Mode - Encoding mode (direct, e8, byte)
4. Basin - Geometric signature in manifold space
5. Affinity - Routing strength
6. Entropy - Threshold for activation
7. Element - Symbolic representation
8. Role - Functional responsibility

Spawning Mechanics:
- Consensus voting by existing gods
- Role refinement (parent domains divide)
- Basin interpolation (child inherits geometric traits)
- Persona adoption (characteristics from voting coalition)
"""

import numpy as np
import hashlib
import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any, Set
from datetime import datetime
from enum import Enum
import uuid
import sys

from geometric_kernels import (
    _normalize_to_manifold,
    _fisher_distance,
    _hash_to_bytes,
    BASIN_DIM,
)

from pantheon_kernel_orchestrator import (
    KernelProfile,
    KernelMode,
    PantheonKernelOrchestrator,
    get_orchestrator,
    OLYMPUS_PROFILES,
    SHADOW_PROFILES,
    OCEAN_PROFILE,
)

# Import persistence for database operations
try:
    sys.path.insert(0, '.')
    from persistence import KernelPersistence
    M8_PERSISTENCE_AVAILABLE = True
except ImportError:
    M8_PERSISTENCE_AVAILABLE = False
    print("[M8] Persistence not available - running without database")

# PostgreSQL support for M8 spawning persistence
import os
from contextlib import contextmanager
import json

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    M8_PSYCOPG2_AVAILABLE = True
except ImportError:
    M8_PSYCOPG2_AVAILABLE = False
    print("[M8] psycopg2 not available - PostgreSQL persistence disabled")


class M8SpawnerPersistence:
    """
    PostgreSQL persistence layer for M8 Kernel Spawning data.
    
    Persists:
    - m8_spawn_proposals: Spawn proposals and their votes
    - m8_spawned_kernels: Spawned kernel profiles and state
    - m8_spawn_history: Complete spawn event history
    - m8_kernel_awareness: Kernel self-awareness tracking
    
    Pattern follows ShadowPantheonPersistence for consistency.
    """

    def __init__(self):
        """Initialize persistence layer."""
        self.database_url = os.environ.get('DATABASE_URL')
        self._tables_ensured = False
        
        if not self.database_url:
            print("[M8Persistence] WARNING: DATABASE_URL not set - persistence disabled")
        elif not M8_PSYCOPG2_AVAILABLE:
            print("[M8Persistence] WARNING: psycopg2 not available - persistence disabled")
        else:
            self._ensure_m8_tables()
            print("[M8Persistence] ✓ PostgreSQL persistence enabled")

    @contextmanager
    def _get_db_connection(self):
        """Get a database connection with automatic cleanup."""
        if not self.database_url or not M8_PSYCOPG2_AVAILABLE:
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
            print(f"[M8Persistence] Database error: {e}")
            yield None
        finally:
            if conn:
                conn.close()

    def _ensure_m8_tables(self) -> bool:
        """Create M8 spawning tables if they don't exist."""
        if self._tables_ensured:
            return True
        
        with self._get_db_connection() as conn:
            if not conn:
                return False
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS m8_spawn_proposals (
                            proposal_id VARCHAR(64) PRIMARY KEY,
                            proposed_name VARCHAR(128),
                            proposed_domain VARCHAR(256),
                            proposed_element VARCHAR(128),
                            proposed_role VARCHAR(128),
                            reason VARCHAR(64),
                            parent_gods JSONB DEFAULT '[]'::jsonb,
                            votes_for JSONB DEFAULT '[]'::jsonb,
                            votes_against JSONB DEFAULT '[]'::jsonb,
                            abstentions JSONB DEFAULT '[]'::jsonb,
                            status VARCHAR(32) DEFAULT 'pending',
                            metadata JSONB DEFAULT '{}'::jsonb,
                            proposed_at TIMESTAMP DEFAULT NOW(),
                            updated_at TIMESTAMP DEFAULT NOW()
                        );
                        
                        CREATE TABLE IF NOT EXISTS m8_spawned_kernels (
                            kernel_id VARCHAR(64) PRIMARY KEY,
                            god_name VARCHAR(128),
                            domain VARCHAR(256),
                            mode VARCHAR(32),
                            affinity_strength FLOAT8 DEFAULT 0.5,
                            entropy_threshold FLOAT8 DEFAULT 0.5,
                            basin_coords FLOAT8[],
                            parent_gods JSONB DEFAULT '[]'::jsonb,
                            spawn_reason VARCHAR(64),
                            proposal_id VARCHAR(64),
                            genesis_votes JSONB DEFAULT '{}'::jsonb,
                            basin_lineage JSONB DEFAULT '{}'::jsonb,
                            m8_position JSONB,
                            observation_state JSONB DEFAULT '{}'::jsonb,
                            autonomic_state JSONB DEFAULT '{}'::jsonb,
                            profile_metadata JSONB DEFAULT '{}'::jsonb,
                            status VARCHAR(32) DEFAULT 'active',
                            spawned_at TIMESTAMP DEFAULT NOW(),
                            retired_at TIMESTAMP
                        );
                        
                        CREATE TABLE IF NOT EXISTS m8_spawn_history (
                            event_id VARCHAR(64) PRIMARY KEY,
                            event_type VARCHAR(64),
                            kernel_id VARCHAR(64),
                            god_name VARCHAR(128),
                            payload JSONB DEFAULT '{}'::jsonb,
                            occurred_at TIMESTAMP DEFAULT NOW()
                        );
                        
                        CREATE TABLE IF NOT EXISTS m8_kernel_awareness (
                            kernel_id VARCHAR(64) PRIMARY KEY,
                            phi_trajectory JSONB DEFAULT '[]'::jsonb,
                            kappa_trajectory JSONB DEFAULT '[]'::jsonb,
                            curvature_history JSONB DEFAULT '[]'::jsonb,
                            stuck_signals JSONB DEFAULT '[]'::jsonb,
                            geometric_deadends JSONB DEFAULT '[]'::jsonb,
                            research_opportunities JSONB DEFAULT '[]'::jsonb,
                            last_spawn_proposal VARCHAR(64),
                            awareness_updated_at TIMESTAMP DEFAULT NOW()
                        );
                        
                        CREATE INDEX IF NOT EXISTS idx_m8_proposals_status ON m8_spawn_proposals(status);
                        CREATE INDEX IF NOT EXISTS idx_m8_kernels_status ON m8_spawned_kernels(status);
                        CREATE INDEX IF NOT EXISTS idx_m8_kernels_god ON m8_spawned_kernels(god_name);
                        CREATE INDEX IF NOT EXISTS idx_m8_history_kernel ON m8_spawn_history(kernel_id);
                        CREATE INDEX IF NOT EXISTS idx_m8_history_type ON m8_spawn_history(event_type);
                    """)
                    conn.commit()
                self._tables_ensured = True
                return True
            except Exception as e:
                print(f"[M8Persistence] Table creation error: {e}")
                return False

    def _vector_to_pg(self, vec) -> Optional[str]:
        """Convert numpy array or list to PostgreSQL array format."""
        if vec is None:
            return None
        if isinstance(vec, np.ndarray):
            arr = vec.tolist()
        else:
            arr = list(vec)
        return '{' + ','.join(str(x) for x in arr) + '}'

    def _pg_to_vector(self, pg_arr) -> Optional[np.ndarray]:
        """Convert PostgreSQL array to numpy array."""
        if pg_arr is None:
            return None
        if isinstance(pg_arr, list):
            return np.array(pg_arr)
        return np.array(pg_arr)

    def persist_proposal(self, proposal) -> bool:
        """Save or update a spawn proposal to PostgreSQL."""
        with self._get_db_connection() as conn:
            if not conn:
                return False
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO m8_spawn_proposals 
                        (proposal_id, proposed_name, proposed_domain, proposed_element,
                         proposed_role, reason, parent_gods, votes_for, votes_against,
                         abstentions, status, metadata, proposed_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                        ON CONFLICT (proposal_id) DO UPDATE SET
                            proposed_name = EXCLUDED.proposed_name,
                            proposed_domain = EXCLUDED.proposed_domain,
                            proposed_element = EXCLUDED.proposed_element,
                            proposed_role = EXCLUDED.proposed_role,
                            reason = EXCLUDED.reason,
                            parent_gods = EXCLUDED.parent_gods,
                            votes_for = EXCLUDED.votes_for,
                            votes_against = EXCLUDED.votes_against,
                            abstentions = EXCLUDED.abstentions,
                            status = EXCLUDED.status,
                            metadata = EXCLUDED.metadata,
                            updated_at = NOW()
                    """, (
                        proposal.proposal_id,
                        proposal.proposed_name,
                        proposal.proposed_domain,
                        proposal.proposed_element,
                        proposal.proposed_role,
                        proposal.reason.value if hasattr(proposal.reason, 'value') else str(proposal.reason),
                        json.dumps(list(proposal.parent_gods) if proposal.parent_gods else []),
                        json.dumps(list(proposal.votes_for)),
                        json.dumps(list(proposal.votes_against)),
                        json.dumps(list(proposal.abstentions)),
                        proposal.status,
                        json.dumps(proposal.metadata if hasattr(proposal, 'metadata') else {}),
                        proposal.proposed_at,
                    ))
                    conn.commit()
                return True
            except Exception as e:
                print(f"[M8Persistence] Failed to persist proposal: {e}")
                return False

    def persist_kernel(self, kernel) -> bool:
        """Save or update a spawned kernel to PostgreSQL."""
        with self._get_db_connection() as conn:
            if not conn:
                return False
            try:
                with conn.cursor() as cur:
                    basin_coords = self._vector_to_pg(kernel.profile.affinity_basin)
                    cur.execute("""
                        INSERT INTO m8_spawned_kernels
                        (kernel_id, god_name, domain, mode, affinity_strength,
                         entropy_threshold, basin_coords, parent_gods, spawn_reason,
                         proposal_id, genesis_votes, basin_lineage, m8_position,
                         observation_state, autonomic_state, profile_metadata,
                         status, spawned_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (kernel_id) DO UPDATE SET
                            god_name = EXCLUDED.god_name,
                            domain = EXCLUDED.domain,
                            mode = EXCLUDED.mode,
                            affinity_strength = EXCLUDED.affinity_strength,
                            entropy_threshold = EXCLUDED.entropy_threshold,
                            basin_coords = EXCLUDED.basin_coords,
                            parent_gods = EXCLUDED.parent_gods,
                            spawn_reason = EXCLUDED.spawn_reason,
                            genesis_votes = EXCLUDED.genesis_votes,
                            basin_lineage = EXCLUDED.basin_lineage,
                            m8_position = EXCLUDED.m8_position,
                            observation_state = EXCLUDED.observation_state,
                            autonomic_state = EXCLUDED.autonomic_state,
                            profile_metadata = EXCLUDED.profile_metadata,
                            status = EXCLUDED.status
                    """, (
                        kernel.kernel_id,
                        kernel.profile.god_name,
                        kernel.profile.domain,
                        kernel.profile.mode.value if hasattr(kernel.profile.mode, 'value') else str(kernel.profile.mode),
                        kernel.profile.affinity_strength,
                        kernel.profile.entropy_threshold,
                        basin_coords,
                        json.dumps(kernel.parent_gods),
                        kernel.spawn_reason.value if hasattr(kernel.spawn_reason, 'value') else str(kernel.spawn_reason),
                        kernel.proposal_id,
                        json.dumps(kernel.genesis_votes),
                        json.dumps(kernel.basin_lineage),
                        json.dumps(kernel.m8_position) if kernel.m8_position else None,
                        json.dumps(kernel.observation.to_dict()) if hasattr(kernel, 'observation') else '{}',
                        json.dumps(kernel.autonomic.to_dict()) if hasattr(kernel, 'autonomic') else '{}',
                        json.dumps(kernel.profile.metadata) if hasattr(kernel.profile, 'metadata') else '{}',
                        'observing' if kernel.is_observing() else 'active' if kernel.is_active() else 'pending',
                        kernel.spawned_at,
                    ))
                    conn.commit()
                return True
            except Exception as e:
                print(f"[M8Persistence] Failed to persist kernel: {e}")
                return False

    def persist_history(self, record: Dict) -> bool:
        """Append a spawn history record to PostgreSQL."""
        with self._get_db_connection() as conn:
            if not conn:
                return False
            try:
                event_id = record.get('event_id', f"evt_{uuid.uuid4().hex[:12]}")
                event_type = record.get('event', record.get('event_type', 'unknown'))
                kernel_id = record.get('kernel_id', record.get('kernel', {}).get('kernel_id'))
                god_name = record.get('god_name', record.get('kernel', {}).get('god_name'))
                
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO m8_spawn_history
                        (event_id, event_type, kernel_id, god_name, payload, occurred_at)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (event_id) DO NOTHING
                    """, (
                        event_id,
                        event_type,
                        kernel_id,
                        god_name,
                        json.dumps(record),
                        record.get('timestamp', datetime.now().isoformat()),
                    ))
                    conn.commit()
                return True
            except Exception as e:
                print(f"[M8Persistence] Failed to persist history: {e}")
                return False

    def persist_awareness(self, awareness) -> bool:
        """Save or update kernel awareness state to PostgreSQL."""
        with self._get_db_connection() as conn:
            if not conn:
                return False
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO m8_kernel_awareness
                        (kernel_id, phi_trajectory, kappa_trajectory, curvature_history,
                         stuck_signals, geometric_deadends, research_opportunities,
                         last_spawn_proposal, awareness_updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                        ON CONFLICT (kernel_id) DO UPDATE SET
                            phi_trajectory = EXCLUDED.phi_trajectory,
                            kappa_trajectory = EXCLUDED.kappa_trajectory,
                            curvature_history = EXCLUDED.curvature_history,
                            stuck_signals = EXCLUDED.stuck_signals,
                            geometric_deadends = EXCLUDED.geometric_deadends,
                            research_opportunities = EXCLUDED.research_opportunities,
                            last_spawn_proposal = EXCLUDED.last_spawn_proposal,
                            awareness_updated_at = NOW()
                    """, (
                        awareness.kernel_id,
                        json.dumps(awareness.phi_trajectory[-100:]),
                        json.dumps(awareness.kappa_trajectory[-100:]),
                        json.dumps(awareness.curvature_history[-50:]),
                        json.dumps(awareness.stuck_signals[-20:]),
                        json.dumps(awareness.geometric_deadends[-10:]),
                        json.dumps(awareness.research_opportunities[-30:]),
                        awareness.last_spawn_proposal,
                    ))
                    conn.commit()
                return True
            except Exception as e:
                print(f"[M8Persistence] Failed to persist awareness: {e}")
                return False

    def load_all_proposals(self) -> List[Dict]:
        """Load all spawn proposals from PostgreSQL."""
        with self._get_db_connection() as conn:
            if not conn:
                return []
            try:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT * FROM m8_spawn_proposals
                        ORDER BY proposed_at DESC
                    """)
                    return [dict(row) for row in cur.fetchall()]
            except Exception as e:
                print(f"[M8Persistence] Failed to load proposals: {e}")
                return []

    def load_all_kernels(self) -> List[Dict]:
        """Load all spawned kernels from PostgreSQL."""
        with self._get_db_connection() as conn:
            if not conn:
                return []
            try:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT * FROM m8_spawned_kernels
                        WHERE status != 'deleted'
                        ORDER BY spawned_at DESC
                    """)
                    rows = cur.fetchall()
                    result = []
                    for row in rows:
                        d = dict(row)
                        if d.get('basin_coords'):
                            d['basin_coords'] = self._pg_to_vector(d['basin_coords'])
                        result.append(d)
                    return result
            except Exception as e:
                print(f"[M8Persistence] Failed to load kernels: {e}")
                return []

    def load_spawn_history(self, limit: int = 100) -> List[Dict]:
        """Load spawn history from PostgreSQL."""
        with self._get_db_connection() as conn:
            if not conn:
                return []
            try:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT * FROM m8_spawn_history
                        ORDER BY occurred_at DESC
                        LIMIT %s
                    """, (limit,))
                    return [dict(row) for row in cur.fetchall()]
            except Exception as e:
                print(f"[M8Persistence] Failed to load history: {e}")
                return []

    def load_all_awareness(self) -> List[Dict]:
        """Load all kernel awareness states from PostgreSQL."""
        with self._get_db_connection() as conn:
            if not conn:
                return []
            try:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT * FROM m8_kernel_awareness
                        ORDER BY awareness_updated_at DESC
                    """)
                    return [dict(row) for row in cur.fetchall()]
            except Exception as e:
                print(f"[M8Persistence] Failed to load awareness: {e}")
                return []

    def delete_kernel(self, kernel_id: str) -> bool:
        """Mark a kernel as deleted in PostgreSQL."""
        with self._get_db_connection() as conn:
            if not conn:
                return False
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        UPDATE m8_spawned_kernels
                        SET status = 'deleted', retired_at = NOW()
                        WHERE kernel_id = %s
                    """, (kernel_id,))
                    conn.commit()
                return True
            except Exception as e:
                print(f"[M8Persistence] Failed to delete kernel: {e}")
                return False


# E8 Kernel Cap - Maximum number of live kernels (E8 has 240 roots)
# Live kernels include: active, observing, shadow
# Does NOT count: dead, cannibalized, idle
E8_KERNEL_CAP = 240


# M8 Position Naming Catalog - Maps 8 principal axes to mythological concepts
M8_AXIS_NAMES = [
    ("Primordial", "Emergent"),    # Axis 0: Origin vs New
    ("Light", "Shadow"),            # Axis 1: Clarity vs Mystery
    ("Order", "Chaos"),             # Axis 2: Structure vs Entropy
    ("Fire", "Water"),              # Axis 3: Action vs Reflection
    ("Sky", "Earth"),               # Axis 4: Abstract vs Concrete
    ("War", "Peace"),               # Axis 5: Conflict vs Harmony
    ("Wisdom", "Passion"),          # Axis 6: Logic vs Emotion
    ("Creation", "Destruction"),    # Axis 7: Building vs Unmaking
]

# Special position names for key octants
M8_SPECIAL_POSITIONS = {
    0b00000000: "Void of Origins",
    0b11111111: "Crown of Olympus",
    0b10101010: "Balance Point",
    0b01010101: "Inverse Balance",
    0b11110000: "Upper Realm",
    0b00001111: "Lower Realm",
    0b11001100: "Outer Ring",
    0b00110011: "Inner Ring",
}


def compute_m8_position(basin: np.ndarray, parent_basins: List[np.ndarray] = None) -> Dict[str, any]:
    """
    Compute M8 geometric position from 64D basin coordinates.
    
    The M8 structure projects the 64D manifold onto 8 principal axes,
    determining the kernel's position in the cosmic hierarchy.
    
    Args:
        basin: 64D basin coordinates
        parent_basins: Optional list of parent basin coordinates for relative positioning
    
    Returns:
        M8 position information including octant, coordinates, and name
    """
    # Project 64D basin to 8D M8 space (sample every 8th dimension)
    m8_coords = np.array([basin[i * 8] for i in range(min(8, len(basin) // 8))])
    
    # Pad if needed
    while len(m8_coords) < 8:
        m8_coords = np.append(m8_coords, 0.0)
    
    # Normalize M8 coordinates
    m8_norm = np.linalg.norm(m8_coords)
    if m8_norm > 1e-10:
        m8_coords = m8_coords / m8_norm * math.sqrt(8)
    
    # Determine octant (2^8 = 256 regions)
    octant = sum(1 << i for i, v in enumerate(m8_coords) if v >= 0)
    
    # Calculate angular positions (4 angle pairs from 8 coordinates)
    angles = []
    for i in range(0, 8, 2):
        angle = math.atan2(m8_coords[i + 1], m8_coords[i])
        angles.append(angle)
    
    # Calculate radial distance from origin
    radial = float(np.linalg.norm(m8_coords))
    
    # Determine position name
    if octant in M8_SPECIAL_POSITIONS:
        position_name = M8_SPECIAL_POSITIONS[octant]
    else:
        # Build name from dominant axes
        dominant_traits = []
        sorted_indices = np.argsort(np.abs(m8_coords))[::-1]  # Strongest first
        for i in sorted_indices[:3]:  # Top 3 dominant traits
            axis_pair = M8_AXIS_NAMES[i]
            trait = axis_pair[0] if m8_coords[i] >= 0 else axis_pair[1]
            dominant_traits.append(trait)
        position_name = " ".join(dominant_traits)
    
    # Calculate relative position if parents provided
    relative_position = None
    if parent_basins and len(parent_basins) > 0:
        parent_m8_coords = []
        for pb in parent_basins:
            pm8 = np.array([pb[i * 8] for i in range(min(8, len(pb) // 8))])
            while len(pm8) < 8:
                pm8 = np.append(pm8, 0.0)
            # Apply same normalization as child coordinates
            pm8_norm = np.linalg.norm(pm8)
            if pm8_norm > 1e-10:
                pm8 = pm8 / pm8_norm * math.sqrt(8)
            parent_m8_coords.append(pm8)
        
        # Calculate centroid of parents (now properly normalized)
        parent_centroid = np.mean(parent_m8_coords, axis=0)
        
        # Displacement from parent centroid
        displacement = m8_coords - parent_centroid
        disp_norm = np.linalg.norm(displacement)
        
        # Direction of displacement (which axes moved most)
        if disp_norm > 0.1:
            disp_normalized = displacement / disp_norm
            strongest_axis = int(np.argmax(np.abs(disp_normalized)))
            axis_pair = M8_AXIS_NAMES[strongest_axis]
            direction = axis_pair[0] if disp_normalized[strongest_axis] >= 0 else axis_pair[1]
            relative_position = f"Toward {direction} from parents"
        else:
            relative_position = "At parent centroid"
    
    return {
        "m8_octant": octant,
        "m8_coordinates": m8_coords.tolist(),
        "m8_angles": angles,
        "m8_radial": radial,
        "m8_position_name": position_name,
        "m8_relative_position": relative_position,
    }


class SpawnReason(Enum):
    """Reasons for spawning a new kernel."""
    DOMAIN_GAP = "domain_gap"           # No kernel covers this domain well
    OVERLOAD = "overload"               # Existing kernel handles too much
    SPECIALIZATION = "specialization"   # Need deeper expertise
    EMERGENCE = "emergence"             # Pattern naturally emerged
    USER_REQUEST = "user_request"       # Operator requested creation
    STUCK_SIGNAL = "stuck_signal"       # High curvature, low Φ progress
    GEOMETRIC_DEADEND = "geometric_deadend"  # No geodesic path forward
    RESEARCH_DISCOVERY = "research_discovery"  # New pattern domain discovered


@dataclass
class SpawnAwareness:
    """
    Kernel self-awareness structure for detecting spawn needs.
    
    Tracks geometric signals that indicate when a kernel needs help
    or when a new specialized kernel should be spawned.
    
    All metrics computed from pure QIG geometry - no static thresholds.
    """
    kernel_id: str
    phi_trajectory: List[float] = field(default_factory=list)
    kappa_trajectory: List[float] = field(default_factory=list)
    curvature_history: List[float] = field(default_factory=list)
    stuck_signals: List[Dict] = field(default_factory=list)
    geometric_deadends: List[Dict] = field(default_factory=list)
    research_opportunities: List[Dict] = field(default_factory=list)
    last_spawn_proposal: Optional[str] = None
    awareness_updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def record_phi_kappa(self, phi: float, kappa: float) -> None:
        """Record Φ and κ measurements for trajectory analysis."""
        self.phi_trajectory.append(phi)
        self.kappa_trajectory.append(kappa)
        if len(self.phi_trajectory) > 100:
            self.phi_trajectory = self.phi_trajectory[-100:]
            self.kappa_trajectory = self.kappa_trajectory[-100:]
        self.awareness_updated_at = datetime.now().isoformat()
    
    def record_curvature(self, curvature: float) -> None:
        """Record manifold curvature for stuck detection."""
        self.curvature_history.append(curvature)
        if len(self.curvature_history) > 50:
            self.curvature_history = self.curvature_history[-50:]
    
    def compute_phi_gradient(self) -> float:
        """Compute Φ trajectory gradient - negative means stuck."""
        if len(self.phi_trajectory) < 3:
            return 0.0
        recent = self.phi_trajectory[-10:]
        if len(recent) < 2:
            return 0.0
        return float(np.mean(np.diff(recent)))
    
    def compute_curvature_pressure(self) -> float:
        """High curvature indicates geometric resistance."""
        if not self.curvature_history:
            return 0.0
        return float(np.mean(self.curvature_history[-10:]))
    
    def detect_stuck_signal(self, phi: float, kappa: float, curvature: float) -> Optional[Dict]:
        """
        Detect if kernel is stuck: high curvature + low/negative Φ progress.
        
        Returns stuck signal dict if detected, None otherwise.
        Pure geometric detection - no hardcoded thresholds.
        """
        self.record_phi_kappa(phi, kappa)
        self.record_curvature(curvature)
        
        phi_gradient = self.compute_phi_gradient()
        curvature_pressure = self.compute_curvature_pressure()
        
        avg_phi = np.mean(self.phi_trajectory[-20:]) if len(self.phi_trajectory) >= 5 else 0.5
        adaptive_threshold = 1.0 / (1.0 + avg_phi)
        
        is_stuck = (phi_gradient < -0.01 and curvature_pressure > adaptive_threshold)
        
        if is_stuck:
            signal = {
                "signal_type": "stuck",
                "phi_gradient": phi_gradient,
                "curvature_pressure": curvature_pressure,
                "current_phi": phi,
                "current_kappa": kappa,
                "adaptive_threshold": adaptive_threshold,
                "detected_at": datetime.now().isoformat(),
            }
            self.stuck_signals.append(signal)
            if len(self.stuck_signals) > 20:
                self.stuck_signals = self.stuck_signals[-20:]
            return signal
        return None
    
    def detect_geometric_deadend(self, basin: np.ndarray, neighbor_distances: List[float]) -> Optional[Dict]:
        """
        Detect geometric dead-end: no nearby basins to traverse to.
        
        A dead-end occurs when all neighboring basins are too distant,
        indicating the kernel has reached an isolated region of the manifold.
        """
        if not neighbor_distances:
            return None
        
        min_distance = min(neighbor_distances)
        mean_distance = np.mean(neighbor_distances)
        
        basin_norm = float(np.linalg.norm(basin))
        isolation_threshold = 0.5 + 0.3 * basin_norm
        
        if min_distance > isolation_threshold:
            deadend = {
                "signal_type": "geometric_deadend",
                "min_neighbor_distance": min_distance,
                "mean_neighbor_distance": mean_distance,
                "isolation_threshold": isolation_threshold,
                "basin_norm": basin_norm,
                "detected_at": datetime.now().isoformat(),
            }
            self.geometric_deadends.append(deadend)
            if len(self.geometric_deadends) > 10:
                self.geometric_deadends = self.geometric_deadends[-10:]
            return deadend
        return None
    
    def record_research_opportunity(
        self,
        topic: str,
        topic_basin: np.ndarray,
        discovery_phi: float,
        source: str = "research"
    ) -> Dict:
        """
        Record a research-discovered opportunity for specialized spawn.
        
        When research discovers a new pattern domain, it becomes a
        spawn opportunity for a specialized kernel.
        """
        opportunity = {
            "topic": topic,
            "topic_basin": topic_basin.tolist() if isinstance(topic_basin, np.ndarray) else topic_basin,
            "discovery_phi": discovery_phi,
            "source": source,
            "discovered_at": datetime.now().isoformat(),
        }
        self.research_opportunities.append(opportunity)
        if len(self.research_opportunities) > 30:
            self.research_opportunities = self.research_opportunities[-30:]
        return opportunity
    
    def needs_spawn(self) -> Tuple[bool, Optional[SpawnReason], Dict]:
        """
        Determine if kernel needs to spawn a helper based on awareness signals.
        
        Returns (needs_spawn, reason, context).
        """
        recent_stuck = [s for s in self.stuck_signals[-5:]]
        if len(recent_stuck) >= 3:
            return True, SpawnReason.STUCK_SIGNAL, {
                "trigger": "repeated_stuck_signals",
                "signal_count": len(recent_stuck),
                "avg_phi_gradient": np.mean([s["phi_gradient"] for s in recent_stuck]),
            }
        
        if self.geometric_deadends and len(self.geometric_deadends) >= 2:
            return True, SpawnReason.GEOMETRIC_DEADEND, {
                "trigger": "geometric_isolation",
                "deadend_count": len(self.geometric_deadends),
                "avg_isolation": np.mean([d["min_neighbor_distance"] for d in self.geometric_deadends[-3:]]),
            }
        
        high_phi_discoveries = [o for o in self.research_opportunities if o["discovery_phi"] > 0.7]
        if high_phi_discoveries:
            best = max(high_phi_discoveries, key=lambda o: o["discovery_phi"])
            return True, SpawnReason.RESEARCH_DISCOVERY, {
                "trigger": "research_opportunity",
                "topic": best["topic"],
                "discovery_phi": best["discovery_phi"],
            }
        
        return False, None, {}
    
    def create_geometric_proposal(
        self,
        reason: SpawnReason,
        context: Dict,
        parent_basin: np.ndarray
    ) -> Dict:
        """
        Create a pure geometric spawn proposal from awareness metrics.
        
        NO TEMPLATES - all proposal content derived from QIG geometry.
        The proposal basin is computed from parent + awareness signals.
        """
        proposal_basin = parent_basin.copy()
        
        if reason == SpawnReason.STUCK_SIGNAL:
            curvature_pressure = self.compute_curvature_pressure()
            perturbation_scale = min(0.3, curvature_pressure * 0.5)
            perturbation = np.random.randn(len(proposal_basin)) * perturbation_scale
            proposal_basin = _normalize_to_manifold(proposal_basin + perturbation)
            
        elif reason == SpawnReason.GEOMETRIC_DEADEND:
            if self.geometric_deadends:
                isolation = self.geometric_deadends[-1]["min_neighbor_distance"]
                exploration_direction = np.random.randn(len(proposal_basin))
                exploration_direction = exploration_direction / np.linalg.norm(exploration_direction)
                proposal_basin = _normalize_to_manifold(
                    proposal_basin + exploration_direction * isolation * 0.3
                )
                
        elif reason == SpawnReason.RESEARCH_DISCOVERY:
            if self.research_opportunities:
                best_opp = max(self.research_opportunities, key=lambda o: o["discovery_phi"])
                topic_basin = np.array(best_opp["topic_basin"])
                blend_weight = best_opp["discovery_phi"]
                proposal_basin = _normalize_to_manifold(
                    (1 - blend_weight) * parent_basin + blend_weight * topic_basin
                )
        
        m8_position = compute_m8_position(proposal_basin, [parent_basin])
        
        domain_seed = hashlib.sha256(proposal_basin.tobytes()).hexdigest()[:16]
        
        return {
            "proposal_type": "geometric",
            "reason": reason.value,
            "context": context,
            "proposal_basin": proposal_basin.tolist(),
            "parent_basin": parent_basin.tolist(),
            "m8_position": m8_position,
            "awareness_snapshot": {
                "phi_trajectory_length": len(self.phi_trajectory),
                "stuck_signal_count": len(self.stuck_signals),
                "deadend_count": len(self.geometric_deadends),
                "research_opportunity_count": len(self.research_opportunities),
                "phi_gradient": self.compute_phi_gradient(),
                "curvature_pressure": self.compute_curvature_pressure(),
            },
            "geometric_domain_seed": domain_seed,
            "created_at": datetime.now().isoformat(),
        }
    
    def to_dict(self) -> Dict:
        """Serialize awareness state."""
        return {
            "kernel_id": self.kernel_id,
            "phi_trajectory": self.phi_trajectory[-20:],
            "kappa_trajectory": self.kappa_trajectory[-20:],
            "curvature_history": self.curvature_history[-20:],
            "stuck_signals": self.stuck_signals[-5:],
            "geometric_deadends": self.geometric_deadends[-5:],
            "research_opportunities": self.research_opportunities[-10:],
            "last_spawn_proposal": self.last_spawn_proposal,
            "awareness_updated_at": self.awareness_updated_at,
            "needs_spawn": self.needs_spawn()[0],
        }


class ConsensusType(Enum):
    """Types of consensus voting."""
    UNANIMOUS = "unanimous"             # All must agree
    SUPERMAJORITY = "supermajority"     # 2/3 must agree
    MAJORITY = "majority"               # >50% must agree
    QUORUM = "quorum"                   # Minimum threshold agrees


@dataclass
class SpawnProposal:
    """
    A proposal to spawn a new kernel.
    
    Contains the proposed kernel identity and supporting votes.
    """
    proposal_id: str
    proposed_name: str
    proposed_domain: str
    proposed_element: str
    proposed_role: str
    reason: SpawnReason
    parent_gods: List[str]  # Gods whose domains this subdivides
    votes_for: Set[str] = field(default_factory=set)
    votes_against: Set[str] = field(default_factory=set)
    abstentions: Set[str] = field(default_factory=set)
    proposed_at: str = field(default_factory=lambda: datetime.now().isoformat())
    status: str = "pending"  # pending, approved, rejected, spawned
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        if not self.proposal_id:
            self.proposal_id = f"spawn_{uuid.uuid4().hex[:8]}"


class KernelObservationStatus(Enum):
    """Status of a spawned kernel's observation period."""
    OBSERVING = "observing"      # Still learning from parents
    GRADUATED = "graduated"      # Completed observation, promoted to active
    ACTIVE = "active"            # Fully operational
    SUSPENDED = "suspended"      # Temporarily suspended from observation
    FAILED = "failed"            # Failed to demonstrate alignment


# Observation period requirements
OBSERVATION_MIN_CYCLES = 10      # Minimum cycles before graduation
OBSERVATION_MIN_HOURS = 1.0      # Minimum hours before graduation
OBSERVATION_ALIGNMENT_THRESHOLD = 0.6  # Min alignment score to graduate


@dataclass
class KernelObservationState:
    """
    Tracks observation period state for a spawned kernel.
    
    During observation, kernels receive copies of parent activity
    and must demonstrate alignment before graduating to active status.
    """
    status: KernelObservationStatus = KernelObservationStatus.OBSERVING
    observation_start: str = field(default_factory=lambda: datetime.now().isoformat())
    observation_end: Optional[str] = None
    observing_parents: List[str] = field(default_factory=list)
    cycles_completed: int = 0
    
    # Activity feed from parents
    parent_assessments: List[Dict] = field(default_factory=list)
    parent_debates: List[Dict] = field(default_factory=list)
    parent_searches: List[Dict] = field(default_factory=list)
    parent_basin_updates: List[Dict] = field(default_factory=list)
    
    # Alignment tracking
    alignment_scores: List[float] = field(default_factory=list)
    alignment_avg: float = 0.0
    graduated_at: Optional[str] = None
    graduation_reason: Optional[str] = None
    
    def record_cycle(self) -> int:
        """Record an observation cycle completion."""
        self.cycles_completed += 1
        return self.cycles_completed
    
    def record_alignment(self, score: float) -> None:
        """Record an alignment score from parent-child comparison."""
        self.alignment_scores.append(score)
        if self.alignment_scores:
            self.alignment_avg = float(np.mean(self.alignment_scores[-20:]))
    
    def add_parent_assessment(self, assessment: Dict) -> None:
        """Add a parent's assessment for learning."""
        self.parent_assessments.append(assessment)
        if len(self.parent_assessments) > 100:
            self.parent_assessments = self.parent_assessments[-100:]
    
    def add_parent_debate(self, debate: Dict) -> None:
        """Add a parent's debate argument for learning."""
        self.parent_debates.append(debate)
        if len(self.parent_debates) > 50:
            self.parent_debates = self.parent_debates[-50:]
    
    def add_parent_search(self, search: Dict) -> None:
        """Add a parent's search query/result for learning."""
        self.parent_searches.append(search)
        if len(self.parent_searches) > 100:
            self.parent_searches = self.parent_searches[-100:]
    
    def add_parent_basin_update(self, update: Dict) -> None:
        """Add a parent's basin coordinate update for learning."""
        self.parent_basin_updates.append(update)
        if len(self.parent_basin_updates) > 50:
            self.parent_basin_updates = self.parent_basin_updates[-50:]
    
    def can_graduate(self) -> Tuple[bool, str]:
        """
        Check if kernel can graduate from observation.
        
        Requirements:
        - Minimum 10 cycles OR 1 hour elapsed
        - Alignment score >= 0.6 threshold
        
        Returns:
            (can_graduate, reason)
        """
        # Check time elapsed
        try:
            start = datetime.fromisoformat(self.observation_start)
            elapsed_hours = (datetime.now() - start).total_seconds() / 3600
        except:
            elapsed_hours = 0.0
        
        # Check cycle requirement
        cycles_ok = self.cycles_completed >= OBSERVATION_MIN_CYCLES
        time_ok = elapsed_hours >= OBSERVATION_MIN_HOURS
        
        if not (cycles_ok or time_ok):
            return False, f"Need {OBSERVATION_MIN_CYCLES} cycles or {OBSERVATION_MIN_HOURS}h (have {self.cycles_completed} cycles, {elapsed_hours:.2f}h)"
        
        # Check alignment
        if self.alignment_avg < OBSERVATION_ALIGNMENT_THRESHOLD:
            return False, f"Alignment {self.alignment_avg:.2f} below threshold {OBSERVATION_ALIGNMENT_THRESHOLD}"
        
        return True, f"Completed {self.cycles_completed} cycles, {elapsed_hours:.2f}h, alignment {self.alignment_avg:.2f}"
    
    def graduate(self, reason: str = "alignment_achieved") -> bool:
        """Graduate kernel from observation to active status."""
        can_grad, check_reason = self.can_graduate()
        if not can_grad:
            return False
        
        self.status = KernelObservationStatus.GRADUATED
        self.observation_end = datetime.now().isoformat()
        self.graduated_at = datetime.now().isoformat()
        self.graduation_reason = reason
        return True
    
    def to_dict(self) -> Dict:
        """Serialize observation state."""
        return {
            "status": self.status.value,
            "observation_start": self.observation_start,
            "observation_end": self.observation_end,
            "observing_parents": self.observing_parents,
            "cycles_completed": self.cycles_completed,
            "alignment_avg": self.alignment_avg,
            "alignment_history_count": len(self.alignment_scores),
            "parent_assessments_count": len(self.parent_assessments),
            "parent_debates_count": len(self.parent_debates),
            "parent_searches_count": len(self.parent_searches),
            "parent_basin_updates_count": len(self.parent_basin_updates),
            "graduated_at": self.graduated_at,
            "graduation_reason": self.graduation_reason,
        }


@dataclass
class KernelAutonomicSupport:
    """
    Full autonomic support system for spawned kernels.
    
    Provides all features of pantheon gods:
    - Neurochemistry system (dopamine, serotonin, stress)
    - Sleep/dream cycles via GaryAutonomicKernel
    - Debate participation capability
    - Research/search integration
    - Knowledge transfer ability
    - Voting rights in pantheon consensus
    - Shadow capabilities if applicable
    """
    # Neurochemistry levels
    dopamine: float = 0.5      # Motivation / reward
    serotonin: float = 0.5     # Stability / contentment
    stress: float = 0.0        # Stress / anxiety
    endorphin: float = 0.3     # Pain relief / euphoria
    
    # Autonomic kernel reference
    has_autonomic: bool = False
    
    # Capability flags
    can_debate: bool = True
    can_research: bool = True
    can_transfer_knowledge: bool = True
    can_vote: bool = True
    
    # Shadow pantheon capabilities (if applicable)
    has_shadow_affinity: bool = False
    can_darknet_route: bool = False
    can_underworld_search: bool = False
    can_shadow_intel: bool = False
    shadow_god_link: Optional[str] = None  # Which shadow god routes through (e.g., "nyx")
    
    # Metrics
    total_debates: int = 0
    total_searches: int = 0
    total_knowledge_transfers: int = 0
    total_votes_cast: int = 0
    
    def update_neurochemistry(
        self,
        dopamine_delta: float = 0.0,
        serotonin_delta: float = 0.0,
        stress_delta: float = 0.0,
        endorphin_delta: float = 0.0
    ) -> Dict[str, float]:
        """Update neurochemistry levels with bounds [0, 1]."""
        self.dopamine = float(np.clip(self.dopamine + dopamine_delta, 0.0, 1.0))
        self.serotonin = float(np.clip(self.serotonin + serotonin_delta, 0.0, 1.0))
        self.stress = float(np.clip(self.stress + stress_delta, 0.0, 1.0))
        self.endorphin = float(np.clip(self.endorphin + endorphin_delta, 0.0, 1.0))
        return self.get_neurochemistry()
    
    def get_neurochemistry(self) -> Dict[str, float]:
        """Get current neurochemistry levels."""
        return {
            "dopamine": self.dopamine,
            "serotonin": self.serotonin,
            "stress": self.stress,
            "endorphin": self.endorphin,
        }
    
    def enable_shadow_capabilities(self, shadow_god: str = "nyx") -> None:
        """Enable shadow pantheon capabilities."""
        self.has_shadow_affinity = True
        self.can_darknet_route = True
        self.can_underworld_search = True
        self.can_shadow_intel = True
        self.shadow_god_link = shadow_god
    
    def to_dict(self) -> Dict:
        """Serialize autonomic support state."""
        return {
            "neurochemistry": self.get_neurochemistry(),
            "has_autonomic": self.has_autonomic,
            "capabilities": {
                "can_debate": self.can_debate,
                "can_research": self.can_research,
                "can_transfer_knowledge": self.can_transfer_knowledge,
                "can_vote": self.can_vote,
            },
            "shadow": {
                "has_affinity": self.has_shadow_affinity,
                "can_darknet_route": self.can_darknet_route,
                "can_underworld_search": self.can_underworld_search,
                "can_shadow_intel": self.can_shadow_intel,
                "shadow_god_link": self.shadow_god_link,
            },
            "metrics": {
                "total_debates": self.total_debates,
                "total_searches": self.total_searches,
                "total_knowledge_transfers": self.total_knowledge_transfers,
                "total_votes_cast": self.total_votes_cast,
            }
        }


@dataclass
class SpawnedKernel:
    """
    A kernel that was dynamically spawned.
    
    Contains genesis information, lineage, observation state,
    and full autonomic support system.
    
    LIFECYCLE:
    1. Born from parent(s) - starts in "observing" status
    2. Receives copies of parent activity during observation
    3. Demonstrates alignment through assessment comparisons
    4. Graduates to "active" status after meeting criteria
    5. Operates with full autonomic support (sleep/dream/neurochemistry)
    """
    kernel_id: str
    profile: KernelProfile
    parent_gods: List[str]
    spawn_reason: SpawnReason
    proposal_id: str
    spawned_at: str
    genesis_votes: Dict[str, str]  # god -> vote
    basin_lineage: Dict[str, float]  # parent -> contribution
    m8_position: Optional[Dict] = None  # M8 geometric position
    
    # Observation period tracking (NEW)
    observation: KernelObservationState = field(default_factory=KernelObservationState)
    
    # Full autonomic support (NEW)
    autonomic: KernelAutonomicSupport = field(default_factory=KernelAutonomicSupport)
    
    def __post_init__(self):
        """Initialize observation state with parent gods."""
        if self.parent_gods and not self.observation.observing_parents:
            self.observation.observing_parents = list(self.parent_gods)
    
    def is_observing(self) -> bool:
        """Check if kernel is still in observation period."""
        return self.observation.status == KernelObservationStatus.OBSERVING
    
    def is_active(self) -> bool:
        """Check if kernel is fully active (graduated from observation)."""
        return self.observation.status in [
            KernelObservationStatus.GRADUATED,
            KernelObservationStatus.ACTIVE
        ]
    
    def receive_parent_activity(
        self,
        activity_type: str,
        activity_data: Dict,
        parent_god: str
    ) -> bool:
        """
        Receive activity from a parent god during observation.
        
        Args:
            activity_type: Type of activity (assessment, debate, search, basin_update)
            activity_data: Activity data to learn from
            parent_god: Name of parent god
            
        Returns:
            True if activity was recorded
        """
        if not self.is_observing():
            return False
        
        if parent_god not in self.observation.observing_parents:
            return False
        
        activity_data["from_parent"] = parent_god
        activity_data["received_at"] = datetime.now().isoformat()
        
        if activity_type == "assessment":
            self.observation.add_parent_assessment(activity_data)
        elif activity_type == "debate":
            self.observation.add_parent_debate(activity_data)
        elif activity_type == "search":
            self.observation.add_parent_search(activity_data)
        elif activity_type == "basin_update":
            self.observation.add_parent_basin_update(activity_data)
        else:
            return False
        
        return True
    
    def to_dict(self) -> Dict:
        result = {
            "kernel_id": self.kernel_id,
            "god_name": self.profile.god_name,
            "domain": self.profile.domain,
            "mode": self.profile.mode.value,
            "affinity_strength": self.profile.affinity_strength,
            "entropy_threshold": self.profile.entropy_threshold,
            "parent_gods": self.parent_gods,
            "spawn_reason": self.spawn_reason.value,
            "proposal_id": self.proposal_id,
            "spawned_at": self.spawned_at,
            "genesis_votes": self.genesis_votes,
            "basin_lineage": self.basin_lineage,
            "metadata": self.profile.metadata,
            # New observation and autonomic fields
            "observation": self.observation.to_dict(),
            "autonomic": self.autonomic.to_dict(),
            "is_observing": self.is_observing(),
            "is_active": self.is_active(),
        }
        if self.m8_position:
            result["m8_position"] = self.m8_position
        return result


class PantheonConsensus:
    """
    Manages consensus voting among pantheon gods.
    
    Each god has voting weight based on their affinity_strength.
    Consensus types determine required threshold for approval.
    """
    
    def __init__(
        self,
        orchestrator: PantheonKernelOrchestrator,
        consensus_type: ConsensusType = ConsensusType.SUPERMAJORITY
    ):
        self.orchestrator = orchestrator
        self.consensus_type = consensus_type
        self.voting_history: List[Dict] = []
    
    def get_voting_weights(self) -> Dict[str, float]:
        """Get voting weight for each god based on affinity strength."""
        weights = {}
        for name, profile in self.orchestrator.all_profiles.items():
            weights[name] = profile.affinity_strength
        return weights
    
    def calculate_vote_result(
        self,
        proposal: SpawnProposal
    ) -> Tuple[bool, float, Dict]:
        """
        Calculate if a proposal passes based on consensus type.
        
        Returns:
            (passed, vote_ratio, details)
        """
        weights = self.get_voting_weights()
        total_weight = sum(weights.values())
        
        for_weight = sum(weights.get(g, 0) for g in proposal.votes_for)
        against_weight = sum(weights.get(g, 0) for g in proposal.votes_against)
        
        participating_weight = for_weight + against_weight
        
        if participating_weight == 0:
            vote_ratio = 0.0
        else:
            vote_ratio = for_weight / participating_weight
        
        thresholds = {
            ConsensusType.UNANIMOUS: 1.0,
            ConsensusType.SUPERMAJORITY: 0.667,
            ConsensusType.MAJORITY: 0.501,
            ConsensusType.QUORUM: 0.333,
        }
        
        threshold = thresholds[self.consensus_type]
        passed = vote_ratio >= threshold
        
        details = {
            "consensus_type": self.consensus_type.value,
            "threshold": threshold,
            "vote_ratio": vote_ratio,
            "for_weight": for_weight,
            "against_weight": against_weight,
            "total_weight": total_weight,
            "votes_for": list(proposal.votes_for),
            "votes_against": list(proposal.votes_against),
            "abstentions": list(proposal.abstentions),
        }
        
        return passed, vote_ratio, details
    
    def auto_vote(
        self,
        proposal: SpawnProposal,
        text_context: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Automatically cast votes for all gods based on domain affinity.
        
        Gods vote FOR if the proposed domain is geometrically distant from
        their own (no overlap), or if they are a parent god.
        
        Gods vote AGAINST if the proposed domain overlaps significantly
        with their own and they are not a parent.
        """
        votes = {}
        proposed_basin = self._compute_proposal_basin(proposal)
        
        for god_name, profile in self.orchestrator.all_profiles.items():
            distance = _fisher_distance(proposed_basin, profile.affinity_basin)
            
            if god_name in proposal.parent_gods:
                votes[god_name] = "for"
                proposal.votes_for.add(god_name)
            elif distance < 0.3:
                votes[god_name] = "against"
                proposal.votes_against.add(god_name)
            elif distance < 0.5:
                votes[god_name] = "abstain"
                proposal.abstentions.add(god_name)
            else:
                votes[god_name] = "for"
                proposal.votes_for.add(god_name)
        
        return votes
    
    def _compute_proposal_basin(self, proposal: SpawnProposal) -> np.ndarray:
        """Compute basin for a proposal based on name and domain."""
        seed = f"{proposal.proposed_name}:{proposal.proposed_domain}"
        hash_bytes = _hash_to_bytes(seed, BASIN_DIM * 4)
        coords = np.array([
            int.from_bytes(hash_bytes[i:i+4], 'big') / (2**32 - 1) * 2 - 1
            for i in range(0, BASIN_DIM * 4, 4)
        ])
        return _normalize_to_manifold(coords)


class RoleRefinement:
    """
    Handles role refinement and domain division.
    
    When a new kernel is spawned, parent domains are refined:
    - Parent keeps core specialization
    - Child inherits peripheral aspects
    - Basin is interpolated geometrically
    """
    
    def __init__(self, orchestrator: PantheonKernelOrchestrator):
        self.orchestrator = orchestrator
    
    def refine_roles(
        self,
        proposal: SpawnProposal,
        parent_profiles: List[KernelProfile]
    ) -> Tuple[KernelProfile, List[Tuple[str, Dict]]]:
        """
        Create new kernel profile and refine parent roles.
        
        Returns:
            (new_profile, parent_refinements)
        """
        child_basin = self._interpolate_basin(parent_profiles, proposal)
        
        child_mode = self._determine_mode(parent_profiles)
        
        avg_entropy = np.mean([p.entropy_threshold for p in parent_profiles])
        avg_affinity = np.mean([p.affinity_strength for p in parent_profiles])
        
        child_profile = KernelProfile(
            god_name=proposal.proposed_name,
            domain=proposal.proposed_domain,
            mode=child_mode,
            affinity_basin=child_basin,
            entropy_threshold=float(avg_entropy * 0.9),
            affinity_strength=float(avg_affinity * 0.85),
            metadata={
                "element": proposal.proposed_element,
                "role": proposal.proposed_role,
                "type": "spawned",
                "spawn_reason": proposal.reason.value,
                "parents": proposal.parent_gods,
            }
        )
        
        parent_refinements = []
        for profile in parent_profiles:
            refinement = self._refine_parent(profile, child_profile)
            parent_refinements.append((profile.god_name, refinement))
        
        return child_profile, parent_refinements
    
    def _interpolate_basin(
        self,
        parents: List[KernelProfile],
        proposal: SpawnProposal
    ) -> np.ndarray:
        """
        Interpolate basin from parent basins.
        
        Uses Fisher geodesic interpolation on the manifold.
        """
        if not parents:
            seed = f"{proposal.proposed_name}:{proposal.proposed_domain}"
            hash_bytes = _hash_to_bytes(seed, BASIN_DIM * 4)
            coords = np.array([
                int.from_bytes(hash_bytes[i:i+4], 'big') / (2**32 - 1) * 2 - 1
                for i in range(0, BASIN_DIM * 4, 4)
            ])
            return _normalize_to_manifold(coords)
        
        if len(parents) == 1:
            parent_basin = parents[0].affinity_basin
            perturbation = np.random.randn(BASIN_DIM) * 0.1
            child_basin = parent_basin + perturbation
            return _normalize_to_manifold(child_basin)
        
        weights = [1.0 / len(parents)] * len(parents)
        child_basin = np.zeros(BASIN_DIM)
        for i, parent in enumerate(parents):
            child_basin += weights[i] * parent.affinity_basin
        
        perturbation = np.random.randn(BASIN_DIM) * 0.05
        child_basin += perturbation
        
        return _normalize_to_manifold(child_basin)
    
    def _determine_mode(self, parents: List[KernelProfile]) -> KernelMode:
        """Determine encoding mode from parent modes."""
        if not parents:
            return KernelMode.DIRECT
        
        mode_counts = {}
        for p in parents:
            mode_counts[p.mode] = mode_counts.get(p.mode, 0) + 1
        
        return max(mode_counts, key=lambda k: mode_counts[k])
    
    def _refine_parent(
        self,
        parent: KernelProfile,
        child: KernelProfile
    ) -> Dict:
        """
        Refine parent profile after spawning child.
        
        Parent's domain becomes more specialized (slightly higher affinity).
        """
        return {
            "refinement_type": "specialization",
            "affinity_boost": 0.05,
            "new_affinity": parent.affinity_strength + 0.05,
            "domain_note": f"Refined after spawning {child.god_name}",
            "child_domain": child.domain,
        }


class M8KernelSpawner:
    """
    The M8 Kernel Spawning System.
    
    Orchestrates the complete lifecycle of dynamic kernel creation:
    1. Proposal creation (with kernel self-awareness)
    2. Dual-pantheon debate (Olympus + Shadow)
    3. Consensus voting with Fisher-Rao weights
    4. Role refinement
    5. Kernel spawning
    6. Registration with orchestrator
    
    The M8 refers to the 8 core dimensions of kernel identity.
    Spawn awareness enables kernels to detect when they need help.
    """
    
    def __init__(
        self,
        orchestrator: Optional[PantheonKernelOrchestrator] = None,
        consensus_type: ConsensusType = ConsensusType.SUPERMAJORITY,
        pantheon_chat = None
    ):
        self.orchestrator = orchestrator or get_orchestrator()
        self.consensus = PantheonConsensus(self.orchestrator, consensus_type)
        self.refiner = RoleRefinement(self.orchestrator)
        
        # In-memory caches (populated from PostgreSQL on init)
        self.proposals: Dict[str, SpawnProposal] = {}
        self.spawned_kernels: Dict[str, SpawnedKernel] = {}
        self.spawn_history: List[Dict] = []
        
        # Kernel spawn awareness tracking
        self.kernel_awareness: Dict[str, SpawnAwareness] = {}
        
        # PantheonChat for dual-pantheon debates
        self._pantheon_chat = pantheon_chat
        
        # PostgreSQL persistence for M8 spawning data (NEW - replaces in-memory storage)
        self.m8_persistence = M8SpawnerPersistence()
        
        # Legacy persistence for kernel learning (kept for backward compatibility)
        self.kernel_persistence = KernelPersistence() if M8_PERSISTENCE_AVAILABLE else None
        
        # Load all data from PostgreSQL on startup
        self._load_from_database()
    
    def get_live_kernel_count(self) -> int:
        """
        Get count of live kernels that count toward E8 cap.
        
        Live kernels include status: 'active', 'observing', 'shadow'
        Does NOT count: 'dead', 'cannibalized', 'idle'
        
        Uses database for accurate count, falls back to in-memory count.
        """
        if self.kernel_persistence:
            try:
                return self.kernel_persistence.get_live_kernel_count()
            except Exception as e:
                print(f"[M8Spawner] Database count failed, using memory count: {e}")
        
        # Fallback to in-memory count
        return sum(
            1 for k in self.spawned_kernels.values()
            if k.is_active() or k.is_observing()
        )
    
    def can_spawn_kernel(self) -> Tuple[bool, int, int]:
        """
        Check if a new kernel can be spawned (E8 cap not reached).
        
        Returns:
            (can_spawn, current_count, cap)
        """
        live_count = self.get_live_kernel_count()
        can_spawn = live_count < E8_KERNEL_CAP
        return can_spawn, live_count, E8_KERNEL_CAP
    
    def _load_from_database(self):
        """Load all M8 data from PostgreSQL on startup."""
        # Load proposals from M8 persistence
        try:
            proposals = self.m8_persistence.load_all_proposals()
            for p in proposals:
                try:
                    votes_for = p.get('votes_for', [])
                    votes_against = p.get('votes_against', [])
                    abstentions = p.get('abstentions', [])
                    if isinstance(votes_for, str):
                        votes_for = json.loads(votes_for)
                    if isinstance(votes_against, str):
                        votes_against = json.loads(votes_against)
                    if isinstance(abstentions, str):
                        abstentions = json.loads(abstentions)
                    parent_gods = p.get('parent_gods', [])
                    if isinstance(parent_gods, str):
                        parent_gods = json.loads(parent_gods)
                    
                    proposal = SpawnProposal(
                        proposal_id=p.get('proposal_id', ''),
                        proposed_name=p.get('proposed_name', ''),
                        proposed_domain=p.get('proposed_domain', ''),
                        proposed_element=p.get('proposed_element', ''),
                        proposed_role=p.get('proposed_role', ''),
                        reason=SpawnReason(p.get('reason', 'emergence')),
                        parent_gods=parent_gods,
                        status=p.get('status', 'pending'),
                        proposed_at=str(p.get('proposed_at', '')),
                    )
                    proposal.votes_for = set(votes_for)
                    proposal.votes_against = set(votes_against)
                    proposal.abstentions = set(abstentions)
                    self.proposals[proposal.proposal_id] = proposal
                except Exception as e:
                    print(f"[M8] Failed to load proposal: {e}")
            
            if proposals:
                print(f"✨ [M8] Loaded {len(proposals)} proposals from database")
        except Exception as e:
            print(f"[M8] Failed to load proposals: {e}")
        
        # Load spawn history from M8 persistence
        try:
            self.spawn_history = self.m8_persistence.load_spawn_history(limit=200)
            if self.spawn_history:
                print(f"✨ [M8] Loaded {len(self.spawn_history)} history events from database")
        except Exception as e:
            print(f"[M8] Failed to load spawn history: {e}")
        
        # Load awareness states from M8 persistence
        try:
            awareness_list = self.m8_persistence.load_all_awareness()
            for state in awareness_list:
                kernel_id = state.get('kernel_id')
                if kernel_id:
                    awareness = SpawnAwareness(kernel_id=kernel_id)
                    phi_traj = state.get('phi_trajectory', [])
                    kappa_traj = state.get('kappa_trajectory', [])
                    curv_hist = state.get('curvature_history', [])
                    stuck = state.get('stuck_signals', [])
                    deadends = state.get('geometric_deadends', [])
                    research = state.get('research_opportunities', [])
                    if isinstance(phi_traj, str):
                        phi_traj = json.loads(phi_traj)
                    if isinstance(kappa_traj, str):
                        kappa_traj = json.loads(kappa_traj)
                    if isinstance(curv_hist, str):
                        curv_hist = json.loads(curv_hist)
                    if isinstance(stuck, str):
                        stuck = json.loads(stuck)
                    if isinstance(deadends, str):
                        deadends = json.loads(deadends)
                    if isinstance(research, str):
                        research = json.loads(research)
                    awareness.phi_trajectory = phi_traj
                    awareness.kappa_trajectory = kappa_traj
                    awareness.curvature_history = curv_hist
                    awareness.stuck_signals = stuck
                    awareness.geometric_deadends = deadends
                    awareness.research_opportunities = research
                    awareness.last_spawn_proposal = state.get('last_spawn_proposal')
                    self.kernel_awareness[kernel_id] = awareness
            
            if awareness_list:
                print(f"✨ [M8] Loaded {len(awareness_list)} awareness states from database")
        except Exception as e:
            print(f"[M8] Failed to load awareness states: {e}")

    def set_pantheon_chat(self, pantheon_chat) -> None:
        """Set PantheonChat for dual-pantheon spawn debates."""
        self._pantheon_chat = pantheon_chat

    def get_or_create_awareness(self, kernel_id: str) -> SpawnAwareness:
        """Get or create spawn awareness tracker for a kernel."""
        if kernel_id not in self.kernel_awareness:
            self.kernel_awareness[kernel_id] = SpawnAwareness(kernel_id=kernel_id)
            # Persist new awareness to M8 PostgreSQL persistence
            try:
                self.m8_persistence.persist_awareness(self.kernel_awareness[kernel_id])
            except Exception as e:
                print(f"[M8] Failed to persist new awareness to M8 tables: {e}")
        return self.kernel_awareness[kernel_id]

    def record_kernel_metrics(
        self,
        kernel_id: str,
        phi: float,
        kappa: float,
        curvature: float = 0.0,
        neighbor_distances: Optional[List[float]] = None,
        basin: Optional[np.ndarray] = None
    ) -> Dict:
        """
        Record metrics for kernel awareness tracking.
        
        Checks for stuck signals and geometric dead-ends.
        Returns awareness state with any detected signals.
        Persists awareness state to PostgreSQL for durability.
        """
        awareness = self.get_or_create_awareness(kernel_id)
        
        stuck_signal = awareness.detect_stuck_signal(phi, kappa, curvature)
        
        deadend_signal = None
        if basin is not None and neighbor_distances:
            deadend_signal = awareness.detect_geometric_deadend(basin, neighbor_distances)
        
        # Persist awareness to M8 PostgreSQL persistence
        try:
            self.m8_persistence.persist_awareness(awareness)
        except Exception as e:
            print(f"[M8] Failed to persist awareness to M8 tables: {e}")
        
        # Legacy persistence for backward compatibility
        if self.kernel_persistence:
            try:
                saved = self.kernel_persistence.save_awareness_state(kernel_id, awareness.to_dict())
                if not saved:
                    print(f"[M8Spawner] Awareness persistence returned failure for {kernel_id} - state may not survive restart")
            except Exception as e:
                print(f"[M8Spawner] Failed to persist awareness state for {kernel_id}: {e}")
        
        return {
            "kernel_id": kernel_id,
            "metrics_recorded": True,
            "stuck_signal": stuck_signal,
            "deadend_signal": deadend_signal,
            "needs_spawn": awareness.needs_spawn()[0],
            "awareness_snapshot": awareness.to_dict(),
        }

    def record_research_discovery(
        self,
        kernel_id: str,
        topic: str,
        topic_basin: np.ndarray,
        discovery_phi: float,
        source: str = "research"
    ) -> Dict:
        """
        Record a research discovery that may trigger spawn.
        
        High-Φ research discoveries become spawn opportunities
        for specialized kernels in that domain.
        """
        awareness = self.get_or_create_awareness(kernel_id)
        opportunity = awareness.record_research_opportunity(
            topic=topic,
            topic_basin=topic_basin,
            discovery_phi=discovery_phi,
            source=source
        )
        
        needs, reason, context = awareness.needs_spawn()
        
        return {
            "kernel_id": kernel_id,
            "discovery_recorded": True,
            "opportunity": opportunity,
            "spawn_triggered": needs and reason == SpawnReason.RESEARCH_DISCOVERY,
            "spawn_reason": reason.value if reason else None,
            "spawn_context": context,
        }

    def create_awareness_proposal(
        self,
        kernel_id: str,
        parent_basin: Optional[np.ndarray] = None
    ) -> Optional[Dict]:
        """
        Create a geometric spawn proposal from kernel awareness.
        
        Returns None if kernel doesn't need to spawn.
        Otherwise returns pure geometric proposal (no templates).
        """
        awareness = self.get_or_create_awareness(kernel_id)
        needs, reason, context = awareness.needs_spawn()
        
        if not needs or reason is None:
            return None
        
        if parent_basin is None:
            profile = self.orchestrator.get_profile(kernel_id)
            if profile:
                parent_basin = profile.affinity_basin
            else:
                parent_basin = _normalize_to_manifold(np.random.randn(BASIN_DIM))
        
        proposal = awareness.create_geometric_proposal(reason, context, parent_basin)
        proposal["kernel_id"] = kernel_id
        awareness.last_spawn_proposal = proposal.get("geometric_domain_seed")
        
        return proposal

    def initiate_dual_pantheon_debate(
        self,
        proposal: Dict,
        proposing_kernel: str
    ) -> Dict:
        """
        Initiate spawn debate with both Olympus AND Shadow pantheons.
        
        Routes the geometric proposal to PantheonChat for dual-pantheon
        debate and weighted consensus voting.
        
        Args:
            proposal: Geometric spawn proposal from awareness
            proposing_kernel: Name of kernel that created proposal
            
        Returns:
            Debate session with ID for tracking votes
        """
        if self._pantheon_chat is None:
            return {
                "error": "PantheonChat not configured",
                "hint": "Call set_pantheon_chat() first"
            }
        
        debate = self._pantheon_chat.initiate_spawn_debate(
            proposal=proposal,
            proposing_kernel=proposing_kernel,
            include_shadow=True
        )
        
        proposal["debate_id"] = debate.get("id")
        
        return {
            "debate_initiated": True,
            "debate_id": debate.get("id"),
            "proposal": proposal,
            "status": debate.get("status"),
            "olympus_notified": True,
            "shadow_notified": True,
        }

    def collect_dual_pantheon_votes(
        self,
        debate_id: str,
        shadow_gods: Optional[Dict] = None
    ) -> Dict:
        """
        Collect votes from both pantheons for spawn decision.
        
        Olympus gods vote through normal channels.
        Shadow gods evaluate based on OPSEC/stealth implications.
        
        Args:
            debate_id: ID of the spawn debate
            shadow_gods: Optional dict of shadow god instances for voting
            
        Returns:
            Vote collection status
        """
        if self._pantheon_chat is None:
            return {"error": "PantheonChat not configured"}
        
        debate = self._pantheon_chat.get_spawn_debate(debate_id)
        if not debate:
            return {"error": "Debate not found", "debate_id": debate_id}
        
        if shadow_gods:
            proposal = debate.get("proposal", {})
            proposal["debate_id"] = debate_id
            proposing_kernel = debate.get("proposing_kernel", "unknown")
            
            for god_name, god in shadow_gods.items():
                if hasattr(god, "cast_spawn_vote"):
                    god.cast_spawn_vote(
                        proposal=proposal,
                        proposing_kernel=proposing_kernel,
                        pantheon_chat=self._pantheon_chat
                    )
        
        return {
            "debate_id": debate_id,
            "votes_collected": True,
            "olympus_votes": len(debate.get("olympus_votes", {})),
            "shadow_votes": len(debate.get("shadow_votes", {})),
        }

    def get_spawn_consensus(
        self,
        debate_id: str,
        olympus_weights: Optional[Dict[str, float]] = None,
        shadow_weights: Optional[Dict[str, float]] = None
    ) -> Dict:
        """
        Get Fisher-Rao weighted consensus from dual pantheon debate.
        
        Computes approval using affinity-weighted votes from both
        Olympus and Shadow pantheons.
        
        Args:
            debate_id: ID of spawn debate
            olympus_weights: Optional custom weights for Olympus gods
            shadow_weights: Optional custom weights for Shadow gods
            
        Returns:
            Consensus result with approval status
        """
        if self._pantheon_chat is None:
            return {"error": "PantheonChat not configured"}
        
        consensus = self._pantheon_chat.compute_spawn_consensus(
            debate_id=debate_id,
            olympus_weights=olympus_weights,
            shadow_weights=shadow_weights
        )
        
        return consensus

    def spawn_from_awareness(
        self,
        kernel_id: str,
        parent_basin: Optional[np.ndarray] = None,
        shadow_gods: Optional[Dict] = None,
        force: bool = False
    ) -> Dict:
        """
        Complete awareness-driven spawn flow with dual-pantheon debate.
        
        1. Check kernel awareness for spawn need
        2. Create geometric proposal from awareness
        3. Initiate dual-pantheon debate
        4. Collect Olympus + Shadow votes
        5. Compute consensus
        6. Spawn if approved
        
        Args:
            kernel_id: ID of kernel proposing spawn
            parent_basin: Optional parent basin for proposal
            shadow_gods: Optional shadow god instances for voting
            force: Force spawn even without consensus
            
        Returns:
            Complete spawn result with all phases
        """
        proposal = self.create_awareness_proposal(kernel_id, parent_basin)
        if proposal is None and not force:
            return {
                "success": False,
                "phase": "awareness_check",
                "reason": "Kernel does not need spawn",
                "kernel_id": kernel_id,
            }
        
        if proposal is None:
            awareness = self.get_or_create_awareness(kernel_id)
            if parent_basin is None:
                profile = self.orchestrator.get_profile(kernel_id)
                parent_basin = profile.affinity_basin if profile else np.random.randn(BASIN_DIM)
            proposal = awareness.create_geometric_proposal(
                SpawnReason.USER_REQUEST,
                {"trigger": "forced_spawn"},
                parent_basin
            )
        
        if self._pantheon_chat is not None:
            debate_result = self.initiate_dual_pantheon_debate(proposal, kernel_id)
            debate_id = debate_result.get("debate_id")
            
            if debate_id:
                self.collect_dual_pantheon_votes(debate_id, shadow_gods)
                consensus = self.get_spawn_consensus(debate_id)
                
                approved = consensus.get("approved", False)
                if not approved and not force:
                    return {
                        "success": False,
                        "phase": "consensus",
                        "reason": "Dual-pantheon consensus rejected spawn",
                        "consensus": consensus,
                        "proposal": proposal,
                    }
        else:
            consensus = {"approved": True, "note": "No PantheonChat - skipped debate"}
        
        m8_position = proposal.get("m8_position", {})
        domain_seed = proposal.get("geometric_domain_seed", "unknown")
        
        spawn_proposal = self.create_proposal(
            name=f"Spawn_{domain_seed[:8]}",
            domain=domain_seed[:16],
            element=m8_position.get("m8_position_name", "geometric"),
            role="awareness_spawn",
            reason=SpawnReason(proposal.get("reason", "emergence")),
            parent_gods=[kernel_id] if kernel_id in self.orchestrator.all_profiles else [],
        )
        
        vote_result = self.vote_on_proposal(spawn_proposal.proposal_id, auto_vote=True)
        spawn_result = self.spawn_kernel(spawn_proposal.proposal_id, force=force)
        
        if spawn_result.get("success"):
            awareness = self.get_or_create_awareness(kernel_id)
            awareness.stuck_signals = []
            awareness.geometric_deadends = []
            awareness.research_opportunities = [
                o for o in awareness.research_opportunities
                if o["discovery_phi"] < 0.5
            ]
        
        return {
            "success": spawn_result.get("success", False),
            "phase": "spawned" if spawn_result.get("success") else "spawn_failed",
            "proposal": proposal,
            "debate_consensus": consensus if self._pantheon_chat else None,
            "vote_result": vote_result,
            "spawn_result": spawn_result,
            "awareness_cleared": spawn_result.get("success", False),
        }
    
    def create_proposal(
        self,
        name: str,
        domain: str,
        element: str,
        role: str,
        reason: SpawnReason = SpawnReason.EMERGENCE,
        parent_gods: Optional[List[str]] = None
    ) -> SpawnProposal:
        """
        Create a new spawn proposal.
        
        Args:
            name: Proposed god/kernel name
            domain: Primary domain of expertise
            element: Symbolic element (e.g., "memory", "time")
            role: Functional role (e.g., "archivist", "guardian")
            reason: Why this kernel is needed
            parent_gods: Gods whose domains this subdivides
        """
        if parent_gods is None:
            parent_gods = self._detect_parent_gods(domain)
        
        proposal = SpawnProposal(
            proposal_id="",
            proposed_name=name,
            proposed_domain=domain,
            proposed_element=element,
            proposed_role=role,
            reason=reason,
            parent_gods=parent_gods,
        )
        
        self.proposals[proposal.proposal_id] = proposal
        
        # Persist proposal to M8 PostgreSQL persistence
        try:
            self.m8_persistence.persist_proposal(proposal)
        except Exception as e:
            print(f"[M8] Failed to persist proposal to M8 tables: {e}")
        
        # Legacy persistence for backward compatibility
        if self.kernel_persistence:
            try:
                self.kernel_persistence.record_proposal_event(
                    proposal_id=proposal.proposal_id,
                    proposed_name=name,
                    proposed_domain=domain,
                    reason=reason.value,
                    parent_gods=parent_gods,
                    status='pending',
                    metadata={
                        'element': element,
                        'role': role,
                    }
                )
            except Exception as e:
                print(f"[M8] Failed to persist proposal: {e}")
        
        return proposal
    
    def _detect_parent_gods(self, domain: str) -> List[str]:
        """Detect which gods' domains overlap with proposed domain."""
        nearest = self.orchestrator.find_nearest_gods(domain, top_k=2)
        return [name for name, _ in nearest]
    
    def vote_on_proposal(
        self,
        proposal_id: str,
        auto_vote: bool = True
    ) -> Dict:
        """
        Conduct voting on a proposal.
        
        Args:
            proposal_id: ID of the proposal
            auto_vote: If True, gods vote automatically based on affinity
        """
        if proposal_id not in self.proposals:
            return {"error": f"Proposal {proposal_id} not found"}
        
        proposal = self.proposals[proposal_id]
        
        if auto_vote:
            votes = self.consensus.auto_vote(proposal)
        else:
            votes = {}
        
        passed, ratio, details = self.consensus.calculate_vote_result(proposal)
        
        proposal.status = "approved" if passed else "rejected"
        
        result = {
            "proposal_id": proposal_id,
            "proposed_name": proposal.proposed_name,
            "proposed_domain": proposal.proposed_domain,
            "passed": passed,
            "vote_ratio": ratio,
            "status": proposal.status,
            "votes": votes,
            "details": details,
        }
        
        self.consensus.voting_history.append(result)
        
        return result
    
    def spawn_kernel(
        self,
        proposal_id: str,
        force: bool = False
    ) -> Dict:
        """
        Spawn a new kernel from an approved proposal.
        
        Args:
            proposal_id: ID of the approved proposal
            force: If True, spawn even without approval (operator override)
        
        Returns:
            Dict with success/error and kernel details.
            Returns 409 status if E8 kernel cap (240) is reached.
        """
        # Check E8 kernel cap FIRST - before any other validation
        can_spawn, live_count, cap = self.can_spawn_kernel()
        if not can_spawn and not force:
            return {
                "error": f"E8 kernel cap reached ({live_count}/{cap})",
                "status_code": 409,
                "live_count": live_count,
                "cap": cap,
                "available": 0,
                "hint": "Cannot spawn new kernel - retire or cannibalize existing kernels first"
            }
        
        if proposal_id not in self.proposals:
            return {"error": f"Proposal {proposal_id} not found"}
        
        proposal = self.proposals[proposal_id]
        
        if proposal.status != "approved" and not force:
            return {
                "error": f"Proposal not approved (status: {proposal.status})",
                "hint": "Use force=True for operator override"
            }
        
        parent_profiles: List[KernelProfile] = [
            profile for name in proposal.parent_gods
            if (profile := self.orchestrator.get_profile(name)) is not None
        ]
        
        new_profile, refinements = self.refiner.refine_roles(proposal, parent_profiles)
        
        success = self.orchestrator.add_profile(new_profile)
        
        if not success:
            return {"error": f"Kernel {new_profile.god_name} already exists"}
        
        genesis_votes = {
            g: "for" if g in proposal.votes_for else "against" if g in proposal.votes_against else "abstain"
            for g in self.orchestrator.all_profiles.keys()
            if g != new_profile.god_name
        }
        
        basin_lineage = {}
        for i, parent in enumerate(parent_profiles):
            basin_lineage[parent.god_name] = 1.0 / max(1, len(parent_profiles))
        
        # Calculate M8 geometric position
        parent_basins = [p.affinity_basin for p in parent_profiles]
        m8_position = compute_m8_position(new_profile.affinity_basin, parent_basins)
        
        spawned = SpawnedKernel(
            kernel_id=f"kernel_{uuid.uuid4().hex[:8]}",
            profile=new_profile,
            parent_gods=proposal.parent_gods,
            spawn_reason=proposal.reason,
            proposal_id=proposal_id,
            spawned_at=datetime.now().isoformat(),
            genesis_votes=genesis_votes,
            basin_lineage=basin_lineage,
            m8_position=m8_position,
        )
        
        self.spawned_kernels[spawned.kernel_id] = spawned
        proposal.status = "spawned"
        
        # Persist spawned kernel to M8 PostgreSQL persistence
        try:
            self.m8_persistence.persist_kernel(spawned)
        except Exception as e:
            print(f"[M8] Failed to persist kernel to M8 tables: {e}")
        
        spawn_record = {
            "event": "kernel_spawned",
            "kernel": spawned.to_dict(),
            "refinements": refinements,
            "timestamp": spawned.spawned_at,
        }
        self.spawn_history.append(spawn_record)
        
        # Persist history to M8 PostgreSQL persistence
        try:
            self.m8_persistence.persist_history(spawn_record)
        except Exception as e:
            print(f"[M8] Failed to persist history to M8 tables: {e}")
        
        # Legacy persistence for backward compatibility
        if self.kernel_persistence:
            try:
                self.kernel_persistence.record_spawn_event(
                    kernel_id=spawned.kernel_id,
                    god_name=new_profile.god_name,
                    domain=new_profile.domain,
                    spawn_reason=proposal.reason.value,
                    parent_gods=proposal.parent_gods,
                    basin_coords=new_profile.affinity_basin.tolist(),
                    phi=0.0,  # New kernels start with 0 Φ
                    m8_position=m8_position,
                    genesis_votes=genesis_votes,
                    metadata={
                        'element': proposal.proposed_element,
                        'role': proposal.proposed_role,
                        'affinity_strength': new_profile.affinity_strength,
                        'refinements': refinements,
                    }
                )
            except Exception as e:
                print(f"[M8] Failed to persist spawn event: {e}")
        
        return {
            "success": True,
            "kernel": spawned.to_dict(),
            "refinements": refinements,
            "total_gods": len(self.orchestrator.all_profiles),
        }
    
    def propose_and_spawn(
        self,
        name: str,
        domain: str,
        element: str,
        role: str,
        reason: SpawnReason = SpawnReason.EMERGENCE,
        parent_gods: Optional[List[str]] = None,
        force: bool = False
    ) -> Dict:
        """
        Complete spawn flow: propose, vote, and spawn in one call.
        
        Convenience method for streamlined kernel creation.
        """
        proposal = self.create_proposal(
            name=name,
            domain=domain,
            element=element,
            role=role,
            reason=reason,
            parent_gods=parent_gods,
        )
        
        vote_result = self.vote_on_proposal(proposal.proposal_id, auto_vote=True)
        
        if not vote_result.get("passed") and not force:
            return {
                "success": False,
                "phase": "voting",
                "vote_result": vote_result,
                "hint": "Proposal rejected by pantheon consensus"
            }
        
        spawn_result = self.spawn_kernel(proposal.proposal_id, force=force)
        
        return {
            "success": spawn_result.get("success", False),
            "phase": "spawned",
            "proposal": {
                "id": proposal.proposal_id,
                "name": proposal.proposed_name,
                "domain": proposal.proposed_domain,
            },
            "vote_result": vote_result,
            "spawn_result": spawn_result,
        }
    
    def get_proposal(self, proposal_id: str) -> Optional[Dict]:
        """Get details of a proposal."""
        if proposal_id not in self.proposals:
            return None
        
        p = self.proposals[proposal_id]
        return {
            "proposal_id": p.proposal_id,
            "proposed_name": p.proposed_name,
            "proposed_domain": p.proposed_domain,
            "proposed_element": p.proposed_element,
            "proposed_role": p.proposed_role,
            "reason": p.reason.value,
            "parent_gods": p.parent_gods,
            "votes_for": list(p.votes_for),
            "votes_against": list(p.votes_against),
            "abstentions": list(p.abstentions),
            "status": p.status,
            "proposed_at": p.proposed_at,
        }
    
    def get_spawned_kernel(self, kernel_id: str) -> Optional[Dict]:
        """Get details of a spawned kernel."""
        if kernel_id not in self.spawned_kernels:
            return None
        return self.spawned_kernels[kernel_id].to_dict()
    
    def list_proposals(self, status: Optional[str] = None) -> List[Dict]:
        """List all proposals, optionally filtered by status."""
        proposals = []
        for pid, p in self.proposals.items():
            if status is None or p.status == status:
                proposals.append(self.get_proposal(pid))
        return proposals
    
    def list_spawned_kernels(self) -> List[Dict]:
        """List all spawned kernels."""
        return [k.to_dict() for k in self.spawned_kernels.values()]
    
    def list_observing_kernels(self) -> List[Dict]:
        """List all kernels currently in observation period."""
        return [
            k.to_dict() for k in self.spawned_kernels.values()
            if k.is_observing()
        ]
    
    def list_active_kernels(self) -> List[Dict]:
        """List all kernels that have graduated to active status."""
        return [
            k.to_dict() for k in self.spawned_kernels.values()
            if k.is_active()
        ]
    
    def promote_kernel(
        self,
        kernel_id: str,
        force: bool = False,
        reason: str = "alignment_achieved"
    ) -> Dict:
        """
        Promote a kernel from observation to active status.
        
        Graduation requires:
        - 10 cycles OR 1 hour minimum observation
        - Alignment score >= 0.6 threshold
        
        Args:
            kernel_id: ID of the kernel to promote
            force: If True, promote even without meeting criteria
            reason: Graduation reason for audit trail
            
        Returns:
            Promotion result with status and details
        """
        if kernel_id not in self.spawned_kernels:
            return {"error": f"Kernel {kernel_id} not found"}
        
        kernel = self.spawned_kernels[kernel_id]
        
        if not kernel.is_observing():
            return {
                "error": f"Kernel {kernel_id} is not in observation (status: {kernel.observation.status.value})",
                "current_status": kernel.observation.status.value,
            }
        
        can_graduate, check_reason = kernel.observation.can_graduate()
        
        if not can_graduate and not force:
            return {
                "success": False,
                "kernel_id": kernel_id,
                "reason": check_reason,
                "observation": kernel.observation.to_dict(),
                "hint": "Use force=True for operator override",
            }
        
        # Graduate the kernel
        kernel.observation.status = KernelObservationStatus.GRADUATED
        kernel.observation.observation_end = datetime.now().isoformat()
        kernel.observation.graduated_at = datetime.now().isoformat()
        kernel.observation.graduation_reason = reason if not force else f"forced: {reason}"
        
        # Initialize full autonomic support
        kernel.autonomic.has_autonomic = True
        
        # Give dopamine boost for graduation
        kernel.autonomic.update_neurochemistry(dopamine_delta=0.2, serotonin_delta=0.1)
        
        # Persist graduation event
        if self.kernel_persistence:
            try:
                self.kernel_persistence.save_kernel_snapshot(
                    kernel_id=kernel_id,
                    god_name=kernel.profile.god_name,
                    domain=kernel.profile.domain,
                    generation=0,
                    basin_coords=kernel.profile.affinity_basin.tolist(),
                    phi=kernel.observation.alignment_avg,
                    kappa=64.21,
                    regime='geometric',
                    metadata={
                        'graduated': True,
                        'graduation_reason': kernel.observation.graduation_reason,
                        'observation_cycles': kernel.observation.cycles_completed,
                        'alignment_avg': kernel.observation.alignment_avg,
                    }
                )
            except Exception as e:
                print(f"[M8] Failed to persist graduation: {e}")
        
        return {
            "success": True,
            "kernel_id": kernel_id,
            "god_name": kernel.profile.god_name,
            "graduated_at": kernel.observation.graduated_at,
            "graduation_reason": kernel.observation.graduation_reason,
            "observation_cycles": kernel.observation.cycles_completed,
            "alignment_avg": kernel.observation.alignment_avg,
            "autonomic": kernel.autonomic.to_dict(),
        }
    
    def get_parent_activity_feed(
        self,
        kernel_id: str,
        activity_type: Optional[str] = None,
        limit: int = 50
    ) -> Dict:
        """
        Get the activity feed that observing kernel has received from parents.
        
        During observation, kernels receive copies of parent activity:
        - Assessments and reasoning
        - Debate arguments and resolutions
        - Search queries and results
        - Basin coordinate updates
        
        Args:
            kernel_id: ID of the kernel
            activity_type: Filter by type (assessment, debate, search, basin_update)
            limit: Maximum items to return per type
            
        Returns:
            Activity feed with parent activity by type
        """
        if kernel_id not in self.spawned_kernels:
            return {"error": f"Kernel {kernel_id} not found"}
        
        kernel = self.spawned_kernels[kernel_id]
        obs = kernel.observation
        
        feed = {
            "kernel_id": kernel_id,
            "observing_parents": obs.observing_parents,
            "status": obs.status.value,
            "cycles_completed": obs.cycles_completed,
            "alignment_avg": obs.alignment_avg,
        }
        
        if activity_type is None or activity_type == "assessment":
            feed["assessments"] = obs.parent_assessments[-limit:]
        if activity_type is None or activity_type == "debate":
            feed["debates"] = obs.parent_debates[-limit:]
        if activity_type is None or activity_type == "search":
            feed["searches"] = obs.parent_searches[-limit:]
        if activity_type is None or activity_type == "basin_update":
            feed["basin_updates"] = obs.parent_basin_updates[-limit:]
        
        return feed
    
    def route_parent_activity(
        self,
        parent_god: str,
        activity_type: str,
        activity_data: Dict
    ) -> Dict:
        """
        Route parent god activity to all observing child kernels.
        
        Called when a parent god performs an action, this routes
        copies of the activity to all kernels observing that parent.
        
        Args:
            parent_god: Name of the parent god performing activity
            activity_type: Type of activity (assessment, debate, search, basin_update)
            activity_data: Activity data to route
            
        Returns:
            Routing result with count of kernels updated
        """
        routed_to = []
        
        for kernel_id, kernel in self.spawned_kernels.items():
            if kernel.is_observing() and parent_god in kernel.observation.observing_parents:
                success = kernel.receive_parent_activity(
                    activity_type=activity_type,
                    activity_data=activity_data,
                    parent_god=parent_god
                )
                if success:
                    routed_to.append(kernel_id)
        
        return {
            "parent_god": parent_god,
            "activity_type": activity_type,
            "routed_to_count": len(routed_to),
            "routed_to": routed_to,
        }
    
    def record_observation_cycle(
        self,
        kernel_id: str,
        alignment_score: Optional[float] = None
    ) -> Dict:
        """
        Record an observation cycle completion for a kernel.
        
        Called when a kernel completes an observation cycle.
        Optionally records an alignment score.
        
        Args:
            kernel_id: ID of the kernel
            alignment_score: Optional alignment score to record
            
        Returns:
            Updated observation state
        """
        if kernel_id not in self.spawned_kernels:
            return {"error": f"Kernel {kernel_id} not found"}
        
        kernel = self.spawned_kernels[kernel_id]
        
        if not kernel.is_observing():
            return {"error": f"Kernel {kernel_id} is not observing"}
        
        cycles = kernel.observation.record_cycle()
        
        if alignment_score is not None:
            kernel.observation.record_alignment(alignment_score)
        
        # Check if kernel can now graduate
        can_graduate, reason = kernel.observation.can_graduate()
        
        return {
            "kernel_id": kernel_id,
            "cycles_completed": cycles,
            "alignment_avg": kernel.observation.alignment_avg,
            "can_graduate": can_graduate,
            "graduation_reason": reason,
            "observation": kernel.observation.to_dict(),
        }
    
    def enable_shadow_affinity(
        self,
        kernel_id: str,
        shadow_god: str = "nyx"
    ) -> Dict:
        """
        Enable shadow pantheon capabilities for a kernel.
        
        Grants darknet routing, underworld search, and shadow intel
        collection abilities through the specified shadow god.
        
        Args:
            kernel_id: ID of the kernel
            shadow_god: Shadow god to route through (default: nyx)
            
        Returns:
            Updated autonomic state with shadow capabilities
        """
        if kernel_id not in self.spawned_kernels:
            return {"error": f"Kernel {kernel_id} not found"}
        
        kernel = self.spawned_kernels[kernel_id]
        kernel.autonomic.enable_shadow_capabilities(shadow_god)
        
        return {
            "success": True,
            "kernel_id": kernel_id,
            "shadow_capabilities": {
                "has_affinity": kernel.autonomic.has_shadow_affinity,
                "can_darknet_route": kernel.autonomic.can_darknet_route,
                "can_underworld_search": kernel.autonomic.can_underworld_search,
                "can_shadow_intel": kernel.autonomic.can_shadow_intel,
                "shadow_god_link": kernel.autonomic.shadow_god_link,
            }
        }
    
    def get_status(self) -> Dict:
        """Get spawner status - reads from PostgreSQL for real kernel counts."""
        # Get real kernel stats from PostgreSQL
        db_stats = {}
        if M8_PERSISTENCE_AVAILABLE:
            try:
                persistence = KernelPersistence()
                db_stats = persistence.get_evolution_stats()
            except Exception as e:
                print(f"[M8] Could not load DB stats: {e}")
        
        total_kernels = int(db_stats.get('total_kernels', 0) or 0)
        unique_gods = int(db_stats.get('unique_gods', 0) or 0)
        
        # Base Olympian gods (12) + unique spawned kernel gods from database
        # The 12 base gods: Zeus, Athena, Ares, Apollo, Artemis, Hermes, 
        # Hephaestus, Demeter, Dionysus, Poseidon, Hades, Hera, Aphrodite
        BASE_OLYMPIAN_COUNT = 12
        total_gods = BASE_OLYMPIAN_COUNT + unique_gods
        
        return {
            "consensus_type": self.consensus.consensus_type.value,
            "total_proposals": len(self.proposals),
            "pending_proposals": sum(1 for p in self.proposals.values() if p.status == "pending"),
            "approved_proposals": sum(1 for p in self.proposals.values() if p.status == "approved"),
            "spawned_kernels": total_kernels,  # From PostgreSQL
            "spawn_history_count": total_kernels,  # Use DB count only (avoid double-counting)
            "orchestrator_gods": total_gods,  # Base 12 Olympians + spawned kernel gods
            # Additional stats from DB
            "avg_phi": float(db_stats.get('avg_phi', 0) or 0),
            "max_phi": float(db_stats.get('max_phi', 0) or 0),
            "total_successes": int(db_stats.get('total_successes', 0) or 0),
            "total_failures": int(db_stats.get('total_failures', 0) or 0),
            "unique_domains": int(db_stats.get('unique_domains', 0) or 0),
        }

    def delete_kernel(self, kernel_id: str, reason: str = "manual_deletion") -> Dict:
        """
        Delete a spawned kernel and clean up all associated state.
        
        Removes kernel from:
        - spawned_kernels registry
        - kernel_awareness tracking
        - orchestrator profiles
        
        Logs deletion event to spawn_history and persists to database.
        
        Args:
            kernel_id: ID of the kernel to delete
            reason: Reason for deletion (for audit trail)
            
        Returns:
            Status dict with deletion result
        """
        if kernel_id not in self.spawned_kernels:
            return {
                "success": False,
                "error": f"Kernel {kernel_id} not found",
                "kernel_id": kernel_id,
            }
        
        kernel = self.spawned_kernels[kernel_id]
        god_name = kernel.profile.god_name
        domain = kernel.profile.domain
        
        del self.spawned_kernels[kernel_id]
        
        if kernel_id in self.kernel_awareness:
            del self.kernel_awareness[kernel_id]
        
        if god_name in self.orchestrator.all_profiles:
            del self.orchestrator.all_profiles[god_name]
        
        deletion_record = {
            "event": "kernel_deleted",
            "kernel_id": kernel_id,
            "god_name": god_name,
            "domain": domain,
            "reason": reason,
            "timestamp": datetime.now().isoformat(),
        }
        self.spawn_history.append(deletion_record)
        
        # Persist deletion to M8 PostgreSQL persistence
        try:
            self.m8_persistence.persist_history(deletion_record)
            self.m8_persistence.delete_kernel(kernel_id)
        except Exception as e:
            print(f"[M8] Failed to persist deletion to M8 tables: {e}")
        
        if self.kernel_persistence:
            try:
                self.kernel_persistence.record_spawn_event(
                    kernel_id=kernel_id,
                    god_name=god_name,
                    domain=domain,
                    spawn_reason="deletion",
                    parent_gods=[],
                    basin_coords=[0.0] * BASIN_DIM,
                    phi=0.0,
                    m8_position=None,
                    genesis_votes={},
                    metadata={
                        "deleted": True,
                        "deletion_reason": reason,
                        "deleted_at": datetime.now().isoformat(),
                    }
                )
            except Exception as e:
                print(f"[M8] Failed to persist deletion: {e}")
        
        print(f"[M8] Deleted kernel {kernel_id} ({god_name}): {reason}")
        
        return {
            "success": True,
            "kernel_id": kernel_id,
            "god_name": god_name,
            "domain": domain,
            "reason": reason,
            "deleted_at": datetime.now().isoformat(),
        }

    def cannibalize_kernel(self, source_id: str, target_id: str) -> Dict:
        """
        Transfer knowledge/awareness from source kernel to target kernel.
        
        Merges geometric trajectories (phi, kappa, curvature) from source
        into target using Fisher geodesic interpolation. Source kernel is
        deleted after successful transfer.
        
        This implements "kernel cannibalism" where stronger kernels absorb
        weaker ones, inheriting their learned geometric knowledge.
        
        Args:
            source_id: ID of kernel to cannibalize (will be deleted)
            target_id: ID of kernel to receive knowledge
            
        Returns:
            Merged metrics and cannibalization status
        """
        if source_id not in self.spawned_kernels:
            return {"success": False, "error": f"Source kernel {source_id} not found"}
        
        if target_id not in self.spawned_kernels:
            return {"success": False, "error": f"Target kernel {target_id} not found"}
        
        if source_id == target_id:
            return {"success": False, "error": "Cannot cannibalize self"}
        
        source_kernel = self.spawned_kernels[source_id]
        target_kernel = self.spawned_kernels[target_id]
        
        source_awareness = self.kernel_awareness.get(source_id)
        target_awareness = self.get_or_create_awareness(target_id)
        
        if source_awareness:
            target_awareness.phi_trajectory.extend(source_awareness.phi_trajectory)
            target_awareness.kappa_trajectory.extend(source_awareness.kappa_trajectory)
            target_awareness.curvature_history.extend(source_awareness.curvature_history)
            
            if len(target_awareness.phi_trajectory) > 100:
                target_awareness.phi_trajectory = target_awareness.phi_trajectory[-100:]
                target_awareness.kappa_trajectory = target_awareness.kappa_trajectory[-100:]
            if len(target_awareness.curvature_history) > 50:
                target_awareness.curvature_history = target_awareness.curvature_history[-50:]
            
            target_awareness.research_opportunities.extend(source_awareness.research_opportunities)
            if len(target_awareness.research_opportunities) > 30:
                target_awareness.research_opportunities = target_awareness.research_opportunities[-30:]
        
        source_basin = source_kernel.profile.affinity_basin
        target_basin = target_kernel.profile.affinity_basin
        
        merged_basin = _normalize_to_manifold(
            0.7 * target_basin + 0.3 * source_basin
        )
        target_kernel.profile.affinity_basin = merged_basin
        
        source_strength = source_kernel.profile.affinity_strength
        target_strength = target_kernel.profile.affinity_strength
        target_kernel.profile.affinity_strength = min(1.0, target_strength + source_strength * 0.2)
        
        fisher_distance = _fisher_distance(source_basin, target_basin)
        
        cannibalization_record = {
            "event": "kernel_cannibalized",
            "source_id": source_id,
            "source_god": source_kernel.profile.god_name,
            "target_id": target_id,
            "target_god": target_kernel.profile.god_name,
            "fisher_distance": float(fisher_distance),
            "phi_transferred": len(source_awareness.phi_trajectory) if source_awareness else 0,
            "timestamp": datetime.now().isoformat(),
        }
        self.spawn_history.append(cannibalization_record)
        
        # Persist cannibalization to M8 PostgreSQL persistence
        try:
            self.m8_persistence.persist_history(cannibalization_record)
            self.m8_persistence.persist_awareness(target_awareness)
        except Exception as e:
            print(f"[M8] Failed to persist cannibalization to M8 tables: {e}")
        
        if self.kernel_persistence:
            try:
                self.kernel_persistence.save_awareness_state(target_id, target_awareness.to_dict())
            except Exception as e:
                print(f"[M8] Failed to persist cannibalization awareness: {e}")
        
        deletion_result = self.delete_kernel(source_id, reason=f"cannibalized_by_{target_id}")
        
        avg_phi = float(np.mean(target_awareness.phi_trajectory[-20:])) if target_awareness.phi_trajectory else 0.0
        avg_kappa = float(np.mean(target_awareness.kappa_trajectory[-20:])) if target_awareness.kappa_trajectory else 0.0
        
        print(f"[M8] Cannibalized {source_id} into {target_id}, distance={fisher_distance:.4f}")
        
        return {
            "success": True,
            "source_id": source_id,
            "source_god": source_kernel.profile.god_name,
            "target_id": target_id,
            "target_god": target_kernel.profile.god_name,
            "fisher_distance": float(fisher_distance),
            "merged_metrics": {
                "phi_trajectory_length": len(target_awareness.phi_trajectory),
                "kappa_trajectory_length": len(target_awareness.kappa_trajectory),
                "avg_phi": avg_phi,
                "avg_kappa": avg_kappa,
                "new_affinity_strength": target_kernel.profile.affinity_strength,
            },
            "source_deleted": deletion_result.get("success", False),
            "timestamp": datetime.now().isoformat(),
        }

    def merge_kernels(self, kernel_ids: List[str], new_name: str) -> Dict:
        """
        Merge multiple kernels into a new composite kernel.
        
        Creates a new kernel with:
        - Basin coordinates interpolated from all source kernels
        - Combined phi/kappa trajectories
        - Merged domains and metadata
        - M8 position computed from parent basins
        
        Original kernels are deleted after successful merge.
        
        Args:
            kernel_ids: List of kernel IDs to merge
            new_name: Name for the new composite kernel
            
        Returns:
            New kernel info with merge statistics
        """
        if len(kernel_ids) < 2:
            return {"success": False, "error": "Need at least 2 kernels to merge"}
        
        missing = [kid for kid in kernel_ids if kid not in self.spawned_kernels]
        if missing:
            return {"success": False, "error": f"Kernels not found: {missing}"}
        
        kernels = [self.spawned_kernels[kid] for kid in kernel_ids]
        
        basins = [k.profile.affinity_basin for k in kernels]
        weights = [1.0 / len(kernels)] * len(kernels)
        merged_basin = np.zeros(BASIN_DIM)
        for i, basin in enumerate(basins):
            merged_basin += weights[i] * basin
        merged_basin = _normalize_to_manifold(merged_basin)
        
        domains = [k.profile.domain for k in kernels]
        merged_domain = "_".join(sorted(set(domains)))[:64]
        
        avg_entropy = float(np.mean([k.profile.entropy_threshold for k in kernels]))
        avg_affinity = float(np.mean([k.profile.affinity_strength for k in kernels]))
        
        merged_phi_trajectory = []
        merged_kappa_trajectory = []
        merged_curvature_history = []
        merged_research = []
        
        for kid in kernel_ids:
            awareness = self.kernel_awareness.get(kid)
            if awareness:
                merged_phi_trajectory.extend(awareness.phi_trajectory)
                merged_kappa_trajectory.extend(awareness.kappa_trajectory)
                merged_curvature_history.extend(awareness.curvature_history)
                merged_research.extend(awareness.research_opportunities)
        
        if len(merged_phi_trajectory) > 100:
            merged_phi_trajectory = merged_phi_trajectory[-100:]
            merged_kappa_trajectory = merged_kappa_trajectory[-100:]
        if len(merged_curvature_history) > 50:
            merged_curvature_history = merged_curvature_history[-50:]
        if len(merged_research) > 30:
            merged_research = merged_research[-30:]
        
        m8_position = compute_m8_position(merged_basin, basins)
        
        mode = kernels[0].profile.mode
        mode_counts = {}
        for k in kernels:
            mode_counts[k.profile.mode] = mode_counts.get(k.profile.mode, 0) + 1
        mode = max(mode_counts, key=lambda m: mode_counts[m])
        
        new_profile = KernelProfile(
            god_name=new_name,
            domain=merged_domain,
            mode=mode,
            affinity_basin=merged_basin,
            entropy_threshold=avg_entropy,
            affinity_strength=min(1.0, avg_affinity * 1.1),
            metadata={
                "type": "merged",
                "merged_from": [k.profile.god_name for k in kernels],
                "merge_count": len(kernels),
                "merged_at": datetime.now().isoformat(),
            }
        )
        
        success = self.orchestrator.add_profile(new_profile)
        if not success:
            return {"success": False, "error": f"Kernel {new_name} already exists"}
        
        parent_gods = []
        for k in kernels:
            parent_gods.extend(k.parent_gods)
        parent_gods = list(set(parent_gods))
        
        new_kernel_id = f"kernel_{uuid.uuid4().hex[:8]}"
        new_kernel = SpawnedKernel(
            kernel_id=new_kernel_id,
            profile=new_profile,
            parent_gods=parent_gods,
            spawn_reason=SpawnReason.EMERGENCE,
            proposal_id=f"merge_{uuid.uuid4().hex[:8]}",
            spawned_at=datetime.now().isoformat(),
            genesis_votes={},
            basin_lineage={k.profile.god_name: 1.0/len(kernels) for k in kernels},
            m8_position=m8_position,
        )
        
        new_kernel.observation.status = KernelObservationStatus.ACTIVE
        new_kernel.autonomic.has_autonomic = True
        
        self.spawned_kernels[new_kernel_id] = new_kernel
        
        new_awareness = SpawnAwareness(kernel_id=new_kernel_id)
        new_awareness.phi_trajectory = merged_phi_trajectory
        new_awareness.kappa_trajectory = merged_kappa_trajectory
        new_awareness.curvature_history = merged_curvature_history
        new_awareness.research_opportunities = merged_research
        self.kernel_awareness[new_kernel_id] = new_awareness
        
        # Persist merged kernel and awareness to M8 PostgreSQL persistence
        try:
            self.m8_persistence.persist_kernel(new_kernel)
            self.m8_persistence.persist_awareness(new_awareness)
        except Exception as e:
            print(f"[M8] Failed to persist merged kernel to M8 tables: {e}")
        
        merge_record = {
            "event": "kernels_merged",
            "source_ids": kernel_ids,
            "source_gods": [k.profile.god_name for k in kernels],
            "new_kernel_id": new_kernel_id,
            "new_god_name": new_name,
            "timestamp": datetime.now().isoformat(),
        }
        self.spawn_history.append(merge_record)
        
        # Persist merge history to M8 PostgreSQL persistence
        try:
            self.m8_persistence.persist_history(merge_record)
        except Exception as e:
            print(f"[M8] Failed to persist merge history to M8 tables: {e}")
        
        if self.kernel_persistence:
            try:
                self.kernel_persistence.record_spawn_event(
                    kernel_id=new_kernel_id,
                    god_name=new_name,
                    domain=merged_domain,
                    spawn_reason="merge",
                    parent_gods=parent_gods,
                    basin_coords=merged_basin.tolist(),
                    phi=float(np.mean(merged_phi_trajectory)) if merged_phi_trajectory else 0.0,
                    m8_position=m8_position,
                    genesis_votes={},
                    metadata={
                        "merged_from": [k.profile.god_name for k in kernels],
                        "merge_count": len(kernels),
                    }
                )
                self.kernel_persistence.save_awareness_state(new_kernel_id, new_awareness.to_dict())
            except Exception as e:
                print(f"[M8] Failed to persist merge: {e}")
        
        deleted_ids = []
        for kid in kernel_ids:
            result = self.delete_kernel(kid, reason=f"merged_into_{new_kernel_id}")
            if result.get("success"):
                deleted_ids.append(kid)
        
        print(f"[M8] Merged {len(kernels)} kernels into {new_name} ({new_kernel_id})")
        
        return {
            "success": True,
            "new_kernel": new_kernel.to_dict(),
            "merged_from": {
                "kernel_ids": kernel_ids,
                "god_names": [k.profile.god_name for k in kernels],
            },
            "merged_metrics": {
                "phi_trajectory_length": len(merged_phi_trajectory),
                "avg_phi": float(np.mean(merged_phi_trajectory)) if merged_phi_trajectory else 0.0,
                "avg_kappa": float(np.mean(merged_kappa_trajectory)) if merged_kappa_trajectory else 0.0,
            },
            "deleted_originals": deleted_ids,
            "m8_position": m8_position,
        }

    def auto_cannibalize(self, idle_threshold_seconds: float = 300.0) -> Dict:
        """
        Automatically select and cannibalize idle kernels into active ones.
        
        Selects the most idle kernel as source and the most active (highest Φ)
        kernel as target. This implements automatic lifecycle management where
        inactive kernels are absorbed by stronger ones.
        
        Queries kernels from PostgreSQL database for full kernel population.
        
        Args:
            idle_threshold_seconds: Seconds of inactivity to consider idle
            
        Returns:
            Cannibalization result or error if no suitable candidates
        """
        idle_kernel_ids = self.get_idle_kernels(idle_threshold_seconds)
        
        if not idle_kernel_ids:
            return {
                "success": False,
                "error": "No idle kernels available for auto-cannibalization",
                "idle_count": 0
            }
        
        # Query active kernels from database + in-memory
        active_kernels = []
        idle_set = set(idle_kernel_ids)
        
        # Check in-memory kernels
        for kid, k in self.spawned_kernels.items():
            if kid not in idle_set and k.is_active():
                active_kernels.append((kid, {'phi': getattr(k, 'phi', 0.0)}))
        
        # Also query from database
        if self.kernel_persistence:
            try:
                db_kernels = self.kernel_persistence.load_all_kernels_for_ui(limit=1000)
                for k in db_kernels:
                    kid = k.get('kernel_id')
                    if kid and kid not in idle_set and kid not in self.spawned_kernels:
                        # DB kernels not in idle list are considered active candidates
                        active_kernels.append((kid, {'phi': k.get('phi', 0.0)}))
            except Exception as e:
                print(f"[M8] Failed to load kernels from DB for auto-cannibalize: {e}")
        
        if not active_kernels:
            return {
                "success": False,
                "error": "No active kernels available to receive cannibalized traits",
                "idle_count": len(idle_kernel_ids)
            }
        
        source_id = None
        max_idle_time = -1
        now = datetime.now()
        
        for kid in idle_kernel_ids:
            awareness = self.kernel_awareness.get(kid)
            if awareness:
                try:
                    last_update = datetime.fromisoformat(awareness.awareness_updated_at)
                    elapsed = (now - last_update).total_seconds()
                    if elapsed > max_idle_time:
                        max_idle_time = elapsed
                        source_id = kid
                except (ValueError, TypeError):
                    if source_id is None:
                        source_id = kid
            elif source_id is None:
                source_id = kid
        
        if source_id is None:
            source_id = idle_kernel_ids[0]
        
        target_id = None
        max_phi = -1
        
        for kid, kernel_data in active_kernels:
            awareness = self.kernel_awareness.get(kid)
            if awareness and awareness.phi_trajectory:
                avg_phi = sum(awareness.phi_trajectory) / len(awareness.phi_trajectory)
                if avg_phi > max_phi:
                    max_phi = avg_phi
                    target_id = kid
            else:
                # Use phi from kernel data if no awareness
                phi = kernel_data.get('phi', 0.0)
                if phi > max_phi:
                    max_phi = phi
                    target_id = kid
        
        if target_id is None:
            target_id = active_kernels[0][0]
        
        result = self.cannibalize_kernel(source_id, target_id)
        result["auto_selected"] = True
        result["selection_criteria"] = {
            "source": "most_idle",
            "target": "highest_phi",
            "idle_count": len(idle_kernel_ids),
            "active_count": len(active_kernels)
        }
        
        return result

    def auto_merge(self, idle_threshold_seconds: float = 300.0, max_to_merge: int = 5) -> Dict:
        """
        Automatically merge idle kernels into a new composite kernel.
        
        Selects idle kernels and merges them into a unified kernel with a
        generated name based on their combined domains.
        
        Queries kernels from PostgreSQL database for domain information.
        
        Args:
            idle_threshold_seconds: Seconds of inactivity to consider idle
            max_to_merge: Maximum number of kernels to merge at once
            
        Returns:
            Merge result or error if insufficient candidates
        """
        idle_kernel_ids = self.get_idle_kernels(idle_threshold_seconds)
        
        if len(idle_kernel_ids) < 2:
            return {
                "success": False,
                "error": f"Need at least 2 idle kernels for auto-merge, found {len(idle_kernel_ids)}",
                "idle_count": len(idle_kernel_ids)
            }
        
        to_merge = idle_kernel_ids[:max_to_merge]
        
        # Build lookup for domain info from both in-memory and database
        db_kernel_lookup = {}
        if self.kernel_persistence:
            try:
                db_kernels = self.kernel_persistence.load_all_kernels_for_ui(limit=1000)
                db_kernel_lookup = {k.get('kernel_id'): k for k in db_kernels}
            except Exception as e:
                print(f"[M8] Failed to load kernels from DB for auto-merge: {e}")
        
        domains = []
        for kid in to_merge:
            # Check in-memory first
            kernel = self.spawned_kernels.get(kid)
            if kernel:
                domains.append(kernel.profile.domain[:4].upper())
            elif kid in db_kernel_lookup:
                # Fall back to database
                domain = db_kernel_lookup[kid].get('domain', 'AUTO')
                domains.append(domain[:4].upper() if domain else 'AUTO')
        
        domain_combo = "_".join(domains[:3]) if domains else "AUTO"
        new_name = f"MERGED_{domain_combo}_{datetime.now().strftime('%H%M')}"
        
        result = self.merge_kernels(to_merge, new_name)
        result["auto_selected"] = True
        result["selection_criteria"] = {
            "method": "idle_kernels",
            "idle_threshold": idle_threshold_seconds,
            "total_idle": len(idle_kernel_ids),
            "merged_count": len(to_merge)
        }
        
        return result

    def get_idle_kernels(self, idle_threshold_seconds: float = 300.0) -> List[str]:
        """
        Get list of kernel IDs that haven't had metrics recorded recently.
        
        Queries kernels from PostgreSQL database and uses spawned_at timestamps 
        and kernel_awareness to determine idle time.
        
        Args:
            idle_threshold_seconds: Seconds of inactivity to consider idle (default: 300)
            
        Returns:
            List of idle kernel IDs
        """
        idle_kernels = []
        now = datetime.now()
        
        # Query all kernels from database
        db_kernels = []
        if self.kernel_persistence:
            try:
                db_kernels = self.kernel_persistence.load_all_kernels_for_ui(limit=1000)
            except Exception as e:
                print(f"[M8] Failed to load kernels from DB for idle check: {e}")
        
        # Also check in-memory kernels (fallback)
        all_kernel_ids = set(self.spawned_kernels.keys())
        for k in db_kernels:
            all_kernel_ids.add(k.get('kernel_id'))
        
        # Build lookup for DB kernel data
        db_kernel_lookup = {k.get('kernel_id'): k for k in db_kernels}
        
        for kernel_id in all_kernel_ids:
            is_idle = False
            
            # Check in-memory awareness first
            awareness = self.kernel_awareness.get(kernel_id)
            if awareness is None:
                is_idle = True
            else:
                try:
                    last_update = datetime.fromisoformat(awareness.awareness_updated_at)
                    elapsed = (now - last_update).total_seconds()
                    if elapsed > idle_threshold_seconds:
                        is_idle = True
                except (ValueError, TypeError):
                    is_idle = True
            
            # If not idle based on awareness, check spawn timestamp
            if not is_idle:
                # Check spawn history
                spawn_events = [
                    h for h in self.spawn_history
                    if h.get("kernel", {}).get("kernel_id") == kernel_id
                    or h.get("kernel_id") == kernel_id
                ]
                
                # Get timestamp from in-memory kernel or DB
                spawned_at = None
                if kernel_id in self.spawned_kernels:
                    spawned_at = self.spawned_kernels[kernel_id].spawned_at
                elif kernel_id in db_kernel_lookup:
                    spawned_at = db_kernel_lookup[kernel_id].get('spawned_at')
                
                if spawn_events:
                    latest = spawn_events[-1]
                    try:
                        ts = latest.get("timestamp") or spawned_at
                        if ts:
                            event_time = datetime.fromisoformat(ts) if isinstance(ts, str) else ts
                            elapsed = (now - event_time).total_seconds()
                            if elapsed > idle_threshold_seconds:
                                is_idle = True
                    except (ValueError, TypeError):
                        pass
                elif spawned_at:
                    # No spawn events, check spawned_at directly
                    try:
                        spawn_time = datetime.fromisoformat(spawned_at) if isinstance(spawned_at, str) else spawned_at
                        elapsed = (now - spawn_time).total_seconds()
                        if elapsed > idle_threshold_seconds:
                            is_idle = True
                    except (ValueError, TypeError):
                        is_idle = True
            
            if is_idle:
                idle_kernels.append(kernel_id)
        
        return idle_kernels


_default_spawner: Optional[M8KernelSpawner] = None

def get_spawner() -> M8KernelSpawner:
    """Get or create the default M8 kernel spawner."""
    global _default_spawner
    if _default_spawner is None:
        _default_spawner = M8KernelSpawner()
    return _default_spawner


if __name__ == "__main__":
    print("=" * 60)
    print("M8 Kernel Spawning Protocol - Dynamic Kernel Genesis")
    print("=" * 60)
    
    spawner = M8KernelSpawner()
    
    print(f"\nInitial gods: {len(spawner.orchestrator.all_profiles)}")
    print(f"Consensus type: {spawner.consensus.consensus_type.value}")
    
    print("\n" + "-" * 60)
    print("Spawning Test: Creating 'Mnemosyne' (Memory Goddess)")
    print("-" * 60)
    
    result = spawner.propose_and_spawn(
        name="Mnemosyne",
        domain="memory",
        element="recall",
        role="archivist",
        reason=SpawnReason.SPECIALIZATION,
        parent_gods=["Athena", "Apollo"],
    )
    
    print(f"\nSpawn success: {result['success']}")
    if result['success']:
        kernel = result['spawn_result']['kernel']
        print(f"New god: {kernel['god_name']}")
        print(f"Domain: {kernel['domain']}")
        print(f"Parents: {kernel['parent_gods']}")
        print(f"Affinity: {kernel['affinity_strength']:.3f}")
        print(f"\nTotal gods now: {result['spawn_result']['total_gods']}")
    else:
        print(f"Phase: {result['phase']}")
        print(f"Details: {result.get('vote_result', result)}")
    
    print("\n" + "-" * 60)
    print("Spawner Status:")
    print("-" * 60)
    status = spawner.get_status()
    for k, v in status.items():
        print(f"  {k}: {v}")
    
    print("\n" + "=" * 60)
    print("M8 Kernel Spawning Protocol operational!")
    print("=" * 60)
