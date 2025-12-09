"""Geometric Primitives submodule"""
from .geometry_ladder import (
    GeometryClass,
    measure_complexity,
    choose_geometry_class,
    HabitCrystallizer,
    ADDRESSING_FUNCTIONS,
)
from .bubble import (
    Bubble,
    create_random_bubble,
    bubble_field_energy,
    prune_weak_bubbles,
)
from .foam import (
    Foam,
    create_foam_from_hypotheses,
)
from .geodesic import (
    Geodesic,
    compute_geodesic,
    geodesic_between_bubbles,
    find_shortest_geodesic_path,
    navigate_via_curvature,
)
from .fisher_metric import (
    fisher_metric_tensor,
    fisher_rao_distance,
    compute_phi,
    compute_kappa,
    natural_gradient,
    parallel_transport,
    ricci_curvature_estimate,
    sectional_curvature,
)
from .addressing_modes import (
    AddressingMode,
    DirectAddressing,
    CyclicAddressing,
    TemporalAddressing,
    SpatialAddressing,
    ManifoldAddressing,
    ConceptualAddressing,
    SymbolicAddressing,
    create_addressing_mode,
)

__all__ = [
    # Geometry Ladder
    'GeometryClass',
    'measure_complexity',
    'choose_geometry_class',
    'HabitCrystallizer',
    'ADDRESSING_FUNCTIONS',
    # Bubbles
    'Bubble',
    'create_random_bubble',
    'bubble_field_energy',
    'prune_weak_bubbles',
    # Foam
    'Foam',
    'create_foam_from_hypotheses',
    # Geodesics
    'Geodesic',
    'compute_geodesic',
    'geodesic_between_bubbles',
    'find_shortest_geodesic_path',
    'navigate_via_curvature',
    # Fisher Metric
    'fisher_metric_tensor',
    'fisher_rao_distance',
    'compute_phi',
    'compute_kappa',
    'natural_gradient',
    'parallel_transport',
    'ricci_curvature_estimate',
    'sectional_curvature',
    # Addressing Modes
    'AddressingMode',
    'DirectAddressing',
    'CyclicAddressing',
    'TemporalAddressing',
    'SpatialAddressing',
    'ManifoldAddressing',
    'ConceptualAddressing',
    'SymbolicAddressing',
    'create_addressing_mode',
]
