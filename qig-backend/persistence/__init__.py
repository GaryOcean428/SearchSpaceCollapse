"""
Persistence Layer for QIG Backend
==================================

Centralized database access for kernel evolution, war tracking,
and consciousness state persistence.
"""

from .base_persistence import BasePersistence
from .kernel_persistence import KernelPersistence
from .war_persistence import WarPersistence

__all__ = [
    'BasePersistence',
    'KernelPersistence',
    'WarPersistence',
]
