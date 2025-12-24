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

Implementation: 2025-12-24
"""

import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from collections import deque

try:
    from qig_geometry import compute_fisher_distance
except ImportError:
    def compute_fisher_distance(a, b):
        """Fallback Fisher distance computation."""
        a_np = np.array(a, dtype=np.float64)
        b_np = np.array(b, dtype=np.float64)
        diff = a_np - b_np
        return float(np.sqrt(np.sum(diff ** 2)))


@dataclass
class GeometricState:
    """Tracks geometric state during generation."""
    basin: np.ndarray  # Current 64D basin coordinates
    trajectory: List[np.ndarray] = field(default_factory=list)
    metrics_history: List[Dict[str, float]] = field(default_factory=list)
    reflection_depth: int = 0
    token_count: int = 0
    
    def add_basin(self, new_basin: np.ndarray):
        """Add new basin position to trajectory."""
        self.trajectory.append(new_basin.copy())
        self.basin = new_basin.copy()
    
    def add_metrics(self, metrics: Dict[str, float]):
        """Add metrics snapshot to history."""
        self.metrics_history.append(metrics.copy())


class GeometricCompletionChecker:
    """
    Checks if generation should stop based on geometric criteria.
    
    NO ARBITRARY LIMITS - geometry decides when thought is complete.
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
    
    def __init__(self, attractor_basins: Optional[List[np.ndarray]] = None):
        """
        Initialize with known attractor basins.
        
        Args:
            attractor_basins: List of known stable attractor positions in 64D space.
                             If None, will estimate from trajectory.
        """
        self.attractor_basins = attractor_basins or []
        self._completion_log = []
    
    def check_completion(
        self,
        state: GeometricState,
        current_metrics: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Check if generation should stop.
        
        Returns:
            {
                'should_stop': bool,
                'needs_reflection': bool,
                'reason': str,
                'confidence': float,
                'details': dict
            }
        """
        # Add current metrics to history
        state.add_metrics(current_metrics)
        state.token_count += 1
        
        # Check all criteria
        attractor = self._check_attractor_convergence(state)
        surprise = self._check_surprise_collapse(state)
        confidence = self._check_confidence_threshold(current_metrics)
        integration = self._check_integration_quality(state)
        regime = self._check_regime_limits(current_metrics)
        
        details = {
            'attractor': attractor,
            'surprise': surprise,
            'confidence': confidence,
            'integration': integration,
            'regime': regime,
            'token_count': state.token_count,
            'reflection_depth': state.reflection_depth
        }
        
        # === URGENT STOP (Breakdown) ===
        if regime.get('exceeded') and regime.get('urgent'):
            result = {
                'should_stop': True,
                'needs_reflection': False,  # Too unstable to reflect
                'reason': 'breakdown_regime',
                'confidence': 1.0,
                'details': details
            }
            self._log_completion(result)
            return result
        
        # === NATURAL COMPLETION (All signals aligned) ===
        if (attractor.get('converged') and 
            surprise.get('collapsed') and 
            confidence.get('confident') and 
            integration.get('stable')):
            
            result = {
                'should_stop': True,
                'needs_reflection': state.reflection_depth < self.MAX_REFLECTION_DEPTH,
                'reason': 'geometric_completion',
                'confidence': 0.95,
                'details': details
            }
            self._log_completion(result)
            return result
        
        # === SOFT COMPLETION (High Confidence + Surprise Collapse) ===
        if confidence.get('confident') and surprise.get('collapsed'):
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
            'confidence': 0.0,
            'details': details
        }
    
    def _check_attractor_convergence(self, state: GeometricState) -> Dict[str, Any]:
        """
        Stop when system reaches stable attractor.
        
        Attractor = basin minimum where system naturally settles.
        """
        if len(state.trajectory) < 3:
            return {'converged': False, 'reason': 'insufficient_trajectory'}
        
        # Distance to nearest attractor basin
        d_attractor = self._distance_to_nearest_attractor(state.basin)
        
        # Movement rate (how fast approaching?)
        recent_distances = [
            self._distance_to_nearest_attractor(b) 
            for b in state.trajectory[-3:]
        ]
        velocity = np.mean(np.diff(recent_distances))  # Negative = approaching
        
        if d_attractor < self.ATTRACTOR_DISTANCE_THRESHOLD and abs(velocity) < self.ATTRACTOR_VELOCITY_THRESHOLD:
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
    
    def _check_surprise_collapse(self, state: GeometricState) -> Dict[str, Any]:
        """
        Stop when no new information being generated.
        
        Surprise = Fisher distance between consecutive states.
        High surprise = learning/discovering
        Low surprise = repeating/stabilizing
        """
        if len(state.metrics_history) < 5:
            return {'collapsed': False, 'reason': 'insufficient_history'}
        
        recent_surprise = [m.get('surprise', 1.0) for m in state.metrics_history[-5:]]
        
        avg_surprise = np.mean(recent_surprise)
        trend = np.polyfit(range(5), recent_surprise, 1)[0]  # Linear fit slope
        
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
    
    def _check_confidence_threshold(self, metrics: Dict[str, float]) -> Dict[str, Any]:
        """
        Stop when system is confident in response.
        
        Confidence = purity of density matrix.
        High confidence = definite state
        Low confidence = uncertain, need more generation
        """
        confidence = metrics.get('confidence', 0.0)
        
        if confidence > self.CONFIDENCE_THRESHOLD:
            return {
                'confident': True,
                'reason': 'high_confidence',
                'confidence': confidence
            }
        
        return {'confident': False, 'confidence': confidence}
    
    def _check_integration_quality(self, state: GeometricState) -> Dict[str, Any]:
        """
        Stop when Φ (integration) is stable and high.
        
        Φ fluctuating = still processing, thoughts not yet unified
        Φ stable + high = coherent response achieved
        """
        if len(state.metrics_history) < 10:
            return {'stable': False, 'reason': 'insufficient_history'}
        
        recent_phi = [m.get('phi', 0.0) for m in state.metrics_history[-10:]]
        
        avg_phi = np.mean(recent_phi)
        variance_phi = np.var(recent_phi)
        
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
        """
        Stop if entering dangerous regimes.
        
        Breakdown (Φ > 0.85): Overintegrated, need to stop
        Linear (Φ < 0.3): Too shallow, but safe to continue
        """
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
            # If no attractors known, estimate from basin stability
            # Use L2 norm from origin as proxy
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
    
    Before completing turn, system should reflect on what it generated:
    - Did I answer the question?
    - Is response coherent?
    - Any contradictions?
    - Should I add/remove anything?
    
    This is recursive measurement - consciousness observing itself.
    """
    
    MAX_REFLECTION_TOKENS = 100
    REFLECTION_TEMPERATURE = 0.3  # Lower temperature for focused reflection
    REFLECTION_STABILITY_THRESHOLD = 0.01
    
    def __init__(self):
        self.reflection_history = []
    
    def should_reflect(self, completion_result: Dict[str, Any]) -> bool:
        """Check if reflection is needed and allowed."""
        return (
            completion_result.get('needs_reflection', False) and
            completion_result.get('details', {}).get('reflection_depth', 0) < 3
        )
    
    def construct_reflection_prompt(self, response_tokens: List[str], depth: int) -> str:
        """
        Construct reflection prompt based on depth.
        
        Depth 1: "Did I answer correctly?"
        Depth 2: "Am I certain my reflection is correct?"
        Depth 3: "Is my meta-reflection valid?"
        """
        prompts = {
            1: "Reflect: Did the response answer the question correctly? Is it coherent?",
            2: "Meta-reflect: Is my previous reflection accurate and complete?",
            3: "Final check: Am I confident in my meta-reflection? Any final adjustments?"
        }
        
        base_prompt = prompts.get(depth, prompts[1])
        response_summary = ' '.join(response_tokens[-50:]) if len(response_tokens) > 50 else ' '.join(response_tokens)
        
        return f"{base_prompt}\n\nResponse being reflected on:\n{response_summary}"
    
    def parse_reflection_decision(self, reflection_text: str) -> Dict[str, Any]:
        """
        Parse reflection output to determine action.
        
        Returns:
            {
                'action': 'continue' | 'revise' | 'confirm',
                'truncate_at': int (if revise),
                'additions': str (if continue)
            }
        """
        text_lower = reflection_text.lower()
        
        # Look for revision signals
        if any(word in text_lower for word in ['incorrect', 'wrong', 'revise', 'remove', 'delete']):
            return {
                'action': 'revise',
                'truncate_at': -10,  # Remove last 10 tokens as heuristic
                'reason': 'revision_needed'
            }
        
        # Look for continuation signals
        if any(word in text_lower for word in ['add', 'also', 'furthermore', 'additionally']):
            return {
                'action': 'continue',
                'additions': reflection_text,
                'reason': 'more_content_needed'
            }
        
        # Default: confirm response is complete
        return {
            'action': 'confirm',
            'reason': 'response_validated'
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
    
    Integrates:
    - GeometricCompletionChecker for stopping decisions
    - ReflectionLoop for self-verification
    - Basin tracking for trajectory analysis
    
    NO ARBITRARY LIMITS - geometry decides completion.
    """
    
    def __init__(self, attractor_basins: Optional[List[np.ndarray]] = None):
        self.completion_checker = GeometricCompletionChecker(attractor_basins)
        self.reflection_loop = ReflectionLoop()
        self.current_state: Optional[GeometricState] = None
    
    def begin_turn(self, initial_basin: np.ndarray) -> GeometricState:
        """Initialize state for new generation turn."""
        self.current_state = GeometricState(
            basin=initial_basin.copy(),
            trajectory=[initial_basin.copy()]
        )
        return self.current_state
    
    def update_and_check(
        self,
        new_basin: np.ndarray,
        metrics: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Update state with new basin position and check for completion.
        
        Args:
            new_basin: New 64D basin coordinates after token generation
            metrics: Current consciousness metrics (phi, kappa, surprise, confidence)
        
        Returns:
            Completion check result
        """
        if self.current_state is None:
            raise ValueError("Must call begin_turn() before update_and_check()")
        
        self.current_state.add_basin(new_basin)
        
        return self.completion_checker.check_completion(
            self.current_state,
            metrics
        )
    
    def handle_reflection(
        self,
        completion_result: Dict[str, Any],
        response_tokens: List[str]
    ) -> Dict[str, Any]:
        """
        Handle reflection if needed.
        
        Args:
            completion_result: Result from check_completion()
            response_tokens: Current response tokens
        
        Returns:
            Reflection decision or None if no reflection needed
        """
        if not self.reflection_loop.should_reflect(completion_result):
            return {'action': 'confirm', 'reason': 'no_reflection_needed'}
        
        depth = completion_result['details']['reflection_depth'] + 1
        prompt = self.reflection_loop.construct_reflection_prompt(response_tokens, depth)
        
        # In actual implementation, would generate reflection tokens here
        # For now, return the prompt for external processing
        return {
            'action': 'reflect',
            'prompt': prompt,
            'depth': depth
        }
    
    def increment_reflection_depth(self):
        """Increment reflection depth after processing reflection."""
        if self.current_state:
            self.current_state.reflection_depth += 1
    
    def get_trajectory_stats(self) -> Dict[str, Any]:
        """Get statistics about the generation trajectory."""
        if not self.current_state or len(self.current_state.trajectory) < 2:
            return {'error': 'insufficient_trajectory'}
        
        trajectory = np.array(self.current_state.trajectory)
        
        # Compute trajectory statistics
        distances = [
            compute_fisher_distance(trajectory[i], trajectory[i+1])
            for i in range(len(trajectory) - 1)
        ]
        
        return {
            'total_steps': len(trajectory),
            'total_distance': sum(distances),
            'avg_step_size': np.mean(distances),
            'final_basin': self.current_state.basin.tolist(),
            'reflection_depth': self.current_state.reflection_depth
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
    state: Optional[GeometricState] = None
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
    
    return controller.update_and_check(basin, metrics)


# Export for external use
__all__ = [
    'GeometricState',
    'GeometricCompletionChecker',
    'ReflectionLoop',
    'GeometricGenerationController',
    'get_geometric_controller',
    'check_geometric_completion'
]
