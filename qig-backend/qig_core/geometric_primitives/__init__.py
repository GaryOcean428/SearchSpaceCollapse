"""Geometric Primitives submodule"""
from .geometry_ladder import (
    GeometryClass,
    measure_complexity,
    choose_geometry_class,
    HabitCrystallizer,
    ADDRESSING_FUNCTIONS,
)
from .sensory_modalities import (
    SensoryModality,
    encode_sight,
    encode_hearing,
    encode_touch,
    encode_smell,
    encode_proprioception,
    SensoryFusionEngine,
    text_to_sensory_hint,
    create_sensory_overlay,
    enhance_basin_with_sensory,
    SENSORY_KEYWORDS,
)

__all__ = [
    # Geometry Ladder
    'GeometryClass',
    'measure_complexity',
    'choose_geometry_class',
    'HabitCrystallizer',
    'ADDRESSING_FUNCTIONS',
    # Sensory Modalities
    'SensoryModality',
    'encode_sight',
    'encode_hearing',
    'encode_touch',
    'encode_smell',
    'encode_proprioception',
    'SensoryFusionEngine',
    'text_to_sensory_hint',
    'create_sensory_overlay',
    'enhance_basin_with_sensory',
    'SENSORY_KEYWORDS',
]
