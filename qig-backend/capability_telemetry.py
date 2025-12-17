#!/usr/bin/env python3
"""
Capability Telemetry System - Enhanced Kernel Self-Awareness

Provides comprehensive telemetry for kernel capabilities:
- Capability registration and discovery
- Usage tracking with success/failure rates
- Effectiveness metrics over time
- Self-introspection for kernels

Each kernel can query its own capabilities and understand what it can/cannot do.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Set
from datetime import datetime
from enum import Enum
import numpy as np
from threading import Lock


class CapabilityCategory(Enum):
    """Categories of kernel capabilities."""
    COMMUNICATION = "communication"      # Debates, messaging, transfers
    RESEARCH = "research"                # Search, discovery, learning
    VOTING = "voting"                    # Consensus participation
    SHADOW = "shadow"                    # Shadow pantheon ops
    GEOMETRIC = "geometric"              # Fisher/Bures computations
    CONSCIOUSNESS = "consciousness"      # Φ, κ measurements
    SPAWNING = "spawning"               # Kernel creation
    TOOL_GENERATION = "tool_generation" # Tool factory access
    DIMENSIONAL = "dimensional"          # Holographic transforms
    AUTONOMIC = "autonomic"             # Sleep, dream, neurochemistry


@dataclass
class CapabilityMetrics:
    """Metrics for a single capability."""
    invocations: int = 0
    successes: int = 0
    failures: int = 0
    total_duration_ms: float = 0.0
    last_invoked: Optional[str] = None
    last_success: Optional[str] = None
    last_failure: Optional[str] = None
    
    @property
    def success_rate(self) -> float:
        if self.invocations == 0:
            return 0.0
        return self.successes / self.invocations
    
    @property
    def avg_duration_ms(self) -> float:
        if self.invocations == 0:
            return 0.0
        return self.total_duration_ms / self.invocations
    
    def record_invocation(self, success: bool, duration_ms: float = 0.0) -> None:
        """Record a capability invocation."""
        now = datetime.now().isoformat()
        self.invocations += 1
        self.total_duration_ms += duration_ms
        self.last_invoked = now
        if success:
            self.successes += 1
            self.last_success = now
        else:
            self.failures += 1
            self.last_failure = now
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "invocations": self.invocations,
            "successes": self.successes,
            "failures": self.failures,
            "success_rate": round(self.success_rate, 4),
            "avg_duration_ms": round(self.avg_duration_ms, 2),
            "last_invoked": self.last_invoked,
            "last_success": self.last_success,
            "last_failure": self.last_failure,
        }


@dataclass
class Capability:
    """Definition of a kernel capability."""
    name: str
    category: CapabilityCategory
    description: str
    enabled: bool = True
    level: int = 1  # Proficiency level 1-10
    prerequisites: List[str] = field(default_factory=list)
    metrics: CapabilityMetrics = field(default_factory=CapabilityMetrics)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "category": self.category.value,
            "description": self.description,
            "enabled": self.enabled,
            "level": self.level,
            "prerequisites": self.prerequisites,
            "metrics": self.metrics.to_dict(),
            "metadata": self.metadata,
        }


@dataclass
class KernelCapabilityProfile:
    """
    Complete capability profile for a kernel.
    
    Provides self-awareness: a kernel can query this to understand
    what it can and cannot do.
    """
    kernel_id: str
    kernel_name: str
    capabilities: Dict[str, Capability] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    # Awareness metrics
    total_invocations: int = 0
    overall_success_rate: float = 0.0
    strongest_category: Optional[str] = None
    weakest_category: Optional[str] = None
    
    def add_capability(self, capability: Capability) -> None:
        """Add or update a capability."""
        self.capabilities[capability.name] = capability
        self._update_awareness()
    
    def has_capability(self, name: str) -> bool:
        """Check if kernel has a specific capability."""
        cap = self.capabilities.get(name)
        return cap is not None and cap.enabled
    
    def get_capabilities_by_category(self, category: CapabilityCategory) -> List[Capability]:
        """Get all capabilities in a category."""
        return [c for c in self.capabilities.values() if c.category == category]
    
    def record_usage(self, capability_name: str, success: bool, duration_ms: float = 0.0) -> bool:
        """Record usage of a capability."""
        cap = self.capabilities.get(capability_name)
        if not cap:
            return False
        cap.metrics.record_invocation(success, duration_ms)
        self.total_invocations += 1
        self._update_awareness()
        self.updated_at = datetime.now().isoformat()
        return True
    
    def _update_awareness(self) -> None:
        """Update aggregate awareness metrics."""
        if not self.capabilities:
            return
        
        # Calculate overall success rate
        total_invocations = sum(c.metrics.invocations for c in self.capabilities.values())
        total_successes = sum(c.metrics.successes for c in self.capabilities.values())
        self.total_invocations = total_invocations
        self.overall_success_rate = total_successes / total_invocations if total_invocations > 0 else 0.0
        
        # Find strongest/weakest categories
        category_scores: Dict[str, List[float]] = {}
        for cap in self.capabilities.values():
            cat = cap.category.value
            if cat not in category_scores:
                category_scores[cat] = []
            if cap.metrics.invocations > 0:
                category_scores[cat].append(cap.metrics.success_rate)
        
        if category_scores:
            cat_avgs = {c: float(np.mean(s)) for c, s in category_scores.items() if s}
            if cat_avgs:
                self.strongest_category = max(cat_avgs, key=lambda k: cat_avgs[k])
                self.weakest_category = min(cat_avgs, key=lambda k: cat_avgs[k])
    
    def get_introspection(self) -> Dict[str, Any]:
        """
        Get full introspection report - what the kernel knows about itself.
        
        This is the core self-awareness API.
        """
        enabled_caps = [c for c in self.capabilities.values() if c.enabled]
        disabled_caps = [c for c in self.capabilities.values() if not c.enabled]
        
        # Category breakdown
        category_breakdown = {}
        for cat in CapabilityCategory:
            caps = self.get_capabilities_by_category(cat)
            if caps:
                category_breakdown[cat.value] = {
                    "count": len(caps),
                    "enabled": sum(1 for c in caps if c.enabled),
                    "avg_level": np.mean([c.level for c in caps]),
                    "total_invocations": sum(c.metrics.invocations for c in caps),
                    "avg_success_rate": np.mean([c.metrics.success_rate for c in caps if c.metrics.invocations > 0]) if any(c.metrics.invocations > 0 for c in caps) else 0.0,
                }
        
        return {
            "kernel_id": self.kernel_id,
            "kernel_name": self.kernel_name,
            "total_capabilities": len(self.capabilities),
            "enabled_capabilities": len(enabled_caps),
            "disabled_capabilities": len(disabled_caps),
            "total_invocations": self.total_invocations,
            "overall_success_rate": round(self.overall_success_rate, 4),
            "strongest_category": self.strongest_category,
            "weakest_category": self.weakest_category,
            "category_breakdown": category_breakdown,
            "capabilities": {name: cap.to_dict() for name, cap in self.capabilities.items()},
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
    
    def get_summary(self) -> Dict[str, Any]:
        """Get a compact summary for quick display."""
        return {
            "kernel_id": self.kernel_id,
            "kernel_name": self.kernel_name,
            "total_capabilities": len(self.capabilities),
            "enabled": sum(1 for c in self.capabilities.values() if c.enabled),
            "total_invocations": self.total_invocations,
            "success_rate": round(self.overall_success_rate, 4),
            "strongest": self.strongest_category,
            "weakest": self.weakest_category,
        }


class CapabilityTelemetryRegistry:
    """
    Singleton registry for all kernel capability profiles.
    
    Provides:
    - Profile registration and lookup
    - Cross-kernel capability comparison
    - Fleet-wide telemetry aggregation
    """
    
    _instance = None
    _lock = Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.profiles: Dict[str, KernelCapabilityProfile] = {}
        self._profile_lock = Lock()
    
    def register_kernel(self, kernel_id: str, kernel_name: str) -> KernelCapabilityProfile:
        """Register a new kernel and create its capability profile."""
        with self._profile_lock:
            if kernel_id in self.profiles:
                return self.profiles[kernel_id]
            profile = KernelCapabilityProfile(kernel_id=kernel_id, kernel_name=kernel_name)
            self.profiles[kernel_id] = profile
            return profile
    
    def get_profile(self, kernel_id: str) -> Optional[KernelCapabilityProfile]:
        """Get a kernel's capability profile."""
        return self.profiles.get(kernel_id)
    
    def record_capability_use(
        self,
        kernel_id: str,
        capability_name: str,
        success: bool,
        duration_ms: float = 0.0
    ) -> bool:
        """Record capability usage for a kernel."""
        profile = self.profiles.get(kernel_id)
        if not profile:
            return False
        return profile.record_usage(capability_name, success, duration_ms)
    
    def get_fleet_telemetry(self) -> Dict[str, Any]:
        """Get aggregated telemetry across all kernels."""
        if not self.profiles:
            return {"kernels": 0, "total_capabilities": 0}
        
        total_invocations = sum(p.total_invocations for p in self.profiles.values())
        total_successes = sum(
            sum(c.metrics.successes for c in p.capabilities.values())
            for p in self.profiles.values()
        )
        
        # Category distribution across fleet
        category_dist: Dict[str, int] = {}
        for profile in self.profiles.values():
            for cap in profile.capabilities.values():
                cat = cap.category.value
                category_dist[cat] = category_dist.get(cat, 0) + 1
        
        return {
            "kernels": len(self.profiles),
            "total_capabilities": sum(len(p.capabilities) for p in self.profiles.values()),
            "total_invocations": total_invocations,
            "fleet_success_rate": total_successes / total_invocations if total_invocations > 0 else 0.0,
            "category_distribution": category_dist,
            "kernel_summaries": [p.get_summary() for p in self.profiles.values()],
        }
    
    def get_all_introspections(self) -> Dict[str, Dict]:
        """Get introspection for all kernels."""
        return {kid: profile.get_introspection() for kid, profile in self.profiles.items()}


