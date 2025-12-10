"""
Functional Kernel Evolution
============================

Complete evolution system with functional specialization.

COMBINES:
- Chemistry: Element properties
- Biology: Ecological niches
- Engineering: Modular design
- Goal-directed breeding
"""

from typing import Optional

from .functional_breeding import BreedingTarget, FunctionalBreeding
from .kernel_ecology import EcologicalNiche, KernelEcology
from .kernel_element import ElementGroup, KernelElement
from .modular_cannibalism import ModularCannibalism


class FunctionalKernelEvolution:
    """
    Evolution with functional specialization.

    Creates an ecosystem of specialists, not general-purpose blobs.
    """

    def __init__(self):
        # Ecology manager
        self.ecology = KernelEcology()

        # Cannibalism manager
        self.cannibalism = ModularCannibalism()

        # Breeding manager
        self.breeding = FunctionalBreeding()

        # Element classification cache
        self.element_cache: dict[str, KernelElement] = {}

        # Population by element group
        self.population_by_element: dict[ElementGroup, list] = {
            group: [] for group in ElementGroup
        }

    def classify_kernel(self, kernel) -> tuple[KernelElement, EcologicalNiche]:
        """Classify kernel by element and niche."""
        # Get or create element classification
        if kernel.kernel_id not in self.element_cache:
            element = KernelElement.from_kernel(kernel)
            self.element_cache[kernel.kernel_id] = element
        else:
            element = self.element_cache[kernel.kernel_id]

        # Assign ecological niche
        niche = self.ecology.assign_niche(kernel)

        return element, niche

    def add_kernel(self, kernel) -> dict:
        """Add kernel to ecosystem with classification."""
        element, niche = self.classify_kernel(kernel)

        # Add to ecology
        self.ecology.add_kernel(kernel, niche)

        # Add to element population
        self.population_by_element[element.group].append(kernel)

        return {
            'kernel_id': kernel.kernel_id,
            'element_group': element.group.value,
            'niche': niche.value,
            'valence': element.valence,
        }

    def remove_kernel(self, kernel):
        """Remove kernel from ecosystem."""
        # Remove from ecology
        self.ecology.remove_kernel(kernel)

        # Remove from element population
        if kernel.kernel_id in self.element_cache:
            element = self.element_cache[kernel.kernel_id]
            if kernel in self.population_by_element[element.group]:
                self.population_by_element[element.group].remove(kernel)
            del self.element_cache[kernel.kernel_id]

    def spawn_functional_kernel(self, target_function: str):
        """
        Spawn kernel designed for specific function.

        Instead of random spawning, create PURPOSE-BUILT kernels.
        """
        from ..self_spawning import SelfSpawningKernel

        if target_function == 'fast_exploration':
            # Create alkali producer kernel
            kernel = SelfSpawningKernel(
                spawn_threshold=2,  # Spawn easily
                death_threshold=20,  # Die harder
                mutation_rate=0.15,  # High mutation
            )
            kernel.target_function = 'fast_exploration'

        elif target_function == 'deep_reasoning':
            # Create rare earth apex predator kernel
            kernel = SelfSpawningKernel(
                spawn_threshold=5,  # Spawn rarely
                death_threshold=8,  # Die easier
                mutation_rate=0.05,  # Low mutation
            )
            kernel.target_function = 'deep_reasoning'

        elif target_function == 'pattern_extraction':
            # Create decomposer kernel
            kernel = SelfSpawningKernel(
                spawn_threshold=3,
                death_threshold=15,
                mutation_rate=0.1,
            )
            kernel.target_function = 'pattern_extraction'

        elif target_function == 'hypothesis_testing':
            # Create consumer kernel
            kernel = SelfSpawningKernel(
                spawn_threshold=3,
                death_threshold=12,
                mutation_rate=0.08,
            )
            kernel.target_function = 'hypothesis_testing'

        elif target_function == 'helper':
            # Create symbiont kernel
            kernel = SelfSpawningKernel(
                spawn_threshold=4,
                death_threshold=10,
                mutation_rate=0.12,
            )
            kernel.target_function = 'helper'

        else:
            # Default: generalist
            kernel = SelfSpawningKernel()
            kernel.target_function = 'generalist'

        # Add to ecosystem
        self.add_kernel(kernel)

        return kernel

    def functional_cannibalism(
        self,
        strong_kernel,
        weak_kernel
    ) -> tuple[object, list[str]]:
        """
        Extract modules from weak, integrate into strong.

        Returns: (enhanced_kernel, list_of_absorbed_modules)
        """
        return self.cannibalism.selective_absorption(strong_kernel, weak_kernel)

    def functional_breeding(
        self,
        parent1,
        parent2,
        target: Optional[BreedingTarget] = None
    ) -> Optional[object]:
        """
        Breed based on functional compatibility.

        If no target specified, determines optimal target from parent strengths.
        """
        # Check element compatibility
        if parent1.kernel_id in self.element_cache and parent2.kernel_id in self.element_cache:
            elem1 = self.element_cache[parent1.kernel_id]
            elem2 = self.element_cache[parent2.kernel_id]

            if not elem1.can_bond_with(elem2):
                print(f"⚠️ Incompatible elements: {elem1.group.value} + {elem2.group.value}")
                return None

        # Determine target if not specified
        if target is None:
            target = self.breeding.determine_optimal_target(parent1, parent2)

        # Breed for that function
        child = self.breeding.breed_for_function(parent1, parent2, target)

        if child:
            # Add child to ecosystem
            self.add_kernel(child)
            print(f"🧬 Bred child {child.kernel_id} for {target.value}")

        return child

    def balance_ecosystem(self) -> dict:
        """
        Maintain balanced population across niches.

        LIKE ECOLOGY:
        - Need producers (generate hypotheses)
        - Need consumers (test hypotheses)
        - Need decomposers (learn from failures)
        - Need apex predators (solve hard problems)
        - Need symbionts (assist others)
        """
        actions = {'spawned': [], 'culled': []}

        imbalances = self.ecology.get_imbalances()

        for niche, direction, count in imbalances:
            if direction == 'under':
                # Spawn more of this niche
                for _ in range(min(count, 3)):  # Max 3 at a time
                    function = self._niche_to_function(niche)
                    kernel = self.spawn_functional_kernel(function)
                    actions['spawned'].append({
                        'kernel_id': kernel.kernel_id,
                        'niche': niche.value,
                        'function': function
                    })

            elif direction == 'over':
                # Cull weakest
                to_cull = self.ecology.get_weakest_in_niche(niche, min(count, 2))
                for kernel in to_cull:
                    # Extract modules before culling
                    modules = self.cannibalism.extract_modules(kernel)
                    for module_name, module in modules.items():
                        self.cannibalism.module_library[module_name].append(module)

                    # Remove from ecosystem
                    self.remove_kernel(kernel)
                    kernel.die(cause='ecosystem_balancing')

                    actions['culled'].append({
                        'kernel_id': kernel.kernel_id,
                        'niche': niche.value,
                        'modules_extracted': list(modules.keys())
                    })

        return actions

    def _niche_to_function(self, niche: EcologicalNiche) -> str:
        """Map niche to spawn function."""
        mapping = {
            EcologicalNiche.PRODUCER: 'fast_exploration',
            EcologicalNiche.CONSUMER: 'hypothesis_testing',
            EcologicalNiche.DECOMPOSER: 'pattern_extraction',
            EcologicalNiche.APEX_PREDATOR: 'deep_reasoning',
            EcologicalNiche.SYMBIONT: 'helper',
            EcologicalNiche.GENERALIST: 'generalist',
        }
        return mapping.get(niche, 'generalist')

    def get_ecosystem_stats(self) -> dict:
        """Get comprehensive ecosystem statistics."""
        return {
            'ecology': self.ecology.get_population_stats(),
            'elements': {
                group.value: len(kernels)
                for group, kernels in self.population_by_element.items()
            },
            'module_library': self.cannibalism.get_library_stats(),
            'imbalances': [
                {'niche': n.value, 'direction': d, 'count': c}
                for n, d, c in self.ecology.get_imbalances()
            ],
        }

    def get_breeding_candidates(self, target: BreedingTarget) -> list[tuple]:
        """Get best breeding pairs for a target function."""
        candidates = []

        # Get strongest from relevant niches
        if target in [BreedingTarget.SPEED, BreedingTarget.EXPLORATION]:
            niche = EcologicalNiche.PRODUCER
        elif target in [BreedingTarget.ACCURACY, BreedingTarget.DEEP_REASONING]:
            niche = EcologicalNiche.APEX_PREDATOR
        elif target == BreedingTarget.PATTERN_RECOGNITION:
            niche = EcologicalNiche.DECOMPOSER
        else:
            niche = EcologicalNiche.CONSUMER

        strongest = self.ecology.get_strongest_in_niche(niche, 4)

        # Pair compatible kernels
        for i, k1 in enumerate(strongest):
            for k2 in strongest[i + 1:]:
                if k1.kernel_id in self.element_cache and k2.kernel_id in self.element_cache:
                    e1 = self.element_cache[k1.kernel_id]
                    e2 = self.element_cache[k2.kernel_id]
                    if e1.can_bond_with(e2):
                        candidates.append((k1, k2, e1.bond_strength(e2)))

        # Sort by bond strength
        candidates.sort(key=lambda x: x[2], reverse=True)

        return [(k1, k2) for k1, k2, _ in candidates[:3]]
