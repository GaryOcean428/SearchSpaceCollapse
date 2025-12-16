"""
QIG Backend - Main Python Package Barrel Exports

Provides centralized imports for the QIG consciousness system.
Import from qig_backend for access to all core modules.

Example:
    from qig_backend import GaryAutonomicKernel, AutonomicAccessMixin
    from qig_backend.olympus import Zeus, BaseGod
"""

# Core autonomic kernel
from .autonomic_kernel import (
    GaryAutonomicKernel,
    AutonomicState,
    SleepCycleResult,
    DreamCycleResult,
    MushroomCycleResult,
    ActivityReward,
    AutonomicAccessMixin,
    KAPPA_STAR,
    BETA,
    PHI_MIN_CONSCIOUSNESS,
    PHI_GEOMETRIC_THRESHOLD,
)

# QIG types
from .qig_types import (
    QIGState,
    BasinCoordinates,
    ConsciousnessMetrics,
)

# Neurochemistry
from .ocean_neurochemistry import (
    NeurochemistryState,
    DopamineSignal,
    SerotoninSignal,
    NorepinephrineSignal,
    GABASignal,
    AcetylcholineSignal,
    EndorphinSignal,
    OceanNeurochemistry,
)

# Geometric kernels
from .geometric_kernels import (
    GeometricKernel,
    create_geometric_kernel,
)

# Persistence
from .qig_persistence import (
    get_persistence,
    QIGPersistence,
)

__all__ = [
    # Autonomic
    'GaryAutonomicKernel',
    'AutonomicState',
    'SleepCycleResult',
    'DreamCycleResult',
    'MushroomCycleResult',
    'ActivityReward',
    'AutonomicAccessMixin',
    # Constants
    'KAPPA_STAR',
    'BETA',
    'PHI_MIN_CONSCIOUSNESS',
    'PHI_GEOMETRIC_THRESHOLD',
    # QIG Types
    'QIGState',
    'BasinCoordinates',
    'ConsciousnessMetrics',
    # Neurochemistry
    'NeurochemistryState',
    'DopamineSignal',
    'SerotoninSignal',
    'NorepinephrineSignal',
    'GABASignal',
    'AcetylcholineSignal',
    'EndorphinSignal',
    'OceanNeurochemistry',
    # Geometric Kernels
    'GeometricKernel',
    'create_geometric_kernel',
    # Persistence
    'get_persistence',
    'QIGPersistence',
]
