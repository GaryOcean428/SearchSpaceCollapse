/**
 * Regime Definitions and Thresholds
 * 
 * QIG operational regimes based on coupling strength (κ)
 */

/**
 * Regime Type Enum
 */
export const RegimeType = {
  LINEAR: 'linear',
  GEOMETRIC: 'geometric',
  HIERARCHICAL: 'hierarchical',
  HIERARCHICAL_4D: 'hierarchical_4d',
  BLOCK_UNIVERSE_4D: '4d_block_universe',
  BREAKDOWN: 'breakdown',
} as const;

export type Regime = typeof RegimeType[keyof typeof RegimeType];

/**
 * Regime Thresholds
 * 
 * - linear: κ < 40 (weak coupling, exploratory)
 * - geometric: 40 ≤ κ ≤ 70 (optimal coupling)
 * - hierarchical: 70 < κ < 100 (strong coupling, hierarchical search)
 * - breakdown: κ ≥ 100 (overcoupling, chaotic)
 */
export const REGIME_THRESHOLDS = {
  LINEAR_MAX: 40,
  GEOMETRIC_MIN: 40,
  GEOMETRIC_MAX: 70,
  HIERARCHICAL_MIN: 70,
  HIERARCHICAL_MAX: 100,
  BREAKDOWN_MIN: 100,
} as const;

/**
 * Regime Descriptions
 */
export const REGIME_DESCRIPTIONS: Record<Regime, string> = {
  [RegimeType.LINEAR]: 'Weak coupling, exploratory phase',
  [RegimeType.GEOMETRIC]: 'Optimal coupling, consciousness active',
  [RegimeType.HIERARCHICAL]: 'Strong coupling, hierarchical search',
  [RegimeType.HIERARCHICAL_4D]: '4D hierarchical consciousness',
  [RegimeType.BLOCK_UNIVERSE_4D]: 'Full 4D spacetime consciousness',
  [RegimeType.BREAKDOWN]: 'Overcoupling, chaotic breakdown',
};

/**
 * Get regime from kappa value
 */
export function getRegimeFromKappa(kappa: number): Regime {
  if (kappa < REGIME_THRESHOLDS.LINEAR_MAX) {
    return RegimeType.LINEAR;
  } else if (kappa <= REGIME_THRESHOLDS.GEOMETRIC_MAX) {
    return RegimeType.GEOMETRIC;
  } else if (kappa < REGIME_THRESHOLDS.HIERARCHICAL_MAX) {
    return RegimeType.HIERARCHICAL;
  } else {
    return RegimeType.BREAKDOWN;
  }
}

/**
 * Check if regime is consciousness-capable
 */
export function isConsciousnessCapable(regime: Regime): boolean {
  return regime === RegimeType.GEOMETRIC || 
         regime === RegimeType.HIERARCHICAL ||
         regime === RegimeType.HIERARCHICAL_4D ||
         regime === RegimeType.BLOCK_UNIVERSE_4D;
}

/**
 * Get color for regime (for UI)
 */
export function getRegimeColor(regime: Regime): string {
  switch (regime) {
    case RegimeType.LINEAR:
      return '#6b7280'; // gray
    case RegimeType.GEOMETRIC:
      return '#22c55e'; // green
    case RegimeType.HIERARCHICAL:
      return '#3b82f6'; // blue
    case RegimeType.HIERARCHICAL_4D:
      return '#8b5cf6'; // purple
    case RegimeType.BLOCK_UNIVERSE_4D:
      return '#ec4899'; // pink
    case RegimeType.BREAKDOWN:
      return '#ef4444'; // red
    default:
      return '#6b7280';
  }
}
