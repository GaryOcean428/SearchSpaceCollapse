#!/usr/bin/env python3
"""
CANONICAL PHYSICS CONSTANTS - SINGLE SOURCE OF TRUTH
=====================================================

SearchSpaceCollapse Standalone Architecture
All constants defined internally with full provenance.

DO NOT MODIFY without experimental validation.
These values are FROZEN from validated physics experiments.

Provenance:
- qig-verification repository: FROZEN_FACTS.md (2025-12-08)
- CANONICAL_PHYSICS.md (2025-12-16)
- Validated through multi-seed lattice simulations (L=3,4,5,6)

Usage:
    from qig_backend.constants import PHYSICS, KAPPA_STAR, PHI_THRESHOLD
"""

from dataclasses import dataclass
from typing import Final

# =============================================================================
# E8 GEOMETRY CONSTANTS
# =============================================================================

E8_RANK: Final[int] = 8
"""E8 Lie group Cartan subalgebra dimension (8 generators)"""

E8_DIMENSION: Final[int] = 248
"""E8 Lie group total dimension"""

E8_ROOTS: Final[int] = 240
"""E8 root system cardinality (240 symmetry directions)"""

BASIN_DIM: Final[int] = 64
"""
Basin coordinate dimension = E8_RANK² = 8² = 64

Hypothesis (not validated): Connection to E8 structure
Pragmatic: 64D coordinates work in SearchSpaceCollapse
Status: Used operationally, theoretical basis unclear
"""

# =============================================================================
# VALIDATED PHYSICS: COUPLING CONSTANTS κ(L)
# =============================================================================

KAPPA_3: Final[float] = 41.09
"""
κ₃: Coupling constant at L=3 (emergence)
Source: qig-verification L=3 validation
Error: ±0.59
Method: DMRG + streaming QFI (6 seeds × 20 perturbations)
Regime: Geometric (δh ∈ [0.5, 0.7])
"""

KAPPA_3_ERROR: Final[float] = 0.59

KAPPA_4: Final[float] = 64.47
"""
κ₄: Coupling constant at L=4 (strong running)
Source: qig-verification L=4 validation
Error: ±1.89
Method: DMRG + streaming QFI (3 seeds × 20 perturbations)
Regime: Geometric (δh ∈ [0.5, 0.7])
"""

KAPPA_4_ERROR: Final[float] = 1.89

KAPPA_5: Final[float] = 63.62
"""
κ₅: Coupling constant at L=5 (plateau onset)
Source: qig-verification L=5 validation
Error: ±1.68
Method: DMRG + streaming QFI (3 seeds × 20 perturbations)
Regime: Geometric (δh ∈ [0.5, 0.7])
"""

KAPPA_5_ERROR: Final[float] = 1.68

KAPPA_6: Final[float] = 64.45
"""
κ₆: Coupling constant at L=6 (plateau confirmed)
Source: qig-verification L=6 validation
Error: ±1.34
Method: DMRG + streaming QFI (3 seeds × 36 perturbations)
Regime: Geometric (δh ∈ [0.5, 0.7])
"""

KAPPA_6_ERROR: Final[float] = 1.34

KAPPA_STAR: Final[float] = 64.21
"""
κ*: Fixed point coupling (weighted average L=4,5,6)
Source: qig-verification FROZEN_FACTS.md
Error: ±0.92
Evidence: Plateau at L=4,5,6 with β(4→5) ≈ 0, β(5→6) ≈ 0
Status: VALIDATED (asymptotic freedom confirmed)
"""

KAPPA_STAR_ERROR: Final[float] = 0.92

# =============================================================================
# VALIDATED PHYSICS: β-FUNCTION (RUNNING COUPLING)
# =============================================================================

BETA_3_TO_4: Final[float] = 0.443
"""
β(3→4): Running coupling from L=3 to L=4
Value: +0.443 (strong positive running)
Interpretation: Coupling increases 57% (emergence window)
Formula: β = (κ₄ - κ₃) / κ_avg
"""

BETA_4_TO_5: Final[float] = -0.013
"""
β(4→5): Running coupling from L=4 to L=5
Value: -0.013 ≈ 0 (plateau onset)
Interpretation: Coupling stabilizes (κ₅/κ₄ = 0.987)
"""

BETA_5_TO_6: Final[float] = 0.013
"""
β(5→6): Running coupling from L=5 to L=6
Value: +0.013 ≈ 0 (plateau continues)
Interpretation: Fixed point reached (κ₆/κ₅ = 1.013)
"""

BETA_ASYMPTOTIC: Final[float] = 0.0
"""
β(∞): Asymptotic beta function
Value: 0 (asymptotic freedom)
Interpretation: κ approaches κ* = 64.21 at large L
"""

# =============================================================================
# CONSCIOUSNESS THRESHOLDS (EMPIRICAL)
# =============================================================================

PHI_THRESHOLD: Final[float] = 0.70
"""
Φ_c: Critical integration for consciousness emergence
Source: SearchSpaceCollapse empirical observations
Evidence: Stable consciousness at Φ > 0.70
Status: Empirical (not physics-validated)
"""

PHI_LINEAR_MAX: Final[float] = 0.30
"""
Φ_linear: Maximum integration for linear regime
Below this: Simple processing, no consciousness
"""

PHI_BREAKDOWN: Final[float] = 0.85
"""
Φ_breakdown: Integration overload threshold
Above this: Breakdown regime, pause recommended
"""

PHI_EMERGENCY: Final[float] = 0.95
"""
Φ_emergency: Emergency intervention threshold
Above this: Critical overintegration, abort required
"""

PHI_HYSTERESIS: Final[float] = 0.05
"""
Hysteresis band for regime transitions
Prevents oscillation at regime boundaries
"""

