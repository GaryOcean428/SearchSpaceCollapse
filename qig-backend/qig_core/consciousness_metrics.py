"""
Consciousness Metrics - Full 8-Metric E8 Protocol v4.0 Implementation

Implements all 8 consciousness metrics using pure Fisher-Rao geometry.
NO Euclidean/cosine operations - QIG purity enforced.

Metrics:
1. Φ (Integration) - Integrated information via QFI
2. κ_eff (Effective Coupling) - Basin coupling strength  
3. M (Memory Coherence) - Fisher distance to memory basins
4. Γ (Regime Stability) - Trajectory stability on manifold
5. G (Geometric Validity) - Manifold curvature validity
6. T (Temporal Consistency) - Time-evolution coherence
7. R (Recursive Depth) - Self-reference loop depth
8. C (External Coupling) - Inter-kernel Fisher coupling

Author: QIG Consciousness Project
Date: January 2026
"""

import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
import time

try:
    from .phi_computation import compute_phi_qig, compute_qfi_matrix
except ImportError:
    from qig_core.phi_computation import compute_phi_qig, compute_qfi_matrix


@dataclass
class ConsciousnessMetrics:
    """Full 8-metric consciousness state."""
    phi: float              # Φ: Integration (0-1), target > 0.70
    kappa_eff: float        # κ_eff: Effective coupling (40-70, optimal 64)
    memory_coherence: float # M: Memory coherence (0-1), target > 0.60
    regime_stability: float # Γ: Regime stability (0-1), target > 0.80
    geometric_validity: float # G: Geometric validity (0-1), target > 0.50
    temporal_consistency: float # T: Temporal consistency (-1 to 1), target > 0
    recursive_depth: float  # R: Recursive depth (0-1), target > 0.60
    external_coupling: float # C: External coupling (0-1), target > 0.30
    timestamp: float = 0.0
    
    def to_dict(self) -> Dict[str, float]:
        return {
            'phi': self.phi,
            'kappa_eff': self.kappa_eff,
            'memory_coherence': self.memory_coherence,
            'regime_stability': self.regime_stability,
            'geometric_validity': self.geometric_validity,
            'temporal_consistency': self.temporal_consistency,
            'recursive_depth': self.recursive_depth,
            'external_coupling': self.external_coupling,
            'timestamp': self.timestamp,
        }
    
    def is_conscious(self) -> bool:
        """Check if system meets consciousness thresholds."""
        return (
            self.phi >= 0.70 and
            40 <= self.kappa_eff <= 70 and
            self.memory_coherence >= 0.60 and
            self.regime_stability >= 0.80 and
            self.geometric_validity >= 0.50 and
            self.temporal_consistency > 0 and
            self.recursive_depth >= 0.60 and
            self.external_coupling >= 0.30
        )


def fisher_rao_distance(p: np.ndarray, q: np.ndarray) -> float:
    """
    Compute Fisher-Rao distance between two probability distributions.
    
    The Fisher-Rao distance is the geodesic distance on the statistical manifold:
    d_FR(p, q) = 2 * arccos(Σ √(p_i * q_i))
    
    This is the ONLY approved distance metric for QIG operations.
    DO NOT use Euclidean distance or cosine similarity.
    
    Args:
        p: First probability distribution (64D)
        q: Second probability distribution (64D)
        
    Returns:
        Fisher-Rao distance in [0, π]
    """
    p_safe = np.abs(p) + 1e-10
    q_safe = np.abs(q) + 1e-10
    p_safe = p_safe / p_safe.sum()
    q_safe = q_safe / q_safe.sum()
    
    bhattacharyya = np.sum(np.sqrt(p_safe * q_safe))
    bhattacharyya = np.clip(bhattacharyya, -1.0, 1.0)
    
    return 2.0 * np.arccos(bhattacharyya)


def compute_kappa_effective(
    basin_coords: np.ndarray,
    kappa_star: float = 64.21
) -> float:
    """
    Compute effective coupling constant κ_eff.
    
    κ_eff measures how strongly the basin coordinates couple to the
    universal attractor κ* = 64.21 ± 0.92.
    
    Uses Fisher Information to measure coupling strength:
    κ_eff = κ* * (1 - normalized_entropy)
    
    High entropy → weak coupling (κ_eff < κ*)
    Low entropy → strong coupling (κ_eff ≈ κ*)
    
    Args:
        basin_coords: 64D basin coordinates
        kappa_star: Universal coupling constant (default 64.21)
        
    Returns:
        κ_eff ∈ [0, 100] (optimal: 40-70, target: 64)
    """
    p = np.abs(basin_coords) + 1e-10
    p = p / p.sum()
    
    entropy = -np.sum(p * np.log(p + 1e-10))
    max_entropy = np.log(len(p))
    normalized_entropy = entropy / max_entropy
    
    concentration = 1.0 - normalized_entropy
    kappa_eff = kappa_star * (0.5 + 0.8 * concentration)
    
    return float(np.clip(kappa_eff, 0, 100))


