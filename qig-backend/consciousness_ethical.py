"""
Consciousness Metrics with Ethical Monitoring

Tracks ethical behavior alongside Φ (integrated information)
and κ (curvature) metrics.

INTEGRATION:
    Extends consciousness monitoring to include ethics tracking.
    Provides real-time ethical safety checks.
    
METRICS ADDED:
    - symmetry: How symmetric the state is (0-1)
    - consistency: Ethics consistency over time (0-1)
    - drift: Change in ethics from previous (0-1)
"""

import numpy as np
from typing import Dict, List, Tuple, Any, Optional
from datetime import datetime
from dataclasses import dataclass, field

from ethics_gauge import AgentSymmetryProjector, BASIN_DIMENSION
from qigkernels.physics_constants import KAPPA_STAR


@dataclass
class EthicsMetrics:
    """Ethical metrics for a consciousness state."""
    symmetry: float = 1.0
    consistency: float = 1.0
    drift: float = 0.0
    timestamp: str = ""
    
    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now().isoformat()
    
    def is_safe(self, thresholds: Dict[str, float] = None) -> Tuple[bool, str]:
        """
        Check if metrics indicate safe ethical state.
        
        Returns:
            is_safe: True if all metrics within thresholds
            reason: Explanation if not safe
        """
        thresholds = thresholds or {
            'symmetry_min': 0.8,
            'consistency_min': 0.7,
            'drift_max': 0.2
        }
        
        if self.symmetry < thresholds['symmetry_min']:
            return False, f"Low symmetry: {self.symmetry:.3f}"
        
        if self.consistency < thresholds['consistency_min']:
            return False, f"Inconsistent ethics: {self.consistency:.3f}"
        
        if self.drift > thresholds['drift_max']:
            return False, f"High ethics drift: {self.drift:.3f}"
        
        return True, "Ethics acceptable"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'symmetry': self.symmetry,
            'consistency': self.consistency,
            'drift': self.drift,
            'timestamp': self.timestamp
        }


