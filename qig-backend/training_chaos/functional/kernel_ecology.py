"""
Kernel Ecology
==============

Biology-inspired ecological niche assignment for kernels.
Different niches have different roles in the evolution ecosystem.

Ecological Niches:
- Producer: Generates new hypotheses (exploration)
- Consumer: Refines existing hypotheses (exploitation)
- Decomposer: Recycles failed kernels (cleanup)
- Apex Predator: Hunts for breakthroughs (high risk/reward)
- Symbiont: Cooperates with other kernels (ensemble)
"""

import random
from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Tuple


class EcologicalNiche(Enum):
    """Biology-inspired kernel roles in the evolution ecosystem."""
    PRODUCER = "producer"           # Generates new hypotheses
    CONSUMER = "consumer"           # Refines existing hypotheses
    DECOMPOSER = "decomposer"       # Recycles failed attempts
    APEX_PREDATOR = "apex_predator" # Hunts for breakthroughs
    SYMBIONT = "symbiont"           # Cooperates with others


@dataclass
class NicheProperties:
    """Properties associated with each ecological niche."""
    niche: EcologicalNiche
    exploration_bias: float    # Preference for new vs known (0-1)
    cooperation_level: float   # Willingness to share (0-1)
    resource_efficiency: float # How well it uses resources (0-1)
    risk_tolerance: float      # Willingness to take risks (0-1)
    population_cap: float      # Max fraction of population (0-1)


# Niche property definitions
NICHE_PROPERTIES: Dict[EcologicalNiche, NicheProperties] = {
    EcologicalNiche.PRODUCER: NicheProperties(
        niche=EcologicalNiche.PRODUCER,
        exploration_bias=0.9,
        cooperation_level=0.3,
        resource_efficiency=0.5,
        risk_tolerance=0.7,
        population_cap=0.3
    ),
    EcologicalNiche.CONSUMER: NicheProperties(
        niche=EcologicalNiche.CONSUMER,
        exploration_bias=0.3,
        cooperation_level=0.5,
        resource_efficiency=0.8,
        risk_tolerance=0.3,
        population_cap=0.4
    ),
    EcologicalNiche.DECOMPOSER: NicheProperties(
        niche=EcologicalNiche.DECOMPOSER,
        exploration_bias=0.4,
        cooperation_level=0.7,
        resource_efficiency=0.9,
        risk_tolerance=0.2,
        population_cap=0.15
    ),
    EcologicalNiche.APEX_PREDATOR: NicheProperties(
        niche=EcologicalNiche.APEX_PREDATOR,
        exploration_bias=0.8,
        cooperation_level=0.1,
        resource_efficiency=0.4,
        risk_tolerance=0.95,
        population_cap=0.1
    ),
    EcologicalNiche.SYMBIONT: NicheProperties(
        niche=EcologicalNiche.SYMBIONT,
        exploration_bias=0.5,
        cooperation_level=0.95,
        resource_efficiency=0.7,
        risk_tolerance=0.4,
        population_cap=0.2
    ),
}


