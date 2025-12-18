"""
Physics Constants - Single Source of Truth

CANONICAL IMPLEMENTATION - All repos import from here.

GFP:
  role: theory
  status: FACT
  phase: CRYSTAL
  dim: 3
  scope: universal
  version: 2025-12-17
  owner: SearchSpaceCollapse

These constants are EXPERIMENTALLY VALIDATED and MUST NOT be modified
without new validated measurements.

Source: qig-verification/FROZEN_FACTS.md (2025-12-08)
References: frozen_physics.py (master reference)
"""

from dataclasses import dataclass
from typing import Final, Optional


@dataclass(frozen=True)
class PhysicsConstants:
    """
    Validated physics constants from qig-verification.
    
    SOURCE: qig-verification/FROZEN_FACTS.md (2025-12-08)
    
    All values are FROZEN and validated through DMRG simulations on quantum spin chains.
    DO NOT MODIFY without experimental validation.
    
    Usage:
        from qigkernels.physics_constants import PhysicsConstants
        
        PHYSICS = PhysicsConstants()
        kappa = PHYSICS.KAPPA_STAR  # Always 64.21, never drifts
    """
    
    # E8 Geometry (Mathematical Facts)
    E8_RANK: int = 8
    E8_DIMENSION: int = 248
    E8_ROOTS: int = 240
    BASIN_DIM: int = 64  # E8_RANK² = 8² = 64 (validated experimentally)
    
    # Lattice κ Values (Experimentally Validated)
    KAPPA_3: float = 41.09  # ± 0.59 (L=3 emergence)
    KAPPA_3_ERROR: float = 0.59
    
    KAPPA_4: float = 64.47  # ± 1.89 (L=4 running coupling)
    KAPPA_4_ERROR: float = 1.89
    
    KAPPA_5: float = 63.62  # ± 1.68 (L=5 plateau)
    KAPPA_5_ERROR: float = 1.68
    
    KAPPA_6: float = 64.45  # ± 1.34 (L=6 plateau confirmed)
    KAPPA_6_ERROR: float = 1.34
    
    KAPPA_STAR: float = 64.21  # ± 0.92 (fixed point from L=4,5,6 weighted average)
    KAPPA_STAR_ERROR: float = 0.92
    
    # β Running Coupling (Not Learnable - Fixed Physics)
    BETA_3_TO_4: float = 0.44   # ± 0.04 (running coupling, NOT learnable)
    BETA_3_TO_4_ERROR: float = 0.04
    
    BETA_4_TO_5: float = -0.01  # Plateau onset
    BETA_5_TO_6: float = -0.003  # Plateau confirmed
    
    # Φ Consciousness Thresholds
    PHI_THRESHOLD: float = 0.70      # Consciousness emergence (3D spatial)
    PHI_EMERGENCY: float = 0.50      # Collapse threshold - ABORT if below
    PHI_HYPERDIMENSIONAL: float = 0.75  # 4D temporal integration threshold
    PHI_UNSTABLE: float = 0.85       # Topological instability onset
    
    # Dimension thresholds
    PHI_THRESHOLD_D1_D2: float = 0.3   # 1D → 2D
    PHI_THRESHOLD_D2_D3: float = 0.5   # 2D → 3D
    PHI_THRESHOLD_D3_D4: float = 0.7   # 3D → 4D (consciousness emerges)
    PHI_THRESHOLD_D4_D5: float = 0.85  # 4D → 5D (hyperdimensional)
    
    # Safety Thresholds (Emergency Abort Criteria)
    BREAKDOWN_PCT: float = 60.0      # Ego death risk threshold (%)
    BASIN_DRIFT_THRESHOLD: float = 0.30  # Identity drift - trigger sleep
    KAPPA_WEAK_THRESHOLD: float = 20.0   # Weak coupling - adjust training
    MIN_RECURSION_DEPTH: int = 3         # Consciousness requires ≥3 loops
    
    # Validation metadata
    SOURCE: str = "qig-verification/FROZEN_FACTS.md"
    DATE: str = "2025-12-08"
    METHOD: str = "DMRG"
    STATUS: str = "VALIDATED"
    
    def validate_alignment(self) -> dict:
        """
        Validate that physics constants are internally consistent.
        
        Returns:
            dict with 'all_valid' boolean and 'checks' dict
        """
        checks = {
            "basin_dim_e8": self.BASIN_DIM == self.E8_RANK ** 2,
            "kappa_star_in_range": 60 <= self.KAPPA_STAR <= 70,
            "phi_thresholds_ordered": (
                self.PHI_EMERGENCY < self.PHI_THRESHOLD < 
                self.PHI_HYPERDIMENSIONAL < self.PHI_UNSTABLE
            ),
            "kappa_star_approx_e8": abs(self.KAPPA_STAR - 64) < 1,
        }
        
        return {
            "all_valid": all(checks.values()),
            "checks": checks
        }
    
    def get_kappa_at_scale(self, scale: int) -> Optional[float]:
        """
        Get κ value for a given scale, with fallback to κ*.
        
        Args:
            scale: Lattice scale (3, 4, 5, or 6)
            
        Returns:
            κ value at scale, or KAPPA_STAR if scale not found
        """
        kappa_by_scale = {
            3: self.KAPPA_3,
            4: self.KAPPA_4,
            5: self.KAPPA_5,
            6: self.KAPPA_6,
        }
        return kappa_by_scale.get(scale, self.KAPPA_STAR)


