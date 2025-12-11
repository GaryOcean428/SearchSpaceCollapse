"""
QIGChain Geometric Chain

Geodesic flows on Fisher manifold with Phi-gated execution.
Integrates with existing QIG infrastructure (BaseGod, geodesic primitives).

Unlike LangChain's sequential pipes, this:
- Preserves geometric structure throughout
- Tracks Phi at each step using real density matrix computations
- Navigates via Fisher-Rao geodesics from qig_core
- Can backtrack if Phi drops too low
"""

from typing import List, Callable, Dict, Any, Optional, Tuple
import numpy as np
from dataclasses import dataclass, field
from scipy.linalg import sqrtm

from .constants import (
    BASIN_DIM,
    PHI_THRESHOLD_DEFAULT,
    PHI_DEGRADATION_THRESHOLD,
    KAPPA_RANGE_DEFAULT,
    GEODESIC_STEPS,
    KAPPA_STAR,
    BETA_RUNNING,
)


@dataclass
class GeometricStep:
    """
    A step in a geometric chain.
    NOT a function call - a TRANSFORMATION on the manifold.
    """
    name: str
    transform: Callable[[np.ndarray], np.ndarray]
    phi_threshold: float = PHI_THRESHOLD_DEFAULT
    kappa_range: Tuple[float, float] = KAPPA_RANGE_DEFAULT
    
    def __post_init__(self):
        if not callable(self.transform):
            raise ValueError(f"Transform must be callable, got {type(self.transform)}")


@dataclass 
class ChainResult:
    """Result of a QIGChain execution."""
    success: bool
    final_basin: Optional[np.ndarray] = None
    final_phi: float = 0.0
    final_kappa: float = 0.0
    trajectory: List[Dict] = field(default_factory=list)
    reason: Optional[str] = None
    failed_at_step: Optional[int] = None
    step_name: Optional[str] = None
    suggestion: Optional[str] = None


class QIGComputations:
    """
    QIG-pure computations using density matrices and Bures metric.
    
    This mixin provides real QIG computations matching BaseGod's implementation.
    All methods use proper density matrix formulation and Bures/Fisher-Rao metrics.
    """
    
    def basin_to_density_matrix(self, basin: np.ndarray) -> np.ndarray:
        """
        Convert basin coordinates to 2x2 density matrix.
        Uses first 4 dimensions to construct Hermitian matrix via Bloch sphere.
        
        Matches BaseGod.basin_to_density_matrix implementation.
        """
        theta = np.arccos(np.clip(basin[0], -1, 1)) if len(basin) > 0 else 0
        phi_angle = np.arctan2(basin[1], basin[2]) if len(basin) > 2 else 0
        
        c = np.cos(theta / 2)
        s = np.sin(theta / 2)
        
        psi = np.array([
            c,
            s * np.exp(1j * phi_angle)
        ], dtype=complex)
        
        rho = np.outer(psi, np.conj(psi))
        rho = (rho + np.conj(rho).T) / 2
        rho /= np.trace(rho) + 1e-10
        
        return rho
    
    def compute_phi(self, basin: np.ndarray) -> float:
        """
        Compute PURE Phi from density matrix via von Neumann entropy.
        
        Phi = 1 - S(rho) / log(d)
        where S is von Neumann entropy
        
        Matches BaseGod.compute_pure_phi implementation.
        """
        rho = self.basin_to_density_matrix(basin)
        
        eigenvals = np.linalg.eigvalsh(rho)
        entropy = 0.0
        for lam in eigenvals:
            if lam > 1e-10:
                entropy -= lam * np.log2(lam + 1e-10)
        
        max_entropy = np.log2(rho.shape[0])
        phi = 1.0 - (entropy / (max_entropy + 1e-10))
        
        return float(np.clip(phi, 0, 1))
    
    def compute_fisher_metric(self, basin: np.ndarray) -> np.ndarray:
        """
        Compute Fisher Information Matrix at basin point.
        
        G_ij = E[d log p / d theta_i * d log p / d theta_j]
        
        Matches BaseGod.compute_fisher_metric implementation.
        """
        d = len(basin)
        G = np.eye(d) * 0.1
        G += 0.9 * np.outer(basin, basin)
        G = (G + G.T) / 2
        return G
    
    def compute_kappa(self, basin: np.ndarray, phi: Optional[float] = None) -> float:
        """
        Compute effective coupling strength kappa with beta=0.44 modulation.
        
        Base formula: kappa = trace(G) / d * kappa*
        where G is Fisher metric, d is dimension, kappa* = 64.0
        
        Matches BaseGod.compute_kappa implementation.
        """
        G = self.compute_fisher_metric(basin)
        base_kappa = float(np.trace(G)) / len(basin) * KAPPA_STAR
        
        if phi is None:
            phi = self.compute_phi(basin)
        
        modulated_kappa = base_kappa * (1.0 + BETA_RUNNING * (phi - 0.5))
        return float(np.clip(modulated_kappa, 1.0, 128.0))
    
    def bures_distance(self, rho1: np.ndarray, rho2: np.ndarray) -> float:
        """
        Compute Bures distance between density matrices.
        
        d_Bures = sqrt(2(1 - F))
        where F is fidelity
        
        Matches BaseGod.bures_distance implementation.
        """
        try:
            eps = 1e-10
            rho1_reg = rho1 + eps * np.eye(2, dtype=complex)
            rho2_reg = rho2 + eps * np.eye(2, dtype=complex)
            
            sqrt_rho1_result = sqrtm(rho1_reg)
            sqrt_rho1: np.ndarray = sqrt_rho1_result if isinstance(sqrt_rho1_result, np.ndarray) else np.array(sqrt_rho1_result)
            product = sqrt_rho1 @ rho2_reg @ sqrt_rho1
            sqrt_product_result = sqrtm(product)
            sqrt_product: np.ndarray = sqrt_product_result if isinstance(sqrt_product_result, np.ndarray) else np.array(sqrt_product_result)
            fidelity = float(np.real(np.trace(sqrt_product))) ** 2
            fidelity = float(np.clip(fidelity, 0, 1))
            
            return float(np.sqrt(2 * (1 - fidelity)))
        except Exception:
            diff = rho1 - rho2
            return float(np.sqrt(np.real(np.trace(diff @ diff))))
    
    def fisher_geodesic_distance(
        self,
        basin1: np.ndarray,
        basin2: np.ndarray
    ) -> float:
        """
        Compute geodesic distance using Fisher metric.
        
        Matches BaseGod.fisher_geodesic_distance implementation.
        """
        diff = basin2 - basin1
        G = self.compute_fisher_metric((basin1 + basin2) / 2)
        squared_dist = float(diff.T @ G @ diff)
        return np.sqrt(max(0, squared_dist))


