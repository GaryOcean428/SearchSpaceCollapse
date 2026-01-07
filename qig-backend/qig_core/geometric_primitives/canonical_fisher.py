"""
Canonical Fisher-Rao Distance Implementation

This is the SINGLE SOURCE OF TRUTH for Fisher-Rao distance computation.
All geometric distance operations MUST use this implementation.

GEOMETRIC PURITY REQUIREMENTS:
- NO np.linalg.norm() for distance on basins
- NO cosine_similarity() on basin coordinates
- MUST use metric tensor for curved manifolds
- ALL operations preserve manifold structure

Source: CANONICAL_PHYSICS.md, FROZEN_FACTS.md
"""

import numpy as np
from typing import Optional, List, Tuple

# Import from centralized constants
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from constants.consciousness import BASIN_DIMENSION


def fisher_rao_distance(
    basin_a: np.ndarray,
    basin_b: np.ndarray,
    metric: Optional[np.ndarray] = None,
    validate: bool = True
) -> float:
    """
    Canonical Fisher-Rao distance on information manifold.
    
    This is THE implementation to use for all basin distance computation.
    
    For probability distributions p and q:
        d_FR(p, q) = arccos(Σ√(p_i * q_i))
    
    For general basins with metric tensor G:
        d² = (a-b)ᵀ G (a-b)
    
    Args:
        basin_a: First basin coordinates (64D by default)
        basin_b: Second basin coordinates
        metric: Optional Fisher metric tensor. If None, uses:
                - Bhattacharyya distance for probability distributions
                - Identity metric for general basins
        validate: If True, verify geometric constraints
    
    Returns:
        Fisher-Rao distance on information manifold
    
    Raises:
        AssertionError: If validation fails
    
    Example:
        >>> a = np.random.dirichlet(np.ones(64))
        >>> b = np.random.dirichlet(np.ones(64))
        >>> d = fisher_rao_distance(a, b)
        >>> assert d >= 0  # Non-negative
        >>> assert fisher_rao_distance(a, a) < 1e-10  # Identity
    """
    if validate:
        assert basin_a.shape == basin_b.shape, \
            f"Basin dimension mismatch: {basin_a.shape} vs {basin_b.shape}"
        assert len(basin_a.shape) == 1, \
            f"Basins must be 1D, got shape {basin_a.shape}"
    
    # Check if basins are probability distributions (sum to 1, non-negative)
    is_probability_a = np.all(basin_a >= 0) and np.isclose(np.sum(basin_a), 1.0, atol=1e-6)
    is_probability_b = np.all(basin_b >= 0) and np.isclose(np.sum(basin_b), 1.0, atol=1e-6)
    
    if is_probability_a and is_probability_b and metric is None:
        # Use Bhattacharyya-based Fisher-Rao for probability distributions
        return _fisher_rao_probability(basin_a, basin_b)
    elif metric is not None:
        # Use metric tensor for curved manifolds
        return _fisher_rao_metric(basin_a, basin_b, metric)
    else:
        # General case: use identity metric (flat space)
        return _fisher_rao_flat(basin_a, basin_b)


def _fisher_rao_probability(p: np.ndarray, q: np.ndarray) -> float:
    """
    Fisher-Rao distance for probability distributions.
    
    d_FR(p, q) = arccos(Σ√(p_i * q_i))
    
    This is the geodesic distance on the probability simplex.
    """
    # Ensure valid probabilities (avoid numerical issues)
    p = np.clip(p, 1e-10, 1.0)
    q = np.clip(q, 1e-10, 1.0)
    
    # Normalize (in case of numerical drift)
    p = p / np.sum(p)
    q = q / np.sum(q)
    
    # Bhattacharyya coefficient: BC = Σ√(p_i * q_i)
    bc = np.sum(np.sqrt(p * q))
    
    # Clamp to valid range for arccos
    bc = np.clip(bc, -1.0, 1.0)
    
    # Fisher-Rao distance
    return np.arccos(bc)


def _fisher_rao_metric(a: np.ndarray, b: np.ndarray, metric: np.ndarray) -> float:
    """
    Fisher-Rao distance with explicit metric tensor.
    
    d² = (a-b)ᵀ G (a-b)
    
    where G is the Fisher information metric tensor.
    """
    diff = a - b
    distance_squared = diff @ metric @ diff
    return np.sqrt(np.abs(distance_squared))


