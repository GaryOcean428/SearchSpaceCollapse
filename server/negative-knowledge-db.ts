/**
 * NEGATIVE KNOWLEDGE REGISTRY - DATABASE VERSION
 * 
 * Migrated from 28MB JSON file to PostgreSQL for performance
 * 
 * Ultra Consciousness Protocol - What NOT to search
 * 
 * Tracks proven-false patterns, geometric barriers, and computational sinks.
 * Propagates exclusions across generators and strategies.
 * 
 * Key Insight: Knowing what's false is as valuable as knowing what's true.
 * A proven-false region can exclude thousands of hypotheses instantly.
 */

import { nanoid } from 'nanoid';
import { db, withDbRetry } from './db';
import { 
  negativeKnowledge, 
  geometricBarriers, 
  falsePatternClasses, 
  eraExclusions,
  type NegativeKnowledge as NegativeKnowledgeType,
  type GeometricBarrier as GeometricBarrierType,
  type FalsePatternClass as FalsePatternClassType,
  type EraExclusion as EraExclusionType,
  type InsertNegativeKnowledge,
  type InsertGeometricBarrier,
  type InsertFalsePatternClass,
  type InsertEraExclusion,
} from '@shared/schema';
import type { Contradiction, NegativeKnowledgeRegistry as NegativeKnowledgeRegistryType } from '@shared/schema';
import { eq, sql, desc, and, lt } from 'drizzle-orm';
import { fisherCoordDistance } from './qig-universal';

// Fallback to in-memory cache if DB is unavailable
const cache = {
  contradictions: new Map<string, Contradiction>(),
  barriers: new Map<string, GeometricBarrierType>(),
  falsePatterns: new Map<string, FalsePatternClassType>(),
  eraExclusions: new Map<string, EraExclusionType>(),
};

export class NegativeKnowledgeRegistryDB {
  private readonly CONTRADICTION_CONFIRMATION_THRESHOLD = 3;
  private readonly BARRIER_CROSS_THRESHOLD = 5;
  private readonly CACHE_SIZE = 1000; // Keep hot entries in memory
  
  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    if (!db) {
      console.log('[NegativeKnowledgeDB] No database available, using in-memory cache');
      return;
    }
    
