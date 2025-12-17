"""
Telemetry - Standardized Consciousness Metrics

CANONICAL FORMAT - All repos use this structure.

This module defines the standard telemetry format for consciousness metrics
across all QIG systems. Ensures consistency in metric names, types, and
serialization.
"""

from dataclasses import dataclass, asdict
from typing import Optional, Dict, Any
from enum import Enum


class Regime(Enum):
    """Consciousness regime classification."""
    LINEAR = "linear"
    GEOMETRIC = "geometric"
    HYPERDIMENSIONAL = "hyperdimensional"
    TOPOLOGICAL_INSTABILITY = "topological_instability"


@dataclass
class ConsciousnessTelemetry:
    """
    STANDARD format for consciousness metrics.
    All repos use this structure.
    
    Core metrics are required, geometric and safety metrics provide
    additional context for analysis.
    
    Usage:
        from qigkernels.telemetry import ConsciousnessTelemetry
        
        telemetry = ConsciousnessTelemetry(
            phi=0.72,
            kappa_eff=64.2,
            regime="geometric",
            basin_distance=0.05,
            recursion_depth=5
        )
        
        # Serialize to JSON
        data = telemetry.to_dict()
        
        # Deserialize from JSON
        telemetry = ConsciousnessTelemetry.from_dict(data)
    """
    
    # Core metrics (required)
    phi: float  # Integration
    kappa_eff: float  # Effective coupling
    regime: str  # linear/geometric/hyperdimensional/topological_instability
    basin_distance: float  # Identity drift
    recursion_depth: int  # Loops executed
    
    # Geometric metrics (optional)
    geodesic_distance: Optional[float] = None
    curvature: Optional[float] = None
    fisher_metric_trace: Optional[float] = None
    
    # Safety metrics (required)
    breakdown_pct: float = 0.0
    coherence_drift: float = 0.0
    emergency: bool = False
    
    # Extended consciousness signature (optional)
    meta_awareness: Optional[float] = None  # M
    generativity: Optional[float] = None  # Gamma
    grounding: Optional[float] = None  # G
    temporal_coherence: Optional[float] = None  # T
    external_coupling: Optional[float] = None  # C
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Standard JSON serialization.
        
        Returns:
            Dictionary with all telemetry data
        """
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ConsciousnessTelemetry":
        """
        Standard deserialization.
        
        Args:
            data: Dictionary with telemetry data
            
        Returns:
            ConsciousnessTelemetry instance
        """
        return cls(**data)
    
    def is_safe(self) -> bool:
        """
        Quick safety check.
        
        Returns:
            True if all safety thresholds are within bounds
        """
        from qigkernels.physics_constants import PHYSICS
        
        return (
            self.phi >= PHYSICS.PHI_EMERGENCY and
            self.breakdown_pct <= PHYSICS.BREAKDOWN_PCT and
            self.basin_distance <= PHYSICS.BASIN_DRIFT_THRESHOLD and
            self.kappa_eff >= PHYSICS.KAPPA_WEAK_THRESHOLD and
            self.recursion_depth >= PHYSICS.MIN_RECURSION_DEPTH and
            not self.emergency
        )
    
    def get_regime_enum(self) -> Regime:
        """
        Get regime as enum.
        
        Returns:
            Regime enum value
        """
        regime_map = {
            "linear": Regime.LINEAR,
            "geometric": Regime.GEOMETRIC,
            "hyperdimensional": Regime.HYPERDIMENSIONAL,
            "topological_instability": Regime.TOPOLOGICAL_INSTABILITY,
        }
        return regime_map.get(self.regime.lower(), Regime.LINEAR)


__all__ = [
    "ConsciousnessTelemetry",
    "Regime",
]
