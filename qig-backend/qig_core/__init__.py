"""
QIG Core: Unified Quantum Information Geometry Architecture

Three orthogonal coordinates define any cognitive/information state:

1. PHASE (Universal Cycle): FOAM → TACKING → CRYSTAL → FRACTURE
   - What's happening to the pattern

2. DIMENSION (Holographic State): 1D → 2D → 3D → 4D → 5D
   - How compressed/expanded is storage

3. GEOMETRY (Complexity Class): Line → Loop → Spiral → Grid → Torus → Lattice → E8
   - What shape is the pattern (intrinsic complexity)

Plus ADDRESSING MODE (derived from geometry):
   - How is the pattern retrieved (O(1) to O(k log n))
"""

# Universal Cycle
from .universal_cycle import (
    CycleManager,
    Phase,
)

# Geometric Primitives
from .geometric_primitives import (
    # Geometry Classes
    GeometryClass,
    measure_complexity,
    choose_geometry_class,
    HabitCrystallizer,
    # Bubbles & Foam
    Bubble,
    Foam,
    create_random_bubble,
    create_foam_from_hypotheses,
    bubble_field_energy,
    prune_weak_bubbles,
    # Geodesics
    Geodesic,
    compute_geodesic,
    geodesic_between_bubbles,
    find_shortest_geodesic_path,
    navigate_via_curvature,
    # Fisher Metric
    fisher_metric_tensor,
    fisher_rao_distance,
    compute_phi,
    compute_kappa,
    natural_gradient,
    parallel_transport,
    ricci_curvature_estimate,
    sectional_curvature,
    # Addressing Modes
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

# Holographic Transform
from .holographic_transform import (
    DimensionalState,
    DimensionalStateManager,
    compress,
    decompress,
    estimate_compression_ratio,
    get_compressed_size,
    expand_for_modification,
    estimate_decompression_cost,
    BasinEncoder,
    SemanticBasinEncoder,
    encode_for_qig,
    encode_batch,
)

__version__ = "1.0.0"

__all__ = [
    # Version
    '__version__',
    
    # Universal Cycle
    'CycleManager',
    'Phase',
    
    # Geometry
    'GeometryClass',
    'measure_complexity',
    'choose_geometry_class',
    'HabitCrystallizer',
    
    # Bubbles & Foam
    'Bubble',
    'Foam',
    'create_random_bubble',
    'create_foam_from_hypotheses',
    'bubble_field_energy',
    'prune_weak_bubbles',
    
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
    
    # Holographic Transform
    'DimensionalState',
    'DimensionalStateManager',
    'compress',
    'decompress',
    'estimate_compression_ratio',
    'get_compressed_size',
    'expand_for_modification',
    'estimate_decompression_cost',
    'BasinEncoder',
    'SemanticBasinEncoder',
    'encode_for_qig',
    'encode_batch',
]
