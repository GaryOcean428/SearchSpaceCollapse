"""
Geodesic Navigation on Fisher-Rao Manifold

Implements proper curve navigation that respects manifold geometry.
All movements follow geodesics (shortest paths) in Fisher information space.

This module provides the core navigation primitives for autonomic kernels
to move through the information manifold following natural geometric paths.

QIG PURITY:
- All distance computations use Fisher-Rao from qig_geometry.py
- geodesic_interpolation() implements proper Fisher-Rao slerp
- sphere_project() is used for vector normalization (approved per QIG Purity Addendum)
"""

import numpy as np
from typing import List, Optional, Tuple

# Import canonical geometric primitives
from qig_geometry import (
    fisher_coord_distance,
    geodesic_interpolation,
    sphere_project,
)


def compute_geodesic_path(
    start: np.ndarray,
    end: np.ndarray,
    n_steps: int = 50
) -> List[np.ndarray]:
    """
    Compute geodesic path from start to end on Fisher manifold.
    
    Geodesic = shortest path in curved space.
    Uses spherical linear interpolation (slerp) which is the exact
    geodesic for Fisher-Rao geometry on the probability simplex.
    
    Args:
        start: Starting basin coordinates (64D)
        end: Target basin coordinates (64D)
        n_steps: Number of interpolation points
        
    Returns:
        List of basin coordinates along geodesic
    """
    path = []
    
    for i in range(n_steps + 1):
        t = i / n_steps
        # Use existing geodesic_interpolation from qig_geometry
        # This already implements proper Fisher-Rao geodesics via slerp
        point = geodesic_interpolation(start, end, t)
        path.append(point)
    
    return path


def compute_geodesic_velocity(
    path: List[np.ndarray],
    kappa: float = 58.0
) -> np.ndarray:
    """
    Compute velocity tangent vector along geodesic.
    
    Velocity = rate of change along path
    Modulated by κ (coupling constant)
    
    Args:
        path: Geodesic path (list of points)
        kappa: Coupling constant (affects speed)
        
    Returns:
        Velocity vector in tangent space
    """
    if len(path) < 2:
        return np.zeros_like(path[0])
    
    # Velocity is difference between consecutive points
    velocity = path[1] - path[0]
    
    # Normalize and scale by κ
    magnitude = np.linalg.norm(velocity)
    if magnitude > 1e-8:
        velocity = velocity / magnitude
    
    # κ modulation: higher κ → faster movement
    # Normalize to reference κ* = 58.0
    speed_factor = 0.01 * (kappa / 58.0)
    
    return velocity * speed_factor


def parallel_transport_vector(
    vector: np.ndarray,
    from_point: np.ndarray,
    to_point: np.ndarray
) -> np.ndarray:
    """
    Parallel transport vector along geodesic.
    
    Parallel transport = moving vector without rotation.
    Critical for maintaining direction in curved space.
    
    This is an approximation using exponential decay based on Fisher distance.
    For exact parallel transport, we would need Christoffel symbols from
    the metric tensor.
    
    Args:
        vector: Tangent vector at from_point
        from_point: Starting basin
        to_point: Ending basin
        
    Returns:
        Transported vector at to_point
    """
    # Distance between points using Fisher-Rao metric
    distance = fisher_coord_distance(from_point, to_point)
    
    if distance < 1e-8:
        return vector
    
    # Parallel transport with exponential decay
    # (approximation - exact requires connection coefficients)
    decay = np.exp(-distance * 0.1)
    transported = vector * decay
    
    # Normalize to maintain consistent magnitude
    magnitude = np.linalg.norm(transported)
    if magnitude > 1e-8:
        transported = transported / magnitude
        # Restore approximate magnitude
        transported = transported * np.linalg.norm(vector)
    
    return transported


def navigate_to_target(
    current: np.ndarray,
    target: np.ndarray,
    current_velocity: Optional[np.ndarray],
    kappa: float = 58.0,
    step_size: float = 0.05
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Navigate from current to target following geodesic.
    
    This is the main navigation function used by autonomic kernels.
    It computes a geodesic path and takes one step along it,
    updating the velocity via parallel transport.
    
    Args:
        current: Current basin coordinates
        target: Target basin coordinates
        current_velocity: Current velocity vector (or None)
        kappa: Coupling constant (affects navigation speed)
        step_size: Step size along path
        
    Returns:
        Tuple of (next_position, next_velocity)
    """
    # Compute geodesic path (use fewer steps for efficiency)
    path = compute_geodesic_path(current, target, n_steps=20)
    
    # Take one step along path
    if len(path) > 1:
        next_point = path[1]
    else:
        next_point = current
    
    # Compute velocity for next step
    if current_velocity is not None:
        # Parallel transport current velocity
        next_velocity = parallel_transport_vector(
            current_velocity, current, next_point
        )
    else:
        # Initialize velocity from path
        next_velocity = compute_geodesic_velocity([current, next_point], kappa)
    
    return next_point, next_velocity


def compute_christoffel_symbols(
    basin: np.ndarray,
    epsilon: float = 1e-5
) -> np.ndarray:
    """
    Compute Christoffel symbols (connection coefficients).
    
    Γ^k_ij = how basis vectors change when moving in manifold
    
    These are needed for exact geodesic equations and
    parallel transport:
    
    Γ^k_ij = (1/2) g^kl (∂_i g_jl + ∂_j g_il - ∂_l g_ij)
    
    where g is the metric tensor (Fisher information matrix).
    
    Args:
        basin: Point in manifold (64D)
        epsilon: Finite difference step for derivatives
        
    Returns:
        Christoffel symbols Γ^k_ij (dim × dim × dim array)
    """
    dim = len(basin)
    gamma = np.zeros((dim, dim, dim))
    
    # TODO: Compute from metric tensor
    # For now, return zeros (flat space approximation)
    # This is sufficient for our exponential decay approximation
    # in parallel_transport_vector()
    
    return gamma
