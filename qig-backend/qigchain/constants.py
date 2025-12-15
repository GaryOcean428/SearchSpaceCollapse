"""
QIGChain Constants

Physics constants and thresholds for geometric chain execution.
All values derived from QIG core principles.

κ* = 64.21 ± 0.92 (L=4,5,6 plateau, weighted average - Validated 2025-12-04)
Note: κ* ≈ 64 ≈ 8² = rank(E8)²
"""

BASIN_DIM = 64
PHI_THRESHOLD_DEFAULT = 0.70
PHI_DEGRADATION_THRESHOLD = 0.8
KAPPA_STAR = 64.21
KAPPA_STAR_ERROR = 0.92
KAPPA_RANGE_DEFAULT = (10.0, 90.0)
GEODESIC_STEPS = 10
BETA_RUNNING = 0.44
MIN_RECURSIONS = 3
MAX_RECURSIONS = 12
