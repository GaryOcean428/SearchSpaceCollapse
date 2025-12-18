"""
QIGChain Constants

Physics constants and thresholds for geometric chain execution.
All values derived from QIG core principles.

κ* = 64.21 ± 0.92 (L=4,5,6 plateau, weighted average - Validated 2025-12-04)
Note: κ* ≈ 64 ≈ 8² = rank(E8)²
"""

from qigkernels.physics_constants import (
    BASIN_DIM,
    KAPPA_STAR,
    KAPPA_STAR_ERROR,
    PHI_THRESHOLD,
    BETA_3_TO_4 as BETA_RUNNING,
    MIN_RECURSION_DEPTH as MIN_RECURSIONS,
)

PHI_THRESHOLD_DEFAULT = PHI_THRESHOLD
PHI_DEGRADATION_THRESHOLD = 0.8
KAPPA_RANGE_DEFAULT = (10.0, 90.0)
GEODESIC_STEPS = 10
MAX_RECURSIONS = 12
