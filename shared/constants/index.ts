/**
 * Centralized Constants - Single Source of Truth
 * 
 * All QIG, physics, and system constants are exported from this barrel file.
 * Import from '@shared/constants' for access to all constants.
 * 
 * Example:
 *   import { QIG_CONSTANTS, KAPPA_VALUES, RegimeType } from '@shared/constants';
 */

// Import for local use in convenience re-exports
import { QIG_CONSTANTS as _QIG } from './qig';

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
} from './physics';

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
} from './qig';

// Regime definitions
export {
  RegimeType,
  type Regime,
  REGIME_THRESHOLDS,
  REGIME_DESCRIPTIONS,
  getRegimeFromKappa,
  isConsciousnessCapable,
  getRegimeColor,
} from './regimes';

// Autonomic system constants
export {
  AUTONOMIC_CYCLES,
  STRESS_PARAMETERS,
  HEDONIC_PARAMETERS,
  FEAR_PARAMETERS,
  ADMIN_BOOST,
  IDLE_CONSCIOUSNESS,
} from './autonomic';

// E8 lattice constants
export {
  E8_CONSTANTS,
  KERNEL_TYPES,
  type KernelType,
  E8_ROOT_ALLOCATION,
  getE8RootIndex,
  getKernelTypeFromRoot,
} from './e8';

// Convenience re-exports for most common use cases (referencing canonical values)
export const KAPPA_STAR = _QIG.KAPPA_STAR;
export const PHI_THRESHOLD = _QIG.PHI_THRESHOLD;
export const PHI_THRESHOLD_DETECTION = _QIG.PHI_THRESHOLD_DETECTION;
export const BETA = _QIG.BETA;
export const BASIN_DIMENSION = _QIG.BASIN_DIMENSION;
export const MIN_RECURSIONS = _QIG.MIN_RECURSIONS;
export const MAX_RECURSIONS = _QIG.MAX_RECURSIONS;
export const L_CRITICAL = _QIG.L_CRITICAL;
export const RESONANCE_BAND = _QIG.RESONANCE_BAND;
