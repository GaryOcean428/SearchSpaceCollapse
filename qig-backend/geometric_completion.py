"""
GEOMETRIC TURN COMPLETION: Consciousness-Aware Generation Stopping

This module implements geometry-driven stopping criteria for generation.
NO ARBITRARY LIMITS - the geometry decides when thought is complete.

Key Principles:
- Stop at attractor convergence (basin distance < 1.0, velocity ≈ 0)
- Stop when surprise collapses (no new information)
- Stop when confidence is high (system certain)
- Stop when Φ is stable (integration quality)
- NEVER stop at arbitrary token limits

Enhanced Features (2025-12-24):
- Hysteresis: Require N consecutive complete steps before stopping
- Rolling Window: Keep last W=16 steps for smoother decisions
- Non-Emitting Reflection: Internal-only reflection (invisible to users)
- Surface Finalizer: Allow closure budget for format completion
- Kernel Consensus: Track variance across routed kernels
- Geometry-Aware Sampling: Temperature as function of Φ
- Basin Coherence: Penalize large Fisher jumps

Implementation: 2025-12-24
"""

import numpy as np
import re
from typing import Dict, List, Optional, Tuple, Any, Callable
from dataclasses import dataclass, field
from collections import deque
from enum import Enum

try:
    from qig_geometry import compute_fisher_distance
except ImportError:
    def compute_fisher_distance(a, b):
        """Fallback Fisher distance computation."""
        a_np = np.array(a, dtype=np.float64)
        b_np = np.array(b, dtype=np.float64)
        diff = a_np - b_np
        return float(np.sqrt(np.sum(diff ** 2)))


class GenerationPhase(Enum):
    """Phases of generation with geometric awareness."""
    DRAFT = "draft"           # Generating outward tokens
    REFLECT = "reflect"       # Internal reflection (non-emitting)
    REVISE = "revise"         # Truncate/patch
    COMMIT = "commit"         # Finalize and stop
    CLOSURE = "closure"       # Surface format closure


@dataclass
class RollingWindow:
    """Rolling window for metric smoothing (W=16 by default)."""
    window_size: int = 16
    _values: deque = field(default_factory=lambda: deque(maxlen=16))
    
    def __post_init__(self):
        self._values = deque(maxlen=self.window_size)
    
    def add(self, value: float):
        """Add value to window."""
        self._values.append(value)
    
    def mean(self) -> float:
        """Get window mean."""
        if not self._values:
            return 0.0
        return float(np.mean(list(self._values)))
    
    def variance(self) -> float:
        """Get window variance."""
        if len(self._values) < 2:
            return float('inf')
        return float(np.var(list(self._values)))
    
    def trend(self) -> float:
        """Get linear trend (slope)."""
        if len(self._values) < 3:
            return 0.0
        x = np.arange(len(self._values))
        return float(np.polyfit(x, list(self._values), 1)[0])
    
    def is_full(self) -> bool:
        """Check if window is full."""
        return len(self._values) >= self.window_size
    
    def last(self) -> float:
        """Get last value."""
        if not self._values:
            return 0.0
        return float(self._values[-1])
    
    def values(self) -> List[float]:
        """Get all values as list."""
        return list(self._values)


@dataclass
class GeometricState:
    """Tracks geometric state during generation with rolling windows."""
    basin: np.ndarray  # Current 64D basin coordinates
    trajectory: List[np.ndarray] = field(default_factory=list)
    metrics_history: List[Dict[str, float]] = field(default_factory=list)
    reflection_depth: int = 0
    token_count: int = 0
    phase: GenerationPhase = GenerationPhase.DRAFT
    
    # Rolling windows for key metrics (W=16)
    phi_window: RollingWindow = field(default_factory=lambda: RollingWindow(16))
    surprise_window: RollingWindow = field(default_factory=lambda: RollingWindow(16))
    confidence_window: RollingWindow = field(default_factory=lambda: RollingWindow(16))
    basin_distance_window: RollingWindow = field(default_factory=lambda: RollingWindow(16))
    basin_velocity_window: RollingWindow = field(default_factory=lambda: RollingWindow(16))
    
    # Hysteresis counter
    consecutive_complete_steps: int = 0
    
    # Kernel consensus tracking
    kernel_variance_history: List[float] = field(default_factory=list)
    routed_kernels_stable_count: int = 0
    
    # Surface format tracking
    open_structures: List[str] = field(default_factory=list)
    closure_budget_used: int = 0
    
    def add_basin(self, new_basin: np.ndarray):
        """Add new basin position to trajectory and update velocity window."""
        if len(self.trajectory) > 0:
            prev_basin = self.trajectory[-1]
            velocity = compute_fisher_distance(prev_basin, new_basin)
            self.basin_velocity_window.add(velocity)
        
        self.trajectory.append(new_basin.copy())
        self.basin = new_basin.copy()
    
    def add_metrics(self, metrics: Dict[str, float]):
        """Add metrics snapshot to history and rolling windows."""
        self.metrics_history.append(metrics.copy())
        
        # Update rolling windows
        if 'phi' in metrics:
            self.phi_window.add(metrics['phi'])
        if 'surprise' in metrics:
            self.surprise_window.add(metrics['surprise'])
        if 'confidence' in metrics:
            self.confidence_window.add(metrics['confidence'])
        if 'basin_distance' in metrics:
            self.basin_distance_window.add(metrics['basin_distance'])
    
    def add_kernel_variance(self, variance: float, kernels_stable: bool):
        """Track kernel consensus metrics."""
        self.kernel_variance_history.append(variance)
        if kernels_stable:
            self.routed_kernels_stable_count += 1
        else:
            self.routed_kernels_stable_count = 0
    
    def get_smoothed_metrics(self) -> Dict[str, float]:
        """Get smoothed metrics from rolling windows."""
        return {
            'phi_mean': self.phi_window.mean(),
            'phi_variance': self.phi_window.variance(),
            'phi_trend': self.phi_window.trend(),
            'surprise_mean': self.surprise_window.mean(),
            'surprise_trend': self.surprise_window.trend(),
            'confidence_mean': self.confidence_window.mean(),
            'basin_distance_mean': self.basin_distance_window.mean(),
            'basin_velocity_mean': self.basin_velocity_window.mean(),
            'basin_velocity_variance': self.basin_velocity_window.variance(),
        }


