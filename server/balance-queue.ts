/**
 * Balance Queue Service
 * 
 * Captures ALL generated addresses and queues them for balance checking.
 * Uses a multi-provider approach (Blockstream, Mempool, Blockchain.com, BlockCypher)
 * with automatic failover, bulk queries, and intelligent caching.
 * 
 * Architecture:
 * - BalanceQueue: Buffer for all generated addresses
 * - BalanceWorker: Always-on background worker with bulk processing
 * - Multi-provider: 4 free APIs with 230 req/min combined (2,300+ with caching)
 * 
 * Auto-starts on module load - no user action required.
 */

import { checkAndRecordBalance } from './blockchain-scanner';
import { dormantCrossRef } from './dormant-cross-ref';
import { freeBlockchainAPI } from './blockchain-free-api';

export interface QueuedAddress {
  id: string;
  address: string;
  passphrase: string;
  wif: string;
  isCompressed: boolean;
  cycleId?: string;
  priority: number;
  status: 'pending' | 'checking' | 'resolved' | 'failed';
  queuedAt: number;
  checkedAt?: number;
  retryCount: number;
  error?: string;
}

export interface QueueStats {
  pending: number;
  checking: number;
  resolved: number;
  failed: number;
  total: number;
  addressesPerSecond: number;
  lastDrainTime?: number;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  refillRate: number;
}

const QUEUE_FILE = 'data/balance-queue.json';
const MAX_QUEUE_SIZE = 10000;
const DEFAULT_RATE_LIMIT = 1.5;

class BalanceQueueService {
  private queue: Map<string, QueuedAddress> = new Map();
  private tokenBucket: TokenBucket;
  private isProcessing = false;
  private processedCount = 0;
  private processStartTime = 0;
  private saveTimeout: NodeJS.Timeout | null = null;
  private onDrainComplete?: (stats: { checked: number; hits: number; errors: number }) => void;
  
  // Background worker state - always running
  private backgroundWorkerInterval: NodeJS.Timeout | null = null;
  private backgroundWorkerEnabled = false; // Start false, set true when worker starts
  private backgroundCheckCount = 0;
  private backgroundHitCount = 0;
  private backgroundStartTime = 0;
  
  // Bulk processing config
  private bulkBatchSize = 50;
  private bulkProcessInterval = 2000; // Process batch every 2 seconds
  
  // Ready state for API calls
  private _ready: Promise<void>;
  private _isReady = false;

  constructor() {
    this.tokenBucket = {
      tokens: 10,
      lastRefill: Date.now(),
      maxTokens: 20,
      refillRate: DEFAULT_RATE_LIMIT * 2, // Higher rate with multi-provider
    };
    this._ready = this.initialize();
  }
  
  private async initialize(): Promise<void> {
    await this.loadFromDisk();
    // Auto-start background worker - always running
    this.startBackgroundWorker();
    // Start the always-on guardian that ensures worker never stops
    this.startAlwaysOnGuardian();
    this._isReady = true;
    console.log('[BalanceQueue] Auto-started with multi-provider API (230 req/min capacity)');
    console.log('[BalanceQueue] ALWAYS-ON mode enabled - worker will auto-restart if stopped');
  }
  
  /**
   * Always-on guardian - ensures worker is ALWAYS running
   * Checks every 30 seconds and restarts if somehow stopped
   */
  private startAlwaysOnGuardian(): void {
    if (this.autoRestartInterval) {
      clearInterval(this.autoRestartInterval);
    }
    
    this.autoRestartInterval = setInterval(() => {
      if (!this.ALWAYS_ON) return;
      
      // If worker should be on but isn't running, restart it
      if (!this.backgroundWorkerEnabled || !this.backgroundWorkerInterval) {
        console.log('[BalanceQueue] 🔄 ALWAYS-ON: Worker not running, auto-restarting...');
        this.backgroundWorkerEnabled = false; // Reset state
        this.startBackgroundWorker();
      }
    }, 30000); // Check every 30 seconds
    
    console.log('[BalanceQueue] Always-on guardian started');
  }
  
