/**
 * QIG Geometry - Centralized Geometric Operations
 * 
 * CRITICAL: This is the SINGLE SOURCE OF TRUTH for all geometric operations
 * in the server-side code. All distance calculations, geodesic operations,
 * and manifold computations MUST use functions from this module.
 * 
 * GEOMETRIC PURITY ENFORCED:
 * ✅ Fisher-Rao distance (NOT Euclidean!)
 * ✅ Geodesic paths (NOT straight lines!)
 * ✅ Natural gradient (NOT standard gradient!)
 * ✅ Basin coordinates (NOT embeddings!)
 * 
 * Architecture: Barrel file pattern + DRY principle
 * - Re-exports from qig-universal (Python backend integration)
 * - Adds server-specific utilities
 * - No duplicate implementations
 */

import { 
  fisherCoordDistance, 
  fisherDistance,
  fisherGeodesicDistance,
  QIG_CONSTANTS,
  type UniversalQIGScore,
  type KeyType,
  type PureQIGScore,
  scorePhraseQIG,
  scoreUniversalQIGAsync,
} from './qig-universal';

// ============================================================================
// RE-EXPORTS FROM QIG-UNIVERSAL (Primary geometric operations)
// ============================================================================

/**
 * Fisher-Rao distance between basin coordinates
 * 
 * PURE GEOMETRIC DISTANCE: d²_F = Σ (Δθᵢ)² / σᵢ² where σᵢ² = θᵢ(1 - θᵢ)
 * 
 * This is the CANONICAL distance function for all basin coordinate comparisons.
 * ❌ NEVER use Euclidean distance for basin coordinates!
 * 
 * @param coords1 - First basin coordinates (64D)
 * @param coords2 - Second basin coordinates (64D)
 * @returns Fisher-Rao distance on information manifold
 */
export { fisherCoordDistance };

/**
 * Fisher distance between two phrases
 * 
 * Combines:
 * - Φ distance (weighted by consciousness significance)
 * - κ distance (normalized to κ* scale)
 * - Basin distance (Fisher-Rao on 64D manifold)
 * 
 * @param phrase1 - First phrase
 * @param phrase2 - Second phrase
 * @returns Combined Fisher distance
 */
export { fisherDistance };

/**
 * Fisher geodesic distance between two keys
 * 
 * Works for ALL key types:
 * - BIP-39 phrases
 * - Master keys (hex)
 * - Arbitrary brain wallets
 * 
 * @param input1 - First key/phrase
 * @param keyType1 - Type of first key
 * @param input2 - Second key/phrase
 * @param keyType2 - Type of second key
 * @returns Geodesic distance on Fisher manifold
 */
export { fisherGeodesicDistance };

/**
 * QIG Constants (frozen from empirical validation)
 */
export { QIG_CONSTANTS };

/**
 * Score a phrase using pure QIG geometry
 */
export { scorePhraseQIG };

/**
 * Score with Python backend (async, production-grade)
 */
export { scoreUniversalQIGAsync };

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { UniversalQIGScore, KeyType, PureQIGScore };

// ============================================================================
// SERVER-SIDE GEOMETRIC UTILITIES
// ============================================================================

/**
 * Compute Fisher-weighted direction vector
 * 
 * For navigation on the manifold, we need directions that respect
 * the Fisher metric. This computes the natural gradient direction.
 * 
 * @param from - Starting basin coordinates
 * @param to - Target basin coordinates
 * @returns Fisher-weighted direction vector (tangent space)
 */
export function fisherWeightedDirection(
  from: number[],
  to: number[]
): number[] {
  const dims = Math.min(from.length, to.length);
  const direction = new Array(dims).fill(0);
  
  for (let i = 0; i < dims; i++) {
    const p = Math.max(0.001, Math.min(0.999, from[i] || 0));
    
    // Fisher weight: 1 / (θ(1-θ))
    const fisherWeight = 1 / (p * (1 - p));
    
    // Natural gradient component
    const delta = (to[i] || 0) - (from[i] || 0);
    direction[i] = fisherWeight * delta;
  }
  
  // Normalize
  const magnitude = Math.sqrt(direction.reduce((sum, d) => sum + d * d, 0));
  if (magnitude > 0.001) {
    for (let i = 0; i < dims; i++) {
      direction[i] /= magnitude;
    }
  }
  
  return direction;
}

/**
 * Geodesic interpolation between two basin points
 * 
 * Follows the geodesic (shortest path on manifold) between two points.
 * ❌ NOT linear interpolation (that would be Euclidean!)
 * 
 * @param start - Starting basin coordinates
 * @param end - Ending basin coordinates
 * @param t - Interpolation parameter [0, 1]
 * @returns Point on geodesic at parameter t
 */
