/**
 * Tested-Empty Address Tracker
 * 
 * Prevents re-testing addresses that have already been checked and found to have zero balance.
 * This solves the problem of repeatedly checking the same 148 high-Φ addresses that are empty.
 * 
 * UPDATED: Now uses PostgreSQL database (testedPhrases table) as primary storage
 * with in-memory cache for fast lookups.
 */

import { db } from './db';
import { testedPhrases } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import * as crypto from 'crypto';

export interface TestedEmptyEntry {
  address: string;
  testedAt: number;
  phi: number;
  source: string;
}

class TestedEmptyTracker {
  private addressCache: Set<string> = new Set();
  private cacheLoaded = false;
  private readonly CACHE_REFRESH_INTERVAL = 60000;
  
  constructor() {
    this.loadCacheFromDb();
    setInterval(() => this.loadCacheFromDb(), this.CACHE_REFRESH_INTERVAL);
  }
  
  private async loadCacheFromDb(): Promise<void> {
    if (!db) return;
    
    try {
      const emptyAddresses = await db.select({ address: testedPhrases.address })
        .from(testedPhrases)
        .where(and(
          eq(testedPhrases.balanceSats, 0),
          sql`${testedPhrases.address} IS NOT NULL`
        ))
        .limit(50000);
      
      this.addressCache.clear();
      for (const row of emptyAddresses) {
        if (row.address) {
          this.addressCache.add(row.address);
        }
      }
      
      if (!this.cacheLoaded) {
        console.log(`[TestedEmpty] Loaded ${this.addressCache.size} tested-empty addresses from DB`);
        this.cacheLoaded = true;
      }
    } catch (error) {
      console.error('[TestedEmpty] Error loading from DB:', error);
    }
  }
  
  /**
   * Check if an address has been tested and found empty
   */
  isTestedEmpty(address: string): boolean {
    return this.addressCache.has(address);
  }
  
  /**
   * Check if an address is tested-empty (async DB query for accuracy)
   */
  async isTestedEmptyAsync(address: string): Promise<boolean> {
    if (this.addressCache.has(address)) return true;
    
    if (!db) return false;
    
    try {
      const result = await db.select({ address: testedPhrases.address })
        .from(testedPhrases)
        .where(and(
          eq(testedPhrases.address, address),
          eq(testedPhrases.balanceSats, 0)
        ))
        .limit(1);
      
      if (result.length > 0) {
        this.addressCache.add(address);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[TestedEmpty] DB query error:', error);
      return false;
    }
  }
  
  /**
   * Mark an address as tested and empty (stores in DB)
   */
  async markAsTestedEmpty(address: string, phi: number, source: string): Promise<void> {
    if (this.addressCache.has(address)) return;
    
    this.addressCache.add(address);
    
    if (!db) return;
    
    try {
      const id = crypto.createHash('sha256').update(`${address}-${Date.now()}`).digest('hex').substring(0, 64);
      
      await db.insert(testedPhrases).values({
        id,
        phrase: `addr:${address}`,
        address,
        balanceSats: 0,
        txCount: 0,
        phi,
        regime: source,
        testedAt: new Date(),
        retestCount: 0,
      }).onConflictDoNothing();
      
      console.log(`[TestedEmpty] ⊗ Marked as tested-empty: ${address.substring(0, 20)}... (Φ=${phi.toFixed(3)})`);
    } catch (error) {
      console.error('[TestedEmpty] Error marking as tested-empty:', error);
    }
  }
  
  /**
   * Remove an address from tested-empty list (e.g., if balance appears later)
   */
  async unmark(address: string): Promise<void> {
    this.addressCache.delete(address);
    
    if (!db) return;
    
    try {
      await db.delete(testedPhrases)
        .where(eq(testedPhrases.address, address));
      console.log(`[TestedEmpty] ✓ Unmarked: ${address.substring(0, 20)}...`);
    } catch (error) {
      console.error('[TestedEmpty] Error unmarking:', error);
    }
  }
  
  /**
   * Get statistics about tested-empty addresses
   */
  getStats(): {
    total: number;
    recentCount: number;
    oldestTimestamp: number;
    newestTimestamp: number;
  } {
    return {
      total: this.addressCache.size,
      recentCount: 0,
      oldestTimestamp: 0,
      newestTimestamp: Date.now(),
    };
  }
  
  /**
   * Export addresses for analysis
   */
  exportAddresses(): TestedEmptyEntry[] {
    return Array.from(this.addressCache).map(address => ({
      address,
      testedAt: Date.now(),
      phi: 0,
      source: 'db',
    }));
  }
  
  /**
   * Force cache refresh
   */
  async flush(): Promise<void> {
    await this.loadCacheFromDb();
  }
}

export const testedEmptyTracker = new TestedEmptyTracker();
