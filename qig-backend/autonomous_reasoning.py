"""
QIG Autonomous Reasoning Learner - Learn Effective Reasoning Strategies

This system allows kernels to autonomously discover effective reasoning strategies through:
1. Strategy selection based on task features
2. Novel strategy generation via sampling from prior distributions
3. Strategy execution with step size and exploration parameters
4. Learning from outcomes (reinforcement)
5. Sleep consolidation (prune/merge strategies)

QIG PURITY: All operations use Fisher-Rao geometry exclusively.
- NO np.linalg.norm for distances
- Use fisher_coord_distance for all distance calculations
- Use geodesic_interpolation for all movement operations
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any
import numpy as np
from enum import Enum

from qig_geometry import (
    fisher_coord_distance,
    geodesic_interpolation,
    fisher_similarity,
    estimate_manifold_curvature,
    fisher_normalize,
    sphere_project
)
from qig_persistence import get_persistence


@dataclass
class ReasoningStrategy:
    """
    A reasoning strategy with learned parameters.
    
    Strategies are characterized by:
    - phi_range: What consciousness levels they work best at
    - step_size_alpha: How big steps to take (0-1)
    - exploration_beta: How much to explore vs exploit (0-1)
    - task_features: What kind of tasks this strategy is good for
    - value: Learned value estimate from reinforcement
    """
    name: str
    description: str
    preferred_phi_range: Tuple[float, float]
    step_size_alpha: float
    exploration_beta: float
    task_features: np.ndarray
    value: float = 0.0
    success_count: int = 0
    failure_count: int = 0
    
    def __post_init__(self):
        if isinstance(self.task_features, list):
            self.task_features = np.array(self.task_features)
    
    @property
    def total_uses(self) -> int:
        return self.success_count + self.failure_count
    
    @property
    def success_rate(self) -> float:
        if self.total_uses == 0:
            return 0.5
        return self.success_count / self.total_uses
    
    @property
    def ucb_score(self) -> float:
        """Upper Confidence Bound score for exploration."""
        if self.total_uses == 0:
            return float('inf')
        exploration_bonus = np.sqrt(2 * np.log(self.total_uses + 1) / self.total_uses)
        return self.value + exploration_bonus
    
    def matches_phi(self, phi: float) -> bool:
        """Check if this strategy is appropriate for given phi level."""
        return self.preferred_phi_range[0] <= phi <= self.preferred_phi_range[1]
    
    def to_dict(self) -> Dict:
        """Serialize strategy to dictionary."""
        return {
            'name': self.name,
            'description': self.description,
            'preferred_phi_range': list(self.preferred_phi_range),
            'step_size_alpha': self.step_size_alpha,
            'exploration_beta': self.exploration_beta,
            'task_features': self.task_features.tolist(),
            'value': self.value,
            'success_count': self.success_count,
            'failure_count': self.failure_count
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'ReasoningStrategy':
        """Deserialize strategy from dictionary."""
        return cls(
            name=data['name'],
            description=data['description'],
            preferred_phi_range=tuple(data['preferred_phi_range']),
            step_size_alpha=data['step_size_alpha'],
            exploration_beta=data['exploration_beta'],
            task_features=np.array(data['task_features']),
            value=data.get('value', 0.0),
            success_count=data.get('success_count', 0),
            failure_count=data.get('failure_count', 0)
        )


@dataclass
class ReasoningEpisode:
    """Record of a reasoning episode for learning."""
    strategy: ReasoningStrategy
    start_basin: np.ndarray
    target_basin: np.ndarray
    path: List[np.ndarray] = field(default_factory=list)
    final_basin: Optional[np.ndarray] = None
    steps_taken: int = 0
    task_features: Optional[np.ndarray] = None
    phi_during: float = 0.5
    success: bool = False
    
    def to_dict(self) -> Dict:
        return {
            'strategy_name': self.strategy.name,
            'start_basin': self.start_basin.tolist(),
            'target_basin': self.target_basin.tolist(),
            'path': [p.tolist() for p in self.path],
            'final_basin': self.final_basin.tolist() if self.final_basin is not None else None,
            'steps_taken': self.steps_taken,
            'task_features': self.task_features.tolist() if self.task_features is not None else None,
            'phi_during': self.phi_during,
            'success': self.success
        }


class StrategyLibrary:
    """
    Manage collection of reasoning strategies.
    
    Provides:
    - Adding new strategies
    - Finding strategies for given task features
    - Pruning unsuccessful strategies
    - Merging similar strategies
    
    QIG PURITY: All similarity/distance uses Fisher-Rao geometry.
    """
    
    def __init__(self, feature_dim: int = 64):
        self.strategies: List[ReasoningStrategy] = []
        self.feature_dim = feature_dim
        self._initialize_default_strategies()
    
    def _initialize_default_strategies(self) -> None:
        """Initialize with default reasoning strategies."""
        self.strategies = [
            ReasoningStrategy(
                name="direct_geodesic",
                description="Simple direct path following geodesic",
                preferred_phi_range=(0.0, 0.4),
                step_size_alpha=0.3,
                exploration_beta=0.1,
                task_features=np.zeros(self.feature_dim),
                value=0.5
            ),
            ReasoningStrategy(
                name="exploratory_walk",
                description="Random walk with exploration for novel problems",
                preferred_phi_range=(0.4, 0.7),
                step_size_alpha=0.2,
                exploration_beta=0.5,
                task_features=np.zeros(self.feature_dim),
                value=0.3
            ),
            ReasoningStrategy(
                name="cautious_approach",
                description="Small steps with high coherence",
                preferred_phi_range=(0.3, 0.6),
                step_size_alpha=0.1,
                exploration_beta=0.2,
                task_features=np.zeros(self.feature_dim),
                value=0.4
            ),
            ReasoningStrategy(
                name="bold_leap",
                description="Large steps for familiar territory",
                preferred_phi_range=(0.2, 0.5),
                step_size_alpha=0.5,
                exploration_beta=0.1,
                task_features=np.zeros(self.feature_dim),
                value=0.4
            ),
            ReasoningStrategy(
                name="hyperdimensional_integration",
                description="Multi-path synthesis for complex problems",
                preferred_phi_range=(0.6, 0.9),
                step_size_alpha=0.25,
                exploration_beta=0.4,
                task_features=np.zeros(self.feature_dim),
                value=0.35
            )
        ]
    
    def add(self, strategy: ReasoningStrategy) -> None:
        """Add a new strategy to the library."""
        self.strategies.append(strategy)
    
    def remove(self, strategy_name: str) -> bool:
        """Remove a strategy by name."""
        for i, s in enumerate(self.strategies):
            if s.name == strategy_name:
                self.strategies.pop(i)
                return True
        return False
    
    def find_for_task(
        self, 
        task_features: np.ndarray,
        phi: float,
        top_k: int = 3
    ) -> List[ReasoningStrategy]:
        """
        Find best strategies for given task features and phi level.
        
        Uses Fisher-Rao similarity between task features and strategy features.
        
        Args:
            task_features: Feature vector describing the task
            phi: Current consciousness level
            top_k: Number of top strategies to return
        
        Returns:
            List of best matching strategies
        """
        if not self.strategies:
            return []
        
        task_features = np.array(task_features)
        
        scored_strategies = []
        for strategy in self.strategies:
            if not strategy.matches_phi(phi):
                continue
            
            feature_similarity = fisher_similarity(
                task_features, 
                strategy.task_features
            )
            
            phi_match = 1.0 - abs(
                phi - (strategy.preferred_phi_range[0] + strategy.preferred_phi_range[1]) / 2
            )
            
            score = (
                0.4 * feature_similarity +
                0.3 * phi_match +
                0.3 * strategy.value
            )
            
            scored_strategies.append((score, strategy))
        
        scored_strategies.sort(key=lambda x: x[0], reverse=True)
        return [s for _, s in scored_strategies[:top_k]]
    
    def find_by_name(self, name: str) -> Optional[ReasoningStrategy]:
        """Find a strategy by name."""
        for strategy in self.strategies:
            if strategy.name == name:
                return strategy
        return None
    
    def prune(self, min_uses: int = 5, min_success_rate: float = 0.3) -> List[str]:
        """
        Prune strategies that consistently fail.
        
        Args:
            min_uses: Minimum uses before considering for pruning
            min_success_rate: Minimum success rate to keep strategy
        
        Returns:
            List of pruned strategy names
        """
        pruned = []
        surviving = []
        
        for strategy in self.strategies:
            if strategy.total_uses < min_uses:
                surviving.append(strategy)
                continue
            
            if strategy.success_rate >= min_success_rate:
                surviving.append(strategy)
            else:
                pruned.append(strategy.name)
        
        self.strategies = surviving
        return pruned
    
    def merge_similar(self, similarity_threshold: float = 0.9) -> int:
        """
        Merge strategies that are very similar.
        
        Uses Fisher-Rao similarity between strategy features.
        
        Args:
            similarity_threshold: Strategies more similar than this get merged
        
        Returns:
            Number of merges performed
        """
        if len(self.strategies) < 2:
            return 0
        
        merges = 0
        i = 0
        
        while i < len(self.strategies):
            j = i + 1
            while j < len(self.strategies):
                s1 = self.strategies[i]
                s2 = self.strategies[j]
                
                similarity = fisher_similarity(s1.task_features, s2.task_features)
                
                if similarity >= similarity_threshold:
                    merged = self._merge_two_strategies(s1, s2)
                    self.strategies[i] = merged
                    self.strategies.pop(j)
                    merges += 1
                else:
                    j += 1
            i += 1
        
        return merges
    
    def _merge_two_strategies(
        self, 
        s1: ReasoningStrategy, 
        s2: ReasoningStrategy
    ) -> ReasoningStrategy:
        """
        Merge two strategies using geodesic interpolation.
        
        QIG PURITY: Uses geodesic_interpolation for feature merging.
        """
        total_uses = s1.total_uses + s2.total_uses
        w1 = s1.total_uses / max(total_uses, 1)
        w2 = 1.0 - w1
        
        merged_features = geodesic_interpolation(
            s1.task_features,
            s2.task_features,
            w2
        )
        
        merged_value = w1 * s1.value + w2 * s2.value
        merged_alpha = w1 * s1.step_size_alpha + w2 * s2.step_size_alpha
        merged_beta = w1 * s1.exploration_beta + w2 * s2.exploration_beta
        
        phi_min = min(s1.preferred_phi_range[0], s2.preferred_phi_range[0])
        phi_max = max(s1.preferred_phi_range[1], s2.preferred_phi_range[1])
        
        return ReasoningStrategy(
            name=f"{s1.name}+{s2.name}",
            description=f"Merged: {s1.description} | {s2.description}",
            preferred_phi_range=(phi_min, phi_max),
            step_size_alpha=merged_alpha,
            exploration_beta=merged_beta,
            task_features=merged_features,
            value=merged_value,
            success_count=s1.success_count + s2.success_count,
            failure_count=s1.failure_count + s2.failure_count
        )
    
    def get_all(self) -> List[ReasoningStrategy]:
        """Get all strategies."""
        return self.strategies.copy()
    
    def to_dict(self) -> Dict:
        """Serialize library to dictionary."""
        return {
            'feature_dim': self.feature_dim,
            'strategies': [s.to_dict() for s in self.strategies]
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'StrategyLibrary':
        """Deserialize library from dictionary."""
        library = cls(feature_dim=data.get('feature_dim', 64))
        library.strategies = [
            ReasoningStrategy.from_dict(s) 
            for s in data.get('strategies', [])
        ]
        return library


class ReasoningLearner:
    """
    Autonomous learner that discovers effective reasoning strategies.
    
    Capabilities:
    1. Strategy selection (epsilon-greedy with UCB)
    2. Strategy execution using geodesic navigation
    3. Learning from outcomes (reinforcement)
    4. Sleep consolidation (prune failures, merge similar)
    5. Novel strategy generation
    
    QIG PURITY: All operations use Fisher-Rao geometry exclusively.
    """
    
    def __init__(
        self,
        basin_dim: int = 64,
        epsilon: float = 0.1,
        learning_rate: float = 0.1,
        max_steps: int = 50
    ):
        """
        Initialize the reasoning learner.
        
        Args:
            basin_dim: Dimensionality of basin coordinates
            epsilon: Exploration rate for epsilon-greedy
            learning_rate: Learning rate for value updates
            max_steps: Maximum steps per reasoning episode
        """
        self.basin_dim = basin_dim
        self.epsilon = epsilon
        self.learning_rate = learning_rate
        self.max_steps = max_steps
        
        self.library = StrategyLibrary(feature_dim=basin_dim)
        self.episode_history: List[ReasoningEpisode] = []
        self.total_episodes = 0
    
    def select_strategy(
        self, 
        task_features: np.ndarray, 
        phi: float
    ) -> ReasoningStrategy:
        """
        Select a strategy using epsilon-greedy with UCB exploration.
        
        Args:
            task_features: Feature vector describing the task
            phi: Current consciousness level (0-1)
        
        Returns:
            Selected strategy
        """
        candidates = self.library.find_for_task(task_features, phi, top_k=5)
        
        if not candidates:
            return self.generate_novel_strategy(task_features, phi)
        
        if np.random.random() < self.epsilon:
            return np.random.choice(candidates)
        
        best_strategy = max(candidates, key=lambda s: s.ucb_score)
        return best_strategy
    
    def execute_strategy(
        self, 
        strategy: ReasoningStrategy,
        start_basin: np.ndarray,
        target_basin: np.ndarray,
        task_features: Optional[np.ndarray] = None,
        phi: float = 0.5
    ) -> ReasoningEpisode:
        """
        Execute a reasoning strategy from start to target basin.
        
        Uses geodesic navigation with strategy-specific parameters:
        - step_size_alpha: How far to move each step
        - exploration_beta: How much random exploration to add
        
        QIG PURITY: Uses geodesic_interpolation for all movement.
        
        Args:
            strategy: The strategy to execute
            start_basin: Starting basin coordinates
            target_basin: Target basin coordinates
            task_features: Optional task features for the episode
            phi: Current consciousness level
        
        Returns:
            ReasoningEpisode with results
        """
        start_basin = np.array(start_basin)
        target_basin = np.array(target_basin)
        
        episode = ReasoningEpisode(
            strategy=strategy,
            start_basin=start_basin.copy(),
            target_basin=target_basin.copy(),
            task_features=task_features,
            phi_during=phi
        )
        
        current = start_basin.copy()
        episode.path.append(current.copy())
        
        success_threshold = 0.1
        
        for step in range(self.max_steps):
            distance_to_target = fisher_coord_distance(current, target_basin)
            
            if distance_to_target < success_threshold:
                episode.success = True
                break
            
            next_point = geodesic_interpolation(
                current,
                target_basin,
                strategy.step_size_alpha
            )
            
            if strategy.exploration_beta > 0:
                exploration_noise = np.random.randn(self.basin_dim)
                exploration_noise = sphere_project(exploration_noise)
                
                next_point = geodesic_interpolation(
                    next_point,
                    next_point + exploration_noise * strategy.exploration_beta,
                    strategy.exploration_beta
                )
            
            current = next_point
            episode.path.append(current.copy())
            episode.steps_taken += 1
        
        episode.final_basin = current.copy()
        
        final_distance = fisher_coord_distance(current, target_basin)
        if final_distance < success_threshold:
            episode.success = True
        
        return episode
    
    def learn_from_outcome(
        self, 
        episode: ReasoningEpisode, 
        reward: float
    ) -> None:
        """
        Update strategy value based on episode outcome.
        
        Uses temporal difference learning:
        V(s) <- V(s) + α * (R - V(s))
        
        Also updates success/failure counts.
        
        Args:
            episode: The completed reasoning episode
            reward: Reward signal (-1 to 1)
        """
        strategy = episode.strategy
        library_strategy = self.library.find_by_name(strategy.name)
        
        if library_strategy is None:
            self.library.add(strategy)
            library_strategy = strategy
        
        td_error = reward - library_strategy.value
        library_strategy.value += self.learning_rate * td_error
        library_strategy.value = np.clip(library_strategy.value, 0.0, 1.0)
        
        if episode.success:
            library_strategy.success_count += 1
        else:
            library_strategy.failure_count += 1
        
        if episode.task_features is not None:
            weight = 0.1
            library_strategy.task_features = geodesic_interpolation(
                library_strategy.task_features,
                episode.task_features,
                weight
            )
        
        self.episode_history.append(episode)
        self.total_episodes += 1
        
        persistence = get_persistence()
        persistence.insert_reasoning_episode(
            strategy_name=episode.strategy.name,
            start_basin=episode.start_basin,
            target_basin=episode.target_basin,
            final_basin=episode.final_basin,
            steps_taken=episode.steps_taken,
            task_features=episode.task_features,
            phi_during=episode.phi_during,
            success=episode.success,
            reward=reward
        )
    
    def consolidate_during_sleep(
        self,
        prune_threshold: float = 0.2,
        merge_threshold: float = 0.85,
        min_uses_for_prune: int = 5
    ) -> Dict:
        """
        Sleep consolidation: prune failures, merge similar strategies.
        
        This simulates memory consolidation during sleep:
        1. Prune strategies that consistently fail
        2. Merge strategies that are very similar
        3. Strengthen successful strategies
        
        Args:
            prune_threshold: Success rate below this gets pruned
            merge_threshold: Similarity above this triggers merge
            min_uses_for_prune: Minimum uses before considering prune
        
        Returns:
            Dict with consolidation statistics
        """
        stats = {
            'strategies_before': len(self.library.strategies),
            'pruned': [],
            'merges': 0,
            'strengthened': []
        }
        
        pruned_names = self.library.prune(
            min_uses=min_uses_for_prune,
            min_success_rate=prune_threshold
        )
        stats['pruned'] = pruned_names
        
        merges = self.library.merge_similar(similarity_threshold=merge_threshold)
        stats['merges'] = merges
        
        for strategy in self.library.strategies:
            if strategy.success_rate > 0.7 and strategy.total_uses >= 10:
                strategy.value = min(strategy.value * 1.1, 1.0)
                stats['strengthened'].append(strategy.name)
        
        stats['strategies_after'] = len(self.library.strategies)
        
        return stats
    
    def generate_novel_strategy(
        self, 
        task_features: Optional[np.ndarray] = None,
        phi: float = 0.5
    ) -> ReasoningStrategy:
        """
        Generate a novel strategy by sampling from prior distributions.
        
        Samples:
        - step_size_alpha from Beta distribution
        - exploration_beta from Beta distribution
        - phi_range centered around current phi
        - task_features from Gaussian or interpolating existing
        
        Args:
            task_features: Optional task features to bias toward
            phi: Current phi level to center strategy around
        
        Returns:
            Newly generated strategy
        """
        step_size_alpha = float(np.random.beta(2, 5))
        exploration_beta = float(np.random.beta(2, 3))
        
        phi_width = np.random.uniform(0.2, 0.4)
        phi_min = max(0.0, phi - phi_width / 2)
        phi_max = min(1.0, phi + phi_width / 2)
        
        if task_features is not None:
            base_features = np.array(task_features)
            noise = np.random.randn(self.basin_dim) * 0.1
            features = geodesic_interpolation(
                base_features,
                base_features + noise,
                0.1
            )
        elif self.library.strategies:
            parent = np.random.choice(self.library.strategies)
            noise = np.random.randn(self.basin_dim) * 0.2
            features = geodesic_interpolation(
                parent.task_features,
                parent.task_features + noise,
                0.2
            )
        else:
            features = sphere_project(np.random.randn(self.basin_dim))
        
        strategy_id = len(self.library.strategies) + np.random.randint(1000)
        
        strategy = ReasoningStrategy(
            name=f"novel_{strategy_id}",
            description=f"Auto-generated strategy (α={step_size_alpha:.2f}, β={exploration_beta:.2f})",
            preferred_phi_range=(phi_min, phi_max),
            step_size_alpha=step_size_alpha,
            exploration_beta=exploration_beta,
            task_features=features,
            value=0.3
        )
        
        self.library.add(strategy)
        return strategy
    
    def compute_episode_reward(self, episode: ReasoningEpisode) -> float:
        """
        Compute reward for an episode based on outcome quality.
        
        QIG PURITY: Uses Fisher-Rao distance for all measurements.
        
        Args:
            episode: Completed reasoning episode
        
        Returns:
            Reward value (-1 to 1)
        """
        final_distance = fisher_coord_distance(
            episode.final_basin if episode.final_basin is not None else episode.start_basin,
            episode.target_basin
        )
        
        initial_distance = fisher_coord_distance(
            episode.start_basin,
            episode.target_basin
        )
        
        if initial_distance < 1e-10:
            distance_reward = 1.0
        else:
            progress = (initial_distance - final_distance) / initial_distance
            distance_reward = progress
        
        if len(episode.path) > 1:
            total_path_length = sum(
                fisher_coord_distance(episode.path[i], episode.path[i+1])
                for i in range(len(episode.path) - 1)
            )
            optimal_length = initial_distance
            efficiency = optimal_length / (total_path_length + 1e-10) if total_path_length > 0 else 1.0
            efficiency_reward = min(efficiency, 1.0)
        else:
            efficiency_reward = 0.5
        
        step_penalty = episode.steps_taken / self.max_steps
        
        success_bonus = 0.3 if episode.success else 0.0
        
        reward = (
            0.4 * distance_reward +
            0.2 * efficiency_reward +
            0.1 * (1.0 - step_penalty) +
            0.3 * success_bonus
        )
        
        reward = np.clip(reward, -1.0, 1.0)
        return float(reward)
    
    def run_episode(
        self,
        start_basin: np.ndarray,
        target_basin: np.ndarray,
        task_features: Optional[np.ndarray] = None,
        phi: float = 0.5
    ) -> Tuple[ReasoningEpisode, float]:
        """
        Run a complete learning episode.
        
        1. Select strategy
        2. Execute strategy
        3. Compute reward
        4. Learn from outcome
        
        Args:
            start_basin: Starting basin coordinates
            target_basin: Target basin coordinates
            task_features: Optional task features
            phi: Current consciousness level
        
        Returns:
            Tuple of (episode, reward)
        """
        if task_features is None:
            task_features = sphere_project(
                (np.array(start_basin) + np.array(target_basin)) / 2
            )
        
        strategy = self.select_strategy(task_features, phi)
        
        episode = self.execute_strategy(
            strategy=strategy,
            start_basin=start_basin,
            target_basin=target_basin,
            task_features=task_features,
            phi=phi
        )
        
        reward = self.compute_episode_reward(episode)
        
        self.learn_from_outcome(episode, reward)
        
        return episode, reward
    
    def get_statistics(self) -> Dict:
        """Get learning statistics."""
        return {
            'total_episodes': self.total_episodes,
            'num_strategies': len(self.library.strategies),
            'strategy_stats': [
                {
                    'name': s.name,
                    'value': s.value,
                    'success_rate': s.success_rate,
                    'total_uses': s.total_uses
                }
                for s in self.library.strategies
            ],
            'epsilon': self.epsilon,
            'learning_rate': self.learning_rate
        }
    
    def get_performance_summary(self) -> Dict:
        """Get performance summary from PostgreSQL, grouped by strategy."""
        persistence = get_persistence()
        db_stats = persistence.get_reasoning_episode_stats()
        
        return {
            'total_episodes': self.total_episodes,
            'db_episode_stats': db_stats,
            'strategy_performance': [
                {
                    'strategy_name': stat.get('strategy_name'),
                    'total_episodes': stat.get('total_episodes', 0),
                    'success_count': stat.get('success_count', 0),
                    'success_rate': float(stat.get('success_rate', 0) or 0),
                    'avg_reward': float(stat.get('avg_reward', 0) or 0),
                    'avg_steps': float(stat.get('avg_steps', 0) or 0),
                    'avg_phi': float(stat.get('avg_phi', 0) or 0),
                }
                for stat in db_stats
            ]
        }
    
    def to_dict(self) -> Dict:
        """Serialize learner state to dictionary."""
        return {
            'basin_dim': self.basin_dim,
            'epsilon': self.epsilon,
            'learning_rate': self.learning_rate,
            'max_steps': self.max_steps,
            'library': self.library.to_dict(),
            'total_episodes': self.total_episodes,
            'episode_history': [e.to_dict() for e in self.episode_history[-100:]]
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'ReasoningLearner':
        """Deserialize learner state from dictionary."""
        learner = cls(
            basin_dim=data.get('basin_dim', 64),
            epsilon=data.get('epsilon', 0.1),
            learning_rate=data.get('learning_rate', 0.1),
            max_steps=data.get('max_steps', 50)
        )
        if 'library' in data:
            learner.library = StrategyLibrary.from_dict(data['library'])
        learner.total_episodes = data.get('total_episodes', 0)
        return learner


_reasoning_learner_instance: Optional[ReasoningLearner] = None


def get_reasoning_learner(
    basin_dim: int = 64,
    epsilon: float = 0.1,
    learning_rate: float = 0.1,
    reset: bool = False
) -> ReasoningLearner:
    """
    Get singleton instance of ReasoningLearner.
    
    Args:
        basin_dim: Dimensionality of basin coordinates
        epsilon: Exploration rate
        learning_rate: Learning rate for updates
        reset: If True, create new instance
    
    Returns:
        ReasoningLearner instance
    """
    global _reasoning_learner_instance
    
    if _reasoning_learner_instance is None or reset:
        _reasoning_learner_instance = ReasoningLearner(
            basin_dim=basin_dim,
            epsilon=epsilon,
            learning_rate=learning_rate
        )
    
    return _reasoning_learner_instance


__all__ = [
    'ReasoningStrategy',
    'ReasoningEpisode',
    'StrategyLibrary',
    'ReasoningLearner',
    'get_reasoning_learner'
]
