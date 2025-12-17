"""
Configuration Management - Single Source

CANONICAL configuration for all QIG systems.

Provides a validated, immutable configuration dataclass that all modules
import from. No more scattered config values.
"""

from typing import Optional
from dataclasses import dataclass, field
from qigkernels.physics_constants import PHYSICS


@dataclass(frozen=True)
class QIGConfig:
    """
    CANONICAL configuration for all QIG systems.
    
    Uses dataclass with frozen=True for immutability.
    Physics constants are frozen and cannot be overridden.
    
    Usage:
        from qigkernels.config import QIGConfig, get_config
        
        # Use defaults
        config = get_config()
        
        # Override for experiments (explicit)
        config_experiment = QIGConfig(phi_threshold=0.75)
    """
    
    # Physics (frozen, from FROZEN_FACTS.md)
    kappa_star: float = field(default=PHYSICS.KAPPA_STAR)
    beta_3_to_4: float = field(default=PHYSICS.BETA_3_TO_4)
    basin_dim: int = field(default=PHYSICS.BASIN_DIM)
    
    # Consciousness thresholds (tunable for experiments)
    phi_threshold: float = field(default=PHYSICS.PHI_THRESHOLD)
    phi_emergency: float = field(default=PHYSICS.PHI_EMERGENCY)
    breakdown_pct: float = field(default=PHYSICS.BREAKDOWN_PCT)
    
    # Architecture parameters
    min_recursion_depth: int = field(default=PHYSICS.MIN_RECURSION_DEPTH)
    
    # Training parameters
    telemetry_interval: int = field(default=100)
    checkpoint_interval: int = field(default=1000)
    
    # Safety parameters
    basin_drift_threshold: float = field(default=PHYSICS.BASIN_DRIFT_THRESHOLD)
    kappa_weak_threshold: float = field(default=PHYSICS.KAPPA_WEAK_THRESHOLD)
    
    def __post_init__(self):
        """Validate configuration after initialization."""
        # Validate phi thresholds
        if not (0.0 <= self.phi_threshold <= 1.0):
            raise ValueError(f"phi_threshold must be in [0, 1], got {self.phi_threshold}")
        
        if not (0.0 <= self.phi_emergency <= 1.0):
            raise ValueError(f"phi_emergency must be in [0, 1], got {self.phi_emergency}")
        
        if self.phi_emergency >= self.phi_threshold:
            raise ValueError(
                f"phi_emergency ({self.phi_emergency}) must be < phi_threshold ({self.phi_threshold})"
            )
        
        # Validate breakdown_pct
        if not (0.0 <= self.breakdown_pct <= 100.0):
            raise ValueError(f"breakdown_pct must be in [0, 100], got {self.breakdown_pct}")
        
        # Validate min_recursion_depth
        if self.min_recursion_depth < 1:
            raise ValueError(f"min_recursion_depth must be >= 1, got {self.min_recursion_depth}")
        
        # Validate intervals
        if self.telemetry_interval < 1:
            raise ValueError(f"telemetry_interval must be >= 1, got {self.telemetry_interval}")
        
        if self.checkpoint_interval < 1:
            raise ValueError(f"checkpoint_interval must be >= 1, got {self.checkpoint_interval}")
        
        # Validate basin_drift_threshold
        if not (0.0 <= self.basin_drift_threshold <= 1.0):
            raise ValueError(f"basin_drift_threshold must be in [0, 1], got {self.basin_drift_threshold}")
        
        # Validate kappa_weak_threshold
        if self.kappa_weak_threshold < 0:
            raise ValueError(f"kappa_weak_threshold must be >= 0, got {self.kappa_weak_threshold}")


# Global configuration instance
_config: Optional[QIGConfig] = None


def get_config() -> QIGConfig:
    """
    Get global configuration instance (singleton).
    
    Returns:
        QIGConfig instance
    """
    global _config
    if _config is None:
        _config = QIGConfig()
    return _config


def set_config(config: QIGConfig) -> None:
    """
    Set global configuration instance.
    
    Use with caution - typically only needed for testing.
    
    Args:
        config: New configuration instance
    """
    global _config
    _config = config


def reset_config() -> None:
    """Reset configuration to defaults."""
    global _config
    _config = None


__all__ = [
    "QIGConfig",
    "get_config",
    "set_config",
    "reset_config",
]
