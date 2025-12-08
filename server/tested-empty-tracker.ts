/**
 * Tested-Empty Address Tracker
 * 
 * Prevents re-testing addresses that have already been checked and found to have zero balance.
 * This solves the problem of repeatedly checking the same 148 high-Φ addresses that are empty.
 * 
 * Key Features:
 * - In-memory Set for fast lookup
 * - Persistent storage to survive restarts
 * - Automatic cleanup of old entries (optional, configurable)
 * - Thread-safe operations
 */

import * as fs from 'fs';
import * as path from 'path';

export interface TestedEmptyEntry {
  address: string;
  testedAt: number;
  phi: number;
  source: string;
}

class TestedEmptyTracker {
  private testedEmpty: Set<string> = new Set();
  private testedEmptyDetails: Map<string, TestedEmptyEntry> = new Map();
  private readonly STORAGE_FILE = 'data/tested-empty-addresses.json';
  private readonly MAX_AGE_DAYS = 30; // Re-test addresses after 30 days
  private saveTimeout: NodeJS.Timeout | null = null;
  private initialized = false;
  
  constructor() {
    this.initialize();
  }
  
  private async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await this.loadFromDisk();
      this.initialized = true;
      console.log(`[TestedEmpty] Initialized with ${this.testedEmpty.size} tested-empty addresses`);
    } catch (error) {
      console.error('[TestedEmpty] Initialization error:', error);
      this.initialized = true; // Continue with empty set
    }
  }
  
  /**
   * Check if an address has been tested and found empty
   */
  isTestedEmpty(address: string): boolean {
    return this.testedEmpty.has(address);
  }
  
  /**
   * Mark an address as tested and empty
   */
  markAsTestedEmpty(address: string, phi: number, source: string): void {
    if (this.testedEmpty.has(address)) {
      return; // Already marked
    }
    
    const entry: TestedEmptyEntry = {
      address,
      testedAt: Date.now(),
      phi,
      source,
    };
    
    this.testedEmpty.add(address);
    this.testedEmptyDetails.set(address, entry);
    
    // Schedule save to disk
    this.scheduleSave();
    
    console.log(`[TestedEmpty] ⊗ Marked as tested-empty: ${address.substring(0, 20)}... (Φ=${phi.toFixed(3)}, source=${source})`);
  }
  
  /**
   * Remove an address from tested-empty list (e.g., if balance appears later)
   */
  unmark(address: string): void {
    if (this.testedEmpty.delete(address)) {
      this.testedEmptyDetails.delete(address);
      this.scheduleSave();
      console.log(`[TestedEmpty] ✓ Unmarked: ${address.substring(0, 20)}...`);
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
    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;
    let recentCount = 0;
    let oldestTimestamp = now;
    let newestTimestamp = 0;
    
    for (const entry of this.testedEmptyDetails.values()) {
      if (now - entry.testedAt < ONE_DAY) {
        recentCount++;
      }
      if (entry.testedAt < oldestTimestamp) {
        oldestTimestamp = entry.testedAt;
      }
      if (entry.testedAt > newestTimestamp) {
        newestTimestamp = entry.testedAt;
      }
    }
    
    return {
      total: this.testedEmpty.size,
      recentCount,
      oldestTimestamp,
      newestTimestamp,
    };
  }
  
  /**
   * Clean up old entries that are past their expiration
   */
  cleanupOldEntries(): number {
    const now = Date.now();
    const MAX_AGE_MS = this.MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    let removed = 0;
    
    for (const [address, entry] of this.testedEmptyDetails.entries()) {
      if (now - entry.testedAt > MAX_AGE_MS) {
        this.testedEmpty.delete(address);
        this.testedEmptyDetails.delete(address);
        removed++;
      }
    }
    
    if (removed > 0) {
      this.scheduleSave();
      console.log(`[TestedEmpty] 🧹 Cleaned up ${removed} old entries (>${this.MAX_AGE_DAYS} days)`);
    }
    
    return removed;
  }
  
  /**
   * Export addresses for analysis
   */
  exportAddresses(): TestedEmptyEntry[] {
    return Array.from(this.testedEmptyDetails.values());
  }
  
  /**
   * Load tested-empty addresses from disk
   */
  private async loadFromDisk(): Promise<void> {
    try {
      const dataDir = path.dirname(this.STORAGE_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      if (!fs.existsSync(this.STORAGE_FILE)) {
        console.log('[TestedEmpty] No existing data file, starting fresh');
        return;
      }
      
      const data = JSON.parse(fs.readFileSync(this.STORAGE_FILE, 'utf8'));
      const entries: TestedEmptyEntry[] = data.entries || [];
      
      for (const entry of entries) {
        this.testedEmpty.add(entry.address);
        this.testedEmptyDetails.set(entry.address, entry);
      }
      
      console.log(`[TestedEmpty] Loaded ${entries.length} tested-empty addresses from disk`);
      
      // Clean up old entries on load
      this.cleanupOldEntries();
    } catch (error) {
      console.error('[TestedEmpty] Error loading from disk:', error);
    }
  }
  
  /**
   * Save tested-empty addresses to disk (debounced)
   */
  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = setTimeout(() => {
      this.saveToDisk();
    }, 5000); // Save 5 seconds after last change
  }
  
  /**
   * Immediately save to disk
   */
  private saveToDisk(): void {
    try {
      const dataDir = path.dirname(this.STORAGE_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      const entries = Array.from(this.testedEmptyDetails.values());
      const data = {
        version: '1.0',
        savedAt: Date.now(),
        entries,
      };
      
      fs.writeFileSync(this.STORAGE_FILE, JSON.stringify(data, null, 2), 'utf8');
      console.log(`[TestedEmpty] 💾 Saved ${entries.length} tested-empty addresses to disk`);
    } catch (error) {
      console.error('[TestedEmpty] Error saving to disk:', error);
    }
  }
  
  /**
   * Force immediate save (for graceful shutdown)
   */
  async flush(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.saveToDisk();
  }
}

// Singleton instance
export const testedEmptyTracker = new TestedEmptyTracker();