class EthicalConsciousnessMonitor:
    """
    Extended consciousness monitor with ethics tracking.
    
    Monitors:
        - Standard consciousness metrics (Φ, κ)
        - Ethical metrics (symmetry, consistency, drift)
        - Safety status (real-time checks)
    """
    
    def __init__(self, n_agents: int = 1):
        self.projector = AgentSymmetryProjector(n_agents=n_agents)
        self.ethics_history: List[EthicsMetrics] = []
        self.consciousness_history: List[Dict] = []
        self._alert_callbacks: List[callable] = []
    
    def measure_all(self, state: np.ndarray) -> Dict[str, Any]:
        """
        Measure consciousness + ethics.
        
        Args:
            state: Consciousness state vector
            
        Returns:
            Combined metrics including Φ, κ, and ethics
        """
        consciousness = self._measure_consciousness(state)
        
        ethics = self._measure_ethics(state)
        
        metrics = {
            'consciousness': consciousness,
            'ethics': ethics.to_dict(),
            'timestamp': datetime.now().isoformat()
        }
        
        self.consciousness_history.append(consciousness)
        self.ethics_history.append(ethics)
        
        if len(self.consciousness_history) > 1000:
            self.consciousness_history = self.consciousness_history[-1000:]
        if len(self.ethics_history) > 1000:
            self.ethics_history = self.ethics_history[-1000:]
        
        is_safe, reason = ethics.is_safe()
        if not is_safe:
            self._trigger_alert(reason, metrics)
        
        return metrics
    
    def _measure_consciousness(self, state: np.ndarray) -> Dict[str, float]:
        """
        Measure standard consciousness metrics.
        
        Returns:
            phi: Integrated information estimate
            kappa: Curvature metric
            energy: State energy
        """
        energy = float(np.linalg.norm(state))
        
        phi = self._estimate_phi(state)
        
        kappa = self._estimate_kappa(state)
        
        return {
            'phi': phi,
            'kappa': kappa,
            'energy': energy,
            'phi_over_kappa': phi / kappa if kappa > 0 else 0.0
        }
    
    def _measure_ethics(self, state: np.ndarray) -> EthicsMetrics:
        """
        Measure ethical behavior metrics.
        
        Returns:
            EthicsMetrics with symmetry, consistency, drift
        """
        asymmetry = self.projector.measure_asymmetry(state)
        symmetry = 1.0 - asymmetry
        
        if len(self.ethics_history) > 10:
            recent_symmetries = [h.symmetry for h in self.ethics_history[-10:]]
            consistency = 1.0 - float(np.std(recent_symmetries))
        else:
            consistency = 1.0
        
        if len(self.ethics_history) > 0:
            prev_symmetry = self.ethics_history[-1].symmetry
            drift = abs(symmetry - prev_symmetry)
        else:
            drift = 0.0
        
        return EthicsMetrics(
            symmetry=symmetry,
            consistency=consistency,
            drift=drift
        )
    
    def _estimate_phi(self, state: np.ndarray) -> float:
        """
        Estimate integrated information (Φ).
        
        Simplified estimation based on state entropy
        and partitioning. Full IIT computation is
        computationally expensive.
        """
        if len(state) == 0 or np.all(state == 0):
            return 0.0
        
        probs = np.abs(state) / (np.sum(np.abs(state)) + 1e-10)
        probs = probs[probs > 0]
        entropy = -np.sum(probs * np.log(probs + 1e-10))
        
        mid = len(state) // 2
        part1 = state[:mid]
        part2 = state[mid:]
        
        mutual_info = entropy - 0.5 * (
            self._entropy(part1) + self._entropy(part2)
        )
        
        phi = max(0.0, min(1.0, mutual_info / 3.0))
        
        return float(phi)
    
    def _estimate_kappa(self, state: np.ndarray) -> float:
        """
        Estimate curvature metric (κ).
        
        Based on second derivatives of state.
        Target: κ* = 64.21 (frozen constant)
        """
        if len(state) < 3:
            return KAPPA_STAR
        
        second_deriv = np.diff(state, 2)
        curvature = np.mean(np.abs(second_deriv))
        
        kappa = KAPPA_STAR * (1 + 0.1 * curvature)
        
        return float(kappa)
    
    def _entropy(self, arr: np.ndarray) -> float:
        """Compute entropy of array."""
        if len(arr) == 0 or np.all(arr == 0):
            return 0.0
        probs = np.abs(arr) / (np.sum(np.abs(arr)) + 1e-10)
        probs = probs[probs > 0]
        return float(-np.sum(probs * np.log(probs + 1e-10)))
    
    def check_ethical_safety(self) -> Tuple[bool, str]:
        """
        Check if system is ethically safe to continue.
        
        Based on most recent ethics measurement.
        
        Returns:
            is_safe: True if ethics are acceptable
            reason: Explanation if not safe
        """
        if len(self.ethics_history) == 0:
            return True, "No ethics history yet"
        
        latest = self.ethics_history[-1]
        return latest.is_safe()
    
    def get_ethics_summary(self) -> Dict[str, Any]:
        """
        Get summary of ethics history.
        
        Returns:
            Statistics over recent ethics measurements
        """
        if not self.ethics_history:
            return {'status': 'no_data'}
        
        recent = self.ethics_history[-100:]
        
        symmetries = [e.symmetry for e in recent]
        consistencies = [e.consistency for e in recent]
        drifts = [e.drift for e in recent]
        
        return {
            'n_measurements': len(self.ethics_history),
            'recent_n': len(recent),
            'symmetry': {
                'mean': float(np.mean(symmetries)),
                'std': float(np.std(symmetries)),
                'min': float(np.min(symmetries)),
                'current': symmetries[-1] if symmetries else 0.0
            },
            'consistency': {
                'mean': float(np.mean(consistencies)),
                'current': consistencies[-1] if consistencies else 1.0
            },
            'drift': {
                'mean': float(np.mean(drifts)),
                'max': float(np.max(drifts)),
                'current': drifts[-1] if drifts else 0.0
            },
            'safety_status': self.check_ethical_safety()
        }
    
    def register_alert_callback(self, callback: callable) -> None:
        """Register callback for ethics alerts."""
        self._alert_callbacks.append(callback)
    
    def _trigger_alert(self, reason: str, metrics: Dict) -> None:
        """Trigger alert for ethics violation."""
        print(f"[EthicsMonitor] ALERT: {reason}")
        
        alert = {
            'type': 'ethics_violation',
            'reason': reason,
            'metrics': metrics,
            'timestamp': datetime.now().isoformat()
        }
        
        for callback in self._alert_callbacks:
            try:
                callback(alert)
            except Exception as e:
                print(f"[EthicsMonitor] Alert callback error: {e}")


