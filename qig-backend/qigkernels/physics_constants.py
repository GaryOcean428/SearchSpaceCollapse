"""
Physics Constants - Single Source of Truth

CANONICAL IMPLEMENTATION - All repos import from here.

GFP:
  role: theory
  status: FACT
  phase: CRYSTAL
  dim: 3
  scope: universal
  version: 2026-04-20
  owner: SearchSpaceCollapse

These constants are EXPERIMENTALLY VALIDATED and MUST NOT be modified
without new validated measurements.

Sources (in priority order, newest wins for conflicts):
- qig-verification master @ fcd4792 (2026-04-13) — two-channel doctrine, EXP-081
- qig-verification docs/current/20260331-frozen-facts-primary-1.00F.md
- qig-verification docs/current/20260413-two-channel-doctrine-1.00F.md
- SSC frozen-facts doc 2025-12-03 (LEGACY, single-channel κ)

HISTORICAL NOTE (2026-04-20 update):
The single-channel κ→64 fixed point narrative was RETIRED in EXP-081
(2026-04-13). κ has been split into two channels:
  - κ_h (window+size invariant, ≈-0.00475)
  - κ_J (running with β_L ≈ 0.25)

Legacy constants (KAPPA_STAR, KAPPA_3..6, BETA_3_TO_4, BETA_ASYMPTOTIC)
are preserved for backward compatibility but marked DEPRECATED. New code
should use TWO_CHANNEL_KAPPA and FROZEN_OBSERVABLES.
"""

from dataclasses import dataclass
from typing import Final, Optional


