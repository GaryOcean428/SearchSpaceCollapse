/**
 * Balance Change Monitoring Service
 * 
 * Monitors balance changes for tracked addresses using the balance_change_events table.
 * Integrates with blockchain API router for live balance queries.
 */

import { db, withDbRetry } from './db';
import { balanceChangeEvents, balanceHits } from '@shared/schema';
import type { BalanceChangeEvent, InsertBalanceChangeEvent, BalanceHit } from '@shared/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { getAddressData } from './blockchain-api-router';

export type ChangeType = 'deposit' | 'withdrawal';

export interface BalanceChange {
  id: string;
  balanceHitId: string | null;
  address: string;
  previousBalanceSats: number;
  newBalanceSats: number;
  deltaSats: number;
  changeType: ChangeType;
  detectedAt: Date;
}

export interface MonitoringStatus {
  isRunning: boolean;
  monitoredAddresses: number;
  lastCheckTime: Date | null;
  intervalMs: number;
}

class BalanceMonitorService {
  private monitoredAddresses: Set<string> = new Set();
  private intervalHandle: NodeJS.Timeout | null = null;
  private lastCheckTime: Date | null = null;
  private isRunning: boolean = false;
  private defaultIntervalMs: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    console.log('[BalanceMonitorService] Initialized');
  }

  /**
   * Record a balance change event in the database
   */
  async recordBalanceChange(
    balanceHitId: string | null,
    address: string,
    previousBalance: number,
    currentBalance: number
  ): Promise<BalanceChange | null> {
    if (!db) {
      console.warn('[BalanceMonitorService] Database not available');
      return null;
    }

    const deltaSats = currentBalance - previousBalance;
    const changeType: ChangeType = deltaSats >= 0 ? 'deposit' : 'withdrawal';

    const record: InsertBalanceChangeEvent = {
      balanceHitId,
      address,
      previousBalanceSats: previousBalance,
      newBalanceSats: currentBalance,
      deltaSats,
      detectedAt: new Date(),
    };

    const result = await withDbRetry(
      async () => {
        const inserted = await db!
          .insert(balanceChangeEvents)
          .values(record)
          .returning();
        return inserted[0];
      },
      'insert-balance-change-event'
    );

    if (!result) {
      console.error('[BalanceMonitorService] Failed to record balance change');
      return null;
    }

    console.log(`[BalanceMonitorService] Recorded ${changeType}: ${address} delta=${deltaSats} sats`);

    return {
      id: result.id,
      balanceHitId: result.balanceHitId,
      address: result.address,
      previousBalanceSats: result.previousBalanceSats,
      newBalanceSats: result.newBalanceSats,
      deltaSats: result.deltaSats,
      changeType,
      detectedAt: result.detectedAt,
    };
  }

  /**
   * Add addresses to the monitoring set
   */
  startMonitoring(addresses: string[]): void {
    for (const addr of addresses) {
      this.monitoredAddresses.add(addr);
    }
    console.log(`[BalanceMonitorService] Now monitoring ${this.monitoredAddresses.size} addresses`);
  }

  /**
   * Remove addresses from monitoring
   */
  stopMonitoringAddresses(addresses: string[]): void {
    for (const addr of addresses) {
      this.monitoredAddresses.delete(addr);
    }
    console.log(`[BalanceMonitorService] Now monitoring ${this.monitoredAddresses.size} addresses`);
  }

  /**
   * Get all currently monitored addresses
   */
  getMonitoredAddresses(): string[] {
    return Array.from(this.monitoredAddresses);
  }

  /**
   * Check balances for all monitored addresses
   * Compare with last known balance from balance_hits table
   * Record changes in balance_change_events
   */
  async checkBalances(): Promise<{ checked: number; changed: number; errors: number }> {
    if (!db) {
      console.warn('[BalanceMonitorService] Database not available');
      return { checked: 0, changed: 0, errors: 0 };
    }

    const addresses = Array.from(this.monitoredAddresses);
    if (addresses.length === 0) {
      console.log('[BalanceMonitorService] No addresses to check');
      return { checked: 0, changed: 0, errors: 0 };
    }

    let checked = 0;
    let changed = 0;
    let errors = 0;

    console.log(`[BalanceMonitorService] Checking ${addresses.length} addresses...`);

    for (const address of addresses) {
      try {
        const balanceHitResult = await withDbRetry(
          async () => {
            return await db!
              .select()
              .from(balanceHits)
              .where(eq(balanceHits.address, address))
              .limit(1);
          },
          'get-balance-hit-for-address'
        );

        const balanceHit = balanceHitResult?.[0];
        const lastKnownBalance = balanceHit?.balanceSats ?? 0;

        const addressData = await getAddressData(address);
        if (!addressData) {
          console.warn(`[BalanceMonitorService] Failed to get data for ${address}`);
          errors++;
          continue;
        }

        checked++;
        const currentBalance = addressData.balance;

        if (currentBalance !== lastKnownBalance) {
          await this.recordBalanceChange(
            balanceHit?.id ?? null,
            address,
            lastKnownBalance,
            currentBalance
          );
          changed++;

          if (balanceHit) {
            await withDbRetry(
              async () => {
                await db!
                  .update(balanceHits)
                  .set({
                    previousBalanceSats: lastKnownBalance,
                    balanceSats: currentBalance,
                    balanceBtc: (currentBalance / 100000000).toFixed(8),
                    balanceChanged: true,
                    changeDetectedAt: new Date(),
                    lastChecked: new Date(),
                    updatedAt: new Date(),
                  })
                  .where(eq(balanceHits.id, balanceHit.id));
              },
              'update-balance-hit-after-change'
            );
          }
        } else {
          if (balanceHit) {
            await withDbRetry(
              async () => {
                await db!
                  .update(balanceHits)
                  .set({
                    lastChecked: new Date(),
                    updatedAt: new Date(),
                  })
                  .where(eq(balanceHits.id, balanceHit.id));
              },
              'update-balance-hit-last-checked'
            );
          }
        }
      } catch (error) {
        console.error(`[BalanceMonitorService] Error checking ${address}:`, error);
        errors++;
      }
    }

    this.lastCheckTime = new Date();
    console.log(`[BalanceMonitorService] Check complete: ${checked} checked, ${changed} changed, ${errors} errors`);

    return { checked, changed, errors };
  }

  /**
   * Get all balance changes for a specific address
   */
  async getBalanceHistory(address: string): Promise<BalanceChange[]> {
    if (!db) {
      return [];
    }

    const result = await withDbRetry(
      async () => {
        return await db!
          .select()
          .from(balanceChangeEvents)
          .where(eq(balanceChangeEvents.address, address))
          .orderBy(desc(balanceChangeEvents.detectedAt));
      },
      'get-balance-history'
    );

    if (!result) {
      return [];
    }

    return result.map((row) => ({
      id: row.id,
      balanceHitId: row.balanceHitId,
      address: row.address,
      previousBalanceSats: row.previousBalanceSats,
      newBalanceSats: row.newBalanceSats,
      deltaSats: row.deltaSats,
      changeType: (row.deltaSats >= 0 ? 'deposit' : 'withdrawal') as ChangeType,
      detectedAt: row.detectedAt,
    }));
  }

  /**
   * Get the most recent balance changes across all addresses
   */
  async getRecentChanges(limit: number = 50): Promise<BalanceChange[]> {
    if (!db) {
      return [];
    }

    const result = await withDbRetry(
      async () => {
        return await db!
          .select()
          .from(balanceChangeEvents)
          .orderBy(desc(balanceChangeEvents.detectedAt))
          .limit(limit);
      },
      'get-recent-changes'
    );

    if (!result) {
      return [];
    }

    return result.map((row) => ({
      id: row.id,
      balanceHitId: row.balanceHitId,
      address: row.address,
      previousBalanceSats: row.previousBalanceSats,
      newBalanceSats: row.newBalanceSats,
      deltaSats: row.deltaSats,
      changeType: (row.deltaSats >= 0 ? 'deposit' : 'withdrawal') as ChangeType,
      detectedAt: row.detectedAt,
    }));
  }

  /**
   * Start the background monitoring loop
   */
  startBackgroundMonitor(intervalMs?: number): void {
    if (this.isRunning) {
      console.log('[BalanceMonitorService] Background monitor already running');
      return;
    }

    const interval = intervalMs ?? this.defaultIntervalMs;
    this.isRunning = true;

    console.log(`[BalanceMonitorService] Starting background monitor with ${interval}ms interval`);

    this.intervalHandle = setInterval(async () => {
      if (this.monitoredAddresses.size > 0) {
        await this.checkBalances();
      }
    }, interval);

    this.checkBalances().catch((err) => {
      console.error('[BalanceMonitorService] Initial check failed:', err);
    });
  }

  /**
   * Stop the background monitoring loop
   */
  stopBackgroundMonitor(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this.isRunning = false;
    console.log('[BalanceMonitorService] Background monitor stopped');
  }

  /**
   * Get current monitoring status
   */
  getStatus(): MonitoringStatus {
    return {
      isRunning: this.isRunning,
      monitoredAddresses: this.monitoredAddresses.size,
      lastCheckTime: this.lastCheckTime,
      intervalMs: this.defaultIntervalMs,
    };
  }

  /**
   * Load addresses from balance_hits table into monitoring set
   */
  async loadAddressesFromBalanceHits(): Promise<number> {
    if (!db) {
      return 0;
    }

    const result = await withDbRetry(
      async () => {
        return await db!
          .select({ address: balanceHits.address })
          .from(balanceHits);
      },
      'load-addresses-from-balance-hits'
    );

    if (!result) {
      return 0;
    }

    for (const row of result) {
      this.monitoredAddresses.add(row.address);
    }

    console.log(`[BalanceMonitorService] Loaded ${result.length} addresses from balance_hits`);
    return result.length;
  }
}

export const balanceMonitorService = new BalanceMonitorService();