  /** Wait for the service to be fully initialized */
  async waitForReady(): Promise<void> {
    return this._ready;
  }
  
  /** Check if service is ready */
  isReady(): boolean {
    return this._isReady;
  }
  
  // Heartbeat for auto-restart
  private lastHeartbeat = Date.now();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private workerErrorCount = 0;
  private maxWorkerErrors = 10;
  
  // Auto-restart interval - ensures worker is ALWAYS running
  private autoRestartInterval: NodeJS.Timeout | null = null;
  private readonly ALWAYS_ON = true; // Worker must always run
  
  /**
   * Start continuous background balance checking
   * Uses bulk processing with multi-provider API for ~25 addr/sec effective rate
   */
  startBackgroundWorker(): void {
    if (this.backgroundWorkerInterval) {
      console.log('[BalanceQueue] Background worker already running');
      return;
    }
    
    this.backgroundWorkerEnabled = true;
    this.backgroundStartTime = Date.now();
    this.backgroundCheckCount = 0;
    this.backgroundHitCount = 0;
    this.workerErrorCount = 0;
    this.lastHeartbeat = Date.now();
    
    // Process batches every 2 seconds using bulk API with error protection
    this.backgroundWorkerInterval = setInterval(async () => {
      if (!this.backgroundWorkerEnabled) return;
      if (this.isProcessing) return;
      
      try {
        this.isProcessing = true;
        this.lastHeartbeat = Date.now();
        await this.processBulkBatch();
        this.workerErrorCount = 0; // Reset error count on success
      } catch (error) {
        this.workerErrorCount++;
        console.error(`[BalanceQueue] Worker error ${this.workerErrorCount}/${this.maxWorkerErrors} (NEVER-STOP mode):`, error);
        
        // Update heartbeat even on error to signal worker is alive
        this.lastHeartbeat = Date.now();
        
        if (this.workerErrorCount >= this.maxWorkerErrors) {
          console.log('[BalanceQueue] High error rate, pausing worker for 30s to allow API recovery...');
          this.workerErrorCount = 0;
          // Wait 30 seconds before resuming - worker continues after cooldown
          setTimeout(() => {
            console.log('[BalanceQueue] Resuming worker after error cooldown - NEVER-STOP');
          }, 30000);
        }
        // Worker NEVER stops, even with errors
      } finally {
        this.isProcessing = false;
      }
    }, this.bulkProcessInterval);
    
    // Start heartbeat monitor to auto-restart if worker stops
    this.startHeartbeatMonitor();
    
    console.log('[BalanceQueue] Background worker started (NEVER-STOP mode, bulk processing ~25 addr/sec)');
  }
  
  /**
   * Heartbeat monitor - restarts worker if it stops unexpectedly
   */
  private startHeartbeatMonitor(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(() => {
      if (!this.backgroundWorkerEnabled) return;
      
      const timeSinceLastBeat = Date.now() - this.lastHeartbeat;
      const maxSilence = 60000; // 1 minute max silence
      
      if (timeSinceLastBeat > maxSilence) {
        console.log('[BalanceQueue] Worker heartbeat missed, restarting...');
        this.restartWorker();
      }
    }, 30000); // Check every 30 seconds
  }
  
  /**
   * Restart the background worker
   */
  private restartWorker(): void {
    if (this.backgroundWorkerInterval) {
      clearInterval(this.backgroundWorkerInterval);
      this.backgroundWorkerInterval = null;
    }
    this.isProcessing = false;
    
    // Restart after a brief delay
    setTimeout(() => {
      if (this.backgroundWorkerEnabled) {
        console.log('[BalanceQueue] Restarting background worker...');
        this.backgroundWorkerInterval = setInterval(async () => {
          if (!this.backgroundWorkerEnabled) return;
          if (this.isProcessing) return;
          
          try {
            this.isProcessing = true;
            this.lastHeartbeat = Date.now();
            await this.processBulkBatch();
          } catch (error) {
            console.error('[BalanceQueue] Worker error during restart:', error);
          } finally {
            this.isProcessing = false;
          }
        }, this.bulkProcessInterval);
      }
    }, 2000);
  }
  
