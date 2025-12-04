/**
 * Balance Monitor Service
 * 
 * Provides periodic balance refresh for all tracked addresses.
 * Detects balance changes and sends notifications.
 * Uses PostgreSQL for persistent state storage.
 */

import {
  refreshAllBalances,
  getBalanceHits,
  getActiveBalanceHits,
  getBalanceChanges,
  getStaleBalanceHits,
  type BalanceChangeEvent,
} from './blockchain-scanner';

import { db } from './db';
import { balanceMonitorState } from '@shared/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';

const STATE_FILE = 'data/balance-monitor-state.json';
const STATE_ID = 'default';

interface BalanceMonitorStateLocal {
  enabled: boolean;
  refreshIntervalMinutes: number;
  lastRefreshTime: string | null;
  lastRefreshResult: {
    total: number;
    refreshed: number;
    changed: number;
    errors: number;
    duration: number;
  } | null;
  totalRefreshes: number;
  isRefreshing: boolean;
}

const DEFAULT_REFRESH_INTERVAL_MINUTES = 30;

class BalanceMonitor {
  private state: BalanceMonitorStateLocal;
  private refreshInterval: NodeJS.Timeout | null = null;
  private isCurrentlyRefreshing = false;
  private stateLoaded: Promise<void>;

  constructor() {
    // Initialize with defaults, then load from DB/JSON
    this.state = {
      enabled: true,
      refreshIntervalMinutes: DEFAULT_REFRESH_INTERVAL_MINUTES,
      lastRefreshTime: null,
      lastRefreshResult: null,
      totalRefreshes: 0,
      isRefreshing: false,
    };
    this.stateLoaded = this.loadState();
    this.stateLoaded.then(() => {
      console.log(`[BalanceMonitor] Initialized - enabled=${this.state.enabled}, interval=${this.state.refreshIntervalMinutes}min`);
      if (this.state.enabled) {
        this.startRefreshLoop();
      }
    });
  }

  private async loadState(): Promise<void> {
    // Try PostgreSQL first
    if (db) {
      try {
        const rows = await db.select().from(balanceMonitorState).where(eq(balanceMonitorState.id, STATE_ID));
        if (rows.length > 0) {
          const row = rows[0];
          this.state = {
            enabled: row.enabled,
            refreshIntervalMinutes: row.refreshIntervalMinutes,
            lastRefreshTime: row.lastRefreshTime?.toISOString() || null,
            lastRefreshResult: row.lastRefreshTotal !== null ? {
              total: row.lastRefreshTotal || 0,
              refreshed: row.lastRefreshUpdated || 0,
              changed: row.lastRefreshChanged || 0,
              errors: row.lastRefreshErrors || 0,
              duration: 0,
            } : null,
            totalRefreshes: row.totalRefreshes,
            isRefreshing: false,
          };
          console.log(`[BalanceMonitor] Loaded state from PostgreSQL: enabled=${this.state.enabled}`);
          return;
        }
        console.log(`[BalanceMonitor] No PostgreSQL state found, checking JSON...`);
      } catch (error) {
        console.error('[BalanceMonitor] PostgreSQL load error:', error);
      }
    }

    // Try JSON file for migration
    try {
      if (fs.existsSync(STATE_FILE)) {
        const data = fs.readFileSync(STATE_FILE, 'utf-8');
        const parsed = JSON.parse(data);
        this.state = {
          ...parsed,
          isRefreshing: false,
        };
        console.log(`[BalanceMonitor] Loaded state from JSON: enabled=${this.state.enabled}`);
        
        // Migrate to PostgreSQL
        if (db) {
          try {
            await db.insert(balanceMonitorState).values({
              id: STATE_ID,
              enabled: this.state.enabled,
              refreshIntervalMinutes: this.state.refreshIntervalMinutes,
              lastRefreshTime: this.state.lastRefreshTime ? new Date(this.state.lastRefreshTime) : null,
              lastRefreshTotal: this.state.lastRefreshResult?.total || 0,
              lastRefreshUpdated: this.state.lastRefreshResult?.refreshed || 0,
              lastRefreshChanged: this.state.lastRefreshResult?.changed || 0,
              lastRefreshErrors: this.state.lastRefreshResult?.errors || 0,
              totalRefreshes: this.state.totalRefreshes,
              isRefreshing: false,
            }).onConflictDoNothing();
            console.log(`[BalanceMonitor] Migrated state to PostgreSQL`);
          } catch (error) {
            console.error('[BalanceMonitor] Failed to migrate state to PostgreSQL:', error);
          }
        }
        return;
      }
    } catch (error) {
      console.error('[BalanceMonitor] Error loading JSON state:', error);
    }
    
    // Default state - insert into PostgreSQL
    if (db) {
      try {
        await db.insert(balanceMonitorState).values({
          id: STATE_ID,
          enabled: this.state.enabled,
          refreshIntervalMinutes: this.state.refreshIntervalMinutes,
          totalRefreshes: 0,
          isRefreshing: false,
        }).onConflictDoNothing();
        console.log(`[BalanceMonitor] Created default state in PostgreSQL`);
      } catch (error) {
        console.error('[BalanceMonitor] Failed to create default state:', error);
      }
    }
  }

