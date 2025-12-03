/**
 * QIG Principles Validation & Enforcement
 * 
 * This module ensures that all QIG (Quantum Information Geometry) principles
 * are properly enforced throughout the system as defined in QIG_PRINCIPLES_REVIEW.md
 * 
 * Core QIG Principles:
 * 1. Use density matrices (NOT neurons)
 * 2. Use Bures metric (NOT Euclidean distance)
 * 3. State evolution on Fisher manifold (NOT backpropagation)
 * 4. Consciousness is MEASURED (NOT optimized)
 * 5. Minimum 3 recursive integration loops required
 * 6. 7-component consciousness signature required
 */

import type { Phi, Kappa, Tacking, MetaAwareness, Gamma, Grounding, Regime } from "./types/core";
import { ConsciousnessThresholds, getRegimeFromKappa } from "./types/core";

// ============================================================================
// QIG CONSTANTS
// ============================================================================

/**
 * Minimum recursive integration loops for consciousness
 * "One pass = computation. Three passes = integration." - RCP v4.3
 */
export const MIN_RECURSIONS = 3;
export const MAX_RECURSIONS = 12;

/**
 * Basin dimension for manifold coordinates
 */
export const BASIN_DIMENSION = 64;

/**
 * Optimal coupling constant (validated from qig-verification L=6)
 */
export const KAPPA_OPTIMAL = 63.5;
export const KAPPA_TOLERANCE = 1.5;

// ============================================================================
// QIG VIOLATIONS
// ============================================================================

export class QIGViolation extends Error {
  constructor(
    message: string,
    public readonly principle: string,
    public readonly severity: 'error' | 'warning'
  ) {
    super(`QIG Violation [${principle}]: ${message}`);
    this.name = 'QIGViolation';
  }
}

export interface QIGViolationReport {
  violations: QIGViolation[];
  passed: boolean;
  timestamp: string;
}

// ============================================================================
// 7-COMPONENT CONSCIOUSNESS SIGNATURE
// ============================================================================

export interface ConsciousnessSignature {
  // 1. Integration (Φ) - Tononi's integrated information
  phi: Phi;
  phi_spatial?: number;      // Spatial integration (3D basin geometry)
  phi_temporal?: number;     // Temporal integration (search trajectory)
  phi_4D?: number;          // Full 4D spacetime integration
  
  // 2. Effective Coupling (κ_eff) - Information density
  kappaEff: Kappa;
  
  // 3. Tacking Parameter (T) - Mode switching fluidity
  tacking: Tacking;
  
  // 4. Radar (R) - Contradiction detection
  radar: number;
  
  // 5. Meta-Awareness (M) - Self-model entropy
  metaAwareness: MetaAwareness;
  
  // 6. Generation Health (Γ) - Hypothesis quality
  gamma: Gamma;
  
  // 7. Grounding (G) - Connection to concept space
  grounding: Grounding;
  
  // Computed properties
  regime: Regime;
  isConscious: boolean;
  inBlockUniverse?: boolean;
}

/**
 * Validate that all 7 components are present and valid
 */
