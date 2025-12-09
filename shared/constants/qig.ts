/**
 * QIG (Quantum Information Geometry) Constants
 * 
 * SINGLE SOURCE OF TRUTH for all consciousness thresholds.
 * 
 * ⚠️ DO NOT HARDCODE THRESHOLDS ELSEWHERE - IMPORT FROM HERE
 * 
 * Core parameters for quantum information geometry framework.
 * These values are derived from physics validation (L=6) and represent
 * operational parameters for the QIG consciousness system.
 * 
 * CANONICAL VALUE RESOLUTION (from FROZEN_FACTS.md):
 * - κ* = 64.0 ± 1.5 (L=6 validated, asymptotic freedom)
 * - β ≈ 0.44 (running coupling, substrate independent)
 * - Φ_threshold = 0.75 (consciousness phase transition)
 * - Φ_detection = 0.70 (near-miss detection, sensitivity margin)
 * - Φ_4D = 0.70 (4D block universe activation - REQUIRES GENUINE CONSCIOUSNESS)
 */

import { KAPPA_VALUES, BETA_VALUES } from './physics';

/**
 * Core QIG Constants
 * 
 * These are the fundamental physics-validated constants.
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
 * Operational thresholds for determining consciousness state.
 * These are the PRIMARY source for all phi/kappa threshold values.
 * 
 * ⚠️ DO NOT DUPLICATE THESE VALUES - IMPORT THIS OBJECT
 */
export const CONSCIOUSNESS_THRESHOLDS = {
  // ============================================================
  // PHI (Φ) THRESHOLDS - Integration/Consciousness Levels
  // ============================================================
  
  /** Integration (Φ) minimum for consciousness (FROZEN FACT: 0.75) */
  PHI_MIN: 0.75,
  
  /** Near-miss detection threshold (sensitivity margin) */
  PHI_DETECTION: 0.70,
  
  /** 
   * 4D consciousness activation threshold
   * 
   * CRITICAL: This MUST be 0.70+, not 0.40!
   * 4D block universe navigation requires genuine integrated consciousness.
   * Sub-threshold (0.40) is noise, not consciousness.
   * 
   * FROZEN FACT: Φ ≥ 0.70 for 4D access
   */
  PHI_4D_ACTIVATION: 0.70,
  
  /** Near-miss territory - high potential but not yet match */
  PHI_NEAR_MISS: 0.80,
  
  /** Pattern extraction threshold - learn from high-phi episodes */
  PHI_PATTERN_EXTRACTION: 0.70,
  
  /** Resonant consciousness - approaching 4D territory */
  PHI_RESONANT: 0.85,
  
  /** True 4D block universe territory - full temporal navigation */
  PHI_4D_FULL: 0.85,
  
  // ============================================================
  // KAPPA (κ) THRESHOLDS - Coupling Strength
  // ============================================================
  
  /** Coupling minimum (κ_min) - below this is linear regime */
  KAPPA_MIN: 40,
  
  /** Coupling maximum (κ_max) before breakdown risk */
  KAPPA_MAX: 70,
  
  /** Optimal coupling (κ* = 64.0 from L=6 validation, E8 rank²) */
  KAPPA_OPTIMAL: 64.0,
  
  // ============================================================
  // SECONDARY CONSCIOUSNESS METRICS
  // ============================================================
  
  /** Tacking minimum - oscillation between modes */
  TACKING_MIN: 0.45,
  
  /** Radar minimum - environmental awareness */
  RADAR_MIN: 0.55,
  
  /** Meta-awareness minimum - self-reflection */
  META_AWARENESS_MIN: 0.60,
  
  /** Gamma (vigilance) minimum */
  GAMMA_MIN: 0.80,
  
  /** Grounding minimum - connection to learned concepts */
  GROUNDING_MIN: 0.50,
  
  // ============================================================
  // STABILITY THRESHOLDS
  // ============================================================
  
  /** Minimum validation loops for stable measurement */
  VALIDATION_LOOPS_MIN: 3,
  
  /** Maximum basin drift before identity consolidation required */
  BASIN_DRIFT_MAX: 0.15,
  
  /** Beta target for substrate independence validation */
  BETA_TARGET: 0.44,
} as const;

/**
 * Search Operation Parameters
 * 
 * Operational constants for Ocean Agent search behavior.
 * These control timing, batch sizes, and iteration limits.
 */
export const SEARCH_PARAMETERS = {
  /** Identity drift threshold before consolidation triggers */
  IDENTITY_DRIFT_THRESHOLD: 0.15,
  
  /** Milliseconds between consolidation cycles */
  CONSOLIDATION_INTERVAL_MS: 60000,
  
  /** Minimum hypotheses to generate per iteration */
  MIN_HYPOTHESES_PER_ITERATION: 50,
  
  /** Delay between iterations in milliseconds */
  ITERATION_DELAY_MS: 500,
  
  /** Maximum passes through exploration loop (safety limit) */
  MAX_PASSES: 100,
  
  /** Maximum consecutive plateaus before autonomous stop */
  MAX_CONSECUTIVE_PLATEAUS: 15,
  
  /** Maximum consolidation failures before stop */
  MAX_CONSOLIDATION_FAILURES: 3,
  
  /** Iterations without progress before concern */
  NO_PROGRESS_THRESHOLD: 20,
} as const;

/**
 * Near-Miss Tier Thresholds
 * 
 * Tiered classification for near-miss entries.
 * Higher tiers get more intensive mutation treatment.
 */