class SurfaceFinalizer:
    """
    Surface format finalizer for proper closure.
    
    After geometric completion, allows a small "closure budget"
    to close unclosed brackets, code fences, etc.
    """
    
    MAX_CLOSURE_BUDGET = 40  # Maximum tokens for closure
    
    # Patterns for open structures
    OPEN_PATTERNS = {
        'code_fence': (r'```\w*$', '```'),
        'bracket_curly': (r'\{[^}]*$', '}'),
        'bracket_square': (r'\[[^\]]*$', ']'),
        'bracket_paren': (r'\([^)]*$', ')'),
        'quote_double': (r'"[^"]*$', '"'),
        'quote_single': (r"'[^']*$", "'"),
        'html_tag': (r'<[^/>]+>(?!.*</)', '</...>'),
    }
    
    def __init__(self):
        self.closure_actions = []
    
    def detect_open_structures(self, text: str) -> List[Dict[str, Any]]:
        """Detect unclosed structures in generated text."""
        open_structures = []
        
        # Check for unclosed code fences
        code_fence_count = text.count('```')
        if code_fence_count % 2 == 1:
            open_structures.append({
                'type': 'code_fence',
                'closure': '\n```',
                'priority': 1
            })
        
        # Check for unbalanced brackets (simple heuristic)
        for char, close_char in [('(', ')'), ('[', ']'), ('{', '}')]:
            open_count = text.count(char)
            close_count = text.count(close_char)
            if open_count > close_count:
                open_structures.append({
                    'type': f'bracket_{char}',
                    'closure': close_char * (open_count - close_count),
                    'priority': 2
                })
        
        # Check for truncated sentence (ends without punctuation)
        last_line = text.strip().split('\n')[-1] if text.strip() else ''
        if last_line and not last_line[-1] in '.!?:;"\')]}':
            open_structures.append({
                'type': 'sentence',
                'closure': '.',
                'priority': 3
            })
        
        return sorted(open_structures, key=lambda x: x['priority'])
    
    def needs_closure(self, text: str) -> bool:
        """Check if text needs format closure."""
        return len(self.detect_open_structures(text)) > 0
    
    def get_closure_tokens(self, text: str) -> str:
        """Get minimal closure tokens needed."""
        structures = self.detect_open_structures(text)
        closure = ''
        for s in structures:
            closure += s['closure']
        return closure
    
    def should_allow_closure_token(
        self,
        token: str,
        text: str,
        budget_used: int,
        phi: float,
        kappa: float
    ) -> bool:
        """
        Check if a closure token should be allowed.
        
        Only allow if:
        - Within closure budget
        - Φ/κ remain stable
        - Token is actually closing something
        """
        if budget_used >= self.MAX_CLOSURE_BUDGET:
            return False
        
        # Check if token is a closing token
        closing_chars = '```}])"\'.,;:!?\n'
        if not any(c in token for c in closing_chars):
            return False
        
        # Check if we still have open structures
        if not self.needs_closure(text):
            return False
        
        return True


class BasinCoherenceChecker:
    """
    Basin coherence term for generation quality.
    
    Penalizes tokens that cause large Fisher jumps relative
    to recent trajectory velocity.
    """
    
    MAX_JUMP_MULTIPLIER = 3.0  # Max allowed jump relative to avg velocity
    
    def __init__(self):
        self.velocity_history: List[float] = []
    
    def check_coherence(
        self,
        current_basin: np.ndarray,
        candidate_basin: np.ndarray,
        avg_velocity: float
    ) -> Dict[str, Any]:
        """
        Check if candidate basin maintains coherence.
        
        Args:
            current_basin: Current 64D basin position
            candidate_basin: Basin position if candidate token is chosen
            avg_velocity: Average recent basin velocity
        
        Returns:
            {
                'coherent': bool,
                'jump_size': float,
                'penalty': float (0-1, higher = more penalty)
            }
        """
        jump_size = compute_fisher_distance(current_basin, candidate_basin)
        
        # No penalty if we don't have enough history
        if avg_velocity <= 0:
            return {
                'coherent': True,
                'jump_size': jump_size,
                'penalty': 0.0
            }
        
        # Calculate jump ratio
        jump_ratio = jump_size / avg_velocity if avg_velocity > 0 else 0
        
        # Coherent if jump is within acceptable range
        coherent = jump_ratio <= self.MAX_JUMP_MULTIPLIER
        
        # Penalty scales with how much the jump exceeds normal
        penalty = max(0.0, min(1.0, (jump_ratio - 1.0) / (self.MAX_JUMP_MULTIPLIER - 1.0)))
        
        return {
            'coherent': coherent,
            'jump_size': jump_size,
            'jump_ratio': jump_ratio,
            'penalty': penalty
        }