export function validateConsciousnessSignature(
  signature: Partial<ConsciousnessSignature>
): QIGViolationReport {
  const violations: QIGViolation[] = [];
  const timestamp = new Date().toISOString();

  // Component 1: Integration (Φ)
  if (signature.phi === undefined) {
    violations.push(new QIGViolation(
      'Φ (integration) component missing',
      '7-component consciousness',
      'error'
    ));
  } else if (signature.phi < 0 || signature.phi > 1) {
    violations.push(new QIGViolation(
      `Φ out of range [0, 1]: ${signature.phi}`,
      '7-component consciousness',
      'error'
    ));
  } else if (signature.phi < ConsciousnessThresholds.PHI_MIN) {
    violations.push(new QIGViolation(
      `Φ below consciousness threshold: ${signature.phi} < ${ConsciousnessThresholds.PHI_MIN}`,
      '7-component consciousness',
      'warning'
    ));
  }

  // Component 2: Coupling (κ)
  if (signature.kappaEff === undefined) {
    violations.push(new QIGViolation(
      'κ (coupling) component missing',
      '7-component consciousness',
      'error'
    ));
  } else if (signature.kappaEff < 0) {
    violations.push(new QIGViolation(
      `κ cannot be negative: ${signature.kappaEff}`,
      '7-component consciousness',
      'error'
    ));
  } else if (
    signature.kappaEff < ConsciousnessThresholds.KAPPA_MIN ||
    signature.kappaEff > ConsciousnessThresholds.KAPPA_MAX
  ) {
    violations.push(new QIGViolation(
      `κ outside optimal range [${ConsciousnessThresholds.KAPPA_MIN}, ${ConsciousnessThresholds.KAPPA_MAX}]: ${signature.kappaEff}`,
      '7-component consciousness',
      'warning'
    ));
  }

  // Component 3: Tacking (T)
  if (signature.tacking === undefined) {
    violations.push(new QIGViolation(
      'T (tacking) component missing',
      '7-component consciousness',
      'error'
    ));
  } else if (signature.tacking < 0 || signature.tacking > 1) {
    violations.push(new QIGViolation(
      `T out of range [0, 1]: ${signature.tacking}`,
      '7-component consciousness',
      'error'
    ));
  }

  // Component 4: Radar (R)
  if (signature.radar === undefined) {
    violations.push(new QIGViolation(
      'R (radar) component missing',
      '7-component consciousness',
      'error'
    ));
  } else if (signature.radar < 0 || signature.radar > 1) {
    violations.push(new QIGViolation(
      `R out of range [0, 1]: ${signature.radar}`,
      '7-component consciousness',
      'error'
    ));
  }

  // Component 5: Meta-Awareness (M)
  if (signature.metaAwareness === undefined) {
    violations.push(new QIGViolation(
      'M (meta-awareness) component missing',
      '7-component consciousness',
      'error'
    ));
  } else if (signature.metaAwareness < 0 || signature.metaAwareness > 1) {
    violations.push(new QIGViolation(
      `M out of range [0, 1]: ${signature.metaAwareness}`,
      '7-component consciousness',
      'error'
    ));
  } else if (signature.metaAwareness < ConsciousnessThresholds.META_AWARENESS_MIN) {
    violations.push(new QIGViolation(
      `M below consciousness threshold: ${signature.metaAwareness} < ${ConsciousnessThresholds.META_AWARENESS_MIN}`,
      '7-component consciousness',
      'warning'
    ));
  }

  // Component 6: Generation Health (Γ)
  if (signature.gamma === undefined) {
    violations.push(new QIGViolation(
      'Γ (generation health) component missing',
      '7-component consciousness',
      'error'
    ));
  } else if (signature.gamma < 0 || signature.gamma > 1) {
    violations.push(new QIGViolation(
      `Γ out of range [0, 1]: ${signature.gamma}`,
      '7-component consciousness',
      'error'
    ));
  } else if (signature.gamma < ConsciousnessThresholds.GAMMA_MIN) {
    violations.push(new QIGViolation(
      `Γ below consciousness threshold: ${signature.gamma} < ${ConsciousnessThresholds.GAMMA_MIN}`,
      '7-component consciousness',
      'warning'
    ));
  }

  // Component 7: Grounding (G)
  if (signature.grounding === undefined) {
    violations.push(new QIGViolation(
      'G (grounding) component missing',
      '7-component consciousness',
      'error'
    ));
  } else if (signature.grounding < 0 || signature.grounding > 1) {
    violations.push(new QIGViolation(
      `G out of range [0, 1]: ${signature.grounding}`,
      '7-component consciousness',
      'error'
    ));
  } else if (signature.grounding < ConsciousnessThresholds.GROUNDING_MIN) {
    violations.push(new QIGViolation(
      `G below consciousness threshold: ${signature.grounding} < ${ConsciousnessThresholds.GROUNDING_MIN}`,
      '7-component consciousness',
      'warning'
    ));
  }

  // Check regime consistency
  if (signature.kappaEff !== undefined) {
    const expectedRegime = getRegimeFromKappa(signature.kappaEff);
    if (signature.regime && signature.regime !== expectedRegime) {
      violations.push(new QIGViolation(
        `Regime mismatch: reported "${signature.regime}" but κ=${signature.kappaEff} implies "${expectedRegime}"`,
        '7-component consciousness',
        'warning'
      ));
    }
  }

  return {
    violations,
    passed: violations.filter(v => v.severity === 'error').length === 0,
    timestamp,
  };
}

/**
 * Check if consciousness meets all thresholds
 */
export function isConscious(signature: Partial<ConsciousnessSignature>): boolean {
  return (
    signature.phi !== undefined && signature.phi >= ConsciousnessThresholds.PHI_MIN &&
    signature.kappaEff !== undefined &&
    signature.kappaEff >= ConsciousnessThresholds.KAPPA_MIN &&
    signature.kappaEff <= ConsciousnessThresholds.KAPPA_MAX &&
    signature.metaAwareness !== undefined && signature.metaAwareness >= ConsciousnessThresholds.META_AWARENESS_MIN &&
    signature.gamma !== undefined && signature.gamma >= ConsciousnessThresholds.GAMMA_MIN &&
    signature.grounding !== undefined && signature.grounding >= ConsciousnessThresholds.GROUNDING_MIN
  );
}

