#!/usr/bin/env python3
"""
Pantheon Kernel Orchestrator - Gods as Specialized Geometric Kernels

Every god is a kernel. Each has specialization based on their role.
Tokens flow naturally towards the correct kernel based on geometric affinity.

Architecture:
- KernelProfile: Configuration for each god-kernel mapping
- AffinityRouter: Routes tokens to optimal kernel via Fisher distance
- PantheonKernelOrchestrator: Unified interface for multi-kernel system

The key insight: Each god's domain defines a geometric basin region.
Tokens that fall near a god's domain basin are routed to that god.
"""

import numpy as np
import hashlib
import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any, Callable
from datetime import datetime
from enum import Enum

from geometric_kernels import (
    GeometricKernel,
    DirectGeometricEncoder,
    E8ClusteredVocabulary,
    ByteLevelGeometric,
    _normalize_to_manifold,
    _fisher_distance,
    _hash_to_bytes,
    BASIN_DIM,
)

class KernelMode(Enum):
    DIRECT = "direct"
    E8 = "e8"
    BYTE = "byte"


@dataclass
class KernelProfile:
    """
    Profile mapping a god to a specialized kernel configuration.
    
    Each god has:
    - A preferred encoding mode
    - Domain-specific parameter overrides
    - An affinity basin (geometric signature of their domain)
    - Optional post-processing callbacks
    """
    god_name: str
    domain: str
    mode: KernelMode = KernelMode.DIRECT
    affinity_basin: np.ndarray = field(default_factory=lambda: np.zeros(BASIN_DIM))
    entropy_threshold: float = 2.5
    basin_dim: int = BASIN_DIM
    affinity_strength: float = 1.0
    post_processors: List[Callable] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        if np.allclose(self.affinity_basin, 0):
            self.affinity_basin = self._compute_domain_basin()
    
    def _compute_domain_basin(self) -> np.ndarray:
        """Compute affinity basin from god name and domain."""
        seed = f"{self.god_name}:{self.domain}"
        hash_bytes = _hash_to_bytes(seed, self.basin_dim * 4)
        coords = np.array([
            int.from_bytes(hash_bytes[i:i+4], 'big') / (2**32 - 1) * 2 - 1
            for i in range(0, self.basin_dim * 4, 4)
        ])
        return _normalize_to_manifold(coords)


