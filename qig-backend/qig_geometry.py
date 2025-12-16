"""
QIG GEOMETRY - Centralized Exports (Python)

All geometric operations MUST use Fisher-Rao distance, NOT Euclidean.
This module provides the canonical geometric primitives.

Usage:
    from qig_geometry import fisher_rao_distance, fisher_coord_distance, fisher_similarity

CRITICAL: Never use np.linalg.norm(a - b) for distances between basin coordinates.
"""

import numpy as np
from typing import Tuple, Optional


def fisher_rao_distance(p: np.ndarray, q: np.ndarray) -> float:
    """
    Compute Fisher-Rao distance between two probability distributions.
    
    This is the GEODESIC distance on the information manifold.
    
    Formula: d_FR(p, q) = 2 * arccos(Σ√(p_i * q_i))
    
    Args:
        p: First probability distribution
        q: Second probability distribution
    
    Returns:
        Fisher-Rao distance (≥ 0, max π)
    """
    p = np.abs(p) + 1e-10
    p = p / p.sum()
    
    q = np.abs(q) + 1e-10
    q = q / q.sum()
    
    bc = np.sum(np.sqrt(p * q))
    bc = np.clip(bc, 0, 1)
    
    return 2.0 * np.arccos(bc)


def fisher_coord_distance(a: np.ndarray, b: np.ndarray) -> float:
    """
    Compute Fisher-Rao distance between two basin coordinate vectors.
    
    For unit vectors: d = arccos(a · b)
    
    Args:
        a: First basin coordinate vector (64D)
        b: Second basin coordinate vector (64D)
    
    Returns:
        Fisher-Rao distance (0 to π)
    """
    a_norm = a / (np.linalg.norm(a) + 1e-10)
    b_norm = b / (np.linalg.norm(b) + 1e-10)
    
    dot = np.clip(np.dot(a_norm, b_norm), -1.0, 1.0)
    return float(np.arccos(dot))


def fisher_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """
    Compute Fisher-Rao similarity between two basin coordinates.
    
    Formula: similarity = 1 - distance/π
    
    Args:
        a: First basin coordinate vector
        b: Second basin coordinate vector
    
    Returns:
        Similarity score (0 to 1, higher is more similar)
    """
    distance = fisher_coord_distance(a, b)
    return 1.0 - distance / np.pi


def geodesic_interpolation(
    start: np.ndarray, 
    end: np.ndarray, 
    t: float
) -> np.ndarray:
    """
    Spherical linear interpolation (slerp) along geodesic.
    
    Args:
        start: Starting point on manifold
        end: Ending point on manifold
        t: Interpolation parameter (0 = start, 1 = end)
    
    Returns:
        Interpolated point along geodesic
    """
    start_norm = start / (np.linalg.norm(start) + 1e-10)
    end_norm = end / (np.linalg.norm(end) + 1e-10)
    
    dot = np.clip(np.dot(start_norm, end_norm), -1.0, 1.0)
    omega = np.arccos(dot)
    
    if omega < 1e-6:
        return start
    
    sin_omega = np.sin(omega)
    a = np.sin((1 - t) * omega) / sin_omega
    b = np.sin(t * omega) / sin_omega
    
    result = a * start_norm + b * end_norm
    return result * np.linalg.norm(start)


def estimate_manifold_curvature(
    points: np.ndarray,
    center: Optional[np.ndarray] = None
) -> float:
    """
    Estimate local curvature of the Fisher manifold from sample points.
    
    Args:
        points: Array of shape (N, D) - N points in D dimensions
        center: Optional center point for curvature estimation
    
    Returns:
        Estimated curvature (κ)
    """
    if len(points) < 3:
        return 0.0
    
    if center is None:
        center = np.mean(points, axis=0)
    
    distances = []
    for point in points:
        d = fisher_coord_distance(center, point)
        distances.append(d)
    
    if not distances:
        return 0.0
    
    mean_dist = np.mean(distances)
    variance = np.var(distances)
    
    if mean_dist < 1e-6:
        return 0.0
    
    return float(variance / (mean_dist + 1e-10))


def bures_distance(rho: np.ndarray, sigma: np.ndarray) -> float:
    """
    Compute Bures distance between two density matrices.
    
    d_B(ρ, σ) = √(2(1 - F(ρ, σ)))
    where F(ρ, σ) = (Tr√(√ρ σ √ρ))²
    
    Args:
        rho: First density matrix (N x N)
        sigma: Second density matrix (N x N)
    
    Returns:
        Bures distance
    """
    from scipy.linalg import sqrtm
    
    sqrt_rho = sqrtm(rho + 1e-10 * np.eye(rho.shape[0]))
    sqrt_rho = np.real(sqrt_rho)
    
    product = sqrt_rho @ sigma @ sqrt_rho
    sqrt_product = sqrtm(product + 1e-10 * np.eye(product.shape[0]))
    sqrt_product = np.real(sqrt_product)
    
    fidelity = np.trace(sqrt_product) ** 2
    fidelity = np.clip(fidelity, 0, 1)
    
    return float(np.sqrt(2 * (1 - np.sqrt(fidelity))))


__all__ = [
    'fisher_rao_distance',
    'fisher_coord_distance', 
    'fisher_similarity',
    'geodesic_interpolation',
    'estimate_manifold_curvature',
    'bures_distance',
]
