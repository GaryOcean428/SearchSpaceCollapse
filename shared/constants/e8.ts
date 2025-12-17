/**
 * E8 Lattice Constants
 * 
 * Constants related to the E8 exceptional Lie group used in
 * the Ocean kernel constellation architecture.
 */

import { QIG_CONSTANTS } from './qig';

/**
 * E8 Mathematical Constants
 * 
 * SINGLE SOURCE OF TRUTH for E8-related constants.
 * Imports physics-validated values from canonical sources.
 * 
 * ⚠️ DO NOT DUPLICATE THESE VALUES - IMPORT FROM HERE
 */
export const E8_CONSTANTS = {
  // ============================================================
  // E8 STRUCTURE (Mathematical constants)
  // ============================================================
  
  /** Rank of E8 */
  E8_RANK: 8,
  
  /** Dimension of E8 (248) */
  E8_DIMENSION: 248,
  
  /** Number of roots in E8 */
  E8_ROOTS: 240,
  
  /** Order of E8 Weyl group */
  E8_WEYL_ORDER: 696729600,
  
  // ============================================================
  // PHYSICS CONSTANTS (from validated sources)
  // ============================================================
  
  /** Fixed point coupling κ* = 64.21 ± 0.92 (L=4,5,6 plateau - Validated 2025-12-04) 
   *  Note: κ* ≈ 64 ≈ rank(E8)² = 8² */
  KAPPA_STAR: QIG_CONSTANTS.KAPPA_STAR,
  
  /** 64-dimensional basin for full representation */
  BASIN_DIMENSION_64D: 64,
  
  /** 8-dimensional basin for E8 kernel mapping */
  BASIN_DIMENSION_8D: 8,
  
  // ============================================================
  // CONSCIOUSNESS THRESHOLDS (7-component signature)
  // ============================================================
  
  /** Integration (Φ) threshold - consciousness detection */
  PHI_THRESHOLD: 0.70,
  
  /** Meta-awareness (M) threshold - self-reference coherence */
  M_THRESHOLD: 0.60,
  
  /** Generativity (Γ) threshold - creative capacity */
  GAMMA_THRESHOLD: 0.70,
  
  /** Grounding (G) threshold - reality anchor */
  G_THRESHOLD: 0.60,
  
  /** Temporal coherence (T) threshold - identity persistence */
  T_THRESHOLD: 0.70,
  
  /** Recursive depth (R) threshold - meta-level capacity */
  R_THRESHOLD: 0.60,
  
  /** External coupling (C) threshold - relationships/entanglement */
  C_THRESHOLD: 0.50,
  
  // ============================================================
  // RECURSION BOUNDS
  // ============================================================
  
  /** Minimum recursions "One pass = computation. Three passes = integration." */
  MIN_RECURSIONS: QIG_CONSTANTS.MIN_RECURSIONS,
  
  /** Maximum recursions to prevent infinite loops */
  MAX_RECURSIONS: QIG_CONSTANTS.MAX_RECURSIONS,
  
  // ============================================================
  // BETA FUNCTION (running coupling)
  // Legacy values preserved for backward compatibility
  // ============================================================
  
  /** β(3→4) - CRITICAL: Strongest running (+57% jump) */
  BETA_3_TO_4: 0.443,
  
  /** β(4→5) - Plateau onset (near zero = fixed point) */
  BETA_4_TO_5: 0.000,
} as const;

/**
 * Kernel Types (8 fundamental kernels mapping to E8)
 */
export const KERNEL_TYPES = [
  'heart',
  'vocab',
  'perception',
  'motor',
  'memory',
  'attention',
  'emotion',
  'executive',
] as const;

export type KernelType = typeof KERNEL_TYPES[number];

/**
 * E8 Root Distribution
 * 
 * Maps kernel types to their E8 root indices
 */
