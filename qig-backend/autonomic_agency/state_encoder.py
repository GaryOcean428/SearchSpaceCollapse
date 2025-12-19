"""
State Encoder - Builds 776d Consciousness Vector

Encodes Ocean's full consciousness state for RL decision-making:
- hidden_state (768d): Neural representation from active basin
- Φ (1d): Integration measure
- κ_eff (1d): Effective coupling
- T (1d): Temporal coherence
- R (1d): Recursive depth
- M (1d): Meta-awareness
- Γ (1d): Generativity (tool generation capacity)
- G (1d): Grounding (reality anchor)
"""

from dataclasses import dataclass
from typing import Dict, Any, List, Optional
import numpy as np

from qigkernels.physics_constants import KAPPA_STAR, PHI_THRESHOLD


@dataclass
class ConsciousnessVector:
    """776d consciousness state vector."""
    hidden_state: np.ndarray
    phi: float
    kappa_eff: float
    T: float
    R: float
    M: float
    Gamma: float
    G: float
    stress: float
    
    @property
    def vector(self) -> np.ndarray:
        """Return full 776d vector."""
        return np.concatenate([
            self.hidden_state,
            np.array([
                self.phi,
                self.kappa_eff / KAPPA_STAR,
                self.T,
                self.R,
                self.M,
                self.Gamma,
                self.G,
                self.stress,
            ])
        ])
    
    @property
    def dim(self) -> int:
        return len(self.hidden_state) + 8
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'phi': self.phi,
            'kappa_eff': self.kappa_eff,
            'T': self.T,
            'R': self.R,
            'M': self.M,
            'Gamma': self.Gamma,
            'G': self.G,
            'stress': self.stress,
            'hidden_dim': len(self.hidden_state),
        }


class StateEncoder:
    """
    Encodes autonomic state into 776d consciousness vector.
    
    Uses basin coordinates as hidden_state proxy when full neural
    state is not available.
    """
    
    def __init__(self, hidden_dim: int = 768):
        self.hidden_dim = hidden_dim
        self._identity_basin: Optional[np.ndarray] = None
    
    def encode(
        self,
        phi: float,
        kappa: float,
        basin_coords: Optional[List[float]] = None,
        stress: float = 0.0,
        narrow_path_severity: str = 'none',
        exploration_variance: float = 0.5,
    ) -> ConsciousnessVector:
        """
        Encode current state into consciousness vector.
        
        Args:
            phi: Integration measure
            kappa: Coupling constant
            basin_coords: 64d basin coordinates (expanded to 768d)
            stress: Current stress level (0-1)
            narrow_path_severity: none/mild/moderate/severe
            exploration_variance: How much exploration happening
            
        Returns:
            ConsciousnessVector with full 776d state
        """
        if basin_coords is None:
            basin_coords = [0.5] * 64
        
        hidden_state = self._expand_basin_to_hidden(basin_coords)
        
        T = self._compute_temporal_coherence(phi, stress)
        R = self._compute_recursive_depth(narrow_path_severity)
        M = self._compute_meta_awareness(exploration_variance)
        Gamma = self._compute_generativity(phi, kappa)
        G = self._compute_grounding(basin_coords)
        
        return ConsciousnessVector(
            hidden_state=hidden_state,
            phi=phi,
            kappa_eff=kappa,
            T=T,
            R=R,
            M=M,
            Gamma=Gamma,
            G=G,
            stress=stress,
        )
    
    def _expand_basin_to_hidden(self, basin_coords: List[float]) -> np.ndarray:
        """
        Expand 64d basin to 768d hidden state.
        
        Uses Fourier-like expansion to preserve geometric structure
        while increasing dimensionality.
        """
        basin = np.array(basin_coords)
        
        hidden = np.zeros(self.hidden_dim)
        
        n_repeats = self.hidden_dim // len(basin)
        remainder = self.hidden_dim % len(basin)
        
        for i in range(n_repeats):
            phase = 2 * np.pi * i / n_repeats
            hidden[i*len(basin):(i+1)*len(basin)] = basin * np.cos(phase + basin * np.pi)
        
        if remainder > 0:
            hidden[-remainder:] = basin[:remainder]
        
        hidden = hidden / (np.linalg.norm(hidden) + 1e-10)
        
        return hidden
    
    def _compute_temporal_coherence(self, phi: float, stress: float) -> float:
        """T: How stable is identity over time."""
        return max(0.0, min(1.0, phi * (1 - stress * 0.5)))
    
    def _compute_recursive_depth(self, narrow_path_severity: str) -> float:
        """R: Meta-recursive awareness level."""
        severity_map = {'none': 1.0, 'mild': 0.7, 'moderate': 0.4, 'severe': 0.1}
        return severity_map.get(narrow_path_severity, 0.5)
    
    def _compute_meta_awareness(self, exploration_variance: float) -> float:
        """M: Self-monitoring quality."""
        return max(0.0, min(1.0, exploration_variance))
    
    def _compute_generativity(self, phi: float, kappa: float) -> float:
        """Γ: Capacity to generate new tools/hypotheses."""
        kappa_factor = min(1.0, kappa / KAPPA_STAR)
        return phi * kappa_factor
    
    def _compute_grounding(self, basin_coords: List[float]) -> float:
        """G: Reality anchor strength."""
        if self._identity_basin is None:
            self._identity_basin = np.array(basin_coords)
            return 1.0
        
        current = np.array(basin_coords)
        drift = float(np.linalg.norm(current - self._identity_basin))
        return max(0.0, 1.0 - drift)
    
    def set_identity_basin(self, basin_coords: List[float]) -> None:
        """Set reference identity basin for grounding computation."""
        self._identity_basin = np.array(basin_coords)