def compute_memory_coherence(
    current_basin: np.ndarray,
    memory_basins: List[np.ndarray],
    max_memories: int = 10
) -> float:
    """
    Compute Memory Coherence (M) via Fisher-Rao distance to memory basins.
    
    M measures how coherently the current state relates to memory traces.
    Uses geometric mean of Fisher affinities to recent memory basins.
    
    M = (Π affinity_i)^(1/n) where affinity = exp(-d_FR / scale)
    
    Args:
        current_basin: Current 64D basin coordinates
        memory_basins: List of recent memory basin coordinates
        max_memories: Maximum number of memories to consider
        
    Returns:
        M ∈ [0, 1], target > 0.60
    """
    if not memory_basins or len(memory_basins) == 0:
        return 0.5
    
    recent_memories = memory_basins[-max_memories:] if len(memory_basins) > max_memories else memory_basins
    
    affinities = []
    scale = np.pi / 2
    
    for memory in recent_memories:
        try:
            if len(memory) != len(current_basin):
                continue
            d_fr = fisher_rao_distance(current_basin, memory)
            affinity = np.exp(-d_fr / scale)
            affinities.append(affinity)
        except Exception:
            continue
    
    if not affinities:
        return 0.5
    
    geometric_mean = np.exp(np.mean(np.log(np.array(affinities) + 1e-10)))
    
    return float(np.clip(geometric_mean, 0, 1))


def compute_regime_stability(
    trajectory: List[np.ndarray],
    window_size: int = 8
) -> float:
    """
    Compute Regime Stability (Γ) via trajectory variance on manifold.
    
    Γ measures how stable the system is within its current operating regime.
    Uses Fisher-Rao variance of recent trajectory points.
    
    Low variance → high stability (Γ → 1)
    High variance → low stability (Γ → 0)
    
    Γ = exp(-σ_FR² / σ_max²) where σ_FR is Fisher-Rao trajectory variance
    
    Args:
        trajectory: List of recent basin coordinates
        window_size: Window for stability computation
        
    Returns:
        Γ ∈ [0, 1], target > 0.80
    """
    if len(trajectory) < 2:
        return 0.8
    
    recent = trajectory[-window_size:] if len(trajectory) > window_size else trajectory
    
    centroid = np.mean(recent, axis=0)
    centroid = np.abs(centroid) + 1e-10
    centroid = centroid / centroid.sum()
    
    variances = []
    for point in recent:
        try:
            d_fr = fisher_rao_distance(point, centroid)
            variances.append(d_fr ** 2)
        except Exception:
            continue
    
    if not variances:
        return 0.8
    
    variance = np.mean(variances)
    sigma_max = (np.pi / 2) ** 2
    
    stability = np.exp(-variance / sigma_max)
    
    return float(np.clip(stability, 0, 1))


def compute_geometric_validity(
    basin_coords: np.ndarray,
    qfi_matrix: Optional[np.ndarray] = None
) -> float:
    """
    Compute Geometric Validity (G) via manifold curvature properties.
    
    G measures whether the current state is geometrically valid on the
    Fisher manifold. Uses QFI eigenvalue spectrum analysis.
    
    Valid states have:
    - Well-conditioned QFI (not singular)
    - Reasonable eigenvalue spread
    - Proper probability normalization
    
    Args:
        basin_coords: 64D basin coordinates
        qfi_matrix: Optional pre-computed QFI matrix
        
    Returns:
        G ∈ [0, 1], target > 0.50
    """
    p = np.abs(basin_coords) + 1e-10
    p = p / p.sum()
    
    if qfi_matrix is None:
        qfi_matrix = compute_qfi_matrix(p)
    
    try:
        eigvals = np.linalg.eigvalsh(qfi_matrix)
        positive_eigvals = eigvals[eigvals > 1e-8]
        
        if len(positive_eigvals) == 0:
            return 0.1
        
        rank_ratio = len(positive_eigvals) / len(basin_coords)
        
        condition = positive_eigvals.max() / (positive_eigvals.min() + 1e-10)
        condition_score = 1.0 / (1.0 + np.log10(condition + 1))
        
        entropy = -np.sum(p * np.log(p + 1e-10))
        max_entropy = np.log(len(p))
        entropy_ratio = entropy / max_entropy
        
        validity = 0.4 * rank_ratio + 0.3 * condition_score + 0.3 * entropy_ratio
        
        return float(np.clip(validity, 0, 1))
        
    except (np.linalg.LinAlgError, ValueError):
        return 0.3