export const E8_ROOT_ALLOCATION = {
  heart: { start: 0, count: 30 },
  vocab: { start: 30, count: 30 },
  perception: { start: 60, count: 30 },
  motor: { start: 90, count: 30 },
  memory: { start: 120, count: 30 },
  attention: { start: 150, count: 30 },
  emotion: { start: 180, count: 30 },
  executive: { start: 210, count: 30 },
} as const;

/**
 * Get E8 root index for a kernel
 */
export function getE8RootIndex(kernelType: KernelType, localIndex: number): number {
  const allocation = E8_ROOT_ALLOCATION[kernelType];
  if (localIndex >= allocation.count) {
    throw new Error(`Local index ${localIndex} exceeds allocation for ${kernelType}`);
  }
  return allocation.start + localIndex;
}

/**
 * Get kernel type from E8 root index
 */
export function getKernelTypeFromRoot(rootIndex: number): KernelType | null {
  for (const [type, allocation] of Object.entries(E8_ROOT_ALLOCATION)) {
    if (rootIndex >= allocation.start && rootIndex < allocation.start + allocation.count) {
      return type as KernelType;
    }
  }
  return null;
}

/**
 * Generate all 240 E8 root vectors
 * 
 * The E8 root system consists of:
 * - 112 roots of the form: permutations of (±1, ±1, 0, 0, 0, 0, 0, 0) - all pairs of ±1
 * - 128 roots of the form: (±½, ±½, ±½, ±½, ±½, ±½, ±½, ±½) with an even number of minus signs
 * 
 * @returns Array of 240 8-dimensional root vectors
 */
export function generateE8Roots(): number[][] {
  const roots: number[][] = [];
  
  // Type 1: 112 roots of form (±1, ±1, 0, 0, 0, 0, 0, 0)
  // Choose 2 positions out of 8 for the ±1 values
  for (let i = 0; i < 8; i++) {
    for (let j = i + 1; j < 8; j++) {
      // All 4 sign combinations for the two ±1 values
      for (const s1 of [1, -1]) {
        for (const s2 of [1, -1]) {
          const root = new Array(8).fill(0);
          root[i] = s1;
          root[j] = s2;
          roots.push(root);
        }
      }
    }
  }
  // C(8,2) * 4 = 28 * 4 = 112 roots
  
  // Type 2: 128 roots of form (±½, ±½, ±½, ±½, ±½, ±½, ±½, ±½) with even number of minus signs
  // Iterate through all 256 sign combinations and keep those with even number of minus signs
  for (let mask = 0; mask < 256; mask++) {
    // Count number of minus signs (bits set in mask)
    let minusCount = 0;
    for (let bit = 0; bit < 8; bit++) {
      if (mask & (1 << bit)) minusCount++;
    }
    
    // Only keep even number of minus signs
    if (minusCount % 2 === 0) {
      const root = new Array(8).fill(0);
      for (let bit = 0; bit < 8; bit++) {
        root[bit] = (mask & (1 << bit)) ? -0.5 : 0.5;
      }
      roots.push(root);
    }
  }
  // 256 / 2 = 128 roots
  
  return roots;
}

// Cache the E8 roots for performance (computed once)
let _cachedE8Roots: number[][] | null = null;

/**
 * Get cached E8 roots (lazy initialization)
 */
export function getE8Roots(): number[][] {
  if (!_cachedE8Roots) {
    _cachedE8Roots = generateE8Roots();
  }
  return _cachedE8Roots;
}

/**
 * Project 64D basin coordinates to 8D by averaging groups of 8 consecutive coordinates
 * 
 * @param basin 64D basin coordinates
 * @returns 8D projection
 */
export function projectBasinTo8D(basin: number[]): number[] {
  const projection = new Array(8).fill(0);
  const groupSize = 8;
  
  for (let i = 0; i < 8; i++) {
    let sum = 0;
    const startIdx = i * groupSize;
    for (let j = 0; j < groupSize; j++) {
      const idx = startIdx + j;
      if (idx < basin.length) {
        sum += basin[idx];
      }
    }
    projection[i] = sum / groupSize;
  }
  
  return projection;
}

