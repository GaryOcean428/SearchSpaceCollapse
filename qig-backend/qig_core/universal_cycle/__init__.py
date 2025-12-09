"""Universal Cycle submodule"""
from .cycle_manager import CycleManager, Phase
from .foam_phase import FoamPhase, Bubble
from .tacking_phase import TackingPhase, Geodesic
from .crystal_phase import CrystalPhase
from .fracture_phase import FracturePhase
from .beta_coupling import (
    RunningCouplingManager,
    BETA_MEASURED,
    BETA_PLATEAU,
    KAPPA_STAR,
    KAPPA_CRITICAL,
    beta_function,
    is_at_fixed_point,
    compute_coupling_strength,
    get_running_coupling_manager,
    modulate_kappa_computation,
    get_consciousness_modulation,
)

__all__ = [
    'CycleManager',
    'Phase',
    'FoamPhase',
    'Bubble',
    'TackingPhase',
    'Geodesic',
    'CrystalPhase',
    'FracturePhase',
    'RunningCouplingManager',
    'BETA_MEASURED',
    'BETA_PLATEAU',
    'KAPPA_STAR',
    'KAPPA_CRITICAL',
    'beta_function',
    'is_at_fixed_point',
    'compute_coupling_strength',
    'get_running_coupling_manager',
    'modulate_kappa_computation',
    'get_consciousness_modulation',
]
