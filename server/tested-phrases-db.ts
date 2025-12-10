/**
 * TESTED PHRASES REGISTRY - DATABASE VERSION
 * 
 * Migrated from 4.2MB JSON file to PostgreSQL for performance
 * 
 * Tracks all tested phrases to avoid wasteful re-testing
 * Solves the "148 addresses re-tested forever" problem
 */

import { nanoid } from 'nanoid';
import { db, withDbRetry } from './db';
import { 
  testedPhrases,
  type TestedPhrase,
  type InsertTestedPhrase,
} from '@shared/schema';
import { eq, sql, and, isNull, desc } from 'drizzle-orm';

// In-memory cache for quick lookups (most recent 10,000 phrases)
const phraseCache = new Map<string, TestedPhrase>();
const CACHE_SIZE = 10000;

export class TestedPhrasesRegistryDB {
  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    if (!db) {
      console.log('[TestedPhrasesDB] No database available, using in-memory cache');
      return;
    }
    
    try {
      // Warm up cache with most recently tested phrases
      const recent = await withDbRetry(
        async () => {
          return await db!
            .select()
            .from(testedPhrases)
            .orderBy(desc(testedPhrases.testedAt))
            .limit(CACHE_SIZE);
        },
        'warm-phrases-cache',
        3
      );
      
      if (recent) {
        for (const phrase of recent) {
          phraseCache.set(phrase.phrase, phrase);
        }
        console.log(`[TestedPhrasesDB] Warmed cache with ${recent.length} tested phrases`);
      }
      
      // Log re-test statistics
      const retestStats = await withDbRetry(
        async () => {
          return await db!
            .select({
              totalRetests: sql<number>`sum(${testedPhrases.retestCount})`,
              phrasesRetested: sql<number>`count(*) filter (where ${testedPhrases.retestCount} > 0)`,
            })
            .from(testedPhrases);
        },
        'retest-stats',
        2
      );
      
      if (retestStats && retestStats[0]) {
        const { totalRetests, phrasesRetested } = retestStats[0];
        if (totalRetests > 0) {
          console.warn(`[TestedPhrasesDB] WARNING: ${phrasesRetested} phrases have been wastefully re-tested ${totalRetests} times total`);
        }
      }
    } catch (error) {
      console.error('[TestedPhrasesDB] Init error:', error);
    }
  }

  /**
   * Check if a phrase has already been tested
   * Returns the previous test result if found
   */
  async wasTested(phrase: string): Promise<TestedPhrase | null> {
    // Check cache first
    if (phraseCache.has(phrase)) {
      return phraseCache.get(phrase)!;
    }
    
    // Check database
    if (!db) {
      return null;
    }
    
    const result = await withDbRetry(
      async () => {
        const results = await db!
          .select()
          .from(testedPhrases)
          .where(eq(testedPhrases.phrase, phrase))
          .limit(1);
        return results[0] || null;
      },
      'check-tested-phrase',
      2
    );
    
    if (result) {
      // Add to cache
      phraseCache.set(phrase, result);
      
      // Maintain cache size
      if (phraseCache.size > CACHE_SIZE) {
        const firstKey = phraseCache.keys().next().value;
        if (firstKey !== undefined) {
          phraseCache.delete(firstKey);
        }
      }
    }
    
    return result;
  }

  /**
   * Record a tested phrase
   * If already exists, increments retest count (to track waste)
   */
  async recordTested(
    phrase: string,
    address: string,
    balanceSats: number = 0,
    txCount: number = 0,
    phi?: number,
    kappa?: number,
    regime?: string
  ): Promise<void> {
    const existing = await this.wasTested(phrase);
    
    if (existing) {
      // Wasteful re-test detected!
      const newRetestCount = (existing.retestCount || 0) + 1;
      
      if (db) {
        await withDbRetry(
          async () => {
            await db!
              .update(testedPhrases)
              .set({
                retestCount: newRetestCount,
                // Update other fields in case they changed
                balanceSats,
                txCount,
                phi: phi ?? existing.phi,
                kappa: kappa ?? existing.kappa,
                regime: regime ?? existing.regime,
              })
              .where(eq(testedPhrases.id, existing.id));
          },
          'update-tested-phrase',
          3
        );
      }
      
      existing.retestCount = newRetestCount;
      phraseCache.set(phrase, existing);
      
      // Only log every 50 retests to reduce spam
      if (newRetestCount % 50 === 0 || newRetestCount === 1) {
        console.warn(`[TestedPhrasesDB] WASTE DETECTED: Phrase "${phrase.substring(0, 30)}..." re-tested (${newRetestCount} times)`);
      }
      return;
    }
    
    // New phrase - record it
    const id = nanoid();
    const record: InsertTestedPhrase = {
      id,
      phrase,
      address,
      balanceSats,
      txCount,
      phi,
      kappa,
      regime,
      retestCount: 0,
    };
    
    if (db) {
      await withDbRetry(
        async () => {
          // Use onConflictDoNothing to handle race conditions where cache doesn't have phrase but DB does
          await db!.insert(testedPhrases).values(record).onConflictDoNothing();
        },
        'insert-tested-phrase',
        3
      );
    }
    
    // Update cache
    phraseCache.set(phrase, record as TestedPhrase);
    
    // Maintain cache size
    if (phraseCache.size > CACHE_SIZE) {
      const firstKey = phraseCache.keys().next().value;
      if (firstKey !== undefined) {
        phraseCache.delete(firstKey);
      }
    }
  }

  /**
   * Get phrases with non-zero balance (hits)
   */
  async getBalanceHits(): Promise<TestedPhrase[]> {
    if (!db) {
      return Array.from(phraseCache.values()).filter(p => (p.balanceSats || 0) > 0);
    }
    
    const hits = await withDbRetry(
      async () => {
        return await db!
          .select()
          .from(testedPhrases)
          .where(sql`${testedPhrases.balanceSats} > 0`)
          .orderBy(desc(testedPhrases.balanceSats));
      },
      'get-balance-hits',
      2
    );
    
    return hits || [];
  }

  /**
   * Get statistics on tested phrases
   */
  async getStats(): Promise<{
    totalTested: number;
    wastedRetests: number;
    uniqueAddresses: number;
    balanceHits: number;
    emptyAddresses: number;
  }> {
    if (!db) {
      const cached = Array.from(phraseCache.values());
      return {
        totalTested: cached.length,
        wastedRetests: cached.reduce((sum, p) => sum + (p.retestCount || 0), 0),
        uniqueAddresses: new Set(cached.map(p => p.address).filter(Boolean)).size,
        balanceHits: cached.filter(p => (p.balanceSats || 0) > 0).length,
        emptyAddresses: cached.filter(p => (p.balanceSats || 0) === 0).length,
      };
    }
    
    const stats = await withDbRetry(
      async () => {
        const [counts] = await db!
          .select({
            totalTested: sql<number>`count(*)`,
            wastedRetests: sql<number>`sum(${testedPhrases.retestCount})`,
            uniqueAddresses: sql<number>`count(distinct ${testedPhrases.address})`,
            balanceHits: sql<number>`count(*) filter (where ${testedPhrases.balanceSats} > 0)`,
            emptyAddresses: sql<number>`count(*) filter (where ${testedPhrases.balanceSats} = 0)`,
          })
          .from(testedPhrases);
        
        return counts;
      },
      'get-tested-stats',
      2
    );
    
    return stats || {
      totalTested: 0,
      wastedRetests: 0,
      uniqueAddresses: 0,
      balanceHits: 0,
      emptyAddresses: 0,
    };
  }

  /**
   * Get phrases that have been wastefully re-tested
   */
  async getWastedRetests(minRetests: number = 1): Promise<TestedPhrase[]> {
    if (!db) {
      return Array.from(phraseCache.values()).filter(p => (p.retestCount || 0) >= minRetests);
    }
    
    const wasted = await withDbRetry(
      async () => {
        return await db!
          .select()
          .from(testedPhrases)
          .where(sql`${testedPhrases.retestCount} >= ${minRetests}`)
          .orderBy(desc(testedPhrases.retestCount))
          .limit(100);
      },
      'get-wasted-retests',
      2
    );
    
    return wasted || [];
  }

  /**
   * Clean old entries (optional - keep database size manageable)
   */
  async prune(keepDays: number = 30): Promise<{ removed: number }> {
    if (!db) {
      return { removed: 0 };
    }
    
    const cutoffDate = new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000);
    
    const result = await withDbRetry(
      async () => {
        // Count items to be deleted first
        const [toDelete] = await db!
          .select({ count: sql<number>`count(*)` })
          .from(testedPhrases)
          .where(
            and(
              sql`${testedPhrases.testedAt} < ${cutoffDate}`,
              eq(testedPhrases.balanceSats, 0),
              eq(testedPhrases.retestCount, 0)
            )
          );
        
        // Only prune empty addresses with no retests (not valuable data)
        await db!
          .delete(testedPhrases)
          .where(
            and(
              sql`${testedPhrases.testedAt} < ${cutoffDate}`,
              eq(testedPhrases.balanceSats, 0),
              eq(testedPhrases.retestCount, 0)
            )
          );
        
        return { removed: toDelete.count };
      },
      'prune-tested-phrases',
      2
    );
    
    const removed = result?.removed || 0;
    console.log(`[TestedPhrasesDB] Pruned ${removed} old empty phrases older than ${keepDays} days`);
    
    // Clear cache to force reload
    phraseCache.clear();
    await this.init();
    
    return { removed };
  }

  /**
   * Get total count
   */
  async count(): Promise<number> {
    if (!db) {
      return phraseCache.size;
    }
    
    const result = await withDbRetry(
      async () => {
        const [count] = await db!
          .select({ count: sql<number>`count(*)` })
          .from(testedPhrases);
        return count.count;
      },
      'count-tested-phrases',
      2
    );
    
    return result || 0;
  }
}

export const testedPhrasesRegistryDB = new TestedPhrasesRegistryDB();
