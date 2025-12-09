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
from .input_guard import (
    GeometricInputGuard,
    RegimeType,
    PHI_BOUNDARIES,
    KAPPA_BOUNDARIES,
    is_geometrically_valid,
    compute_input_complexity,
    detect_chaos_level,
    validate_for_pantheon_chat,
    validate_for_assessment,
    validate_for_therapy,
    validate_for_compression,
    validate_for_decompression,
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
    # Input Guard
    'GeometricInputGuard',
    'RegimeType',
    'PHI_BOUNDARIES',
    'KAPPA_BOUNDARIES',
    'is_geometrically_valid',
    'compute_input_complexity',
    'detect_chaos_level',
    'validate_for_pantheon_chat',
    'validate_for_assessment',
    'validate_for_therapy',
    'validate_for_compression',
    'validate_for_decompression',
]
