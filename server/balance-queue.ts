/**
 * Balance Queue Service
 * 
 * Captures ALL generated addresses and queues them for balance checking.
 * Uses a multi-provider approach with rate limiting to avoid API throttling.
 * 
 * Architecture:
 * - BalanceQueue: Buffer for all generated addresses
 * - BalanceWorker: Drains queue with token-bucket rate limiting
 * - Multi-provider: Blockstream (primary) + Tavily/BitInfoCharts (batch fallback)
 */

import { fetchAddressBalance, checkAndRecordBalance } from './blockchain-scanner';

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
  
  // Background worker state
  private backgroundWorkerInterval: NodeJS.Timeout | null = null;
  private backgroundWorkerEnabled = true;
  private backgroundCheckCount = 0;
  private backgroundHitCount = 0;
  private backgroundStartTime = 0;

  constructor() {
    this.tokenBucket = {
      tokens: 5,
      lastRefill: Date.now(),
      maxTokens: 5,
      refillRate: DEFAULT_RATE_LIMIT,
    };
    this.loadFromDisk().then(() => {
      // Start background worker after loading
      this.startBackgroundWorker();
    });
  }
  
  /**
   * Start continuous background balance checking
   * Processes 1-2 addresses per second without blocking Ocean
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
    
    // Process one address every 800ms (~1.25/sec to stay under rate limits)
    this.backgroundWorkerInterval = setInterval(async () => {
      if (!this.backgroundWorkerEnabled) return;
      if (this.isProcessing) return; // Don't interfere with manual drains
      
      await this.processOneAddress();
    }, 800);
    
    console.log('[BalanceQueue] Background worker started (1.25 addr/sec)');
  }
  
  /**
   * Stop background worker
   */
  stopBackgroundWorker(): void {
    if (this.backgroundWorkerInterval) {
      clearInterval(this.backgroundWorkerInterval);
      this.backgroundWorkerInterval = null;
    }
    this.backgroundWorkerEnabled = false;
    console.log('[BalanceQueue] Background worker stopped');
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
   * Get background worker status
   */
  getBackgroundStatus(): {
    enabled: boolean;
    checked: number;
    hits: number;
    rate: number;
    pending: number;
  } {
    const elapsed = this.backgroundStartTime > 0 ? (Date.now() - this.backgroundStartTime) / 1000 : 1;
    return {
      enabled: this.backgroundWorkerEnabled,
      checked: this.backgroundCheckCount,
      hits: this.backgroundHitCount,
      rate: this.backgroundCheckCount / elapsed,
      pending: Array.from(this.queue.values()).filter(i => i.status === 'pending').length,
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
    
    if (this.queue.has(id)) {
      return false;
    }
    
    if (this.queue.size >= MAX_QUEUE_SIZE) {
      const pending = Array.from(this.queue.values())
        .filter(item => item.status === 'pending')
        .sort((a, b) => a.priority - b.priority);
      
      if (pending.length > 0 && (options?.priority || 1) > pending[0].priority) {
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
      priority: options?.priority || 1,
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