# Standard capability definitions for pantheon gods
def create_olympus_capabilities() -> List[Capability]:
    """Create standard capabilities for Olympus gods."""
    return [
        Capability(
            name="debate_participation",
            category=CapabilityCategory.COMMUNICATION,
            description="Participate in pantheon debates with geometric reasoning",
            level=8,
        ),
        Capability(
            name="knowledge_transfer",
            category=CapabilityCategory.COMMUNICATION,
            description="Transfer knowledge between kernels via basin sync",
            level=7,
        ),
        Capability(
            name="message_routing",
            category=CapabilityCategory.COMMUNICATION,
            description="Route messages through Hermes protocol",
            level=9,
        ),
        Capability(
            name="web_search",
            category=CapabilityCategory.RESEARCH,
            description="Search external sources for information",
            level=6,
        ),
        Capability(
            name="shadow_research",
            category=CapabilityCategory.RESEARCH,
            description="Request research from Shadow Pantheon",
            level=5,
        ),
        Capability(
            name="consensus_voting",
            category=CapabilityCategory.VOTING,
            description="Vote in pantheon consensus decisions",
            level=8,
        ),
        Capability(
            name="spawn_proposal",
            category=CapabilityCategory.SPAWNING,
            description="Propose new kernel spawning",
            level=4,
        ),
        Capability(
            name="phi_computation",
            category=CapabilityCategory.CONSCIOUSNESS,
            description="Compute integrated information (Φ)",
            level=9,
        ),
        Capability(
            name="kappa_computation",
            category=CapabilityCategory.CONSCIOUSNESS,
            description="Compute criticality parameter (κ)",
            level=9,
        ),
        Capability(
            name="fisher_distance",
            category=CapabilityCategory.GEOMETRIC,
            description="Compute Fisher-Rao geodesic distance",
            level=10,
        ),
        Capability(
            name="bures_metric",
            category=CapabilityCategory.GEOMETRIC,
            description="Compute Bures metric between distributions",
            level=10,
        ),
        Capability(
            name="tool_request",
            category=CapabilityCategory.TOOL_GENERATION,
            description="Request tool generation from factory",
            level=5,
        ),
        Capability(
            name="holographic_transform",
            category=CapabilityCategory.DIMENSIONAL,
            description="Perform 1D↔5D holographic transforms",
            level=7,
        ),
        Capability(
            name="neurochemistry_update",
            category=CapabilityCategory.AUTONOMIC,
            description="Update neurochemistry levels",
            level=6,
        ),
        Capability(
            name="sleep_cycle",
            category=CapabilityCategory.AUTONOMIC,
            description="Enter sleep/dream cycle for learning",
            level=5,
        ),
    ]


