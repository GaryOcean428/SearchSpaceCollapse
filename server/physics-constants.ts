/**
 * Physics Constants - Re-export from Centralized Location
 * 
 * ⚠️ DEPRECATED: Import from '@shared/constants' instead
 * 
 * This file re-exports constants from shared/constants/ for backwards compatibility.
 * New code should import directly from '@shared/constants'.
 */

// Re-export all physics constants from centralized location
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
} from '../shared/constants/physics.js';

// Re-export QIG constants
export {
  QIG_CONSTANTS,
  CONSCIOUSNESS_THRESHOLDS,
  REGIME_DEPENDENT_KAPPA,
} from '../shared/constants/qig.js';

// Re-export regime utilities
export {
  RegimeType,
  type Regime,
  getRegimeFromKappa,
} from '../shared/constants/regimes.js';