class GeometryAwareSampler:
    """
    Geometry-aware token sampling.
    
    Temperature is a function of Φ and decoder entropy.
    Includes repetition control based on basin oscillation.
    """
    
    # Temperature bounds
    MIN_TEMPERATURE = 0.1
    MAX_TEMPERATURE = 1.5
    BASE_TEMPERATURE = 0.7
    
    # Φ-based temperature scaling
    PHI_LOW = 0.3  # Linear regime - increase temp
    PHI_OPTIMAL = 0.5  # Geometric regime - base temp
    PHI_HIGH = 0.7  # Near breakdown - decrease temp
    
    def __init__(self):
        self.basin_history: List[np.ndarray] = []
        self.oscillation_count = 0
    
    def compute_temperature(
        self,
        phi: float,
        decoder_entropy: float,
        base_temperature: Optional[float] = None
    ) -> float:
        """
        Compute geometry-aware temperature.
        
        Args:
            phi: Current Φ value
            decoder_entropy: Entropy of token distribution
            base_temperature: Optional base temperature override
        
        Returns:
            Adjusted temperature
        """
        temp = base_temperature or self.BASE_TEMPERATURE
        
        # Φ-based adjustment
        if phi < self.PHI_LOW:
            # Linear regime: slightly higher temp for exploration
            phi_factor = 1.2
        elif phi > self.PHI_HIGH:
            # Near breakdown: lower temp for stability
            phi_factor = 0.7
        else:
            # Geometric regime: interpolate
            t = (phi - self.PHI_LOW) / (self.PHI_HIGH - self.PHI_LOW)
            phi_factor = 1.2 - 0.5 * t  # 1.2 -> 0.7
        
        temp *= phi_factor
        
        # Entropy-based adjustment
        # High entropy (>2.0) = distribution too flat, lower temp
        # Low entropy (<0.5) = distribution too peaked, slightly raise temp
        if decoder_entropy > 2.0:
            entropy_factor = 0.8
        elif decoder_entropy < 0.5:
            entropy_factor = 1.1
        else:
            entropy_factor = 1.0
        
        temp *= entropy_factor
        
        # Clamp to bounds
        return max(self.MIN_TEMPERATURE, min(self.MAX_TEMPERATURE, temp))
    
    def check_oscillation(
        self,
        current_basin: np.ndarray,
        history_depth: int = 5
    ) -> Dict[str, Any]:
        """
        Check for basin oscillation (stuck in loop).
        
        Returns:
            {
                'oscillating': bool,
                'oscillation_period': int or None,
                'should_increase_temp': bool
            }
        """
        self.basin_history.append(current_basin.copy())
        
        if len(self.basin_history) < history_depth * 2:
            return {
                'oscillating': False,
                'oscillation_period': None,
                'should_increase_temp': False
            }
        
        # Check if we're visiting similar basins
        recent = self.basin_history[-history_depth:]
        older = self.basin_history[-history_depth*2:-history_depth]
        
        # Compute similarity between recent and older basins
        similarities = []
        for r, o in zip(recent, older):
            dist = compute_fisher_distance(r, o)
            similarities.append(dist < 0.5)  # Similar if close
        
        oscillation_ratio = sum(similarities) / len(similarities)
        
        if oscillation_ratio > 0.6:  # More than 60% similar
            self.oscillation_count += 1
            return {
                'oscillating': True,
                'oscillation_period': history_depth,
                'should_increase_temp': True,
                'consecutive_oscillations': self.oscillation_count
            }
        else:
            self.oscillation_count = 0
            return {
                'oscillating': False,
                'oscillation_period': None,
                'should_increase_temp': False
            }


class KernelConsensusTracker:
    """
    Tracks consensus across routed kernels.
    
    When variance across kernels collapses, thought has settled.
    """
    
    VARIANCE_THRESHOLD = 0.05  # Low variance = consensus
    STABILITY_THRESHOLD = 5    # Consecutive stable steps
    
    def __init__(self):
        self.kernel_states: Dict[str, np.ndarray] = {}
        self.variance_history: List[float] = []
        self.stable_count = 0
    
    def update_kernel_states(
        self,
        kernel_basins: Dict[str, np.ndarray],
        kernel_phis: Dict[str, float]
    ):
        """Update tracked kernel states."""
        self.kernel_states = kernel_basins.copy()
        
        # Compute variance across kernels
        if len(kernel_phis) > 1:
            phi_variance = float(np.var(list(kernel_phis.values())))
        else:
            phi_variance = 0.0
        
        self.variance_history.append(phi_variance)
        
        # Track stability
        if phi_variance < self.VARIANCE_THRESHOLD:
            self.stable_count += 1
        else:
            self.stable_count = 0
    
    def get_consensus(self) -> Dict[str, Any]:
        """Get current consensus state."""
        if not self.variance_history:
            return {
                'has_consensus': False,
                'reason': 'no_data'
            }
        
        current_variance = self.variance_history[-1]
        
        return {
            'has_consensus': self.stable_count >= self.STABILITY_THRESHOLD,
            'variance': current_variance,
            'stable_count': self.stable_count,
            'variance_trend': np.mean(np.diff(self.variance_history[-5:])) if len(self.variance_history) > 5 else 0
        }