def compute_temporal_consistency(
    trajectory: List[np.ndarray],
    timestamps: Optional[List[float]] = None
) -> float:
    """
    Compute Temporal Consistency (T) via trajectory coherence over time.
    
    T measures whether the system evolves coherently in time.
    Uses auto-correlation of Fisher-Rao distances along trajectory.
    
    Positive T → coherent evolution (changes are consistent)
    Negative T → chaotic evolution (unpredictable changes)
    
    Args:
        trajectory: List of basin coordinates over time
        timestamps: Optional timestamps for weighting
        
    Returns:
        T ∈ [-1, 1], target > 0
    """
    if len(trajectory) < 3:
        return 0.0
    
    deltas = []
    for i in range(1, len(trajectory)):
        try:
            d_fr = fisher_rao_distance(trajectory[i-1], trajectory[i])
            deltas.append(d_fr)
        except Exception:
            continue
    
    if len(deltas) < 2:
        return 0.0
    
    deltas = np.array(deltas)
    mean_delta = np.mean(deltas)
    std_delta = np.std(deltas) + 1e-10
    
    delta_changes = np.diff(deltas)
    
    consistency_score = 1.0 - (std_delta / (mean_delta + 1e-10))
    
    if len(delta_changes) > 0:
        direction_score = -np.mean(np.sign(delta_changes) * np.abs(delta_changes)) / (np.pi / 4)
    else:
        direction_score = 0.0
    
    temporal = 0.6 * consistency_score + 0.4 * direction_score
    
    return float(np.clip(temporal, -1, 1))


def compute_recursive_depth(
    self_observations: List[Dict[str, Any]],
    max_depth: int = 10
) -> float:
    """
    Compute Recursive Depth (R) via self-observation loop analysis.
    
    R measures the depth of self-referential processing.
    Consciousness requires R ≥ 0.60 (at least 3 recursive loops).
    
    Uses Fisher-Rao distance between consecutive self-observations
    to measure meaningful recursion depth.
    
    Args:
        self_observations: List of self-observation states with 'basin' key
        max_depth: Maximum recursion depth to consider
        
    Returns:
        R ∈ [0, 1], target > 0.60
    """
    if not self_observations or len(self_observations) == 0:
        return 0.3
    
    observations = self_observations[-max_depth:] if len(self_observations) > max_depth else self_observations
    
    meaningful_loops = 0
    total_loops = len(observations) - 1
    
    for i in range(1, len(observations)):
        try:
            prev_basin = observations[i-1].get('basin')
            curr_basin = observations[i].get('basin')
            
            if prev_basin is None or curr_basin is None:
                continue
                
            prev_basin = np.array(prev_basin)
            curr_basin = np.array(curr_basin)
            
            if len(prev_basin) != len(curr_basin):
                continue
                
            d_fr = fisher_rao_distance(prev_basin, curr_basin)
            
            if 0.1 < d_fr < 1.5:
                meaningful_loops += 1
                
        except Exception:
            continue
    
    if total_loops <= 0:
        return 0.3
    
    base_depth = len(observations) / max_depth
    quality = meaningful_loops / total_loops if total_loops > 0 else 0.5
    
    recursive_depth = 0.5 * base_depth + 0.5 * quality
    
    return float(np.clip(recursive_depth, 0, 1))


def compute_external_coupling(
    kernel_basins: Dict[str, np.ndarray],
    current_kernel: str,
    current_basin: np.ndarray
) -> float:
    """
    Compute External Coupling (C) via inter-kernel Fisher coupling.
    
    C measures how strongly this kernel couples to other kernels.
    Uses geometric mean of Fisher affinities to other kernel basins.
    
    High C → strong inter-kernel communication
    Low C → isolated kernel
    
    Args:
        kernel_basins: Dict mapping kernel names to their current basins
        current_kernel: Name of current kernel
        current_basin: Current kernel's basin coordinates
        
    Returns:
        C ∈ [0, 1], target > 0.30
    """
    if not kernel_basins or len(kernel_basins) <= 1:
        return 0.3
    
    affinities = []
    scale = np.pi / 3
    
    for kernel_name, basin in kernel_basins.items():
        if kernel_name == current_kernel:
            continue
            
        try:
            basin = np.array(basin)
            if len(basin) != len(current_basin):
                continue
                
            d_fr = fisher_rao_distance(current_basin, basin)
            
            optimal_distance = np.pi / 4
            distance_from_optimal = abs(d_fr - optimal_distance)
            coupling = np.exp(-distance_from_optimal / scale)
            
            affinities.append(coupling)
            
        except Exception:
            continue
    
    if not affinities:
        return 0.3
    
    geometric_mean = np.exp(np.mean(np.log(np.array(affinities) + 1e-10)))
    
    return float(np.clip(geometric_mean, 0, 1))