@dataclass(frozen=True)
class PhysicsConstants:
    """
    Validated physics constants from qig-verification.

    SOURCE: qig-verification master @ fcd4792 (2026-04-13)

    All values are FROZEN and validated through DMRG / MPS-QFI simulations
    on quantum spin chains.

    DO NOT MODIFY without experimental validation.

    Usage:
        from qigkernels.physics_constants import PhysicsConstants

        PHYSICS = PhysicsConstants()
        # Current doctrine:
        kappa_h = PHYSICS.KAPPA_H          # window+size invariant
        kappa_j_beta = PHYSICS.BETA_L_KAPPA_J  # running coupling for κ_J
        # Legacy single-channel (deprecated, for back-compat only):
        kappa_legacy = PHYSICS.KAPPA_STAR
    """

    # =========================================================================
    # E8 Geometry (Mathematical Facts)
    # =========================================================================
    E8_RANK: int = 8
    E8_DIMENSION: int = 248
    E8_ROOTS: int = 240
    BASIN_DIM: int = 64  # E8_RANK² = 8² = 64 (observed, not derived)

    # =========================================================================
    # TWO-CHANNEL κ DOCTRINE (CURRENT, EXP-081 2026-04-13)
    # =========================================================================
    # κ was RETIRED as a single-channel fixed point and split into two
    # distinct channels with different physical roles.

    # κ_h: window-invariant AND size-invariant coupling
    # Source: EXP-081 sweep over windows and lattice sizes
    KAPPA_H: float = -0.00475
    KAPPA_H_ERROR: Optional[float] = None  # pending canonical error estimate
    KAPPA_H_DESCRIPTION: str = "window+size invariant; sign-flip diagnostic"

    # κ_J: running coupling along J-axis
    # Unlike legacy single-channel picture, κ_J does NOT approach a fixed point.
    # It runs with a non-trivial β_L coefficient.
    BETA_L_KAPPA_J: float = 0.25  # Running coupling for κ_J
    BETA_L_KAPPA_J_DESCRIPTION: str = "κ_J running coupling; NOT asymptotic to 0"

    # Tangent-saturation diagnostic (replaces single-κ weak/strong threshold)
    # Formula: tangent_saturation = |g01| / sqrt(g00 * g11)
    TANGENT_SATURATION_THRESHOLD_WARN: float = 0.70
    TANGENT_SATURATION_THRESHOLD_ABORT: float = 0.90
    TANGENT_SATURATION_DESCRIPTION: str = (
        "g01 cross-correlation diagnostic; high values indicate "
        "ZZ-sector coupling contaminating QFI channel"
    )

    # =========================================================================
    # FROZEN OBSERVABLES (CURRENT, various EXPs)
    # =========================================================================

    # Golden ratio (used in multiple frozen facts)
    GOLDEN_RATIO_PHI: float = 1.6180339887498949  # (1 + sqrt(5)) / 2
    GOLDEN_RATIO_RECIPROCAL: float = 0.6180339887498949  # 1/φ = φ - 1

    # Yukawa screening length at 2D L=5 (Hilbert-measured 0.03% match to 1/φ)
    # Source: EXP-066
    YUKAWA_SCREENING_XI: float = 0.6180339887498949  # = 1/φ
    YUKAWA_SCREENING_XI_MATCH_PCT: float = 0.03  # % match to 1/φ

    # Anderson orthogonality per-site decay at J=2
    # Source: canonical (frozen)
    ANDERSON_ALPHA_PER_SITE_J2: float = 0.089

    # Bridge law exponent: τ_phase ∝ J^0.74 at L=5 publication-grade
    # Source: frozen, publication-grade
    BRIDGE_EXPONENT_J: float = 0.74
    BRIDGE_EXPONENT_J_CI_LOW: float = 0.69   # 95% CI lower
    BRIDGE_EXPONENT_J_CI_HIGH: float = 0.81  # 95% CI upper

    # Arc (π/2 stable across L=4,5,6)
    # Source: frozen
    ARC_L_STABLE: float = 1.5707963267948966  # = π/2

    # Topology invariance of χ_dc (frozen)
    CHI_DC_TOPOLOGY_INVARIANCE_R: float = 0.9996

    # Dual screening length ratio: ξ_G / ξ_T ≈ v_fast
    DUAL_SCREENING_RATIO: float = 2.09
    DUAL_SCREENING_DESCRIPTION: str = "ξ_G/ξ_T ≈ v_fast; two-scale screening"

    # =========================================================================
    # LEGACY CONSTANTS — DEPRECATED 2026-04-20
    # =========================================================================
    # These constants reflect the pre-EXP-081 single-channel κ picture.
    # They are preserved for backward compatibility with existing SSC code
    # but should NOT be used for new physics work. New code should use
    # KAPPA_H / BETA_L_KAPPA_J from the two-channel block above.
    #
    # Sources (legacy):
    # - qig-verification/FROZEN_FACTS.md (2025-12-08)
    # - L=3,4,5,6 DMRG measurements (superseded by two-channel decomposition)
    # =========================================================================

    # Lattice κ Values at specific L (legacy, single-channel)
    KAPPA_3: float = 41.09  # ± 0.59 (L=3 emergence)
    KAPPA_3_ERROR: float = 0.59

    KAPPA_4: float = 64.47  # ± 1.89 (L=4)
    KAPPA_4_ERROR: float = 1.89

    KAPPA_5: float = 63.62  # ± 1.68 (L=5)
    KAPPA_5_ERROR: float = 1.68

    KAPPA_6: float = 64.45  # ± 1.34 (L=6)
    KAPPA_6_ERROR: float = 1.34

    # Legacy single-channel fixed point (averaged g_h + g_J contributions)
    # SUPERSEDED by KAPPA_H + KAPPA_J two-channel split (EXP-081).
    KAPPA_STAR: float = 64.21  # ± 0.92 (DEPRECATED: single-channel)
    KAPPA_STAR_ERROR: float = 0.92

    # L=7 status: FALSIFIED 2025-12-31
    # κ varies at cracks and does not continue the L=4,5,6 plateau pattern.
    # This falsified the "κ → single fixed point" hypothesis.
    KAPPA_7_FALSIFIED: float = 53.08
    KAPPA_7_FALSIFICATION_DATE: str = "2025-12-31"
    KAPPA_7_NOTE: str = (
        "FALSIFIED 2025-12-31. Drop from L=6 plateau is genuine, not "
        "statistical fluctuation. Contributed to retiring single-channel κ."
    )
    FALSIFIED_SCALES: tuple = (7,)

    # Geometric Phase Transition
    L_CRITICAL: int = 3  # L_c = 3: Critical system size for geometric emergence

    # β Running Coupling (LEGACY single-channel — κ_J uses BETA_L_KAPPA_J)
    BETA_3_TO_4: float = 0.44   # ± 0.04 (LEGACY: between-scale, not continuous)
    BETA_3_TO_4_ERROR: float = 0.04
    BETA_4_TO_5: float = -0.01  # LEGACY: plateau onset (averaged channels)
    BETA_5_TO_6: float = +0.013  # LEGACY: plateau confirmed (averaged)
    BETA_ASYMPTOTIC: float = 0.0  # LEGACY: assumed fixed point (RETIRED — κ_J runs)

    # =========================================================================
    # Φ Consciousness Thresholds (unchanged from legacy)
    # =========================================================================
    PHI_THRESHOLD: float = 0.70
    PHI_SLEEP_THRESHOLD: float = 0.70
    PHI_CONSCIOUS_MIN: float = 0.70
    PHI_EMERGENCY: float = 0.50
    PHI_HYPERDIMENSIONAL: float = 0.75
    PHI_4D_EMERGENCE: float = 0.75
    PHI_4D_OPTIMAL: float = 0.80
    PHI_UNSTABLE: float = 0.85
    PHI_BREAKDOWN_WARNING: float = 0.85
    PHI_BREAKDOWN_CRITICAL: float = 0.95

    PHI_THRESHOLD_D1_D2: float = 0.3
    PHI_THRESHOLD_D2_D3: float = 0.5
    PHI_THRESHOLD_D3_D4: float = 0.7
    PHI_THRESHOLD_D4_D5: float = 0.85

    CONSCIOUS_ZONE_MIN: float = 0.70
    CONSCIOUS_ZONE_MAX: float = 0.85
    HYPERDIMENSIONAL_ZONE_MIN: float = 0.75
    HYPERDIMENSIONAL_ZONE_MAX: float = 0.85

    # =========================================================================
    # Safety Thresholds
    # =========================================================================
    BREAKDOWN_PCT: float = 60.0
    BASIN_DRIFT_THRESHOLD: float = 0.30

    # LEGACY single-channel abort threshold.
    # DEPRECATED: Use TANGENT_SATURATION_THRESHOLD_ABORT for new safety checks.
    # Under two-channel doctrine, κ_h ≈ -0.00475 always lies below this
    # threshold, so this check is not meaningful for two-channel κ.
    KAPPA_WEAK_THRESHOLD: float = 20.0

    MIN_RECURSION_DEPTH: int = 3

    # =========================================================================
    # Validation metadata
    # =========================================================================
    SOURCE: str = "qig-verification master @ fcd4792"
    DATE: str = "2026-04-13 (two-channel doctrine); SSC update 2026-04-20"
    METHOD: str = "DMRG + MPS-QFI"
    STATUS: str = "VALIDATED"

    def validate_alignment(self) -> dict:
        """
        Validate that physics constants are internally consistent.

        Returns:
            dict with 'all_valid' boolean and 'checks' dict
        """
        checks = {
            "basin_dim_e8": self.BASIN_DIM == self.E8_RANK ** 2,
            # Legacy single-channel checks (kept for back-compat)
            "kappa_star_legacy_in_range": 60 <= self.KAPPA_STAR <= 70,
            "phi_thresholds_ordered": (
                self.PHI_EMERGENCY < self.PHI_THRESHOLD
                < self.PHI_HYPERDIMENSIONAL < self.PHI_UNSTABLE
            ),
            "kappa_star_approx_e8": abs(self.KAPPA_STAR - 64) < 1,
            # Two-channel doctrine checks
            "kappa_h_negative": self.KAPPA_H < 0,
            "kappa_h_small_magnitude": abs(self.KAPPA_H) < 0.1,
            "beta_l_kappa_j_running": self.BETA_L_KAPPA_J > 0,
            # Golden-ratio screening check
            "yukawa_screening_equals_phi_reciprocal": (
                abs(self.YUKAWA_SCREENING_XI - 1.0 / self.GOLDEN_RATIO_PHI) < 1e-6
            ),
            # Bridge exponent CI check
            "bridge_exponent_in_ci": (
                self.BRIDGE_EXPONENT_J_CI_LOW
                <= self.BRIDGE_EXPONENT_J
                <= self.BRIDGE_EXPONENT_J_CI_HIGH
            ),
            # L=7 falsification recorded
            "l7_marked_falsified": 7 in self.FALSIFIED_SCALES,
        }

        return {
            "all_valid": all(checks.values()),
            "checks": checks,
        }

    def get_kappa_at_scale(self, scale: int) -> Optional[float]:
        """
        Get legacy single-channel κ value for a given scale.

        DEPRECATED: Under current two-channel doctrine, κ is split into
        κ_h and κ_J. Use KAPPA_H and BETA_L_KAPPA_J for new code.

        Args:
            scale: Lattice scale (3, 4, 5, or 6). Scale 7 is FALSIFIED.

        Returns:
            Legacy κ value at scale, or KAPPA_STAR if scale not found.
            Returns None if scale is in FALSIFIED_SCALES.
        """
        if scale in self.FALSIFIED_SCALES:
            return None  # FALSIFIED — caller must handle

        kappa_by_scale = {
            3: self.KAPPA_3,
            4: self.KAPPA_4,
            5: self.KAPPA_5,
            6: self.KAPPA_6,
        }
        return kappa_by_scale.get(scale, self.KAPPA_STAR)


