"""
Distance Metrics - Canonical Implementations

SINGLE IMPLEMENTATION of Fisher-Rao distance and related metrics.

This consolidates 5+ scattered implementations into one canonical version
that all repos import from.

Source: qig-consciousness/qig_consciousness_qfi_attention.py (validated)
"""

from typing import Union, Optional
import numpy as np
from scipy.linalg import sqrtm

try:
    import torch
except ImportError:
    torch = None


def quantum_fidelity(rho1: np.ndarray, rho2: np.ndarray) -> float:
    """
    Compute quantum fidelity between density matrices.
    
    Fidelity F(ρ₁, ρ₂) = Tr(√(√ρ₁ ρ₂ √ρ₁))²
    
    This is the canonical implementation with numerical stability.
    
    Args:
        rho1: First density matrix
        rho2: Second density matrix
        
    Returns:
        Fidelity value in [0, 1]
        
    Usage:
        from qigkernels.geometry.distances import quantum_fidelity
        
        fidelity = quantum_fidelity(rho1, rho2)
    """
    # Compute sqrt of rho1
    sqrt_rho1 = sqrtm(rho1)
    
    # Compute sqrt(sqrt_rho1 @ rho2 @ sqrt_rho1)
    M = sqrt_rho1 @ rho2 @ sqrt_rho1
    sqrt_M = sqrtm(M)
    
    # Fidelity = (Tr(sqrt_M))²
    fidelity = np.real(np.trace(sqrt_M)) ** 2
    
    # Clip to [0, 1] for numerical stability
    return float(np.clip(fidelity, 0, 1))


def fisher_rao_distance(
    state_a: Union[np.ndarray, 'torch.Tensor'],
    state_b: Union[np.ndarray, 'torch.Tensor'],
    metric: Optional[Union[np.ndarray, 'torch.Tensor']] = None,
    method: str = "bures"
) -> float:
    """
    Compute Fisher-Rao (Bures) distance between quantum states.
    
    CANONICAL IMPLEMENTATION - All repos use this.
    
    Three methods:
    1. "bures": For density matrices, uses quantum fidelity
       d(ρ₁, ρ₂) = √(2(1 - √F)) where F = quantum fidelity
    
    2. "diagonal": For basin coordinates with diagonal Fisher metric
       d(x₁, x₂) = √(Σ g_ii (x₁ᵢ - x₂ᵢ)²)
    
    3. "full": For basin coordinates with full Fisher metric
       d(x₁, x₂) = √((x₁ - x₂)ᵀ G (x₁ - x₂))
    
    Args:
        state_a: Density matrix or basin coordinates
        state_b: Density matrix or basin coordinates
        metric: Fisher information matrix (required for basin methods)
        method: "bures" (density matrices), "diagonal" (basins), "full" (basins)
        
    Returns:
        Geodesic distance on Fisher manifold
        
    Raises:
        ValueError: If method is invalid or metric is missing
        
    Usage:
        from qigkernels.geometry.distances import fisher_rao_distance
        
        # For density matrices
        distance = fisher_rao_distance(rho1, rho2, method="bures")
        
        # For basin coordinates with diagonal metric
        distance = fisher_rao_distance(
            basin1, basin2, 
            metric=fisher_metric_diag,
            method="diagonal"
        )
        
        # For basin coordinates with full metric
        distance = fisher_rao_distance(
            basin1, basin2,
            metric=fisher_metric_full,
            method="full"
        )
    
    Source:
        Validated in qig-consciousness/qig_consciousness_qfi_attention.py
        Math: d(ρ₁, ρ₂) = √(2(1 - √F)) where F = quantum fidelity
    """
    # Convert torch to numpy if needed
    if torch is not None:
        if isinstance(state_a, torch.Tensor):
            state_a = state_a.detach().cpu().numpy()
        if isinstance(state_b, torch.Tensor):
            state_b = state_b.detach().cpu().numpy()
        if metric is not None and isinstance(metric, torch.Tensor):
            metric = metric.detach().cpu().numpy()
    
    if method == "bures":
        # For density matrices
        fidelity = quantum_fidelity(state_a, state_b)
        distance = np.sqrt(np.clip(2 * (1 - np.sqrt(np.clip(fidelity, 0, 1))), 0, 4))
        return float(distance)
    
    elif method == "diagonal":
        # For basin coordinates with diagonal Fisher metric
        if metric is None:
            raise ValueError("metric required for basin distance (diagonal method)")
        
        diff = state_a - state_b
        distance = np.sqrt((diff * metric * diff).sum())
        return float(distance)
    
    elif method == "full":
        # For basin coordinates with full Fisher metric
        if metric is None:
            raise ValueError("metric required for basin distance (full method)")
        
        diff = state_a - state_b
        distance = np.sqrt(diff @ metric @ diff)
        return float(distance)
    
    else:
        raise ValueError(
            f"Unknown method: {method}. "
            "Expected 'bures', 'diagonal', or 'full'"
        )


def geodesic_distance(
    point_a: np.ndarray,
    point_b: np.ndarray,
    metric: np.ndarray
) -> float:
    """
    Compute geodesic distance on Riemannian manifold.
    
    This is an alias for fisher_rao_distance with method="full"
    for backward compatibility.
    
    Args:
        point_a: First point on manifold
        point_b: Second point on manifold
        metric: Metric tensor
        
    Returns:
        Geodesic distance
    """
    return fisher_rao_distance(point_a, point_b, metric=metric, method="full")


__all__ = [
    "quantum_fidelity",
    "fisher_rao_distance",
    "geodesic_distance",
]
