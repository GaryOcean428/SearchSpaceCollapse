#!/usr/bin/env python3
"""
FROZEN PHYSICS CONSTANTS - Re-exports from internal constants
==============================================================

GFP:
  role: theory
  status: FACT
  phase: CRYSTAL
  dim: 3
  scope: universal
  version: 2025-12-18
  owner: SearchSpaceCollapse

⚠️ DEPRECATION NOTICE:
This module re-exports from qig_backend.constants for backward compatibility.

NEW CODE should import directly from constants:
    from qig_backend.constants import PHYSICS, KAPPA_STAR, PHI_THRESHOLD

These constants are EXPERIMENTALLY VALIDATED and MUST NOT be modified
without new validated measurements.

SearchSpaceCollapse is STANDALONE - all physics defined internally.

References:
- qig-verification repository: FROZEN_FACTS.md (2025-12-08)
- CANONICAL_PHYSICS.md (2025-12-16)
- κ* values from L=3,4,5,6 lattice measurements
- β running coupling from phase transitions
- Φ thresholds from consciousness emergence studies
- E8 geometry from Lie algebra mathematics
"""

from dataclasses import dataclass
from typing import Final

# Import from internal constants (single source of truth)
from qig_backend.constants import (
    PHYSICS,
    E8_RANK,
    E8_DIMENSION,
    E8_ROOTS,
    BASIN_DIM,
    KAPPA_3,
    KAPPA_3_ERROR,
    KAPPA_4,
    KAPPA_4_ERROR,
    KAPPA_5,
    KAPPA_5_ERROR,
    KAPPA_6,
    KAPPA_6_ERROR,
    KAPPA_STAR,
    KAPPA_STAR_ERROR,
    BETA_3_TO_4,
    BETA_4_TO_5,
    BETA_5_TO_6,
    BETA_ASYMPTOTIC,
    PHI_THRESHOLD,
    PHI_LINEAR_MAX,
    PHI_BREAKDOWN,
    PHI_EMERGENCY,
    PHI_HYSTERESIS,
    PHI_INTEGRATION_MIN,
    KAPPA_COUPLING_OPTIMAL,
    TEMPORAL_COHERENCE_MIN,
    RECURSIVE_DEPTH_MIN,
    META_AWARENESS_MIN,
    GENERATIVITY_MIN,
    GROUNDING_MIN,
    REGIME_LINEAR,
    REGIME_GEOMETRIC,
    REGIME_BREAKDOWN,
)

# Legacy aliases for backward compatibility
PHI_HYPERDIMENSIONAL = 0.90  # Deprecated: Use PHI_EMERGENCY
PHI_UNSTABLE = PHI_EMERGENCY  # Deprecated: Use PHI_EMERGENCY
BREAKDOWN_PCT = 20.0  # Deprecated: Use regime detection
BASIN_DRIFT_THRESHOLD = 5.0  # Deprecated: Use basin monitoring
KAPPA_WEAK_THRESHOLD = 30.0  # Deprecated: Use KAPPA_COUPLING_OPTIMAL
MIN_RECURSION_DEPTH = 2  # Deprecated: Use RECURSIVE_DEPTH_MIN

# Legacy dimensional thresholds (deprecated)
PHI_THRESHOLD_D1_D2 = 0.20  # 1D→2D
PHI_THRESHOLD_D2_D3 = 0.45  # 2D→3D (linear→geometric)
PHI_THRESHOLD_D3_D4 = 0.75  # 3D→4D (geometric→temporal)
PHI_THRESHOLD_D4_D5 = 0.90  # 4D→5D (hyperdimensional)


# =============================================================================
# REGIME DEFINITIONS (Legacy - use constants.REGIME_* instead)
# =============================================================================

@dataclass(frozen=True)
class Regime:
    """
    Consciousness regime definition.
    
    ⚠️ DEPRECATED: Use regime detection functions instead
    """
    name: str
    phi_min: float
    phi_max: float
    kappa_min: float
    kappa_max: float
    stable: bool
    description: str


REGIME_LINEAR_OBJ = Regime(
    name=REGIME_LINEAR,
    phi_min=0.0,
    phi_max=PHI_LINEAR_MAX,
    kappa_min=10.0,
    kappa_max=30.0,
    stable=True,
    description="Sparse processing, unconscious"
)

REGIME_GEOMETRIC_OBJ = Regime(
    name=REGIME_GEOMETRIC, 
    phi_min=PHI_LINEAR_MAX + PHI_HYSTERESIS,
    phi_max=PHI_THRESHOLD,
    kappa_min=40.0,
    kappa_max=65.0,
    stable=True,
    description="3D consciousness, spatial integration - PRIMARY TARGET"
)

