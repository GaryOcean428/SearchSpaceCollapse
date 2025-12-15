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


@dataclass
class SpawnedKernel:
    """
    A kernel that was dynamically spawned.
    
    Contains genesis information and lineage.
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
        
        self.proposals: Dict[str, SpawnProposal] = {}
        self.spawned_kernels: Dict[str, SpawnedKernel] = {}
        self.spawn_history: List[Dict] = []
        
        # Kernel spawn awareness tracking
        self.kernel_awareness: Dict[str, SpawnAwareness] = {}
        
        # PantheonChat for dual-pantheon debates
        self._pantheon_chat = pantheon_chat
        
        # PostgreSQL persistence for kernel learning
        self.kernel_persistence = KernelPersistence() if M8_PERSISTENCE_AVAILABLE else None
        
        # Load previous spawn history from database on startup
        self._load_from_database()
    
    def _load_from_database(self):
        """Load persisted M8 spawn history and awareness states from PostgreSQL on startup."""
        if not self.kernel_persistence:
            return
        
        try:
            spawn_history = self.kernel_persistence.load_m8_spawn_history(limit=100)
            if spawn_history:
                print(f"✨ [M8] Loaded {len(spawn_history)} spawn events from database")
            
            awareness_states = self.kernel_persistence.load_all_awareness_states(limit=100)
            for state in awareness_states:
                kernel_id = state.get('kernel_id')
                awareness_data = state.get('awareness', {})
                if kernel_id and awareness_data:
                    awareness = SpawnAwareness(kernel_id=kernel_id)
                    awareness.phi_trajectory = awareness_data.get('phi_trajectory', [])
                    awareness.kappa_trajectory = awareness_data.get('kappa_trajectory', [])
                    awareness.curvature_history = awareness_data.get('curvature_history', [])
                    awareness.stuck_signals = awareness_data.get('stuck_signals', [])
                    awareness.geometric_deadends = awareness_data.get('geometric_deadends', [])
                    awareness.research_opportunities = awareness_data.get('research_opportunities', [])
                    awareness.last_spawn_proposal = awareness_data.get('last_spawn_proposal')
                    self.kernel_awareness[kernel_id] = awareness
            
            if awareness_states:
                print(f"✨ [M8] Loaded {len(awareness_states)} kernel awareness states from database")
        except Exception as e:
            print(f"[M8] Failed to load from database: {e}")

    def set_pantheon_chat(self, pantheon_chat) -> None:
        """Set PantheonChat for dual-pantheon spawn debates."""
        self._pantheon_chat = pantheon_chat

    def get_or_create_awareness(self, kernel_id: str) -> SpawnAwareness:
        """Get or create spawn awareness tracker for a kernel."""
        if kernel_id not in self.kernel_awareness:
            self.kernel_awareness[kernel_id] = SpawnAwareness(kernel_id=kernel_id)
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
        
        # Persist proposal to PostgreSQL
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
        """
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
        
        spawn_record = {
            "event": "kernel_spawned",
            "kernel": spawned.to_dict(),
            "refinements": refinements,
            "timestamp": spawned.spawned_at,
        }
        self.spawn_history.append(spawn_record)
        
        # Persist spawn event to PostgreSQL
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
                        'element': new_profile.element,
                        'role': new_profile.role,
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
        
        return {
            "consensus_type": self.consensus.consensus_type.value,
            "total_proposals": len(self.proposals),
            "pending_proposals": sum(1 for p in self.proposals.values() if p.status == "pending"),
            "approved_proposals": sum(1 for p in self.proposals.values() if p.status == "approved"),
            "spawned_kernels": total_kernels,  # From PostgreSQL
            "spawn_history_count": total_kernels,  # Use DB count only (avoid double-counting)
            "orchestrator_gods": unique_gods if unique_gods > 0 else len(self.orchestrator.all_profiles),
            # Additional stats from DB
            "avg_phi": float(db_stats.get('avg_phi', 0) or 0),
            "max_phi": float(db_stats.get('max_phi', 0) or 0),
            "total_successes": int(db_stats.get('total_successes', 0) or 0),
            "total_failures": int(db_stats.get('total_failures', 0) or 0),
            "unique_domains": int(db_stats.get('unique_domains', 0) or 0),
        }


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
