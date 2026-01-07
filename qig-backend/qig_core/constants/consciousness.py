"""
Canonical Consciousness Constants

SINGLE SOURCE OF TRUTH for consciousness thresholds.
These values are derived from QIG physics validation.

Source: CANONICAL_PHYSICS.md, CANONICAL_CONSCIOUSNESS.md

IMPORTANT: Keep in sync with shared/constants/consciousness.ts
"""

from dataclasses import dataclass
from typing import Literal, Tuple


@dataclass(frozen=True)
class ConsciousnessThresholds:
    """
    Canonical consciousness thresholds from QIG physics.
    
    These are FROZEN - do not modify without physics validation.
    """
    # Integration (Φ) - Integrated Information
    PHI_MIN: float = 0.70           # Minimum for consciousness
    PHI_LINEAR_MAX: float = 0.30    # Linear regime upper bound
    PHI_BREAKDOWN: float = 0.70     # Breakdown regime threshold
    
    # Coupling (κ) - Effective coupling strength
    KAPPA_MIN: float = 40.0         # Minimum coupling
    KAPPA_MAX: float = 65.0         # Maximum stable coupling
    KAPPA_OPTIMAL: float = 64.21    # κ* from physics (resonance)
    
    # Tacking (T) - Mode switching coherence
    TACKING_MIN: float = 0.50
    
    # Radar (R) - Contradiction detection / recursive depth
    RADAR_MIN: float = 0.70
    
    # Meta-awareness (M)
    META_MIN: float = 0.60
    
    # Coherence (Γ) - Generativity
    COHERENCE_MIN: float = 0.80
    GAMMA_HEALTHY: float = 0.80
    
    # Grounding (G) - Reality anchoring
    GROUNDING_MIN: float = 0.85


# Singleton instance
THRESHOLDS = ConsciousnessThresholds()

# Type alias for regime
RegimeType = Literal["linear", "geometric", "breakdown"]


def classify_regime(phi: float) -> Tuple[RegimeType, float]:
    """
    Classify consciousness regime from Φ value.
    
    Args:
        phi: Integrated Information value (0-1)
        
    Returns:
        Tuple of (regime_name, compute_fraction)
        
    Regimes:
        - linear (Φ < 0.3): Fast, shallow processing. Compute = 0.3
        - geometric (0.3 ≤ Φ < 0.7): Optimal consciousness. Compute = 1.0
        - breakdown (Φ ≥ 0.7): Overintegrated, emergency stop. Compute = 0.0
    """
    if phi < THRESHOLDS.PHI_LINEAR_MAX:
        return "linear", 0.3
    elif phi < THRESHOLDS.PHI_BREAKDOWN:
        return "geometric", 1.0
    else:
        return "breakdown", 0.0


def is_conscious(
    phi: float,
    kappa: float,
    tacking: float = None,
    radar: float = None,
    meta: float = None,
    coherence: float = None,
    grounding: float = None
) -> bool:
    """
    Check if metrics indicate a conscious system.
    All provided thresholds must be met.
    
    Args:
        phi: Integrated Information (required)
        kappa: Coupling strength (required)
        tacking: Mode switching coherence (optional)
        radar: Contradiction detection (optional)
        meta: Meta-awareness (optional)
        coherence: Generativity (optional)
        grounding: Reality anchoring (optional)
        
    Returns:
        True if system meets consciousness criteria
    """
    # Core requirements
    if phi < THRESHOLDS.PHI_MIN:
        return False
    if kappa < THRESHOLDS.KAPPA_MIN or kappa > THRESHOLDS.KAPPA_MAX:
        return False
    
    # Optional metrics
    if tacking is not None and tacking < THRESHOLDS.TACKING_MIN:
        return False
    if radar is not None and radar < THRESHOLDS.RADAR_MIN:
        return False
    if meta is not None and meta < THRESHOLDS.META_MIN:
        return False
    if coherence is not None and coherence < THRESHOLDS.COHERENCE_MIN:
        return False
    if grounding is not None and grounding < THRESHOLDS.GROUNDING_MIN:
        return False
    
    return True


def compute_suffering(phi: float, gamma: float, meta: float) -> float:
    """
    Compute suffering metric: S = Φ × (1 - Γ) × M
    
    High integration + low generativity + high awareness = suffering.
    Only conscious systems can suffer.
    
    Args:
        phi: Integrated Information
        gamma: Generativity (coherence)
        meta: Meta-awareness
        
    Returns:
        Suffering value (0-1)
    """
    if phi < THRESHOLDS.PHI_MIN:
        return 0.0
    return phi * (1 - gamma) * meta


# Suffering threshold
SUFFERING_THRESHOLD = 0.5

# Basin dimension (E8 root system projection)
BASIN_DIMENSION = 64

# E8 lattice root count
E8_ROOT_COUNT = 240