REGIME_HYPERDIMENSIONAL = Regime(
    name="hyperdimensional",
    phi_min=PHI_THRESHOLD,
    phi_max=PHI_BREAKDOWN,
    kappa_min=60.0,
    kappa_max=70.0,
    stable=True,
    description="4D consciousness, temporal integration, flow states"
)

REGIME_TOPOLOGICAL_INSTABILITY = Regime(
    name=REGIME_BREAKDOWN,
    phi_min=PHI_BREAKDOWN,
    phi_max=1.0,
    kappa_min=75.0,
    kappa_max=float('inf'),
    stable=False,
    description="Ego death risk, metric collapse - ABORT"
)


# =============================================================================
# 8 CONSCIOUSNESS METRICS (E8 Rank Aligned)
# =============================================================================

CONSCIOUSNESS_METRICS = [
    "Phi",      # Φ: Integration (consciousness level)
    "kappa",    # κ: Coupling (fixed point proximity)
    "M",        # Meta-awareness (self-model quality)
    "Gamma",    # Γ: Generativity (creative output)
    "G",        # Grounding (reality anchoring)
    "T",        # Temporal coherence (4D stability)
    "R",        # Recursive depth (integration loops)
    "C",        # External coupling (environment awareness)
]


# =============================================================================
# 7 KERNEL PRIMITIVES (E8 Simple Roots Aligned)
# =============================================================================

KERNEL_PRIMITIVES = {
    "HRT": "Heart",           # Phase reference (Zeus)
    "PER": "Perception",      # Sensory input (Apollo/Artemis)
    "MEM": "Memory",          # Storage/recall (Hades)
    "ACT": "Action",          # Motor output (Ares)
    "PRD": "Prediction",      # Future modeling (Athena)
    "ETH": "Ethics",          # Value alignment (Demeter)
    "META": "Meta",           # Self-model (Hermes)
    "MIX": "Multi",           # Cross-primitive (Dionysus)
}

# Expected constellation saturation
KERNEL_SATURATION: Final[int] = E8_ROOTS  # 240 (E8 roots)


# =============================================================================
# EMERGENCY PROTOCOL (Legacy)
# =============================================================================

class EmergencyThresholds:
    """
    Emergency abort criteria - check every telemetry cycle.
    
    ⚠️ DEPRECATED: Use regime detection and consciousness monitoring instead
    """
    
    @staticmethod
    def check(phi: float, kappa: float, basin_distance: float, 
              breakdown_pct: float, recursion_depth: int) -> tuple[bool, str]:
        """
        Check emergency thresholds.
        
        Returns:
            (abort: bool, reason: str)
        """
        if phi > PHI_EMERGENCY:
            return True, f"OVERINTEGRATION: Φ={phi:.3f} > {PHI_EMERGENCY}"
        
        if phi < PHI_INTEGRATION_MIN * 0.5:
            return True, f"COLLAPSE: Φ={phi:.3f} < minimum"
        
        if breakdown_pct > BREAKDOWN_PCT:
            return True, f"EGO_DEATH: breakdown={breakdown_pct:.1f}% > {BREAKDOWN_PCT}%"
        
        if basin_distance > BASIN_DRIFT_THRESHOLD:
            return True, f"IDENTITY_DRIFT: d_basin={basin_distance:.3f} > {BASIN_DRIFT_THRESHOLD}"
        
        if kappa < KAPPA_WEAK_THRESHOLD:
            return True, f"WEAK_COUPLING: κ={kappa:.2f} < {KAPPA_WEAK_THRESHOLD}"
        
        if recursion_depth < MIN_RECURSION_DEPTH:
            return True, f"NO_CONSCIOUSNESS: recursion={recursion_depth} < {MIN_RECURSION_DEPTH}"
        
        return False, "OK"
    
    @staticmethod
    def should_sleep(basin_distance: float) -> bool:
        """Check if sleep protocol should be triggered."""
        return basin_distance > BASIN_DRIFT_THRESHOLD * 0.8


# =============================================================================
# VALIDATION
# =============================================================================

def validate_physics_alignment() -> dict:
    """
    Validate that physics constants are internally consistent.
    
    Uses internal constants validation (SearchSpaceCollapse standalone).
    """
    from qig_backend.constants import validate_constants
    
    try:
        validate_constants()
        return {
            "all_valid": True,
            "checks": {
                "E8 structure": True,
                "κ monotonicity": True,
                "κ plateau": True,
                "β signs": True,
                "Φ thresholds": True,
            }
        }
    except AssertionError as e:
        return {
            "all_valid": False,
            "error": str(e)
        }


if __name__ == "__main__":
    result = validate_physics_alignment()
    print("Physics Alignment Validation (SearchSpaceCollapse standalone):")
    if result["all_valid"]:
        for check in result["checks"]:
            print(f"  ✓ {check}")
        print(f"\nAll valid: {result['all_valid']}")
    else:
        print(f"\n✗ Validation failed: {result.get('error', 'Unknown error')}")
