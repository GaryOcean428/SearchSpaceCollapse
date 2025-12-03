/**
 * Physics Constants - Single Source of Truth
 * 
 * EMPIRICALLY VALIDATED CONSTANTS (L=6 VALIDATED 2025-12-02)
 * Source: qig-verification repository (quantum spin chain experiments)
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
  /** κ₃ - Emergence scale (L=3) */
  KAPPA_3: 41.09,
  
  /** κ₄ - Strong running coupling (L=4) */
  KAPPA_4: 64.47,
  
  /** κ₅ - Approaching plateau (L=5) */
  KAPPA_5: 63.62,
  
  /** κ₆ - Plateau confirmed (L=6) - VALIDATED with 3 seeds */
  KAPPA_6: 62.02,
  
  /** κ₇ - Extended plateau (L=7) - PRELIMINARY */
  KAPPA_7: 63.71,
  
  /** κ* - Fixed point coupling (exponential fit to L=3,4,5,6 data) */
  KAPPA_STAR: 63.5,
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
  /** β(3→4) - Strong running at emergence */
  BETA_3_TO_4: 0.443,
  
  /** β(4→5) - Approaching plateau */
  BETA_4_TO_5: -0.013,
  
  /** β(5→6) - Fixed point confirmed (≈0) */
  BETA_5_TO_6: -0.026,
  
  /** β(6→7) - Preliminary */
  BETA_6_TO_7: 0.004,
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
  KAPPA_6_ERROR: 2.47,
  KAPPA_7_ERROR: 3.89,
  KAPPA_STAR_ERROR: 1.5,
} as const;

/**
 * Validation Statistics for L=6
 * 
 * Quality metrics from 3-seed validation
 */
export const L6_VALIDATION = {
  /** Number of random seeds tested */
  N_SEEDS: 3,
  
  /** Seeds used: 42, 43, 44 */
  SEEDS: [42, 43, 44] as const,
  
  /** Number of perturbations per seed */
  N_PERTS_PER_SEED: 36,
  
  /** Total perturbations tested */
  N_PERTS_TOTAL: 108,
  
  /** R² range across seeds */
  R_SQUARED_MIN: 0.950,
  R_SQUARED_MAX: 0.981,
  
  /** Coefficient of variation (consistency metric) */
  CV_PERCENT: 3,
  
  /** Validation status */
  STATUS: 'VALIDATED' as const,
  
  /** DMRG bond dimension used */
  CHI_MAX: 256,
} as const;

/**
 * QIG System Constants
 * 
 * Core parameters for quantum information geometry framework
 */
export const QIG_CONSTANTS = {
  /** Fixed point coupling (updated from 64.0 to 63.5 based on L=6 validation) */
  KAPPA_STAR: KAPPA_VALUES.KAPPA_STAR,
  
  /** Running coupling at emergence scale (β(3→4)) */
  BETA: BETA_VALUES.BETA_3_TO_4,
  
  /** Consciousness phase transition threshold */
  PHI_THRESHOLD: 0.75,
  
  /** Critical scale for emergent geometry */
  L_CRITICAL: 3,
  
  /** Basin signature dimension (updated from 32 to 64 for cross-repo compatibility) */
  BASIN_DIMENSION: 64,
  
  /** Resonance detection band (10% of κ*) */
  RESONANCE_BAND: 6.35, // 10% of 63.5
} as const;

/**
 * Physics Beta Function Reference
 * 
 * Used for attention mechanism validation and substrate independence testing
 */
export const PHYSICS_BETA = {
  /** β at emergence (L=3→4 equivalent) */
  emergence: BETA_VALUES.BETA_3_TO_4,
  
  /** β approaching plateau (L=4→5 equivalent) */
  approaching: BETA_VALUES.BETA_4_TO_5,
  
  /** β at fixed point (L=5→6 equivalent) */
  fixedPoint: BETA_VALUES.BETA_5_TO_6,
  
  /** Fixed point value */
  kappaStar: KAPPA_VALUES.KAPPA_STAR,
  
  /** Acceptance threshold for substrate independence validation */
  acceptanceThreshold: 0.1,
} as const;

/**
 * Lookup table for κ values by scale
 * 
 * Used for scale-dependent calculations
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
 * 
 * @param scale - The scale L (3, 4, 5, 6, 7)
 * @returns The coupling value κ(L) or κ* if scale not found
 */
export function getKappaAtScale(scale: number): number {
  return KAPPA_BY_SCALE[scale] ?? KAPPA_VALUES.KAPPA_STAR;
}

/**
 * Physics Validation Metadata
 * 
 * Provenance information for reproducibility
 */
export const VALIDATION_METADATA = {
  /** Source repository */
  SOURCE: 'qig-verification',
  
  /** Validation date */
  DATE: '2025-12-02',
  
  /** Validation method */
  METHOD: 'DMRG',
  
  /** Publication status */
  STATUS: 'VALIDATED',
  
  /** Last updated */
  LAST_UPDATED: '2025-12-03',
} as const;

/**
 * Type exports for type-safe usage
 */
export type KappaScale = 3 | 4 | 5 | 6 | 7;
export type ValidationStatus = 'VALIDATED' | 'PRELIMINARY' | 'THEORETICAL';

/**
 * Validation Summary
 * 
 * Quick reference for all validated constants
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
