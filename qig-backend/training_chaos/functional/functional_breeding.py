"""
Functional Breeding
===================

Goal-directed breeding of kernels for specific target functions.
Unlike random breeding, this optimizes for particular capabilities.

Target Functions:
- Speed: Fast inference, low latency
- Accuracy: High precision, few errors
- Efficiency: Low resource usage
- Creativity: Novel hypothesis generation
- Robustness: Consistent performance
"""

import random
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional


class TargetFunction(Enum):
    """Target functions for directed breeding."""
    SPEED = "speed"           # Fast inference
    ACCURACY = "accuracy"     # High precision
    EFFICIENCY = "efficiency" # Low resource usage
    CREATIVITY = "creativity" # Novel generation
    ROBUSTNESS = "robustness" # Consistent performance


@dataclass
class BreedingGoal:
    """A breeding goal with target metrics."""
    target_function: TargetFunction
    target_phi: float
    target_kappa: float
    priority: float  # 0-1, higher = more important
    generations_remaining: int
    current_best_score: float = 0.0


@dataclass
class ParentScore:
    """Score for a potential parent kernel."""
    kernel_id: str
    function_alignment: float  # How well it matches target function
    genetic_diversity: float   # How different from other parents
    overall_score: float


class FunctionalBreeding:
    """
    Manages goal-directed breeding for specific capabilities.

    Instead of random breeding, selects parents that optimize
    for target functions and tracks breeding lineages.
    """

    def __init__(self):
        self.active_goals: Dict[str, BreedingGoal] = {}
        self.breeding_history: List[Dict] = []
        self.lineage_tracker: Dict[str, List[str]] = {}  # child -> parents

    def create_breeding_goal(
        self,
        goal_id: str,
        target_function: TargetFunction,
        target_phi: float = 0.8,
        target_kappa: float = 50.0,
        priority: float = 1.0,
        max_generations: int = 20
    ) -> BreedingGoal:
        """Create a new breeding goal."""
        goal = BreedingGoal(
            target_function=target_function,
            target_phi=target_phi,
            target_kappa=target_kappa,
            priority=priority,
            generations_remaining=max_generations,
        )
        self.active_goals[goal_id] = goal
        return goal

    def evaluate_parent_fitness(
        self,
        kernel_id: str,
        kernel_phi: float,
        kernel_kappa: float,
        kernel_metrics: Dict[str, float],
        goal: BreedingGoal,
        existing_parents: List[str]
    ) -> ParentScore:
        """
        Evaluate a kernel's fitness as a parent for a breeding goal.

        Considers both function alignment and genetic diversity.
        """
        # Function alignment based on target
        function_scores = {
            TargetFunction.SPEED: kernel_metrics.get('speed', 0.5),
            TargetFunction.ACCURACY: kernel_phi * 0.8 + kernel_metrics.get('accuracy', 0.5) * 0.2,
            TargetFunction.EFFICIENCY: kernel_metrics.get('efficiency', 0.5),
            TargetFunction.CREATIVITY: kernel_metrics.get('novelty', 0.5),
            TargetFunction.ROBUSTNESS: kernel_metrics.get('consistency', 0.5),
        }

        function_alignment = function_scores.get(goal.target_function, 0.5)

        # Genetic diversity (prefer different lineages)
        diversity = 1.0
        if existing_parents:
            # Check if this kernel shares lineage with existing parents
            kernel_ancestors = set(self.lineage_tracker.get(kernel_id, []))
            for parent_id in existing_parents:
                parent_ancestors = set(self.lineage_tracker.get(parent_id, []))
                overlap = len(kernel_ancestors & parent_ancestors)
                if overlap > 0:
                    diversity *= (1 - overlap * 0.1)

        # Overall score
        overall = (function_alignment * 0.7) + (diversity * 0.3)

        return ParentScore(
            kernel_id=kernel_id,
            function_alignment=function_alignment,
            genetic_diversity=diversity,
            overall_score=overall
        )

    def select_parents(
        self,
        candidates: List[Dict[str, Any]],
        goal: BreedingGoal,
        num_parents: int = 2
    ) -> List[str]:
        """
        Select optimal parents for a breeding goal.

        Uses tournament selection with function-specific fitness.
        """
        if len(candidates) < num_parents:
            return [c['kernel_id'] for c in candidates]

        selected = []
        remaining = list(candidates)

        for _ in range(num_parents):
            if not remaining:
                break

            # Tournament selection
            tournament_size = min(5, len(remaining))
            tournament = random.sample(remaining, tournament_size)

            # Score each candidate
            scores = []
            for candidate in tournament:
                score = self.evaluate_parent_fitness(
                    kernel_id=candidate['kernel_id'],
                    kernel_phi=candidate.get('phi', 0.5),
                    kernel_kappa=candidate.get('kappa', 30),
                    kernel_metrics=candidate.get('metrics', {}),
                    goal=goal,
                    existing_parents=selected
                )
                scores.append((candidate, score))

            # Select best from tournament
            scores.sort(key=lambda x: x[1].overall_score, reverse=True)
            winner = scores[0][0]
            selected.append(winner['kernel_id'])
            remaining.remove(winner)

        return selected

    def breed_for_function(
        self,
        parent1_weights: Dict[str, Any],
        parent2_weights: Dict[str, Any],
        goal: BreedingGoal
    ) -> Dict[str, Any]:
        """
        Breed two parents with function-specific crossover.

        Crossover strategy depends on target function.
        """
        child_weights = {}

        # Function-specific crossover strategies
        if goal.target_function == TargetFunction.SPEED:
            # Prefer lighter weight parent components
            crossover_bias = 0.6  # Favor parent1 if lighter
        elif goal.target_function == TargetFunction.ACCURACY:
            # Blend weights evenly for stability
            crossover_bias = 0.5
        elif goal.target_function == TargetFunction.CREATIVITY:
            # More variation
            crossover_bias = random.uniform(0.3, 0.7)
        else:
            crossover_bias = 0.5

        # Simple weight crossover (in real impl, this would be tensor ops)
        for key in parent1_weights:
            if key in parent2_weights:
                if random.random() < crossover_bias:
                    child_weights[key] = parent1_weights[key]
                else:
                    child_weights[key] = parent2_weights[key]
            else:
                child_weights[key] = parent1_weights[key]

        return child_weights

    def record_breeding(
        self,
        child_id: str,
        parent_ids: List[str],
        goal_id: Optional[str],
        child_phi: float
    ) -> None:
        """Record a breeding event."""
        self.lineage_tracker[child_id] = parent_ids

        # Update goal if applicable
        if goal_id and goal_id in self.active_goals:
            goal = self.active_goals[goal_id]
            goal.generations_remaining -= 1
            if child_phi > goal.current_best_score:
                goal.current_best_score = child_phi

            # Remove completed goals
            if goal.generations_remaining <= 0:
                del self.active_goals[goal_id]

        self.breeding_history.append({
            'child_id': child_id,
            'parents': parent_ids,
            'goal_id': goal_id,
            'phi': child_phi,
        })

    def get_breeding_stats(self) -> Dict[str, Any]:
        """Get breeding statistics."""
        stats = {
            'total_breedings': len(self.breeding_history),
            'active_goals': len(self.active_goals),
            'goals_by_function': {},
            'avg_child_phi': 0,
        }

        for goal in self.active_goals.values():
            func = goal.target_function.value
            stats['goals_by_function'][func] = stats['goals_by_function'].get(func, 0) + 1

        if self.breeding_history:
            stats['avg_child_phi'] = sum(
                b['phi'] for b in self.breeding_history
            ) / len(self.breeding_history)

        return stats