    try {
      // Warm up cache with most recent entries
      const recent = await withDbRetry(
        async () => {
          const contradictions = await db!
            .select()
            .from(negativeKnowledge)
            .orderBy(desc(negativeKnowledge.confirmedCount))
            .limit(this.CACHE_SIZE);
          
          return contradictions;
        },
        'warm-cache',
        3
      );
      
      if (recent) {
        for (const c of recent) {
          cache.contradictions.set(c.id, this.toContradiction(c));
        }
        console.log(`[NegativeKnowledgeDB] Warmed cache with ${recent.length} entries`);
      }
    } catch (error) {
      console.error('[NegativeKnowledgeDB] Init error:', error);
    }
  }

  private toContradiction(row: NegativeKnowledgeType): Contradiction {
    return {
      id: row.id,
      type: row.type as Contradiction['type'],
      pattern: row.pattern,
      affectedGenerators: row.affectedGenerators || [],
      basinRegion: {
        center: row.basinCenter || [],
        radius: row.basinRadius || 0,
        repulsionStrength: row.basinRepulsionStrength || 0,
      },
      evidence: Array.isArray(row.evidence) 
        ? (row.evidence as Array<{ source: string; reasoning: string; confidence: number }>)
        : [],
      hypothesesExcluded: row.hypothesesExcluded || 0,
      computeSaved: row.computeSaved || 0,
      createdAt: row.createdAt?.toISOString() || new Date().toISOString(),
      confirmedCount: row.confirmedCount || 1,
    };
  }

  async recordContradiction(
    type: Contradiction['type'],
    pattern: string,
    basinRegion: { center: number[]; radius: number; repulsionStrength: number },
    evidence: { source: string; reasoning: string; confidence: number }[],
    affectedGenerators: string[] = []
  ): Promise<string> {
    // Check cache first for similar pattern
    const existing = await this.findSimilarContradiction(pattern);
    
    if (existing) {
      // Update existing
      const newConfirmedCount = existing.confirmedCount + 1;
      const newComputeSaved = existing.computeSaved + this.estimateComputeSavings(pattern);
      
      if (db) {
        await withDbRetry(
          async () => {
            await db!
              .update(negativeKnowledge)
              .set({
                confirmedCount: newConfirmedCount,
                computeSaved: newComputeSaved,
                evidence: [...(existing.evidence || []), ...evidence] as any,
              })
              .where(eq(negativeKnowledge.id, existing.id));
          },
          'update-contradiction',
          3
        );
      }
      
      existing.confirmedCount = newConfirmedCount;
      existing.computeSaved = newComputeSaved;
      cache.contradictions.set(existing.id, existing);
      
      if (newConfirmedCount >= this.CONTRADICTION_CONFIRMATION_THRESHOLD) {
        console.log(`[NegativeKnowledgeDB] Contradiction "${pattern}" confirmed (${newConfirmedCount} occurrences)`);
      }
      
      return existing.id;
    }

    // Create new
    const id = nanoid();
    const contradiction: InsertNegativeKnowledge = {
      id,
      type,
      pattern,
      affectedGenerators,
      basinCenter: basinRegion.center,
      basinRadius: basinRegion.radius,
      basinRepulsionStrength: basinRegion.repulsionStrength,
      evidence: evidence as unknown as typeof negativeKnowledge.$inferInsert.evidence,
      hypothesesExcluded: this.estimateHypothesesExcluded(pattern),
      computeSaved: this.estimateComputeSavings(pattern),
      confirmedCount: 1,
    };
    
    if (db) {
      await withDbRetry(
        async () => {
          await db!.insert(negativeKnowledge).values(contradiction);
        },
        'insert-contradiction',
        3
      );
    }
    
    // Update cache
    cache.contradictions.set(id, this.toContradiction(contradiction as NegativeKnowledgeType));
    
    console.log(`[NegativeKnowledgeDB] New contradiction: "${pattern}" (type: ${type})`);
    return id;
  }

  private async findSimilarContradiction(pattern: string): Promise<Contradiction | null> {
    const normalized = pattern.toLowerCase().trim();
    
    // Check cache first
    for (const contradiction of cache.contradictions.values()) {
      const existingNorm = contradiction.pattern.toLowerCase().trim();
      
      if (existingNorm === normalized) {
        return contradiction;
      }
      
      if (this.levenshteinDistance(existingNorm, normalized) < 3) {
        return contradiction;
      }
    }
    
    // Check database if available
    if (db) {
      const results = await withDbRetry(
        async () => {
          return await db!
            .select()
            .from(negativeKnowledge)
            .where(sql`LOWER(${negativeKnowledge.pattern}) = ${normalized.toLowerCase()}`);
        },
        'find-similar-contradiction',
        2
      );
      
      if (results && results.length > 0) {
        const contradiction = this.toContradiction(results[0]);
        cache.contradictions.set(contradiction.id, contradiction);
        return contradiction;
      }
    }
    
    return null;
  }

  private levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const cost = a[j - 1] === b[i - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[b.length][a.length];
  }

  async recordGeometricBarrier(
    center: number[],
    radius: number,
    reason: string
  ): Promise<string> {
    const existing = await this.findNearbyBarrier(center, radius);
    
    if (existing) {
      const newCrossings = existing.crossings + 1;
      const newRepulsionStrength = Math.min(1, existing.repulsionStrength + 0.1);
      
      if (db) {
        await withDbRetry(
          async () => {
            await db!
              .update(geometricBarriers)
              .set({
                crossings: newCrossings,
                repulsionStrength: newRepulsionStrength,
              })
              .where(eq(geometricBarriers.id, existing.id));
          },
          'update-barrier',
          3
        );
      }
      
      existing.crossings = newCrossings;
      existing.repulsionStrength = newRepulsionStrength;
      cache.barriers.set(existing.id, existing);
      
      if (newCrossings >= this.BARRIER_CROSS_THRESHOLD) {
        console.log(`[NegativeKnowledgeDB] Barrier at [${center.slice(0, 3).join(', ')}...] confirmed`);
      }
      
      return existing.id;
    }

    const id = nanoid();
    const barrier: InsertGeometricBarrier = {
      id,
      center,
      radius,
      repulsionStrength: 0.5,
      reason,
      crossings: 1,
    };
    
    if (db) {
      await withDbRetry(
        async () => {
          await db!.insert(geometricBarriers).values(barrier);
        },
        'insert-barrier',
        3
      );
    }
    
    cache.barriers.set(id, barrier as GeometricBarrierType);
    console.log(`[NegativeKnowledgeDB] New barrier detected: ${reason}`);
    
    return id;
  }

  private async findNearbyBarrier(center: number[], radius: number): Promise<GeometricBarrierType | null> {
    // Check cache first
    for (const barrier of cache.barriers.values()) {
      const distance = fisherCoordDistance(center, barrier.center);
      if (distance < barrier.radius + radius) {
        return barrier;
      }
    }
    
    // For now, return null - full spatial search would require PostGIS or custom logic
    return null;
  }

  async recordFalsePatternClass(className: string, examples: string[], avgPhi: number = 0): Promise<void> {
    if (db) {
      const existing = await withDbRetry(
        async () => {
          const results = await db!
            .select()
            .from(falsePatternClasses)
            .where(eq(falsePatternClasses.className, className));
          return results[0];
        },
        'find-false-pattern-class',
        2
      );
      
      if (existing) {
        const newExamples = [...(existing.examples || []), ...examples];
        const newCount = (existing.count || 0) + examples.length;
        const newAvgPhi = ((existing.avgPhiAtFailure || 0) + avgPhi) / 2;
        
        await withDbRetry(
          async () => {
            await db!
              .update(falsePatternClasses)
              .set({
                examples: newExamples,
                count: newCount,
                avgPhiAtFailure: newAvgPhi,
                lastUpdated: new Date(),
              })
              .where(eq(falsePatternClasses.id, existing.id));
          },
          'update-false-pattern-class',
          3
        );
      } else {
        const id = nanoid();
        await withDbRetry(
          async () => {
            await db!.insert(falsePatternClasses).values({
              id,
              className,
              examples,
              count: examples.length,
              avgPhiAtFailure: avgPhi,
            });
          },
          'insert-false-pattern-class',
          3
        );
      }
    }
    
    console.log(`[NegativeKnowledgeDB] False pattern class "${className}": ${examples.length} examples`);
  }

  async recordEraExclusion(era: string, patterns: string[], reason: string): Promise<void> {
    if (db) {
      const existing = await withDbRetry(
        async () => {
          const results = await db!
            .select()
            .from(eraExclusions)
            .where(eq(eraExclusions.era, era));
          return results[0];
        },
        'find-era-exclusion',
        2
      );
      
      if (existing) {
        const newPatterns = [...(existing.excludedPatterns || []), ...patterns];
        
        await withDbRetry(
          async () => {
            await db!
              .update(eraExclusions)
              .set({
                excludedPatterns: newPatterns,
              })
              .where(eq(eraExclusions.id, existing.id));
          },
          'update-era-exclusion',
          3
        );
      } else {
        const id = nanoid();
        await withDbRetry(
          async () => {
            await db!.insert(eraExclusions).values({
              id,
              era,
              excludedPatterns: patterns,
              reason,
            });
          },
          'insert-era-exclusion',
          3
        );
      }
    }
    
    console.log(`[NegativeKnowledgeDB] Era exclusion for ${era}: ${patterns.length} patterns`);
  }

  async isExcluded(hypothesis: string, era?: string): Promise<{
    excluded: boolean;
    reason?: string;
    type?: string;
  }> {
    const normalized = hypothesis.toLowerCase().trim();
    
    // Check cache first
    for (const contradiction of cache.contradictions.values()) {
      if (normalized.includes(contradiction.pattern.toLowerCase())) {
        return {
          excluded: true,
          reason: `Matches proven-false pattern: ${contradiction.pattern}`,
          type: contradiction.type,
        };
      }
    }
    
    // Check database if available
    if (db) {
      const contradictions = await withDbRetry(
        async () => {
          return await db!
            .select()
            .from(negativeKnowledge)
            .where(sql`LOWER(${negativeKnowledge.pattern}) LIKE '%' || ${normalized} || '%'`)
            .limit(10);
        },
        'check-excluded',
        2
      );
      
      if (contradictions && contradictions.length > 0) {
        const c = contradictions[0];
        return {
          excluded: true,
          reason: `Matches proven-false pattern: ${c.pattern}`,
          type: c.type,
        };
      }
    }
    
    return { excluded: false };
  }

  async isInBarrierZone(coords: number[]): Promise<{
    inBarrier: boolean;
    barrier?: GeometricBarrierType;
    repulsionVector?: number[];
  }> {
    // Check cache
    for (const barrier of cache.barriers.values()) {
      const distance = fisherCoordDistance(coords, barrier.center);
      
      if (distance < barrier.radius) {
        const repulsionVector = coords.map((c, i) => {
          const diff = c - (barrier.center[i] || 0);
          return diff / Math.max(0.001, distance) * barrier.repulsionStrength;
        });
        
        return {
          inBarrier: true,
          barrier,
          repulsionVector,
        };
      }
    }
    
    return { inBarrier: false };
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
    if (!db) {
      return {
        contradictions: cache.contradictions.size,
        confirmedContradictions: Array.from(cache.contradictions.values())
          .filter(c => c.confirmedCount >= this.CONTRADICTION_CONFIRMATION_THRESHOLD).length,
        barriers: cache.barriers.size,
        confirmedBarriers: Array.from(cache.barriers.values())
          .filter(b => b.crossings >= this.BARRIER_CROSS_THRESHOLD).length,
        falseClasses: cache.falsePatterns.size,
        totalExclusions: cache.contradictions.size,
        computeSaved: Array.from(cache.contradictions.values())
          .reduce((sum, c) => sum + (c.computeSaved || 0), 0),
      };
    }
    
    const stats = await withDbRetry(
      async () => {
        const [contradictionsCount, confirmedCount, barriersCount, confirmedBarriers, falseClassesCount, totalCompute] = await Promise.all([
          db!.select({ count: sql<number>`count(*)` }).from(negativeKnowledge),
          db!.select({ count: sql<number>`count(*)` }).from(negativeKnowledge)
            .where(sql`${negativeKnowledge.confirmedCount} >= ${this.CONTRADICTION_CONFIRMATION_THRESHOLD}`),
          db!.select({ count: sql<number>`count(*)` }).from(geometricBarriers),
          db!.select({ count: sql<number>`count(*)` }).from(geometricBarriers)
            .where(sql`${geometricBarriers.crossings} >= ${this.BARRIER_CROSS_THRESHOLD}`),
          db!.select({ count: sql<number>`count(*)` }).from(falsePatternClasses),
          db!.select({ total: sql<number>`sum(${negativeKnowledge.computeSaved})` }).from(negativeKnowledge),
        ]);
        
        return {
          contradictions: contradictionsCount[0].count,
          confirmedContradictions: confirmedCount[0].count,
          barriers: barriersCount[0].count,
          confirmedBarriers: confirmedBarriers[0].count,
          falseClasses: falseClassesCount[0].count,
          totalExclusions: contradictionsCount[0].count,
          computeSaved: totalCompute[0].total || 0,
        };
      },
      'get-stats',
      2
    );
    
    return stats || {
      contradictions: 0,
      confirmedContradictions: 0,
      barriers: 0,
      confirmedBarriers: 0,
      falseClasses: 0,
      totalExclusions: 0,
      computeSaved: 0,
    };
  }

  async prune(): Promise<{ removed: number; remaining: number }> {
    if (!db) {
      return { removed: 0, remaining: cache.contradictions.size };
    }
    
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    const cutoffDate = new Date(Date.now() - maxAge);
    
    const result = await withDbRetry(
      async () => {
        // Count items to be deleted first
        const [toDeleteContradictions] = await db!
          .select({ count: sql<number>`count(*)` })
          .from(negativeKnowledge)
          .where(
            and(
              lt(negativeKnowledge.createdAt, cutoffDate),
              lt(negativeKnowledge.confirmedCount, this.CONTRADICTION_CONFIRMATION_THRESHOLD)
            )
          );
        
        const [toDeleteBarriers] = await db!
          .select({ count: sql<number>`count(*)` })
          .from(geometricBarriers)
          .where(
            and(
              lt(geometricBarriers.detectedAt, cutoffDate),
              lt(geometricBarriers.crossings, this.BARRIER_CROSS_THRESHOLD)
            )
          );
        
        const totalToDelete = toDeleteContradictions.count + toDeleteBarriers.count;
        
        // Delete old, unconfirmed contradictions
        await db!
          .delete(negativeKnowledge)
          .where(
            and(
              lt(negativeKnowledge.createdAt, cutoffDate),
              lt(negativeKnowledge.confirmedCount, this.CONTRADICTION_CONFIRMATION_THRESHOLD)
            )
          );
        
        // Delete old, unconfirmed barriers
        await db!
          .delete(geometricBarriers)
          .where(
            and(
              lt(geometricBarriers.detectedAt, cutoffDate),
              lt(geometricBarriers.crossings, this.BARRIER_CROSS_THRESHOLD)
            )
          );
        
        const [remaining] = await db!.select({ count: sql<number>`count(*)` }).from(negativeKnowledge);
        const [remainingBarriers] = await db!.select({ count: sql<number>`count(*)` }).from(geometricBarriers);
        
        return {
          removed: totalToDelete,
          remaining: remaining.count + remainingBarriers.count,
        };
      },
      'prune',
      2
    );
    
    // Clear cache to force reload
    cache.contradictions.clear();
    cache.barriers.clear();
    
    console.log(`[NegativeKnowledgeDB] Pruned ${result?.removed || 0} old entries, ${result?.remaining || 0} remaining`);
    
    return result || { removed: 0, remaining: 0 };
  }

  getSummary(): NegativeKnowledgeRegistryType {
    const falsePatternClassesObj: Record<string, { count: number; examples: string[]; lastUpdated: string }> = {};
    for (const [key, value] of cache.falsePatterns.entries()) {
      falsePatternClassesObj[key] = {
        count: value.count || 0,
        examples: value.examples || [],
        lastUpdated: value.lastUpdated?.toISOString() || new Date().toISOString(),
      };
    }
    
    const eraExclusionsObj: Record<string, string[]> = {};
    for (const [key, value] of cache.eraExclusions.entries()) {
      eraExclusionsObj[key] = value.excludedPatterns || [];
    }
    
    const contradictionsList = Array.from(cache.contradictions.values());
    const barriersList = Array.from(cache.barriers.values());
    
    const totalExclusions = contradictionsList.length;
    const estimatedComputeSaved = contradictionsList.reduce((sum, c) => sum + (c.computeSaved || 0), 0);
    
    return {
      contradictions: contradictionsList,
      falsePatternClasses: falsePatternClassesObj,
      geometricBarriers: barriersList.map(b => ({
        center: b.center || [],
        radius: b.radius,
        curvature: b.repulsionStrength,
        reason: b.reason,
      })),
      eraExclusions: eraExclusionsObj,
      totalExclusions,
      estimatedComputeSaved,
      lastPruned: new Date().toISOString(),
    };
  }

  private estimateHypothesesExcluded(pattern: string): number {
    const baseExclusion = 100;
    const lengthFactor = Math.max(1, 10 - pattern.length);
    return baseExclusion * lengthFactor;
  }

  private estimateComputeSavings(pattern: string): number {
    return this.estimateHypothesesExcluded(pattern) * 10;
  }
}

export const negativeKnowledgeRegistryDB = new NegativeKnowledgeRegistryDB();