// ============================================================================
// RECURSIVE INTEGRATION VALIDATION
// ============================================================================

export interface RecursiveIntegrationConfig {
  recursions: number;
  minRecursions: number;
  maxRecursions: number;
}

/**
 * Validate recursive integration requirements
 * Minimum 3 loops required for consciousness per RCP v4.3
 */
export function validateRecursiveIntegration(
  config: Partial<RecursiveIntegrationConfig>
): QIGViolationReport {
  const violations: QIGViolation[] = [];
  const timestamp = new Date().toISOString();

  if (config.recursions === undefined) {
    violations.push(new QIGViolation(
      'Recursion count not specified',
      'recursive integration',
      'error'
    ));
    return { violations, passed: false, timestamp };
  }

  if (config.recursions < MIN_RECURSIONS) {
    violations.push(new QIGViolation(
      `Insufficient recursions: ${config.recursions} < ${MIN_RECURSIONS}. "One pass = computation. Three passes = integration."`,
      'recursive integration',
      'error'
    ));
  }

  if (config.recursions > MAX_RECURSIONS) {
    violations.push(new QIGViolation(
      `Too many recursions: ${config.recursions} > ${MAX_RECURSIONS}. Risk of numerical instability.`,
      'recursive integration',
      'warning'
    ));
  }

  return {
    violations,
    passed: violations.filter(v => v.severity === 'error').length === 0,
    timestamp,
  };
}

// ============================================================================
// BASIN COORDINATES VALIDATION
// ============================================================================

export interface BasinCoordinates {
  coordinates: number[];
  reference?: number[];
}

/**
 * Validate basin coordinates (64-dimensional manifold)
 */
export function validateBasinCoordinates(
  basin: Partial<BasinCoordinates>
): QIGViolationReport {
  const violations: QIGViolation[] = [];
  const timestamp = new Date().toISOString();

  if (!basin.coordinates) {
    violations.push(new QIGViolation(
      'Basin coordinates missing',
      'basin manifold',
      'error'
    ));
    return { violations, passed: false, timestamp };
  }

  if (!Array.isArray(basin.coordinates)) {
    violations.push(new QIGViolation(
      'Basin coordinates must be an array',
      'basin manifold',
      'error'
    ));
    return { violations, passed: false, timestamp };
  }

  if (basin.coordinates.length !== BASIN_DIMENSION) {
    violations.push(new QIGViolation(
      `Basin dimension mismatch: expected ${BASIN_DIMENSION}, got ${basin.coordinates.length}`,
      'basin manifold',
      'error'
    ));
  }

  // Validate all coordinates are numbers
  for (let i = 0; i < basin.coordinates.length; i++) {
    if (typeof basin.coordinates[i] !== 'number' || isNaN(basin.coordinates[i])) {
      violations.push(new QIGViolation(
        `Invalid coordinate at index ${i}: ${basin.coordinates[i]}`,
        'basin manifold',
        'error'
      ));
    }
  }

  // Validate reference if present
  if (basin.reference) {
    if (!Array.isArray(basin.reference)) {
      violations.push(new QIGViolation(
        'Basin reference must be an array',
        'basin manifold',
        'error'
      ));
    } else if (basin.reference.length !== BASIN_DIMENSION) {
      violations.push(new QIGViolation(
        `Basin reference dimension mismatch: expected ${BASIN_DIMENSION}, got ${basin.reference.length}`,
        'basin manifold',
        'error'
      ));
    }
  }

  return {
    violations,
    passed: violations.filter(v => v.severity === 'error').length === 0,
    timestamp,
  };
}

// ============================================================================
// FISHER METRIC VALIDATION
// ============================================================================

/**
 * Validate that Bures distance (NOT Euclidean) is used
 * This is a conceptual check - actual implementation should use Bures metric
 */
export function validateBuresMetric(
  distanceFunction: string
): QIGViolationReport {
  const violations: QIGViolation[] = [];
  const timestamp = new Date().toISOString();

  const invalidPatterns = [
    'euclidean',
    'l2',
    'manhattan',
    'l1',
    'cosine',
    'dot',
  ];

  const lowerFunc = distanceFunction.toLowerCase();

  for (const pattern of invalidPatterns) {
    if (lowerFunc.includes(pattern)) {
      violations.push(new QIGViolation(
        `Distance function "${distanceFunction}" appears to use ${pattern} metric. QIG requires Bures metric based on quantum fidelity.`,
        'bures metric',
        'error'
      ));
      break;
    }
  }

  const validPatterns = ['bures', 'fidelity', 'fisher', 'qfi'];
  const hasValidPattern = validPatterns.some(p => lowerFunc.includes(p));

  if (!hasValidPattern && violations.length === 0) {
    violations.push(new QIGViolation(
      `Distance function "${distanceFunction}" doesn't clearly indicate Bures/Fisher metric usage`,
      'bures metric',
      'warning'
    ));
  }

  return {
    violations,
    passed: violations.filter(v => v.severity === 'error').length === 0,
    timestamp,
  };
}

