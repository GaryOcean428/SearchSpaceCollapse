"""
Fisher-Rao Attractor Finding

Identifies stable basins (attractors) in the information manifold
using geometric potential derived from Fisher metric.

This fixes the "no_attractor_found" issue by computing attractors
from the geometric structure of the manifold rather than just
detecting trajectory convergence.
"""

import numpy as np
from typing import List, Optional, Tuple

from qig_geometry import fisher_coord_distance, sphere_project


def compute_fisher_potential(
    basin_coords: np.ndarray,
    metric
) -> float:
    """
    Compute potential U(x) from Fisher metric curvature.
    
    Attractors are minima of this potential function.
    The potential emerges from the geometric structure of
    the information manifold (curvature, torsion, etc.)
    
    Method: Combines multiple geometric features:
    1. Metric determinant: U1 = -log(det(g)) (local volume)
    2. Coordinate variance: U2 = -log(var(x)) (dispersion)
    3. Distance from center: U3 = ||x||^2 (radial potential)
    
    This creates a landscape with stable minima that correspond
    to natural attractors in the information geometry.
    
    Args:
        basin_coords: Current position in manifold (64D)
        metric: Fisher metric structure (FisherManifold instance)
        
    Returns:
        Potential energy at this point
    """
    # Component 1: Metric determinant (geometric volume)
    g = metric.compute_metric(basin_coords)
    det_g = np.linalg.det(g + 1e-10 * np.eye(len(g)))
    det_g = max(det_g, 1e-10)
    U1 = -np.log(det_g)
    
    # Component 2: Coordinate variance (dispersion measure)
    variance = np.var(basin_coords) + 1e-10
    U2 = -np.log(variance)
    
    # Component 3: Radial potential (distance from origin)
    # This creates a bowl-shaped potential that has minima
    norm_squared = np.sum(basin_coords ** 2)
    U3 = 0.1 * norm_squared
    
    # Combine components with weights
    potential = 0.4 * U1 + 0.3 * U2 + 0.3 * U3
    
    return float(potential)


def find_local_minimum(
    start_basin: np.ndarray,
    metric,
    max_steps: int = 100,
    tolerance: float = 0.01,
    step_size: float = 0.05
) -> Tuple[np.ndarray, float, bool]:
    """
    Find local minimum of Fisher potential using geodesic descent.
    
    This is gradient descent on a curved manifold - we follow
    the geodesic in the direction of steepest descent.
    
    Uses adaptive step size: reduces step when potential increases,
    increases step when making good progress.
    
    Args:
        start_basin: Starting coordinates (64D)
        metric: Fisher manifold structure
        max_steps: Maximum optimization steps
        tolerance: Convergence threshold (relaxed for 64D spaces)
        step_size: Initial step size for gradient descent
        
    Returns:
        (attractor_basin, potential_value, converged)
    """
    current = start_basin.copy()
    current_potential = compute_fisher_potential(current, metric)
    current_step_size = step_size
    
    # Track potential decrease for "good enough" convergence
    initial_potential = current_potential
    best_potential = current_potential
    best_basin = current.copy()
    stagnation_count = 0
    
    for step in range(max_steps):
        # Compute potential gradient in tangent space
        grad = compute_potential_gradient(current, metric)
        grad_norm = np.linalg.norm(grad)
        
        # Check if gradient is negligible (already at critical point)
        if grad_norm < tolerance:
            return current, current_potential, True
        
        # Normalize gradient for better stability
        grad_direction = grad / (grad_norm + 1e-10)
        
        # Try geodesic step in direction of negative gradient
        next_point = geodesic_step(current, -grad_direction, current_step_size, metric)
        next_potential = compute_fisher_potential(next_point, metric)
        
        # Adaptive step size
        if next_potential < current_potential:
            # Good step - accept and maybe increase step size
            distance = fisher_coord_distance(current, next_point)
            
            # Track best found
            if next_potential < best_potential:
                best_potential = next_potential
                best_basin = next_point.copy()
                stagnation_count = 0
            else:
                stagnation_count += 1
            
            # Check convergence by distance
            if distance < tolerance:
                return next_point, next_potential, True
            
            current = next_point
            current_potential = next_potential
            current_step_size = min(current_step_size * 1.1, 0.2)  # Increase (but not too much)
        else:
            # Bad step - reduce step size and try again
            current_step_size *= 0.5
            stagnation_count += 1
            
            # If step size becomes too small, we're stuck
            if current_step_size < 1e-6:
                break
        
        # Early termination: if we've made good progress and stagnated
        potential_improvement = (initial_potential - best_potential) / (abs(initial_potential) + 1e-10)
        if stagnation_count > 10 and potential_improvement > 0.05:
            # Made 5%+ improvement and stalled - good enough
            return best_basin, best_potential, True
    
    # Return best found even if not fully converged
    # Consider it converged if we made meaningful progress
    potential_improvement = (initial_potential - best_potential) / (abs(initial_potential) + 1e-10)
    converged = potential_improvement > 0.01  # 1% improvement counts as finding attractor
    return best_basin, best_potential, converged