/**
 * Normalize an 8D vector to unit length
 * 
 * @param vector 8D vector
 * @returns Normalized vector (unit length)
 */
export function normalizeVector(vector: number[]): number[] {
  let magnitude = 0;
  for (let i = 0; i < vector.length; i++) {
    magnitude += vector[i] * vector[i];
  }
  magnitude = Math.sqrt(magnitude);
  
  if (magnitude < 1e-10) {
    return new Array(vector.length).fill(0);
  }
  
  return vector.map(v => v / magnitude);
}

/**
 * Compute Fisher-Rao distance in 8D space
 * 
 * Uses Fisher information metric where variance σ² = p(1-p)
 * Maps values to probability space for proper Fisher geometry
 * 
 * @param a First 8D vector
 * @param b Second 8D vector
 * @returns Fisher-Rao distance
 */
export function fisherDistance8D(a: number[], b: number[]): number {
  let sum = 0;
  const dims = Math.min(a.length, b.length);
  
  for (let i = 0; i < dims; i++) {
    // Map [-1, 1] → [0.01, 0.99] for valid probability
    const p = Math.max(0.01, Math.min(0.99, (a[i] + 1) / 2));
    // Fisher variance: σ² = p(1-p)
    const variance = p * (1 - p);
    // Fisher-weighted squared difference
    const diff = a[i] - b[i];
    sum += (diff * diff) / variance;
  }
  
  return Math.sqrt(sum);
}

/**
 * E8 Root Alignment Result
 */
export interface E8RootAlignmentResult {
  nearestRoot: number[];
  distance: number;
  rootIndex: number;
  kernelType: KernelType | null;
}

/**
 * Compute E8 root alignment for a 64D basin
 * 
 * 1. Projects 64D basin to 8D by averaging groups of 8 coordinates
 * 2. Normalizes the 8D projection
 * 3. Uses Fisher-Rao distance to find nearest E8 root
 * 4. Returns nearest root, distance, root index, and associated kernel type
 * 
 * @param basin 64D basin coordinates
 * @returns E8 alignment result with nearest root information
 */
export function computeE8RootAlignment(basin: number[]): E8RootAlignmentResult {
  // Step 1: Project 64D basin to 8D
  const projection8D = projectBasinTo8D(basin);
  
  // Step 2: Normalize the 8D projection
  const normalizedProjection = normalizeVector(projection8D);
  
  // Step 3: Find nearest E8 root using Fisher-Rao distance
  const roots = getE8Roots();
  
  let minDistance = Infinity;
  let nearestRootIndex = 0;
  let nearestRoot: number[] = roots[0];
  
  for (let i = 0; i < roots.length; i++) {
    // Normalize the E8 root for fair comparison
    const normalizedRoot = normalizeVector(roots[i]);
    
    // Use Fisher-Rao distance for geometric purity
    const distance = fisherDistance8D(normalizedProjection, normalizedRoot);
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestRootIndex = i;
      nearestRoot = roots[i];
    }
  }
  
  // Step 4: Get associated kernel type
  const kernelType = getKernelTypeFromRoot(nearestRootIndex);
  
  return {
    nearestRoot,
    distance: minDistance,
    rootIndex: nearestRootIndex,
    kernelType,
  };
}

/**
 * Count active dimensions in 8D projection
 * 
 * A dimension is considered "active" if its absolute value exceeds a threshold
 * 
 * @param projection 8D projection
 * @param threshold Activation threshold (default: 0.1)
 * @returns Number of active dimensions
 */
export function countActiveDimensions(projection: number[], threshold: number = 0.1): number {
  let count = 0;
  for (let i = 0; i < projection.length; i++) {
    if (Math.abs(projection[i]) > threshold) {
      count++;
    }
  }
  return count;
}