# Global singleton instance - import this everywhere
PHYSICS = PhysicsConstants()


# =============================================================================
# Convenience exports for backward compatibility
# =============================================================================

# E8 (unchanged)
E8_RANK: Final[int] = PHYSICS.E8_RANK
E8_DIMENSION: Final[int] = PHYSICS.E8_DIMENSION
E8_ROOTS: Final[int] = PHYSICS.E8_ROOTS
BASIN_DIM: Final[int] = PHYSICS.BASIN_DIM

# Two-channel κ (CURRENT)
KAPPA_H: Final[float] = PHYSICS.KAPPA_H
BETA_L_KAPPA_J: Final[float] = PHYSICS.BETA_L_KAPPA_J
TANGENT_SATURATION_THRESHOLD_WARN: Final[float] = PHYSICS.TANGENT_SATURATION_THRESHOLD_WARN
TANGENT_SATURATION_THRESHOLD_ABORT: Final[float] = PHYSICS.TANGENT_SATURATION_THRESHOLD_ABORT

# Frozen observables (CURRENT)
GOLDEN_RATIO_PHI: Final[float] = PHYSICS.GOLDEN_RATIO_PHI
GOLDEN_RATIO_RECIPROCAL: Final[float] = PHYSICS.GOLDEN_RATIO_RECIPROCAL
YUKAWA_SCREENING_XI: Final[float] = PHYSICS.YUKAWA_SCREENING_XI
ANDERSON_ALPHA_PER_SITE_J2: Final[float] = PHYSICS.ANDERSON_ALPHA_PER_SITE_J2
BRIDGE_EXPONENT_J: Final[float] = PHYSICS.BRIDGE_EXPONENT_J
BRIDGE_EXPONENT_J_CI_LOW: Final[float] = PHYSICS.BRIDGE_EXPONENT_J_CI_LOW
BRIDGE_EXPONENT_J_CI_HIGH: Final[float] = PHYSICS.BRIDGE_EXPONENT_J_CI_HIGH
ARC_L_STABLE: Final[float] = PHYSICS.ARC_L_STABLE
CHI_DC_TOPOLOGY_INVARIANCE_R: Final[float] = PHYSICS.CHI_DC_TOPOLOGY_INVARIANCE_R
DUAL_SCREENING_RATIO: Final[float] = PHYSICS.DUAL_SCREENING_RATIO
FALSIFIED_SCALES: Final[tuple] = PHYSICS.FALSIFIED_SCALES