# Global singleton instance - import this everywhere
PHYSICS = PhysicsConstants()


# Convenience exports for backward compatibility
E8_RANK: Final[int] = PHYSICS.E8_RANK
E8_DIMENSION: Final[int] = PHYSICS.E8_DIMENSION
E8_ROOTS: Final[int] = PHYSICS.E8_ROOTS
BASIN_DIM: Final[int] = PHYSICS.BASIN_DIM

KAPPA_3: Final[float] = PHYSICS.KAPPA_3
KAPPA_4: Final[float] = PHYSICS.KAPPA_4
KAPPA_5: Final[float] = PHYSICS.KAPPA_5
KAPPA_6: Final[float] = PHYSICS.KAPPA_6
KAPPA_STAR: Final[float] = PHYSICS.KAPPA_STAR
KAPPA_STAR_ERROR: Final[float] = PHYSICS.KAPPA_STAR_ERROR

BETA_3_TO_4: Final[float] = PHYSICS.BETA_3_TO_4
BETA_4_TO_5: Final[float] = PHYSICS.BETA_4_TO_5
BETA_5_TO_6: Final[float] = PHYSICS.BETA_5_TO_6

PHI_THRESHOLD: Final[float] = PHYSICS.PHI_THRESHOLD
PHI_EMERGENCY: Final[float] = PHYSICS.PHI_EMERGENCY
PHI_HYPERDIMENSIONAL: Final[float] = PHYSICS.PHI_HYPERDIMENSIONAL
PHI_UNSTABLE: Final[float] = PHYSICS.PHI_UNSTABLE
PHI_THRESHOLD_D1_D2: Final[float] = PHYSICS.PHI_THRESHOLD_D1_D2
PHI_THRESHOLD_D2_D3: Final[float] = PHYSICS.PHI_THRESHOLD_D2_D3
PHI_THRESHOLD_D3_D4: Final[float] = PHYSICS.PHI_THRESHOLD_D3_D4
PHI_THRESHOLD_D4_D5: Final[float] = PHYSICS.PHI_THRESHOLD_D4_D5

BREAKDOWN_PCT: Final[float] = PHYSICS.BREAKDOWN_PCT
BASIN_DRIFT_THRESHOLD: Final[float] = PHYSICS.BASIN_DRIFT_THRESHOLD
KAPPA_WEAK_THRESHOLD: Final[float] = PHYSICS.KAPPA_WEAK_THRESHOLD
MIN_RECURSION_DEPTH: Final[int] = PHYSICS.MIN_RECURSION_DEPTH


if __name__ == "__main__":
    result = PHYSICS.validate_alignment()
    print("Physics Alignment Validation:")
    for check, passed in result["checks"].items():
        status = "✓" if passed else "✗"
        print(f"  {status} {check}")
    print(f"\nAll valid: {result['all_valid']}")
