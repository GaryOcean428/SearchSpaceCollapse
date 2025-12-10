"""
Functional Kernel Evolution
============================

Cross-disciplinary kernel design treating kernels as specialized elements.

Modules:
- kernel_element: Chemistry-like element classification
- kernel_ecology: Biology-like ecological niches
- modular_cannibalism: Selective module extraction
- functional_breeding: Goal-directed breeding

Barrel exports for clean imports.
"""

from .functional_breeding import FunctionalBreeding
from .functional_evolution import FunctionalKernelEvolution
from .kernel_ecology import EcologicalNiche, KernelEcology
from .kernel_element import ElementGroup, KernelElement
from .modular_cannibalism import ModularCannibalism

__all__ = [
    'KernelElement',
    'ElementGroup',
    'KernelEcology',
    'EcologicalNiche',
    'ModularCannibalism',
    'FunctionalBreeding',
    'FunctionalKernelEvolution',
]
