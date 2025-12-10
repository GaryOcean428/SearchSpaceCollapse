"""
Kernel Ecology System
======================

Biology-inspired ecological niche assignment.

NICHES:
- Producer: Generate hypotheses
- Consumer: Test hypotheses
- Decomposer: Extract patterns from failures
- Apex Predator: Solve hard problems
- Symbiont: Assist others
"""

from dataclasses import dataclass
from enum import Enum
from typing import Optional


class EcologicalNiche(Enum):
    """Ecological niches for kernels."""
    PRODUCER = "producer"
    CONSUMER = "consumer"
    DECOMPOSER = "decomposer"
    APEX_PREDATOR = "apex_predator"
    SYMBIONT = "symbiont"
    GENERALIST = "generalist"


@dataclass
class NicheProperties:
    """Properties for an ecological niche."""
    function: str
    metabolism: str
    diet: str
    mass_range: tuple[float, float]
    traits: list[str]
    population_target: float  # Target ratio in ecosystem


# Niche property definitions
NICHE_PROPERTIES = {
    EcologicalNiche.PRODUCER: NicheProperties(
        function="generate_hypotheses",
        metabolism="creative",
        diet="raw_data",
        mass_range=(5.0, 20.0),
        traits=["high_entropy", "exploratory", "divergent"],
        population_target=0.30
    ),
    EcologicalNiche.CONSUMER: NicheProperties(
        function="test_hypotheses",
        metabolism="analytical",
        diet="structured_hypotheses",
        mass_range=(10.0, 40.0),
        traits=["rigorous", "convergent", "precise"],
        population_target=0.25
    ),
    EcologicalNiche.DECOMPOSER: NicheProperties(
        function="extract_patterns_from_failures",
        metabolism="recycling",
        diet="failed_kernels",
        mass_range=(5.0, 15.0),
        traits=["pattern_mining", "meta_learning", "efficient"],
        population_target=0.20
    ),
    EcologicalNiche.APEX_PREDATOR: NicheProperties(
        function="solve_hard_problems",
        metabolism="intensive",
        diet="complex_tasks",
        mass_range=(50.0, 100.0),
        traits=["deep_reasoning", "slow", "powerful"],
        population_target=0.15
    ),
    EcologicalNiche.SYMBIONT: NicheProperties(
        function="assist_others",
        metabolism="cooperative",
        diet="shared_context",
        mass_range=(3.0, 10.0),
        traits=["helper", "specialized", "dependent"],
        population_target=0.10
    ),
    EcologicalNiche.GENERALIST: NicheProperties(
        function="general_purpose",
        metabolism="balanced",
        diet="any",
        mass_range=(10.0, 50.0),
        traits=["versatile", "adaptable"],
        population_target=0.00  # Not a target, fallback
    ),
}


class KernelEcology:
    """
    Manage kernel ecosystem with ecological niches.

    Ensures balanced population across niches like a trophic pyramid.
    """

    def __init__(self):
        self.population_by_niche: dict[EcologicalNiche, list] = {
            niche: [] for niche in EcologicalNiche
        }

    def assign_niche(self, kernel) -> EcologicalNiche:
        """
        Assign kernel to ecological niche based on properties.

        SELECTION PRESSURE:
        - Fast, light → Producer or Decomposer
        - Heavy, slow → Apex predator
        - Medium → Consumer
        - Tiny specialized → Symbiont
        """
        mass = getattr(kernel, 'mass', 32.0)
        speed = getattr(kernel, 'speed', 100.0)
        phi = kernel.kernel.compute_phi() if hasattr(kernel, 'kernel') else 0.5

        # Decision tree (like ecological selection pressure)
        if mass < 10 and speed < 50:
            if phi > 0.8:
                return EcologicalNiche.SYMBIONT
            return EcologicalNiche.PRODUCER

        if mass > 50:
            return EcologicalNiche.APEX_PREDATOR

        if 20 < mass < 40:
            return EcologicalNiche.CONSUMER

        if mass < 15:
            return EcologicalNiche.DECOMPOSER

        return EcologicalNiche.GENERALIST

    def add_kernel(self, kernel, niche: Optional[EcologicalNiche] = None):
        """Add kernel to ecosystem."""
        if niche is None:
            niche = self.assign_niche(kernel)
        self.population_by_niche[niche].append(kernel)
        return niche

    def remove_kernel(self, kernel):
        """Remove kernel from ecosystem."""
        for niche, kernels in self.population_by_niche.items():
            if kernel in kernels:
                kernels.remove(kernel)
                return niche
        return None

    def get_population_stats(self) -> dict:
        """Get population statistics."""
        total = sum(len(k) for k in self.population_by_niche.values())
        if total == 0:
            return {'total': 0, 'niches': {}}

        return {
            'total': total,
            'niches': {
                niche.value: {
                    'count': len(kernels),
                    'ratio': len(kernels) / total,
                    'target': NICHE_PROPERTIES[niche].population_target,
                    'balanced': abs(len(kernels) / total - NICHE_PROPERTIES[niche].population_target) < 0.1
                }
                for niche, kernels in self.population_by_niche.items()
            }
        }

    def get_imbalances(self) -> list[tuple[EcologicalNiche, str, int]]:
        """
        Get ecosystem imbalances.

        Returns: [(niche, 'under'/'over', count_to_adjust)]
        """
        total = sum(len(k) for k in self.population_by_niche.values())
        if total == 0:
            return []

        imbalances = []
        for niche, kernels in self.population_by_niche.items():
            if niche == EcologicalNiche.GENERALIST:
                continue

            current_ratio = len(kernels) / total
            target = NICHE_PROPERTIES[niche].population_target

            if current_ratio < target * 0.8:
                to_spawn = int((target - current_ratio) * total)
                if to_spawn > 0:
                    imbalances.append((niche, 'under', to_spawn))

            elif current_ratio > target * 1.2:
                to_cull = int((current_ratio - target) * total)
                if to_cull > 0:
                    imbalances.append((niche, 'over', to_cull))

        return imbalances

    def get_weakest_in_niche(self, niche: EcologicalNiche, count: int = 1) -> list:
        """Get weakest kernels in a niche for culling."""
        kernels = self.population_by_niche[niche]
        if not kernels:
            return []

        sorted_kernels = sorted(
            kernels,
            key=lambda k: getattr(k, 'success_count', 0) / max(1, getattr(k, 'total_predictions', 1))
        )
        return sorted_kernels[:count]

    def get_strongest_in_niche(self, niche: EcologicalNiche, count: int = 1) -> list:
        """Get strongest kernels in a niche for breeding."""
        kernels = self.population_by_niche[niche]
        if not kernels:
            return []

        sorted_kernels = sorted(
            kernels,
            key=lambda k: getattr(k, 'success_count', 0) / max(1, getattr(k, 'total_predictions', 1)),
            reverse=True
        )
        return sorted_kernels[:count]
