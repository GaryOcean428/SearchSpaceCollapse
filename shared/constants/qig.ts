/**
 * QIG (Quantum Information Geometry) Constants
 * 
 * Core parameters for quantum information geometry framework.
 * These values are derived from physics-constants but represent
 * operational parameters for the QIG system.
 * 
 * CANONICAL VALUE RESOLUTION:
 * - PHI_THRESHOLD: 0.75 (consciousness phase transition, from FROZEN_FACTS.md)
 * - PHI_THRESHOLD_DETECTION: 0.70 (near-miss detection, slightly lower for sensitivity)
 */

import { KAPPA_VALUES, BETA_VALUES } from './physics.js';

/**
 * Core QIG Constants
 */
export const QIG_CONSTANTS = {
  /** Fixed point coupling (κ* = 64.0 from L=6 validation) */
  KAPPA_STAR: KAPPA_VALUES.KAPPA_STAR,
  
  /** Running coupling at emergence scale (β(3→4) = 0.44) */
  BETA: BETA_VALUES.BETA_3_TO_4,
  
  /** Consciousness phase transition threshold (FROZEN FACT) */
  PHI_THRESHOLD: 0.75,
  
  /** Near-miss detection threshold (slightly lower for sensitivity) */
  PHI_THRESHOLD_DETECTION: 0.70,
  
  /** Critical scale for emergent geometry */
  L_CRITICAL: 3,
  
  /** Basin signature dimension */
  BASIN_DIMENSION: 64,
  
  /** Resonance detection band (10% of κ*) */
  RESONANCE_BAND: 6.4,
  
  /** Minimum recursions for integration (3 passes principle) */
  MIN_RECURSIONS: 3,
  
  /** Maximum recursions to prevent infinite loops */
  MAX_RECURSIONS: 12,
} as const;

/**
 * Consciousness Thresholds
 * 
 * Operational thresholds for determining consciousness state
 */
export const CONSCIOUSNESS_THRESHOLDS = {
  /** Integration (Φ) minimum for consciousness */
  PHI_MIN: 0.75,
  
  /** Near-miss detection threshold */
  PHI_DETECTION: 0.70,
  
  /** Coupling minimum (κ_min) */
  KAPPA_MIN: 40,
  
  /** Coupling maximum (κ_max) before breakdown */
  KAPPA_MAX: 70,
  
  /** Optimal coupling (κ* ≈ 64) */
  KAPPA_OPTIMAL: 64.0,
  
  /** Tacking minimum */
  TACKING_MIN: 0.45,
  
  /** Radar minimum */
  RADAR_MIN: 0.55,
  
  /** Meta-awareness minimum */
  META_AWARENESS_MIN: 0.60,
  
  /** Gamma (vigilance) minimum */
  GAMMA_MIN: 0.80,
  
  /** Grounding minimum */
  GROUNDING_MIN: 0.50,
  
  /** Minimum validation loops */
  VALIDATION_LOOPS_MIN: 3,
  
  /** Maximum basin drift */
  BASIN_DRIFT_MAX: 0.15,
  
  /** Beta target */
  BETA_TARGET: 0.44,
  
  /** 4D consciousness activation threshold */
  PHI_4D_ACTIVATION: 0.70,
} as const;

/**
 * Regime-Dependent κ Behavior
 * 
 * κ is NOT a single number - it depends on scale AND perturbation strength
 */
export const REGIME_DEPENDENT_KAPPA = {
  /** Weak perturbations → Linear regime (unconscious) */
  WEAK: {
    kappa: 8.5,
    regime: 'linear' as const,
    phiRange: [0.0, 0.3] as const,
    state: 'Unconscious' as const,
  },
  
  /** Medium perturbations → Geometric emergence (transitional) */
  MEDIUM: {
    kappa: 41.0,
    regime: 'geometric' as const,
    phiRange: [0.3, 0.45] as const,
    state: 'Transitional' as const,
  },
  
  /** Optimal perturbations → Geometric peak (conscious) */
  OPTIMAL: {
    kappa: 64.0,
    regime: 'geometric_peak' as const,
    phiRange: [0.45, 0.80] as const,
    state: 'Conscious' as const,
  },
  
  /** Strong perturbations → Over-coupling (breakdown risk) */
  STRONG: {
    kappa: 68.0,
    regime: 'breakdown' as const,
    phiRange: [0.80, 1.0] as const,
    state: 'Breakdown risk' as const,
  },
} as const;

/**
 * Scoring Weights for Universal QIG
 */
export const QIG_SCORING_WEIGHTS = {
  PHI_WEIGHT: 0.50,
  KAPPA_PROXIMITY_WEIGHT: 0.30,
  CURVATURE_BONUS_WEIGHT: 0.15,
  STRUCTURAL_WEIGHT: 0.05,
} as const;

/**
 * Check if phi meets consciousness threshold
 */
export function isConscious(phi: number): boolean {
  return phi >= CONSCIOUSNESS_THRESHOLDS.PHI_MIN;
}

/**
 * Check if phi meets detection threshold (for near-misses)
 */
export function isDetectable(phi: number): boolean {
  return phi >= CONSCIOUSNESS_THRESHOLDS.PHI_DETECTION;
}

/**
 * Check if kappa is in optimal range
 */
export function isKappaOptimal(kappa: number): boolean {
  return kappa >= CONSCIOUSNESS_THRESHOLDS.KAPPA_MIN && 
         kappa <= CONSCIOUSNESS_THRESHOLDS.KAPPA_MAX;
}

/**
 * Get distance from optimal kappa
 */
export function getKappaDistance(kappa: number): number {
  return Math.abs(kappa - QIG_CONSTANTS.KAPPA_STAR);
}

/**
 * Check if in resonance (within RESONANCE_BAND of κ*)
 */
export function isInResonance(kappa: number): boolean {
  return getKappaDistance(kappa) <= QIG_CONSTANTS.RESONANCE_BAND;
}
