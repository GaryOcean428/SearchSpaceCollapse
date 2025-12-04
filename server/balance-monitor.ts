/**
 * Balance Monitor Service
 * 
 * Provides periodic balance refresh for all tracked addresses.
 * Detects balance changes and sends notifications.
 */

import {
  refreshAllBalances,
  getBalanceHits,
  getActiveBalanceHits,
  getBalanceChanges,
  getStaleBalanceHits,
  type BalanceChangeEvent,
} from './blockchain-scanner';

import * as fs from 'fs';

const STATE_FILE = 'data/balance-monitor-state.json';

interface BalanceMonitorState {
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

const DEFAULT_REFRESH_INTERVAL_MINUTES = 0.167; // 10 seconds for faster discovery visibility (6× improvement)

class BalanceMonitor {
  private state: BalanceMonitorState;
  private refreshInterval: NodeJS.Timeout | null = null;
  private isCurrentlyRefreshing = false;

  constructor() {
    this.state = this.loadState();
    console.log(`[BalanceMonitor] Initialized - enabled=${this.state.enabled}, interval=${this.state.refreshIntervalMinutes}min`);
    
    if (this.state.enabled) {
      this.startRefreshLoop();
    }
  }

  private loadState(): BalanceMonitorState {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const data = fs.readFileSync(STATE_FILE, 'utf-8');
        const parsed = JSON.parse(data);
        console.log(`[BalanceMonitor] Loaded state from disk: enabled=${parsed.enabled}`);
        return {
          ...parsed,
          isRefreshing: false, // Always start as not refreshing
        };
      }
    } catch (error) {
      console.error('[BalanceMonitor] Error loading state:', error);
    }
    
    return {
      enabled: true, // Default to enabled
      refreshIntervalMinutes: DEFAULT_REFRESH_INTERVAL_MINUTES,
      lastRefreshTime: null,
      lastRefreshResult: null,
      totalRefreshes: 0,
      isRefreshing: false,
    };
  }

  private saveState(): void {
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
    lastRefreshResult: BalanceMonitorState['lastRefreshResult'];
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
