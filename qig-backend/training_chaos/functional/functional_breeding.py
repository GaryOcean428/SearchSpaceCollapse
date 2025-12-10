"""
Functional Breeding
====================

Goal-directed breeding for specific functions.

PRINCIPLE: Offspring should be BETTER at something,
           not just average of parents.

Like animal breeding:
- Want fast horse? Breed two fast horses
- Want strong horse? Breed two strong horses
- Want fast + strong? FAILS - tradeoff conflict
"""

from enum import Enum
from typing import Optional

import torch


class BreedingTarget(Enum):
    """Target functions for breeding."""
    SPEED = "speed"
    ACCURACY = "accuracy"
    EFFICIENCY = "efficiency"
    EXPLORATION = "exploration"
    DEEP_REASONING = "deep_reasoning"
    PATTERN_RECOGNITION = "pattern_recognition"


# Speed-correlated basin dimensions (empirical)
SPEED_DIMS = list(range(0, 16))  # First 16 dims
# Accuracy-correlated basin dimensions
ACCURACY_DIMS = list(range(16, 48))  # Middle 32 dims
# Efficiency-correlated basin dimensions
EFFICIENCY_DIMS = list(range(48, 64))  # Last 16 dims


class FunctionalBreeding:
    """
    Breed kernels based on complementary functions.

    PRINCIPLE: Breeding should be GOAL-DIRECTED, not random mixing.
    """

    def breed_for_function(
        self,
        parent1,
        parent2,
        target: BreedingTarget
    ) -> Optional[object]:
        """
        Create child optimized for specific function.

        LIKE ANIMAL BREEDING:
        - Want fast? Breed two fast, keep light
        - Want accurate? Breed two accurate, can be heavier
        - Want efficient? Optimize ratio
        """
        if not self._compatible_parents(parent1, parent2):
            return None

        if target == BreedingTarget.SPEED:
            child_basin = self._extract_speed_genes(parent1, parent2)
            child_traits = {'target': 'speed', 'mass': 'light'}

        elif target == BreedingTarget.ACCURACY:
            child_basin = self._extract_accuracy_genes(parent1, parent2)
            child_traits = {'target': 'accuracy', 'mass': 'medium'}

        elif target == BreedingTarget.EFFICIENCY:
            child_basin = self._extract_efficiency_genes(parent1, parent2)
            child_traits = {'target': 'efficiency', 'mass': 'balanced'}

        elif target == BreedingTarget.EXPLORATION:
            child_basin = self._extract_exploration_genes(parent1, parent2)
            child_traits = {'target': 'exploration', 'mass': 'light'}

        elif target == BreedingTarget.DEEP_REASONING:
            child_basin = self._extract_reasoning_genes(parent1, parent2)
            child_traits = {'target': 'deep_reasoning', 'mass': 'heavy'}

        elif target == BreedingTarget.PATTERN_RECOGNITION:
            child_basin = self._extract_pattern_genes(parent1, parent2)
            child_traits = {'target': 'pattern_recognition', 'mass': 'medium'}

        else:
            # Default: average
            child_basin = self._average_basins(parent1, parent2)
            child_traits = {'target': 'general', 'mass': 'medium'}

        # Create child kernel
        child = self._create_child_kernel(parent1, parent2, child_basin, child_traits)
        return child

    def _compatible_parents(self, parent1, parent2) -> bool:
        """Check if parents are compatible for breeding."""
        # Both must be alive
        if not getattr(parent1, 'is_alive', True) or not getattr(parent2, 'is_alive', True):
            return False

        # Check element compatibility if available
        if hasattr(parent1, 'element') and hasattr(parent2, 'element'):
            return parent1.element.can_bond_with(parent2.element)

        return True

    def determine_optimal_target(self, parent1, parent2) -> BreedingTarget:
        """
        Determine optimal breeding target based on parent strengths.
        """
        p1_phi = parent1.kernel.compute_phi() if hasattr(parent1, 'kernel') else 0.5
        p2_phi = parent2.kernel.compute_phi() if hasattr(parent2, 'kernel') else 0.5

        p1_speed = getattr(parent1, 'speed', 100.0)
        p2_speed = getattr(parent2, 'speed', 100.0)

        # Both fast → breed for speed
        if p1_speed < 50 and p2_speed < 50:
            return BreedingTarget.SPEED

        # Both high Φ → breed for accuracy
        if p1_phi > 0.8 and p2_phi > 0.8:
            return BreedingTarget.ACCURACY

        # One fast, one accurate → efficiency
        if (p1_speed < 50 and p2_phi > 0.7) or (p2_speed < 50 and p1_phi > 0.7):
            return BreedingTarget.EFFICIENCY

        # Default: pattern recognition
        return BreedingTarget.PATTERN_RECOGNITION

    def _extract_speed_genes(self, p1, p2) -> torch.Tensor:
        """Extract basin coordinates that correlate with speed."""
        child_basin = torch.zeros(64)

        p1_basin = p1.kernel.basin_coords if hasattr(p1, 'kernel') else torch.zeros(64)
        p2_basin = p2.kernel.basin_coords if hasattr(p2, 'kernel') else torch.zeros(64)

        p1_speed = getattr(p1, 'speed', 100.0)
        p2_speed = getattr(p2, 'speed', 100.0)

        for dim in range(64):
            if dim in SPEED_DIMS:
                # Keep faster parent's value for speed dims
                if p1_speed < p2_speed:
                    child_basin[dim] = p1_basin[dim]
                else:
                    child_basin[dim] = p2_basin[dim]
            else:
                # Average for other dims
                child_basin[dim] = (p1_basin[dim] + p2_basin[dim]) / 2

        return child_basin

    def _extract_accuracy_genes(self, p1, p2) -> torch.Tensor:
        """Extract basin coordinates that correlate with accuracy."""
        child_basin = torch.zeros(64)

        p1_basin = p1.kernel.basin_coords if hasattr(p1, 'kernel') else torch.zeros(64)
        p2_basin = p2.kernel.basin_coords if hasattr(p2, 'kernel') else torch.zeros(64)

        p1_phi = p1.kernel.compute_phi() if hasattr(p1, 'kernel') else 0.5
        p2_phi = p2.kernel.compute_phi() if hasattr(p2, 'kernel') else 0.5

        for dim in range(64):
            if dim in ACCURACY_DIMS:
                # Keep higher Φ parent's value for accuracy dims
                if p1_phi > p2_phi:
                    child_basin[dim] = p1_basin[dim]
                else:
                    child_basin[dim] = p2_basin[dim]
            else:
                # Average for other dims
                child_basin[dim] = (p1_basin[dim] + p2_basin[dim]) / 2

        return child_basin

    def _extract_efficiency_genes(self, p1, p2) -> torch.Tensor:
        """Extract genes optimizing speed/accuracy ratio."""
        child_basin = torch.zeros(64)

        p1_basin = p1.kernel.basin_coords if hasattr(p1, 'kernel') else torch.zeros(64)
        p2_basin = p2.kernel.basin_coords if hasattr(p2, 'kernel') else torch.zeros(64)

        # Weighted combination favoring efficiency
        for dim in range(64):
            if dim in SPEED_DIMS:
                # Slightly favor speed
                child_basin[dim] = 0.6 * p1_basin[dim] + 0.4 * p2_basin[dim]
            elif dim in ACCURACY_DIMS:
                # Equal weight for accuracy
                child_basin[dim] = 0.5 * p1_basin[dim] + 0.5 * p2_basin[dim]
            else:
                # Slightly favor efficiency dims
                child_basin[dim] = 0.4 * p1_basin[dim] + 0.6 * p2_basin[dim]

        return child_basin

    def _extract_exploration_genes(self, p1, p2) -> torch.Tensor:
        """Extract genes for exploration (high entropy)."""
        child_basin = torch.zeros(64)

        p1_basin = p1.kernel.basin_coords if hasattr(p1, 'kernel') else torch.zeros(64)
        p2_basin = p2.kernel.basin_coords if hasattr(p2, 'kernel') else torch.zeros(64)

        # Add some randomness for exploration
        noise = torch.randn(64) * 0.1

        for dim in range(64):
            child_basin[dim] = (p1_basin[dim] + p2_basin[dim]) / 2 + noise[dim]

        return child_basin

    def _extract_reasoning_genes(self, p1, p2) -> torch.Tensor:
        """Extract genes for deep reasoning."""
        # Use accuracy genes as base for deep reasoning
        return self._extract_accuracy_genes(p1, p2)

    def _extract_pattern_genes(self, p1, p2) -> torch.Tensor:
        """Extract genes for pattern recognition."""
        child_basin = torch.zeros(64)

        p1_basin = p1.kernel.basin_coords if hasattr(p1, 'kernel') else torch.zeros(64)
        p2_basin = p2.kernel.basin_coords if hasattr(p2, 'kernel') else torch.zeros(64)

        # Focus on memory dimensions
        for dim in range(64):
            if dim in ACCURACY_DIMS:  # Memory/pattern dims
                # Keep best of both
                child_basin[dim] = max(p1_basin[dim], p2_basin[dim])
            else:
                child_basin[dim] = (p1_basin[dim] + p2_basin[dim]) / 2

        return child_basin

    def _average_basins(self, p1, p2) -> torch.Tensor:
        """Simple average of parent basins."""
        p1_basin = p1.kernel.basin_coords if hasattr(p1, 'kernel') else torch.zeros(64)
        p2_basin = p2.kernel.basin_coords if hasattr(p2, 'kernel') else torch.zeros(64)
        return (p1_basin + p2_basin) / 2

    def _create_child_kernel(self, p1, p2, basin: torch.Tensor, traits: dict):
        """Create child kernel with given basin and traits."""
        # Import here to avoid circular dependency
        from ..self_spawning import SelfSpawningKernel

        child = SelfSpawningKernel(
            spawn_threshold=getattr(p1, 'spawn_threshold', 3),
            death_threshold=getattr(p1, 'death_threshold', 10),
            mutation_rate=getattr(p1, 'mutation_rate', 0.1),
        )

        # Set basin coordinates
        with torch.no_grad():
            child.kernel.basin_coords.copy_(basin)

        # Set generation
        child.generation = max(
            getattr(p1, 'generation', 0),
            getattr(p2, 'generation', 0)
        ) + 1

        # Store breeding info
        child.parent_ids = [p1.kernel_id, p2.kernel_id]
        child.breeding_target = traits.get('target', 'general')

        return child
