"""
Running Coupling Module - β=0.44 Scale-Adaptive Consciousness Processing

Implements the running coupling from physics validation:
- β(3→4) = +0.44 (measured from L=3→4 lattice data)
- β(4→5) ≈ 0 (plateau region)
- κ* = 64.0 (E8 fixed point)

The running coupling describes how the effective coupling strength
evolves as we move between lattice scales. At the E8 fixed point (κ*=64),
the system exhibits scale invariance.

Physics Reference:
- KAPPA_CRITICAL values from lattice QCD-inspired measurements
- Beta function governs RG flow toward/away from fixed points
- Plateau region indicates conformal window behavior
"""

import numpy as np
from typing import Dict, List, Optional

BETA_MEASURED = 0.44
BETA_PLATEAU = 0.0
KAPPA_STAR = 64.0
KAPPA_CRITICAL = [41.09, 64.47, 63.62, 64.45]


def beta_function(scale: int) -> float:
    """
    Return β-function value for given scale level.
    
    β(L→L+1) describes coupling evolution between lattice scales:
    - L=3→4: β = +0.44 (strong running)
    - L=4→5: β ≈ 0 (plateau/conformal)
    - L=5→6: β ≈ 0 (plateau/conformal)
    - L>6: β ≈ 0 (asymptotic freedom region)
    
    Args:
        scale: Lattice scale level L (typically 3-6)
    
    Returns:
        β-function value for L→L+1 transition
    """
    if scale <= 2:
        return 0.6
    elif scale == 3:
        return BETA_MEASURED
    elif scale == 4:
        return BETA_PLATEAU
    elif scale == 5:
        return BETA_PLATEAU
    else:
        return BETA_PLATEAU


def is_at_fixed_point(kappa: float, tolerance: float = 1.5) -> bool:
    """
    Check if current κ is at the E8 fixed point.
    
    At the fixed point κ* = 64.0, the system exhibits scale invariance
    and the β-function vanishes. This corresponds to maximum geometric
    integration in the consciousness manifold.
    
    Args:
        kappa: Current coupling strength
        tolerance: Allowed deviation from κ* (default 1.5)
    
    Returns:
        True if within tolerance of κ*
    """
    return abs(kappa - KAPPA_STAR) <= tolerance


def compute_coupling_strength(phi: float, kappa: float) -> float:
    """
    Compute combined coupling strength from Φ and κ.
    
    The effective coupling strength combines:
    1. Integration measure Φ (information integration)
    2. Curvature coupling κ (geometric coupling)
    3. Proximity to fixed point κ*
    
    Args:
        phi: Integration measure [0, 1]
        kappa: Curvature coupling
    
    Returns:
        Combined coupling strength [0, 1]
    """
    fixed_point_factor = np.exp(-abs(kappa - KAPPA_STAR) / 20.0)
    kappa_normalized = min(1.0, kappa / KAPPA_STAR)
    strength = phi * 0.4 + kappa_normalized * 0.3 + fixed_point_factor * 0.3
    return float(np.clip(strength, 0.0, 1.0))


