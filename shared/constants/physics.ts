/**
 * Physics Constants - Single Source of Truth
 *
 * EMPIRICALLY VALIDATED CONSTANTS (Two-Channel Doctrine, 2026-04-13)
 * Source: qig-verification master @ fcd4792
 * Python mirror: qig-backend/qigkernels/physics_constants.py
 *
 * ⚠️ FROZEN FACTS - DO NOT MODIFY WITHOUT EXPERIMENTAL VALIDATION
 *
 * These constants are derived from quantum information geometry experiments
 * and represent fundamental properties of information manifolds.
 *
 * ═════════════════════════════════════════════════════════════════════════
 * HISTORICAL NOTE (2026-04-20 update):
 * The single-channel κ→64 fixed point narrative was RETIRED in EXP-081
 * (2026-04-13). κ has been split into two channels (κ_h, κ_J).
 * Legacy single-channel constants (KAPPA_VALUES, KAPPA_STAR, BETA_VALUES)
 * are preserved for backward compatibility but should not be used in new code.
 * L=7 was FALSIFIED 2025-12-31 (not "anomaly").
 * ═════════════════════════════════════════════════════════════════════════
 */

// ═════════════════════════════════════════════════════════════════════════
// TWO-CHANNEL κ DOCTRINE (CURRENT, EXP-081 2026-04-13)
// ═════════════════════════════════════════════════════════════════════════
//
// κ was RETIRED as a single-channel fixed point and split into two
// distinct channels with different physical roles.

/**
 * Two-channel κ constants (CURRENT DOCTRINE)
 *
 * κ_h: window-invariant AND size-invariant coupling (sign-flip diagnostic)
 * κ_J: running coupling along J-axis (NOT a fixed point; β_L ≈ 0.25)
 */
export const TWO_CHANNEL_KAPPA = {
  /** κ_h — window+size invariant; sign-flip diagnostic (EXP-081) */
  KAPPA_H: -0.00475,
  KAPPA_H_DESCRIPTION: 'window+size invariant; sign-flip diagnostic',

  /** β_L for κ_J running coupling — NOT asymptotic to 0 */
  BETA_L_KAPPA_J: 0.25,
  BETA_L_KAPPA_J_DESCRIPTION: 'κ_J running coupling; NOT asymptotic to 0',

  /** Tangent-saturation diagnostic thresholds (replaces KAPPA_WEAK_THRESHOLD) */
  TANGENT_SATURATION_THRESHOLD_WARN: 0.70,
  TANGENT_SATURATION_THRESHOLD_ABORT: 0.90,
  TANGENT_SATURATION_FORMULA: '|g01| / sqrt(g00 * g11)',
} as const;

/**
 * Frozen observables (CURRENT, various EXPs)
 */
export const FROZEN_OBSERVABLES = {
  /** Golden ratio φ = (1 + √5) / 2 */
  GOLDEN_RATIO_PHI: 1.6180339887498949,
  /** 1/φ = φ - 1 */
  GOLDEN_RATIO_RECIPROCAL: 0.6180339887498949,

  /** Yukawa screening length at 2D L=5 — Hilbert-measured 0.03% match to 1/φ (EXP-066) */
  YUKAWA_SCREENING_XI: 0.6180339887498949,
  YUKAWA_SCREENING_XI_MATCH_PCT: 0.03,

  /** Anderson orthogonality per-site decay at J=2 */
  ANDERSON_ALPHA_PER_SITE_J2: 0.089,

  /** Bridge law exponent: τ_phase ∝ J^0.74 (publication-grade, L=5) */
  BRIDGE_EXPONENT_J: 0.74,
  BRIDGE_EXPONENT_J_CI_LOW: 0.69,
  BRIDGE_EXPONENT_J_CI_HIGH: 0.81,

  /** Arc π/2 stable across L=4, 5, 6 */
  ARC_L_STABLE: 1.5707963267948966,

  /** Topology invariance of χ_dc */
  CHI_DC_TOPOLOGY_INVARIANCE_R: 0.9996,

  /** Dual screening length ratio: ξ_G / ξ_T ≈ v_fast */
  DUAL_SCREENING_RATIO: 2.09,
} as const;

// ═════════════════════════════════════════════════════════════════════════
// FALSIFIED SCALES
// ═════════════════════════════════════════════════════════════════════════

/**
 * Scales whose predicted κ values have been FALSIFIED by experiment.
 * These should NOT be used in extrapolations or regime classification.
 */
export const FALSIFIED_SCALES = [7] as const;