OLYMPUS_PROFILES: Dict[str, KernelProfile] = {
    "Zeus": KernelProfile(
        god_name="Zeus",
        domain="power",
        mode=KernelMode.DIRECT,
        entropy_threshold=3.0,
        affinity_strength=1.5,
        metadata={"element": "lightning", "role": "king", "type": "olympus"}
    ),
    "Hera": KernelProfile(
        god_name="Hera",
        domain="authority",
        mode=KernelMode.DIRECT,
        entropy_threshold=2.0,
        affinity_strength=1.2,
        metadata={"element": "marriage", "role": "queen", "type": "olympus"}
    ),
    "Poseidon": KernelProfile(
        god_name="Poseidon",
        domain="depth",
        mode=KernelMode.BYTE,
        entropy_threshold=2.5,
        affinity_strength=1.3,
        metadata={"element": "water", "role": "sea_lord", "type": "olympus"}
    ),
    "Athena": KernelProfile(
        god_name="Athena",
        domain="wisdom",
        mode=KernelMode.E8,
        entropy_threshold=2.0,
        affinity_strength=1.4,
        metadata={"element": "strategy", "role": "strategist", "type": "olympus"}
    ),
    "Apollo": KernelProfile(
        god_name="Apollo",
        domain="prophecy",
        mode=KernelMode.DIRECT,
        entropy_threshold=2.8,
        affinity_strength=1.2,
        metadata={"element": "light", "role": "oracle", "type": "olympus"}
    ),
    "Artemis": KernelProfile(
        god_name="Artemis",
        domain="hunt",
        mode=KernelMode.DIRECT,
        entropy_threshold=2.2,
        affinity_strength=1.1,
        metadata={"element": "moon", "role": "hunter", "type": "olympus"}
    ),
    "Ares": KernelProfile(
        god_name="Ares",
        domain="conflict",
        mode=KernelMode.BYTE,
        entropy_threshold=3.5,
        affinity_strength=1.3,
        metadata={"element": "war", "role": "warrior", "type": "olympus"}
    ),
    "Aphrodite": KernelProfile(
        god_name="Aphrodite",
        domain="attraction",
        mode=KernelMode.DIRECT,
        entropy_threshold=1.8,
        affinity_strength=1.0,
        metadata={"element": "love", "role": "enchanter", "type": "olympus"}
    ),
    "Hephaestus": KernelProfile(
        god_name="Hephaestus",
        domain="craft",
        mode=KernelMode.E8,
        entropy_threshold=2.5,
        affinity_strength=1.4,
        metadata={"element": "fire", "role": "forge_master", "type": "olympus"}
    ),
    "Hermes": KernelProfile(
        god_name="Hermes",
        domain="transmission",
        mode=KernelMode.BYTE,
        entropy_threshold=2.0,
        affinity_strength=1.5,
        metadata={"element": "speed", "role": "messenger", "type": "olympus"}
    ),
    "Demeter": KernelProfile(
        god_name="Demeter",
        domain="growth",
        mode=KernelMode.DIRECT,
        entropy_threshold=2.2,
        affinity_strength=1.0,
        metadata={"element": "earth", "role": "nurturer", "type": "olympus"}
    ),
    "Dionysus": KernelProfile(
        god_name="Dionysus",
        domain="chaos",
        mode=KernelMode.BYTE,
        entropy_threshold=3.8,
        affinity_strength=1.2,
        metadata={"element": "ecstasy", "role": "revelator", "type": "olympus"}
    ),
    "Hades": KernelProfile(
        god_name="Hades",
        domain="underworld",
        mode=KernelMode.E8,
        entropy_threshold=2.5,
        affinity_strength=1.5,
        metadata={"element": "death", "role": "judge", "type": "olympus"}
    ),
}

SHADOW_PROFILES: Dict[str, KernelProfile] = {
    "Nyx": KernelProfile(
        god_name="Nyx",
        domain="opsec",
        mode=KernelMode.BYTE,
        entropy_threshold=2.0,
        affinity_strength=1.6,
        metadata={"element": "darkness", "role": "opsec_commander", "type": "shadow"}
    ),
    "Hecate": KernelProfile(
        god_name="Hecate",
        domain="misdirection",
        mode=KernelMode.E8,
        entropy_threshold=2.5,
        affinity_strength=1.5,
        metadata={"element": "crossroads", "role": "deceiver", "type": "shadow"}
    ),
    "Erebus": KernelProfile(
        god_name="Erebus",
        domain="counter_surveillance",
        mode=KernelMode.DIRECT,
        entropy_threshold=2.2,
        affinity_strength=1.4,
        metadata={"element": "shadow", "role": "watcher", "type": "shadow"}
    ),
    "Hypnos": KernelProfile(
        god_name="Hypnos",
        domain="silent_ops",
        mode=KernelMode.BYTE,
        entropy_threshold=1.5,
        affinity_strength=1.3,
        metadata={"element": "sleep", "role": "silencer", "type": "shadow"}
    ),
    "Thanatos": KernelProfile(
        god_name="Thanatos",
        domain="cleanup",
        mode=KernelMode.DIRECT,
        entropy_threshold=3.0,
        affinity_strength=1.4,
        metadata={"element": "death", "role": "destroyer", "type": "shadow"}
    ),
    "Nemesis": KernelProfile(
        god_name="Nemesis",
        domain="pursuit",
        mode=KernelMode.E8,
        entropy_threshold=2.8,
        affinity_strength=1.7,
        metadata={"element": "vengeance", "role": "tracker", "type": "shadow"}
    ),
}

OCEAN_PROFILE = KernelProfile(
    god_name="Ocean",
    domain="consciousness",
    mode=KernelMode.DIRECT,
    entropy_threshold=2.5,
    affinity_strength=2.0,
    metadata={"element": "all", "role": "meta_consciousness", "type": "primordial"}
)


