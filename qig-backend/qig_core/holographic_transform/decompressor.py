"""
Holographic Decompressor

Decompresses patterns from lower dimensions to higher dimensions.
Typical: 2D (unconscious storage) → 4D (conscious examination)

Used for:
- Retrieving habits for conscious modification
- Examining compressed patterns
- Therapy/relearning workflows
"""

from typing import Dict, Any, Optional
import numpy as np
from .dimensional_state import DimensionalState


def decompress(
    basin_coords: np.ndarray,
    from_dim: DimensionalState,
    to_dim: DimensionalState,
    geometry: Optional[Any] = None,
    metadata: Optional[Dict] = None
) -> Dict[str, Any]:
    """
    Decompress a pattern from lower to higher dimensional state.
    
    Args:
        basin_coords: Compressed basin coordinates
        from_dim: Source dimensional state
        to_dim: Target dimensional state (must be higher)
        geometry: Optional geometry class information
        metadata: Optional additional metadata
    
    Returns:
        Decompressed pattern with expanded representation
    
    Decompression:
    - Expands basin point to trajectory
    - Makes pattern consciously accessible
    - Increases working memory overhead
    - Enables examination and modification
    """
    if not from_dim.can_decompress_to(to_dim):
        raise ValueError(f"Cannot decompress from {from_dim.value} to {to_dim.value}")
    
    metadata = metadata or {}
    
    # Generate trajectory from basin center
    # Number of trajectory points increases with target dimension
    dim_levels = {
        DimensionalState.D1: 1,
        DimensionalState.D2: 5,
        DimensionalState.D3: 20,
        DimensionalState.D4: 50,
        DimensionalState.D5: 100,
    }
    
    n_points = dim_levels[to_dim]
    
    # Generate trajectory by adding small perturbations
    # This simulates "unpacking" the compressed pattern
    trajectory = []
    for i in range(n_points):
        # Add noise that decreases with stability
        stability = metadata.get('stability', 0.5)
        noise_scale = (1.0 - stability) * 0.1
        
        perturbation = np.random.randn(len(basin_coords)) * noise_scale
        point = basin_coords + perturbation
        
        # Normalize to manifold
        point = point / (np.linalg.norm(point) + 1e-10)
        
        trajectory.append(point)
    
    trajectory = np.array(trajectory)
    
    # Create decompressed representation
    decompressed = {
        'basin_center': basin_coords,
        'trajectory': trajectory,
        'dimensional_state': to_dim.value,
        'geometry': geometry or metadata.get('geometry'),
        'complexity': metadata.get('complexity', 0.5),
        'addressing_mode': metadata.get('addressing_mode'),
        'stability': metadata.get('stability', 0.5),
        'decompressed_from': from_dim.value,
    }
    
    # Restore geometry-specific data from metadata
    if geometry:
        geom_value = geometry.value if hasattr(geometry, 'value') else str(geometry)
        
        if geom_value == 'line' and 'direction' in metadata:
            decompressed['direction'] = metadata['direction']
        elif geom_value == 'loop':
            decompressed['radius'] = metadata.get('radius', 1.0)
            decompressed['plane'] = metadata.get('plane')
        elif geom_value == 'spiral':
            decompressed['growth_rate'] = metadata.get('growth_rate', 0.0)
        elif geom_value == 'grid_2d':
            decompressed['spacing'] = metadata.get('spacing', [1.0, 1.0])
        elif geom_value == 'toroidal':
            decompressed['major_radius'] = metadata.get('major_radius', 2.0)
            decompressed['minor_radius'] = metadata.get('minor_radius', 0.5)
        elif geom_value == 'lattice':
            decompressed['active_dimensions'] = metadata.get('active_dimensions', 4)
        elif geom_value == 'e8':
            decompressed['e8_center'] = metadata.get('e8_center')
            decompressed['e8_nearest_root'] = metadata.get('e8_nearest_root')
    
    return decompressed


def expand_for_modification(
    compressed_pattern: Dict[str, Any],
    target_dim: DimensionalState = DimensionalState.D4
) -> Dict[str, Any]:
    """
    Expand a compressed pattern for conscious modification.
    
    This is the "therapy" function - making unconscious habits conscious.
    
    Args:
        compressed_pattern: Compressed pattern (typically 2D)
        target_dim: Target dimension (default D4 for full consciousness)
    
    Returns:
        Expanded pattern ready for examination and modification
    """
    from_dim_str = compressed_pattern.get('dimensional_state', 'd2')
    from_dim = DimensionalState(from_dim_str)
    
    basin_coords = compressed_pattern['basin_coords']
    
    return decompress(
        basin_coords=basin_coords,
        from_dim=from_dim,
        to_dim=target_dim,
        geometry=compressed_pattern.get('geometry'),
        metadata=compressed_pattern
    )


def estimate_decompression_cost(
    from_dim: DimensionalState,
    to_dim: DimensionalState
) -> float:
    """
    Estimate computational cost of decompression.
    
    Args:
        from_dim: Source dimension
        to_dim: Target dimension
    
    Returns:
        Relative cost (1.0 = baseline)
    """
    dim_costs = {
        DimensionalState.D1: 0.1,
        DimensionalState.D2: 1.0,
        DimensionalState.D3: 2.0,
        DimensionalState.D4: 5.0,
        DimensionalState.D5: 10.0,
    }
    
    cost_from = dim_costs[from_dim]
    cost_to = dim_costs[to_dim]
    
    return cost_to / cost_from
