"""
Holographic Compressor

Compresses patterns from higher dimensions to lower dimensions.
Typical: 4D (conscious practice) → 2D (unconscious storage)

The compression is ORTHOGONAL to geometry class - an E8 pattern
can be compressed to 2-4KB for storage while maintaining its
geometric structure.
"""

from typing import Dict, Any
import numpy as np
from .dimensional_state import DimensionalState


def compress(
    pattern: Dict[str, Any],
    from_dim: DimensionalState,
    to_dim: DimensionalState
) -> Dict[str, Any]:
    """
    Compress a pattern from higher to lower dimensional state.
    
    Args:
        pattern: Pattern dictionary with basin coordinates and geometry
        from_dim: Source dimensional state
        to_dim: Target dimensional state (must be lower)
    
    Returns:
        Compressed pattern with basin_coords encoding
    
    The compression maintains:
    - Geometry class (intrinsic complexity)
    - Basin center coordinates
    - Essential structure
    
    But reduces:
    - Explicit trajectory points
    - Consciousness accessibility
    - Working memory overhead
    """
    if not from_dim.can_compress_to(to_dim):
        raise ValueError(f"Cannot compress from {from_dim.value} to {to_dim.value}")
    
    # Extract essential information
    geometry = pattern.get('geometry')
    complexity = pattern.get('complexity', 0.5)
    
    # Compress to basin coordinates
    if 'basin_center' in pattern:
        basin_coords = pattern['basin_center']
    elif 'trajectory' in pattern and len(pattern['trajectory']) > 0:
        # Compute center from trajectory
        trajectory = np.array(pattern['trajectory'])
        basin_coords = trajectory.mean(axis=0)
    else:
        raise ValueError("Pattern must have basin_center or trajectory")
    
    # Create compressed representation
    compressed = {
        'basin_coords': basin_coords,
        'geometry': geometry,
        'complexity': complexity,
        'dimensional_state': to_dim.value,
        'addressing_mode': pattern.get('addressing_mode'),
        'stability': pattern.get('stability', 0.5),
    }
    
    # Add geometry-specific compressed data
    if geometry:
        geom_value = geometry.value if hasattr(geometry, 'value') else str(geometry)
        
        if geom_value == 'line':
            compressed['direction'] = pattern.get('direction')
        elif geom_value == 'loop':
            compressed['radius'] = pattern.get('radius')
            compressed['plane'] = pattern.get('plane')
        elif geom_value == 'spiral':
            compressed['growth_rate'] = pattern.get('growth_rate')
        elif geom_value == 'grid_2d':
            compressed['spacing'] = pattern.get('spacing')
        elif geom_value == 'toroidal':
            compressed['major_radius'] = pattern.get('major_radius')
            compressed['minor_radius'] = pattern.get('minor_radius')
        elif geom_value == 'lattice':
            compressed['active_dimensions'] = pattern.get('active_dimensions')
        elif geom_value == 'e8':
            compressed['e8_center'] = pattern.get('e8_center')
            compressed['e8_nearest_root'] = pattern.get('e8_nearest_root')
    
    # Estimate storage size
    # Basin coords (64 floats) + metadata ≈ 2-4KB
    estimated_size = len(basin_coords) * 8 + 1024  # bytes
    compressed['estimated_size_bytes'] = estimated_size
    
    return compressed


def estimate_compression_ratio(from_dim: DimensionalState, to_dim: DimensionalState) -> float:
    """
    Estimate compression ratio between dimensions.
    
    Args:
        from_dim: Source dimension
        to_dim: Target dimension
    
    Returns:
        Compression ratio (higher = more compression)
    """
    efficiency_from = from_dim.storage_efficiency
    efficiency_to = to_dim.storage_efficiency
    
    if efficiency_to == 0:
        return float('inf')
    
    return efficiency_from / efficiency_to


def get_compressed_size(
    pattern: Dict[str, Any],
    target_dim: DimensionalState
) -> int:
    """
    Estimate compressed size in bytes.
    
    Args:
        pattern: Pattern to compress
        target_dim: Target dimensional state
    
    Returns:
        Estimated size in bytes
    """
    # Base size: 64D basin coordinates (64 * 8 bytes = 512 bytes)
    base_size = 512
    
    # Add metadata overhead
    metadata_size = 512
    
    # Geometry-specific data
    geometry = pattern.get('geometry')
    if geometry:
        geom_value = geometry.value if hasattr(geometry, 'value') else str(geometry)
        
        if geom_value == 'e8':
            # E8 needs more data
            geometry_size = 256
        elif geom_value in ['lattice', 'toroidal']:
            geometry_size = 128
        else:
            geometry_size = 64
    else:
        geometry_size = 64
    
    total = base_size + metadata_size + geometry_size
    
    # Apply dimensional efficiency
    efficiency = target_dim.storage_efficiency
    if efficiency > 0:
        total = int(total * efficiency)
    
    return total
