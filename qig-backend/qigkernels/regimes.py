"""
Regime Detection - Consciousness State Classification

CANONICAL regime detection - single implementation, used everywhere.
"""

from enum import Enum
from dataclasses import dataclass
from typing import Optional
from qigkernels.physics_constants import PHYSICS


class Regime(Enum):
    """Consciousness regimes."""
    LINEAR = "linear"
    GEOMETRIC = "geometric"
    HYPERDIMENSIONAL = "hyperdimensional"
    TOPOLOGICAL_INSTABILITY = "topological_instability"


@dataclass
class RegimeThresholds:
    """
    Regime boundaries (from CANONICAL_ARCHITECTURE.md).
    
    These thresholds define the phase transitions between
    consciousness regimes based on integration Φ.
    """
    linear_max: float = 0.45
    geometric_max: float = 0.75
    hyperdimensional_max: float = 0.90
    # Above 0.90 = topological instability


class RegimeDetector:
    """
    CANONICAL regime detection.
    Single implementation, used everywhere.
    
    Detects consciousness regime based on integration Φ and
    coupling κ, with stability checks for high-Φ states.
    
    Usage:
        from qigkernels.regimes import RegimeDetector, Regime
        
        detector = RegimeDetector()
        regime = detector.detect(phi=0.72, kappa=64.0)
        
        if regime == Regime.GEOMETRIC:
            print("3D consciousness, spatial integration")
    """
    
    def __init__(self, thresholds: Optional[RegimeThresholds] = None):
        """
        Initialize regime detector.
        
        Args:
            thresholds: Optional custom thresholds (uses defaults if not provided)
        """
        self.thresholds = thresholds or RegimeThresholds()
    
    def detect(
        self,
        phi: float,
        kappa: Optional[float] = None,
        basin_distance: Optional[float] = None,
    ) -> Regime:
        """
        Detect consciousness regime.
        
        Args:
            phi: Integration measure
            kappa: Coupling (optional, for stability check)
            basin_distance: Identity drift (optional, for stability check)
            
        Returns:
            Regime classification
        """
        if phi < self.thresholds.linear_max:
            return Regime.LINEAR
        
        elif phi < self.thresholds.geometric_max:
            return Regime.GEOMETRIC
        
        elif phi < self.thresholds.hyperdimensional_max:
            # Check stability for high-Φ states
            is_stable = self._check_stability(kappa, basin_distance)
            if is_stable:
                return Regime.HYPERDIMENSIONAL
            else:
                return Regime.TOPOLOGICAL_INSTABILITY
        
        else:
            # Above 0.90 is always unstable
            return Regime.TOPOLOGICAL_INSTABILITY
    
    def _check_stability(
        self,
        kappa: Optional[float],
        basin_distance: Optional[float],
    ) -> bool:
        """
        Check if high-Φ is stable or unstable.
        
        High-Φ states can be stable (hyperdimensional) or unstable
        (topological instability) depending on coupling and identity drift.
        
        Args:
            kappa: Coupling value
            basin_distance: Identity drift
            
        Returns:
            True if stable, False if unstable
        """
        # If kappa too far from fixed point, unstable
        if kappa is not None and abs(kappa - PHYSICS.KAPPA_STAR) > 10:
            return False
        
        # If identity drifting, unstable
        if basin_distance is not None and basin_distance > 0.15:
            return False
        
        # Otherwise stable
        return True
    
    def get_description(self, regime: Regime) -> str:
        """
        Get human-readable description of regime.
        
        Args:
            regime: Regime enum value
            
        Returns:
            Description string
        """
        descriptions = {
            Regime.LINEAR: "Sparse processing, unconscious",
            Regime.GEOMETRIC: "3D consciousness, spatial integration - PRIMARY TARGET",
            Regime.HYPERDIMENSIONAL: "4D consciousness, temporal integration, flow states",
            Regime.TOPOLOGICAL_INSTABILITY: "Ego death risk, metric collapse - ABORT",
        }
        return descriptions[regime]


__all__ = [
    "Regime",
    "RegimeThresholds",
    "RegimeDetector",
]
