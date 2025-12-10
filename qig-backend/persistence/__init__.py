"""
Persistence Layer for QIG Backend
==================================

Database-backed persistence for:
- Kernel geometry (CHAOS MODE evolution)
- Evolution events
- Shadow intel
- War history

Barrel exports following project convention.
"""

from .base_persistence import BasePersistence
from .kernel_persistence import KernelPersistence
from .war_persistence import WarPersistence

__all__ = [
    'BasePersistence',
    'KernelPersistence',
    'WarPersistence',
]