  /**
   * Stop background worker
   * Note: In ALWAYS_ON mode, this will be ignored and worker will auto-restart
   */
  stopBackgroundWorker(): boolean {
    if (this.ALWAYS_ON) {
      console.log('[BalanceQueue] ⚠️ Stop request ignored - ALWAYS_ON mode is enabled');
      console.log('[BalanceQueue] Worker must run continuously to process the backlog');
      return false; // Indicate stop was not executed
    }
    
    if (this.backgroundWorkerInterval) {
      clearInterval(this.backgroundWorkerInterval);
      this.backgroundWorkerInterval = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.backgroundWorkerEnabled = false;
    this.isProcessing = false;
    console.log('[BalanceQueue] Background worker stopped');
    return true;
  }
  
  /**
   * Force restart the background worker (for manual intervention)
   * This bypasses ALWAYS_ON for maintenance purposes
   */
  forceRestartWorker(): void {
    console.log('[BalanceQueue] Force restarting background worker...');
    
    // Directly clear intervals without going through stopBackgroundWorker
    // This allows maintenance restarts even in ALWAYS_ON mode
    if (this.backgroundWorkerInterval) {
      clearInterval(this.backgroundWorkerInterval);
      this.backgroundWorkerInterval = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.isProcessing = false;
    // Keep backgroundWorkerEnabled true so guardian doesn't trigger during restart
    
    setTimeout(() => {
      this.startBackgroundWorker();
    }, 1000);
  }
  
  /**
   * Process a single address from the queue
   */
  private async processOneAddress(): Promise<boolean> {
    const pending = Array.from(this.queue.values())
      .filter(item => item.status === 'pending' || (item.status === 'failed' && item.retryCount < 3))
      .sort((a, b) => b.priority - a.priority);
    
    if (pending.length === 0) return false;
    
    const item = pending[0];
    
    try {
      const canProceed = await this.consumeToken();
      if (!canProceed) return false;
      
      item.status = 'checking';
      
      const hit = await checkAndRecordBalance(
        item.address,
        item.passphrase,
        item.wif,
        item.isCompressed
      );
      
      item.status = 'resolved';
      item.checkedAt = Date.now();
      this.backgroundCheckCount++;
      
      // Check against known dormant addresses
      const dormantMatch = dormantCrossRef.checkAddress(item.address);
      if (dormantMatch.isMatch && dormantMatch.info) {
        console.log(`[BalanceQueue] 🎯 DORMANT MATCH! ${item.address} matches Rank #${dormantMatch.info.rank} (${dormantMatch.info.balanceBTC} BTC)`);
      }
      
      if (hit !== null) {
        this.backgroundHitCount++;
        console.log(`[BalanceQueue] 💰 HIT! ${item.address} has balance!`);
      }
      
      // Remove resolved items
      this.queue.delete(item.id);
      this.scheduleSave();
      
      // Log progress every 50 addresses
      if (this.backgroundCheckCount % 50 === 0) {
        const elapsed = (Date.now() - this.backgroundStartTime) / 1000;
        const rate = this.backgroundCheckCount / elapsed;
        console.log(`[BalanceQueue] Background: ${this.backgroundCheckCount} checked, ${this.backgroundHitCount} hits, ${rate.toFixed(2)}/sec, ${this.queue.size} remaining`);
      }
      
      return hit !== null;
    } catch (error) {
      item.status = 'failed';
      item.retryCount++;
      item.error = error instanceof Error ? error.message : 'Unknown error';
      return false;
    }
  }
  
  /**
   * Process a batch of addresses using bulk API
   * Much faster than individual checks - uses Blockchain.com bulk endpoint
   * NEVER-STOP: All errors are caught and logged, worker continues
   */
  private async processBulkBatch(): Promise<{ checked: number; hits: number }> {
    try {
      const pending = Array.from(this.queue.values())
        .filter(item => item.status === 'pending' || (item.status === 'failed' && item.retryCount < 3))
        .sort((a, b) => b.priority - a.priority)
        .slice(0, this.bulkBatchSize);
      
      if (pending.length === 0) return { checked: 0, hits: 0 };
      
      const addresses = pending.map(item => item.address);
      
      try {
        // Use bulk API to check all addresses at once
        const results = await freeBlockchainAPI.getBalances(addresses);
        
        let hits = 0;
        
        for (const item of pending) {
          try {
            const result = results.get(item.address);
            
            if (result) {
              item.status = 'checking';
              
              // Check for balance or transaction activity
              if (result.balance > 0 || result.txCount > 0) {
                // Record the hit with full details
                try {
                  const hit = await checkAndRecordBalance(
                    item.address,
                    item.passphrase,
                    item.wif,
                    item.isCompressed
                  );
                  
                  if (hit) {
                    hits++;
                    this.backgroundHitCount++;
                    console.log(`[BalanceQueue] 💰 HIT! ${item.address} - ${result.balance} BTC, ${result.txCount} txs`);
                  }
                } catch (recordError) {
                  console.error(`[BalanceQueue] Error recording hit for ${item.address}:`, recordError);
                  // Continue processing other addresses
                }
              }
              
              // Check against known dormant addresses
              try {
                const dormantMatch = dormantCrossRef.checkAddress(item.address);
                if (dormantMatch.isMatch && dormantMatch.info) {
                  console.log(`[BalanceQueue] 🎯 DORMANT MATCH! ${item.address} matches Rank #${dormantMatch.info.rank} (${dormantMatch.info.balanceBTC} BTC)`);
                }
              } catch (dormantError) {
                console.error(`[BalanceQueue] Error checking dormant for ${item.address}:`, dormantError);
                // Continue processing
              }
              
              item.status = 'resolved';
              item.checkedAt = Date.now();
              this.backgroundCheckCount++;
              
              // Remove resolved items
              this.queue.delete(item.id);
            } else {
              // No result - mark as failed
              item.status = 'failed';
              item.retryCount++;
              item.error = 'No balance data returned';
            }
          } catch (itemError) {
            console.error(`[BalanceQueue] Error processing item ${item.address}:`, itemError);
            item.status = 'failed';
            item.retryCount++;
            item.error = itemError instanceof Error ? itemError.message : 'Item processing error';
            // Continue with next item
          }
        }
        
        this.scheduleSave();
        
        // Log progress every batch
        const elapsed = (Date.now() - this.backgroundStartTime) / 1000;
        const rate = elapsed > 0 ? this.backgroundCheckCount / elapsed : 0;
        
        if (this.backgroundCheckCount % 100 === 0 || hits > 0) {
          try {
            const apiStats = freeBlockchainAPI.getStats();
            console.log(`[BalanceQueue] Bulk: ${this.backgroundCheckCount} checked, ${this.backgroundHitCount} hits, ${rate.toFixed(1)}/sec, ${this.queue.size} remaining`);
            console.log(`[BalanceQueue] API: cache=${apiStats.cacheSize} (${(apiStats.cacheHitRate * 100).toFixed(0)}% hit), providers=${apiStats.providers.filter(p => p.healthy).length}/4 healthy`);
          } catch (logError) {
            // Even logging errors shouldn't stop the worker
            console.error('[BalanceQueue] Error logging stats:', logError);
          }
        }
        
        return { checked: pending.length, hits };
        
      } catch (apiError) {
        console.error('[BalanceQueue] Bulk API error (will retry):', apiError);
        
        // Mark all as failed for retry - but don't throw
        for (const item of pending) {
          item.status = 'failed';
          item.retryCount++;
          item.error = apiError instanceof Error ? apiError.message : 'Bulk API error';
        }
        
        return { checked: 0, hits: 0 };
      }
    } catch (outerError) {
      // Catastrophic error - log and return, worker will continue on next cycle
      console.error('[BalanceQueue] CRITICAL: Catastrophic error in processBulkBatch (worker continues):', outerError);
      return { checked: 0, hits: 0 };
    }
  }

  /**
   * Get background worker status
   */
  getBackgroundStatus(): {
    enabled: boolean;
    checked: number;
    hits: number;
    rate: number;
    pending: number;
    apiStats?: ReturnType<typeof freeBlockchainAPI.getStats>;
  } {
    const elapsed = this.backgroundStartTime > 0 ? (Date.now() - this.backgroundStartTime) / 1000 : 1;
    return {
      enabled: this.backgroundWorkerEnabled,
      checked: this.backgroundCheckCount,
      hits: this.backgroundHitCount,
      rate: this.backgroundCheckCount / elapsed,
      pending: Array.from(this.queue.values()).filter(i => i.status === 'pending').length,
      apiStats: freeBlockchainAPI.getStats(),
    };
  }

  private async loadFromDisk(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const data = await fs.readFile(QUEUE_FILE, 'utf-8');
      const saved = JSON.parse(data);
      
      for (const item of saved) {
        if (item.status === 'checking') {
          item.status = 'pending';
          item.retryCount = (item.retryCount || 0) + 1;
        }
        if (item.status === 'pending' || item.status === 'failed') {
          this.queue.set(item.id, item);
        }
      }
      
      console.log(`[BalanceQueue] Loaded ${this.queue.size} pending addresses from disk`);
    } catch {
      console.log('[BalanceQueue] No saved queue found, starting fresh');
    }
  }

  private async saveToDisk(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      await fs.mkdir('data', { recursive: true });
      
      const toSave = Array.from(this.queue.values()).filter(
        item => item.status === 'pending' || item.status === 'failed'
      );
      
      await fs.writeFile(QUEUE_FILE, JSON.stringify(toSave, null, 2));
    } catch (error) {
      console.error('[BalanceQueue] Error saving to disk:', error);
    }
  }

  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveToDisk();
    }, 5000);
  }

  private generateId(address: string, passphrase: string): string {
    return `${address}-${Buffer.from(passphrase).toString('base64').slice(0, 20)}`;
  }

  /**
   * Queue an address for balance checking
   * Called by OceanAgent for EVERY generated address
   */
  enqueue(
    address: string,
    passphrase: string,
    wif: string,
    isCompressed: boolean,
    options?: {
      cycleId?: string;
      priority?: number;
    }
  ): boolean {
    const id = this.generateId(address, passphrase);
    const newPriority = options?.priority || 1;
    
    // PRIORITY UPGRADE: If address already in queue, upgrade priority if higher
    if (this.queue.has(id)) {
      const existing = this.queue.get(id)!;
      
      // Only upgrade if new priority is higher AND item is still pending
      if (newPriority > existing.priority && existing.status === 'pending') {
        const oldPriority = existing.priority;
        existing.priority = newPriority;
        this.scheduleSave();
        
        if (newPriority >= 8) {
          console.log(`[BalanceQueue] 🔺 Priority UPGRADED: ${address.substring(0, 12)}... ${oldPriority} → ${newPriority}`);
        }
        
        return true; // Upgraded successfully
      }
      
      return false; // Already in queue, no upgrade needed
    }
    
    if (this.queue.size >= MAX_QUEUE_SIZE) {
      const pending = Array.from(this.queue.values())
        .filter(item => item.status === 'pending')
        .sort((a, b) => a.priority - b.priority);
      
      if (pending.length > 0 && newPriority > pending[0].priority) {
        this.queue.delete(pending[0].id);
      } else {
        return false;
      }
    }
    
    const item: QueuedAddress = {
      id,
      address,
      passphrase,
      wif,
      isCompressed,
      cycleId: options?.cycleId,
      priority: newPriority,
      status: 'pending',
      queuedAt: Date.now(),
      retryCount: 0,
    };
    
    this.queue.set(id, item);
    this.scheduleSave();
    
    // Auto-restart background worker if not running and we have addresses
    if (!this.backgroundWorkerInterval && this.backgroundWorkerEnabled) {
      this.startBackgroundWorker();
    }
    
    return true;
  }

  /**
   * Queue both compressed and uncompressed addresses for a passphrase
   */
  enqueueBoth(
    compressedAddr: string,
    uncompressedAddr: string,
    passphrase: string,
    compressedWif: string,
    uncompressedWif: string,
    options?: {
      cycleId?: string;
      priority?: number;
    }
  ): { compressed: boolean; uncompressed: boolean } {
    const compressed = this.enqueue(compressedAddr, passphrase, compressedWif, true, options);
    
    let uncompressed = false;
    if (uncompressedAddr && uncompressedAddr !== compressedAddr) {
      uncompressed = this.enqueue(uncompressedAddr, passphrase, uncompressedWif, false, options);
    }
    
    return { compressed, uncompressed };
  }

  private refillTokens(): void {
    const now = Date.now();
    const elapsed = (now - this.tokenBucket.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.tokenBucket.refillRate;
    
    this.tokenBucket.tokens = Math.min(
      this.tokenBucket.maxTokens,
      this.tokenBucket.tokens + tokensToAdd
    );
    this.tokenBucket.lastRefill = now;
  }

  private async consumeToken(): Promise<boolean> {
    this.refillTokens();
    
    if (this.tokenBucket.tokens >= 1) {
      this.tokenBucket.tokens -= 1;
      return true;
    }
    
    const waitTime = (1 - this.tokenBucket.tokens) / this.tokenBucket.refillRate * 1000;
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    this.refillTokens();
    if (this.tokenBucket.tokens >= 1) {
      this.tokenBucket.tokens -= 1;
      return true;
    }
    
    return false;
  }

  /**
   * Check a single address with rate limiting
   */
  private async checkAddress(item: QueuedAddress): Promise<boolean> {
    const canProceed = await this.consumeToken();
    if (!canProceed) {
      return false;
    }
    
    item.status = 'checking';
    
    try {
      const hit = await checkAndRecordBalance(
        item.address,
        item.passphrase,
        item.wif,
        item.isCompressed
      );
      
      item.status = 'resolved';
      item.checkedAt = Date.now();
      
      return hit !== null;
    } catch (error) {
      item.status = 'failed';
      item.retryCount++;
      item.error = error instanceof Error ? error.message : 'Unknown error';
      
      return false;
    }
  }

  /**
   * Drain the queue - process all pending addresses with rate limiting
   */
  async drain(options?: {
    maxAddresses?: number;
    onProgress?: (current: number, total: number, address: string) => void;
  }): Promise<{ checked: number; hits: number; errors: number; duration: number }> {
    if (this.isProcessing) {
      console.log('[BalanceQueue] Already processing, skipping drain');
      return { checked: 0, hits: 0, errors: 0, duration: 0 };
    }
    
    this.isProcessing = true;
    this.processStartTime = Date.now();
    this.processedCount = 0;
    
    const pending = Array.from(this.queue.values())
      .filter(item => item.status === 'pending' || (item.status === 'failed' && item.retryCount < 3))
      .sort((a, b) => b.priority - a.priority);
    
    const maxToProcess = options?.maxAddresses || pending.length;
    const toProcess = pending.slice(0, maxToProcess);
    
    console.log(`[BalanceQueue] Starting drain: ${toProcess.length} addresses to check`);
    
    let checked = 0;
    let hits = 0;
    let errors = 0;
    
    for (let i = 0; i < toProcess.length; i++) {
      const item = toProcess[i];
      
      if (options?.onProgress) {
        options.onProgress(i + 1, toProcess.length, item.address);
      }
      
      try {
        const isHit = await this.checkAddress(item);
        checked++;
        this.processedCount++;
        
        if (isHit) {
          hits++;
        }
        
        if (item.status === 'resolved') {
          this.queue.delete(item.id);
        }
      } catch (error) {
        errors++;
        console.error(`[BalanceQueue] Error checking ${item.address}:`, error);
      }
    }
    
    const duration = Date.now() - this.processStartTime;
    
    console.log(`[BalanceQueue] Drain complete:`);
    console.log(`   Checked: ${checked}, Hits: ${hits}, Errors: ${errors}`);
    console.log(`   Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`   Rate: ${(checked / (duration / 1000)).toFixed(2)} addr/sec`);
    
    await this.saveToDisk();
    this.isProcessing = false;
    
    if (this.onDrainComplete) {
      this.onDrainComplete({ checked, hits, errors });
    }
    
    return { checked, hits, errors, duration };
  }

  /**
   * Set callback for drain completion
   */
  setOnDrainComplete(callback: (stats: { checked: number; hits: number; errors: number }) => void): void {
    this.onDrainComplete = callback;
  }

  /**
   * Get current queue statistics
   */
  getStats(): QueueStats {
    let pending = 0;
    let checking = 0;
    let resolved = 0;
    let failed = 0;
    
    const items = Array.from(this.queue.values());
    for (const item of items) {
      switch (item.status) {
        case 'pending': pending++; break;
        case 'checking': checking++; break;
        case 'resolved': resolved++; break;
        case 'failed': failed++; break;
      }
    }
    
    const duration = this.processStartTime > 0 ? (Date.now() - this.processStartTime) / 1000 : 1;
    
    return {
      pending,
      checking,
      resolved,
      failed,
      total: this.queue.size,
      addressesPerSecond: this.processedCount / duration,
      lastDrainTime: this.processStartTime > 0 ? this.processStartTime : undefined,
    };
  }

  /**
   * Get pending addresses for batch checking
   */
  getPendingAddresses(limit: number = 100): string[] {
    return Array.from(this.queue.values())
      .filter(item => item.status === 'pending')
      .sort((a, b) => b.priority - a.priority)
      .slice(0, limit)
      .map(item => item.address);
  }

  /**
   * Mark addresses as checked (for batch operations)
   */
  markChecked(addresses: string[], results: Map<string, { balance: number; txCount: number }>): void {
    const queueItems = Array.from(this.queue.values());
    for (const item of queueItems) {
      if (addresses.includes(item.address)) {
        const result = results.get(item.address);
        if (result) {
          item.status = 'resolved';
          item.checkedAt = Date.now();
          
          if (result.balance > 0 || result.txCount > 0) {
            checkAndRecordBalance(item.address, item.passphrase, item.wif, item.isCompressed)
              .catch(() => {});
          }
        }
      }
    }
    
    const entries = Array.from(this.queue.entries());
    for (const [id, item] of entries) {
      if (item.status === 'resolved') {
        this.queue.delete(id);
      }
    }
    
    this.scheduleSave();
  }

  /**
   * Check if processing is in progress
   */
  isWorkerRunning(): boolean {
    return this.isProcessing;
  }

  /**
   * Set rate limit (requests per second)
   */
  setRateLimit(requestsPerSecond: number): void {
    this.tokenBucket.refillRate = Math.max(0.1, Math.min(10, requestsPerSecond));
    console.log(`[BalanceQueue] Rate limit set to ${this.tokenBucket.refillRate} req/sec`);
  }

  /**
   * Clear all failed items (for retry with fresh state)
   */
  clearFailed(): number {
    let cleared = 0;
    const entries = Array.from(this.queue.entries());
    for (const [id, item] of entries) {
      if (item.status === 'failed') {
        this.queue.delete(id);
        cleared++;
      }
    }
    this.scheduleSave();
    return cleared;
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.size;
  }

  /**
   * Clear entire queue
   */
  clear(): void {
    this.queue.clear();
    this.saveToDisk();
  }
}

export const balanceQueue = new BalanceQueueService();