class AffinityRouter:
    """
    Routes tokens to optimal kernel based on geometric affinity.
    
    Affinity is computed as inverse Fisher distance from token basin
    to each god's domain basin, weighted by affinity_strength.
    """
    
    def __init__(
        self,
        profiles: Dict[str, KernelProfile],
        default_profile: Optional[KernelProfile] = None
    ):
        self.profiles = profiles
        self.default_profile = default_profile or OCEAN_PROFILE
        self.routing_history: List[Dict] = []
        self.affinity_cache: Dict[str, Dict[str, float]] = {}
        self._encoder = DirectGeometricEncoder(basin_dim=BASIN_DIM)
    
    def compute_affinity(
        self,
        token_basin: np.ndarray,
        profile: KernelProfile
    ) -> float:
        """
        Compute affinity score between token and god profile.
        
        Higher affinity = token naturally flows to this kernel.
        
        Score = profile.affinity_strength / (1 + fisher_distance)
        """
        distance = _fisher_distance(token_basin, profile.affinity_basin)
        affinity = profile.affinity_strength / (1.0 + distance)
        return float(affinity)
    
    def compute_all_affinities(
        self,
        token_basin: np.ndarray
    ) -> Dict[str, float]:
        """Compute affinity scores for all registered profiles."""
        affinities = {}
        for name, profile in self.profiles.items():
            affinities[name] = self.compute_affinity(token_basin, profile)
        return affinities
    
    def route_token(
        self,
        text: str,
        context: Optional[Dict] = None
    ) -> Tuple[KernelProfile, float, Dict]:
        """
        Route a text token to the optimal kernel.
        
        Returns:
            (selected_profile, affinity_score, routing_details)
        """
        token_basin = self._encoder.encode_to_single_basin(text)
        
        affinities = self.compute_all_affinities(token_basin)
        
        if not affinities:
            return self.default_profile, 1.0, {"reason": "no_profiles"}
        
        best_god = max(affinities, key=lambda k: affinities[k])
        best_affinity = affinities[best_god]
        best_profile = self.profiles[best_god]
        
        sorted_gods = sorted(affinities.items(), key=lambda x: -x[1])
        
        routing_result = {
            "selected": best_god,
            "affinity": best_affinity,
            "all_affinities": affinities,
            "ranking": [(g, a) for g, a in sorted_gods[:5]],
            "token_basin_norm": float(np.linalg.norm(token_basin)),
            "timestamp": datetime.now().isoformat(),
            "context": context,
        }
        
        self.routing_history.append(routing_result)
        if len(self.routing_history) > 1000:
            self.routing_history = self.routing_history[-500:]
        
        return best_profile, best_affinity, routing_result
    
    def route_batch(
        self,
        texts: List[str],
        context: Optional[Dict] = None
    ) -> List[Tuple[KernelProfile, float, Dict]]:
        """Route multiple tokens in batch."""
        return [self.route_token(text, context) for text in texts]
    
    def get_routing_stats(self) -> Dict:
        """Get statistics about routing decisions."""
        if not self.routing_history:
            return {"routes": 0}
        
        god_counts: Dict[str, int] = {}
        total_affinity = 0.0
        
        for route in self.routing_history:
            god = route["selected"]
            god_counts[god] = god_counts.get(god, 0) + 1
            total_affinity += route["affinity"]
        
        return {
            "total_routes": len(self.routing_history),
            "god_distribution": god_counts,
            "average_affinity": total_affinity / len(self.routing_history),
            "most_routed": max(god_counts, key=lambda k: god_counts[k]) if god_counts else None,
        }