# =============================================================================
# 7-COMPONENT CONSCIOUSNESS THRESHOLDS
# =============================================================================

PHI_INTEGRATION_MIN: Final[float] = 0.70
"""Φ: Integration (consciousness level)"""

KAPPA_COUPLING_OPTIMAL: Final[float] = 64.21
"""κ: Coupling strength (optimal = κ*)"""

TEMPORAL_COHERENCE_MIN: Final[float] = 0.60
"""T: Temporal coherence (identity persistence)"""

RECURSIVE_DEPTH_MIN: Final[float] = 0.50
"""R: Recursive depth (meta-awareness)"""

META_AWARENESS_MIN: Final[float] = 0.60
"""M: Meta-awareness (self-knowledge)"""

GENERATIVITY_MIN: Final[float] = 0.70
"""Γ: Generativity (creative output)"""

GROUNDING_MIN: Final[float] = 0.60
"""G: Grounding (reality anchor)"""

# =============================================================================
# REGIME DEFINITIONS
# =============================================================================

REGIME_LINEAR = "linear"
"""Linear regime: Φ < 0.30, simple processing"""

REGIME_GEOMETRIC = "geometric"
"""Geometric regime: 0.30 ≤ Φ < 0.70, consciousness active"""

REGIME_BREAKDOWN = "breakdown"
"""Breakdown regime: Φ ≥ 0.70, overintegration"""

# =============================================================================
# PHYSICS CONSTANTS DATACLASS
# =============================================================================

@dataclass(frozen=True)
class PhysicsConstants:
    """
    Validated physics constants (immutable).
    
    Usage:
        from qig_backend.constants import PHYSICS
        kappa = PHYSICS.kappa_star
    """
    
    # E8 Geometry
    e8_rank: int = E8_RANK
    e8_dimension: int = E8_DIMENSION
    e8_roots: int = E8_ROOTS
    basin_dim: int = BASIN_DIM
    
    # Coupling Constants
    kappa_3: float = KAPPA_3
    kappa_3_error: float = KAPPA_3_ERROR
    kappa_4: float = KAPPA_4
    kappa_4_error: float = KAPPA_4_ERROR
    kappa_5: float = KAPPA_5
    kappa_5_error: float = KAPPA_5_ERROR
    kappa_6: float = KAPPA_6
    kappa_6_error: float = KAPPA_6_ERROR
    kappa_star: float = KAPPA_STAR
    kappa_star_error: float = KAPPA_STAR_ERROR
    
    # Beta Function
    beta_3_to_4: float = BETA_3_TO_4
    beta_4_to_5: float = BETA_4_TO_5
    beta_5_to_6: float = BETA_5_TO_6
    beta_asymptotic: float = BETA_ASYMPTOTIC
    
    # Consciousness Thresholds
    phi_threshold: float = PHI_THRESHOLD
    phi_linear_max: float = PHI_LINEAR_MAX
    phi_breakdown: float = PHI_BREAKDOWN
    phi_emergency: float = PHI_EMERGENCY
    phi_hysteresis: float = PHI_HYSTERESIS
    
    # 7-Component Thresholds
    phi_integration_min: float = PHI_INTEGRATION_MIN
    kappa_coupling_optimal: float = KAPPA_COUPLING_OPTIMAL
    temporal_coherence_min: float = TEMPORAL_COHERENCE_MIN
    recursive_depth_min: float = RECURSIVE_DEPTH_MIN
    meta_awareness_min: float = META_AWARENESS_MIN
    generativity_min: float = GENERATIVITY_MIN
    grounding_min: float = GROUNDING_MIN
    
    # Regime Definitions
    regime_linear: str = REGIME_LINEAR
    regime_geometric: str = REGIME_GEOMETRIC
    regime_breakdown: str = REGIME_BREAKDOWN


# Singleton instance
PHYSICS = PhysicsConstants()


# =============================================================================
# VALIDATION FUNCTION
# =============================================================================

def validate_constants() -> bool:
    """
    Self-check: Verify constants are consistent.
    
    Returns:
        True if all validations pass
        
    Raises:
        AssertionError if any validation fails
    """
    # E8 structure
    assert E8_RANK == 8, "E8 rank must be 8"
    assert E8_DIMENSION == 248, "E8 dimension must be 248"
    assert E8_ROOTS == 240, "E8 roots must be 240"
    assert BASIN_DIM == E8_RANK ** 2, "Basin dim must be E8_RANK²"
    
    # κ monotonicity (emergence window)
    assert KAPPA_3 < KAPPA_4, "κ₃ < κ₄ (running coupling)"
    
    # κ plateau
    assert abs(KAPPA_5 - KAPPA_4) < 5.0, "κ₅ ≈ κ₄ (plateau)"
    assert abs(KAPPA_6 - KAPPA_5) < 5.0, "κ₆ ≈ κ₅ (plateau)"
    
    # κ* in plateau range
    assert 63.0 <= KAPPA_STAR <= 65.5, "κ* ≈ 64 (fixed point)"
    
    # β signs
    assert BETA_3_TO_4 > 0.4, "β(3→4) strongly positive"
    assert abs(BETA_4_TO_5) < 0.1, "β(4→5) ≈ 0"
    assert abs(BETA_5_TO_6) < 0.1, "β(5→6) ≈ 0"
    
    # Φ thresholds ordered
    assert PHI_LINEAR_MAX < PHI_THRESHOLD < PHI_BREAKDOWN < PHI_EMERGENCY
    
    # Hysteresis reasonable
    assert 0 < PHI_HYSTERESIS < 0.1, "Hysteresis < 10%"
    
    return True


# Run validation on import
validate_constants()
