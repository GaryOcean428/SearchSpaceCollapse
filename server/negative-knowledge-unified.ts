/**
 * UNIFIED NEGATIVE KNOWLEDGE INTERFACE
 * 
 * Provides a unified interface that automatically selects between:
 * - Database backend (preferred) - negative-knowledge-db.ts
 * - JSON file backend (fallback) - negative-knowledge-registry.ts
 * 
 * This allows seamless migration without breaking existing code.
 */

import { db } from './db';
import type { 
  Contradiction, 
  NegativeKnowledgeRegistry as NegativeKnowledgeRegistryType,
  GeometricBarrier,
  FalsePatternClass,
  EraExclusion,
} from '@shared/schema';

// Lazy imports to avoid circular dependencies
let dbRegistry: any = null;
let jsonRegistry: any = null;

async function getRegistry() {
  if (db) {
    // Database available - use DB backend
    if (!dbRegistry) {
      const { negativeKnowledgeRegistryDB } = await import('./negative-knowledge-db');
      dbRegistry = negativeKnowledgeRegistryDB;
      console.log('[NegativeKnowledgeUnified] Using DATABASE backend');
    }
    return dbRegistry;
  } else {
    // No database - fall back to JSON
    if (!jsonRegistry) {
      const { negativeKnowledgeRegistry } = await import('./negative-knowledge-registry');
      jsonRegistry = negativeKnowledgeRegistry;
      console.log('[NegativeKnowledgeUnified] Using JSON FILE backend');
    }
    return jsonRegistry;
  }
}

/**
 * Unified interface for negative knowledge operations
 */
export class NegativeKnowledgeUnified {
  async recordContradiction(
    type: Contradiction['type'],
    pattern: string,
    basinRegion: { center: number[]; radius: number; repulsionStrength: number },
    evidence: { source: string; reasoning: string; confidence: number }[],
    affectedGenerators: string[] = []
  ): Promise<string> {
    const registry = await getRegistry();
    return registry.recordContradiction(type, pattern, basinRegion, evidence, affectedGenerators);
  }

  async recordGeometricBarrier(
    center: number[],
    radius: number,
    reason: string
  ): Promise<string> {
    const registry = await getRegistry();
    return registry.recordGeometricBarrier(center, radius, reason);
  }

  async recordFalsePatternClass(
    className: string,
    examples: string[],
    avgPhi: number = 0
  ): Promise<void> {
    const registry = await getRegistry();
    return registry.recordFalsePatternClass(className, examples, avgPhi);
  }

  async recordEraExclusion(
    era: string,
    patterns: string[],
    reason: string
  ): Promise<void> {
    const registry = await getRegistry();
    return registry.recordEraExclusion(era, patterns, reason);
  }

  async isExcluded(
    hypothesis: string,
    era?: string
  ): Promise<{
    excluded: boolean;
    reason?: string;
    type?: string;
  }> {
    const registry = await getRegistry();
    return registry.isExcluded(hypothesis, era);
  }

  async isInBarrierZone(
    coords: number[]
  ): Promise<{
    inBarrier: boolean;
    barrier?: GeometricBarrier;
    repulsionVector?: number[];
  }> {
    const registry = await getRegistry();
    return registry.isInBarrierZone(coords);
  }

  async getStats(): Promise<{
    contradictions: number;
    confirmedContradictions: number;
    barriers: number;
    confirmedBarriers: number;
    falseClasses: number;
    totalExclusions: number;
    computeSaved: number;
  }> {
    const registry = await getRegistry();
    return registry.getStats();
  }

  async prune(): Promise<{ removed: number; remaining: number }> {
    const registry = await getRegistry();
    return registry.prune();
  }
}

export const negativeKnowledgeUnified = new NegativeKnowledgeUnified();
