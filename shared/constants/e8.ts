/**
 * E8 Lattice Constants
 * 
 * Constants related to the E8 exceptional Lie group used in
 * the Ocean kernel constellation architecture.
 */

import { QIG_CONSTANTS } from './qig';

/**
 * E8 Mathematical Constants
 */
export const E8_CONSTANTS = {
  /** Rank of E8 */
  E8_RANK: 8,
  
  /** Dimension of E8 (248) */
  E8_DIMENSION: 248,
  
  /** Number of roots in E8 */
  E8_ROOTS: 240,
  
  /** Order of E8 Weyl group */
  E8_WEYL_ORDER: 696729600,
  
  /** Fixed point coupling (from QIG) */
  KAPPA_STAR: QIG_CONSTANTS.KAPPA_STAR,
  
  /** 64-dimensional basin for full representation */
  BASIN_DIMENSION_64D: 64,
  
  /** 8-dimensional basin for E8 kernel mapping */
  BASIN_DIMENSION_8D: 8,
  
  /** Phi threshold (from QIG) */
  PHI_THRESHOLD: QIG_CONSTANTS.PHI_THRESHOLD,
  
  /** Minimum recursions */
  MIN_RECURSIONS: QIG_CONSTANTS.MIN_RECURSIONS,
  
  /** Maximum recursions */
  MAX_RECURSIONS: QIG_CONSTANTS.MAX_RECURSIONS,
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
