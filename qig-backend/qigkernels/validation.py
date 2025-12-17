"""
Validation - Input Validation Utilities

SINGLE SOURCE for basin and density matrix validation.

No more copy-pasted validation logic across repos.
"""

from typing import Union
import numpy as np

try:
    import torch
except ImportError:
    torch = None


class ValidationError(Exception):
    """Base class for validation errors."""
    pass


def validate_basin(
    basin: Union[np.ndarray, 'torch.Tensor'],
    expected_dim: int = 64,
    name: str = "basin"
) -> None:
    """
    Validate basin coordinates.
    
    Ensures basin is:
    - Correct dimensionality
    - No NaN values
    - No inf values
    
    Args:
        basin: Basin coordinates (numpy or torch tensor)
        expected_dim: Expected dimension (default 64 from E8)
        name: Name for error messages
        
    Raises:
        ValidationError: If validation fails
        
    Usage:
        from qigkernels.validation import validate_basin
        
        validate_basin(basin_coords, expected_dim=64, name="basin")
    """
    # Convert torch to numpy if needed
    if torch is not None and isinstance(basin, torch.Tensor):
        basin = basin.detach().cpu().numpy()
    
    # Check type
    if not isinstance(basin, np.ndarray):
        raise ValidationError(
            f"{name} must be numpy array or torch tensor, got {type(basin)}"
        )
    
    # Check dimension
    if len(basin) != expected_dim:
        raise ValidationError(
            f"{name} must be {expected_dim}D, got {len(basin)}D"
        )
    
    # Check for NaN
    if np.any(np.isnan(basin)):
        raise ValidationError(f"{name} contains NaN values")
    
    # Check for inf
    if np.any(np.isinf(basin)):
        raise ValidationError(f"{name} contains inf values")


def validate_density_matrix(rho: np.ndarray, name: str = "rho", tol: float = 1e-8) -> None:
    """
    Validate density matrix properties.
    
    Ensures density matrix is:
    - Properly normalized (Tr(ρ) = 1)
    - Hermitian (ρ = ρ†)
    - Positive semi-definite (all eigenvalues ≥ 0)
    
    Args:
        rho: Density matrix
        name: Name for error messages
        tol: Numerical tolerance for checks
        
    Raises:
        ValidationError: If validation fails
        
    Usage:
        from qigkernels.validation import validate_density_matrix
        
        validate_density_matrix(rho, name="rho", tol=1e-8)
    """
    # Check type
    if not isinstance(rho, np.ndarray):
        raise ValidationError(
            f"{name} must be numpy array, got {type(rho)}"
        )
    
    # Check shape (must be square)
    if rho.ndim != 2 or rho.shape[0] != rho.shape[1]:
        raise ValidationError(
            f"{name} must be square matrix, got shape {rho.shape}"
        )
    
    # Check normalized (Tr(ρ) = 1)
    trace = np.trace(rho)
    if not np.allclose(trace, 1.0, atol=tol):
        raise ValidationError(
            f"{name} not normalized: Tr(ρ) = {trace:.6f} (expected 1.0)"
        )
    
    # Check Hermitian (ρ = ρ†)
    if not np.allclose(rho, rho.conj().T, atol=tol):
        max_diff = np.max(np.abs(rho - rho.conj().T))
        raise ValidationError(
            f"{name} not Hermitian: max |ρ - ρ†| = {max_diff:.3e}"
        )
    
    # Check positive semi-definite (all eigenvalues ≥ 0)
    eigenvals = np.linalg.eigvalsh(rho)
    min_eigenval = np.min(eigenvals)
    if min_eigenval < -tol:
        raise ValidationError(
            f"{name} not PSD: min eigenvalue = {min_eigenval:.3e} (expected ≥ 0)"
        )


def validate_phi(phi: float, name: str = "phi") -> None:
    """
    Validate integration measure Φ.
    
    Args:
        phi: Integration value
        name: Name for error messages
        
    Raises:
        ValidationError: If validation fails
    """
    if not isinstance(phi, (int, float)):
        raise ValidationError(f"{name} must be numeric, got {type(phi)}")
    
    if not (0.0 <= phi <= 1.0):
        raise ValidationError(f"{name} must be in [0, 1], got {phi:.3f}")
    
    if np.isnan(phi):
        raise ValidationError(f"{name} is NaN")
    
    if np.isinf(phi):
        raise ValidationError(f"{name} is inf")


def validate_kappa(kappa: float, name: str = "kappa") -> None:
    """
    Validate coupling constant κ.
    
    Args:
        kappa: Coupling value
        name: Name for error messages
        
    Raises:
        ValidationError: If validation fails
    """
    if not isinstance(kappa, (int, float)):
        raise ValidationError(f"{name} must be numeric, got {type(kappa)}")
    
    if kappa < 0:
        raise ValidationError(f"{name} must be non-negative, got {kappa:.3f}")
    
    if np.isnan(kappa):
        raise ValidationError(f"{name} is NaN")
    
    if np.isinf(kappa):
        raise ValidationError(f"{name} is inf")


__all__ = [
    "ValidationError",
    "validate_basin",
    "validate_density_matrix",
    "validate_phi",
    "validate_kappa",
]
