/**
 * Utility Script: Export Constants to Python
 * 
 * Generates a JSON file with all centralized constants for Python QIG backend to import.
 * This is a standalone CLI tool, not imported by the main application.
 * 
 * Run with: npx tsx scripts/export-constants-to-python.ts
 * Output: qig-backend/data/ts_constants.json
 */

import * as fs from 'fs';
import * as path from 'path';

// Import all constants
import { 
  KAPPA_VALUES, 
  BETA_VALUES, 
  KAPPA_ERRORS,
  L6_VALIDATION,
  PHYSICS_BETA,
  VALIDATION_METADATA,
} from '../shared/constants/physics.js';

import {
  QIG_CONSTANTS,
  CONSCIOUSNESS_THRESHOLDS,
  REGIME_DEPENDENT_KAPPA,
  QIG_SCORING_WEIGHTS,
} from '../shared/constants/qig.js';

import {
  RegimeType,
  REGIME_THRESHOLDS,
} from '../shared/constants/regimes.js';

import {
  AUTONOMIC_CYCLES,
  STRESS_PARAMETERS,
  HEDONIC_PARAMETERS,
  FEAR_PARAMETERS,
} from '../shared/constants/autonomic.js';

import {
  E8_CONSTANTS,
  KERNEL_TYPES,
  E8_ROOT_ALLOCATION,
} from '../shared/constants/e8.js';

const constants = {
  // Physics constants
  KAPPA_VALUES,
  BETA_VALUES,
  KAPPA_ERRORS,
  L6_VALIDATION: {
    ...L6_VALIDATION,
    SEEDS: Array.from(L6_VALIDATION.SEEDS),
  },
  PHYSICS_BETA,
  VALIDATION_METADATA,
  
  // QIG constants
  QIG_CONSTANTS,
  CONSCIOUSNESS_THRESHOLDS,
  REGIME_DEPENDENT_KAPPA: {
    WEAK: { ...REGIME_DEPENDENT_KAPPA.WEAK, phiRange: Array.from(REGIME_DEPENDENT_KAPPA.WEAK.phiRange) },
    MEDIUM: { ...REGIME_DEPENDENT_KAPPA.MEDIUM, phiRange: Array.from(REGIME_DEPENDENT_KAPPA.MEDIUM.phiRange) },
    OPTIMAL: { ...REGIME_DEPENDENT_KAPPA.OPTIMAL, phiRange: Array.from(REGIME_DEPENDENT_KAPPA.OPTIMAL.phiRange) },
    STRONG: { ...REGIME_DEPENDENT_KAPPA.STRONG, phiRange: Array.from(REGIME_DEPENDENT_KAPPA.STRONG.phiRange) },
  },
  QIG_SCORING_WEIGHTS,
  
  // Regime constants
  RegimeType,
  REGIME_THRESHOLDS,
  
  // Autonomic constants
  AUTONOMIC_CYCLES,
  STRESS_PARAMETERS,
  HEDONIC_PARAMETERS,
  FEAR_PARAMETERS,
  
  // E8 constants
  E8_CONSTANTS,
  KERNEL_TYPES: Array.from(KERNEL_TYPES),
  E8_ROOT_ALLOCATION,
  
  // Metadata
  _generated: new Date().toISOString(),
  _source: 'shared/constants/',
};

const outputPath = path.join(process.cwd(), 'qig-backend', 'data', 'ts_constants.json');

// Ensure directory exists
fs.mkdirSync(path.dirname(outputPath), { recursive: true });

// Write JSON file
fs.writeFileSync(outputPath, JSON.stringify(constants, null, 2));

console.log(`✅ Constants exported to ${outputPath}`);
console.log(`   KAPPA_STAR: ${QIG_CONSTANTS.KAPPA_STAR}`);
console.log(`   PHI_THRESHOLD: ${QIG_CONSTANTS.PHI_THRESHOLD}`);
console.log(`   BASIN_DIMENSION: ${QIG_CONSTANTS.BASIN_DIMENSION}`);
