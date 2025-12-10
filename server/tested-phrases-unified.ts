/**
 * UNIFIED TESTED PHRASES INTERFACE
 * 
 * Provides a unified interface that automatically selects between:
 * - Database backend (preferred) - tested-phrases-db.ts
 * - In-memory/file backend (fallback) - for compatibility
 * 
 * This allows seamless migration without breaking existing code.
 * 
 * HYDRATION STRATEGY:
 * - On startup, pre-loads all tested phrases from PostgreSQL into cache
 * - Provides synchronous has() checks against the cache
 * - Prevents "resurfacing hits" by maintaining consistency between DB and memory
 */

import { db } from './db';
import type { TestedPhrase } from '@shared/schema';

// Lazy imports to avoid circular dependencies
let dbRegistry: any = null;
let memoryRegistry: Map<string, TestedPhrase> = new Map();
let memoryCache: Set<string> = new Set(); // Fast deduplication cache

async function getRegistry() {
  if (db) {
    // Database available - use DB backend
    if (!dbRegistry) {
      const { testedPhrasesRegistryDB } = await import('./tested-phrases-db');
      dbRegistry = testedPhrasesRegistryDB;
      console.log('[TestedPhrasesUnified] Using DATABASE backend');
    }
    return dbRegistry;
  } else {
    // No database - use in-memory registry
    console.log('[TestedPhrasesUnified] Using IN-MEMORY backend');
    return null; // Signal to use in-memory
  }
}

/**
 * Unified interface for tested phrases operations
 */
export class TestedPhrasesUnified {
  private isHydrated: boolean = false;

  /**
   * Initialize and hydrate from PostgreSQL
   * This must be called during server startup BEFORE any testing begins
   */
  async initialize(): Promise<void> {
    if (this.isHydrated) {
      console.log('[TestedPhrasesUnified] Already hydrated, skipping');
      return;
    }

    console.log('[TestedPhrasesUnified] 📥 Hydrating from PostgreSQL...');
    
    try {
      const registry = await getRegistry();
      
      if (registry) {
        // Load all phrases from DB into the fast lookup cache
        // Warning: If you have millions of rows, consider using a Bloom Filter
        const { testedPhrases } = await import('@shared/schema');
        const allPhrases = await db.select({ phrase: testedPhrases.phrase })
          .from(testedPhrases);
        
        for (const row of allPhrases) {
          memoryCache.add(row.phrase);
        }
        
        this.isHydrated = true;
        console.log(`[TestedPhrasesUnified] ✅ Hydrated with ${memoryCache.size} historical phrases from PostgreSQL`);
      } else {
        // In-memory mode - already hydrated
        this.isHydrated = true;
        console.log('[TestedPhrasesUnified] ✅ Running in memory-only mode');
      }
    } catch (error) {
      console.error('[TestedPhrasesUnified] ⚠️ Failed to hydrate from PostgreSQL:', error);
      // Mark as hydrated anyway to prevent blocking
      this.isHydrated = true;
    }
  }

  /**
   * Synchronous check if phrase has been tested (uses pre-loaded cache)
   * This is safe to use after initialize() has completed
   */
  has(phrase: string): boolean {
    if (!this.isHydrated) {
      console.warn('[TestedPhrasesUnified] has() called before hydration - returning false');
      return false;
    }
    
    return memoryCache.has(phrase) || memoryRegistry.has(phrase);
  }

  /**
   * Check if a phrase has already been tested (async version for compatibility)
   */
  async wasTested(phrase: string): Promise<TestedPhrase | null> {
    const registry = await getRegistry();
    
    if (registry) {
      return registry.wasTested(phrase);
    } else {
      // In-memory fallback
      return memoryRegistry.get(phrase) || null;
    }
  }

  /**
   * Record a tested phrase
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
    // Add to cache immediately for in-loop deduplication
    memoryCache.add(phrase);
    
    const registry = await getRegistry();
    
    if (registry) {
      return registry.recordTested(phrase, address, balanceSats, txCount, phi, kappa, regime);
    } else {
      // In-memory fallback
      const existing = memoryRegistry.get(phrase);
      
      if (existing) {
        // Wasteful re-test detected
        existing.retestCount = (existing.retestCount || 0) + 1;
        console.warn(`[TestedPhrasesUnified] WASTE DETECTED: Phrase "${phrase.substring(0, 30)}..." re-tested (${existing.retestCount} times)`);
      } else {
        // New phrase
        memoryRegistry.set(phrase, {
          id: `phrase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          phrase,
          address,
          balanceSats,
          txCount,
          phi: phi || null,
          kappa: kappa || null,
          regime: regime || null,
          testedAt: new Date(),
          retestCount: 0,
        });
      }
    }
  }

  /**
   * Get phrases with non-zero balance (hits)
   */
  async getBalanceHits(): Promise<TestedPhrase[]> {
    const registry = await getRegistry();
    
    if (registry) {
      return registry.getBalanceHits();
    } else {
      // In-memory fallback
      return Array.from(memoryRegistry.values()).filter(p => (p.balanceSats || 0) > 0);
    }
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
    const registry = await getRegistry();
    
    if (registry) {
      return registry.getStats();
    } else {
      // In-memory fallback
      const cached = Array.from(memoryRegistry.values());
      return {
        totalTested: cached.length,
        wastedRetests: cached.reduce((sum, p) => sum + (p.retestCount || 0), 0),
        uniqueAddresses: new Set(cached.map(p => p.address).filter(Boolean)).size,
        balanceHits: cached.filter(p => (p.balanceSats || 0) > 0).length,
        emptyAddresses: cached.filter(p => (p.balanceSats || 0) === 0).length,
      };
    }
  }

  /**
   * Get phrases that have been wastefully re-tested
   */
  async getWastedRetests(minRetests: number = 1): Promise<TestedPhrase[]> {
    const registry = await getRegistry();
    
    if (registry) {
      return registry.getWastedRetests(minRetests);
    } else {
      // In-memory fallback
      return Array.from(memoryRegistry.values()).filter(p => (p.retestCount || 0) >= minRetests);
    }
  }

  /**
   * Clean old entries
   */
  async prune(keepDays: number = 30): Promise<{ removed: number }> {
    const registry = await getRegistry();
    
    if (registry) {
      return registry.prune(keepDays);
    } else {
      // In-memory fallback - simple cleanup
      const cutoffDate = new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000);
      let removed = 0;
      
      for (const [phrase, data] of memoryRegistry.entries()) {
        if (data.testedAt < cutoffDate && data.balanceSats === 0 && data.retestCount === 0) {
          memoryRegistry.delete(phrase);
          removed++;
        }
      }
      
      return { removed };
    }
  }

  /**
   * Get total count
   */
  async count(): Promise<number> {
    const registry = await getRegistry();
    
    if (registry) {
      return registry.count();
    } else {
      // In-memory fallback
      return memoryRegistry.size;
    }
  }
}

export const testedPhrasesUnified = new TestedPhrasesUnified();