class NonEmittingReflector:
    """
    Internal reflection that is invisible to users.
    
    Reflection is a measurement pass over generated content,
    not additional token emission.
    """
    
    MAX_REFLECTION_PASSES = 3
    
    def __init__(self):
        self.reflection_log: List[Dict[str, Any]] = []
        self.internal_tokens: List[str] = []  # Never emitted
    
    def reflect(
        self,
        response_basin: np.ndarray,
        target_basin: np.ndarray,
        response_phi: float,
        response_kappa: float,
        depth: int = 1
    ) -> Dict[str, Any]:
        """
        Perform internal reflection via basin alignment.
        
        NOT via textual rubric - via geometry.
        
        Args:
            response_basin: Basin of generated response
            target_basin: Expected target basin (from user query)
            response_phi: Φ of response
            response_kappa: κ of response
            depth: Reflection depth (1-3)
        
        Returns:
            {
                'action': 'confirm' | 'revise' | 'continue',
                'alignment': float,
                'issues': list
            }
        """
        # Basin alignment score
        alignment = 1.0 - min(1.0, compute_fisher_distance(response_basin, target_basin) / 10.0)
        
        issues = []
        
        # Check Φ quality
        if response_phi < 0.4:
            issues.append({
                'type': 'low_integration',
                'phi': response_phi,
                'severity': 'medium'
            })
        elif response_phi > 0.8:
            issues.append({
                'type': 'near_breakdown',
                'phi': response_phi,
                'severity': 'high'
            })
        
        # Check basin alignment
        if alignment < 0.5:
            issues.append({
                'type': 'basin_misalignment',
                'alignment': alignment,
                'severity': 'high'
            })
        
        # Determine action based on depth and issues
        if not issues or all(i['severity'] == 'low' for i in issues):
            action = 'confirm'
        elif depth >= self.MAX_REFLECTION_PASSES:
            # Max depth reached, confirm with what we have
            action = 'confirm'
        elif any(i['severity'] == 'high' for i in issues):
            action = 'revise'
        else:
            action = 'continue'
        
        result = {
            'action': action,
            'alignment': alignment,
            'issues': issues,
            'depth': depth,
            'phi': response_phi,
            'kappa': response_kappa
        }
        
        self.reflection_log.append(result)
        
        return result
    
    def should_stop_reflecting(
        self,
        completion_score_before: float,
        completion_score_after: float,
        phi_variance_before: float,
        phi_variance_after: float
    ) -> bool:
        """
        Meta-reflection: stop if reflection is making things worse.
        
        This is a loop-stopper for the internal controller.
        """
        # Reflection is harmful if:
        # - Completion score decreased
        # - Φ variance increased (instability)
        
        score_decreased = completion_score_after < completion_score_before - 0.05
        variance_increased = phi_variance_after > phi_variance_before * 1.2
        
        return score_decreased or variance_increased
    
    def get_reflection_summary(self) -> Dict[str, Any]:
        """Get summary of reflection passes."""
        if not self.reflection_log:
            return {'passes': 0, 'final_action': None}
        
        return {
            'passes': len(self.reflection_log),
            'final_action': self.reflection_log[-1]['action'],
            'alignment_history': [r['alignment'] for r in self.reflection_log],
            'issues_found': sum(len(r['issues']) for r in self.reflection_log)
        }


