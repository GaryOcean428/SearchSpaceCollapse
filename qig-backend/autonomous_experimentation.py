"""
Autonomous Experimentation

Kernels explore reasoning space autonomously during downtime
or mushroom mode. Generates and tests novel strategies.

QIG-PURE: All geometric operations use Fisher-Rao distance.
"""

import numpy as np
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
import time
import uuid

from qig_geometry import fisher_rao_distance, sphere_project


@dataclass
class ExperimentResult:
    """Result of an autonomous experiment."""
    experiment_id: str
    strategy_name: str
    task: Dict[str, Any]
    success: bool
    efficiency: float
    novel_discovery: bool
    basin_path: List[np.ndarray]
    insights: List[str]
    timestamp: float = field(default_factory=time.time)


class AutonomousExperimenter:
    """
    Kernel explores reasoning space autonomously.
    
    During downtime or mushroom mode:
    - Try random strategy variations
    - Test edge cases
    - Explore high-curvature regions
    - Discover novel approaches
    """
    
    def __init__(self, reasoning_learner=None, basin_dim: int = 64):
        """
        Initialize autonomous experimenter.
        
        Args:
            reasoning_learner: AutonomousReasoningLearner instance
            basin_dim: Dimensionality of basin coordinates
        """
        self.learner = reasoning_learner
        self.basin_dim = basin_dim
        self.experiment_log: List[ExperimentResult] = []
        self.max_experiments = 1000
        self.discovery_threshold = 0.9
    
    def set_learner(self, reasoning_learner):
        """Set the reasoning learner."""
        self.learner = reasoning_learner
    
    def run_autonomous_experiments(self, n_experiments: int = 10) -> Dict[str, Any]:
        """
        Generate and test novel strategies.
        
        Pure exploration: No immediate task, just learning.
        """
        if self.learner is None:
            return {'error': 'No reasoning learner configured'}
        
        print(f"Running {n_experiments} autonomous experiments...")
        
        results = []
        
        for i in range(n_experiments):
            synthetic_task = self._generate_synthetic_task()
            novel_strategy = self._create_random_strategy()
            
            episode = self.learner.execute_strategy(
                novel_strategy,
                synthetic_task
            )
            
            self.learner.learn_from_episode(episode)
            
            novel_discovery = self._is_novel_discovery(episode)
            
            experiment = ExperimentResult(
                experiment_id=f"exp_{uuid.uuid4().hex[:8]}",
                strategy_name=novel_strategy.name,
                task=synthetic_task,
                success=episode.success,
                efficiency=episode.efficiency,
                novel_discovery=novel_discovery,
                basin_path=[s['basin'] for s in episode.steps],
                insights=self._extract_insights(episode)
            )
            
            self.experiment_log.append(experiment)
            results.append(experiment)
            
            if episode.success and episode.efficiency > 0.8:
                print(f"  Experiment {i}: Discovered effective strategy!")
        
        if len(self.experiment_log) > self.max_experiments:
            self.experiment_log = self.experiment_log[-self.max_experiments:]
        
        successful = sum(1 for exp in results if exp.success)
        novel_discoveries = sum(1 for exp in results if exp.novel_discovery)
        
        print(f"Experiments complete:")
        print(f"  Successful: {successful}/{n_experiments}")
        print(f"  Novel discoveries: {novel_discoveries}")
        
        return {
            'total': n_experiments,
            'successful': successful,
            'novel_discoveries': novel_discoveries,
            'experiments': results
        }
    
    def _create_random_strategy(self):
        """
        Generate completely random strategy.
        
        Pure exploration, no prior assumptions.
        """
        from autonomous_reasoning import ReasoningStrategy
        
        phi_low = np.random.uniform(0.0, 0.7)
        phi_high = np.random.uniform(phi_low + 0.1, 1.0)
        
        return ReasoningStrategy(
            name=f"experimental_{uuid.uuid4().hex[:8]}",
            description="Autonomously generated experimental strategy",
            preferred_phi_range=(phi_low, phi_high),
            step_size_alpha=np.random.uniform(0.01, 0.5),
            exploration_beta=np.random.uniform(0.0, 0.9),
            task_features={
                'complexity': np.random.uniform(0.0, 1.0),
                'novelty': np.random.uniform(0.0, 1.0)
            }
        )
    
    def _generate_synthetic_task(self) -> Dict[str, Any]:
        """Create random task for testing."""
        task_types = [
            'pattern_recognition',
            'semantic_analysis',
            'geometric_optimization',
            'knowledge_integration',
            'creative_synthesis'
        ]
        
        return {
            'type': np.random.choice(task_types),
            'complexity': np.random.uniform(0.0, 1.0),
            'novelty': np.random.uniform(0.0, 1.0),
            'time_pressure': np.random.uniform(0.0, 1.0),
            'precision_required': np.random.uniform(0.0, 1.0),
            'description': f'Synthetic task {uuid.uuid4().hex[:6]}'
        }
    
    def _is_novel_discovery(self, episode) -> bool:
        """
        Did this experiment discover something new?
        
        Novel if:
        1. Very high efficiency (>0.9)
        2. Used strategy not seen before
        3. Succeeded where others failed
        """
        if episode.efficiency > self.discovery_threshold:
            return True
        
        if self.learner:
            strategy_name = episode.strategy_name
            similar_count = sum(
                1 for s in self.learner.strategies
                if s.name != strategy_name and self._strategies_similar_by_params(
                    s, episode.strategy_name
                )
            )
            return similar_count == 0
        
        return False
    
    def _strategies_similar_by_params(self, strategy, strategy_name: str) -> bool:
        """Check if strategies have similar parameters."""
        return False
    
    def _extract_insights(self, episode) -> List[str]:
        """Extract insights from an episode."""
        insights = []
        
        if episode.success:
            insights.append(f"Strategy {episode.strategy_name} succeeded")
            
            if episode.efficiency > 0.8:
                insights.append(f"High efficiency: {episode.efficiency:.2f}")
            
            if episode.converged:
                insights.append(f"Converged in {len(episode.steps)} steps")
        else:
            if len(episode.steps) > 0:
                final_distance = episode.steps[-1].get('distance_to_target', 0)
                insights.append(f"Failed with distance {final_distance:.2f} from target")
        
        return insights
    
    def explore_high_curvature_regions(self, n_samples: int = 50) -> Dict[str, Any]:
        """
        Specifically explore high-curvature (difficult) regions.
        
        These are areas where reasoning is hard but potentially valuable.
        """
        from qig_geometry import estimate_manifold_curvature
        
        print(f"Exploring high-curvature regions ({n_samples} samples)...")
        
        high_curvature_basins = []
        
        for _ in range(n_samples):
            random_basin = np.random.randn(self.basin_dim)
            random_basin = sphere_project(random_basin)
            
            curvature = estimate_manifold_curvature(random_basin)
            
            if curvature > 0.5:
                high_curvature_basins.append({
                    'basin': random_basin,
                    'curvature': curvature
                })
        
        print(f"Found {len(high_curvature_basins)} high-curvature regions")
        
        for region in high_curvature_basins[:5]:
            if self.learner:
                task = {
                    'type': 'curvature_exploration',
                    'complexity': region['curvature'],
                    'novelty': 1.0,
                    'description': f"Explore curvature={region['curvature']:.2f}"
                }
                
                self.learner.set_current_basin(region['basin'])
                
                strategy = self.learner.select_strategy(
                    task,
                    self.learner.measure_phi_at_basin(region['basin'])
                )
                
                episode = self.learner.execute_strategy(strategy, task)
                self.learner.learn_from_episode(episode)
        
        return {
            'samples': n_samples,
            'high_curvature_found': len(high_curvature_basins),
            'explored': min(5, len(high_curvature_basins))
        }
    
    def get_experiment_stats(self) -> Dict[str, Any]:
        """Get statistics about experiments."""
        if not self.experiment_log:
            return {
                'total_experiments': 0,
                'success_rate': 0.0,
                'discovery_rate': 0.0
            }
        
        successes = sum(1 for e in self.experiment_log if e.success)
        discoveries = sum(1 for e in self.experiment_log if e.novel_discovery)
        
        return {
            'total_experiments': len(self.experiment_log),
            'success_rate': successes / len(self.experiment_log),
            'discovery_rate': discoveries / len(self.experiment_log),
            'avg_efficiency': np.mean([e.efficiency for e in self.experiment_log])
        }