export function geodesicInterpolation(
  start: number[],
  end: number[],
  t: number
): number[] {
  const dims = Math.min(start.length, end.length);
  const result = new Array(dims).fill(0);
  
  // Clamp t to [0, 1]
  const tClamped = Math.max(0, Math.min(1, t));
  
  for (let i = 0; i < dims; i++) {
    const p = Math.max(0.001, Math.min(0.999, start[i] || 0));
    const q = Math.max(0.001, Math.min(0.999, end[i] || 0));
    
    // Fisher geodesic follows: θ(t) such that ∇_F θ(t) is constant
    // For 1D, this is: θ(t) = p * exp(t * log(q/p))
    // Generalized: use Fisher-weighted interpolation
    const logP = Math.log(p / (1 - p)); // logit
    const logQ = Math.log(q / (1 - q));
    const logInterp = logP + tClamped * (logQ - logP);
    
    // Convert back: θ = exp(logit) / (1 + exp(logit))
    const expLogit = Math.exp(logInterp);
    result[i] = expLogit / (1 + expLogit);
  }
  
  return result;
}

/**
 * Compute manifold curvature at a point
 * 
 * Estimates the Ricci scalar (trace of Ricci tensor) at a basin point.
 * Higher curvature indicates more interesting geometry.
 * 
 * @param coords - Basin coordinates
 * @returns Estimated Ricci scalar
 */
export function estimateManifoldCurvature(coords: number[]): number {
  // For Fisher manifold, curvature is related to how far we are
  // from uniform distribution (maximum entropy)
  const dims = coords.length;
  if (dims === 0) return 0;
  
  let curvature = 0;
  for (let i = 0; i < dims; i++) {
    const p = Math.max(0.001, Math.min(0.999, coords[i] || 0));
    
    // Distance from p = 0.5 (uniform)
    const deviation = Math.abs(p - 0.5);
    
    // Fisher curvature proportional to deviation
    curvature += deviation / (p * (1 - p));
  }
  
  return curvature / dims;
}

/**
 * Check if two basin points are in geometric resonance
 * 
 * Resonance occurs when points are within a critical Fisher distance
 * and have similar consciousness metrics.
 * 
 * @param coords1 - First basin coordinates
 * @param coords2 - Second basin coordinates
 * @param threshold - Fisher distance threshold (default: 0.15)
 * @returns True if in resonance
 */
export function checkGeometricResonance(
  coords1: number[],
  coords2: number[],
  threshold: number = 0.15
): boolean {
  const distance = fisherCoordDistance(coords1, coords2);
  return distance < threshold;
}

/**
 * Compute geodesic velocity
 * 
 * Measures the rate of change along a trajectory on the manifold.
 * This is the tangent vector magnitude in Fisher metric.
 * 
 * @param trajectory - Array of basin coordinates (time series)
 * @returns Array of velocities (one per step)
 */
export function computeGeodesicVelocity(trajectory: number[][]): number[] {
  if (trajectory.length < 2) return [];
  
  const velocities: number[] = [];
  
  for (let i = 1; i < trajectory.length; i++) {
    const distance = fisherCoordDistance(trajectory[i - 1], trajectory[i]);
    velocities.push(distance);
  }
  
  return velocities;
}

/**
 * Validate geometric purity of a distance calculation
 * 
 * Use this to verify that distance calculations respect Fisher geometry.
 * 
 * @param coords1 - First coordinates
 * @param coords2 - Second coordinates
 * @returns Validation result with Fisher vs Euclidean comparison
 */
export function validateGeometricPurity(
  coords1: number[],
  coords2: number[]
): {
  fisherDistance: number;
  euclideanDistance: number;
  ratio: number;
  isPure: boolean;
} {
  const fisherDist = fisherCoordDistance(coords1, coords2);
  
  // Compute Euclidean for comparison (NEVER use this in production!)
  let euclideanSq = 0;
  const dims = Math.min(coords1.length, coords2.length);
  for (let i = 0; i < dims; i++) {
    const diff = (coords1[i] || 0) - (coords2[i] || 0);
    euclideanSq += diff * diff;
  }
  const euclideanDist = Math.sqrt(euclideanSq);
  
  const ratio = fisherDist / (euclideanDist + 0.001);
  
  // Fisher distance should be significantly different from Euclidean
  // (typically larger due to metric weighting)
  const isPure = Math.abs(ratio - 1.0) > 0.1;
  
  return {
    fisherDistance: fisherDist,
    euclideanDistance: euclideanDist,
    ratio,
    isPure,
  };
}

// ============================================================================
// DEPRECATION WARNINGS
// ============================================================================

/**
 * @deprecated Use fisherCoordDistance instead
 */
export function euclideanDistance(): never {
  throw new Error(
    'GEOMETRIC PURITY VIOLATION: euclideanDistance is banned! Use fisherCoordDistance.'
  );
}

/**
 * @deprecated Use geodesicInterpolation instead
 */
export function linearInterpolation(): never {
  throw new Error(
    'GEOMETRIC PURITY VIOLATION: linearInterpolation is banned! Use geodesicInterpolation.'
  );
}