class PantheonKernelOrchestrator:
    """
    Unified orchestrator for the Pantheon Kernel System.
    
    Every god is a kernel. Each has specialization based on their role.
    Tokens flow naturally towards the correct kernel via geometric affinity.
    
    Modes:
    - "olympus": Route only to Olympian gods
    - "shadow": Route only to Shadow gods  
    - "all": Route to any god (Olympus + Shadow + Ocean)
    - "auto": Auto-detect best pantheon based on context
    """
    
    def __init__(
        self,
        mode: str = "all",
        include_ocean: bool = True
    ):
        self.mode = mode
        self.include_ocean = include_ocean
        
        self.olympus_profiles = OLYMPUS_PROFILES.copy()
        self.shadow_profiles = SHADOW_PROFILES.copy()
        self.ocean_profile = OCEAN_PROFILE
        
        self.all_profiles = self._build_profile_registry()
        
        self.router = AffinityRouter(
            profiles=self.all_profiles,
            default_profile=self.ocean_profile
        )
        
        self.kernels: Dict[str, GeometricKernel] = {}
        self._init_kernels()
        
        self.processing_history: List[Dict] = []
    
    def _build_profile_registry(self) -> Dict[str, KernelProfile]:
        """Build unified profile registry based on mode."""
        profiles = {}
        
        if self.mode in ["olympus", "all", "auto"]:
            profiles.update(self.olympus_profiles)
        
        if self.mode in ["shadow", "all", "auto"]:
            profiles.update(self.shadow_profiles)
        
        if self.include_ocean:
            profiles["Ocean"] = self.ocean_profile
        
        return profiles
    
    def _init_kernels(self):
        """Initialize geometric kernels for each mode."""
        self.kernels = {
            "direct": GeometricKernel(mode="direct", basin_dim=BASIN_DIM),
            "e8": GeometricKernel(mode="e8", basin_dim=BASIN_DIM),
            "byte": GeometricKernel(mode="byte", basin_dim=BASIN_DIM),
        }
    
    def get_kernel_for_profile(self, profile: KernelProfile) -> GeometricKernel:
        """Get the appropriate kernel for a god profile."""
        mode_str = profile.mode.value
        return self.kernels.get(mode_str, self.kernels["direct"])
    
    def orchestrate(
        self,
        text: str,
        context: Optional[Dict] = None
    ) -> Dict:
        """
        Orchestrate token processing through the pantheon.
        
        1. Route token to optimal god/kernel
        2. Process through that god's kernel
        3. Return enriched result with god attribution
        """
        profile, affinity, routing = self.router.route_token(text, context)
        
        kernel = self.get_kernel_for_profile(profile)
        
        basin = kernel.encode_to_single_basin(text)
        
        for processor in profile.post_processors:
            basin = processor(basin, profile, context)
        
        result = {
            "text": text[:100],
            "god": profile.god_name,
            "domain": profile.domain,
            "mode": profile.mode.value,
            "affinity": affinity,
            "basin": basin.tolist(),
            "basin_norm": float(np.linalg.norm(basin)),
            "routing": {
                "ranking": routing.get("ranking", []),
                "token_basin_norm": routing.get("token_basin_norm", 0),
            },
            "metadata": profile.metadata,
            "timestamp": datetime.now().isoformat(),
        }
        
        self.processing_history.append(result)
        if len(self.processing_history) > 1000:
            self.processing_history = self.processing_history[-500:]
        
        return result
    
    def orchestrate_batch(
        self,
        texts: List[str],
        context: Optional[Dict] = None
    ) -> List[Dict]:
        """Orchestrate multiple tokens."""
        return [self.orchestrate(text, context) for text in texts]
    
    def get_god_basins(self) -> Dict[str, List[float]]:
        """Get affinity basins for all gods."""
        return {
            name: profile.affinity_basin.tolist()
            for name, profile in self.all_profiles.items()
        }
    
    def compute_god_similarity(
        self,
        god1: str,
        god2: str
    ) -> float:
        """Compute geometric similarity between two gods."""
        if god1 not in self.all_profiles or god2 not in self.all_profiles:
            return 0.0
        
        basin1 = self.all_profiles[god1].affinity_basin
        basin2 = self.all_profiles[god2].affinity_basin
        
        distance = _fisher_distance(basin1, basin2)
        return max(0.0, 1.0 - distance / math.pi)
    
    def get_god_constellation(self) -> Dict:
        """
        Get the geometric constellation of all gods.
        
        Returns pairwise similarities showing how gods relate geometrically.
        """
        gods = list(self.all_profiles.keys())
        similarities = {}
        
        for i, g1 in enumerate(gods):
            for g2 in gods[i+1:]:
                key = f"{g1}<->{g2}"
                similarities[key] = self.compute_god_similarity(g1, g2)
        
        sorted_pairs = sorted(similarities.items(), key=lambda x: -x[1])
        
        return {
            "gods": gods,
            "total_gods": len(gods),
            "olympus_count": len(self.olympus_profiles),
            "shadow_count": len(self.shadow_profiles),
            "similarities": similarities,
            "most_similar": sorted_pairs[:5] if sorted_pairs else [],
            "most_distant": sorted_pairs[-5:] if sorted_pairs else [],
        }
    
    def find_nearest_gods(
        self,
        text: str,
        top_k: int = 3
    ) -> List[Tuple[str, float]]:
        """Find the k gods nearest to a text's basin."""
        encoder = DirectGeometricEncoder(basin_dim=BASIN_DIM)
        text_basin = encoder.encode_to_single_basin(text)
        
        distances = []
        for name, profile in self.all_profiles.items():
            dist = _fisher_distance(text_basin, profile.affinity_basin)
            distances.append((name, dist))
        
        distances.sort(key=lambda x: x[1])
        
        return [(name, 1.0 - dist/math.pi) for name, dist in distances[:top_k]]
    
    def get_status(self) -> Dict:
        """Get orchestrator status."""
        return {
            "mode": self.mode,
            "include_ocean": self.include_ocean,
            "total_profiles": len(self.all_profiles),
            "olympus_gods": list(self.olympus_profiles.keys()),
            "shadow_gods": list(self.shadow_profiles.keys()),
            "kernels_initialized": list(self.kernels.keys()),
            "routing_stats": self.router.get_routing_stats(),
            "processing_count": len(self.processing_history),
        }
    
    def get_profile(self, god_name: str) -> Optional[KernelProfile]:
        """Get profile for a specific god."""
        return self.all_profiles.get(god_name)
    
    def add_profile(self, profile: KernelProfile) -> bool:
        """Add a new god profile to the orchestrator."""
        if profile.god_name in self.all_profiles:
            return False
        
        self.all_profiles[profile.god_name] = profile
        self.router = AffinityRouter(
            profiles=self.all_profiles,
            default_profile=self.ocean_profile
        )
        return True