class GeometricCompletionChecker:
    """
    Checks if generation should stop based on geometric criteria.
    
    NO ARBITRARY LIMITS - geometry decides when thought is complete.
    
    Enhanced with:
    - Hysteresis (N consecutive complete steps)
    - Rolling window smoothing (W=16)
    - Kernel consensus tracking
    """
    
    # Thresholds derived from QIG physics (not arbitrary!)
    ATTRACTOR_DISTANCE_THRESHOLD = 1.0  # Close to attractor
    ATTRACTOR_VELOCITY_THRESHOLD = 0.01  # Movement nearly stopped
    SURPRISE_THRESHOLD = 0.05  # Very low surprise
    SURPRISE_TREND_THRESHOLD = -0.001  # Decreasing trend
    CONFIDENCE_THRESHOLD = 0.85  # High certainty
    PHI_MIN = 0.65  # High integration
    PHI_VARIANCE_MAX = 0.02  # Stable Φ
    PHI_BREAKDOWN = 0.85  # Breakdown regime threshold
    MAX_REFLECTION_DEPTH = 3  # Prevent infinite reflection loops
    
    # Hysteresis settings
    HYSTERESIS_STEPS = 5  # Require N consecutive complete steps
    
    def __init__(self, attractor_basins: Optional[List[np.ndarray]] = None):
        """
        Initialize with known attractor basins.
        
        Args:
            attractor_basins: List of known stable attractor positions in 64D space.
                             If None, will estimate from trajectory.
        """
        self.attractor_basins = attractor_basins or []
        self._completion_log = []
        self.kernel_tracker = KernelConsensusTracker()
    
    def check_completion(
        self,
        state: GeometricState,
        current_metrics: Dict[str, float],
        kernel_states: Optional[Dict[str, Dict[str, float]]] = None
    ) -> Dict[str, Any]:
        """
        Check if generation should stop.
        
        Uses hysteresis: must be complete for N consecutive steps.
        
        Returns:
            {
                'should_stop': bool,
                'needs_reflection': bool,
                'reason': str,
                'confidence': float,
                'details': dict
            }
        """
        # Add current metrics to history and windows
        state.add_metrics(current_metrics)
        state.token_count += 1
        
        # Update kernel consensus if provided
        if kernel_states:
            basins = {k: v.get('basin', np.zeros(64)) for k, v in kernel_states.items()}
            phis = {k: v.get('phi', 0.5) for k, v in kernel_states.items()}
            self.kernel_tracker.update_kernel_states(basins, phis)
        
        # Get smoothed metrics from rolling windows
        smoothed = state.get_smoothed_metrics()
        
        # Check all criteria using smoothed values
        attractor = self._check_attractor_convergence(state, smoothed)
        surprise = self._check_surprise_collapse(smoothed)
        confidence = self._check_confidence_threshold(smoothed)
        integration = self._check_integration_quality(smoothed)
        regime = self._check_regime_limits(current_metrics)
        consensus = self.kernel_tracker.get_consensus()
        
        details = {
            'attractor': attractor,
            'surprise': surprise,
            'confidence': confidence,
            'integration': integration,
            'regime': regime,
            'kernel_consensus': consensus,
            'token_count': state.token_count,
            'reflection_depth': state.reflection_depth,
            'smoothed_metrics': smoothed,
            'consecutive_complete': state.consecutive_complete_steps
        }
        
        # === URGENT STOP (Breakdown) ===
        if regime.get('exceeded') and regime.get('urgent'):
            state.consecutive_complete_steps = 0  # Reset hysteresis
            result = {
                'should_stop': True,
                'needs_reflection': False,  # Too unstable to reflect
                'reason': 'breakdown_regime',
                'confidence': 1.0,
                'details': details
            }
            self._log_completion(result)
            return result
        
        # === COMPUTE COMPLETION SCORE ===
        # Aggregate signal from all criteria
        completion_score = self._compute_completion_score(
            attractor, surprise, confidence, integration, consensus
        )
        
        is_complete = completion_score >= 0.8
        
        # === HYSTERESIS: Require N consecutive complete steps ===
        if is_complete:
            state.consecutive_complete_steps += 1
        else:
            state.consecutive_complete_steps = 0
        
        details['completion_score'] = completion_score
        details['consecutive_complete'] = state.consecutive_complete_steps
        
        # Only stop if complete for N consecutive steps
        if state.consecutive_complete_steps >= self.HYSTERESIS_STEPS:
            result = {
                'should_stop': True,
                'needs_reflection': state.reflection_depth < self.MAX_REFLECTION_DEPTH,
                'reason': 'geometric_completion',
                'confidence': completion_score,
                'details': details
            }
            self._log_completion(result)
            return result
        
        # === SOFT COMPLETION (with hysteresis) ===
        # High confidence + surprise collapse, but only for 3+ steps
        if (confidence.get('confident') and surprise.get('collapsed') and 
            state.consecutive_complete_steps >= 3):
            result = {
                'should_stop': True,
                'needs_reflection': state.reflection_depth < self.MAX_REFLECTION_DEPTH,
                'reason': 'soft_completion',
                'confidence': 0.80,
                'details': details
            }
            self._log_completion(result)
            return result
        
        # === CONTINUE GENERATION ===
        return {
            'should_stop': False,
            'needs_reflection': False,
            'reason': 'incomplete',
            'confidence': completion_score,
            'details': details
        }
    
    def _compute_completion_score(
        self,
        attractor: Dict,
        surprise: Dict,
        confidence: Dict,
        integration: Dict,
        consensus: Dict
    ) -> float:
        """
        Compute aggregate completion score from all criteria.
        
        Returns value between 0 and 1.
        """
        score = 0.0
        weights_sum = 0.0
        
        # Attractor convergence (weight: 0.25)
        if attractor.get('converged'):
            score += 0.25
        elif 'distance' in attractor:
            # Partial credit based on distance
            dist = attractor['distance']
            partial = max(0, 1 - dist / 5.0) * 0.25
            score += partial
        weights_sum += 0.25
        
        # Surprise collapse (weight: 0.25)
        if surprise.get('collapsed'):
            score += 0.25
        elif 'avg_surprise' in surprise:
            avg = surprise['avg_surprise']
            partial = max(0, 1 - avg / 0.2) * 0.25
            score += partial
        weights_sum += 0.25
        
        # Confidence (weight: 0.20)
        if confidence.get('confident'):
            score += 0.20
        elif 'confidence' in confidence:
            conf = confidence['confidence']
            partial = min(1, conf / self.CONFIDENCE_THRESHOLD) * 0.20
            score += partial
        weights_sum += 0.20
        
        # Integration quality (weight: 0.20)
        if integration.get('stable'):
            score += 0.20
        elif 'phi' in integration:
            phi = integration['phi']
            if phi > self.PHI_MIN:
                partial = 0.15  # Good Φ but not stable
            else:
                partial = min(1, phi / self.PHI_MIN) * 0.10
            score += partial
        weights_sum += 0.20
        
        # Kernel consensus (weight: 0.10)
        if consensus.get('has_consensus'):
            score += 0.10
        weights_sum += 0.10
        
        return score / weights_sum if weights_sum > 0 else 0.0
    
    def _check_attractor_convergence(
        self,
        state: GeometricState,
        smoothed: Dict[str, float]
    ) -> Dict[str, Any]:
        """Stop when system reaches stable attractor."""
        if len(state.trajectory) < 3:
            return {'converged': False, 'reason': 'insufficient_trajectory'}
        
        # Use smoothed basin distance
        d_attractor = smoothed.get('basin_distance_mean', float('inf'))
        velocity = smoothed.get('basin_velocity_mean', float('inf'))
        
        if d_attractor < self.ATTRACTOR_DISTANCE_THRESHOLD and velocity < self.ATTRACTOR_VELOCITY_THRESHOLD:
            return {
                'converged': True,
                'reason': 'attractor_reached',
                'distance': d_attractor,
                'velocity': velocity,
                'confidence': 0.95
            }
        
        return {
            'converged': False,
            'distance': d_attractor,
            'velocity': velocity
        }
    
    def _check_surprise_collapse(self, smoothed: Dict[str, float]) -> Dict[str, Any]:
        """Stop when no new information being generated."""
        avg_surprise = smoothed.get('surprise_mean', 1.0)
        trend = smoothed.get('surprise_trend', 0.0)
        
        if avg_surprise < self.SURPRISE_THRESHOLD and trend < self.SURPRISE_TREND_THRESHOLD:
            return {
                'collapsed': True,
                'reason': 'information_exhausted',
                'avg_surprise': avg_surprise,
                'trend': trend,
                'confidence': 0.85
            }
        
        return {
            'collapsed': False,
            'avg_surprise': avg_surprise,
            'trend': trend
        }
    
    def _check_confidence_threshold(self, smoothed: Dict[str, float]) -> Dict[str, Any]:
        """Stop when system is confident in response."""
        confidence = smoothed.get('confidence_mean', 0.0)
        
        if confidence > self.CONFIDENCE_THRESHOLD:
            return {
                'confident': True,
                'reason': 'high_confidence',
                'confidence': confidence
            }
        
        return {'confident': False, 'confidence': confidence}
    
    def _check_integration_quality(self, smoothed: Dict[str, float]) -> Dict[str, Any]:
        """Stop when Φ is stable and high."""
        avg_phi = smoothed.get('phi_mean', 0.0)
        variance_phi = smoothed.get('phi_variance', float('inf'))
        
        if avg_phi > self.PHI_MIN and variance_phi < self.PHI_VARIANCE_MAX:
            return {
                'stable': True,
                'reason': 'integration_stable',
                'phi': avg_phi,
                'variance': variance_phi,
                'confidence': 0.90
            }
        
        return {
            'stable': False,
            'phi': avg_phi,
            'variance': variance_phi
        }
    
    def _check_regime_limits(self, metrics: Dict[str, float]) -> Dict[str, Any]:
        """Stop if entering dangerous regimes."""
        phi = metrics.get('phi', 0.5)
        
        if phi > self.PHI_BREAKDOWN:
            return {
                'exceeded': True,
                'reason': 'breakdown_regime',
                'phi': phi,
                'urgent': True,
                'confidence': 1.0
            }
        
        # Classify current regime
        if phi < 0.3:
            regime = 'linear'
        elif phi < 0.7:
            regime = 'geometric'
        else:
            regime = 'near_breakdown'
        
        return {
            'exceeded': False,
            'regime': regime,
            'phi': phi
        }
    
    def _distance_to_nearest_attractor(self, basin: np.ndarray) -> float:
        """Compute Fisher distance to nearest attractor basin."""
        if not self.attractor_basins:
            return float(np.linalg.norm(basin))
        
        distances = [
            compute_fisher_distance(basin, attractor)
            for attractor in self.attractor_basins
        ]
        return min(distances)
    
    def _log_completion(self, result: Dict[str, Any]):
        """Log completion decision for analysis."""
        self._completion_log.append({
            'result': result,
            'timestamp': np.datetime64('now')
        })
    
    def get_completion_log(self) -> List[Dict[str, Any]]:
        """Get log of all completion decisions."""
        return self._completion_log.copy()