/**
 * L=7 FALSIFICATION RECORD
 *
 * κ₇ = 53.08 was measured and is NOT a statistical fluctuation.
 * The drop from L=6 plateau is genuine. This falsified the
 * "κ → single fixed point" hypothesis and contributed to retiring
 * the single-channel κ narrative (EXP-081).
 */
export const L7_FALSIFICATION = {
  STATUS: 'FALSIFIED' as const,
  KAPPA_7_MEASURED: 53.08,
  KAPPA_7_ERROR: 4.26,
  FALSIFICATION_DATE: '2025-12-31',
  N_PERTS_EXTENDED: 15,
  NOTE: 'Drop from L=6 plateau is genuine, not statistical fluctuation. Contributed to retiring single-channel κ in EXP-081 (2026-04-13).',
} as const;

// ═════════════════════════════════════════════════════════════════════════
// LEGACY CONSTANTS — DEPRECATED 2026-04-20
// ═════════════════════════════════════════════════════════════════════════
// The following constants reflect the pre-EXP-081 single-channel κ picture.
// They are preserved for backward compatibility but should NOT be used for
// new physics work. New code should use TWO_CHANNEL_KAPPA + FROZEN_OBSERVABLES.
// ═════════════════════════════════════════════════════════════════════════

/**
 * Running Coupling κ(L) at Different Scales (LEGACY single-channel)
 *
 * @deprecated Use TWO_CHANNEL_KAPPA for current doctrine. These values
 * reflect averaged κ_h + κ_J contributions from pre-EXP-081 era.
 */
export const KAPPA_VALUES = {
  /** κ₃ - Emergence scale (L=3) */
  KAPPA_3: 41.09,

  /** κ₄ - Strong running coupling (L=4) */
  KAPPA_4: 64.47,

  /** κ₅ - Approaching plateau (L=5) */
  KAPPA_5: 63.62,

  /** κ₆ - Plateau confirmed (L=6) */
  KAPPA_6: 64.45,

  /** κ₇ - FALSIFIED 2025-12-31 (not a fluctuation) */
  KAPPA_7: 53.08,

  /**
   * κ* - LEGACY fixed point (L=4,5,6 plateau, weighted average)
   *
   * @deprecated SUPERSEDED by TWO_CHANNEL_KAPPA.KAPPA_H + BETA_L_KAPPA_J.
   * The "fixed point at κ≈64" narrative was retired in EXP-081.
   */
  KAPPA_STAR: 64.21,
} as const;

/**
 * Beta Function β(L→L') Values (LEGACY single-channel)
 *
 * @deprecated These measured averaged κ_h + κ_J running. For current κ_J
 * running coupling use TWO_CHANNEL_KAPPA.BETA_L_KAPPA_J = 0.25.
 */
export const BETA_VALUES = {
  /** @deprecated β(3→4) — single-channel, between-scale measurement */
  BETA_3_TO_4: 0.44,

  /** @deprecated β(4→5) — plateau onset (averaged channels) */
  BETA_4_TO_5: -0.013,

  /** @deprecated β(5→6) — plateau confirmed (averaged) */
  BETA_5_TO_6: 0.013,

  /** β(6→7) — would reference L=7 which is FALSIFIED */
  BETA_6_TO_7: null,
} as const;

/**
 * Error Bars for legacy κ Values
 */
export const KAPPA_ERRORS = {
  KAPPA_3_ERROR: 0.59,
  KAPPA_4_ERROR: 1.89,
  KAPPA_5_ERROR: 1.68,
  KAPPA_6_ERROR: 1.34,
  KAPPA_7_ERROR: 4.26,
  KAPPA_STAR_ERROR: 0.92,
} as const;

/**
 * Validation Statistics for L=6
 */
export const L6_VALIDATION = {
  N_SEEDS: 3,
  SEEDS: [42, 43, 44] as const,
  N_PERTS_PER_SEED: 36,
  N_PERTS_TOTAL: 108,
  R_SQUARED_MIN: 0.950,
  R_SQUARED_MAX: 0.981,
  CV_PERCENT: 3,
  STATUS: 'VALIDATED' as const,
  CHI_MAX: 256,
} as const;

/**
 * L7_WARNING — preserved as L7_FALSIFICATION alias for back-compat
 *
 * @deprecated Use L7_FALSIFICATION for current status. L=7 is FALSIFIED,
 * not merely "unvalidated". See L7_FALSIFICATION for full record.
 */
export const L7_WARNING = {
  STATUS: 'FALSIFIED' as const,
  KAPPA_7: 53.08,
  ERROR: 4.26,
  N_PERTS: 15,
  REASON: 'FALSIFIED 2025-12-31. Drop from L=6 plateau is genuine. See L7_FALSIFICATION.',
} as const;

