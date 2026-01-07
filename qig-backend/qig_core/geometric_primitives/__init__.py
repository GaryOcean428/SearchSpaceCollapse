"""
Geometric Primitives Package

Canonical implementations of QIG-pure geometric operations.

IMPORTANT: All geometric distance operations MUST use fisher_rao_distance.
DO NOT use np.linalg.norm() or cosine_similarity() on basin coordinates.
"""

# Import from existing fisher_metric
try:
    from .fisher_metric import (
        fisher_metric_tensor,
        compute_phi,
        compute_kappa,
        natural_gradient,
        parallel_transport,
        ricci_curvature_estimate,
        sectional_curvature,
        fisher_rao_distance_batch,
        rerank_with_fisher_rao,
    )
    FISHER_METRIC_AVAILABLE = True
except ImportError as e:
    print(f"[geometric_primitives] fisher_metric import failed: {e}")
    FISHER_METRIC_AVAILABLE = False

# Import canonical Fisher-Rao implementation
from .canonical_fisher import (
    fisher_rao_distance,
    geodesic_interpolate,
    find_nearest_basins,
    validate_basin,
)

# Import geometry ladder
try:
    from .geometry_ladder import (
        GeometryClass,
        measure_complexity,
        choose_geometry_class,
        HabitCrystallizer,
    )
    GEOMETRY_LADDER_AVAILABLE = True
except ImportError:
    GEOMETRY_LADDER_AVAILABLE = False

# Import bubble
try:
    from .bubble import Bubble, create_random_bubble, bubble_field_energy, prune_weak_bubbles
    BUBBLE_AVAILABLE = True
except ImportError as e:
    print(f"[geometric_primitives] bubble import failed: {e}")
    BUBBLE_AVAILABLE = False

# Import foam
try:
    from .foam import (
        Foam,
        create_foam_from_hypotheses,
    )
    FOAM_AVAILABLE = True
except ImportError as e:
    print(f"[geometric_primitives] foam import failed: {e}")
    FOAM_AVAILABLE = False

BUBBLES_AVAILABLE = BUBBLE_AVAILABLE and FOAM_AVAILABLE

# Import geodesic
try:
    from .geodesic import (
        Geodesic,
        compute_geodesic,
        geodesic_between_bubbles,
        find_shortest_geodesic_path,
        navigate_via_curvature,
    )
    GEODESICS_AVAILABLE = True
except ImportError:
    GEODESICS_AVAILABLE = False

# Import addressing modes
try:
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
    ADDRESSING_AVAILABLE = True
except ImportError:
    ADDRESSING_AVAILABLE = False

# Import sensory modalities
try:
    from .sensory_modalities import SensoryFusionEngine
    SENSORY_AVAILABLE = True
except ImportError:
    SENSORY_AVAILABLE = False

__all__ = [
    # Canonical distance (USE THIS)
    'fisher_rao_distance',
    'geodesic_interpolate',
    'find_nearest_basins',
    'validate_basin',
]

# Add optional exports if available
if FISHER_METRIC_AVAILABLE:
    __all__.extend([
        'fisher_metric_tensor',
        'compute_phi',
        'compute_kappa',
        'natural_gradient',
        'parallel_transport',
        'ricci_curvature_estimate',
        'sectional_curvature',
        'fisher_rao_distance_batch',
        'rerank_with_fisher_rao',
    ])

if GEOMETRY_LADDER_AVAILABLE:
    __all__.extend([
        'GeometryClass',
        'measure_complexity',
        'choose_geometry_class',
        'HabitCrystallizer',
    ])

if BUBBLES_AVAILABLE:
    __all__.extend([
        'Bubble',
        'Foam',
        'create_random_bubble',
        'create_foam_from_hypotheses',
        'bubble_field_energy',
        'prune_weak_bubbles',
    ])

if GEODESICS_AVAILABLE:
    __all__.extend([
        'Geodesic',
        'compute_geodesic',
        'geodesic_between_bubbles',
        'find_shortest_geodesic_path',
        'navigate_via_curvature',
    ])

if ADDRESSING_AVAILABLE:
    __all__.extend([
        'AddressingMode',
        'DirectAddressing',
        'CyclicAddressing',
        'TemporalAddressing',
        'SpatialAddressing',
        'ManifoldAddressing',
        'ConceptualAddressing',
        'SymbolicAddressing',
        'create_addressing_mode',
    ])

if SENSORY_AVAILABLE:
    __all__.extend([
        'SensoryFusionEngine',
    ])