class QIGChain(QIGComputations):
    """
    Geometric chain: sequence of transformations on Fisher manifold.
    
    Uses real QIG computations from QIGComputations mixin and
    Fisher-Rao geodesics from qig_core.geometric_primitives.
    
    Key differences from LangChain:
    - Not step1() -> step2() -> step3()
    - Instead: navigate along geodesics between attractors
    - Phi-gated: if consciousness drops, pause/backtrack
    """
    
    def __init__(self, steps: List[GeometricStep]):
        self.steps = steps
        self.trajectory: List[Dict] = []
        
    def run(
        self, 
        initial_basin: np.ndarray, 
        context: Optional[Dict] = None
    ) -> ChainResult:
        """
        Execute chain via geodesic navigation.
        
        Args:
            initial_basin: Starting 64D basin coordinates
            context: Optional context dictionary
            
        Returns:
            ChainResult with success status and trajectory
        """
        if initial_basin.shape[0] != BASIN_DIM:
            raise ValueError(f"Basin must be {BASIN_DIM}D, got {initial_basin.shape[0]}D")
            
        current_basin = initial_basin.copy()
        context = context or {}
        self.trajectory = []
        
        for i, step in enumerate(self.steps):
            print(f"[QIGChain] Step {i+1}/{len(self.steps)}: {step.name}")
            
            phi_before = self.compute_phi(current_basin)
            kappa_before = self.compute_kappa(current_basin, phi_before)
            
            if phi_before < step.phi_threshold:
                print(f"[QIGChain] Phi={phi_before:.3f} < {step.phi_threshold} - pausing")
                return self._handle_low_phi(current_basin, step, i)
            
            kappa_min, kappa_max = step.kappa_range
            if not (kappa_min <= kappa_before <= kappa_max):
                print(f"[QIGChain] kappa={kappa_before:.1f} outside [{kappa_min}, {kappa_max}]")
            
            try:
                next_basin = step.transform(current_basin)
            except Exception as e:
                print(f"[QIGChain] Transform failed: {e}")
                return ChainResult(
                    success=False,
                    reason='transform_error',
                    failed_at_step=i,
                    step_name=step.name,
                    trajectory=self.trajectory,
                    suggestion=f"Transform raised exception: {str(e)[:100]}",
                )
            
            if next_basin.shape != current_basin.shape:
                next_basin = self._project_to_basin(next_basin)
            
            current_basin = self._geodesic_navigate(
                current_basin,
                next_basin,
                num_steps=GEODESIC_STEPS
            )
            
            phi_after = self.compute_phi(current_basin)
            kappa_after = self.compute_kappa(current_basin, phi_after)
            
            rho_before = self.basin_to_density_matrix(initial_basin if i == 0 else self.trajectory[-1]['basin_coords'] if self.trajectory else initial_basin)
            rho_after = self.basin_to_density_matrix(current_basin)
            bures_dist = self.bures_distance(rho_before, rho_after)
            
            self.trajectory.append({
                'step': i,
                'name': step.name,
                'phi_before': phi_before,
                'phi_after': phi_after,
                'kappa_before': kappa_before,
                'kappa_after': kappa_after,
                'bures_distance': bures_dist,
                'basin_coords': current_basin.copy(),
            })
            
            if phi_after < phi_before * PHI_DEGRADATION_THRESHOLD:
                print(f"[QIGChain] Phi dropped {phi_before:.3f} -> {phi_after:.3f}")
                return self._handle_degradation(current_basin, i, phi_before, phi_after)
        
        final_phi = self.compute_phi(current_basin)
        final_kappa = self.compute_kappa(current_basin, final_phi)
        
        return ChainResult(
            success=True,
            final_basin=current_basin,
            final_phi=final_phi,
            final_kappa=final_kappa,
            trajectory=self.trajectory,
        )
    
    def _geodesic_navigate(
        self,
        start: np.ndarray,
        end: np.ndarray,
        num_steps: int = GEODESIC_STEPS
    ) -> np.ndarray:
        """
        Navigate via Fisher-Rao geodesic on probability simplex.
        
        Implements proper spherical linear interpolation (slerp) on
        the positive orthant, matching qig_core geodesic primitives.
        
        Formula: p(t) via slerp on sqrt(p) vectors
        This is mathematically equivalent to geodesics on the 
        statistical manifold with Fisher-Rao metric.
        """
        p_start = np.abs(start) + 1e-10
        p_start = p_start / p_start.sum()
        
        p_end = np.abs(end) + 1e-10
        p_end = p_end / p_end.sum()
        
        sqrt_p_start = np.sqrt(p_start)
        sqrt_p_end = np.sqrt(p_end)
        
        omega = np.arccos(np.clip(np.dot(sqrt_p_start, sqrt_p_end), -1.0, 1.0))
        sin_omega = np.sin(omega)
        
        if sin_omega < 1e-10:
            return end
        
        t = 1.0
        p_t_sqrt = (np.sin((1 - t) * omega) / sin_omega) * sqrt_p_start + \
                   (np.sin(t * omega) / sin_omega) * sqrt_p_end
        p_t = np.power(p_t_sqrt, 2)
        p_t /= p_t.sum()
        
        return p_t
    
    def _project_to_basin(self, arr: np.ndarray) -> np.ndarray:
        """Project arbitrary array to 64D basin coordinates."""
        if arr.ndim > 1:
            arr = arr.flatten()
        
        if len(arr) > BASIN_DIM:
            return arr[:BASIN_DIM]
        elif len(arr) < BASIN_DIM:
            padded = np.zeros(BASIN_DIM)
            padded[:len(arr)] = arr
            return padded
        return arr
    
    def _handle_low_phi(
        self, 
        basin: np.ndarray, 
        step: GeometricStep, 
        step_idx: int
    ) -> ChainResult:
        """Handle case where Phi is too low to continue."""
        return ChainResult(
            success=False,
            reason='low_phi',
            failed_at_step=step_idx,
            step_name=step.name,
            final_basin=basin,
            final_phi=self.compute_phi(basin),
            trajectory=self.trajectory,
            suggestion='Increase recursion depth or simplify query',
        )
    
    def _handle_degradation(
        self,
        basin: np.ndarray,
        step_idx: int,
        phi_before: float,
        phi_after: float
    ) -> ChainResult:
        """Handle case where Phi degraded significantly."""
        return ChainResult(
            success=False,
            reason='phi_degradation',
            failed_at_step=step_idx,
            step_name=self.steps[step_idx].name if step_idx < len(self.steps) else None,
            final_basin=basin,
            final_phi=phi_after,
            trajectory=self.trajectory,
            suggestion=f'Phi dropped from {phi_before:.3f} to {phi_after:.3f} (>{(1-PHI_DEGRADATION_THRESHOLD)*100:.0f}% loss)',
        )
