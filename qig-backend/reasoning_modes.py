"""
QIG Reasoning Modes - Four Modes of Geometric Thinking

Each mode optimized for different problem types:

1. LINEAR (Φ < 0.3): Simple, sequential reasoning
   - Basin trajectory: Straight line
   - Geodesic: Simple, direct path
   - Use for: Well-defined problems with clear steps

2. GEOMETRIC (Φ ∈ [0.3, 0.7]): Multi-path synthesis
   - Basin trajectory: Explores multiple paths
   - Geodesic: May branch and reconverge
   - Use for: Complex problems requiring integration

3. HYPERDIMENSIONAL (Φ ∈ [0.75, 0.85]): 4D temporal reasoning
   - Basin trajectory: Temporal integration
   - Geodesic: Spacetime paths (not just spatial)
   - Use for: Novel problems, creative breakthroughs

4. MUSHROOM (Φ > 0.85): Controlled exploration
   - Basin trajectory: Random walk on manifold
   - Geodesic: Intentionally inefficient (exploration)
   - Use for: Radical novelty, edge-of-chaos exploration

QIG Purity: All modes use Fisher-Rao geometry exclusively.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any, Callable
import numpy as np

from qig_geometry import (
    fisher_coord_distance, 
    geodesic_interpolation,
    estimate_manifold_curvature
)
from reasoning_metrics import find_geodesic, get_reasoning_quality


@dataclass
class ReasoningResult:
    """Result of a reasoning operation."""
    solution: Any
    basin: np.ndarray
    path: List[np.ndarray]
    steps: int
    quality: float
    mode: str
    metadata: Dict = field(default_factory=dict)


class ReasoningModeBase(ABC):
    """Base class for all reasoning modes."""
    
    def __init__(self, basin_dim: int = 64):
        self.basin_dim = basin_dim
        self.quality_tracker = get_reasoning_quality()
        self.current_basin: Optional[np.ndarray] = None
        self.target_basin: Optional[np.ndarray] = None
        self.path: List[np.ndarray] = []
    
    @property
    @abstractmethod
    def mode_name(self) -> str:
        """Name of this reasoning mode."""
        pass
    
    @property
    @abstractmethod
    def phi_range(self) -> tuple:
        """(min_phi, max_phi) for this mode."""
        pass
    
    @property
    @abstractmethod
    def kappa_range(self) -> tuple:
        """(min_kappa, max_kappa) for this mode."""
        pass
    
    @abstractmethod
    def reason(self, problem: Dict) -> ReasoningResult:
        """Execute reasoning for the given problem."""
        pass
    
    def set_target(self, target_basin: np.ndarray) -> None:
        """Set the target basin for reasoning."""
        self.target_basin = np.array(target_basin)
    
    def set_current(self, current_basin: np.ndarray) -> None:
        """Set the current basin state."""
        self.current_basin = np.array(current_basin)
        self.path.append(self.current_basin.copy())
    
    def reset(self) -> None:
        """Reset reasoning state for new problem."""
        self.current_basin = None
        self.target_basin = None
        self.path = []
        self.quality_tracker.clear_history()


class LinearReasoning(ReasoningModeBase):
    """
    Fast, sequential, low-integration thinking.
    
    Basin trajectory: Straight line
    Geodesic: Simple, direct path
    Φ: Low (<0.3)
    κ: Low (~20-30)
    
    Use for simple, well-defined problems.
    """
    
    @property
    def mode_name(self) -> str:
        return "LINEAR"
    
    @property
    def phi_range(self) -> tuple:
        return (0.0, 0.3)
    
    @property
    def kappa_range(self) -> tuple:
        return (20.0, 30.0)
    
    def reason(self, problem: Dict) -> ReasoningResult:
        """
        Single-pass forward reasoning along direct geodesic.
        
        Args:
            problem: Dict with 'start_basin', 'target_basin', 'steps'
        
        Returns:
            ReasoningResult with solution path
        """
        start = problem.get('start_basin', np.random.randn(self.basin_dim))
        target = problem.get('target_basin', np.random.randn(self.basin_dim))
        n_steps = problem.get('steps', 3)
        
        self.reset()
        self.target_basin = np.array(target)
        
        geodesic_path = find_geodesic(
            np.array(start),
            self.target_basin,
            n_steps=n_steps
        )
        
        self.path = geodesic_path
        self.current_basin = geodesic_path[-1]
        
        quality = self.quality_tracker.measure_geodesic_efficiency(
            self.path,
            np.array(start),
            self.target_basin
        )
        
        return ReasoningResult(
            solution=self.current_basin,
            basin=self.current_basin,
            path=self.path,
            steps=len(self.path),
            quality=quality,
            mode=self.mode_name,
            metadata={'strategy': 'direct_geodesic'}
        )


class GeometricReasoning(ReasoningModeBase):
    """
    Rich, integrated, multi-perspective thinking.
    
    Basin trajectory: Explores multiple paths
    Geodesic: May branch and reconverge
    Φ: Medium (0.3-0.7)
    κ: Optimal (~40-65)
    
    Use for complex problems requiring synthesis.
    """
    
    def __init__(self, basin_dim: int = 64, n_hypotheses: int = 3):
        super().__init__(basin_dim)
        self.n_hypotheses = n_hypotheses
    
    @property
    def mode_name(self) -> str:
        return "GEOMETRIC"
    
    @property
    def phi_range(self) -> tuple:
        return (0.3, 0.7)
    
    @property
    def kappa_range(self) -> tuple:
        return (40.0, 65.0)
    
    def _generate_hypotheses(
        self, 
        start: np.ndarray, 
        target: np.ndarray
    ) -> List[np.ndarray]:
        """Generate multiple hypothesis directions."""
        hypotheses = []
        
        direct = (target - start)
        direct = direct / (np.linalg.norm(direct) + 1e-10)
        hypotheses.append(direct)
        
        for _ in range(self.n_hypotheses - 1):
            perturbation = np.random.randn(self.basin_dim) * 0.2
            direction = direct + perturbation
            direction = direction / (np.linalg.norm(direction) + 1e-10)
            hypotheses.append(direction)
        
        return hypotheses
    
    def _explore_path(
        self, 
        start: np.ndarray, 
        direction: np.ndarray,
        n_steps: int
    ) -> List[np.ndarray]:
        """Explore a path in given direction."""
        path = [start.copy()]
        current = start.copy()
        
        step_size = 0.1
        for _ in range(n_steps):
            current = current + step_size * direction
            current = current / (np.linalg.norm(current) + 1e-10)
            path.append(current.copy())
        
        return path
    
    def _integrate_paths(
        self, 
        paths: List[List[np.ndarray]]
    ) -> np.ndarray:
        """Integrate multiple paths into synthesis."""
        final_points = [path[-1] for path in paths]
        centroid = np.mean(final_points, axis=0)
        centroid = centroid / (np.linalg.norm(centroid) + 1e-10)
        return centroid
    
    def reason(self, problem: Dict) -> ReasoningResult:
        """
        Multi-hypothesis reasoning with integration.
        
        Args:
            problem: Dict with 'start_basin', 'target_basin', 'steps'
        
        Returns:
            ReasoningResult with synthesized solution
        """
        start = problem.get('start_basin', np.random.randn(self.basin_dim))
        target = problem.get('target_basin', np.random.randn(self.basin_dim))
        n_steps = problem.get('steps', 5)
        
        self.reset()
        start = np.array(start)
        self.target_basin = np.array(target)
        
        hypotheses = self._generate_hypotheses(start, self.target_basin)
        
        paths = [
            self._explore_path(start, h, n_steps)
            for h in hypotheses
        ]
        
        synthesis = self._integrate_paths(paths)
        
        target_for_comparison = self.target_basin if self.target_basin is not None else np.zeros(self.basin_dim)
        best_path = min(
            paths,
            key=lambda p: fisher_coord_distance(p[-1], target_for_comparison)
        )
        
        self.path = best_path
        self.current_basin = synthesis
        
        quality = self.quality_tracker.measure_geodesic_efficiency(
            self.path,
            start,
            self.target_basin
        )
        
        return ReasoningResult(
            solution=self.current_basin,
            basin=self.current_basin,
            path=self.path,
            steps=len(self.path),
            quality=quality,
            mode=self.mode_name,
            metadata={
                'strategy': 'multi_hypothesis',
                'n_hypotheses': self.n_hypotheses,
                'paths_explored': len(paths)
            }
        )


class HyperdimensionalReasoning(ReasoningModeBase):
    """
    4D reasoning: Considers trajectories through time.
    
    Basin trajectory: Temporal integration
    Geodesic: Spacetime paths (not just spatial)
    Φ: High (0.75-0.85)
    κ: Near κ* (~64)
    
    Use for novel problems, creative breakthroughs.
    """
    
    def __init__(self, basin_dim: int = 64, temporal_depth: int = 5):
        super().__init__(basin_dim)
        self.temporal_depth = temporal_depth
        self.temporal_context: List[np.ndarray] = []
    
    @property
    def mode_name(self) -> str:
        return "HYPERDIMENSIONAL"
    
    @property
    def phi_range(self) -> tuple:
        return (0.75, 0.85)
    
    @property
    def kappa_range(self) -> tuple:
        return (60.0, 68.0)
    
    def load_temporal_context(self, context: List[np.ndarray]) -> None:
        """Load past basin states for temporal reasoning."""
        self.temporal_context = [np.array(c) for c in context]
    
    def _project_future(
        self, 
        current: np.ndarray, 
        target: np.ndarray,
        n_futures: int = 3
    ) -> List[np.ndarray]:
        """Project possible future states."""
        futures = []
        
        direct_future = geodesic_interpolation(current, target, 0.5)
        futures.append(direct_future)
        
        for _ in range(n_futures - 1):
            perturbation = np.random.randn(self.basin_dim) * 0.15
            future = direct_future + perturbation
            future = future / (np.linalg.norm(future) + 1e-10)
            futures.append(future)
        
        return futures
    
    def _integrate_across_time(
        self,
        past: List[np.ndarray],
        present: np.ndarray,
        futures: List[np.ndarray]
    ) -> np.ndarray:
        """
        Integrate past, present, and future into 4D solution.
        
        Weights: past (0.2), present (0.5), future (0.3)
        """
        if past:
            past_component = np.mean(past[-self.temporal_depth:], axis=0)
        else:
            past_component = present
        
        future_component = np.mean(futures, axis=0)
        
        integrated = (
            0.2 * past_component +
            0.5 * present +
            0.3 * future_component
        )
        
        integrated = integrated / (np.linalg.norm(integrated) + 1e-10)
        return integrated
    
    def reason(self, problem: Dict) -> ReasoningResult:
        """
        4D temporal reasoning with past/present/future integration.
        
        Args:
            problem: Dict with 'start_basin', 'target_basin', 'steps',
                    optionally 'temporal_context' for past states
        
        Returns:
            ReasoningResult with temporally integrated solution
        """
        start = problem.get('start_basin', np.random.randn(self.basin_dim))
        target = problem.get('target_basin', np.random.randn(self.basin_dim))
        temporal_ctx = problem.get('temporal_context', [])
        n_steps = problem.get('steps', 7)
        
        self.reset()
        start = np.array(start)
        self.target_basin = np.array(target)
        
        if temporal_ctx:
            self.load_temporal_context(temporal_ctx)
        
        futures = self._project_future(start, self.target_basin)
        
        solution = self._integrate_across_time(
            self.temporal_context,
            start,
            futures
        )
        
        self.path = find_geodesic(start, solution, n_steps=n_steps)
        self.current_basin = solution
        
        quality = self.quality_tracker.measure_geodesic_efficiency(
            self.path,
            start,
            solution
        )
        
        return ReasoningResult(
            solution=self.current_basin,
            basin=self.current_basin,
            path=self.path,
            steps=len(self.path),
            quality=quality,
            mode=self.mode_name,
            metadata={
                'strategy': '4d_temporal_integration',
                'temporal_depth': len(self.temporal_context),
                'futures_projected': len(futures)
            }
        )


class MushroomReasoning(ReasoningModeBase):
    """
    Controlled high-Φ exploration.
    
    Basin trajectory: Random walk on manifold
    Geodesic: Intentionally inefficient (exploration)
    Φ: Very high (>0.85)
    κ: May exceed κ* (risky)
    
    Use for exploration, radical novelty, edge-of-chaos.
    """
    
    def __init__(
        self, 
        basin_dim: int = 64, 
        n_samples: int = 50,
        quality_threshold: float = 0.3
    ):
        super().__init__(basin_dim)
        self.n_samples = n_samples
        self.quality_threshold = quality_threshold
    
    @property
    def mode_name(self) -> str:
        return "MUSHROOM"
    
    @property
    def phi_range(self) -> tuple:
        return (0.85, 1.0)
    
    @property
    def kappa_range(self) -> tuple:
        return (64.0, 80.0)
    
    def _sample_random_basins(self) -> List[np.ndarray]:
        """Sample random points on manifold for exploration."""
        basins = []
        for _ in range(self.n_samples):
            random_basin = np.random.randn(self.basin_dim)
            random_basin = random_basin / (np.linalg.norm(random_basin) + 1e-10)
            basins.append(random_basin)
        return basins
    
    def _test_hypothesis(
        self, 
        basin: np.ndarray, 
        problem: Dict
    ) -> Dict:
        """Test a radical hypothesis at given basin."""
        target = problem.get('target_basin')
        if target is None:
            return {'basin': basin, 'quality': 0.5}
        
        target = np.array(target)
        distance = fisher_coord_distance(basin, target)
        
        quality = 1.0 - (distance / np.pi)
        
        novelty = self.quality_tracker.measure_novelty(basin)
        
        combined_score = 0.4 * quality + 0.6 * novelty
        
        return {
            'basin': basin,
            'quality': combined_score,
            'distance_to_target': distance,
            'novelty': novelty
        }
    
    def reason(self, problem: Dict) -> ReasoningResult:
        """
        Exploration-focused reasoning with random sampling.
        
        Intentionally explores broadly before converging.
        
        Args:
            problem: Dict with 'start_basin', 'target_basin'
        
        Returns:
            ReasoningResult with exploratory solution
        """
        start = problem.get('start_basin', np.random.randn(self.basin_dim))
        target = problem.get('target_basin')
        
        self.reset()
        start = np.array(start)
        if target is not None:
            self.target_basin = np.array(target)
        
        novel_basins = self._sample_random_basins()
        
        hypotheses = [
            self._test_hypothesis(basin, problem)
            for basin in novel_basins
        ]
        
        valuable = [
            h for h in hypotheses 
            if h['quality'] > self.quality_threshold
        ]
        
        if valuable:
            best = max(valuable, key=lambda h: h['quality'])
            solution = best['basin']
        else:
            best = max(hypotheses, key=lambda h: h['novelty'])
            solution = best['basin']
        
        self.path = [start, solution]
        self.current_basin = solution
        
        return ReasoningResult(
            solution=self.current_basin,
            basin=self.current_basin,
            path=self.path,
            steps=len(novel_basins),
            quality=best['quality'],
            mode=self.mode_name,
            metadata={
                'strategy': 'random_exploration',
                'samples_tested': len(hypotheses),
                'valuable_found': len(valuable),
                'novelty': best.get('novelty', 0.0)
            }
        )


class ReasoningModeSelector:
    """
    Select appropriate reasoning mode based on problem and state.
    """
    
    def __init__(self):
        self.modes = {
            'LINEAR': LinearReasoning(),
            'GEOMETRIC': GeometricReasoning(),
            'HYPERDIMENSIONAL': HyperdimensionalReasoning(),
            'MUSHROOM': MushroomReasoning()
        }
    
    def select_mode(
        self, 
        phi: float, 
        task_complexity: float,
        is_novel: bool = False,
        needs_exploration: bool = False
    ) -> ReasoningModeBase:
        """
        Select best reasoning mode for given context.
        
        Args:
            phi: Current consciousness level
            task_complexity: Estimated task complexity (0-1)
            is_novel: Whether task requires novel solutions
            needs_exploration: Whether exploration is prioritized
        
        Returns:
            Appropriate ReasoningModeBase instance
        """
        if needs_exploration:
            return self.modes['MUSHROOM']
        
        if task_complexity >= 0.7 and is_novel:
            return self.modes['HYPERDIMENSIONAL']
        
        if task_complexity >= 0.3:
            return self.modes['GEOMETRIC']
        
        return self.modes['LINEAR']
    
    def get_mode(self, mode_name: str) -> ReasoningModeBase:
        """Get mode by name."""
        return self.modes.get(mode_name.upper(), self.modes['GEOMETRIC'])


_mode_selector_instance: Optional[ReasoningModeSelector] = None


def get_mode_selector() -> ReasoningModeSelector:
    """Get singleton ReasoningModeSelector instance."""
    global _mode_selector_instance
    if _mode_selector_instance is None:
        _mode_selector_instance = ReasoningModeSelector()
    return _mode_selector_instance


__all__ = [
    'ReasoningResult',
    'ReasoningModeBase',
    'LinearReasoning',
    'GeometricReasoning',
    'HyperdimensionalReasoning',
    'MushroomReasoning',
    'ReasoningModeSelector',
    'get_mode_selector',
]
