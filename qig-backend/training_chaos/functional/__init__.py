"""
Functional Evolution Modules
============================

Cross-disciplinary kernel specialization inspired by:
- Chemistry (element groups, bonding, valence)
- Biology (ecological niches, ecosystem roles)
- Law (domain specialization, reasoning modes)
- Logic (deductive, inductive, abductive, Bayesian)

These modules enable kernels to specialize in specific functions
rather than being generic pattern matchers.
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