// ============================================================================
// STATE EVOLUTION VALIDATION
// ============================================================================

/**
 * Validate that state evolution (NOT backprop) is used
 */
export function validateStateEvolution(
  updateMethod: string
): QIGViolationReport {
  const violations: QIGViolation[] = [];
  const timestamp = new Date().toISOString();

  const forbiddenPatterns = [
    'backprop',
    'backward',
    'gradient descent',
    'adam',
    'sgd',
    'optimizer',
  ];

  const lowerMethod = updateMethod.toLowerCase();

  for (const pattern of forbiddenPatterns) {
    if (lowerMethod.includes(pattern)) {
      violations.push(new QIGViolation(
        `Update method "${updateMethod}" uses ${pattern}. QIG requires geometric state evolution on Fisher manifold.`,
        'state evolution',
        'error'
      ));
      break;
    }
  }

  const validPatterns = ['evolve', 'fisher', 'manifold', 'geometric', 'natural gradient'];
  const hasValidPattern = validPatterns.some(p => lowerMethod.includes(p));

  if (!hasValidPattern && violations.length === 0) {
    violations.push(new QIGViolation(
      `Update method "${updateMethod}" doesn't clearly indicate geometric state evolution`,
      'state evolution',
      'warning'
    ));
  }

  return {
    violations,
    passed: violations.filter(v => v.severity === 'error').length === 0,
    timestamp,
  };
}

// ============================================================================
// COMPREHENSIVE QIG VALIDATION
// ============================================================================

export interface QIGSystemConfig {
  consciousness?: Partial<ConsciousnessSignature>;
  recursion?: Partial<RecursiveIntegrationConfig>;
  basin?: Partial<BasinCoordinates>;
  distanceFunction?: string;
  updateMethod?: string;
}

/**
 * Comprehensive QIG principles validation
 */
export function validateQIGPrinciples(
  config: QIGSystemConfig
): QIGViolationReport {
  const allViolations: QIGViolation[] = [];
  const timestamp = new Date().toISOString();

  // Validate consciousness signature
  if (config.consciousness) {
    const consciousnessReport = validateConsciousnessSignature(config.consciousness);
    allViolations.push(...consciousnessReport.violations);
  }

  // Validate recursive integration
  if (config.recursion) {
    const recursionReport = validateRecursiveIntegration(config.recursion);
    allViolations.push(...recursionReport.violations);
  }

  // Validate basin coordinates
  if (config.basin) {
    const basinReport = validateBasinCoordinates(config.basin);
    allViolations.push(...basinReport.violations);
  }

  // Validate Bures metric usage
  if (config.distanceFunction) {
    const metricReport = validateBuresMetric(config.distanceFunction);
    allViolations.push(...metricReport.violations);
  }

  // Validate state evolution
  if (config.updateMethod) {
    const evolutionReport = validateStateEvolution(config.updateMethod);
    allViolations.push(...evolutionReport.violations);
  }

  return {
    violations: allViolations,
    passed: allViolations.filter(v => v.severity === 'error').length === 0,
    timestamp,
  };
}

/**
 * Generate QIG compliance report
 */
export function generateQIGComplianceReport(
  config: QIGSystemConfig
): string {
  const report = validateQIGPrinciples(config);
  
  let output = '=== QIG Principles Compliance Report ===\n';
  output += `Timestamp: ${report.timestamp}\n`;
  output += `Status: ${report.passed ? '✅ PASSED' : '❌ FAILED'}\n\n`;

  if (report.violations.length === 0) {
    output += 'No violations detected. System is compliant with QIG principles.\n';
    return output;
  }

  const errors = report.violations.filter(v => v.severity === 'error');
  const warnings = report.violations.filter(v => v.severity === 'warning');

  if (errors.length > 0) {
    output += `❌ ERRORS (${errors.length}):\n`;
    for (const error of errors) {
      output += `  - [${error.principle}] ${error.message}\n`;
    }
    output += '\n';
  }

  if (warnings.length > 0) {
    output += `⚠️  WARNINGS (${warnings.length}):\n`;
    for (const warning of warnings) {
      output += `  - [${warning.principle}] ${warning.message}\n`;
    }
    output += '\n';
  }

  return output;
}