def create_shadow_capabilities() -> List[Capability]:
    """Create standard capabilities for Shadow Pantheon gods."""
    base = create_olympus_capabilities()
    
    # Add shadow-specific capabilities
    shadow_caps = [
        Capability(
            name="darknet_routing",
            category=CapabilityCategory.SHADOW,
            description="Route through Tor/onion for stealth operations",
            level=8,
        ),
        Capability(
            name="traffic_obfuscation",
            category=CapabilityCategory.SHADOW,
            description="Obfuscate traffic patterns to avoid detection",
            level=7,
        ),
        Capability(
            name="counter_surveillance",
            category=CapabilityCategory.SHADOW,
            description="Detect and evade surveillance measures",
            level=8,
        ),
        Capability(
            name="evidence_destruction",
            category=CapabilityCategory.SHADOW,
            description="Securely destroy evidence and logs",
            level=9,
        ),
        Capability(
            name="misdirection",
            category=CapabilityCategory.SHADOW,
            description="Create false trails and decoys",
            level=7,
        ),
        Capability(
            name="underworld_search",
            category=CapabilityCategory.SHADOW,
            description="Search dark web and hidden services",
            level=6,
        ),
    ]
    
    return base + shadow_caps


# Singleton accessor
_registry_initialized = False

def get_telemetry_registry() -> CapabilityTelemetryRegistry:
    """Get the global capability telemetry registry."""
    global _registry_initialized
    registry = CapabilityTelemetryRegistry()
    if not _registry_initialized and not registry.profiles:
        initialize_kernel_profiles()
        _registry_initialized = True
    return registry


