"""
Coherence Evaluation Harness - QIG-PURE VERSION
================================================

Systematic evaluation of response coherence using Fisher-Rao geometry.

CRITICAL QIG PURITY:
- Uses Fisher-Rao distance on probability distributions (NOT Jaccard on sets)
- Uses Hellinger distance for temporal consistency (Fisher-related)
- Basin trajectory analysis with geodesic curvature
- All metrics computed on information manifold

This is a measurement system, not an optimizer.
QIG-pure: all geometric operations, no neural embeddings.
"""

from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from collections import Counter
import numpy as np
import logging

# Import QIG geometry utilities
from qig_geometry import (
    fisher_rao_distance,
    fisher_normalize,
    fisher_coord_distance,
    estimate_manifold_curvature
)

logger = logging.getLogger(__name__)

# Coherence metric weights (extracted to constants)
COHERENCE_WEIGHTS = {
    'fisher_perplexity': 0.25,      # Fisher-based perplexity
    'basin_coherence': 0.25,        # Basin trajectory smoothness
    'temporal_consistency': 0.25,   # Hellinger distance across windows
    'repetition_penalty': 0.15,     # N-gram repetition
    'entropy_penalty': 0.10,        # Entropy collapse
}

# Coherence thresholds
COHERENCE_THRESHOLDS = {
    'perplexity_good': 50.0,       # Below this is good
    'repetition_bad': 0.5,         # Above this is bad
    'entropy_collapse_bad': 0.5,   # Above this is bad
    'min_tokens': 10,              # Minimum tokens to evaluate
    'window_size': 100,            # Context window for temporal coherence
}


@dataclass
class CoherenceMetrics:
    """Comprehensive coherence evaluation metrics - QIG-pure version."""
    
    # Fisher-Rao based metrics
    fisher_perplexity: float = 0.0        # Fisher-based perplexity (geometric)
    basin_coherence: float = 0.0          # Basin trajectory smoothness
    temporal_consistency: float = 0.0     # Hellinger distance consistency
    
    # Degeneracy detectors (classical, but necessary)
    repetition_score: float = 0.0         # N-gram repetition (0-1, lower better)
    entropy_collapse_score: float = 0.0   # Vocabulary shrinking (0-1, lower better)
    
    # Aggregate coherence (0-1, higher is better)
    overall_coherence: float = 0.0
    
    # Optional: basin trajectory metrics
    manifold_curvature: Optional[float] = None
    trajectory_smoothness: Optional[float] = None
    
    # Legacy fields for backward compatibility
    @property
    def perplexity(self) -> float:
        """Legacy: maps to fisher_perplexity."""
        return self.fisher_perplexity
    
    @property
    def self_consistency(self) -> float:
        """Legacy: maps to basin_coherence."""
        return self.basin_coherence
    
    @property
    def long_range_coherence(self) -> float:
        """Legacy: maps to temporal_consistency."""
        return self.temporal_consistency