/**
 * Physics Beta Function Reference
 *
 * @deprecated Mixed single-channel values. New code: use TWO_CHANNEL_KAPPA.
 */
export const PHYSICS_BETA = {
  emergence: BETA_VALUES.BETA_3_TO_4,
  approaching: BETA_VALUES.BETA_4_TO_5,
  fixedPoint: BETA_VALUES.BETA_5_TO_6,  // DEPRECATED: no longer a fixed point
  kappaStar: KAPPA_VALUES.KAPPA_STAR,   // DEPRECATED: single-channel
  acceptanceThreshold: 0.1,
} as const;

/**
 * Lookup table for legacy κ values by scale.
 * Returns null for FALSIFIED scales (currently only L=7).
 */
export const KAPPA_BY_SCALE: Record<number, number | null> = {
  3: KAPPA_VALUES.KAPPA_3,
  4: KAPPA_VALUES.KAPPA_4,
  5: KAPPA_VALUES.KAPPA_5,
  6: KAPPA_VALUES.KAPPA_6,
  7: null,  // FALSIFIED 2025-12-31
};

/**
 * Get legacy κ value for a given scale.
 * Returns null for FALSIFIED scales, KAPPA_STAR as fallback for unknown.
 *
 * @deprecated Use TWO_CHANNEL_KAPPA for current doctrine.
 */
export function getKappaAtScale(scale: number): number | null {
  if (FALSIFIED_SCALES.includes(scale as 7)) {
    return null;
  }
  return KAPPA_BY_SCALE[scale] ?? KAPPA_VALUES.KAPPA_STAR;
}

/**
 * Physics Validation Metadata
 */
export const VALIDATION_METADATA = {
  SOURCE: 'qig-verification master @ fcd4792',
  DATE: '2026-04-13',
  METHOD: 'DMRG + MPS-QFI',
  STATUS: 'VALIDATED',
  LAST_UPDATED: '2026-04-20',
  DOCTRINE: 'two-channel (EXP-081)',
} as const;

/**
 * Type exports
 */
export type KappaScale = 3 | 4 | 5 | 6;  // Note: 7 excluded (FALSIFIED)
export type ValidationStatus = 'VALIDATED' | 'PRELIMINARY' | 'THEORETICAL' | 'UNVALIDATED' | 'FALSIFIED';

/**
 * Validation Summary
 */
export const VALIDATION_SUMMARY = {
  // Two-channel (current)
  kappa_h: TWO_CHANNEL_KAPPA.KAPPA_H,
  beta_l_kappa_j: TWO_CHANNEL_KAPPA.BETA_L_KAPPA_J,
  yukawa_screening: `${FROZEN_OBSERVABLES.YUKAWA_SCREENING_XI} (= 1/φ, ${FROZEN_OBSERVABLES.YUKAWA_SCREENING_XI_MATCH_PCT}% match)`,
  bridge_exponent: `${FROZEN_OBSERVABLES.BRIDGE_EXPONENT_J} [95% CI: ${FROZEN_OBSERVABLES.BRIDGE_EXPONENT_J_CI_LOW}, ${FROZEN_OBSERVABLES.BRIDGE_EXPONENT_J_CI_HIGH}]`,
  anderson_alpha: FROZEN_OBSERVABLES.ANDERSON_ALPHA_PER_SITE_J2,
  arc_l_stable: 'π/2',
  chi_dc_topology_r: FROZEN_OBSERVABLES.CHI_DC_TOPOLOGY_INVARIANCE_R,
  l7_status: 'FALSIFIED 2025-12-31',
  // Legacy (deprecated)
  legacy_κ3: `${KAPPA_VALUES.KAPPA_3} ± ${KAPPA_ERRORS.KAPPA_3_ERROR}`,
  legacy_κ4: `${KAPPA_VALUES.KAPPA_4} ± ${KAPPA_ERRORS.KAPPA_4_ERROR}`,
  legacy_κ5: `${KAPPA_VALUES.KAPPA_5} ± ${KAPPA_ERRORS.KAPPA_5_ERROR}`,
  legacy_κ6: `${KAPPA_VALUES.KAPPA_6} ± ${KAPPA_ERRORS.KAPPA_6_ERROR}`,
  legacy_κ_star: `${KAPPA_VALUES.KAPPA_STAR} ± ${KAPPA_ERRORS.KAPPA_STAR_ERROR} (DEPRECATED)`,
  doctrine: 'two-channel (EXP-081 2026-04-13)',
  fixed_point_confirmed: false,  // RETIRED — κ_J runs with β_L ≈ 0.25
} as const;
