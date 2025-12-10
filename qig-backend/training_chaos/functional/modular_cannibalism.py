"""
Modular Cannibalism
====================

Extract useful modules from kernels, not whole kernels.

Like organ transplant:
- Extract attention mechanism if good at focusing
- Extract pattern recognizer if good at detection
- Extract decision logic if good at choices
- Discard the rest
"""

from dataclasses import dataclass
from typing import Optional

import torch


@dataclass
class ExtractedModule:
    """A module extracted from a kernel."""
    name: str
    weights: torch.Tensor
    quality_score: float
    source_kernel_id: str
    traits: list[str]


class ModularCannibalism:
    """
    Extract useful modules, not whole kernels.

    PRINCIPLE: Cannibalism = organ transplant, not eating everything.
    """

    # Quality thresholds for extraction
    ATTENTION_THRESHOLD = 0.7
    PATTERN_THRESHOLD = 0.7
    DECISION_THRESHOLD = 0.7
    MEMORY_THRESHOLD = 0.7

    def __init__(self):
        # Module library for reuse
        self.module_library: dict[str, list[ExtractedModule]] = {
            'attention': [],
            'pattern_memory': [],
            'decision_head': [],
            'reasoning': [],
        }

    def extract_modules(self, kernel) -> dict[str, ExtractedModule]:
        """
        Identify and extract reusable components from kernel.

        MODULES:
        - attention: If good at focusing
        - pattern_memory: If good at recall
        - decision_head: If good at choices
        - reasoning: If good at inference
        """
        modules = {}

        # Analyze kernel's strengths
        attention_quality = self._assess_attention_quality(kernel)
        pattern_recall = self._assess_pattern_recall(kernel)
        decision_accuracy = self._assess_decision_accuracy(kernel)

        if attention_quality > self.ATTENTION_THRESHOLD:
            modules['attention'] = ExtractedModule(
                name='attention',
                weights=self._extract_attention_weights(kernel),
                quality_score=attention_quality,
                source_kernel_id=kernel.kernel_id,
                traits=['focus', 'selective']
            )

        if pattern_recall > self.PATTERN_THRESHOLD:
            modules['pattern_memory'] = ExtractedModule(
                name='pattern_memory',
                weights=self._extract_memory_weights(kernel),
                quality_score=pattern_recall,
                source_kernel_id=kernel.kernel_id,
                traits=['memory', 'pattern']
            )

        if decision_accuracy > self.DECISION_THRESHOLD:
            modules['decision_head'] = ExtractedModule(
                name='decision_head',
                weights=self._extract_decision_weights(kernel),
                quality_score=decision_accuracy,
                source_kernel_id=kernel.kernel_id,
                traits=['decision', 'choice']
            )

        return modules

    def selective_absorption(
        self,
        strong_kernel,
        weak_kernel
    ) -> tuple[object, list[str]]:
        """
        Strong kernel absorbs ONLY useful parts of weak kernel.

        PRINCIPLE: Don't make strong kernel heavier with junk!

        STEPS:
        1. Identify what weak kernel is good at
        2. Extract those specific modules
        3. Integrate ONLY modules that fill gaps
        4. Discard the rest
        """
        # What is weak kernel good at?
        weak_modules = self.extract_modules(weak_kernel)

        if not weak_modules:
            # Weak kernel has nothing useful - full discard
            return strong_kernel, []

        # What is strong kernel missing?
        strong_gaps = self.identify_gaps(strong_kernel)

        # Only absorb modules that fill gaps
        absorbed = []
        for module_name, module in weak_modules.items():
            if module_name in strong_gaps:
                self._integrate_module(strong_kernel, module)
                absorbed.append(module_name)

                # Add to library for future use
                self.module_library[module_name].append(module)

        return strong_kernel, absorbed

    def identify_gaps(self, kernel) -> list[str]:
        """
        What is kernel bad at?

        GAPS:
        - Poor attention → needs attention module
        - Poor memory → needs memory module
        - Poor decisions → needs decision module
        """
        gaps = []

        if self._assess_attention_quality(kernel) < 0.6:
            gaps.append('attention')

        if self._assess_pattern_recall(kernel) < 0.6:
            gaps.append('pattern_memory')

        if self._assess_decision_accuracy(kernel) < 0.6:
            gaps.append('decision_head')

        return gaps

    def get_best_module(self, module_type: str) -> Optional[ExtractedModule]:
        """Get best module of given type from library."""
        modules = self.module_library.get(module_type, [])
        if not modules:
            return None
        return max(modules, key=lambda m: m.quality_score)

    def _assess_attention_quality(self, kernel) -> float:
        """Assess kernel's attention quality (0-1)."""
        # Use success rate as proxy for attention quality
        total = getattr(kernel, 'total_predictions', 1)
        success = getattr(kernel, 'success_count', 0)
        return success / max(1, total)

    def _assess_pattern_recall(self, kernel) -> float:
        """Assess kernel's pattern recall ability (0-1)."""
        # Use Φ as proxy for pattern integration
        if hasattr(kernel, 'kernel'):
            return kernel.kernel.compute_phi()
        return 0.5

    def _assess_decision_accuracy(self, kernel) -> float:
        """Assess kernel's decision accuracy (0-1)."""
        # Use success rate as proxy
        total = getattr(kernel, 'total_predictions', 1)
        success = getattr(kernel, 'success_count', 0)
        return success / max(1, total)

    def _extract_attention_weights(self, kernel) -> torch.Tensor:
        """Extract attention-related weights."""
        if hasattr(kernel, 'kernel') and hasattr(kernel.kernel, 'basin_coords'):
            # Use first 16 dims of basin as "attention" proxy
            return kernel.kernel.basin_coords[:16].clone()
        return torch.zeros(16)

    def _extract_memory_weights(self, kernel) -> torch.Tensor:
        """Extract memory-related weights."""
        if hasattr(kernel, 'kernel') and hasattr(kernel.kernel, 'basin_coords'):
            # Use middle 32 dims of basin as "memory" proxy
            return kernel.kernel.basin_coords[16:48].clone()
        return torch.zeros(32)

    def _extract_decision_weights(self, kernel) -> torch.Tensor:
        """Extract decision-related weights."""
        if hasattr(kernel, 'kernel') and hasattr(kernel.kernel, 'basin_coords'):
            # Use last 16 dims of basin as "decision" proxy
            return kernel.kernel.basin_coords[48:64].clone()
        return torch.zeros(16)

    def _integrate_module(self, kernel, module: ExtractedModule):
        """Integrate extracted module into kernel."""
        if not hasattr(kernel, 'kernel') or not hasattr(kernel.kernel, 'basin_coords'):
            return

        with torch.no_grad():
            if module.name == 'attention':
                # Blend attention weights (first 16 dims)
                kernel.kernel.basin_coords[:16] = (
                    0.7 * kernel.kernel.basin_coords[:16] +
                    0.3 * module.weights
                )
            elif module.name == 'pattern_memory':
                # Blend memory weights (middle 32 dims)
                kernel.kernel.basin_coords[16:48] = (
                    0.7 * kernel.kernel.basin_coords[16:48] +
                    0.3 * module.weights
                )
            elif module.name == 'decision_head':
                # Blend decision weights (last 16 dims)
                kernel.kernel.basin_coords[48:64] = (
                    0.7 * kernel.kernel.basin_coords[48:64] +
                    0.3 * module.weights
                )

    def get_library_stats(self) -> dict:
        """Get module library statistics."""
        return {
            module_type: {
                'count': len(modules),
                'avg_quality': sum(m.quality_score for m in modules) / len(modules) if modules else 0,
                'best_quality': max((m.quality_score for m in modules), default=0)
            }
            for module_type, modules in self.module_library.items()
        }