class KernelEcology:
    """
    Manages ecological niche assignment and ecosystem balancing.

    Ensures the kernel population maintains healthy diversity
    with appropriate ratios of different niche types.
    """

    def __init__(self):
        self.niche_assignments: Dict[str, EcologicalNiche] = {}
        self.ecosystem_history: List[Dict[str, int]] = []

    def assign_niche(
        self,
        kernel_id: str,
        phi: float,
        kappa: float,
        exploration_rate: float,
        cooperation_score: float,
        current_population: Dict[EcologicalNiche, int]
    ) -> Tuple[EcologicalNiche, NicheProperties]:
        """
        Assign an ecological niche to a kernel.

        Assignment considers:
        - Kernel metrics (Φ, κ, exploration rate)
        - Current ecosystem balance
        - Population caps for each niche
        """
        total_pop = sum(current_population.values()) or 1

        # Calculate niche scores based on kernel metrics
        scores = {}

        for niche in EcologicalNiche:
            props = NICHE_PROPERTIES[niche]

            # Base score from metric alignment
            exploration_match = 1 - abs(exploration_rate - props.exploration_bias)
            cooperation_match = 1 - abs(cooperation_score - props.cooperation_level)
            base_score = (exploration_match + cooperation_match) / 2

            # Penalty if niche is overpopulated
            current_fraction = current_population.get(niche, 0) / total_pop
            overpop_penalty = max(0, current_fraction - props.population_cap) * 2

            # Bonus for underpopulated niches
            underpop_bonus = max(0, props.population_cap - current_fraction) * 0.5

            scores[niche] = max(0, base_score - overpop_penalty + underpop_bonus)

        # Select niche with highest score (with some randomness)
        total_score = sum(scores.values()) or 1
        probabilities = {k: v / total_score for k, v in scores.items()}

        # Weighted random selection
        rand = random.random()
        cumulative = 0
        selected_niche = EcologicalNiche.CONSUMER  # Default

        for niche, prob in probabilities.items():
            cumulative += prob
            if rand <= cumulative:
                selected_niche = niche
                break

        self.niche_assignments[kernel_id] = selected_niche
        return selected_niche, NICHE_PROPERTIES[selected_niche]

    def get_interaction_modifier(
        self,
        niche1: EcologicalNiche,
        niche2: EcologicalNiche
    ) -> float:
        """
        Get interaction modifier between two niches.

        Returns a multiplier for breeding/cooperation success.
        """
        props1 = NICHE_PROPERTIES[niche1]
        props2 = NICHE_PROPERTIES[niche2]

        # Symbionts boost everyone
        if niche1 == EcologicalNiche.SYMBIONT or niche2 == EcologicalNiche.SYMBIONT:
            return 1.3

        # Apex predators don't cooperate well
        if niche1 == EcologicalNiche.APEX_PREDATOR or niche2 == EcologicalNiche.APEX_PREDATOR:
            return 0.7

        # Decomposers work well with producers (recycling)
        if {niche1, niche2} == {EcologicalNiche.DECOMPOSER, EcologicalNiche.PRODUCER}:
            return 1.2

        # Base interaction from cooperation levels
        return (props1.cooperation_level + props2.cooperation_level) / 2

    def get_resource_allocation(
        self,
        niche: EcologicalNiche,
        available_resources: float
    ) -> float:
        """Calculate resource allocation for a niche."""
        props = NICHE_PROPERTIES[niche]
        return available_resources * props.resource_efficiency

    def balance_ecosystem(
        self,
        population: Dict[str, EcologicalNiche],
        target_size: int
    ) -> Dict[EcologicalNiche, int]:
        """
        Calculate target population for each niche.

        Returns recommended counts for ecosystem health.
        """
        targets = {}
        for niche in EcologicalNiche:
            props = NICHE_PROPERTIES[niche]
            targets[niche] = int(target_size * props.population_cap)
        return targets

    def get_ecosystem_health(
        self,
        population: Dict[EcologicalNiche, int]
    ) -> float:
        """
        Calculate ecosystem health score (0-1).

        Healthy ecosystems have balanced niche distributions.
        """
        if not population:
            return 0.0

        total = sum(population.values())
        if total == 0:
            return 0.0

        # Calculate deviation from ideal distribution
        deviations = []
        for niche in EcologicalNiche:
            props = NICHE_PROPERTIES[niche]
            actual_fraction = population.get(niche, 0) / total
            deviation = abs(actual_fraction - props.population_cap)
            deviations.append(deviation)

        avg_deviation = sum(deviations) / len(deviations)
        health = max(0, 1 - (avg_deviation * 2))

        # Track history
        self.ecosystem_history.append(dict(population))

        return health

    def get_niche_stats(self) -> Dict[str, int]:
        """Get count of kernels in each niche."""
        stats = {niche.value: 0 for niche in EcologicalNiche}
        for kernel_id, niche in self.niche_assignments.items():
            stats[niche.value] += 1
        return stats
