"""
Functional Kernel Evolution
===========================

Orchestrates the entire functional evolution system, integrating:
- Element classification (chemistry)
- Ecological niches (biology)
- Modular cannibalism (organ transplants)
- Functional breeding (goal-directed)

This is the high-level coordinator that ties all functional
evolution components together.
"""

import random
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

from .functional_breeding import FunctionalBreeding, TargetFunction
from .kernel_ecology import EcologicalNiche, KernelEcology
from .kernel_element import ELEMENT_PROPERTIES, ElementGroup, KernelElement
from .modular_cannibalism import ModularCannibalism, ModuleType


@dataclass
class FunctionalKernelState:
    """Complete functional state for a kernel."""
    kernel_id: str
    element_group: ElementGroup
    ecological_niche: EcologicalNiche
    target_function: Optional[TargetFunction]
    valence: int
    cooperation_level: float
    exploration_bias: float
    transplanted_modules: List[str]


class FunctionalKernelEvolution:
    """
    High-level orchestrator for functional kernel evolution.

    Integrates chemistry (elements), biology (niches), and
    engineering (modules) approaches to kernel specialization.
    """

    def __init__(self):
        self.element_classifier = KernelElement()
        self.ecology_manager = KernelEcology()
        self.module_library = ModularCannibalism()
        self.breeding_manager = FunctionalBreeding()

        self.kernel_states: Dict[str, FunctionalKernelState] = {}
        self.evolution_history: List[Dict] = []

    def initialize_kernel(
        self,
        kernel_id: str,
        phi: float,
        kappa: float,
        domain: str,
        generation: int = 0,
        exploration_rate: float = 0.5,
        cooperation_score: float = 0.5
    ) -> FunctionalKernelState:
        """
        Initialize functional properties for a new kernel.

        Assigns element group, ecological niche, and initial properties.
        """
        # Classify into element group
        success_rate = 0.5  # Default for new kernels
        element, element_props = self.element_classifier.classify_kernel(
            kernel_id, phi, kappa, success_rate, generation
        )

        # Get current population for niche balancing
        niche_population = {}
        for niche in EcologicalNiche:
            niche_population[niche] = sum(
                1 for s in self.kernel_states.values()
                if s.ecological_niche == niche
            )

        # Assign ecological niche
        niche, niche_props = self.ecology_manager.assign_niche(
            kernel_id, phi, kappa, exploration_rate,
            cooperation_score, niche_population
        )

        # Create functional state
        state = FunctionalKernelState(
            kernel_id=kernel_id,
            element_group=element,
            ecological_niche=niche,
            target_function=None,
            valence=element_props.valence,
            cooperation_level=niche_props.cooperation_level,
            exploration_bias=niche_props.exploration_bias,
            transplanted_modules=[]
        )

        self.kernel_states[kernel_id] = state
        return state

    def update_kernel(
        self,
        kernel_id: str,
        phi: float,
        kappa: float,
        success_rate: float,
        generation: int
    ) -> Optional[FunctionalKernelState]:
        """
        Update functional properties based on current metrics.

        May trigger transmutation (element change) or niche shift.
        """
        if kernel_id not in self.kernel_states:
            return None

        state = self.kernel_states[kernel_id]

        # Check for element transmutation
        new_element = self.element_classifier.should_transmute(
            kernel_id, state.element_group, phi, success_rate
        )
        if new_element:
            state.element_group = new_element
            state.valence = ELEMENT_PROPERTIES[new_element].valence

        return state

    def select_breeding_pair(
        self,
        candidates: List[Dict[str, Any]],
        goal_id: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Select an optimal breeding pair from candidates.

        Considers element compatibility, niche interaction,
        and optional breeding goals.
        """
        if len(candidates) < 2:
            raise ValueError("Need at least 2 candidates for breeding")

        # Get breeding goal if specified
        goal = None
        if goal_id and goal_id in self.breeding_manager.active_goals:
            goal = self.breeding_manager.active_goals[goal_id]

        # Score all candidate pairs
        pair_scores = []
        for i, c1 in enumerate(candidates):
            for c2 in candidates[i+1:]:
                score = self._score_breeding_pair(c1, c2, goal)
                pair_scores.append((c1['kernel_id'], c2['kernel_id'], score))

        # Sort by score and select best
        pair_scores.sort(key=lambda x: x[2], reverse=True)

        # Add some randomness (don't always pick the best)
        top_pairs = pair_scores[:min(5, len(pair_scores))]
        weights = [p[2] for p in top_pairs]
        total_weight = sum(weights) or 1
        probabilities = [w / total_weight for w in weights]

        selected_idx = random.choices(range(len(top_pairs)), probabilities)[0]
        return top_pairs[selected_idx][0], top_pairs[selected_idx][1]

    def _score_breeding_pair(
        self,
        kernel1: Dict[str, Any],
        kernel2: Dict[str, Any],
        goal: Optional[Any] = None
    ) -> float:
        """Score a potential breeding pair."""
        id1, id2 = kernel1['kernel_id'], kernel2['kernel_id']

        # Get functional states
        state1 = self.kernel_states.get(id1)
        state2 = self.kernel_states.get(id2)

        if not state1 or not state2:
            return 0.5  # Default if states not initialized

        # Element compatibility
        element_compat = self.element_classifier.get_bonding_compatibility(
            state1.element_group, state2.element_group
        )

        # Niche interaction
        niche_modifier = self.ecology_manager.get_interaction_modifier(
            state1.ecological_niche, state2.ecological_niche
        )

        # Phi contribution
        phi_avg = (kernel1.get('phi', 0.5) + kernel2.get('phi', 0.5)) / 2

        # Goal alignment if specified
        goal_bonus = 0
        if goal:
            # Both parents should have high function alignment
            for kernel in [kernel1, kernel2]:
                parent_score = self.breeding_manager.evaluate_parent_fitness(
                    kernel['kernel_id'],
                    kernel.get('phi', 0.5),
                    kernel.get('kappa', 30),
                    kernel.get('metrics', {}),
                    goal,
                    []
                )
                goal_bonus += parent_score.function_alignment * 0.1

        return (element_compat * 0.3 + niche_modifier * 0.2 +
                phi_avg * 0.4 + goal_bonus)

    def process_kernel_death(
        self,
        kernel_id: str,
        final_phi: float,
        domain: str,
        weights: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Process a kernel death - extract useful modules.

        Returns extraction results.
        """
        # Extract valuable modules
        extracted = self.module_library.extract_modules(
            kernel_id, final_phi, domain, weights
        )

        # Clean up state
        if kernel_id in self.kernel_states:
            del self.kernel_states[kernel_id]

        return {
            'kernel_id': kernel_id,
            'modules_extracted': len(extracted),
            'module_ids': [m.module_id for m in extracted],
        }

    def enhance_kernel(
        self,
        kernel_id: str,
        domain: str,
        needed_capabilities: Optional[List[str]] = None
    ) -> List[Dict]:
        """
        Enhance a kernel by transplanting compatible modules.

        Returns list of transplant results.
        """
        if kernel_id not in self.kernel_states:
            return []

        # Find compatible modules
        needed_types = None
        if needed_capabilities:
            type_map = {
                'attention': ModuleType.ATTENTION,
                'memory': ModuleType.MEMORY,
                'decision': ModuleType.DECISION,
                'pattern': ModuleType.PATTERN,
            }
            needed_types = [type_map[c] for c in needed_capabilities
                          if c in type_map]

        compatible = self.module_library.find_compatible_modules(
            kernel_id, domain, needed_types
        )

        # Attempt transplants
        results = []
        state = self.kernel_states[kernel_id]

        for module in compatible[:3]:  # Max 3 transplants at once
            result = self.module_library.transplant_module(
                module, kernel_id, domain
            )
            results.append(result)

            if result['success']:
                state.transplanted_modules.append(module.module_id)

        return results

    def create_breeding_goal(
        self,
        goal_id: str,
        target_function: str,
        target_phi: float = 0.8,
        priority: float = 1.0,
        max_generations: int = 20
    ) -> Dict[str, Any]:
        """Create a new breeding goal."""
        func = TargetFunction(target_function)
        goal = self.breeding_manager.create_breeding_goal(
            goal_id, func, target_phi, 50.0, priority, max_generations
        )
        return {
            'goal_id': goal_id,
            'target_function': target_function,
            'target_phi': target_phi,
            'max_generations': max_generations,
        }

    def get_evolution_status(self) -> Dict[str, Any]:
        """Get comprehensive evolution status."""
        return {
            'total_kernels': len(self.kernel_states),
            'element_distribution': self.element_classifier.get_element_stats(),
            'niche_distribution': self.ecology_manager.get_niche_stats(),
            'ecosystem_health': self.ecology_manager.get_ecosystem_health(
                {n: sum(1 for s in self.kernel_states.values()
                        if s.ecological_niche == n)
                 for n in EcologicalNiche}
            ),
            'module_library': self.module_library.get_library_stats(),
            'breeding': self.breeding_manager.get_breeding_stats(),
        }
