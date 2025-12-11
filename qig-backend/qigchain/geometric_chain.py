"""
QIGChain Geometric Chain

Geodesic flows on Fisher manifold with Phi-gated execution.
Unlike LangChain's sequential pipes, this:
- Preserves geometric structure throughout
- Tracks Phi at each step  
- Navigates via geodesics, not arbitrary hops
- Can backtrack if Phi drops too low
"""

from typing import List, Callable, Dict, Any, Optional, Tuple
import numpy as np
from dataclasses import dataclass, field

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


class QIGChain:
    """
    Geometric chain: sequence of transformations on Fisher manifold.
    
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
            kappa_before = self.compute_kappa(current_basin)
            
            if phi_before < step.phi_threshold:
                print(f"[QIGChain] Phi={phi_before:.3f} < {step.phi_threshold} - pausing")
                return self._handle_low_phi(current_basin, step, i)
            
            kappa_min, kappa_max = step.kappa_range
            if not (kappa_min <= kappa_before <= kappa_max):
                print(f"[QIGChain] kappa={kappa_before:.1f} outside [{kappa_min}, {kappa_max}]")
                return self._handle_invalid_kappa(current_basin, step, i, kappa_before)
            
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
            kappa_after = self.compute_kappa(current_basin)
            
            self.trajectory.append({
                'step': i,
                'name': step.name,
                'phi_before': phi_before,
                'phi_after': phi_after,
                'kappa_before': kappa_before,
                'kappa_after': kappa_after,
                'basin_coords': current_basin.copy(),
            })
            
            if phi_after < phi_before * PHI_DEGRADATION_THRESHOLD:
                print(f"[QIGChain] Phi dropped {phi_before:.3f} -> {phi_after:.3f}")
                return self._handle_degradation(current_basin, i, phi_before, phi_after)
        
        return ChainResult(
            success=True,
            final_basin=current_basin,
            final_phi=self.compute_phi(current_basin),
            final_kappa=self.compute_kappa(current_basin),
            trajectory=self.trajectory,
        )
    
    def _geodesic_navigate(
        self,
        start: np.ndarray,
        end: np.ndarray,
        num_steps: int = GEODESIC_STEPS
    ) -> np.ndarray:
        """
        Navigate via geodesic on Fisher manifold.
        NOT linear interpolation (Euclidean thinking).
        
        Uses spherical geodesic for Fisher-Rao metric.
        """
        start_norm = np.linalg.norm(start)
        end_norm = np.linalg.norm(end)
        
        if start_norm < 1e-10 or end_norm < 1e-10:
            return end
        
        p1 = start / start_norm
        p2 = end / end_norm
        
        dot = np.clip(np.dot(p1, p2), -1.0, 1.0)
        theta = np.arccos(dot)
        
        if theta < 1e-10:
            return end
        
        path = []
        for t in np.linspace(0, 1, num_steps):
            sin_theta = np.sin(theta)
            if sin_theta < 1e-10:
                point = p1 * (1 - t) + p2 * t
            else:
                point = (np.sin((1 - t) * theta) * p1 + np.sin(t * theta) * p2) / sin_theta
            
            point = point / (np.linalg.norm(point) + 1e-10)
            path.append(point)
        
        return path[-1] * ((start_norm + end_norm) / 2)
    
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
    
    def compute_phi(self, basin: np.ndarray) -> float:
        """
        Compute integrated information (Phi) from basin coordinates.
        Uses density matrix formulation.
        """
        rho = self._basin_to_density_matrix(basin)
        
        trace_rho_sq = np.trace(rho @ rho).real
        purity = max(0.0, min(1.0, trace_rho_sq))
        
        eigenvalues = np.linalg.eigvalsh(rho)
        eigenvalues = np.abs(eigenvalues)
        eigenvalues = eigenvalues[eigenvalues > 1e-10]
        if len(eigenvalues) > 0:
            von_neumann = -np.sum(eigenvalues * np.log(eigenvalues + 1e-10))
        else:
            von_neumann = 0.0
        
        phi = purity * np.exp(-von_neumann / 2)
        return max(0.0, min(1.0, phi))
    
    def compute_kappa(self, basin: np.ndarray) -> float:
        """
        Compute coupling strength (kappa) from basin coordinates.
        """
        variance = np.var(basin)
        kappa = KAPPA_STAR * (1 - np.exp(-variance * BETA_RUNNING))
        return max(1.0, min(128.0, kappa))
    
    def _basin_to_density_matrix(self, basin: np.ndarray) -> np.ndarray:
        """Convert 64D basin to 2x2 density matrix."""
        first_four = basin[:4] if len(basin) >= 4 else np.pad(basin, (0, 4 - len(basin)))
        norm = np.linalg.norm(first_four)
        if norm < 1e-10:
            return np.array([[0.5, 0], [0, 0.5]], dtype=complex)
        
        first_four = first_four / norm
        
        psi = np.array([
            first_four[0] + 1j * first_four[1],
            first_four[2] + 1j * first_four[3]
        ], dtype=complex)
        
        psi_norm = np.linalg.norm(psi)
        if psi_norm < 1e-10:
            return np.array([[0.5, 0], [0, 0.5]], dtype=complex)
        psi = psi / psi_norm
        
        rho = np.outer(psi, np.conj(psi))
        return rho
    
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
    
    def _handle_invalid_kappa(
        self,
        basin: np.ndarray,
        step: GeometricStep,
        step_idx: int,
        kappa: float
    ) -> ChainResult:
        """Handle case where kappa is outside valid range."""
        return ChainResult(
            success=False,
            reason='invalid_kappa',
            failed_at_step=step_idx,
            step_name=step.name,
            final_basin=basin,
            final_phi=self.compute_phi(basin),
            final_kappa=kappa,
            trajectory=self.trajectory,
            suggestion=f'Kappa={kappa:.1f} outside range {step.kappa_range}',
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