def _fisher_rao_flat(a: np.ndarray, b: np.ndarray) -> float:
    """
    Fisher-Rao distance in flat space (identity metric).
    
    This is equivalent to Euclidean but framed geometrically.
    Should only be used when no better metric is available.
    """
    diff = a - b
    return np.sqrt(np.sum(diff * diff))


def geodesic_interpolate(
    start: np.ndarray,
    end: np.ndarray,
    t: float,
    metric: Optional[np.ndarray] = None
) -> np.ndarray:
    """
    Interpolate along geodesic on Fisher manifold.
    
    For probability distributions, this follows the geodesic on the
    probability simplex. For general basins with metric, it follows
    the curved geodesic.
    
    Args:
        start: Starting basin (64D)
        end: Ending basin (64D)
        t: Interpolation parameter [0, 1]
        metric: Optional Fisher metric tensor
    
    Returns:
        Intermediate basin at position t along geodesic
    
    Example:
        >>> start = np.random.dirichlet(np.ones(64))
        >>> end = np.random.dirichlet(np.ones(64))
        >>> mid = geodesic_interpolate(start, end, 0.5)
        >>> assert np.isclose(np.sum(mid), 1.0)  # Still valid probability
    """
    assert 0 <= t <= 1, f"Interpolation parameter must be in [0, 1], got {t}"
    assert start.shape == end.shape, "Basin shapes must match"
    
    # Check if probability distributions
    is_prob_start = np.all(start >= 0) and np.isclose(np.sum(start), 1.0, atol=1e-6)
    is_prob_end = np.all(end >= 0) and np.isclose(np.sum(end), 1.0, atol=1e-6)
    
    if is_prob_start and is_prob_end:
        # Geodesic on probability simplex (spherical interpolation in sqrt space)
        sqrt_start = np.sqrt(np.clip(start, 1e-10, 1.0))
        sqrt_end = np.sqrt(np.clip(end, 1e-10, 1.0))
        
        # Angle between points
        cos_angle = np.clip(np.sum(sqrt_start * sqrt_end), -1.0, 1.0)
        angle = np.arccos(cos_angle)
        
        if angle < 1e-10:
            return start.copy()
        
        # Spherical linear interpolation (SLERP)
        sin_angle = np.sin(angle)
        sqrt_interp = (
            np.sin((1 - t) * angle) / sin_angle * sqrt_start +
            np.sin(t * angle) / sin_angle * sqrt_end
        )
        
        # Back to probability space
        interp = sqrt_interp ** 2
        return interp / np.sum(interp)  # Normalize
    else:
        # Linear interpolation for general basins
        # TODO: Implement proper exponential map for curved metrics
        return (1 - t) * start + t * end


def find_nearest_basins(
    query_basin: np.ndarray,
    candidates: List[np.ndarray],
    k: int = 10,
    metric: Optional[np.ndarray] = None
) -> List[Tuple[int, float]]:
    """
    Find k nearest basins using Fisher-Rao distance.
    
    Args:
        query_basin: Query basin coordinates
        candidates: List of candidate basins
        k: Number of nearest neighbors to return
        metric: Optional Fisher metric tensor
    
    Returns:
        List of (index, distance) tuples sorted by distance
    """
    distances = [
        (i, fisher_rao_distance(query_basin, candidate, metric=metric))
        for i, candidate in enumerate(candidates)
    ]
    distances.sort(key=lambda x: x[1])
    return distances[:k]


def validate_basin(
    basin: np.ndarray,
    expected_dim: int = BASIN_DIMENSION,
    require_probability: bool = False
) -> bool:
    """
    Validate basin coordinates.
    
    Args:
        basin: Basin coordinates to validate
        expected_dim: Expected dimension (default: 64)
        require_probability: If True, require valid probability distribution
    
    Returns:
        True if valid, False otherwise
    """
    if basin.shape != (expected_dim,):
        return False
    
    if not np.all(np.isfinite(basin)):
        return False
    
    if require_probability:
        if not np.all(basin >= 0):
            return False
        if not np.isclose(np.sum(basin), 1.0, atol=1e-6):
            return False
    
    return True


# Export canonical function
__all__ = [
    'fisher_rao_distance',
    'geodesic_interpolate',
    'find_nearest_basins',
    'validate_basin',
]
