"""
Kernel Element Classification
=============================

Chemistry-inspired classification of kernels into element groups
with different properties and bonding behaviors.

Element Groups:
- Alkali: Fast, reactive, low stability (exploration)
- Transition: Balanced, versatile, medium stability (exploitation)
- Rare Earth: Specialized, high value, unique properties
- Noble: Stable, unreactive, high Φ (elite performers)
"""

from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional, Tuple


class ElementGroup(Enum):
    """Chemistry-inspired kernel classification."""
    ALKALI = "alkali"           # Fast, reactive, low stability
    TRANSITION = "transition"   # Balanced, versatile
    RARE_EARTH = "rare_earth"   # Specialized, high value
    NOBLE = "noble"             # Stable, high Φ, unreactive


@dataclass
class ElementProperties:
    """Properties associated with each element group."""
    group: ElementGroup
    reactivity: float      # How likely to breed/mutate (0-1)
    stability: float       # Resistance to degradation (0-1)
    valence: int           # Max simultaneous bonds (1-8)
    specialization: float  # Domain focus (0=generalist, 1=specialist)
    energy_cost: float     # Computational cost multiplier


# Element group property definitions
ELEMENT_PROPERTIES: Dict[ElementGroup, ElementProperties] = {
    ElementGroup.ALKALI: ElementProperties(
        group=ElementGroup.ALKALI,
        reactivity=0.9,
        stability=0.3,
        valence=1,
        specialization=0.2,
        energy_cost=0.5
    ),
    ElementGroup.TRANSITION: ElementProperties(
        group=ElementGroup.TRANSITION,
        reactivity=0.6,
        stability=0.6,
        valence=4,
        specialization=0.5,
        energy_cost=1.0
    ),
    ElementGroup.RARE_EARTH: ElementProperties(
        group=ElementGroup.RARE_EARTH,
        reactivity=0.4,
        stability=0.7,
        valence=3,
        specialization=0.9,
        energy_cost=1.5
    ),
    ElementGroup.NOBLE: ElementProperties(
        group=ElementGroup.NOBLE,
        reactivity=0.1,
        stability=0.95,
        valence=0,
        specialization=0.8,
        energy_cost=2.0
    ),
}


class KernelElement:
    """
    Assigns and manages element classification for kernels.

    Kernels are classified based on their Φ, κ, and performance metrics.
    Classification affects breeding behavior, mutation rates, and survival.
    """

    def __init__(self):
        self.element_history: Dict[str, List[ElementGroup]] = {}

    def classify_kernel(
        self,
        kernel_id: str,
        phi: float,
        kappa: float,
        success_rate: float,
        generation: int
    ) -> Tuple[ElementGroup, ElementProperties]:
        """
        Classify a kernel into an element group based on metrics.

        Classification rules:
        - Noble: Φ > 0.8, success_rate > 0.7 (elite performers)
        - Rare Earth: Specialized domain, generation > 10
        - Transition: Balanced metrics, versatile
        - Alkali: New kernels, low generation, exploratory
        """
        # Noble: Elite performers
        if phi > 0.8 and success_rate > 0.7:
            group = ElementGroup.NOBLE
        # Rare Earth: Specialized veterans
        elif generation > 10 and phi > 0.6:
            group = ElementGroup.RARE_EARTH
        # Transition: Balanced middle ground
        elif phi > 0.4 and success_rate > 0.3:
            group = ElementGroup.TRANSITION
        # Alkali: New, reactive, exploratory
        else:
            group = ElementGroup.ALKALI

        # Track classification history
        if kernel_id not in self.element_history:
            self.element_history[kernel_id] = []
        self.element_history[kernel_id].append(group)

        return group, ELEMENT_PROPERTIES[group]

    def get_bonding_compatibility(
        self,
        element1: ElementGroup,
        element2: ElementGroup
    ) -> float:
        """
        Calculate breeding compatibility between two element groups.

        Returns compatibility score (0-1) based on chemistry rules.
        """
        compatibility_matrix = {
            (ElementGroup.ALKALI, ElementGroup.ALKALI): 0.8,      # Reactive + Reactive
            (ElementGroup.ALKALI, ElementGroup.TRANSITION): 0.9,  # Best combo
            (ElementGroup.ALKALI, ElementGroup.RARE_EARTH): 0.6,
            (ElementGroup.ALKALI, ElementGroup.NOBLE): 0.1,       # Noble won't bond
            (ElementGroup.TRANSITION, ElementGroup.TRANSITION): 0.7,
            (ElementGroup.TRANSITION, ElementGroup.RARE_EARTH): 0.8,
            (ElementGroup.TRANSITION, ElementGroup.NOBLE): 0.3,
            (ElementGroup.RARE_EARTH, ElementGroup.RARE_EARTH): 0.5,
            (ElementGroup.RARE_EARTH, ElementGroup.NOBLE): 0.2,
            (ElementGroup.NOBLE, ElementGroup.NOBLE): 0.05,       # Noble rarely bonds
        }

        # Matrix is symmetric
        key = (element1, element2)
        reverse_key = (element2, element1)

        return compatibility_matrix.get(key, compatibility_matrix.get(reverse_key, 0.5))

    def get_mutation_rate(self, element: ElementGroup, base_rate: float = 0.1) -> float:
        """Get mutation rate adjusted for element group."""
        props = ELEMENT_PROPERTIES[element]
        return base_rate * props.reactivity

    def get_survival_probability(
        self,
        element: ElementGroup,
        phi: float,
        population_pressure: float
    ) -> float:
        """
        Calculate survival probability for a kernel.

        Higher stability elements survive better under pressure.
        """
        props = ELEMENT_PROPERTIES[element]
        base_survival = 0.5 + (phi * 0.3) + (props.stability * 0.2)
        pressure_penalty = population_pressure * (1 - props.stability)
        return max(0.1, min(0.99, base_survival - pressure_penalty))

    def should_transmute(
        self,
        kernel_id: str,
        current_element: ElementGroup,
        phi: float,
        success_rate: float
    ) -> Optional[ElementGroup]:
        """
        Check if a kernel should transmute to a different element.

        Transmutation happens when metrics consistently indicate
        a different classification is appropriate.
        """
        history = self.element_history.get(kernel_id, [])
        if len(history) < 5:
            return None

        # Check for consistent classification change
        recent = history[-5:]

        # If Φ improved significantly, consider promotion
        if phi > 0.8 and success_rate > 0.7 and current_element != ElementGroup.NOBLE:
            return ElementGroup.NOBLE

        # If Φ dropped significantly, consider demotion
        if phi < 0.3 and current_element in [ElementGroup.NOBLE, ElementGroup.RARE_EARTH]:
            return ElementGroup.TRANSITION

        return None

    def get_element_stats(self) -> Dict[str, int]:
        """Get count of kernels in each element group."""
        stats = {group.value: 0 for group in ElementGroup}
        for kernel_id, history in self.element_history.items():
            if history:
                current = history[-1]
                stats[current.value] += 1
        return stats