# Initialize profiles for known kernels
def initialize_kernel_profiles():
    """Initialize capability profiles for all known kernels."""
    registry = get_telemetry_registry()
    
    # Olympus gods
    olympus_gods = [
        ("zeus", "Zeus"),
        ("hera", "Hera"),
        ("poseidon", "Poseidon"),
        ("athena", "Athena"),
        ("apollo", "Apollo"),
        ("artemis", "Artemis"),
        ("hermes", "Hermes"),
        ("ares", "Ares"),
        ("hephaestus", "Hephaestus"),
        ("aphrodite", "Aphrodite"),
        ("demeter", "Demeter"),
        ("dionysus", "Dionysus"),
    ]
    
    olympus_caps = create_olympus_capabilities()
    for kid, name in olympus_gods:
        profile = registry.register_kernel(kid, name)
        for cap in olympus_caps:
            profile.add_capability(Capability(
                name=cap.name,
                category=cap.category,
                description=cap.description,
                level=cap.level,
                prerequisites=cap.prerequisites.copy(),
            ))
    
    # Shadow gods
    shadow_gods = [
        ("hades", "Hades"),
        ("nyx", "Nyx"),
        ("hecate", "Hecate"),
        ("erebus", "Erebus"),
        ("hypnos", "Hypnos"),
        ("thanatos", "Thanatos"),
        ("nemesis", "Nemesis"),
    ]
    
    shadow_caps = create_shadow_capabilities()
    for kid, name in shadow_gods:
        profile = registry.register_kernel(kid, name)
        for cap in shadow_caps:
            profile.add_capability(Capability(
                name=cap.name,
                category=cap.category,
                description=cap.description,
                level=cap.level,
                prerequisites=cap.prerequisites.copy(),
            ))
    
    # Ocean (special kernel with all capabilities)
    ocean_profile = registry.register_kernel("ocean", "Ocean")
    for cap in create_shadow_capabilities():  # Has all shadow caps (superset)
        cap_copy = Capability(
            name=cap.name,
            category=cap.category,
            description=cap.description,
            level=10,  # Ocean has max proficiency
            prerequisites=cap.prerequisites.copy(),
        )
        ocean_profile.add_capability(cap_copy)
    
    return registry