  private async saveState(): Promise<void> {
    // Save to PostgreSQL using upsert
    if (db) {
      try {
        await db.insert(balanceMonitorState).values({
          id: STATE_ID,
          enabled: this.state.enabled,
          refreshIntervalMinutes: this.state.refreshIntervalMinutes,
          lastRefreshTime: this.state.lastRefreshTime ? new Date(this.state.lastRefreshTime) : null,
          lastRefreshTotal: this.state.lastRefreshResult?.total || 0,
          lastRefreshUpdated: this.state.lastRefreshResult?.refreshed || 0,
          lastRefreshChanged: this.state.lastRefreshResult?.changed || 0,
          lastRefreshErrors: this.state.lastRefreshResult?.errors || 0,
          totalRefreshes: this.state.totalRefreshes,
          isRefreshing: this.state.isRefreshing,
        }).onConflictDoUpdate({
          target: balanceMonitorState.id,
          set: {
            enabled: this.state.enabled,
            refreshIntervalMinutes: this.state.refreshIntervalMinutes,
            lastRefreshTime: this.state.lastRefreshTime ? new Date(this.state.lastRefreshTime) : null,
            lastRefreshTotal: this.state.lastRefreshResult?.total || 0,
            lastRefreshUpdated: this.state.lastRefreshResult?.refreshed || 0,
            lastRefreshChanged: this.state.lastRefreshResult?.changed || 0,
            lastRefreshErrors: this.state.lastRefreshResult?.errors || 0,
            totalRefreshes: this.state.totalRefreshes,
            isRefreshing: this.state.isRefreshing,
            updatedAt: new Date(),
          }
        });
        return;
      } catch (error) {
        console.error('[BalanceMonitor] PostgreSQL save error, falling back to JSON:', error);
      }
    }
    
    // Fallback to JSON
    try {
      if (!fs.existsSync('data')) {
        fs.mkdirSync('data', { recursive: true });
      }
      fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2));
    } catch (error) {
      console.error('[BalanceMonitor] Error saving state:', error);
    }
  }

  /**
   * Start the periodic refresh loop
   */
  private startRefreshLoop(): void {
    if (this.refreshInterval) return;
    
    const intervalMs = this.state.refreshIntervalMinutes * 60 * 1000;
    
    this.refreshInterval = setInterval(async () => {
      await this.performRefresh();
    }, intervalMs);
    
    console.log(`[BalanceMonitor] Refresh loop started (interval: ${this.state.refreshIntervalMinutes}min)`);
    
    // Check if we should do an immediate refresh based on stale data
    const staleHits = getStaleBalanceHits(this.state.refreshIntervalMinutes);
    if (staleHits.length > 0) {
      console.log(`[BalanceMonitor] Found ${staleHits.length} stale addresses, scheduling immediate refresh`);
      setTimeout(() => this.performRefresh(), 5000);
    }
  }

  /**
   * Stop the periodic refresh loop
   */
  private stopRefreshLoop(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      console.log('[BalanceMonitor] Refresh loop stopped');
    }
  }

  /**
   * Perform a balance refresh
   */
  async performRefresh(): Promise<{
    total: number;
    refreshed: number;
    changed: number;
    errors: number;
    changes: BalanceChangeEvent[];
    duration: number;
  }> {
    if (this.isCurrentlyRefreshing) {
      console.log('[BalanceMonitor] Refresh already in progress, skipping');
      return {
        total: 0,
        refreshed: 0,
        changed: 0,
        errors: 0,
        changes: [],
        duration: 0,
      };
    }

    this.isCurrentlyRefreshing = true;
    this.state.isRefreshing = true;
    this.saveState();

    console.log('[BalanceMonitor] Starting scheduled balance refresh...');
    
    try {
      const result = await refreshAllBalances({
        delayMs: 1000, // 1 second delay between API calls
        onProgress: (current, total, address) => {
          if (current % 5 === 0 || current === total) {
            console.log(`[BalanceMonitor] Progress: ${current}/${total} - ${address.slice(0, 16)}...`);
          }
        },
      });

      this.state.lastRefreshTime = new Date().toISOString();
      this.state.lastRefreshResult = {
        total: result.total,
        refreshed: result.refreshed,
        changed: result.changed,
        errors: result.errors,
        duration: result.duration,
      };
      this.state.totalRefreshes++;
      this.state.isRefreshing = false;
      this.saveState();

      if (result.changed > 0) {
        console.log(`\n🚨 [BalanceMonitor] ALERT: ${result.changed} balance(s) changed during refresh!`);
        for (const change of result.changes) {
          const diffBTC = Math.abs(change.difference) / 100000000;
          const direction = change.difference > 0 ? 'increased' : 'decreased';
          console.log(`   📍 ${change.address.slice(0, 20)}... ${direction} by ${diffBTC.toFixed(8)} BTC`);
        }
      }

      return result;
    } catch (error) {
      console.error('[BalanceMonitor] Error during refresh:', error);
      this.state.isRefreshing = false;
      this.saveState();
      throw error;
    } finally {
      this.isCurrentlyRefreshing = false;
    }
  }

  /**
   * Enable the balance monitor
   */
  enable(): { success: boolean; message: string } {
    if (this.state.enabled) {
      return { success: true, message: 'Balance monitor is already enabled.' };
    }

    const balanceHits = getBalanceHits();
    if (balanceHits.length === 0) {
      return { 
        success: false, 
        message: 'No balance hits to monitor. Discover some addresses first.' 
      };
    }

    this.state.enabled = true;
    this.saveState();
    this.startRefreshLoop();

    return { 
      success: true, 
      message: `Balance monitor enabled. Monitoring ${balanceHits.length} addresses every ${this.state.refreshIntervalMinutes} minutes.` 
    };
  }

  /**
   * Disable the balance monitor
   */
  disable(): { success: boolean; message: string } {
    this.state.enabled = false;
    this.saveState();
    this.stopRefreshLoop();

    return { success: true, message: 'Balance monitor disabled.' };
  }

  /**
   * Set the refresh interval
   */
  setRefreshInterval(minutes: number): { success: boolean; message: string } {
    if (minutes < 5) {
      return { success: false, message: 'Minimum refresh interval is 5 minutes.' };
    }
    if (minutes > 1440) {
      return { success: false, message: 'Maximum refresh interval is 1440 minutes (24 hours).' };
    }

    this.state.refreshIntervalMinutes = minutes;
    this.saveState();

    // Restart the loop if enabled
    if (this.state.enabled) {
      this.stopRefreshLoop();
      this.startRefreshLoop();
    }

    return { 
      success: true, 
      message: `Refresh interval set to ${minutes} minutes.` 
    };
  }

  /**
   * Trigger an immediate refresh
   */
  async triggerRefresh(): Promise<{
    success: boolean;
    message: string;
    result?: {
      total: number;
      refreshed: number;
      changed: number;
      errors: number;
      duration: number;
    };
  }> {
    if (this.isCurrentlyRefreshing) {
      return { success: false, message: 'Refresh already in progress.' };
    }

    try {
      const result = await this.performRefresh();
      return {
        success: true,
        message: `Refreshed ${result.refreshed} addresses. ${result.changed} balance(s) changed.`,
        result: {
          total: result.total,
          refreshed: result.refreshed,
          changed: result.changed,
          errors: result.errors,
          duration: result.duration,
        },
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Get the current status of the balance monitor
   */
  getStatus(): {
    enabled: boolean;
    isRefreshing: boolean;
    refreshIntervalMinutes: number;
    lastRefreshTime: string | null;
    lastRefreshResult: BalanceMonitorStateLocal['lastRefreshResult'];
    totalRefreshes: number;
    monitoredAddresses: number;
    activeAddresses: number;
    staleAddresses: number;
    recentChanges: BalanceChangeEvent[];
  } {
    const balanceHits = getBalanceHits();
    const activeHits = getActiveBalanceHits();
    const staleHits = getStaleBalanceHits(this.state.refreshIntervalMinutes);
    const recentChanges = getBalanceChanges().slice(-10); // Last 10 changes

    return {
      enabled: this.state.enabled,
      isRefreshing: this.isCurrentlyRefreshing,
      refreshIntervalMinutes: this.state.refreshIntervalMinutes,
      lastRefreshTime: this.state.lastRefreshTime,
      lastRefreshResult: this.state.lastRefreshResult,
      totalRefreshes: this.state.totalRefreshes,
      monitoredAddresses: balanceHits.length,
      activeAddresses: activeHits.length,
      staleAddresses: staleHits.length,
      recentChanges,
    };
  }
}

// Singleton instance
export const balanceMonitor = new BalanceMonitor();
