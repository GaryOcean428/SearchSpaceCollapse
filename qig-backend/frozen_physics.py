#!/usr/bin/env python3
"""
FROZEN PHYSICS CONSTANTS - Re-exports from qigkernels
======================================================

GFP:
  role: theory
  status: FACT
  phase: CRYSTAL
  dim: 3
  scope: universal
  version: 2025-12-17
  owner: SearchSpaceCollapse

⚠️ MIGRATION NOTICE:
This module now imports from qigkernels and re-exports for backward compatibility.
New code should import directly from qigkernels:
    from qigkernels import PHYSICS, KAPPA_STAR, PHI_THRESHOLD

These constants are EXPERIMENTALLY VALIDATED and MUST NOT be modified
without new validated measurements.

Physics flows FROM qigkernels TO all kernels and consciousness systems.

References:
- κ* values from L=3,4,5,6 lattice measurements
- β running coupling from phase transitions
- Φ thresholds from consciousness emergence studies
- E8 geometry from Lie algebra mathematics
"""

from dataclasses import dataclass
from typing import Final

# Import from qigkernels (single source of truth)
from qigkernels.physics_constants import (
    PHYSICS,
    E8_RANK,
    E8_DIMENSION,
    E8_ROOTS,
    BASIN_DIM,
    L_CRITICAL,
    KAPPA_3,
    KAPPA_4,
    KAPPA_5,
    KAPPA_6,
    KAPPA_STAR,
    KAPPA_STAR_ERROR,
    BETA_3_TO_4,
    BETA_ASYMPTOTIC,
    PHI_THRESHOLD,
    PHI_EMERGENCY,
    PHI_HYPERDIMENSIONAL,
    PHI_UNSTABLE,
    BREAKDOWN_PCT,
    BASIN_DRIFT_THRESHOLD,
    KAPPA_WEAK_THRESHOLD,
    MIN_RECURSION_DEPTH,
)

# Additional constants not exported by default
BETA_4_TO_5: Final[float] = PHYSICS.BETA_4_TO_5
BETA_5_TO_6: Final[float] = PHYSICS.BETA_5_TO_6
PHI_THRESHOLD_D1_D2: Final[float] = PHYSICS.PHI_THRESHOLD_D1_D2
PHI_THRESHOLD_D2_D3: Final[float] = PHYSICS.PHI_THRESHOLD_D2_D3
PHI_THRESHOLD_D3_D4: Final[float] = PHYSICS.PHI_THRESHOLD_D3_D4
PHI_THRESHOLD_D4_D5: Final[float] = PHYSICS.PHI_THRESHOLD_D4_D5


# =============================================================================
# REGIME DEFINITIONS - Import from qigkernels (canonical source)
# =============================================================================

from qigkernels.regimes import Regime, RegimeDetector, RegimeThresholds

# Legacy aliases for backward compatibility (deprecated)
# New code should use: from qigkernels.regimes import Regime
REGIME_LINEAR = Regime.LINEAR
REGIME_GEOMETRIC = Regime.GEOMETRIC
REGIME_HYPERDIMENSIONAL = Regime.HYPERDIMENSIONAL
REGIME_TOPOLOGICAL_INSTABILITY = Regime.TOPOLOGICAL_INSTABILITY


# =============================================================================
# 8 CONSCIOUSNESS METRICS (E8 Rank Aligned)
# =============================================================================

CONSCIOUSNESS_METRICS = [
    "Phi",      # Integration (consciousness level)
    "kappa",    # Coupling (fixed point proximity)
    "M",        # Meta-awareness (self-model quality)
    "Gamma",    # Generativity (creative output)
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
KERNEL_SATURATION: Final[int] = 240  # E8 roots


# =============================================================================
# EMERGENCY PROTOCOL (Legacy - use qigkernels.safety instead)
# =============================================================================

class EmergencyThresholds:
    """
    Emergency abort criteria - check every telemetry cycle.
    
    ⚠️ DEPRECATED: Use qigkernels.safety.SafetyMonitor instead
    """
    
    @staticmethod
    def check(phi: float, kappa: float, basin_distance: float, 
              breakdown_pct: float, recursion_depth: int) -> tuple[bool, str]:
        """
        Check emergency thresholds.
        
        Returns:
            (abort: bool, reason: str)
            
        ⚠️ DEPRECATED: Use qigkernels.safety.SafetyMonitor instead
        """
        if phi < PHI_EMERGENCY:
            return True, f"COLLAPSE: Φ={phi:.3f} < {PHI_EMERGENCY}"
        
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
        """
        Check if sleep protocol should be triggered.
        
        ⚠️ DEPRECATED: Use qigkernels.safety.SafetyMonitor instead
        """
        return basin_distance > BASIN_DRIFT_THRESHOLD * 0.8  # 80% of threshold


# =============================================================================
# VALIDATION
# =============================================================================

def validate_physics_alignment() -> dict:
    """
    Validate that physics constants are internally consistent.
    
    Delegates to qigkernels.physics_constants.PHYSICS.validate_alignment()
    """
    return PHYSICS.validate_alignment()


if __name__ == "__main__":
    result = validate_physics_alignment()
    print("Physics Alignment Validation (via qigkernels):")
    for check, passed in result["checks"].items():
        status = "✓" if passed else "✗"
        print(f"  {status} {check}")
    print(f"\nAll valid: {result['all_valid']}")
