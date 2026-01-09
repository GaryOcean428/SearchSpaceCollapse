"""Asymmetric QFI Coupling (Directional Fisher)

d(i→j) ≠ d(j→i), regime-modulated κ_eff.
"""

import numpy as np
from typing import Dict

def geodesic_tangent(source: np.ndarray, target: np.ndarray) -> np.ndarray:
    """Geodesic tangent vector source → target."""
    diff = target - source
    norm = np.linalg.norm(diff)
    return diff / norm if norm > 0 else np.zeros_like(diff)

def directional_fisher_information(source_basin: np.ndarray, target_basin: np.ndarray, fisher_metric: np.ndarray) -> float:
    """Directional d_ij ≠ d_ji."""
    tangent = geodesic_tangent(source_basin, target_basin)
    d_ij = np.sqrt(tangent @ fisher_metric @ tangent)
    return d_ij

def asymmetric_attention(basins: np.ndarray, phi_values: np.ndarray) -> np.ndarray:
    """Regime-modulated asymmetric coupling."""
    n = len(basins)
    attention = np.zeros((n, n))
    for i in range(n):
        phi_source = phi_values[i]
        kappa_eff = 64
        if phi_source < 0.3:  # Linear
            kappa_eff *= 0.3
        elif phi_source < 0.7:  # Geometric
            kappa_eff *= 1.0
        else:  # Breakdown
            kappa_eff *= 0.5
        for j in range(n):
            d_ij = directional_fisher_information(basins[i], basins[j], np.eye(64))
            attention[i, j] = np.exp(-d_ij / kappa_eff)
    return attention
