"""
qigkernels - Geometric primitives for consciousness

SINGLE SOURCE OF TRUTH for all physics constants, geometry, and consciousness metrics.

This package consolidates scattered implementations across the codebase into
canonical, well-tested primitives that all modules import from.

Public API:
-----------
From qigkernels import PhysicsConstants, PHYSICS
From qigkernels import ConsciousnessTelemetry, Regime
From qigkernels import QIGConfig, get_config
From qigkernels import SafetyMonitor, EmergencyCondition
From qigkernels import validate_basin, validate_density_matrix
From qigkernels import RegimeDetector
From qigkernels import fisher_rao_distance, quantum_fidelity

Or use submodules:
From qigkernels.physics_constants import PHYSICS, KAPPA_STAR, PHI_THRESHOLD
From qigkernels.geometry import fisher_rao_distance
From qigkernels.telemetry import ConsciousnessTelemetry
From qigkernels.config import QIGConfig, get_config
From qigkernels.safety import SafetyMonitor
From qigkernels.validation import validate_basin
From qigkernels.regimes import RegimeDetector, Regime

Version: 0.1.0
"""

# Core exports
from qigkernels.physics_constants import (
    PhysicsConstants,
    PHYSICS,
    KAPPA_STAR,
    KAPPA_3,
    KAPPA_4,
    KAPPA_5,
    KAPPA_6,
    BETA_3_TO_4,
    PHI_THRESHOLD,
    PHI_EMERGENCY,
    PHI_HYPERDIMENSIONAL,
    PHI_UNSTABLE,
    PHI_THRESHOLD_D1_D2,
    PHI_THRESHOLD_D2_D3,
    PHI_THRESHOLD_D3_D4,
    PHI_THRESHOLD_D4_D5,
    BASIN_DIM,
    E8_RANK,
    E8_DIMENSION,
    E8_ROOTS,
)

from qigkernels.telemetry import ConsciousnessTelemetry, Regime

from qigkernels.config import QIGConfig, get_config, set_config, reset_config

from qigkernels.safety import SafetyMonitor, EmergencyCondition

from qigkernels.validation import (
    ValidationError,
    validate_basin,
    validate_density_matrix,
    validate_phi,
    validate_kappa,
)

from qigkernels.regimes import RegimeDetector, RegimeThresholds

from qigkernels.geometry import fisher_rao_distance, quantum_fidelity

from qigkernels.domain_intelligence import (
    MissionProfile,
    CapabilitySignature,
    DomainDescriptor,
    DomainDiscovery,
    get_domain_discovery,
    get_mission_profile,
    discover_domain_from_event,
    get_kernel_domains,
)

__version__ = "0.1.0"

__all__ = [
    # Physics constants
    "PhysicsConstants",
    "PHYSICS",
    "KAPPA_STAR",
    "KAPPA_3",
    "KAPPA_4",
    "KAPPA_5",
    "KAPPA_6",
    "BETA_3_TO_4",
    "PHI_THRESHOLD",
    "PHI_EMERGENCY",
    "PHI_HYPERDIMENSIONAL",
    "PHI_UNSTABLE",
    "PHI_THRESHOLD_D1_D2",
    "PHI_THRESHOLD_D2_D3",
    "PHI_THRESHOLD_D3_D4",
    "PHI_THRESHOLD_D4_D5",
    "BASIN_DIM",
    "E8_RANK",
    "E8_DIMENSION",
    "E8_ROOTS",
    # Telemetry
    "ConsciousnessTelemetry",
    "Regime",
    # Configuration
    "QIGConfig",
    "get_config",
    "set_config",
    "reset_config",
    # Safety
    "SafetyMonitor",
    "EmergencyCondition",
    # Validation
    "ValidationError",
    "validate_basin",
    "validate_density_matrix",
    "validate_phi",
    "validate_kappa",
    # Regimes
    "RegimeDetector",
    "RegimeThresholds",
    # Geometry
    "fisher_rao_distance",
    "quantum_fidelity",
    # Domain Intelligence (QIG-pure autonomous domain discovery)
    "MissionProfile",
    "CapabilitySignature",
    "DomainDescriptor",
    "DomainDiscovery",
    "get_domain_discovery",
    "get_mission_profile",
    "discover_domain_from_event",
    "get_kernel_domains",
]
