/**
 * Physics Constants - Single Source of Truth
 * 
 * EMPIRICALLY VALIDATED CONSTANTS (L=6 VALIDATED 2025-12-04)
 * Source: qig-verification/FROZEN_FACTS.md (multi-seed validated)
 * 
 * ⚠️ FROZEN FACTS - DO NOT MODIFY WITHOUT EXPERIMENTAL VALIDATION
 * 
 * These constants are derived from quantum information geometry experiments
 * and represent fundamental properties of information manifolds.
 */

/**
 * Running Coupling κ(L) at Different Scales
 * 
 * Validated through DMRG simulations on quantum spin chains.
 * Each value represents the coupling strength at a specific scale L.
 */
export const KAPPA_VALUES = {
  /** κ₃ - Emergence scale (L=3) - ✅ VALIDATED (6 seeds) */
  KAPPA_3: 41.09,
  
  /** κ₄ - Strong running coupling (L=4) - ✅ VALIDATED (3 seeds × 20 perts) */
  KAPPA_4: 64.47,
  
  /** κ₅ - Approaching plateau (L=5) - ✅ VALIDATED (3 seeds × 20 perts) */
  KAPPA_5: 63.62,
  
  /** κ₆ - Plateau confirmed (L=6) - ✅ VALIDATED (3 seeds × 36 perts) */
  KAPPA_6: 64.45,
  
  /** κ₇ - ANOMALY - ⚠️ UNVALIDATED (only 5 perts, shows UNEXPECTED DROP from plateau) */
  KAPPA_7: 53.08,
  
  /** κ* - Fixed point coupling (extrapolated from L=4,5,6 data) */
  KAPPA_STAR: 64.0,
} as const;

/**
 * Beta Function β(L→L') Values
 * 
 * Measures scale-dependence of coupling:
 * β(L→L') = (κ_L' - κ_L) / κ_avg
 * 
 * β → 0 indicates fixed point (asymptotic freedom)
 */
export const BETA_VALUES = {
  /** β(3→4) - CRITICAL: Strongest running (+57% jump) */
  BETA_3_TO_4: 0.44,
  
  /** β(4→5) - Plateau onset */
  BETA_4_TO_5: -0.013,
  
  /** β(5→6) - Plateau confirmed (stable) */
  BETA_5_TO_6: 0.013,
  
  /** β(6→7) - ⚠️ UNVALIDATED (L=7 data insufficient) */
  BETA_6_TO_7: null,
} as const;

/**
 * Error Bars for κ Values
 * 
 * ± uncertainties from experimental measurements
 */
export const KAPPA_ERRORS = {
  KAPPA_3_ERROR: 0.59,
  KAPPA_4_ERROR: 1.89,
  KAPPA_5_ERROR: 1.68,
  KAPPA_6_ERROR: 1.34,
  KAPPA_7_ERROR: 4.26,
  KAPPA_STAR_ERROR: 1.5,
} as const;

/**
 * Validation Statistics for L=6
 * 
 * Quality metrics from 3-seed validation
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
 * L=7 ANOMALY WARNING
 * 
 * ⚠️ L=7 measurements are UNVALIDATED and show ANOMALOUS DROP from plateau
 */
export const L7_WARNING = {
  STATUS: 'UNVALIDATED' as const,
  KAPPA_7: 53.08,
  ERROR: 4.26,
  N_PERTS: 5,
  REASON: 'Insufficient sampling (requires 36+ perturbations). Shows ANOMALOUS DROP from plateau (κ₇ < κ₆), breaking established pattern. Needs full validation to confirm.',
} as const;

/**
 * Physics Beta Function Reference
 * 
 * Used for attention mechanism validation and substrate independence testing
 */
export const PHYSICS_BETA = {
  emergence: BETA_VALUES.BETA_3_TO_4,
  approaching: BETA_VALUES.BETA_4_TO_5,
  fixedPoint: BETA_VALUES.BETA_5_TO_6,
  kappaStar: KAPPA_VALUES.KAPPA_STAR,
  acceptanceThreshold: 0.1,
} as const;

/**
 * Lookup table for κ values by scale
 */
export const KAPPA_BY_SCALE: Record<number, number> = {
  3: KAPPA_VALUES.KAPPA_3,
  4: KAPPA_VALUES.KAPPA_4,
  5: KAPPA_VALUES.KAPPA_5,
  6: KAPPA_VALUES.KAPPA_6,
  7: KAPPA_VALUES.KAPPA_7,
};

/**
 * Get κ value for a given scale, with fallback to κ*
 */
export function getKappaAtScale(scale: number): number {
  return KAPPA_BY_SCALE[scale] ?? KAPPA_VALUES.KAPPA_STAR;
}

/**
 * Physics Validation Metadata
 */
export const VALIDATION_METADATA = {
  SOURCE: 'qig-verification',
  DATE: '2025-12-02',
  METHOD: 'DMRG',
  STATUS: 'VALIDATED',
  LAST_UPDATED: '2025-12-08',
} as const;

/**
 * Type exports
 */
export type KappaScale = 3 | 4 | 5 | 6 | 7;
export type ValidationStatus = 'VALIDATED' | 'PRELIMINARY' | 'THEORETICAL' | 'UNVALIDATED';

/**
 * Validation Summary
 */
export const VALIDATION_SUMMARY = {
  κ3: `${KAPPA_VALUES.KAPPA_3} ± ${KAPPA_ERRORS.KAPPA_3_ERROR}`,
  κ4: `${KAPPA_VALUES.KAPPA_4} ± ${KAPPA_ERRORS.KAPPA_4_ERROR}`,
  κ5: `${KAPPA_VALUES.KAPPA_5} ± ${KAPPA_ERRORS.KAPPA_5_ERROR}`,
  κ6: `${KAPPA_VALUES.KAPPA_6} ± ${KAPPA_ERRORS.KAPPA_6_ERROR}`,
  κ_star: `${KAPPA_VALUES.KAPPA_STAR} ± ${KAPPA_ERRORS.KAPPA_STAR_ERROR}`,
  β_3_4: BETA_VALUES.BETA_3_TO_4,
  β_4_5: BETA_VALUES.BETA_4_TO_5,
  β_5_6: BETA_VALUES.BETA_5_TO_6,
  fixed_point_confirmed: Math.abs(BETA_VALUES.BETA_5_TO_6) < 0.03,
} as const;
