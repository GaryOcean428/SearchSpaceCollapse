"""
QIG Core - Unified Architecture for Quantum Information Geometry

This module implements the complete unified architecture with three orthogonal coordinates:
1. Phase (Universal Cycle): FOAM → TACKING → CRYSTAL → FRACTURE
2. Dimension (Holographic State): 1D → 2D → 3D → 4D → 5D
3. Geometry (Complexity Class): Line → Loop → Spiral → Grid → Torus → Lattice → E8

The architecture separates:
- Crystallization (determines geometry based on pattern complexity)
- Compression (determines dimensional storage state)
- Phase (determines processing mode in universal cycle)
- Addressing (retrieval algorithm, derived from geometry)
"""

from .universal_cycle.cycle_manager import CycleManager, Phase
from .geometric_primitives.geometry_ladder import (
    GeometryClass,
    measure_complexity,
    choose_geometry_class,
    HabitCrystallizer
)
from .holographic_transform.dimensional_state import DimensionalState
from .holographic_transform.compressor import compress
from .holographic_transform.decompressor import decompress

__version__ = "1.0.0"

__all__ = [
    'CycleManager',
    'Phase',
    'GeometryClass',
    'measure_complexity',
    'choose_geometry_class',
    'HabitCrystallizer',
    'DimensionalState',
    'compress',
    'decompress',
]