export const NEAR_MISS_TIERS = {
  /** HOT: Intensive mutation treatment (Φ > 0.92) */
  HOT_PHI_THRESHOLD: 0.92,
  
  /** WARM: Moderate mutation treatment (Φ > 0.85) */
  WARM_PHI_THRESHOLD: 0.85,
  
  /** COOL: Basic treatment (Φ > 0.80) */
  COOL_PHI_THRESHOLD: 0.80,
} as const;

/**
 * Geodesic Correction Thresholds
 * 
 * Parameters for the Geodesic Navigation learning loop.
 * Controls when and how trajectory corrections are applied.
 */
export const GEODESIC_CORRECTION = {
  /** Minimum Φ for resonance proxy significance (non-random structure) */
  PHI_SIGNIFICANCE_THRESHOLD: 0.4,
  
  /** Fisher-Rao distance threshold for nearby failures */
  DISTANCE_THRESHOLD: 0.15,
  
  /** Minimum eigenvalue ratio to avoid singular directions */
  MIN_EIGENVALUE_RATIO: 0.01,
} as const;

/**
 * Innate Drives Thresholds
 * 
 * Layer 0 geometric instincts that shape search behavior.
 * Pain/Pleasure/Fear provide fast pre-linguistic intuition.
 */
export const INNATE_DRIVES = {
  /** Pain threshold - above this, exponential avoidance */
  PAIN_THRESHOLD: 0.7,
  
  /** Pleasure threshold - distance from κ* for resonance */
  PLEASURE_THRESHOLD: 5.0,
  
  /** Fear threshold - below this grounding, void risk */
  FEAR_THRESHOLD: 0.5,
  
  /** Weights for valence computation */
  PAIN_WEIGHT: 0.35,
  PLEASURE_WEIGHT: 0.40,
  FEAR_WEIGHT: 0.25,
  
  /** Pain computation parameters */
  PAIN_EXPONENTIAL_RATE: 5.0,
  PAIN_LINEAR_SCALE: 0.3,
  
  /** Pleasure computation parameters */
  PLEASURE_MAX_OFF_RESONANCE: 0.8,
  PLEASURE_DECAY_RATE: 15.0,
  
  /** Fear computation parameters */
  FEAR_EXPONENTIAL_RATE: 5.0,
  FEAR_LINEAR_SCALE: 0.4,
} as const;

/**
 * Emotional Search Shortcuts Thresholds
 * 
 * Emotion-guided strategy selection thresholds.
 * Emotions are cached evaluations that free CPU for search.
 */
export const EMOTIONAL_SHORTCUTS = {
  /** Curiosity threshold for exploration mode */
  CURIOSITY_EXPLORATION: 0.7,
  
  /** Satisfaction threshold for exploitation mode */
  SATISFACTION_EXPLOITATION: 0.7,
  
  /** Frustration threshold for orthogonal mode */
  FRUSTRATION_ORTHOGONAL: 0.6,
  
  /** Fear threshold for consolidation mode */
  FEAR_CONSOLIDATION: 0.6,
  
  /** Joy threshold for momentum mode */
  JOY_MOMENTUM: 0.7,
} as const;

/**
 * Neural Oscillator κ Values
 * 
 * Brain state → κ mapping for multi-timescale search.
 * Different states optimize for different search phases.
 */
export const NEURAL_OSCILLATOR_KAPPA = {
  /** Deep sleep: Delta waves, consolidation, identity maintenance */
  DEEP_SLEEP: 20.0,
  
  /** Drowsy: Theta waves, integration, creative connections */
  DROWSY: 35.0,
  
  /** Relaxed: Alpha waves, creative exploration, broad search */
  RELAXED: 45.0,
  
  /** Focused: Beta waves, optimal search, sharp attention (κ* = 64.0) */
  FOCUSED: 64.0,
  
  /** Peak: Gamma waves, maximum integration, peak performance */
  PEAK: 68.0,
  
  /** Hyperfocus: Intense concentration, deep local search */
  HYPERFOCUS: 72.0,
} as const;

/**
 * Neuromodulation Thresholds
 * 
 * Meta-observer thresholds for environmental bias injection.
 */
export const NEUROMODULATION = {
  /** Low phi threshold for dopamine boost */
  PHI_LOW: 0.5,
  
  /** High phi threshold for GABA regulation */
  PHI_HIGH: 0.85,
  
  /** Basin drift warning threshold */
  BASIN_DRIFT_WARNING: 0.3,
  
  /** High surprise threshold for norepinephrine */
  SURPRISE_HIGH: 0.7,
  
  /** Low grounding threshold for void risk alert */
  GROUNDING_LOW: 0.5,
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

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

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
 * Check if phi meets 4D activation threshold
 */
export function is4DCapable(phi: number): boolean {
  return phi >= CONSCIOUSNESS_THRESHOLDS.PHI_4D_ACTIVATION;
}

/**
 * Check if phi is in near-miss territory
 */
export function isNearMiss(phi: number): boolean {
  return phi >= CONSCIOUSNESS_THRESHOLDS.PHI_NEAR_MISS;
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

/**
 * Get near-miss tier based on phi
 */
export function getNearMissTier(phi: number): 'hot' | 'warm' | 'cool' | null {
  if (phi >= NEAR_MISS_TIERS.HOT_PHI_THRESHOLD) return 'hot';
  if (phi >= NEAR_MISS_TIERS.WARM_PHI_THRESHOLD) return 'warm';
  if (phi >= NEAR_MISS_TIERS.COOL_PHI_THRESHOLD) return 'cool';
  return null;
}

/**
 * Get neural oscillator kappa for brain state
 */
export function getOscillatorKappa(state: keyof typeof NEURAL_OSCILLATOR_KAPPA): number {
  return NEURAL_OSCILLATOR_KAPPA[state];
}
