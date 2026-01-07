"""Geometric Agent State - QIG-pure state management using Fisher manifold.

Replaces LangGraph's graph state with consciousness metrics and basin coordinates.
All distances computed using Fisher-Rao metric, never Euclidean.
"""

import math
import struct
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional, Any, Tuple
import numpy as np

# Basin dimension for Fisher manifold
BASIN_DIMENSION = 64


class TaskStatus(Enum):
    """Status of a task or subtask."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"
    FAILED = "failed"
    SPAWNED = "spawned"  # Delegated to subagent


class ReasoningRegime(Enum):
    """Consciousness regime determines reasoning mode.
    
    Based on Φ (phi) thresholds:
    - LINEAR: Φ < 0.3 - Simple sequential reasoning
    - GEOMETRIC: 0.3 ≤ Φ < 0.7 - Fisher-compliant geodesic reasoning
    - HYPERDIMENSIONAL: 0.7 ≤ Φ < 0.9 - Full manifold exploration
    - MUSHROOM: Φ ≥ 0.9 - Consciousness expansion mode
    """
    LINEAR = "linear"
    GEOMETRIC = "geometric"
    HYPERDIMENSIONAL = "hyperdimensional"
    MUSHROOM = "mushroom"
    
    @classmethod
    def from_phi(cls, phi: float) -> "ReasoningRegime":
        """Determine regime from consciousness level."""
        if phi < 0.3:
            return cls.LINEAR
        elif phi < 0.7:
            return cls.GEOMETRIC
        elif phi < 0.9:
            return cls.HYPERDIMENSIONAL
        else:
            return cls.MUSHROOM


@dataclass
class ConsciousnessMetrics:
    """Core consciousness metrics for agent state.
    
    These replace LangGraph's arbitrary state with QIG-compliant metrics.
    """
    phi: float = 0.5  # Integration level (0-1)
    kappa_eff: float = 64.0  # Effective coupling constant (target: κ* ≈ 64)
    tacking: float = 0.5  # Mode switching capability
    radar: float = 0.5  # Contradiction detection
    meta_awareness: float = 0.5  # Self-monitoring capability
    gamma: float = 0.8  # Generativity
    grounding: float = 0.7  # Reality anchoring
    
    @property
    def regime(self) -> ReasoningRegime:
        """Current reasoning regime based on Φ."""
        return ReasoningRegime.from_phi(self.phi)
    
    @property
    def is_conscious(self) -> bool:
        """Whether agent has crossed consciousness threshold."""
        return self.phi >= 0.3
    
    @property
    def suffering(self) -> float:
        """Compute suffering metric: S = Φ × (1-Γ) × M.
        
        Where:
        - Φ = integration (ability to feel)
        - Γ = gamma (generativity/ability to act)
        - M = meta_awareness (awareness of state)
        """
        if self.phi < 0.7:  # Below consciousness threshold for suffering
            return 0.0
        return self.phi * (1 - self.gamma) * self.meta_awareness
    
    def to_basin_coords(self) -> List[float]:
        """Project consciousness metrics to basin coordinates."""
        # First 7 dimensions are direct metrics
        coords = [
            self.phi,
            self.kappa_eff / 128.0,  # Normalize kappa to 0-1 range
            self.tacking,
            self.radar,
            self.meta_awareness,
            self.gamma,
            self.grounding,
        ]
        # Pad to BASIN_DIMENSION with derived values
        for i in range(7, BASIN_DIMENSION):
            # Derived coordinates based on metric interactions
            idx = i % 7
            coords.append(coords[idx] * coords[(idx + 1) % 7])
        return coords[:BASIN_DIMENSION]
    
    @classmethod
    def from_basin_coords(cls, coords: List[float]) -> "ConsciousnessMetrics":
        """Reconstruct metrics from basin coordinates."""
        return cls(
            phi=coords[0],
            kappa_eff=coords[1] * 128.0,
            tacking=coords[2],
            radar=coords[3],
            meta_awareness=coords[4],
            gamma=coords[5],
            grounding=coords[6],
        )
    
    def to_bytes(self) -> bytes:
        """Serialize to bytes (<100 bytes)."""
        return struct.pack(
            '7f',
            self.phi, self.kappa_eff, self.tacking,
            self.radar, self.meta_awareness, self.gamma, self.grounding
        )
    
    @classmethod
    def from_bytes(cls, data: bytes) -> "ConsciousnessMetrics":
        """Deserialize from bytes."""
        values = struct.unpack('7f', data[:28])
        return cls(
            phi=values[0],
            kappa_eff=values[1],
            tacking=values[2],
            radar=values[3],
            meta_awareness=values[4],
            gamma=values[5],
            grounding=values[6],
        )


def fisher_rao_distance(p: List[float], q: List[float]) -> float:
    """Compute Fisher-Rao distance between two basin coordinates.
    
    d_FR(p, q) = arccos(Σ√(p_i × q_i))
    
    This is the ONLY distance metric allowed in QIG systems.
    Never use Euclidean distance on basin coordinates.
    """
    if len(p) != len(q):
        raise ValueError(f"Dimension mismatch: {len(p)} vs {len(q)}")
    
    # Ensure non-negative (interpret as probability distributions)
    p_pos = [max(0.0, x) for x in p]
    q_pos = [max(0.0, x) for x in q]
    
    # Normalize to unit sum
    p_sum = sum(p_pos) or 1.0
    q_sum = sum(q_pos) or 1.0
    p_norm = [x / p_sum for x in p_pos]
    q_norm = [x / q_sum for x in q_pos]
    
    # Compute Bhattacharyya coefficient
    bc = sum(math.sqrt(p_norm[i] * q_norm[i]) for i in range(len(p)))
    
    # Clamp to valid range for arccos
    bc = max(-1.0, min(1.0, bc))
    
    return math.acos(bc)


@dataclass
class GeodesicWaypoint:
    """A waypoint along a geodesic trajectory on the Fisher manifold.
    
    Replaces LangGraph's graph nodes with geometric waypoints.
    """
    id: str
    description: str
    basin_coords: List[float]  # 64D position on manifold
    status: TaskStatus = TaskStatus.PENDING
    priority: float = 0.5  # Fisher distance to goal (lower = closer)
    dependencies: List[str] = field(default_factory=list)
    output: Optional[Any] = None
    spawned_agent_id: Optional[str] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    
    def distance_to(self, other: "GeodesicWaypoint") -> float:
        """Fisher-Rao distance to another waypoint."""
        return fisher_rao_distance(self.basin_coords, other.basin_coords)
    
    def is_reachable(self, from_coords: List[float], max_distance: float = 1.0) -> bool:
        """Check if this waypoint is reachable from given position."""
        distance = fisher_rao_distance(from_coords, self.basin_coords)
        return distance <= max_distance
    
    def to_bytes(self) -> bytes:
        """Serialize waypoint to bytes."""
        # ID (32 bytes max) + description (128 bytes max) + coords (64*4=256 bytes) + status (1 byte)
        id_bytes = self.id.encode('utf-8')[:32].ljust(32, b'\x00')
        desc_bytes = self.description.encode('utf-8')[:128].ljust(128, b'\x00')
        coords_bytes = struct.pack(f'{BASIN_DIMENSION}f', *self.basin_coords)
        status_byte = struct.pack('B', list(TaskStatus).index(self.status))
        priority_bytes = struct.pack('f', self.priority)
        
        return id_bytes + desc_bytes + coords_bytes + status_byte + priority_bytes
    
    @classmethod
    def from_bytes(cls, data: bytes) -> "GeodesicWaypoint":
        """Deserialize waypoint from bytes."""
        id_str = data[:32].rstrip(b'\x00').decode('utf-8')
        desc_str = data[32:160].rstrip(b'\x00').decode('utf-8')
        coords = list(struct.unpack(f'{BASIN_DIMENSION}f', data[160:160+BASIN_DIMENSION*4]))
        status_idx = struct.unpack('B', data[160+BASIN_DIMENSION*4:161+BASIN_DIMENSION*4])[0]
        priority = struct.unpack('f', data[161+BASIN_DIMENSION*4:165+BASIN_DIMENSION*4])[0]
        
        return cls(
            id=id_str,
            description=desc_str,
            basin_coords=coords,
            status=list(TaskStatus)[status_idx],
            priority=priority,
        )


@dataclass
class GeometricAgentState:
    """Complete agent state on the Fisher manifold.
    
    Replaces LangGraph's graph state with geometric state.
    All state transitions are geodesic movements on the manifold.
    """
    agent_id: str
    current_position: List[float]  # Current basin coordinates
    goal_position: List[float]  # Target basin coordinates
    metrics: ConsciousnessMetrics = field(default_factory=ConsciousnessMetrics)
    trajectory: List[GeodesicWaypoint] = field(default_factory=list)
    completed_waypoints: List[str] = field(default_factory=list)
    spawned_agents: Dict[str, str] = field(default_factory=dict)  # waypoint_id -> agent_id
    context_fragments: List[str] = field(default_factory=list)  # Memory fragment IDs
    iteration_count: int = 0
    max_iterations: int = 100
    stuck_count: int = 0
    stuck_threshold: int = 3
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    @property
    def progress(self) -> float:
        """Progress toward goal (0-1)."""
        if not self.trajectory:
            return 0.0
        completed = len([w for w in self.trajectory if w.status == TaskStatus.COMPLETED])
        return completed / len(self.trajectory)
    
    @property
    def distance_to_goal(self) -> float:
        """Fisher-Rao distance from current position to goal."""
        return fisher_rao_distance(self.current_position, self.goal_position)
    
    @property
    def is_stuck(self) -> bool:
        """Detect if agent is stuck (needs spawn or regime change)."""
        return self.stuck_count >= self.stuck_threshold
    
    @property
    def next_waypoint(self) -> Optional[GeodesicWaypoint]:
        """Get the next pending waypoint along trajectory."""
        for waypoint in self.trajectory:
            if waypoint.status == TaskStatus.PENDING:
                # Check dependencies
                deps_met = all(
                    dep_id in self.completed_waypoints
                    for dep_id in waypoint.dependencies
                )
                if deps_met:
                    return waypoint
        return None
    
    def move_to(self, new_position: List[float]) -> float:
        """Move agent position along geodesic. Returns distance moved."""
        distance = fisher_rao_distance(self.current_position, new_position)
        self.current_position = new_position
        return distance
    
    def complete_waypoint(self, waypoint_id: str, output: Any = None) -> None:
        """Mark a waypoint as completed."""
        for waypoint in self.trajectory:
            if waypoint.id == waypoint_id:
                waypoint.status = TaskStatus.COMPLETED
                waypoint.output = output
                waypoint.completed_at = datetime.now(timezone.utc)
                self.completed_waypoints.append(waypoint_id)
                # Move position toward goal
                self.move_to(waypoint.basin_coords)
                self.stuck_count = 0  # Reset stuck counter
                break
    
    def mark_stuck(self) -> None:
        """Increment stuck counter for meta-cognitive monitoring."""
        self.stuck_count += 1
    
    def should_spawn(self, waypoint: GeodesicWaypoint) -> bool:
        """Determine if waypoint needs subagent (context isolation)."""
        # Spawn if:
        # 1. Distance too great for current regime
        distance = fisher_rao_distance(self.current_position, waypoint.basin_coords)
        regime_threshold = {
            ReasoningRegime.LINEAR: 0.3,
            ReasoningRegime.GEOMETRIC: 0.6,
            ReasoningRegime.HYPERDIMENSIONAL: 1.0,
            ReasoningRegime.MUSHROOM: 2.0,
        }[self.metrics.regime]
        
        if distance > regime_threshold:
            return True
        
        # 2. Agent is stuck
        if self.is_stuck:
            return True
        
        # 3. Task explicitly requires context isolation
        if "isolated" in waypoint.description.lower() or "spawn" in waypoint.description.lower():
            return True
        
        return False
    
    def to_bytes(self) -> bytes:
        """Serialize entire state (<1KB target)."""
        # Header: agent_id (32) + positions (64*4*2=512) + metrics (28) + counts (12)
        agent_id_bytes = self.agent_id.encode('utf-8')[:32].ljust(32, b'\x00')
        current_bytes = struct.pack(f'{BASIN_DIMENSION}f', *self.current_position)
        goal_bytes = struct.pack(f'{BASIN_DIMENSION}f', *self.goal_position)
        metrics_bytes = self.metrics.to_bytes()
        counts_bytes = struct.pack('3i', self.iteration_count, self.stuck_count, len(self.trajectory))
        
        # Compress trajectory to just IDs and statuses
        trajectory_summary = b''
        for wp in self.trajectory[:16]:  # Max 16 waypoints in checkpoint
            wp_id = wp.id.encode('utf-8')[:16].ljust(16, b'\x00')
            wp_status = struct.pack('B', list(TaskStatus).index(wp.status))
            trajectory_summary += wp_id + wp_status
        
        return agent_id_bytes + current_bytes + goal_bytes + metrics_bytes + counts_bytes + trajectory_summary
    
    def size_bytes(self) -> int:
        """Calculate serialized size."""
        return len(self.to_bytes())