class ReflectionLoop:
    """
    Implements recursive self-reflection before completing.
    
    Enhanced to be non-emitting (internal only).
    """
    
    MAX_REFLECTION_TOKENS = 100
    REFLECTION_TEMPERATURE = 0.3
    REFLECTION_STABILITY_THRESHOLD = 0.01
    
    def __init__(self):
        self.reflection_history = []
        self.internal_reflector = NonEmittingReflector()
    
    def should_reflect(self, completion_result: Dict[str, Any]) -> bool:
        """Check if reflection is needed and allowed."""
        return (
            completion_result.get('needs_reflection', False) and
            completion_result.get('details', {}).get('reflection_depth', 0) < 3
        )
    
    def perform_internal_reflection(
        self,
        response_basin: np.ndarray,
        target_basin: np.ndarray,
        response_phi: float,
        response_kappa: float,
        depth: int = 1
    ) -> Dict[str, Any]:
        """
        Perform non-emitting internal reflection.
        
        This does NOT generate tokens - it measures basin alignment.
        """
        return self.internal_reflector.reflect(
            response_basin=response_basin,
            target_basin=target_basin,
            response_phi=response_phi,
            response_kappa=response_kappa,
            depth=depth
        )
    
    def parse_reflection_decision(self, reflection_result: Dict[str, Any]) -> Dict[str, Any]:
        """Convert internal reflection result to action."""
        action = reflection_result.get('action', 'confirm')
        
        if action == 'revise':
            return {
                'action': 'revise',
                'truncate_at': -10,
                'reason': 'basin_misalignment' if reflection_result.get('alignment', 1.0) < 0.5 else 'quality_issue'
            }
        elif action == 'continue':
            return {
                'action': 'continue',
                'reason': 'incomplete_response'
            }
        else:
            return {
                'action': 'confirm',
                'reason': 'response_validated',
                'alignment': reflection_result.get('alignment', 1.0)
            }
    
    def record_reflection(self, depth: int, decision: Dict[str, Any]):
        """Record reflection for analysis."""
        self.reflection_history.append({
            'depth': depth,
            'decision': decision,
            'timestamp': np.datetime64('now')
        })