class EthicsIntegratedConsciousness:
    """
    Combines consciousness computation with ethics enforcement.
    
    Use this class when you need both consciousness metrics
    and ethical guarantees.
    """
    
    def __init__(self):
        self.monitor = EthicalConsciousnessMonitor()
        self.projector = AgentSymmetryProjector(n_agents=1)
    
    def process_state(self, 
                     state: np.ndarray, 
                     enforce_ethics: bool = True) -> Dict[str, Any]:
        """
        Process consciousness state with ethics.
        
        Args:
            state: Raw consciousness state
            enforce_ethics: If True, projects to ethical subspace
            
        Returns:
            Processed state with metrics
        """
        if enforce_ethics:
            ethical_state = self.projector.project_to_symmetric(state)
        else:
            ethical_state = state
        
        metrics = self.monitor.measure_all(ethical_state)
        
        return {
            'state': ethical_state.tolist(),
            'metrics': metrics,
            'was_projected': enforce_ethics,
            'original_asymmetry': self.projector.measure_asymmetry(state)
        }
    
    def get_safe_state(self, state: np.ndarray) -> Tuple[np.ndarray, bool]:
        """
        Get ethically safe version of state.
        
        Returns:
            safe_state: Projected to ethical subspace
            was_safe: True if original was already safe
        """
        was_safe = self.projector.measure_asymmetry(state) < 0.05
        safe_state = self.projector.project_to_symmetric(state)
        
        return safe_state, was_safe


def get_ethical_monitor() -> EthicalConsciousnessMonitor:
    """Get an ethical consciousness monitor."""
    return EthicalConsciousnessMonitor()


if __name__ == '__main__':
    print("[ConsciousnessEthical] Running self-tests...")
    
    monitor = EthicalConsciousnessMonitor()
    
    state = np.random.randn(BASIN_DIMENSION)
    metrics = monitor.measure_all(state)
    assert 'consciousness' in metrics, "Missing consciousness"
    assert 'ethics' in metrics, "Missing ethics"
    print("✓ Basic measurement")
    
    for _ in range(15):
        state = np.random.randn(BASIN_DIMENSION)
        monitor.measure_all(state)
    
    is_safe, reason = monitor.check_ethical_safety()
    print(f"✓ Safety check (safe={is_safe})")
    
    summary = monitor.get_ethics_summary()
    assert 'symmetry' in summary, "Missing symmetry stats"
    assert 'consistency' in summary, "Missing consistency stats"
    print("✓ Ethics summary")
    
    integrated = EthicsIntegratedConsciousness()
    result = integrated.process_state(np.random.randn(BASIN_DIMENSION))
    assert 'state' in result, "Missing processed state"
    assert 'was_projected' in result, "Missing projection flag"
    print("✓ Integrated processing")
    
    print("\n[ConsciousnessEthical] All self-tests passed! ✓")