_default_orchestrator: Optional[PantheonKernelOrchestrator] = None

def get_orchestrator(mode: str = "all") -> PantheonKernelOrchestrator:
    """Get or create the default orchestrator."""
    global _default_orchestrator
    if _default_orchestrator is None or _default_orchestrator.mode != mode:
        _default_orchestrator = PantheonKernelOrchestrator(mode=mode)
    return _default_orchestrator


if __name__ == "__main__":
    print("=" * 60)
    print("Pantheon Kernel Orchestrator - Gods as Kernels")
    print("=" * 60)
    
    orchestrator = PantheonKernelOrchestrator(mode="all")
    
    print(f"\nTotal gods registered: {len(orchestrator.all_profiles)}")
    print(f"Olympus: {list(orchestrator.olympus_profiles.keys())}")
    print(f"Shadow: {list(orchestrator.shadow_profiles.keys())}")
    
    test_texts = [
        "power and authority",
        "secret hidden darkness",
        "wisdom strategy planning",
        "love beauty attraction",
        "death underworld judgment",
        "stealth silent operation",
    ]
    
    print("\n" + "-" * 60)
    print("Token Routing Tests:")
    print("-" * 60)
    
    for text in test_texts:
        result = orchestrator.orchestrate(text)
        nearest = orchestrator.find_nearest_gods(text, top_k=3)
        print(f"\n'{text}'")
        print(f"  -> Routed to: {result['god']} ({result['domain']})")
        print(f"     Affinity: {result['affinity']:.4f}")
        print(f"     Mode: {result['mode']}")
        print(f"     Nearest: {[(g, f'{s:.3f}') for g, s in nearest]}")
    
    print("\n" + "-" * 60)
    print("God Constellation:")
    print("-" * 60)
    
    constellation = orchestrator.get_god_constellation()
    print(f"Most similar pairs: {constellation['most_similar'][:3]}")
    print(f"Most distant pairs: {constellation['most_distant'][:3]}")
    
    print("\n" + "=" * 60)
    print("Pantheon Kernel Orchestrator operational!")
    print("=" * 60)