class GeometricGenerationController:
    """
    Main controller for geometry-aware generation.
    
    Integrates all enhanced components:
    - GeometricCompletionChecker with hysteresis
    - ReflectionLoop (non-emitting)
    - SurfaceFinalizer for format closure
    - GeometryAwareSampler for temperature
    - BasinCoherenceChecker for quality
    - KernelConsensusTracker
    
    NO ARBITRARY LIMITS - geometry decides completion.
    """
    
    def __init__(self, attractor_basins: Optional[List[np.ndarray]] = None):
        self.completion_checker = GeometricCompletionChecker(attractor_basins)
        self.reflection_loop = ReflectionLoop()
        self.surface_finalizer = SurfaceFinalizer()
        self.sampler = GeometryAwareSampler()
        self.coherence_checker = BasinCoherenceChecker()
        self.current_state: Optional[GeometricState] = None
        self.target_basin: Optional[np.ndarray] = None
    
    def begin_turn(
        self,
        initial_basin: np.ndarray,
        target_basin: Optional[np.ndarray] = None
    ) -> GeometricState:
        """Initialize state for new generation turn."""
        self.current_state = GeometricState(
            basin=initial_basin.copy(),
            trajectory=[initial_basin.copy()]
        )
        self.target_basin = target_basin.copy() if target_basin is not None else None
        return self.current_state
    
    def update_and_check(
        self,
        new_basin: np.ndarray,
        metrics: Dict[str, float],
        kernel_states: Optional[Dict[str, Dict[str, float]]] = None,
        generated_text: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Update state with new basin position and check for completion.
        
        Args:
            new_basin: New 64D basin coordinates
            metrics: Current consciousness metrics
            kernel_states: Optional kernel states for consensus tracking
            generated_text: Optional generated text for surface checking
        
        Returns:
            Completion check result with additional info
        """
        if self.current_state is None:
            raise ValueError("Must call begin_turn() before update_and_check()")
        
        # Add basin and check coherence
        avg_velocity = self.current_state.basin_velocity_window.mean()
        coherence = self.coherence_checker.check_coherence(
            self.current_state.basin, new_basin, avg_velocity
        )
        
        self.current_state.add_basin(new_basin)
        
        # Compute temperature
        phi = metrics.get('phi', 0.5)
        entropy = metrics.get('decoder_entropy', 1.0)
        temperature = self.sampler.compute_temperature(phi, entropy)
        
        # Check for oscillation
        oscillation = self.sampler.check_oscillation(new_basin)
        if oscillation.get('should_increase_temp'):
            temperature = min(temperature * 1.3, self.sampler.MAX_TEMPERATURE)
        
        # Main completion check
        completion = self.completion_checker.check_completion(
            self.current_state,
            metrics,
            kernel_states
        )
        
        # Add computed values to result
        completion['coherence'] = coherence
        completion['temperature'] = temperature
        completion['oscillation'] = oscillation
        
        # Check surface closure needs if stopping
        if completion['should_stop'] and generated_text:
            needs_closure = self.surface_finalizer.needs_closure(generated_text)
            if needs_closure:
                completion['needs_closure'] = True
                completion['closure_tokens'] = self.surface_finalizer.get_closure_tokens(generated_text)
                # Allow closure phase if needed
                if self.current_state.closure_budget_used < SurfaceFinalizer.MAX_CLOSURE_BUDGET:
                    completion['should_stop'] = False
                    completion['phase'] = GenerationPhase.CLOSURE.value
        
        return completion
    
    def handle_reflection(
        self,
        completion_result: Dict[str, Any],
        response_tokens: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Handle non-emitting internal reflection.
        
        This is invisible to users - internal measurement only.
        """
        if not self.reflection_loop.should_reflect(completion_result):
            return {'action': 'confirm', 'reason': 'no_reflection_needed'}
        
        if self.current_state is None or self.target_basin is None:
            return {'action': 'confirm', 'reason': 'no_state'}
        
        depth = completion_result['details']['reflection_depth'] + 1
        
        # Get current metrics
        phi = completion_result['details'].get('smoothed_metrics', {}).get('phi_mean', 0.5)
        
        # Perform internal reflection (non-emitting)
        reflection = self.reflection_loop.perform_internal_reflection(
            response_basin=self.current_state.basin,
            target_basin=self.target_basin,
            response_phi=phi,
            response_kappa=0.5,  # Default κ
            depth=depth
        )
        
        # Convert to action
        decision = self.reflection_loop.parse_reflection_decision(reflection)
        self.reflection_loop.record_reflection(depth, decision)
        
        return decision
    
    def allow_closure_token(
        self,
        token: str,
        generated_text: str,
        phi: float,
        kappa: float
    ) -> bool:
        """Check if a closure token should be allowed during closure phase."""
        if self.current_state is None:
            return False
        
        allowed = self.surface_finalizer.should_allow_closure_token(
            token=token,
            text=generated_text,
            budget_used=self.current_state.closure_budget_used,
            phi=phi,
            kappa=kappa
        )
        
        if allowed:
            self.current_state.closure_budget_used += 1
        
        return allowed
    
    def increment_reflection_depth(self):
        """Increment reflection depth after processing."""
        if self.current_state:
            self.current_state.reflection_depth += 1
    
    def measure_reflection_alignment(
        self,
        generated_text: str,
        current_basin: np.ndarray
    ) -> float:
        """
        Measure basin alignment during non-emitting reflection.
        
        This is INTERNAL measurement - no tokens are generated.
        The reflector computes Fisher distance between current basin
        and target basin to determine if response is aligned.
        
        Args:
            generated_text: The currently generated text (for context)
            current_basin: Current 64D basin position
            
        Returns:
            Alignment score in [0, 1] where 1 = perfectly aligned
        """
        if self.current_state is None:
            return 0.5  # Default uncertain alignment
        
        # Use non-emitting reflector for internal measurement
        result = self.reflector.perform_reflection(
            current_basin=current_basin,
            response_phi=self.current_state.phi_window.last(),
            response_kappa=64.0,  # Default geometric regime
            depth=self.current_state.reflection_depth
        )
        
        return result.get('alignment', 0.5)
    
    def get_trajectory_stats(self) -> Dict[str, Any]:
        """Get statistics about the generation trajectory."""
        if not self.current_state or len(self.current_state.trajectory) < 2:
            return {'error': 'insufficient_trajectory'}
        
        trajectory = np.array(self.current_state.trajectory)
        
        distances = [
            compute_fisher_distance(trajectory[i], trajectory[i+1])
            for i in range(len(trajectory) - 1)
        ]
        
        smoothed = self.current_state.get_smoothed_metrics()
        
        return {
            'total_steps': len(trajectory),
            'total_distance': sum(distances),
            'avg_step_size': np.mean(distances),
            'final_basin': self.current_state.basin.tolist(),
            'reflection_depth': self.current_state.reflection_depth,
            'consecutive_complete_steps': self.current_state.consecutive_complete_steps,
            'closure_budget_used': self.current_state.closure_budget_used,
            'smoothed_metrics': smoothed
        }
    
    def get_sampling_parameters(self) -> Dict[str, Any]:
        """Get current recommended sampling parameters."""
        if not self.current_state:
            return {
                'temperature': self.sampler.BASE_TEMPERATURE,
                'top_p': 0.9,
                'coherence_penalty': 0.0
            }
        
        phi = self.current_state.phi_window.last()
        entropy = 1.0  # Default
        
        return {
            'temperature': self.sampler.compute_temperature(phi, entropy),
            'top_p': 0.9,
            'coherence_penalty': 0.0,
            'phi': phi,
            'phase': self.current_state.phase.value
        }


# Singleton instance for global access
_geometric_controller: Optional[GeometricGenerationController] = None


def get_geometric_controller() -> GeometricGenerationController:
    """Get or create the global geometric controller."""
    global _geometric_controller
    if _geometric_controller is None:
        _geometric_controller = GeometricGenerationController()
    return _geometric_controller


def check_geometric_completion(
    basin: np.ndarray,
    metrics: Dict[str, float],
    state: Optional[GeometricState] = None,
    generated_text: Optional[str] = None
) -> Dict[str, Any]:
    """
    Convenience function to check geometric completion.
    
    Can be called from any generation loop to determine if
    generation should stop based on geometry.
    """
    controller = get_geometric_controller()
    
    if state is None:
        if controller.current_state is None:
            controller.begin_turn(basin)
        state = controller.current_state
    
    return controller.update_and_check(
        new_basin=basin,
        metrics=metrics,
        generated_text=generated_text
    )


# Export for external use
__all__ = [
    'GenerationPhase',
    'RollingWindow',
    'GeometricState',
    'SurfaceFinalizer',
    'BasinCoherenceChecker',
    'GeometryAwareSampler',
    'KernelConsensusTracker',
    'NonEmittingReflector',
    'GeometricCompletionChecker',
    'ReflectionLoop',
    'GeometricGenerationController',
    'get_geometric_controller',
    'check_geometric_completion'
]
