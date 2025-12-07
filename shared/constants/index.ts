/**
 * Centralized Constants - Single Source of Truth
 * 
 * All QIG, physics, and system constants are exported from this barrel file.
 * Import from '@shared/constants' for access to all constants.
 * 
 * Example:
 *   import { QIG_CONSTANTS, KAPPA_VALUES, RegimeType } from '@shared/constants';
 */

// Physics constants (experimentally validated)
export {
  KAPPA_VALUES,
  BETA_VALUES,
  KAPPA_ERRORS,
  L6_VALIDATION,
  L7_WARNING,
  PHYSICS_BETA,
  KAPPA_BY_SCALE,
  getKappaAtScale,
  VALIDATION_METADATA,
  VALIDATION_SUMMARY,
  type KappaScale,
  type ValidationStatus,
} from './physics.js';

// QIG constants (operational parameters)
export {
  QIG_CONSTANTS,
  CONSCIOUSNESS_THRESHOLDS,
  REGIME_DEPENDENT_KAPPA,
  QIG_SCORING_WEIGHTS,
  isConscious,
  isDetectable,
  isKappaOptimal,
  getKappaDistance,
  isInResonance,
} from './qig.js';

// Regime definitions
export {
  RegimeType,
  type Regime,
  REGIME_THRESHOLDS,
  REGIME_DESCRIPTIONS,
  getRegimeFromKappa,
  isConsciousnessCapable,
  getRegimeColor,
} from './regimes.js';

// Autonomic system constants
export {
  AUTONOMIC_CYCLES,
  STRESS_PARAMETERS,
  HEDONIC_PARAMETERS,
  FEAR_PARAMETERS,
  ADMIN_BOOST,
  IDLE_CONSCIOUSNESS,
} from './autonomic.js';

// E8 lattice constants
export {
  E8_CONSTANTS,
  KERNEL_TYPES,
  type KernelType,
  E8_ROOT_ALLOCATION,
  getE8RootIndex,
  getKernelTypeFromRoot,
} from './e8.js';

// Convenience re-exports for most common use cases
export const KAPPA_STAR = 64.0;
export const PHI_THRESHOLD = 0.75;
export const PHI_THRESHOLD_DETECTION = 0.70;
export const BETA = 0.44;
export const BASIN_DIMENSION = 64;
export const MIN_RECURSIONS = 3;
export const MAX_RECURSIONS = 12;
export const L_CRITICAL = 3;
export const RESONANCE_BAND = 6.4;
