/**
 * GEOMETRIC CACHE MODULE
 * 
 * Version-based cache management for expensive geometric computations.
 * Ensures caches are properly invalidated when probe data changes.
 * 
 * Contains:
 * - Cache interfaces for Fisher analysis and orthogonal complement
 * - Version-based cache invalidation logic
 */

import type { FisherAnalysisResult } from './fisher-analysis';

export interface OrthogonalComplementResult {
  complementBasis: number[][];
  complementDimension: number;
  constraintViolations: number;
  geodesicDirections: number[][];
  searchPriority: 'high' | 'medium' | 'low';
  fisherMatrix: number[][];
  covarianceMeans: number[];
  fisherEigenvalues: number[];
}

export interface GeometricCache<T> {
  result: T | null;
  dataVersion: number;
}

/**
 * Create a new empty cache.
 */
export function createEmptyCache<T>(): GeometricCache<T> {
  return {
    result: null,
    dataVersion: -1,
  };
}

/**
 * Check if cache is valid for given data version.
 */
export function isCacheValid<T>(cache: GeometricCache<T>, currentVersion: number): boolean {
  return cache.result !== null && cache.dataVersion === currentVersion;
}

/**
 * Update cache with new result and version.
 */
export function updateCache<T>(
  cache: GeometricCache<T>, 
  result: T, 
  dataVersion: number
): GeometricCache<T> {
  return {
    result,
    dataVersion,
  };
}

/**
 * Cache manager for geometric memory computations.
 * Handles version-based invalidation for expensive operations.
 */
export class GeometricCacheManager {
  private fisherCache: GeometricCache<FisherAnalysisResult>;
  private orthogonalCache: GeometricCache<OrthogonalComplementResult>;
  private dataVersion: number = 0;

  constructor() {
    this.fisherCache = createEmptyCache();
    this.orthogonalCache = createEmptyCache();
  }

  /**
   * Get current data version.
   */
  getDataVersion(): number {
    return this.dataVersion;
  }

  /**
   * Invalidate all caches by incrementing data version.
   */
  invalidate(): void {
    this.dataVersion++;
  }

  /**
   * Get Fisher analysis from cache if valid.
   */
  getFisherAnalysis(): FisherAnalysisResult | null {
    if (isCacheValid(this.fisherCache, this.dataVersion)) {
      return this.fisherCache.result;
    }
    return null;
  }

  /**
   * Store Fisher analysis in cache.
   */
  setFisherAnalysis(result: FisherAnalysisResult): void {
    this.fisherCache = updateCache(this.fisherCache, result, this.dataVersion);
  }

  /**
   * Get orthogonal complement from cache if valid.
   */
  getOrthogonalComplement(): OrthogonalComplementResult | null {
    if (isCacheValid(this.orthogonalCache, this.dataVersion)) {
      return this.orthogonalCache.result;
    }
    return null;
  }

  /**
   * Store orthogonal complement in cache.
   */
  setOrthogonalComplement(result: OrthogonalComplementResult): void {
    this.orthogonalCache = updateCache(this.orthogonalCache, result, this.dataVersion);
  }

  /**
   * Clear all caches.
   */
  clear(): void {
    this.fisherCache = createEmptyCache();
    this.orthogonalCache = createEmptyCache();
    this.dataVersion = 0;
  }
}