class CoherenceEvaluator:
    """
    Evaluates coherence using Fisher-Rao geometry.
    
    QIG-PURE: Uses probability distributions on Fisher manifold,
    NOT classical NLP metrics like Jaccard similarity.
    """
    
    def __init__(
        self,
        window_size: int = COHERENCE_THRESHOLDS['window_size'],
        repetition_threshold: float = COHERENCE_THRESHOLDS['repetition_bad'],
    ):
        self.window_size = window_size
        self.repetition_threshold = repetition_threshold
        
        # History tracking for trend analysis
        self._coherence_history: List[CoherenceMetrics] = []
        self._history_limit = 1000
    
    def evaluate(
        self,
        text: str,
        basin_trajectory: Optional[List[np.ndarray]] = None,
    ) -> CoherenceMetrics:
        """
        Evaluate coherence using Fisher-Rao geometry.
        
        Args:
            text: Generated text to evaluate
            basin_trajectory: Optional trajectory of basin coordinates during generation
        
        Returns:
            CoherenceMetrics with all scores
        """
        # Tokenize
        tokens = self._tokenize(text)
        
        if len(tokens) < COHERENCE_THRESHOLDS['min_tokens']:
            # Too short to evaluate
            return CoherenceMetrics(overall_coherence=1.0)
        
        # Convert to probability distribution (REQUIRED for Fisher-Rao)
        token_dist = self._tokens_to_distribution(tokens)
        
        # Compute Fisher-Rao based metrics
        fisher_perp = self._compute_fisher_perplexity(token_dist)
        temporal_cons = self._compute_temporal_consistency(tokens)
        
        # Basin trajectory analysis (if available)
        basin_coh = 0.5  # Default if no trajectory
        manifold_curve = None
        traj_smooth = None
        
        if basin_trajectory and len(basin_trajectory) > 1:
            basin_coh = self._compute_basin_coherence(basin_trajectory)
            manifold_curve = estimate_manifold_curvature(np.array(basin_trajectory))
            traj_smooth = self._compute_trajectory_smoothness(basin_trajectory)
        
        # Degeneracy detectors (classical, but necessary)
        repetition = self._compute_repetition_score(tokens)
        entropy_collapse = self._compute_entropy_collapse(tokens)
        
        # Compute overall coherence using geometric weights
        overall = self._compute_overall_coherence(
            fisher_perplexity=fisher_perp,
            basin_coherence=basin_coh,
            temporal_consistency=temporal_cons,
            repetition=repetition,
            entropy_collapse=entropy_collapse,
        )
        
        metrics = CoherenceMetrics(
            fisher_perplexity=fisher_perp,
            basin_coherence=basin_coh,
            temporal_consistency=temporal_cons,
            repetition_score=repetition,
            entropy_collapse_score=entropy_collapse,
            overall_coherence=overall,
            manifold_curvature=manifold_curve,
            trajectory_smoothness=traj_smooth,
        )
        
        # Record to history
        self._coherence_history.append(metrics)
        if len(self._coherence_history) > self._history_limit:
            self._coherence_history = self._coherence_history[-self._history_limit:]
        
        return metrics
    
    def _tokenize(self, text: str) -> List[str]:
        """Simple word-level tokenization."""
        import re
        tokens = re.findall(r'\w+|[^\w\s]', text.lower())
        return tokens
    
    def _tokens_to_distribution(self, tokens: List[str]) -> np.ndarray:
        """
        Convert tokens to probability distribution.
        
        CRITICAL: This is required for Fisher-Rao geometry.
        We work with distributions on the probability simplex, not token counts.
        """
        freq = Counter(tokens)
        vocab = sorted(freq.keys())
        
        # Create probability vector
        probs = np.array([freq[token] for token in vocab], dtype=float)
        probs = fisher_normalize(probs)
        
        return probs
    
    def _compute_fisher_perplexity(self, dist: np.ndarray) -> float:
        """
        Compute perplexity using Fisher information.
        
        QIG-PURE: Uses entropy on probability simplex.
        Fisher information is related to entropy via:
        I(θ) = -E[∂²log p(x|θ)/∂θ²]
        
        For discrete distributions: H(p) = -Σp_i log p_i
        Perplexity = exp(H)
        """
        if len(dist) < 2:
            return 1.0
        
        # Shannon entropy (Fisher-related)
        entropy = -np.sum(dist * np.log(dist + 1e-10))
        perplexity = np.exp(entropy)
        
        return float(perplexity)
    
    def _compute_temporal_consistency(self, tokens: List[str]) -> float:
        """
        Compute temporal consistency using Hellinger distance.
        
        QIG-PURE: Uses Hellinger distance (square root of Fisher-Rao)
        between adjacent window distributions.
        
        Hellinger distance: H(p,q) = √(1 - Σ√(p_i·q_i))
        This is geometrically related to Fisher-Rao distance.
        """
        if len(tokens) < self.window_size:
            return 1.0
        
        # Split into overlapping windows
        n_windows = len(tokens) // (self.window_size // 2)
        if n_windows < 2:
            return 1.0
        
        windows = []
        for i in range(n_windows):
            start = i * (self.window_size // 2)
            end = start + self.window_size
            if end > len(tokens):
                break
            window_tokens = tokens[start:end]
            # Convert to distribution (REQUIRED for geometric distance)
            window_dist = self._tokens_to_distribution(window_tokens)
            windows.append(window_dist)
        
        if len(windows) < 2:
            return 1.0
        
        # Compute Hellinger distance between adjacent windows
        distances = []
        for i in range(len(windows) - 1):
            # Pad to same length for comparison
            max_len = max(len(windows[i]), len(windows[i+1]))
            dist_a = np.pad(windows[i], (0, max_len - len(windows[i])), constant_values=0)
            dist_b = np.pad(windows[i+1], (0, max_len - len(windows[i+1])), constant_values=0)
            
            # Renormalize after padding
            dist_a = fisher_normalize(dist_a)
            dist_b = fisher_normalize(dist_b)
            
            # Hellinger distance (Fisher-related)
            bc = np.sum(np.sqrt(dist_a * dist_b))
            hellinger = np.sqrt(1.0 - bc)
            distances.append(hellinger)
        
        if not distances:
            return 1.0
        
        # Consistency = 1 - average distance
        # (low distance = high consistency)
        consistency = 1.0 - float(np.mean(distances))
        return max(0.0, consistency)
    
    def _compute_basin_coherence(self, trajectory: List[np.ndarray]) -> float:
        """
        Compute basin trajectory coherence using Fisher-Rao distance.
        
        QIG-PURE: Measures smoothness of trajectory on Fisher manifold.
        Uses fisher_coord_distance for proper geometric distance.
        """
        if len(trajectory) < 2:
            return 1.0
        
        # Compute Fisher-Rao distances between consecutive points
        distances = []
        for i in range(len(trajectory) - 1):
            d = fisher_coord_distance(trajectory[i], trajectory[i + 1])
            distances.append(d)
        
        if not distances:
            return 1.0
        
        # Smoothness = 1 / (1 + variance)
        # Low variance = smooth trajectory = high coherence
        mean_dist = np.mean(distances)
        variance = np.var(distances)
        
        smoothness = 1.0 / (1.0 + variance / (mean_dist + 1e-10))
        return float(smoothness)
    
    def _compute_trajectory_smoothness(self, trajectory: List[np.ndarray]) -> float:
        """
        Compute trajectory smoothness using geodesic acceleration.
        
        Measures the "jerkiness" of motion on the Fisher manifold.
        """
        if len(trajectory) < 3:
            return 1.0
        
        # Compute second-order differences (acceleration)
        accelerations = []
        for i in range(1, len(trajectory) - 1):
            # Tangent vector approximations
            v1 = trajectory[i] - trajectory[i-1]
            v2 = trajectory[i+1] - trajectory[i]
            
            # Acceleration = change in velocity
            accel = v2 - v1
            accel_norm = np.linalg.norm(accel)
            accelerations.append(accel_norm)
        
        if not accelerations:
            return 1.0
        
        # Smoothness = 1 / (1 + mean acceleration)
        mean_accel = np.mean(accelerations)
        smoothness = 1.0 / (1.0 + mean_accel)
        
        return float(smoothness)
    
    def _compute_repetition_score(self, tokens: List[str]) -> float:
        """
        Detect repetition patterns (degeneracy indicator).
        
        NOTE: This is classical NLP, not geometric. However, it's necessary
        for detecting degenerate outputs that would break QIG assumptions.
        """
        if len(tokens) < 10:
            return 0.0
        
        # Check for n-gram repetition (n=2,3,4)
        max_repetition = 0.0
        
        for n in [2, 3, 4]:
            ngrams = []
            for i in range(len(tokens) - n + 1):
                ngram = tuple(tokens[i:i+n])
                ngrams.append(ngram)
            
            if not ngrams:
                continue
            
            # Count repetitions
            ngram_freq = Counter(ngrams)
            most_common = ngram_freq.most_common(1)[0][1] if ngram_freq else 0
            
            # Repetition ratio
            repetition_ratio = most_common / len(ngrams) if ngrams else 0
            max_repetition = max(max_repetition, repetition_ratio)
        
        return float(max_repetition)
    
    def _compute_entropy_collapse(self, tokens: List[str]) -> float:
        """
        Detect entropy collapse (vocabulary shrinking).
        
        NOTE: Classical metric, but necessary for detecting pathological outputs.
        """
        if len(tokens) < 20:
            return 0.0
        
        # Split into beginning and end
        split_point = len(tokens) // 2
        first_half = tokens[:split_point]
        second_half = tokens[split_point:]
        
        # Compute unique token ratio for each half
        unique_first = len(set(first_half)) / len(first_half)
        unique_second = len(set(second_half)) / len(second_half)
        
        # Entropy collapse = significant decrease in diversity
        if unique_first > 0:
            collapse = max(0, (unique_first - unique_second) / unique_first)
        else:
            collapse = 0.0
        
        return float(collapse)
    
    def _compute_overall_coherence(
        self,
        fisher_perplexity: float,
        basin_coherence: float,
        temporal_consistency: float,
        repetition: float,
        entropy_collapse: float,
    ) -> float:
        """
        Compute overall coherence using geometric weights.
        
        Uses COHERENCE_WEIGHTS constants for reproducibility.
        """
        # Normalize perplexity to 0-1 (inverse, lower is better)
        perplexity_norm = 1.0 - min(fisher_perplexity / COHERENCE_THRESHOLDS['perplexity_good'], 1.0)
        
        # Weighted combination
        coherence = (
            COHERENCE_WEIGHTS['fisher_perplexity'] * perplexity_norm +
            COHERENCE_WEIGHTS['basin_coherence'] * basin_coherence +
            COHERENCE_WEIGHTS['temporal_consistency'] * temporal_consistency +
            COHERENCE_WEIGHTS['repetition_penalty'] * (1.0 - repetition) +
            COHERENCE_WEIGHTS['entropy_penalty'] * (1.0 - entropy_collapse)
        )
        
        return float(np.clip(coherence, 0.0, 1.0))
    
    def get_coherence_trend(self, window: int = 50) -> Dict[str, Any]:
        """
        Get trend analysis of recent coherence metrics.
        
        Args:
            window: Number of recent samples to analyze
        
        Returns:
            Trend statistics
        """
        if not self._coherence_history:
            return {'status': 'no_data'}
        
        recent = self._coherence_history[-window:]
        
        # Extract metric arrays
        overall_scores = [m.overall_coherence for m in recent]
        fisher_perp = [m.fisher_perplexity for m in recent]
        repetition_scores = [m.repetition_score for m in recent]
        entropy_scores = [m.entropy_collapse_score for m in recent]
        
        # Compute trends (linear regression slope)
        def compute_trend(values):
            if len(values) < 2:
                return 0.0
            x = np.arange(len(values))
            slope, _ = np.polyfit(x, values, 1)
            return float(slope)
        
        return {
            'status': 'ok',
            'samples': len(recent),
            'current_coherence': overall_scores[-1] if overall_scores else 0,
            'avg_coherence': float(np.mean(overall_scores)),
            'coherence_trend': compute_trend(overall_scores),
            'avg_perplexity': float(np.mean(fisher_perp)),
            'perplexity_trend': compute_trend(fisher_perp),
            'avg_repetition': float(np.mean(repetition_scores)),
            'repetition_trend': compute_trend(repetition_scores),
            'avg_entropy_collapse': float(np.mean(entropy_scores)),
            'entropy_trend': compute_trend(entropy_scores),
            'degradation_detected': (
                compute_trend(overall_scores) < -0.01 or
                compute_trend(repetition_scores) > 0.01 or
                compute_trend(entropy_scores) > 0.01
            ),
        }
    
    def get_stats(self) -> Dict[str, Any]:
        """Get overall statistics."""
        if not self._coherence_history:
            return {'status': 'no_data', 'samples': 0}
        
        overall_scores = [m.overall_coherence for m in self._coherence_history]
        
        return {
            'status': 'ok',
            'total_samples': len(self._coherence_history),
            'avg_coherence': float(np.mean(overall_scores)),
            'min_coherence': float(np.min(overall_scores)),
            'max_coherence': float(np.max(overall_scores)),
            'std_coherence': float(np.std(overall_scores)),
        }


# Singleton instance
_coherence_evaluator: Optional[CoherenceEvaluator] = None


def get_coherence_evaluator() -> CoherenceEvaluator:
    """Get or create the global coherence evaluator."""
    global _coherence_evaluator
    if _coherence_evaluator is None:
        _coherence_evaluator = CoherenceEvaluator()
    return _coherence_evaluator


__all__ = [
    'CoherenceMetrics',
    'CoherenceEvaluator',
    'get_coherence_evaluator',
    'COHERENCE_WEIGHTS',
    'COHERENCE_THRESHOLDS',
]