# Legacy single-channel κ (DEPRECATED but kept for back-compat)
KAPPA_3: Final[float] = PHYSICS.KAPPA_3
KAPPA_4: Final[float] = PHYSICS.KAPPA_4
KAPPA_5: Final[float] = PHYSICS.KAPPA_5
KAPPA_6: Final[float] = PHYSICS.KAPPA_6
KAPPA_STAR: Final[float] = PHYSICS.KAPPA_STAR  # DEPRECATED
KAPPA_STAR_ERROR: Final[float] = PHYSICS.KAPPA_STAR_ERROR  # DEPRECATED

# Legacy β (DEPRECATED)
BETA_3_TO_4: Final[float] = PHYSICS.BETA_3_TO_4
BETA_4_TO_5: Final[float] = PHYSICS.BETA_4_TO_5
BETA_5_TO_6: Final[float] = PHYSICS.BETA_5_TO_6
BETA_ASYMPTOTIC: Final[float] = PHYSICS.BETA_ASYMPTOTIC  # DEPRECATED
L_CRITICAL: Final[int] = PHYSICS.L_CRITICAL

# Φ thresholds (unchanged)
PHI_THRESHOLD: Final[float] = PHYSICS.PHI_THRESHOLD
PHI_SLEEP_THRESHOLD: Final[float] = PHYSICS.PHI_SLEEP_THRESHOLD
PHI_CONSCIOUS_MIN: Final[float] = PHYSICS.PHI_CONSCIOUS_MIN
PHI_EMERGENCY: Final[float] = PHYSICS.PHI_EMERGENCY
PHI_HYPERDIMENSIONAL: Final[float] = PHYSICS.PHI_HYPERDIMENSIONAL
PHI_4D_EMERGENCE: Final[float] = PHYSICS.PHI_4D_EMERGENCE
PHI_4D_OPTIMAL: Final[float] = PHYSICS.PHI_4D_OPTIMAL
PHI_UNSTABLE: Final[float] = PHYSICS.PHI_UNSTABLE
PHI_BREAKDOWN_WARNING: Final[float] = PHYSICS.PHI_BREAKDOWN_WARNING
PHI_BREAKDOWN_CRITICAL: Final[float] = PHYSICS.PHI_BREAKDOWN_CRITICAL
PHI_THRESHOLD_D1_D2: Final[float] = PHYSICS.PHI_THRESHOLD_D1_D2
PHI_THRESHOLD_D2_D3: Final[float] = PHYSICS.PHI_THRESHOLD_D2_D3
PHI_THRESHOLD_D3_D4: Final[float] = PHYSICS.PHI_THRESHOLD_D3_D4
PHI_THRESHOLD_D4_D5: Final[float] = PHYSICS.PHI_THRESHOLD_D4_D5
CONSCIOUS_ZONE_MIN: Final[float] = PHYSICS.CONSCIOUS_ZONE_MIN
CONSCIOUS_ZONE_MAX: Final[float] = PHYSICS.CONSCIOUS_ZONE_MAX
HYPERDIMENSIONAL_ZONE_MIN: Final[float] = PHYSICS.HYPERDIMENSIONAL_ZONE_MIN
HYPERDIMENSIONAL_ZONE_MAX: Final[float] = PHYSICS.HYPERDIMENSIONAL_ZONE_MAX

# Safety (legacy KAPPA_WEAK_THRESHOLD is DEPRECATED)
BREAKDOWN_PCT: Final[float] = PHYSICS.BREAKDOWN_PCT
BASIN_DRIFT_THRESHOLD: Final[float] = PHYSICS.BASIN_DRIFT_THRESHOLD
KAPPA_WEAK_THRESHOLD: Final[float] = PHYSICS.KAPPA_WEAK_THRESHOLD  # DEPRECATED
MIN_RECURSION_DEPTH: Final[int] = PHYSICS.MIN_RECURSION_DEPTH


if __name__ == "__main__":
    result = PHYSICS.validate_alignment()
    print("Physics Alignment Validation:")
    for check, passed in result["checks"].items():
        status = "✓" if passed else "✗"
        print(f"  {status} {check}")
    print(f"\nAll valid: {result['all_valid']}")
    print(f"\nTwo-channel κ doctrine (current):")
    print(f"  κ_h = {PHYSICS.KAPPA_H} (window+size invariant)")
    print(f"  β_L(κ_J) = {PHYSICS.BETA_L_KAPPA_J} (running, NOT fixed point)")
    print(f"  L=7 status: FALSIFIED {PHYSICS.KAPPA_7_FALSIFICATION_DATE}")