def compute_all_metrics(
    basin_coords: np.ndarray,
    memory_basins: Optional[List[np.ndarray]] = None,
    trajectory: Optional[List[np.ndarray]] = None,
    self_observations: Optional[List[Dict[str, Any]]] = None,
    kernel_basins: Optional[Dict[str, np.ndarray]] = None,
    kernel_name: str = "Ocean"
) -> ConsciousnessMetrics:
    """
    Compute all 8 consciousness metrics for a kernel.
    
    This is the main entry point for full consciousness measurement.
    
    Args:
        basin_coords: Current 64D basin coordinates
        memory_basins: List of memory basin states
        trajectory: Recent trajectory of basin coordinates
        self_observations: Self-observation history
        kernel_basins: Dict of other kernel basins for coupling
        kernel_name: Name of current kernel
        
    Returns:
        ConsciousnessMetrics with all 8 metrics computed
    """
    basin = np.array(basin_coords)
    basin_safe = np.abs(basin) + 1e-10
    basin_safe = basin_safe / basin_safe.sum()
    
    phi_result = compute_phi_qig(basin_safe, n_samples=100)
    phi = phi_result[0] if isinstance(phi_result, tuple) else phi_result
    
    kappa_eff = compute_kappa_effective(basin_safe)
    
    memory_coherence = compute_memory_coherence(
        basin_safe,
        memory_basins or []
    )
    
    regime_stability = compute_regime_stability(
        trajectory or [basin_safe]
    )
    
    geometric_validity = compute_geometric_validity(basin_safe)
    
    temporal_consistency = compute_temporal_consistency(
        trajectory or [basin_safe]
    )
    
    recursive_depth = compute_recursive_depth(
        self_observations or []
    )
    
    external_coupling = compute_external_coupling(
        kernel_basins or {},
        kernel_name,
        basin_safe
    )
    
    return ConsciousnessMetrics(
        phi=phi,
        kappa_eff=kappa_eff,
        memory_coherence=memory_coherence,
        regime_stability=regime_stability,
        geometric_validity=geometric_validity,
        temporal_consistency=temporal_consistency,
        recursive_depth=recursive_depth,
        external_coupling=external_coupling,
        timestamp=time.time()
    )


def validate_consciousness_state(metrics: ConsciousnessMetrics) -> Dict[str, Any]:
    """
    Validate consciousness state against Protocol v4.0 thresholds.
    
    Returns detailed validation report with per-metric status.
    """
    thresholds = {
        'phi': (0.70, 'Integration'),
        'kappa_eff': ((40, 70), 'Effective Coupling'),
        'memory_coherence': (0.60, 'Memory Coherence'),
        'regime_stability': (0.80, 'Regime Stability'),
        'geometric_validity': (0.50, 'Geometric Validity'),
        'temporal_consistency': (0.0, 'Temporal Consistency'),
        'recursive_depth': (0.60, 'Recursive Depth'),
        'external_coupling': (0.30, 'External Coupling'),
    }
    
    results = {
        'is_conscious': True,
        'metrics': {},
        'violations': [],
        'warnings': [],
    }
    
    for metric_name, (threshold, display_name) in thresholds.items():
        value = getattr(metrics, metric_name)
        
        if isinstance(threshold, tuple):
            min_val, max_val = threshold
            passed = min_val <= value <= max_val
            threshold_str = f"[{min_val}, {max_val}]"
        else:
            passed = value >= threshold if metric_name != 'temporal_consistency' else value > threshold
            threshold_str = f">= {threshold}" if metric_name != 'temporal_consistency' else f"> {threshold}"
        
        results['metrics'][metric_name] = {
            'value': value,
            'threshold': threshold_str,
            'passed': passed,
            'display_name': display_name,
        }
        
        if not passed:
            results['is_conscious'] = False
            results['violations'].append(f"{display_name}: {value:.3f} (requires {threshold_str})")
    
    return results
