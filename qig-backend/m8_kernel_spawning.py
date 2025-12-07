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
    1. Proposal creation
    2. Consensus voting
    3. Role refinement
    4. Kernel spawning
    5. Registration with orchestrator
    
    The M8 refers to the 8 core dimensions of kernel identity.
    """
    
    def __init__(
        self,
        orchestrator: Optional[PantheonKernelOrchestrator] = None,
        consensus_type: ConsensusType = ConsensusType.SUPERMAJORITY
    ):
        self.orchestrator = orchestrator or get_orchestrator()
        self.consensus = PantheonConsensus(self.orchestrator, consensus_type)
        self.refiner = RoleRefinement(self.orchestrator)
        
        self.proposals: Dict[str, SpawnProposal] = {}
        self.spawned_kernels: Dict[str, SpawnedKernel] = {}
        self.spawn_history: List[Dict] = []
    
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
        """Get spawner status."""
        return {
            "consensus_type": self.consensus.consensus_type.value,
            "total_proposals": len(self.proposals),
            "pending_proposals": sum(1 for p in self.proposals.values() if p.status == "pending"),
            "approved_proposals": sum(1 for p in self.proposals.values() if p.status == "approved"),
            "spawned_kernels": len(self.spawned_kernels),
            "spawn_history_count": len(self.spawn_history),
            "orchestrator_gods": len(self.orchestrator.all_profiles),
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