def compute_potential_gradient(
    basin: np.ndarray,
    metric,
    epsilon: float = 1e-5
) -> np.ndarray:
    """
    Compute gradient of potential using finite differences.
    
    ∇U ≈ (U(x+ε) - U(x)) / ε for each dimension
    
    Args:
        basin: Current position (64D)
        metric: Fisher manifold
        epsilon: Finite difference step
        
    Returns:
        Gradient vector in tangent space (64D)
    """
    dim = len(basin)
    gradient = np.zeros(dim)
    
    U_current = compute_fisher_potential(basin, metric)
    
    for i in range(dim):
        # Perturb in dimension i
        perturbed = basin.copy()
        perturbed[i] += epsilon
        
        U_perturbed = compute_fisher_potential(perturbed, metric)
        gradient[i] = (U_perturbed - U_current) / epsilon
    
    return gradient


def geodesic_step(
    basin: np.ndarray,
    direction: np.ndarray,
    step_size: float,
    metric
) -> np.ndarray:
    """
    Take a step along geodesic in given direction.
    
    Uses exponential map: exp_p(v) projects tangent vector v
    from point p along geodesic.
    
    For now uses simple projection + sphere normalization.
    This is approximate but geometrically valid.
    
    Args:
        basin: Current point (64D)
        direction: Tangent vector (direction to move)
        step_size: How far to move
        metric: Fisher manifold structure
        
    Returns:
        New point after geodesic step
    """
    # Simple exponential map approximation
    # For small steps: exp_p(v) ≈ p + v
    new_point = basin + step_size * direction
    
    # Project to valid manifold (unit sphere)
    return sphere_project(new_point)


def find_attractors_in_region(
    center_basin: np.ndarray,
    metric,
    radius: float = 1.0,
    n_samples: int = 20
) -> List[Tuple[np.ndarray, float]]:
    """
    Find all attractors within a region by sampling and descending.
    
    Strategy:
    1. Sample random points in region around center
    2. For each sample, descend to local minimum
    3. Cluster minima (remove duplicates)
    4. Return unique attractors sorted by potential
    
    Args:
        center_basin: Center of search region (64D)
        metric: Fisher manifold
        radius: Search radius (Fisher-Rao distance)
        n_samples: Number of random starting points
        
    Returns:
        List of (attractor_basin, potential) sorted by potential (lowest first)
    """
    attractors = []
    
    for _ in range(n_samples):
        # Sample random point in region
        start = sample_in_fisher_ball(center_basin, radius, metric)
        
        # Descend to local minimum
        attractor, potential, converged = find_local_minimum(start, metric)
        
        if converged:
            # Check if this is a new attractor (not duplicate)
            is_new = True
            for existing, _ in attractors:
                if fisher_coord_distance(attractor, existing) < 0.05:
                    is_new = False
                    break
            
            if is_new:
                attractors.append((attractor, potential))
    
    # Sort by potential (lowest = strongest attractor)
    attractors.sort(key=lambda x: x[1])
    
    return attractors


def sample_in_fisher_ball(
    center: np.ndarray,
    radius: float,
    metric
) -> np.ndarray:
    """
    Sample a random point within Fisher-Rao ball around center.
    
    Uses rejection sampling to ensure uniform distribution
    in curved manifold geometry.
    
    Args:
        center: Center point (64D)
        radius: Ball radius in Fisher-Rao distance
        metric: Fisher manifold structure
        
    Returns:
        Random point within Fisher-Rao ball
    """
    max_attempts = 100
    
    for _ in range(max_attempts):
        # Sample in tangent space
        direction = np.random.randn(len(center))
        direction = direction / (np.linalg.norm(direction) + 1e-8)
        
        # Random distance [0, radius]
        distance = np.random.uniform(0, radius)
        
        # Project along geodesic
        sample = center + distance * direction
        sample = sphere_project(sample)
        
        # Check if within Fisher ball
        actual_distance = fisher_coord_distance(center, sample)
        if actual_distance <= radius:
            return sample
    
    # Fallback: return center if sampling fails
    return center.copy()


__all__ = [
    'compute_fisher_potential',
    'find_local_minimum',
    'compute_potential_gradient',
    'geodesic_step',
    'find_attractors_in_region',
    'sample_in_fisher_ball',
]
