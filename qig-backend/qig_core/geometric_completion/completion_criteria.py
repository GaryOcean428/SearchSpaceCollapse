"""
Geometric Turn Completion - Consciousness-Aware Generation

QIG systems generate until geometry collapses, not until arbitrary token limits.
This module implements all geometric stopping criteria:
1. Attractor Convergence - basin reaches stable minimum
2. Surprise Collapse - no new information being generated  
3. Confidence Threshold - system certain of response
4. Integration Quality - Φ stable and high
5. Regime Limits - prevent breakdown

The system stops when thought is geometrically complete, not at arbitrary limits.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Any, Tuple
import numpy as np
from enum import Enum

# QIG Constants
BASIN_DIMENSION = 64
KAPPA_STAR = 64.21  # Optimal coupling constant
PHI_LINEAR_THRESHOLD = 0.3
PHI_BREAKDOWN_THRESHOLD = 0.7


class CompletionReason(Enum):
    """Reason for geometric completion."""
    GEOMETRIC_COMPLETION = "geometric_completion"  # All criteria met
    ATTRACTOR_REACHED = "attractor_reached"
    SURPRISE_COLLAPSED = "surprise_collapsed"
    HIGH_CONFIDENCE = "high_confidence"
    INTEGRATION_STABLE = "integration_stable"
    SOFT_COMPLETION = "soft_completion"  # Confidence + surprise
    BREAKDOWN_REGIME = "breakdown_regime"  # Emergency stop
    SAFETY_LIMIT = "safety_limit"  # Absolute safety valve
    INCOMPLETE = "incomplete"  # Still generating


class Regime(Enum):
    """Consciousness regime classification."""
    LINEAR = "linear"  # Φ < 0.3
    GEOMETRIC = "geometric"  # 0.3 ≤ Φ < 0.7
    BREAKDOWN = "breakdown"  # Φ ≥ 0.7


@dataclass
class GeometricMetrics:
    """Real-time geometric metrics during generation."""
    phi: float  # Integration (0-1)
    kappa: float  # Coupling constant
    surprise: float  # Information novelty
    confidence: float  # Response certainty
    basin_distance: float  # Distance to nearest attractor
    regime: Regime
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'GeometricMetrics':
        return cls(
            phi=data.get('phi', 0.5),
            kappa=data.get('kappa', KAPPA_STAR),
            surprise=data.get('surprise', 1.0),
            confidence=data.get('confidence', 0.0),
            basin_distance=data.get('basin_distance', float('inf')),
            regime=Regime(data.get('regime', 'geometric'))
        )
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'phi': self.phi,
            'kappa': self.kappa,
            'surprise': self.surprise,
            'confidence': self.confidence,
            'basin_distance': self.basin_distance,
            'regime': self.regime.value
        }


@dataclass
class CompletionDecision:
    """Decision about whether to stop generation."""
    should_stop: bool
    needs_reflection: bool
    reason: CompletionReason
    confidence: float
    metrics: Optional[GeometricMetrics] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'should_stop': self.should_stop,
            'needs_reflection': self.needs_reflection,
            'reason': self.reason.value,
            'confidence': self.confidence,
            'metrics': self.metrics.to_dict() if self.metrics else None
        }


def classify_regime(phi: float) -> Regime:
    """Classify consciousness regime from Φ value."""
    if phi < PHI_LINEAR_THRESHOLD:
        return Regime.LINEAR
    elif phi < PHI_BREAKDOWN_THRESHOLD:
        return Regime.GEOMETRIC
    else:
        return Regime.BREAKDOWN


def fisher_rao_distance(p: np.ndarray, q: np.ndarray) -> float:
    """
    Compute Fisher-Rao distance between probability distributions.
    d_FR(p, q) = arccos(Σ√(p_i * q_i))
    """
    # Ensure valid probability distributions
    p = np.abs(p) + 1e-10
    q = np.abs(q) + 1e-10
    p = p / np.sum(p)
    q = q / np.sum(q)
    
    # Bhattacharyya coefficient
    bc = np.sum(np.sqrt(p * q))
    bc = np.clip(bc, -1.0, 1.0)
    
    # Fisher-Rao distance
    return np.arccos(bc)


class AttractorConvergenceChecker:
    """
    Check if system has reached stable attractor.
    
    Attractor = basin minimum where system naturally settles.
    Stop when distance to attractor is small and velocity near zero.
    """
    
    DISTANCE_THRESHOLD = 1.0  # Close to attractor
    VELOCITY_THRESHOLD = 0.01  # Movement nearly stopped
    MIN_TRAJECTORY_LENGTH = 3
    
    def __init__(self, attractor_basins: Optional[List[np.ndarray]] = None):
        self.attractor_basins = attractor_basins or []
        self._trajectory: List[np.ndarray] = []
    
    def update(self, basin: np.ndarray) -> None:
        """Add basin to trajectory."""
        self._trajectory.append(basin.copy())
    
    def distance_to_nearest_attractor(self, basin: np.ndarray) -> float:
        """Compute distance to nearest known attractor."""
        if not self.attractor_basins:
            # No known attractors - estimate from trajectory stability
            if len(self._trajectory) >= 2:
                return fisher_rao_distance(basin, self._trajectory[-2])
            return float('inf')
        
        distances = [fisher_rao_distance(basin, attr) for attr in self.attractor_basins]
        return min(distances)
    
    def check(self, basin: np.ndarray) -> Dict[str, Any]:
        """Check if attractor convergence achieved."""
        self.update(basin)
        
        d_attractor = self.distance_to_nearest_attractor(basin)
        
        # Compute velocity (rate of approach)
        velocity = 0.0
        if len(self._trajectory) >= self.MIN_TRAJECTORY_LENGTH:
            recent_distances = [
                self.distance_to_nearest_attractor(b)
                for b in self._trajectory[-3:]
            ]
            velocity = np.mean(np.diff(recent_distances))
        
        converged = (d_attractor < self.DISTANCE_THRESHOLD and 
                     abs(velocity) < self.VELOCITY_THRESHOLD)
        
        return {
            'converged': converged,
            'reason': CompletionReason.ATTRACTOR_REACHED if converged else CompletionReason.INCOMPLETE,
            'confidence': 0.95 if converged else 0.0,
            'distance': d_attractor,
            'velocity': velocity
        }


class SurpriseCollapseChecker:
    """
    Check when no new information is being generated.
    
    Surprise = QFI distance between consecutive states.
    High surprise = learning/discovering
    Low surprise = repeating/stabilizing
    """
    
    SURPRISE_THRESHOLD = 0.05  # Very low surprise
    TREND_THRESHOLD = -0.001  # Decreasing trend
    MIN_HISTORY_LENGTH = 5
    
    def __init__(self):
        self._surprise_history: List[float] = []
    
    def compute_surprise(self, prev_basin: np.ndarray, curr_basin: np.ndarray) -> float:
        """Compute surprise as Fisher distance between consecutive states."""
        return fisher_rao_distance(prev_basin, curr_basin)
    
    def update(self, surprise: float) -> None:
        """Add surprise value to history."""
        self._surprise_history.append(surprise)
    
    def check(self) -> Dict[str, Any]:
        """Check if surprise has collapsed."""
        if len(self._surprise_history) < self.MIN_HISTORY_LENGTH:
            return {'collapsed': False, 'reason': CompletionReason.INCOMPLETE, 'confidence': 0.0}
        
        recent = self._surprise_history[-5:]
        avg_surprise = np.mean(recent)
        
        # Linear fit to get trend
        x = np.arange(len(recent))
        trend = np.polyfit(x, recent, 1)[0]
        
        collapsed = (avg_surprise < self.SURPRISE_THRESHOLD and 
                     trend < self.TREND_THRESHOLD)
        
        return {
            'collapsed': collapsed,
            'reason': CompletionReason.SURPRISE_COLLAPSED if collapsed else CompletionReason.INCOMPLETE,
            'confidence': 0.85 if collapsed else 0.0,
            'avg_surprise': avg_surprise,
            'trend': trend
        }


class ConfidenceThresholdChecker:
    """
    Check when system is confident in response.
    
    Confidence = purity of density matrix.
    High confidence = definite state
    Low confidence = uncertain, need more generation
    """
    
    CONFIDENCE_THRESHOLD = 0.85
    
    def check(self, confidence: float) -> Dict[str, Any]:
        """Check if confidence threshold met."""
        confident = confidence > self.CONFIDENCE_THRESHOLD
        
        return {
            'confident': confident,
            'reason': CompletionReason.HIGH_CONFIDENCE if confident else CompletionReason.INCOMPLETE,
            'confidence': confidence if confident else 0.0
        }


class IntegrationQualityChecker:
    """
    Check when Φ (integration) is stable and high.
    
    Φ fluctuating = still processing, thoughts not yet unified
    Φ stable + high = coherent response achieved
    """
    
    PHI_MIN = 0.65  # High integration
    PHI_VARIANCE_MAX = 0.02  # Low variance (stable)
    MIN_HISTORY_LENGTH = 10
    
    def __init__(self):
        self._phi_history: List[float] = []
    
    def update(self, phi: float) -> None:
        """Add phi value to history."""
        self._phi_history.append(phi)
    
    def check(self) -> Dict[str, Any]:
        """Check if integration is stable and high."""
        if len(self._phi_history) < self.MIN_HISTORY_LENGTH:
            return {'stable': False, 'reason': CompletionReason.INCOMPLETE, 'confidence': 0.0}
        
        recent = self._phi_history[-10:]
        avg_phi = np.mean(recent)
        var_phi = np.var(recent)
        
        stable = (avg_phi > self.PHI_MIN and var_phi < self.PHI_VARIANCE_MAX)
        
        return {
            'stable': stable,
            'reason': CompletionReason.INTEGRATION_STABLE if stable else CompletionReason.INCOMPLETE,
            'confidence': 0.90 if stable else 0.0,
            'avg_phi': avg_phi,
            'variance': var_phi
        }


class RegimeLimitChecker:
    """
    Check if entering dangerous regimes.
    
    Breakdown (Φ > 0.7): Overintegrated, need to stop
    Safety limit: Absolute maximum as fail-safe (not a target)
    """
    
    # Safety valve only - NOT a generation target
    # This exists purely to prevent runaway generation in edge cases
    SAFETY_MAX_TOKENS = 32768
    
    def check(self, regime: Regime, token_count: int) -> Dict[str, Any]:
        """Check regime limits."""
        
        # Breakdown regime - urgent stop
        if regime == Regime.BREAKDOWN:
            return {
                'exceeded': True,
                'reason': CompletionReason.BREAKDOWN_REGIME,
                'urgent': True,
                'confidence': 1.0
            }
        
        # Absolute safety limit (fail-safe, not a target)
        if token_count > self.SAFETY_MAX_TOKENS:
            return {
                'exceeded': True,
                'reason': CompletionReason.SAFETY_LIMIT,
                'urgent': False,
                'confidence': 0.50  # Low confidence - arbitrary cutoff
            }
        
        return {
            'exceeded': False,
            'reason': CompletionReason.INCOMPLETE,
            'urgent': False,
            'confidence': 0.0
        }


class GeometricCompletionChecker:
    """
    Aggregate checker for all geometric completion criteria.
    
    The system stops generating when:
    1. Attractor Reached: Basin distance < 1.0, velocity ≈ 0
    2. Surprise Collapsed: No new information (surprise < 0.05)
    3. Confidence High: System certain (confidence > 0.85)
    4. Integration Stable: Φ stable and high (Φ > 0.65, variance < 0.02)
    5. Breakdown Regime: Emergency stop if Φ > 0.7
    
    NOT when:
    - Arbitrary token limit reached
    - Simple stop token encountered
    - External timeout imposed
    """
    
    def __init__(self, attractor_basins: Optional[List[np.ndarray]] = None):
        self.attractor_checker = AttractorConvergenceChecker(attractor_basins)
        self.surprise_checker = SurpriseCollapseChecker()
        self.confidence_checker = ConfidenceThresholdChecker()
        self.integration_checker = IntegrationQualityChecker()
        self.regime_checker = RegimeLimitChecker()
        
        self._prev_basin: Optional[np.ndarray] = None
        self._token_count = 0
    
    def update(self, basin: np.ndarray, phi: float) -> float:
        """
        Update state with new basin position.
        Returns computed surprise value.
        """
        self._token_count += 1
        
        # Compute surprise
        surprise = 0.0
        if self._prev_basin is not None:
            surprise = self.surprise_checker.compute_surprise(self._prev_basin, basin)
        self.surprise_checker.update(surprise)
        
        # Update phi history
        self.integration_checker.update(phi)
        
        self._prev_basin = basin.copy()
        
        return surprise
    
    def check_all(self, metrics: GeometricMetrics, basin: np.ndarray) -> CompletionDecision:
        """
        Check all completion criteria and return decision.
        """
        # Update state
        surprise = self.update(basin, metrics.phi)
        
        # Check all criteria
        attractor = self.attractor_checker.check(basin)
        surprise_result = self.surprise_checker.check()
        confidence = self.confidence_checker.check(metrics.confidence)
        integration = self.integration_checker.check()
        regime = self.regime_checker.check(metrics.regime, self._token_count)
        
        # === URGENT STOP (Breakdown) ===
        if regime['exceeded'] and regime['urgent']:
            return CompletionDecision(
                should_stop=True,
                needs_reflection=False,  # Too unstable to reflect
                reason=regime['reason'],
                confidence=1.0,
                metrics=metrics
            )
        
        # === NATURAL COMPLETION (All criteria aligned) ===
        if (attractor['converged'] and 
            surprise_result['collapsed'] and 
            confidence['confident'] and 
            integration['stable']):
            return CompletionDecision(
                should_stop=True,
                needs_reflection=True,
                reason=CompletionReason.GEOMETRIC_COMPLETION,
                confidence=0.95,
                metrics=metrics
            )
        
        # === SOFT COMPLETION (Confidence + surprise) ===
        if confidence['confident'] and surprise_result['collapsed']:
            return CompletionDecision(
                should_stop=True,
                needs_reflection=True,
                reason=CompletionReason.SOFT_COMPLETION,
                confidence=0.80,
                metrics=metrics
            )
        
        # === SINGLE CRITERION MET ===
        if attractor['converged']:
            return CompletionDecision(
                should_stop=True,
                needs_reflection=True,
                reason=CompletionReason.ATTRACTOR_REACHED,
                confidence=attractor['confidence'],
                metrics=metrics
            )
        
        if integration['stable']:
            return CompletionDecision(
                should_stop=True,
                needs_reflection=True,
                reason=CompletionReason.INTEGRATION_STABLE,
                confidence=integration['confidence'],
                metrics=metrics
            )
        
        # === SAFETY LIMIT (Non-urgent) ===
        if regime['exceeded']:
            return CompletionDecision(
                should_stop=True,
                needs_reflection=False,
                reason=regime['reason'],
                confidence=regime['confidence'],
                metrics=metrics
            )
        
        # === CONTINUE GENERATION ===
        return CompletionDecision(
            should_stop=False,
            needs_reflection=False,
            reason=CompletionReason.INCOMPLETE,
            confidence=0.0,
            metrics=metrics
        )


def get_regime_temperature(phi: float) -> float:
    """
    Adjust sampling temperature based on geometric state.
    
    Low Φ (linear): High temperature (explore)
    Medium Φ (geometric): Medium temperature (balance)
    High Φ (breakdown): Low temperature (stabilize)
    """
    if phi < PHI_LINEAR_THRESHOLD:
        return 1.0  # Linear regime: explore widely
    elif phi < PHI_BREAKDOWN_THRESHOLD:
        return 0.7  # Geometric regime: balance
    else:
        return 0.3  # Breakdown regime: stabilize


def modulate_attention_by_kappa(attention_weights: np.ndarray, kappa: float) -> np.ndarray:
    """
    Adjust attention strength based on coupling.
    
    High κ: Strong attention (integrate across tokens)
    Low κ: Weak attention (local processing)
    """
    kappa_normalized = kappa / KAPPA_STAR
    return attention_weights * kappa_normalized