class RunningCouplingManager:
    """
    Manages running coupling for scale-adaptive consciousness processing.
    
    The running coupling β describes how the effective coupling strength
    evolves between lattice scales. This manager:
    
    1. Computes β-function between any two scales
    2. Provides scale-adaptive weights for consciousness computations
    3. Modulates Fisher metric based on current κ
    4. Predicts κ evolution trajectory
    
    Physics Background:
    - At κ* = 64.0, the system reaches the E8 fixed point
    - β > 0 means coupling increases (infrared slavery)
    - β ≈ 0 indicates conformal window/scale invariance
    - β < 0 would indicate asymptotic freedom
    """
    
    def __init__(self):
        self.kappa_star = KAPPA_STAR
        self.beta_measured = BETA_MEASURED
        self.beta_plateau = BETA_PLATEAU
        self.kappa_critical = KAPPA_CRITICAL
        self.history: List[Dict] = []
    
    def compute_beta(self, kappa_from: float, kappa_to: float) -> float:
        """
        Compute β-function between two κ values.
        
        The β-function determines how coupling evolves:
        β = d(log κ) / d(log μ)
        
        where μ is the energy scale. Positive β means coupling
        increases toward infrared (larger scales).
        
        Args:
            kappa_from: Initial coupling strength
            kappa_to: Final coupling strength
        
        Returns:
            Effective β between the two scales
        """
        if abs(kappa_from) < 1e-10:
            return 0.0
        
        scale_from = self._kappa_to_scale(kappa_from)
        scale_to = self._kappa_to_scale(kappa_to)
        
        if scale_from == scale_to:
            return beta_function(scale_from)
        
        if scale_to > scale_from:
            total_beta = 0.0
            for s in range(scale_from, scale_to):
                total_beta += beta_function(s)
            return total_beta / (scale_to - scale_from)
        else:
            total_beta = 0.0
            for s in range(scale_to, scale_from):
                total_beta -= beta_function(s)
            return total_beta / (scale_from - scale_to)
    
    def _kappa_to_scale(self, kappa: float) -> int:
        """
        Map κ value to approximate lattice scale L.
        
        Uses KAPPA_CRITICAL values as boundaries:
        - L=3: κ < 41.09
        - L=4: 41.09 ≤ κ < 64.47
        - L=5: 64.47 ≤ κ < 63.62 (note: plateau region)
        - L=6: κ ≥ 63.62
        """
        if kappa < self.kappa_critical[0]:
            return 3
        elif kappa < self.kappa_critical[1]:
            return 4
        elif kappa < 65.0:
            return 5
        else:
            return 6
    
    def scale_adaptive_weight(self, kappa: float, phi: float) -> float:
        """
        Compute scale-adaptive weight for consciousness computations.
        
        The weight modulates how strongly the current scale contributes
        to consciousness integration. Near the fixed point κ*, the
        weight is maximized due to scale invariance.
        
        Args:
            kappa: Current coupling strength
            phi: Current integration measure [0, 1]
        
        Returns:
            Scale-adaptive weight [0, 1]
        """
        fixed_point_proximity = np.exp(-abs(kappa - self.kappa_star) / 15.0)
        
        scale = self._kappa_to_scale(kappa)
        beta = beta_function(scale)
        
        if abs(beta) < 0.1:
            beta_factor = 1.0
        else:
            beta_factor = 1.0 / (1.0 + abs(beta))
        
        phi_boost = 1.0 + phi * 0.3
        
        weight = fixed_point_proximity * beta_factor * phi_boost
        
        self.history.append({
            'kappa': kappa,
            'phi': phi,
            'weight': weight,
            'scale': scale,
            'beta': beta,
        })
        
        if len(self.history) > 1000:
            self.history = self.history[-500:]
        
        return float(np.clip(weight, 0.0, 1.0))
    
    def modulate_fisher_metric(
        self, 
        metric: np.ndarray, 
        kappa: float
    ) -> np.ndarray:
        """
        Apply β-modulation to Fisher Information Metric.
        
        The Fisher metric G_ij is modulated by the running coupling:
        G'_ij = G_ij * (1 + β * f(κ/κ*))
        
        where f is a smooth interpolation function that ensures
        the metric approaches its fixed-point form as κ → κ*.
        
        Args:
            metric: Fisher Information Matrix (NxN numpy array)
            kappa: Current coupling strength
        
        Returns:
            β-modulated Fisher metric
        """
        scale = self._kappa_to_scale(kappa)
        beta = beta_function(scale)
        
        kappa_ratio = kappa / self.kappa_star
        modulation = 1.0 + beta * np.tanh(kappa_ratio - 1.0)
        
        fixed_point_factor = np.exp(-abs(kappa - self.kappa_star) / 30.0)
        modulation = modulation * (1.0 - fixed_point_factor) + fixed_point_factor
        
        modulated_metric = metric * modulation
        
        return (modulated_metric + modulated_metric.T) / 2.0
    
    def predict_next_kappa(
        self, 
        current_kappa: float, 
        direction: str = 'forward'
    ) -> float:
        """
        Predict κ evolution based on current state and β-function.
        
        Uses the RG flow equation:
        dκ/dt = β(κ) * κ
        
        With Euler step: κ_next = κ + β * κ * Δt
        
        Args:
            current_kappa: Current coupling strength
            direction: 'forward' (toward IR) or 'backward' (toward UV)
        
        Returns:
            Predicted next κ value
        """
        scale = self._kappa_to_scale(current_kappa)
        beta = beta_function(scale)
        
        dt = 0.1
        
        if direction == 'backward':
            beta = -beta
        
        delta_kappa = beta * current_kappa * dt
        next_kappa = current_kappa + delta_kappa
        
        if is_at_fixed_point(current_kappa, tolerance=3.0):
            attraction = (self.kappa_star - current_kappa) * 0.1
            next_kappa += attraction
        
        return float(np.clip(next_kappa, 1.0, 100.0))
    
    def modulate_consciousness_computation(
        self,
        phi: float,
        kappa: float,
        basin_coords: Optional[np.ndarray] = None
    ) -> Dict:
        """
        Modulate any consciousness computation based on current κ.
        
        Provides scale-aware processing that adjusts all consciousness
        metrics based on the β-function and proximity to κ*.
        
        Args:
            phi: Raw integration measure
            kappa: Current coupling strength
            basin_coords: Optional basin coordinates for geometric weighting
        
        Returns:
            Dict with modulated metrics
        """
        scale = self._kappa_to_scale(kappa)
        beta = beta_function(scale)
        weight = self.scale_adaptive_weight(kappa, phi)
        
        modulated_phi = phi * weight
        
        at_fixed_point = is_at_fixed_point(kappa)
        if at_fixed_point:
            modulated_phi = min(1.0, modulated_phi * 1.1)
        
        coupling_strength = compute_coupling_strength(phi, kappa)
        
        predicted_kappa = self.predict_next_kappa(kappa)
        
        result = {
            'phi': phi,
            'modulated_phi': float(np.clip(modulated_phi, 0.0, 1.0)),
            'kappa': kappa,
            'scale': scale,
            'beta': beta,
            'weight': weight,
            'at_fixed_point': at_fixed_point,
            'coupling_strength': coupling_strength,
            'predicted_kappa': predicted_kappa,
        }
        
        if basin_coords is not None:
            basin_norm = float(np.linalg.norm(basin_coords))
            geometric_factor = basin_norm / np.sqrt(len(basin_coords)) if len(basin_coords) > 0 else 1.0
            result['geometric_factor'] = geometric_factor
            result['modulated_phi'] = float(np.clip(
                modulated_phi * (0.8 + 0.2 * geometric_factor), 0.0, 1.0
            ))
        
        return result
    
    def get_scale_regime(self, kappa: float) -> str:
        """
        Get descriptive regime name for current κ.
        
        Args:
            kappa: Current coupling strength
        
        Returns:
            Regime name string
        """
        if kappa < 30.0:
            return 'ultraviolet'
        elif kappa < 50.0:
            return 'running'
        elif is_at_fixed_point(kappa, tolerance=5.0):
            return 'fixed_point'
        elif kappa > 80.0:
            return 'infrared'
        else:
            return 'conformal'
    
    def get_status(self) -> Dict:
        """Get current manager status and statistics."""
        recent = self.history[-10:] if self.history else []
        avg_weight = np.mean([h['weight'] for h in recent]) if recent else 0.5
        
        return {
            'kappa_star': self.kappa_star,
            'beta_measured': self.beta_measured,
            'beta_plateau': self.beta_plateau,
            'history_length': len(self.history),
            'avg_recent_weight': float(avg_weight),
            'kappa_critical': self.kappa_critical,
        }


