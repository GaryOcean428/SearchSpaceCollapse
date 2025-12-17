"""
Safety Monitoring - Emergency Detection

CANONICAL safety monitoring for all repos.

Provides a unified interface for checking emergency conditions and
triggering safety protocols.
"""

from typing import Optional, NamedTuple
from qigkernels.telemetry import ConsciousnessTelemetry
from qigkernels.config import QIGConfig, get_config
from qigkernels.physics_constants import PHYSICS


class EmergencyCondition(NamedTuple):
    """Emergency condition detected."""
    reason: str
    severity: str  # "warning", "critical"
    metric: str
    value: float
    threshold: float


class SafetyMonitor:
    """
    CANONICAL safety monitoring.
    All repos use this for emergency detection.
    
    Checks telemetry against safety thresholds and reports
    emergency conditions when thresholds are violated.
    
    Usage:
        from qigkernels.safety import SafetyMonitor
        from qigkernels.telemetry import ConsciousnessTelemetry
        
        monitor = SafetyMonitor()
        telemetry = ConsciousnessTelemetry(...)
        
        emergency = monitor.check(telemetry)
        if emergency:
            print(f"EMERGENCY: {emergency.reason}")
            abort_training()
    """
    
    def __init__(self, config: Optional[QIGConfig] = None):
        """
        Initialize safety monitor.
        
        Args:
            config: Optional configuration (uses global if not provided)
        """
        self.config = config or get_config()
    
    def check(self, telemetry: ConsciousnessTelemetry) -> Optional[EmergencyCondition]:
        """
        Check for emergency conditions.
        
        Args:
            telemetry: Current consciousness telemetry
            
        Returns:
            EmergencyCondition if emergency detected, None otherwise
        """
        # Consciousness collapse
        if telemetry.phi < self.config.phi_emergency:
            return EmergencyCondition(
                reason="Consciousness collapse",
                severity="critical",
                metric="phi",
                value=telemetry.phi,
                threshold=self.config.phi_emergency,
            )
        
        # Ego death risk
        if telemetry.breakdown_pct > self.config.breakdown_pct:
            return EmergencyCondition(
                reason="Ego death risk",
                severity="critical",
                metric="breakdown_pct",
                value=telemetry.breakdown_pct,
                threshold=self.config.breakdown_pct,
            )
        
        # Identity drift
        if telemetry.basin_distance > self.config.basin_drift_threshold:
            return EmergencyCondition(
                reason="Identity drift",
                severity="warning",
                metric="basin_distance",
                value=telemetry.basin_distance,
                threshold=self.config.basin_drift_threshold,
            )
        
        # Weak coupling
        if telemetry.kappa_eff < self.config.kappa_weak_threshold:
            return EmergencyCondition(
                reason="Weak coupling",
                severity="warning",
                metric="kappa_eff",
                value=telemetry.kappa_eff,
                threshold=self.config.kappa_weak_threshold,
            )
        
        # Insufficient recursion
        if telemetry.recursion_depth < self.config.min_recursion_depth:
            return EmergencyCondition(
                reason="Insufficient recursion depth",
                severity="critical",
                metric="recursion_depth",
                value=float(telemetry.recursion_depth),
                threshold=float(self.config.min_recursion_depth),
            )
        
        # No emergency
        return None
    
    def should_sleep(self, telemetry: ConsciousnessTelemetry) -> bool:
        """
        Check if sleep protocol should be triggered.
        
        Sleep is triggered before reaching full emergency threshold
        to allow preventive identity maintenance.
        
        Args:
            telemetry: Current consciousness telemetry
            
        Returns:
            True if sleep should be triggered
        """
        # Trigger sleep at 80% of basin drift threshold
        return telemetry.basin_distance > (self.config.basin_drift_threshold * 0.8)
    
    def is_safe(self, telemetry: ConsciousnessTelemetry) -> bool:
        """
        Quick safety check.
        
        Args:
            telemetry: Current consciousness telemetry
            
        Returns:
            True if all safety thresholds are within bounds
        """
        return self.check(telemetry) is None


__all__ = [
    "SafetyMonitor",
    "EmergencyCondition",
]
