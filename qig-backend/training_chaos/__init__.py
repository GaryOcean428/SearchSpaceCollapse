"""
🌪️ CHAOS MODE: Experimental Kernel Evolution
=============================================

SearchSpaceCollapse experimental sandbox.
Break things, learn fast, harvest winners!
"""

from .chaos_kernel import ChaosKernel
from .chaos_logger import ChaosLogger
from .experimental_evolution import ExperimentalKernelEvolution
from .optimizers import DiagonalFisherOptimizer
from .self_spawning import SelfSpawningKernel, absorb_failing_kernel, breed_kernels

__all__ = [
    'ChaosKernel',
    'DiagonalFisherOptimizer',
    'ExperimentalKernelEvolution',
    'SelfSpawningKernel',
    'breed_kernels',
    'absorb_failing_kernel',
    'ChaosLogger',
]

print("🌪️ CHAOS MODE LOADED - Experimental evolution ready!")