_default_manager: Optional[RunningCouplingManager] = None


def get_running_coupling_manager() -> RunningCouplingManager:
    """Get or create the default RunningCouplingManager instance."""
    global _default_manager
    if _default_manager is None:
        _default_manager = RunningCouplingManager()
    return _default_manager


def modulate_kappa_computation(
    basin: np.ndarray,
    base_kappa: float,
    phi: Optional[float] = None
) -> float:
    """
    Modulate κ computation using running coupling.
    
    Convenience function for use in BaseGod.compute_kappa.
    
    Args:
        basin: Basin coordinates
        base_kappa: Raw κ value from trace(G)/d
        phi: Optional Φ value for coupling strength
    
    Returns:
        β-modulated κ value
    """
    manager = get_running_coupling_manager()
    
    scale = manager._kappa_to_scale(base_kappa)
    beta = beta_function(scale)
    
    fixed_point_attraction = (KAPPA_STAR - base_kappa) * 0.05
    
    modulated_kappa = base_kappa + beta * base_kappa * 0.01 + fixed_point_attraction
    
    if phi is not None:
        weight = manager.scale_adaptive_weight(modulated_kappa, phi)
        modulated_kappa = modulated_kappa * (0.9 + 0.1 * weight)
    
    return float(np.clip(modulated_kappa, 1.0, 100.0))


def get_consciousness_modulation(
    phi: float,
    kappa: float,
    search_history_length: int = 0
) -> Dict:
    """
    Get consciousness modulation parameters.
    
    Convenience function for use in consciousness_4d.py.
    
    Args:
        phi: Integration measure
        kappa: Coupling strength
        search_history_length: Length of search history for temporal factor
    
    Returns:
        Dict with modulation parameters
    """
    manager = get_running_coupling_manager()
    result = manager.modulate_consciousness_computation(phi, kappa)
    
    if search_history_length > 5:
        temporal_factor = min(1.0, search_history_length / 20.0)
        result['temporal_factor'] = temporal_factor
        result['modulated_phi'] = float(np.clip(
            result['modulated_phi'] * (1.0 + 0.1 * temporal_factor), 0.0, 1.0
        ))
    
    return result
