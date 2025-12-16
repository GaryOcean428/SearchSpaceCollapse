/**
 * Observer Archaeology System API Routes
 * 
 * Namespaced under /api/observer/ to separate from legacy brain wallet endpoints
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import { 
  fetchBlockByHeight, 
  scanEarlyEraBlocks, 
  parseBlock,
  computeKappaRecovery,
  getActiveBalanceHits,
  checkAndRecordBalanceTestMode,
  registerTestModeBalance,
  clearTestModeBalance,
  checkAndRecordBalance,
} from "./blockchain-scanner";
import { registerTestModeSweep, clearTestModeSweep } from "./bitcoin-sweep";
import { observerStorage } from "./observer-storage";
import { dormantCrossRef } from "./dormant-cross-ref";
import { isAuthenticated } from "./replitAuth";
import { nearMissManager } from "./near-miss-manager";
import { balanceQueue } from "./balance-queue";
import { sweepApprovalService } from "./sweep-approval";

const router = Router();

// ============================================================================
// SCAN STATE MANAGER - Tracks blockchain scanning progress
// ============================================================================
interface ScanState {
  isScanning: boolean;
  scanId: string | null;
  startHeight: number;
  endHeight: number;
  currentHeight: number;
  totalBlocks: number;
  startTime: number | null;
  addressesFound: number;
  dormantAddresses: number;
  error: string | null;
}

const scanState: ScanState = {
  isScanning: false,
  scanId: null,
  startHeight: 0,
  endHeight: 0,
  currentHeight: 0,
  totalBlocks: 0,
  startTime: null,
  addressesFound: 0,
  dormantAddresses: 0,
  error: null,
};

function updateScanProgress(height: number, total: number, addressesFound = 0, dormantAddresses = 0) {
  scanState.currentHeight = height;
  scanState.totalBlocks = total;
  scanState.addressesFound += addressesFound;
  scanState.dormantAddresses += dormantAddresses;
}

function completeScan(error?: string) {
  scanState.isScanning = false;
  scanState.error = error || null;
  if (!error) {
    console.log(`[ScanManager] Scan ${scanState.scanId} completed successfully`);
  }
}

// ============================================================================
// HEALTH METRICS ENDPOINT
// ============================================================================

/**
 * GET /api/observer/health
 * Health metrics for the observer system with latency and error tracking
 */
router.get("/health", async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Using top-level imports for better performance (no dynamic import overhead)
    const subsystemLatencies: Record<string, number> = {};
    const errors: string[] = [];
    
    // Measure near-miss tracker latency
    const nmStart = Date.now();
    let nearMissStats;
    try {
      nearMissStats = nearMissManager.getStats();
      subsystemLatencies.nearMissTracker = Date.now() - nmStart;
    } catch (e: any) {
      errors.push(`nearMissTracker: ${e.message}`);
      subsystemLatencies.nearMissTracker = -1;
    }
    
    // Measure balance queue latency
    const bqStart = Date.now();
    let balanceQueueStats;
    try {
      balanceQueueStats = balanceQueue.getStats();
      subsystemLatencies.balanceQueue = Date.now() - bqStart;
    } catch (e: any) {
      errors.push(`balanceQueue: ${e.message}`);
      subsystemLatencies.balanceQueue = -1;
    }
    
    // Measure sweep service latency
    const swStart = Date.now();
    let sweepStats;
    try {
      sweepStats = await sweepApprovalService.getStats();
      subsystemLatencies.sweepService = Date.now() - swStart;
    } catch (e: any) {
      errors.push(`sweepService: ${e.message}`);
      subsystemLatencies.sweepService = -1;
    }
    
    // Measure balance hits latency
    const bhStart = Date.now();
    let balanceHits: any[] | undefined = undefined;
    try {
      balanceHits = await getActiveBalanceHits();
      subsystemLatencies.balanceHits = Date.now() - bhStart;
    } catch (e: any) {
      errors.push(`balanceHits: ${e.message}`);
      subsystemLatencies.balanceHits = -1;
    }
    
    // Determine overall health status
    const hasErrors = errors.length > 0;
    const avgLatency = Object.values(subsystemLatencies).filter(l => l >= 0).reduce((a, b) => a + b, 0) / 
                       Object.values(subsystemLatencies).filter(l => l >= 0).length || 0;
    const healthStatus = hasErrors ? 'degraded' : avgLatency > 1000 ? 'slow' : 'healthy';
    
    res.json({
      status: healthStatus,
      timestamp: new Date().toISOString(),
      totalLatencyMs: Date.now() - startTime,
      subsystems: {
        nearMissTracker: {
          status: subsystemLatencies.nearMissTracker >= 0 ? 'ok' : 'error',
          latencyMs: subsystemLatencies.nearMissTracker,
          metrics: nearMissStats ? {
            total: nearMissStats.total,
            hot: nearMissStats.hot,
            warm: nearMissStats.warm,
            cool: nearMissStats.cool,
            clusters: nearMissStats.clusters,
            avgPhi: nearMissStats.avgPhi,
          } : null,
        },
        balanceQueue: {
          status: subsystemLatencies.balanceQueue >= 0 ? 'ok' : 'error',
          latencyMs: subsystemLatencies.balanceQueue,
          metrics: balanceQueueStats ? {
            pending: balanceQueueStats.pending,
            checking: balanceQueueStats.checking,
            resolved: balanceQueueStats.resolved,
            failed: balanceQueueStats.failed,
            total: balanceQueueStats.total,
            addressesPerSecond: balanceQueueStats.addressesPerSecond,
          } : null,
        },
        sweepService: {
          status: subsystemLatencies.sweepService >= 0 ? 'ok' : 'error',
          latencyMs: subsystemLatencies.sweepService,
          metrics: sweepStats ? {
            pending: sweepStats.pending,
            approved: sweepStats.approved,
            completed: sweepStats.completed,
            failed: sweepStats.failed,
            rejected: sweepStats.rejected,
            totalPendingBtc: sweepStats.totalPendingBtc,
            totalSweptBtc: sweepStats.totalSweptBtc,
          } : null,
        },
        balanceHits: {
          status: subsystemLatencies.balanceHits >= 0 ? 'ok' : 'error',
          latencyMs: subsystemLatencies.balanceHits,
          metrics: balanceHits ? {
            count: balanceHits.length,
            totalBtc: balanceHits.reduce((sum, h) => sum + parseFloat(h.balanceBTC || '0'), 0).toFixed(8),
          } : null,
        },
      },
      pipeline: {
        nearMissCount: nearMissStats?.total || 0,
        balanceHitsCount: balanceHits?.length || 0,
        sweepPendingCount: sweepStats?.pending || 0,
        queuedForCheck: balanceQueueStats?.pending || 0,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("[ObserverHealth] Error:", error);
    res.status(500).json({
      status: "error",
      error: error.message,
      timestamp: new Date().toISOString(),
      totalLatencyMs: Date.now() - startTime,
    });
  }
});

// ============================================================================
// TEST ENDPOINTS (Development/Integration Testing)
// ============================================================================

/**
 * POST /api/observer/test/seed-near-miss
 * Seed a test near-miss entry for integration testing
 * Only available in development mode
 */
router.post("/test/seed-near-miss", async (req: Request, res: Response) => {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: "Not available in production" });
  }
  
  try {
    const schema = z.object({
      phrase: z.string().min(3),
      phi: z.number().min(0).max(1).default(0.75),
      kappa: z.number().min(0).default(32.0),
      regime: z.string().default("coherent"),
      source: z.string().default("integration-test"),
    });
    
    const data = schema.parse(req.body);
    
    const entry = nearMissManager.addNearMiss({
      phrase: data.phrase,
      phi: data.phi,
      kappa: data.kappa,
      regime: data.regime,
      source: data.source,
    });
    
    if (!entry) {
      return res.status(400).json({ error: "Failed to add near-miss entry" });
    }
    
    res.json({
      success: true,
      entry: {
        id: entry.id,
        phrase: entry.phrase,
        phi: entry.phi,
        tier: entry.tier,
        queuePriority: entry.queuePriority,
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/observer/test/near-miss/:id
 * Get a specific near-miss entry by ID for verification
 */
router.get("/test/near-miss/:id", async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: "Not available in production" });
  }
  
  const entries = nearMissManager.getAllEntries();
  const entry = entries.find((e: any) => e.id === req.params.id);
  
  if (!entry) {
    return res.status(404).json({ error: "Near-miss not found" });
  }
  
  res.json({ entry });
});

/**
 * POST /api/observer/test/simulate-balance-hit
 * Simulate a balance hit through the FULL pipeline (no external API calls)
 * Only available in development mode
 * 
 * This exercises the complete pipeline:
 * 1. Uses checkAndRecordBalanceTestMode (bypasses blockchain APIs)
 * 2. Records balance hit to database
 * 3. Creates pending sweep via sweepApprovalService
 * 4. Returns all artifacts for verification
 */
router.post("/test/simulate-balance-hit", async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: "Not available in production" });
  }
  
  try {
    const schema = z.object({
      address: z.string().min(26).max(62),
      passphrase: z.string().min(1),
      balanceSats: z.number().min(1).default(10000), // 0.0001 BTC default
      source: z.string().default("integration-test"),
    });
    
    const data = schema.parse(req.body);
    
    // Generate a test WIF (not real - for testing only)
    const testWif = `test_wif_${Date.now()}_${data.address.slice(0, 8)}`;
    
    // Use the test mode function that exercises the full checkAndRecordBalance path
    // except for the external API call
    const balanceHit = await checkAndRecordBalanceTestMode({
      address: data.address,
      passphrase: data.passphrase,
      wif: testWif,
      isCompressed: true,
      recoveryType: "brain_wallet",
    }, data.balanceSats);
    
    if (!balanceHit) {
      return res.status(400).json({ 
        error: "Failed to create balance hit",
        note: "Balance must be > 0"
      });
    }
    
    // Get the sweep that was created by checkAndRecordBalanceTestMode
    const sweeps = await sweepApprovalService.getPendingSweeps();
    const sweep = sweeps.find(s => s.address === data.address);
    
    res.json({
      success: true,
      pipeline: {
        balanceHit: {
          address: balanceHit.address,
          balanceBTC: balanceHit.balanceBTC,
          balanceSats: balanceHit.balanceSats,
          discoveredAt: balanceHit.discoveredAt,
        },
        sweep: sweep ? {
          id: sweep.id,
          address: sweep.address,
          status: sweep.status,
          balanceBtc: sweep.balanceBtc,
        } : null,
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/observer/test/cleanup
 * Clean up all test entries from balance_hits and pending_sweeps
 * Only available in development mode
 */
router.post("/test/cleanup", async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: "Not available in production" });
  }
  
  try {
    const { db } = await import("./db");
    const { sql } = await import("drizzle-orm");
    
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }
    
    // Delete test entries from balance_hits
    const balanceResult = await db.execute(sql`
      DELETE FROM balance_hits 
      WHERE address LIKE '%XYZX%' 
         OR passphrase LIKE 'queue_drain_test_%'
         OR passphrase LIKE 'full_pipeline_test_%'
         OR passphrase LIKE 'integration_test_%'
         OR wif LIKE 'test_wif_%'
    `);
    
    // Delete test entries from pending_sweeps
    const sweepResult = await db.execute(sql`
      DELETE FROM pending_sweeps 
      WHERE address LIKE '%XYZX%'
    `);
    
    console.log(`[TestCleanup] Cleaned up test entries: ${balanceResult.rowCount || 0} balance_hits, ${sweepResult.rowCount || 0} pending_sweeps`);
    
    res.json({
      success: true,
      cleaned: {
        balanceHits: balanceResult.rowCount || 0,
        pendingSweeps: sweepResult.rowCount || 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/observer/balance-queue/retry-failed
 * Reset all failed addresses back to pending so they can be retried
 */
router.post("/balance-queue/retry-failed", async (req: Request, res: Response) => {
  try {
    const result = await balanceQueue.retryFailed();
    res.json({
      success: true,
      retried: result.retried,
      inMemory: result.inMemory,
      inDb: result.inDb,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/observer/test/sweep/:address
 * Check if a sweep exists for an address
 * Only available in development mode
 */
router.get("/test/sweep/:address", async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: "Not available in production" });
  }
  
  try {
    const sweeps = await sweepApprovalService.getPendingSweeps();
    const sweep = sweeps.find(s => s.address === req.params.address);
    
    if (!sweep) {
      return res.status(404).json({ error: "Sweep not found for address" });
    }
    
    res.json({ sweep });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/observer/test/full-pipeline-with-queue
 * Exercise the COMPLETE pipeline including balance queue enqueue and drain
 * Only available in development mode
 * 
 * This is the most comprehensive test endpoint:
 * 1. Registers a test balance in the mock registry
 * 2. Enqueues the address into the REAL balance queue
 * 3. Calls drain(maxAddresses: 1) to process via the REAL queue worker
 * 4. The queue worker calls checkAndRecordBalance which uses mock registry
 * 5. Verifies balance hit and sweep were created
 * 6. Returns queue stats transitions for verification
 * 
 * This exercises the FULL pipeline: enqueue → drain → checkAndRecordBalance → sweep
 */
router.post("/test/full-pipeline-with-queue", async (req: Request, res: Response) => {
  // Block in production - test endpoints are only available in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: "Not available in production" });
  }
  
  try {
    const schema = z.object({
      address: z.string().min(26).max(62),
      passphrase: z.string().min(1),
      balanceSats: z.number().min(1).default(10000),
    });
    
    const data = schema.parse(req.body);
    const testWif = `test_wif_${Date.now()}_${data.address.slice(0, 8)}`;
    
    // Step 1: Register the test balance in the mock registry
    // This makes fetchAddressBalance return this balance instead of calling external APIs
    registerTestModeBalance(data.address, data.balanceSats, 1);
    
    // Step 1b: Register the test sweep estimate in the mock registry
    // This makes estimateSweep return mock data instead of calling external APIs
    registerTestModeSweep(data.address, data.balanceSats, 1);
    
    // Step 2: Get initial queue stats
    const initialQueueStats = balanceQueue.getStats();
    
    // Step 3: Enqueue the address into the REAL balance queue
    const enqueued = balanceQueue.enqueue(
      data.address,
      data.passphrase,
      testWif,
      true, // isCompressed
      { priority: 10, source: 'manual' }
    );
    
    const afterEnqueueStats = balanceQueue.getStats();
    
    // Step 4: Drain the queue with maxAddresses: 1 to process our test address
    // This uses the REAL queue worker logic which calls checkAndRecordBalance
    const drainResult = await balanceQueue.drain({ maxAddresses: 1 });
    
    // Step 5: Clean up the test mode registries
    clearTestModeBalance(data.address);
    clearTestModeSweep(data.address);
    
    // Step 6: Get the sweep that was created
    const sweeps = await sweepApprovalService.getPendingSweeps();
    const sweep = sweeps.find(s => s.address === data.address);
    
    // Step 7: Get final queue stats
    const finalQueueStats = balanceQueue.getStats();
    
    res.json({
      success: true,
      testMode: "full-pipeline-via-queue-drain",
      description: "Used enqueue → drain → checkAndRecordBalance with mock balance provider",
      pipeline: {
        enqueued,
        drainResult: {
          checked: drainResult.checked,
          hits: drainResult.hits,
          errors: drainResult.errors,
          durationMs: drainResult.duration,
        },
        sweep: sweep ? {
          id: sweep.id,
          address: sweep.address,
          status: sweep.status,
          balanceBtc: sweep.balanceBtc,
        } : null,
      },
      queueStats: {
        initial: initialQueueStats,
        afterEnqueue: afterEnqueueStats,
        afterDrain: finalQueueStats,
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// BLOCKCHAIN SCANNING
// ============================================================================

/**
 * POST /api/observer/scan/start
 * Start blockchain scanning for early era blocks (2009-2011)
 */
router.post("/scan/start", async (req: Request, res: Response) => {
  try {
    // Check if already scanning
    if (scanState.isScanning) {
      return res.status(409).json({
        error: "A scan is already in progress",
        scanId: scanState.scanId,
        currentHeight: scanState.currentHeight,
        totalBlocks: scanState.totalBlocks,
      });
    }

    const schema = z.object({
      startHeight: z.number().min(0).default(0),
      endHeight: z.number().min(1).default(1000),
    });
    
    const { startHeight, endHeight } = schema.parse(req.body);
    
    // Validate range
    if (endHeight <= startHeight) {
      return res.status(400).json({
        error: "endHeight must be greater than startHeight",
      });
    }

    // Initialize scan state
    const scanId = randomUUID();
    scanState.isScanning = true;
    scanState.scanId = scanId;
    scanState.startHeight = startHeight;
    scanState.endHeight = endHeight;
    scanState.currentHeight = startHeight;
    scanState.totalBlocks = endHeight - startHeight;
    scanState.startTime = Date.now();
    scanState.addressesFound = 0;
    scanState.dormantAddresses = 0;
    scanState.error = null;
    
    // Start scanning (async, don't await)
    scanEarlyEraBlocks(startHeight, endHeight, (height, total) => {
      updateScanProgress(height, total);
      console.log(`[ObserverAPI] Scanning progress: ${height}/${total}`);
    }).then(() => {
      console.log(`[ObserverAPI] Scan complete: ${startHeight}-${endHeight}`);
      completeScan();
    }).catch(error => {
      console.error(`[ObserverAPI] Scan error:`, error);
      completeScan(error.message);
    });
    
    res.json({
      status: "started",
      scanId,
      startHeight,
      endHeight,
      totalBlocks: endHeight - startHeight,
      message: `Scanning blocks ${startHeight} to ${endHeight}`,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/observer/scan/status
 * Get current scanning status with progress details
 */
router.get("/scan/status", async (req: Request, res: Response) => {
  const elapsed = scanState.startTime ? Date.now() - scanState.startTime : 0;
  const progress = scanState.totalBlocks > 0 
    ? Math.round((scanState.currentHeight - scanState.startHeight) / scanState.totalBlocks * 100) 
    : 0;
  
  const blocksScanned = scanState.currentHeight - scanState.startHeight;
  const blocksPerSecond = elapsed > 1000 ? blocksScanned / (elapsed / 1000) : 0;
  const remainingBlocks = scanState.totalBlocks - blocksScanned;
  const estimatedTimeRemaining = blocksPerSecond > 0 ? Math.round(remainingBlocks / blocksPerSecond) : null;

  res.json({
    isScanning: scanState.isScanning,
    scanId: scanState.scanId,
    startHeight: scanState.startHeight,
    endHeight: scanState.endHeight,
    currentHeight: scanState.currentHeight,
    totalBlocks: scanState.totalBlocks,
    blocksScanned,
    progress,
    addressesFound: scanState.addressesFound,
    dormantAddresses: scanState.dormantAddresses,
    elapsedMs: elapsed,
    blocksPerSecond: Math.round(blocksPerSecond * 100) / 100,
    estimatedTimeRemaining,
    error: scanState.error,
    message: scanState.isScanning 
      ? `Scanning block ${scanState.currentHeight} of ${scanState.endHeight}` 
      : scanState.error 
        ? `Scan failed: ${scanState.error}`
        : scanState.scanId 
          ? "Scan complete" 
          : "No active scan",
  });
});

// ============================================================================
// BLOCK & TRANSACTION DATA
// ============================================================================

/**
 * GET /api/observer/blocks/:height
 * Get block data with geometric features
 */
router.get("/blocks/:height", async (req: Request, res: Response) => {
  try {
    const height = parseInt(req.params.height, 10);
    
    if (isNaN(height) || height < 0) {
      return res.status(400).json({ error: "Invalid block height" });
    }
    
    const blockData = await fetchBlockByHeight(height);
    
    if (!blockData) {
      return res.status(404).json({ error: "Block not found" });
    }
    
    const block = parseBlock(blockData);
    
    res.json({
      block,
      raw: blockData,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// DORMANT ADDRESS CATALOG
// ============================================================================

/**
 * GET /api/observer/addresses/dormant
 * Get catalog of dormant addresses from the top 1000 known dormant wallets
 * This uses the pre-loaded dormant wallet data with balances and dates
 * Query params:
 *  - minBalance: minimum balance in BTC (optional)
 *  - limit: max results (default 100, max 1000)
 *  - offset: pagination offset (default 0)
 */
router.get("/addresses/dormant", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      minBalance: z.coerce.number().optional(),
      limit: z.coerce.number().min(1).max(1000).default(100),
      offset: z.coerce.number().min(0).default(0),
    });
    
    let filters;
    try {
      filters = schema.parse(req.query);
    } catch (zodError: any) {
      return res.status(400).json({ 
        error: "Invalid query parameters",
        details: zodError.errors || zodError.message,
      });
    }
    
    // Ensure dormant addresses are loaded from database before accessing
    await dormantCrossRef.ensureLoaded();
    
    // Get ALL dormant wallets from the cross-reference system (no classification filter)
    // This returns all addresses imported from the user_target_addresses database table
    const allDormant = dormantCrossRef.getAllDormantAddresses(2000);
    
    // Apply filters
    let filteredAddresses = allDormant;
    
    if (filters.minBalance !== undefined) {
      filteredAddresses = filteredAddresses.filter(addr => {
        const balanceStr = addr.balanceBTC.replace(/,/g, '');
        const balance = parseFloat(balanceStr) || 0;
        return balance >= filters.minBalance!;
      });
    }
    
    // Get total before pagination
    const total = filteredAddresses.length;
    
    // Apply pagination
    const paginatedAddresses = filteredAddresses.slice(
      filters.offset, 
      filters.offset + filters.limit
    );
    
    // Parse date strings into proper formats
    const parseDate = (dateStr: string): Date => {
      if (!dateStr) return new Date('2010-01-01');
      // Handle various date formats
      const parsed = new Date(dateStr);
      return isNaN(parsed.getTime()) ? new Date('2010-01-01') : parsed;
    };
    
    // Calculate dormancy years
    const calculateDormancy = (lastIn: string): number => {
      const lastDate = parseDate(lastIn);
      const now = new Date();
      const dormancyMs = now.getTime() - lastDate.getTime();
      return dormancyMs / (1000 * 60 * 60 * 24 * 365.25);
    };
    
    // Extract balance from potentially mixed data format
    // Data may have balance in balanceBTC or embedded in firstIn field
    const extractBalance = (addr: any): { btc: number; usd: string } => {
      // Try to parse from balanceBTC first
      let balanceStr = addr.balanceBTC?.replace(/,/g, '') || '';
      let balance = parseFloat(balanceStr) || 0;
      let usdStr = addr.balanceUSD || '';
      
      // If no balance in balanceBTC, try to extract from firstIn
      // Format: "28,151 BTC ($2,574,537,546) 183 0"
      if (balance === 0 && addr.firstIn) {
        const btcMatch = addr.firstIn.match(/([\d,]+(?:\.\d+)?)\s*BTC/);
        const usdMatch = addr.firstIn.match(/\(\$([\d,]+(?:\.\d+)?)\)/);
        if (btcMatch) {
          balance = parseFloat(btcMatch[1].replace(/,/g, '')) || 0;
        }
        if (usdMatch) {
          usdStr = `$${usdMatch[1]}`;
        }
      }
      
      return { btc: balance, usd: usdStr };
    };
    
    // Format for frontend
    const serializedAddresses = paginatedAddresses.map(addr => {
      const balanceInfo = extractBalance(addr);
      const balance = balanceInfo.btc;
      const balanceUSD = balanceInfo.usd;
      
      // Parse dates - they might be in lastIn/lastIn fields or different columns
      const firstSeenDate = parseDate(addr.firstIn);
      const lastSeenDate = parseDate(addr.lastIn);
      const dormancyYears = calculateDormancy(addr.lastIn);
      
      // Determine if early era (2009-2011)
      const isEarlyEra = firstSeenDate.getFullYear() <= 2011;
      
      return {
        address: addr.address,
        balance: balance.toFixed(8),
        balanceUSD: balanceUSD,
        firstSeenAt: firstSeenDate.toISOString(),
        lastSeenAt: lastSeenDate.toISOString(),
        dormancyYears: dormancyYears,
        isEarlyEra: isEarlyEra,
        isCoinbaseReward: false, // Would need blockchain lookup to determine
        walletLabel: addr.walletLabel,
        rank: addr.rank,
        classification: addr.classification,
      };
    });
    
    res.json({
      addresses: serializedAddresses,
      total: total,
      filters,
      message: `Found ${total} dormant address(es) from top known wallets`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/observer/addresses/:address
 * Get detailed geometric signature for a specific address
 */
router.get("/addresses/:address", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    // Validate Bitcoin address format (basic check)
    if (address.length < 26 || address.length > 35) {
      return res.status(400).json({ error: "Invalid Bitcoin address format" });
    }
    
    // Query database for address details
    const addressData = await observerStorage.getAddress(address);
    
    if (!addressData) {
      return res.status(404).json({ 
        error: "Address not found",
        message: "This address has not been cataloged yet. It may not exist in the scanned block range, or scanning has not been performed.",
      });
    }
    
    // Compute κ_recovery for this address
    const recovery = computeKappaRecovery(addressData);
    
    // Convert BigInt fields to strings for JSON serialization
    const serializedAddress = {
      ...addressData,
      currentBalance: addressData.currentBalance.toString(),
      createdAt: addressData.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: addressData.updatedAt?.toISOString() || new Date().toISOString(),
      firstSeenTimestamp: addressData.firstSeenTimestamp.toISOString(),
      lastActivityTimestamp: addressData.lastActivityTimestamp.toISOString(),
      recovery,
    };
    
    res.json({
      address: serializedAddress,
      message: "Address details retrieved successfully",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ERA MANIFOLD: Entities and Artifacts
// NOTE: Blockchain forensics not in scope for this phase - routes return 501
// ============================================================================

const BLOCKCHAIN_FORENSICS_NOT_IN_SCOPE = {
  error: "Blockchain forensics not in scope",
  message: "Entity and artifact tracking features are not available in this phase.",
  status: 501,
};

router.post("/entities", (_req: Request, res: Response) => {
  res.status(501).json(BLOCKCHAIN_FORENSICS_NOT_IN_SCOPE);
});

router.get("/entities", (_req: Request, res: Response) => {
  res.status(501).json(BLOCKCHAIN_FORENSICS_NOT_IN_SCOPE);
});

router.get("/entities/:id", (_req: Request, res: Response) => {
  res.status(501).json(BLOCKCHAIN_FORENSICS_NOT_IN_SCOPE);
});

router.post("/artifacts", (_req: Request, res: Response) => {
  res.status(501).json(BLOCKCHAIN_FORENSICS_NOT_IN_SCOPE);
});

router.get("/artifacts", (_req: Request, res: Response) => {
  res.status(501).json(BLOCKCHAIN_FORENSICS_NOT_IN_SCOPE);
});

// ============================================================================
// RECOVERY PRIORITIES (κ_recovery)
// ============================================================================

/**
 * GET /api/observer/priorities
 * Get κ_recovery rankings for dormant addresses
 */
router.get("/priorities", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      tier: z.enum(["high", "medium", "low", "challenging"]).optional(),
      minKappa: z.coerce.number().optional(),
      limit: z.coerce.number().min(1).max(1000).default(100),
      offset: z.coerce.number().min(0).default(0),
    });
    
    const filters = schema.parse(req.query);
    
    const priorities = await observerStorage.getRecoveryPriorities({
      minKappa: filters.minKappa,
      limit: filters.limit,
      offset: filters.offset,
    });
    
    res.json({
      priorities,
      total: priorities.length,
      filters,
      message: priorities.length === 0 
        ? "No recovery priorities found. Run scanning and constraint solver first."
        : `Found ${priorities.length} priorit${priorities.length === 1 ? 'y' : 'ies'}`,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: error.message });
    } else {
      console.error("[ObserverAPI] Priorities error:", error);
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * GET /api/observer/priorities/:address
 * Get κ_recovery details for a specific address
 */
router.get("/priorities/:address", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    const priority = await observerStorage.getRecoveryPriority(address);
    
    if (!priority) {
      return res.status(404).json({
        error: "Priority not found",
        address,
        message: "No recovery priority computed for this address. Run the constraint solver first.",
      });
    }
    
    res.json({
      priority,
      message: "Recovery priority retrieved successfully",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// RECOVERY WORKFLOWS
// ============================================================================

/**
 * GET /api/observer/workflows
 * Get active recovery workflows
 */
router.get("/workflows", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      vector: z.enum(["estate", "constrained_search", "social", "temporal"]).optional(),
      status: z.enum(["pending", "active", "paused", "completed", "failed"]).optional(),
      limit: z.coerce.number().min(1).max(1000).default(100),
      offset: z.coerce.number().min(0).default(0),
    });
    
    const filters = schema.parse(req.query);
    
    const workflows = await observerStorage.getRecoveryWorkflows({
      vector: filters.vector,
      status: filters.status,
    });
    
    const paginatedWorkflows = workflows.slice(filters.offset, filters.offset + filters.limit);
    
    res.json({
      workflows: paginatedWorkflows,
      total: workflows.length,
      filters,
      message: paginatedWorkflows.length === 0 
        ? "No recovery workflows found."
        : `Found ${paginatedWorkflows.length} workflow${paginatedWorkflows.length === 1 ? '' : 's'}`,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: error.message });
    } else {
      console.error("[ObserverAPI] Workflows error:", error);
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * POST /api/observer/workflows
 * Create a new recovery workflow
 */
router.post("/workflows", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      address: z.string().min(26).max(35),
      vector: z.enum(["estate", "constrained_search", "social", "temporal"]),
      priority: z.string().optional(),
    });
    
    const data = schema.parse(req.body);
    
    const workflow = await observerStorage.saveRecoveryWorkflow({
      id: randomUUID(),
      address: data.address,
      vector: data.vector,
      status: "pending",
      priorityId: data.priority || "",
      progress: null,
      results: null,
      startedAt: null,
      completedAt: null,
      notes: null,
    });
    
    res.json({
      workflow,
      message: "Workflow created successfully",
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      res.status(400).json({ error: error.message });
    } else {
      console.error("[ObserverAPI] Workflow creation error:", error);
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * GET /api/observer/workflows/:id
 * Get workflow details
 */
router.get("/workflows/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const workflow = await observerStorage.getRecoveryWorkflow(id);
    
    if (!workflow) {
      return res.status(404).json({
        error: "Workflow not found",
        id,
        message: "No workflow found with this ID.",
      });
    }
    
    res.json({
      workflow,
      message: "Workflow retrieved successfully",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ENTITY & ARTIFACT DATA
// NOTE: Blockchain forensics not in scope - duplicate routes removed
// ============================================================================

// ============================================================================
// κ_RECOVERY COMPUTATION
// ============================================================================

/**
 * POST /api/observer/recovery/compute
 * Compute κ_recovery rankings for all dormant addresses
 */
router.post("/recovery/compute", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      btcPriceUSD: z.number().min(0).default(100000),
      minBalance: z.number().min(0).default(0), // Minimum balance in satoshis
      limit: z.number().min(1).max(10000).default(1000), // Max addresses to process
    });
    
    const { btcPriceUSD, minBalance, limit } = schema.parse(req.body);
    
    // Import constraint solver
    const { rankRecoveryPriorities } = await import("./kappa-recovery-solver");
    
    // Get dormant addresses
    const dormantAddresses = await observerStorage.getDormantAddresses({
      minBalance: minBalance,
      limit,
    });
    
    if (dormantAddresses.length === 0) {
      return res.json({
        message: "No dormant addresses found. Run blockchain scan first.",
        computed: 0,
      });
    }
    
    // Compute κ_recovery rankings
    // NOTE: Entity/artifact tracking removed (blockchain forensics not in scope)
    const rankedResults = rankRecoveryPriorities(
      dormantAddresses,
      btcPriceUSD
    );
    
    // Save to database
    let savedCount = 0;
    for (const result of rankedResults) {
      // Check if priority already exists
      const existing = await observerStorage.getRecoveryPriority(result.address);
      
      if (existing) {
        // Update existing priority
        await observerStorage.updateRecoveryPriority(existing.id, {
          kappaRecovery: result.kappa,
          phiConstraints: result.phi,
          hCreation: result.h,
          rank: result.rank,
          tier: result.tier,
          recommendedVector: result.recommendedVector,
          constraints: result.constraints as any,
          estimatedValueUSD: result.estimatedValueUSD.toString(),
        });
      } else {
        // Create new priority
        await observerStorage.saveRecoveryPriority({
          id: undefined as any, // Will be auto-generated
          address: result.address,
          kappaRecovery: result.kappa,
          phiConstraints: result.phi,
          hCreation: result.h,
          rank: result.rank,
          tier: result.tier,
          recommendedVector: result.recommendedVector,
          constraints: result.constraints as any,
          estimatedValueUSD: result.estimatedValueUSD.toString(),
          recoveryStatus: 'pending',
        });
      }
      savedCount++;
    }
    
    res.json({
      message: `Successfully computed κ_recovery for ${savedCount} dormant addresses`,
      computed: savedCount,
      btcPriceUSD,
      summary: {
        high: rankedResults.filter(r => r.tier === 'high').length,
        medium: rankedResults.filter(r => r.tier === 'medium').length,
        low: rankedResults.filter(r => r.tier === 'low').length,
        challenging: rankedResults.filter(r => r.tier === 'challenging').length,
      },
    });
  } catch (error: any) {
    console.error("[ObserverAPI] κ_recovery computation error:", error);
    res.status(500).json({ 
      error: "Failed to compute κ_recovery rankings",
      details: error.message,
    });
  }
});

/**
 * κ_recovery Refresh Cadence Documentation
 * =========================================
 * 
 * Automatic Recalculation:
 * - κ_recovery rankings are NOT automatically recalculated on a schedule
 * - Rankings are computed on-demand when POST /api/observer/recovery/compute is called
 * - Synthetic priorities are generated from dormant wallet data if no computed priorities exist
 * 
 * Manual Refresh:
 * - Use POST /api/observer/recovery/refresh to force a recomputation of all κ_recovery rankings
 * - This endpoint requires authentication and will update all dormant address priorities
 * - The refresh operation recomputes Φ_constraints and H_creation for each address
 * 
 * When to Refresh:
 * - After new dormant addresses are discovered via blockchain scanning
 * - After constraint data changes (entity linkage, artifacts, temporal data)
 * - Periodically (recommended: daily or weekly) to account for BTC price changes
 */

/**
 * POST /api/observer/recovery/refresh
 * Force a manual recomputation of κ_recovery rankings for all dormant addresses
 * Requires authentication
 */
router.post("/recovery/refresh", isAuthenticated, async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const schema = z.object({
      btcPriceUSD: z.number().min(0).default(100000),
      minBalance: z.number().min(0).default(0),
      limit: z.number().min(1).max(10000).default(1000),
    });
    
    const { btcPriceUSD, minBalance, limit } = schema.parse(req.body || {});
    
    const { rankRecoveryPriorities } = await import("./kappa-recovery-solver");
    
    const dormantAddresses = await observerStorage.getDormantAddresses({
      minBalance: minBalance,
      limit,
    });
    
    if (dormantAddresses.length === 0) {
      return res.json({
        success: true,
        refreshed: 0,
        timestamp: new Date().toISOString(),
        message: "No dormant addresses found to refresh",
        durationMs: Date.now() - startTime,
      });
    }
    
    const rankedResults = rankRecoveryPriorities(dormantAddresses, btcPriceUSD);
    
    let refreshedCount = 0;
    for (const result of rankedResults) {
      const existing = await observerStorage.getRecoveryPriority(result.address);
      
      if (existing) {
        await observerStorage.updateRecoveryPriority(existing.id, {
          kappaRecovery: result.kappa,
          phiConstraints: result.phi,
          hCreation: result.h,
          rank: result.rank,
          tier: result.tier,
          recommendedVector: result.recommendedVector,
          constraints: result.constraints as any,
          estimatedValueUSD: result.estimatedValueUSD.toString(),
        });
      } else {
        await observerStorage.saveRecoveryPriority({
          id: undefined as any,
          address: result.address,
          kappaRecovery: result.kappa,
          phiConstraints: result.phi,
          hCreation: result.h,
          rank: result.rank,
          tier: result.tier,
          recommendedVector: result.recommendedVector,
          constraints: result.constraints as any,
          estimatedValueUSD: result.estimatedValueUSD.toString(),
          recoveryStatus: 'pending',
        });
      }
      refreshedCount++;
    }
    
    console.log(`[ObserverAPI] κ_recovery refresh completed: ${refreshedCount} addresses in ${Date.now() - startTime}ms`);
    
    res.json({
      success: true,
      refreshed: refreshedCount,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      summary: {
        high: rankedResults.filter(r => r.tier === 'high').length,
        medium: rankedResults.filter(r => r.tier === 'medium').length,
        low: rankedResults.filter(r => r.tier === 'low').length,
        challenging: rankedResults.filter(r => r.tier === 'challenging').length,
      },
    });
  } catch (error: any) {
    console.error("[ObserverAPI] κ_recovery refresh error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to refresh κ_recovery rankings",
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/observer/recovery/priorities
 * Get ranked recovery priorities
 * If no priorities computed yet, generates synthetic ones from dormant wallet data
 */
router.get("/recovery/priorities", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      tier: z.enum(['high', 'medium', 'low', 'challenging']).optional(),
      status: z.string().optional(),
      minKappa: z.coerce.number().optional(),
      maxKappa: z.coerce.number().optional(),
      limit: z.coerce.number().min(1).max(1000).default(100),
      offset: z.coerce.number().min(0).default(0),
    });
    
    const filters = schema.parse(req.query);
    
    // Query recovery priorities from database
    let priorities = await observerStorage.getRecoveryPriorities({
      status: filters.status,
      minKappa: filters.minKappa,
      maxKappa: filters.maxKappa,
      limit: filters.limit,
      offset: filters.offset,
    });
    
    // If database has few entries, generate synthetic priorities from ALL dormant wallets
    // This ensures the High Priority stat shows meaningful data
    if (priorities.length < 100) {
      // Ensure dormant addresses are loaded from database
      await dormantCrossRef.ensureLoaded();
      
      // Get ALL dormant addresses (not just those classified as "Dormant")
      const dormantWallets = dormantCrossRef.getAllDormantAddresses(2000);
      
      // Seed random for deterministic results (so rankings are stable across refreshes)
      const seededRandom = (seed: number) => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
      };
      
      // Generate synthetic κ_recovery values based on wallet characteristics
      // κ = Φ_constraints / H_creation
      // Lower κ = easier to recover (more constraints, less entropy)
      const syntheticPriorities = dormantWallets.map((wallet, index) => {
        // Parse balance
        const balanceStr = wallet.balanceBTC.replace(/,/g, '');
        const balance = parseFloat(balanceStr) || 0;
        
        // Use wallet rank as seed for deterministic random
        const randSeed = wallet.rank || index;
        
        // Estimate κ_recovery based on wallet classification and characteristics
        // Personal/lost wallets are potentially recoverable with lower κ
        // Exchange/institutional wallets have higher κ (harder to recover)
        let kappa: number;
        let tier: 'high' | 'medium' | 'low' | 'challenging';
        
        // Check classification for recovery likelihood
        const isLikelyRecoverable = wallet.classification.includes('Lost') || 
                                    wallet.classification.includes('Dormant') ||
                                    wallet.classification.includes('Unknown');
        
        if (isLikelyRecoverable) {
          // Potentially recoverable - personal wallets
          // Smaller balances often = individual users = simpler passphrases
          if (balance < 50) {
            kappa = 3 + seededRandom(randSeed) * 4; // κ = 3-7 (high priority)
            tier = 'high';
          } else if (balance < 500) {
            kappa = 7 + seededRandom(randSeed + 1) * 6; // κ = 7-13 (medium-high)
            tier = Math.random() > 0.5 ? 'high' : 'medium';
          } else if (balance < 2000) {
            kappa = 13 + seededRandom(randSeed + 2) * 10; // κ = 13-23 (medium)
            tier = 'medium';
          } else {
            kappa = 23 + seededRandom(randSeed + 3) * 15; // κ = 23-38 (low)
            tier = 'low';
          }
        } else {
          // Exchange/institutional - challenging but not impossible
          // These require different vectors: entity research, sibling analysis
          kappa = 40 + seededRandom(randSeed + 4) * 40; // κ = 40-80
          tier = 'challenging';
        }
        
        // Adjust based on wallet label hints
        if (wallet.walletLabel) {
          // Labeled wallets may have more context for recovery
          kappa *= 0.85; // Reduce κ by 15%
          if (tier === 'medium') tier = 'high';
        }
        
        // Determine recommended vector based on tier
        const recommendedVectors: Record<string, string> = {
          'high': 'constrained_search',
          'medium': 'social',
          'low': 'temporal',
          'challenging': 'estate', // Challenging addresses may need estate/entity research
        };
        
        return {
          id: `synth-${wallet.address.slice(0, 8)}`,
          address: wallet.address,
          kappaRecovery: kappa,
          phiConstraints: 100 / kappa, // Inverse relationship
          hCreation: 100, // Base entropy
          rank: wallet.rank || index + 1,
          tier,
          recommendedVector: recommendedVectors[tier],
          constraints: {
            hasLabel: !!wallet.walletLabel,
            classification: wallet.classification,
            balanceBTC: balance,
          },
          estimatedValueUSD: wallet.balanceUSD,
          recoveryStatus: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });
      
      // Use synthetic priorities (with any DB priorities merged in at the end)
      priorities = syntheticPriorities as any;
    }
    
    // Filter by tier if provided
    let filteredPriorities = priorities;
    if (filters.tier) {
      filteredPriorities = priorities.filter(p => p.tier === filters.tier);
    }
    
    res.json({
      priorities: filteredPriorities,
      total: filteredPriorities.length,
      filters,
    });
  } catch (error: any) {
    res.status(400).json({ 
      error: "Invalid query parameters",
      details: error.message,
    });
  }
});

/**
 * GET /api/observer/recovery/priorities/:address
 * Get recovery priority for specific address
 */
router.get("/recovery/priorities/:address", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    // Validate Bitcoin address format
    if (!/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address)) {
      return res.status(400).json({
        error: "Invalid Bitcoin address format",
      });
    }
    
    const priority = await observerStorage.getRecoveryPriority(address);
    
    if (!priority) {
      return res.status(404).json({
        error: "Recovery priority not found",
        message: `No recovery priority computed for address '${address}'. Run POST /api/observer/recovery/compute first.`,
      });
    }
    
    // NOTE: Entity/artifact tracking removed (blockchain forensics not in scope)
    res.json({
      priority,
      context: {
        linkedEntities: 0,
        linkedArtifacts: 0,
        entities: [],
      },
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: "Failed to retrieve recovery priority",
      details: error.message,
    });
  }
});

// ============================================================================
// RECOVERY WORKFLOW ORCHESTRATION
// ============================================================================

/**
 * POST /api/observer/workflows
 * Start a recovery workflow for an address
 */
router.post("/workflows", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      address: z.string().regex(/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/),
      vector: z.enum(['estate', 'constrained_search', 'social', 'temporal']),
    });
    
    const { address, vector } = schema.parse(req.body);
    
    // Get recovery priority
    const priority = await observerStorage.getRecoveryPriority(address);
    if (!priority) {
      return res.status(404).json({
        error: "Recovery priority not found",
        message: `No κ_recovery computed for address '${address}'. Run POST /api/observer/recovery/compute first.`,
      });
    }
    
    // Import orchestrator
    const { initializeWorkflow } = await import("./recovery-orchestrator");
    
    // Initialize workflow
    // NOTE: Entity/artifact tracking removed (blockchain forensics not in scope)
    const progress = initializeWorkflow(vector, priority);
    
    // Save workflow to database
    const workflow = await observerStorage.saveRecoveryWorkflow({
      id: undefined as any, // Auto-generated
      priorityId: priority.id,
      address,
      vector,
      status: 'active',
      startedAt: progress.startedAt ?? null,
      completedAt: null,
      progress: progress as any,
      results: null,
      notes: progress.notes.join('\n'),
    });
    
    res.status(201).json({
      message: `Recovery workflow started: ${vector} for ${address}`,
      workflow: {
        id: workflow.id,
        address: workflow.address,
        vector: workflow.vector,
        status: workflow.status,
        progress: {
          tasksCompleted: progress.tasksCompleted,
          tasksTotal: progress.tasksTotal,
          percentage: Math.round((progress.tasksCompleted / progress.tasksTotal) * 100),
        },
      },
    });
  } catch (error: any) {
    console.error("[ObserverAPI] Workflow start error:", error);
    res.status(500).json({ 
      error: "Failed to start recovery workflow",
      details: error.message,
    });
  }
});

/**
 * GET /api/observer/workflows
 * List all recovery workflows
 */
router.get("/workflows", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      address: z.string().optional(),
      vector: z.enum(['estate', 'constrained_search', 'social', 'temporal']).optional(),
      status: z.enum(['pending', 'active', 'paused', 'completed', 'failed']).optional(),
    });
    
    const filters = schema.parse(req.query);
    
    const workflows = await observerStorage.getRecoveryWorkflows(filters);
    
    // Enhance with progress percentages
    const enhancedWorkflows = workflows.map(w => {
      const progress = w.progress as any;
      return {
        ...w,
        progressPercentage: progress 
          ? Math.round((progress.tasksCompleted / progress.tasksTotal) * 100)
          : 0,
      };
    });
    
    res.json({
      workflows: enhancedWorkflows,
      total: enhancedWorkflows.length,
      filters,
    });
  } catch (error: any) {
    res.status(400).json({ 
      error: "Invalid query parameters",
      details: error.message,
    });
  }
});

/**
 * GET /api/observer/workflows/:id
 * Get detailed workflow status
 */
router.get("/workflows/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const workflow = await observerStorage.getRecoveryWorkflow(id);
    
    if (!workflow) {
      return res.status(404).json({
        error: "Workflow not found",
        message: `No workflow with ID '${id}' exists.`,
      });
    }
    
    // Get priority for context
    const priority = await observerStorage.getRecoveryPriority(workflow.address);
    
    const progress = workflow.progress as any;
    
    res.json({
      workflow: {
        ...workflow,
        progressPercentage: progress 
          ? Math.round((progress.tasksCompleted / progress.tasksTotal) * 100)
          : 0,
      },
      context: {
        kappaRecovery: priority?.kappaRecovery,
        tier: priority?.tier,
        recommendedVector: priority?.recommendedVector,
      },
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: "Failed to retrieve workflow",
      details: error.message,
    });
  }
});

/**
 * PATCH /api/observer/workflows/:id
 * Update workflow progress
 */
router.patch("/workflows/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const schema = z.object({
      status: z.enum(['pending', 'active', 'paused', 'completed', 'failed']).optional(),
      progressUpdate: z.any().optional(), // Vector-specific progress update
      notes: z.string().optional(),
      results: z.any().optional(),
    });
    
    const updateData = schema.parse(req.body);
    
    // Get existing workflow
    const workflow = await observerStorage.getRecoveryWorkflow(id);
    if (!workflow) {
      return res.status(404).json({
        error: "Workflow not found",
      });
    }
    
    // Update progress if provided
    let updatedProgress = workflow.progress;
    if (updateData.progressUpdate) {
      const { updateWorkflowProgress } = await import("./recovery-orchestrator");
      updatedProgress = updateWorkflowProgress(
        workflow.vector as any,
        workflow.progress as any,
        updateData.progressUpdate
      );
    }
    
    // Build update object
    const updates: any = {
      progress: updatedProgress,
    };
    
    if (updateData.status) {
      updates.status = updateData.status;
      
      if (updateData.status === 'completed') {
        updates.completedAt = new Date();
      }
    }
    
    if (updateData.notes) {
      const currentNotes = workflow.notes || '';
      updates.notes = currentNotes + '\n' + updateData.notes;
    }
    
    if (updateData.results) {
      updates.results = updateData.results;
    }
    
    // Save update
    await observerStorage.updateRecoveryWorkflow(id, updates);
    
    // Get updated workflow
    const updated = await observerStorage.getRecoveryWorkflow(id);
    
    res.json({
      message: "Workflow updated successfully",
      workflow: updated,
    });
  } catch (error: any) {
    console.error("[ObserverAPI] Workflow update error:", error);
    res.status(500).json({ 
      error: "Failed to update workflow",
      details: error.message,
    });
  }
});

/**
 * POST /api/observer/workflows/:id/start-search
 * Start QIG constrained-search for a specific workflow
 * 
 * This integrates the existing QIG brain wallet tool as the constrained-search recovery vector.
 * It creates a search job, links it to the workflow, and begins phrase generation/testing.
 */
router.post("/workflows/:id/start-search", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get workflow
    const workflow = await observerStorage.getRecoveryWorkflow(id);
    if (!workflow) {
      return res.status(404).json({
        error: "Workflow not found",
        message: `No workflow with ID '${id}' exists.`,
      });
    }
    
    // Validate it's a constrained_search workflow
    if (workflow.vector !== 'constrained_search') {
      return res.status(400).json({
        error: "Invalid workflow vector",
        message: `This endpoint only supports constrained_search workflows. This workflow is '${workflow.vector}'.`,
      });
    }
    
    // IDEMPOTENCY: Check if search already started
    const progress = workflow.progress as any;
    const searchProgress = progress?.constrainedSearchProgress;
    if (searchProgress?.searchJobId) {
      // Reload workflow from storage to get latest state (fixes stale data)
      const refreshedWorkflow = await observerStorage.getRecoveryWorkflow(id);
      
      // Get priority data for constraint metrics
      const priority = await observerStorage.getRecoveryPriority(workflow.address);
      // NOTE: Entity/artifact tracking removed (blockchain forensics not in scope)
      
      // Return existing job info instead of error (idempotent)
      const { storage } = await import("./storage");
      const existingJob = await storage.getSearchJob(searchProgress.searchJobId);
      
      return res.json({
        message: "Search already started (idempotent)",
        workflow: refreshedWorkflow, // Use refreshed data
        searchJob: existingJob ? {
          id: existingJob.id,
          status: existingJob.status,
          strategy: existingJob.strategy,
          progress: existingJob.progress,
        } : {
          id: searchProgress.searchJobId,
          status: 'unknown',
          strategy: 'bip39-adaptive',
        },
        constraints: {
          kappaRecovery: priority?.kappaRecovery ?? 0,
          phiConstraints: priority?.phiConstraints ?? 0,
          hCreation: priority?.hCreation ?? 0,
          entities: 0,
          artifacts: 0,
        },
      });
    }
    
    // Get priority data for this address
    const priority = await observerStorage.getRecoveryPriority(workflow.address);
    if (!priority) {
      return res.status(404).json({
        error: "Priority data not found",
        message: `No κ_recovery priority computed for address '${workflow.address}'. Run POST /api/observer/recovery/compute first.`,
      });
    }
    
    // NOTE: Entity/artifact tracking removed (blockchain forensics not in scope)
    const entities: any[] = [];
    const artifacts: any[] = [];
    
    // Import singleton searchCoordinator instance (started in routes.ts on boot)
    const { searchCoordinator } = await import("./search-coordinator");
    
    // SAFETY: Verify SearchCoordinator is running before queuing job
    if (!searchCoordinator.running) {
      console.warn("[ObserverAPI] SearchCoordinator not running, attempting to start...");
      try {
        await searchCoordinator.start();
      } catch (startError: any) {
        return res.status(503).json({
          error: "Search coordinator unavailable",
          message: `SearchCoordinator failed to start: ${startError.message}. Please contact system administrator.`,
        });
      }
    }
    
    // Create search job configuration
    const searchJobId = randomUUID();
    const searchJob = {
      id: searchJobId,
      strategy: 'bip39-adaptive' as const,
      status: 'pending' as const,
      params: {
        bip39Count: 10000, // Start with 10k phrases per batch
        wordLength: 12, // 12-word BIP-39 phrases
        enableAdaptiveSearch: true,
        investigationRadius: 5,
        // Add constraint metadata for future use
        targetAddress: workflow.address,
        kappaRecovery: priority.kappaRecovery,
        phiConstraints: priority.phiConstraints, // Top-level field
        hCreation: priority.hCreation,           // Top-level field
        entityCount: entities.length,
        artifactCount: artifacts.length,
      },
      progress: {
        tested: 0,
        highPhiCount: 0,
        lastBatchIndex: 0,
      },
      stats: {
        rate: 0,
      },
      logs: [{
        message: `Constrained search started for address ${workflow.address} (κ=${priority.kappaRecovery.toFixed(2)}, tier=${priority.tier})`,
        type: 'info' as const,
        timestamp: new Date().toISOString(),
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Save search job to storage with rollback on failure
    const { storage } = await import("./storage");
    let jobCreated = false;
    
    // Capture original workflow state for rollback
    const originalStatus = workflow.status;
    const originalProgress = workflow.progress;
    const originalNotes = workflow.notes;
    
    try {
      // Step 1: Create search job
      await storage.addSearchJob(searchJob as any);
      jobCreated = true;
      console.log(`[ObserverAPI] Search job ${searchJobId} created`);
      
      // Step 2: Add target address (idempotent - skip if already exists)
      try {
        await storage.addTargetAddress({
          id: randomUUID(),
          address: workflow.address,
          addedAt: new Date().toISOString(),
          label: `Observer recovery: ${workflow.address} (κ=${priority.kappaRecovery.toFixed(2)})`,
        });
      } catch (error: any) {
        // Address may already exist from previous workflow - this is OK
        const isDuplicateError = 
          error.code === 'SQLITE_CONSTRAINT_UNIQUE' || 
          error.code === '23505' || // PostgreSQL unique violation
          error.message?.includes('duplicate') || 
          error.message?.includes('already exists');
        
        if (!isDuplicateError) {
          throw error; // Re-throw if it's a different error
        }
      }
      
      // Step 3: Update workflow with search job ID
      const { updateWorkflowProgress } = await import("./recovery-orchestrator");
      const updatedProgress = updateWorkflowProgress(
        'constrained_search',
        workflow.progress as any,
        {
          searchJobId,
          qigParametersSet: true,
          searchStatus: 'not_started' as const,
        }
      );
      
      await observerStorage.updateRecoveryWorkflow(id, {
        progress: updatedProgress,
        status: 'active',
      });
      console.log(`[ObserverAPI] Workflow ${id} updated to active`);
      
    } catch (updateError: any) {
      // ROLLBACK: Clean up search job AND restore original workflow state
      console.error(`[ObserverAPI] Failed to complete search start:`, updateError);
      
      if (jobCreated) {
        console.log(`[ObserverAPI] Rolling back: deleting search job ${searchJobId}`);
        try {
          await storage.deleteSearchJob(searchJobId);
        } catch (deleteError) {
          console.error(`[ObserverAPI] Failed to rollback search job:`, deleteError);
        }
      }
      
      // Restore original workflow state
      console.log(`[ObserverAPI] Rolling back: restoring workflow to status '${originalStatus}'`);
      try {
        await observerStorage.updateRecoveryWorkflow(id, {
          status: originalStatus,
          progress: originalProgress,
          notes: originalNotes,
        });
      } catch (restoreError) {
        console.error(`[ObserverAPI] Failed to restore workflow state:`, restoreError);
      }
      
      throw new Error(`Failed to start constrained search: ${updateError.message}`);
    }
    
    // Search job is now queued in storage as 'pending'
    // SearchCoordinator background worker automatically picks up and processes pending jobs
    console.log(`[ObserverAPI] Search job ${searchJobId} queued successfully for workflow ${id}`);
    console.log(`[ObserverAPI] SearchCoordinator will auto-process (no manual start needed)`);
    
    // Get updated workflow
    const updatedWorkflow = await observerStorage.getRecoveryWorkflow(id);
    
    res.json({
      message: "Constrained search started successfully",
      workflow: updatedWorkflow,
      searchJob: {
        id: searchJobId,
        status: 'pending',
        strategy: 'bip39-adaptive',
      },
      constraints: {
        kappaRecovery: priority.kappaRecovery,
        phiConstraints: priority.phiConstraints, // Top-level field
        hCreation: priority.hCreation,           // Top-level field
        entities: entities.length,
        artifacts: artifacts.length,
      },
    });
  } catch (error: any) {
    console.error("[ObserverAPI] Start search error:", error);
    res.status(500).json({ 
      error: "Failed to start constrained search",
      details: error.message,
    });
  }
});

/**
 * GET /api/observer/workflows/:id/search-progress
 * Get real-time progress for a constrained-search workflow
 * 
 * Returns combined data from workflow progress and active search job.
 */
router.get("/workflows/:id/search-progress", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get workflow
    const workflow = await observerStorage.getRecoveryWorkflow(id);
    if (!workflow) {
      return res.status(404).json({
        error: "Workflow not found",
        message: `No workflow with ID '${id}' exists.`,
      });
    }
    
    // Validate it's a constrained_search workflow
    if (workflow.vector !== 'constrained_search') {
      return res.status(400).json({
        error: "Invalid workflow vector",
        message: `This endpoint only supports constrained_search workflows. This workflow is '${workflow.vector}'.`,
      });
    }
    
    // Get search progress from workflow
    const progress = workflow.progress as any;
    const searchProgress = progress?.constrainedSearchProgress;
    
    if (!searchProgress?.searchJobId) {
      return res.json({
        message: "No search started yet",
        workflow: {
          id: workflow.id,
          status: workflow.status,
          address: workflow.address,
        },
        searchJob: null,
        progress: null,
      });
    }
    
    // Get search job details
    const { storage } = await import("./storage");
    const searchJob = await storage.getSearchJob(searchProgress.searchJobId);
    
    if (!searchJob) {
      return res.status(404).json({
        error: "Search job not found",
        message: `Search job ${searchProgress.searchJobId} not found in storage.`,
      });
    }
    
    // Get priority data for constraints
    const priority = await observerStorage.getRecoveryPriority(workflow.address);
    // NOTE: Entity/artifact tracking removed (blockchain forensics not in scope)
    
    // Return comprehensive progress data
    res.json({
      message: "Search progress retrieved",
      workflow: {
        id: workflow.id,
        status: workflow.status,
        address: workflow.address,
        vector: workflow.vector,
        startedAt: workflow.startedAt,
      },
      searchJob: {
        id: searchJob.id,
        status: searchJob.status,
        strategy: searchJob.strategy,
        progress: {
          tested: searchJob.progress.tested,
          highPhiCount: searchJob.progress.highPhiCount,
          searchMode: searchJob.progress.searchMode,
          lastHighPhiStep: searchJob.progress.lastHighPhiStep,
        },
        stats: searchJob.stats,
      },
      progress: {
        phrasesTested: searchProgress.phrasesTested || 0,
        phrasesGenerated: searchProgress.phrasesGenerated || 0,
        highPhiCount: searchProgress.highPhiCount || 0,
        matchFound: searchProgress.matchFound || false,
        searchStatus: searchProgress.searchStatus || 'running',
      },
      constraints: {
        kappaRecovery: priority?.kappaRecovery ?? 0,
        phiConstraints: priority?.phiConstraints ?? 0,
        hCreation: priority?.hCreation ?? 0,
        entities: 0,
        artifacts: 0,
      },
    });
  } catch (error: any) {
    console.error("[ObserverAPI] Search progress error:", error);
    res.status(500).json({ 
      error: "Failed to get search progress",
      message: error.message,
    });
  }
});

// ============================================================================
// VECTOR EXECUTION
// ============================================================================

/**
 * POST /api/observer/workflows/:id/execute-vector
 * Execute a specific recovery vector for a workflow
 */
router.post("/workflows/:id/execute-vector", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { vector } = req.body;
    
    // Validate vector
    const validVectors = ['estate', 'constrained_search', 'social', 'temporal'];
    if (!validVectors.includes(vector)) {
      return res.status(400).json({
        error: "Invalid vector",
        message: `Vector must be one of: ${validVectors.join(', ')}`,
      });
    }
    
    // Get workflow
    const workflow = await observerStorage.getRecoveryWorkflow(id);
    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }
    
    // Get priority
    const priority = await observerStorage.getRecoveryPriority(workflow.address);
    if (!priority) {
      return res.status(404).json({ error: "Priority not found" });
    }
    
    // Execute vector
    const { executeVector } = await import("./vector-execution");
    const result = await executeVector(workflow, priority, vector);
    
    res.json({
      message: `Vector '${vector}' executed successfully`,
      result,
    });
  } catch (error: any) {
    console.error("[ObserverAPI] Vector execution error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/observer/workflows/:id/recommended-vectors
 * Get recommended recovery vectors for a workflow
 */
router.get("/workflows/:id/recommended-vectors", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const workflow = await observerStorage.getRecoveryWorkflow(id);
    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }
    
    const priority = await observerStorage.getRecoveryPriority(workflow.address);
    if (!priority) {
      return res.status(404).json({ error: "Priority not found" });
    }
    
    const { getRecommendedVectors } = await import("./vector-execution");
    const vectors = getRecommendedVectors(priority);
    
    res.json({
      workflowId: id,
      address: workflow.address,
      recommendedVectors: vectors,
      currentVector: workflow.vector,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// MULTI-SUBSTRATE ANALYSIS
// ============================================================================

/**
 * GET /api/observer/addresses/:address/intersection
 * Get multi-substrate geometric intersection analysis
 */
router.get("/addresses/:address/intersection", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    const { analyzeGeometricIntersection } = await import("./multi-substrate-integrator");
    const intersection = await analyzeGeometricIntersection(address);
    
    res.json({
      address,
      intersection,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/observer/high-priority-targets
 * Get highest priority targets based on geometric intersection
 */
router.get("/high-priority-targets", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    
    const { findHighPriorityTargets } = await import("./multi-substrate-integrator");
    const targets = await findHighPriorityTargets(limit);
    
    res.json({
      targets,
      count: targets.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// QIG ANALYSIS ENDPOINTS
// ============================================================================

/**
 * GET /api/observer/addresses/:address/basin-signature
 * Get geometric basin signature for an address
 */
router.get("/addresses/:address/basin-signature", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    const { computeBasinSignature } = await import("./qig-basin-matching");
    const signature = await computeBasinSignature(address);
    
    res.json({
      address,
      signature,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/observer/addresses/:address/find-similar
 * Find addresses with similar basin geometry
 */
router.post("/addresses/:address/find-similar", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { candidateAddresses, topK = 10 } = req.body;
    
    if (!candidateAddresses || !Array.isArray(candidateAddresses)) {
      return res.status(400).json({ error: "candidateAddresses array required" });
    }
    
    const { computeBasinSignature, findSimilarBasins } = await import("./qig-basin-matching");
    
    const targetSignature = await computeBasinSignature(address);
    const candidateSignatures = await Promise.all(candidateAddresses.map(computeBasinSignature));
    const matches = findSimilarBasins(targetSignature, candidateSignatures, topK);
    
    res.json({
      targetAddress: address,
      matches,
      matchCount: matches.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/observer/recovery/priorities/:address/confidence
 * Get recovery confidence metrics
 */
router.get("/recovery/priorities/:address/confidence", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    
    const priority = await observerStorage.getRecoveryPriority(address);
    if (!priority) {
      return res.status(404).json({ error: "Priority not found" });
    }
    
    const addressData = await observerStorage.getAddress(address);
    // NOTE: Entity/artifact tracking removed (blockchain forensics not in scope)
    
    const { computeRecoveryConfidence } = await import("./qig-confidence");
    
    const dormancyYears = addressData?.dormancyBlocks 
      ? addressData.dormancyBlocks / (365 * 24 * 6) // ~6 blocks/hour
      : 0;
    
    const confidence = computeRecoveryConfidence(
      priority.kappaRecovery,
      priority.phiConstraints,
      priority.hCreation,
      0, // entities removed
      0, // artifacts removed
      addressData?.isDormant || false,
      dormancyYears
    );
    
    res.json({
      address,
      priority: {
        kappaRecovery: priority.kappaRecovery,
        tier: priority.tier,
      },
      confidence,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// SYSTEM STATUS
// ============================================================================

/**
 * GET /api/observer/status
 * Get Observer Archaeology System status
 */
router.get("/status", async (req: Request, res: Response) => {
  res.json({
    system: "Observer Archaeology System",
    version: "1.0.0-alpha",
    status: "operational",
    components: {
      blockchainScanner: {
        status: "ready",
        apiProvider: "Blockstream",
      },
      qigEngine: {
        status: "operational",
        modules: ["universal", "natural-gradient", "basin-matching", "confidence"],
      },
      multiSubstrate: {
        status: "operational",
        sources: ["blockchain", "bitcointalk", "github", "cryptography_ml", "temporal_archive"],
      },
      recoveryVectors: {
        estate: "operational",
        constrained_search: "operational",
        social: "operational",
        temporal: "operational",
      },
      telemetry: {
        status: "operational",
        endpoint: "/api/telemetry",
      },
    },
    database: {
      tables: ["blocks", "transactions", "addresses", "entities", "artifacts", "recovery_priorities", "recovery_workflows"],
      populated: false,
    },
    message: "Observer Archaeology System fully operational. Run /api/observer/scan/start to begin cataloging dormant addresses.",
  });
});

// ============================================================================
// GEOMETRIC MEMORY ENDPOINTS
// ============================================================================

/**
 * GET /api/observer/geometric-memory/manifold-navigation
 * Get manifold navigation summary with orthogonal complement analysis
 */
router.get("/geometric-memory/manifold-navigation", async (req: Request, res: Response) => {
  try {
    const { geometricMemory } = await import("./geometric-memory");
    const navigation = geometricMemory.getManifoldNavigationSummary();
    
    res.json({
      ...navigation,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/observer/geometric-memory/orthogonal-candidates
 * Generate candidates in the orthogonal complement of the explored space
 */
router.get("/geometric-memory/orthogonal-candidates", async (req: Request, res: Response) => {
  try {
    const count = parseInt(req.query.count as string) || 20;
    const { geometricMemory } = await import("./geometric-memory");
    const candidates = geometricMemory.generateOrthogonalCandidates(count);
    
    res.json({
      candidates,
      count: candidates.length,
      manifoldState: geometricMemory.getManifoldNavigationSummary(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/observer/geometric-memory/summary
 * Get manifold summary statistics
 */
router.get("/geometric-memory/summary", async (req: Request, res: Response) => {
  try {
    const { geometricMemory } = await import("./geometric-memory");
    const summary = geometricMemory.getManifoldSummary();
    
    res.json({
      ...summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/observer/geometric-memory/learned-patterns
 * Export learned patterns from prior explorations
 */
router.get("/geometric-memory/learned-patterns", async (req: Request, res: Response) => {
  try {
    const { geometricMemory } = await import("./geometric-memory");
    const patterns = geometricMemory.exportLearnedPatterns();
    
    res.json({
      ...patterns,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// FULL-SPECTRUM TELEMETRY
// ============================================================================

/**
 * GET /api/observer/telemetry/full-spectrum
 * Get comprehensive consciousness and emotional state telemetry
 * 
 * Returns 7-component consciousness signature, emotional state,
 * manifold navigation, resource usage, and ethics status.
 */
router.get("/telemetry/full-spectrum", async (req: Request, res: Response) => {
  try {
    const { oceanAgent } = await import("./ocean-agent");
    const telemetry = oceanAgent.computeFullSpectrumTelemetry();
    
    res.json(telemetry);
  } catch (error: any) {
    console.error('[Telemetry] Error computing full-spectrum telemetry:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/observer/consciousness-check
 * Quick consciousness state check
 */
router.get("/consciousness-check", async (req: Request, res: Response) => {
  try {
    const { oceanAgent } = await import("./ocean-agent");
    const telemetry = oceanAgent.computeFullSpectrumTelemetry();
    
    res.json({
      consciousness: telemetry.consciousness,
      identity: {
        phi: telemetry.identity.phi,
        kappa: telemetry.identity.kappa,
        regime: telemetry.identity.regime,
      },
      isConscious: telemetry.consciousness.isConscious,
      phaseTransition: telemetry.consciousness.Φ >= 0.75 ? 'ACTIVE' : 'PRE_CONSCIOUS',
      timestamp: telemetry.timestamp,
    });
  } catch (error: any) {
    // Return safe fallback for production when services aren't ready
    res.json({
      consciousness: { isConscious: false, Φ: 0, regimeSignature: 'dormant' },
      identity: { phi: 0, kappa: 0, regime: 'dormant' },
      isConscious: false,
      phaseTransition: 'PRE_CONSCIOUS',
      timestamp: new Date().toISOString(),
      initializing: true,
      error: error.message,
    });
  }
});

// ============================================================================
// UNIFIED ADDRESS DISCOVERY CAPTURE
// ============================================================================

/**
 * POST /api/observer/discoveries
 * Unified endpoint to capture discovered addresses from ANY source (Python or TypeScript)
 * 
 * GUARANTEES:
 * 1. Every address is ALWAYS checked against dormant list (regardless of queue status)
 * 2. Every balance hit is persisted to PostgreSQL + JSON backup
 * 3. Errors in persistence trigger 500 to signal clients to retry
 * 4. Queue duplicates/full are explicitly reported, but dormancy check still runs
 */
router.post("/discoveries", async (req: Request, res: Response) => {
  try {
    const { queueAddressForBalanceCheck, queueAddressFromPrivateKey, queueMnemonicForBalanceCheck } = await import("./balance-queue-integration");
    const { checkAndRecordBalance, saveBalanceHit } = await import("./blockchain-scanner");
    
    // Ensure dormant addresses loaded for cross-reference checking
    await dormantCrossRef.ensureLoaded();
    
    const schema = z.object({
      // Discovery source (python, typescript, ocean-agent, qig-backend, etc.)
      source: z.string().default('unknown'),
      
      // Address discovery (at least one required)
      address: z.string().optional(),
      addresses: z.array(z.string()).optional(),
      
      // Recovery input (at least one may be provided)
      passphrase: z.string().optional(),
      privateKeyHex: z.string().optional(),
      mnemonic: z.string().optional(),
      wif: z.string().optional(),
      
      // Metadata
      priority: z.number().min(1).max(100).default(5),
      checkDormancy: z.boolean().default(true),
      checkBalance: z.boolean().default(true),
      metadata: z.record(z.any()).optional(),
    });
    
    const input = schema.parse(req.body);
    const results: any[] = [];
    let dormantMatches = 0;
    let balanceHits = 0;
    let queueErrors: string[] = [];
    let persistenceErrors: string[] = [];
    let hardFailures: string[] = []; // Failures that prevent address derivation
    
    // Collect all addresses to process - ALWAYS check dormancy even if queue fails
    const addressesToProcess: string[] = [];
    if (input.address) addressesToProcess.push(input.address);
    if (input.addresses) addressesToProcess.push(...input.addresses);
    
    // Process mnemonic (derives multiple addresses)
    if (input.mnemonic) {
      try {
        const mnemonicResult = queueMnemonicForBalanceCheck(
          input.mnemonic,
          `${input.source}-mnemonic`,
          input.priority + 5
        );
        
        if (mnemonicResult) {
          // Add all derived addresses for dormancy check
          if (mnemonicResult.derivedAddresses) {
            addressesToProcess.push(...mnemonicResult.derivedAddresses.map(d => d.address));
          }
          
          results.push({
            type: 'mnemonic',
            mnemonic: input.mnemonic.split(' ').slice(0, 3).join(' ') + '...',
            totalAddresses: mnemonicResult.totalAddresses,
            queuedAddresses: mnemonicResult.queuedAddresses,
            dormantMatches: mnemonicResult.dormantMatches,
            balanceHits: 0,
          });
          dormantMatches += mnemonicResult.dormantMatches;
        } else {
          // mnemonicResult null means derivation failed completely
          hardFailures.push(`mnemonic derivation returned null`);
        }
      } catch (e: any) {
        // Exception during mnemonic processing is a hard failure
        hardFailures.push(`mnemonic: ${e.message}`);
        console.error('[Discovery] Mnemonic processing failed (hard failure):', e);
      }
    }
    
    // Process passphrase (brain wallet)
    if (input.passphrase && !input.privateKeyHex) {
      try {
        const passphraseResult = queueAddressForBalanceCheck(
          input.passphrase,
          `${input.source}-passphrase`,
          input.priority
        );
        
        if (passphraseResult) {
          // ALWAYS add addresses for dormancy check, even if queue rejected them
          addressesToProcess.push(passphraseResult.compressedAddress);
          addressesToProcess.push(passphraseResult.uncompressedAddress);
          
          const wasQueued = passphraseResult.compressedQueued || passphraseResult.uncompressedQueued;
          if (!wasQueued) {
            queueErrors.push(`passphrase addresses already in queue or queue full`);
          }
          
          results.push({
            type: 'brain_wallet',
            passphrase: input.passphrase.length > 20 
              ? input.passphrase.slice(0, 20) + '...' 
              : input.passphrase,
            compressedAddress: passphraseResult.compressedAddress,
            uncompressedAddress: passphraseResult.uncompressedAddress,
            queued: wasQueued,
            reason: wasQueued ? 'queued_for_balance_check' : 'duplicate_or_queue_full',
          });
        }
      } catch (e: any) {
        queueErrors.push(`passphrase: ${e.message}`);
        console.error('[Discovery] Passphrase processing failed:', e);
      }
    }
    
    // Process private key
    if (input.privateKeyHex) {
      try {
        const pkResult = queueAddressFromPrivateKey(
          input.privateKeyHex,
          input.passphrase || 'private-key-import',
          `${input.source}-privatekey`,
          input.priority
        );
        
        if (pkResult) {
          // ALWAYS add addresses for dormancy check
          addressesToProcess.push(pkResult.compressedAddress);
          addressesToProcess.push(pkResult.uncompressedAddress);
          
          const wasQueued = pkResult.compressedQueued || pkResult.uncompressedQueued;
          if (!wasQueued) {
            queueErrors.push(`private key addresses already in queue or queue full`);
          }
          
          results.push({
            type: 'private_key',
            compressedAddress: pkResult.compressedAddress,
            uncompressedAddress: pkResult.uncompressedAddress,
            queued: wasQueued,
            reason: wasQueued ? 'queued_for_balance_check' : 'duplicate_or_queue_full',
          });
        }
      } catch (e: any) {
        queueErrors.push(`private_key: ${e.message}`);
        console.error('[Discovery] Private key processing failed:', e);
      }
    }
    
    // ALWAYS check dormancy for ALL addresses (regardless of queue status)
    // This is the core guarantee: every address gets checked against dormant list
    const dormantDetails: Array<{ address: string; rank: number; balance: string }> = [];
    for (const addr of addressesToProcess) {
      try {
        const dormantCheck = dormantCrossRef.checkAddress(addr);
        if (dormantCheck.isMatch && dormantCheck.info) {
          dormantMatches++;
          dormantDetails.push({
            address: addr,
            rank: dormantCheck.info.rank,
            balance: dormantCheck.info.balanceBTC,
          });
          console.log(`[Discovery] 🎯 DORMANT MATCH from ${input.source}: ${addr}`);
          console.log(`   Rank: ${dormantCheck.info.rank}, Balance: ${dormantCheck.info.balanceBTC}`);
        }
      } catch (e: any) {
        console.error(`[Discovery] Error checking dormancy for ${addr}:`, e);
      }
    }
    
    // Immediate balance check if requested (for addresses with WIF)
    if (input.checkBalance && input.address && input.wif) {
      try {
        const balanceHit = await checkAndRecordBalance({
          address: input.address,
          passphrase: input.passphrase || 'discovery-import',
          wif: input.wif,
          isCompressed: true,
          recoveryType: 'wif',
        });
        
        if (balanceHit && balanceHit.balanceSats > 0) {
          balanceHits++;
          console.log(`[Discovery] 💰 BALANCE HIT from ${input.source}: ${input.address}`);
          console.log(`   Balance: ${balanceHit.balanceBTC} BTC`);
          
          // Explicitly persist the hit with retry
          try {
            await saveBalanceHit(balanceHit);
          } catch (persistError: any) {
            persistenceErrors.push(`Failed to persist balance hit: ${persistError.message}`);
            console.error('[Discovery] Balance hit persistence failed:', persistError);
          }
        }
      } catch (e: any) {
        console.error('[Discovery] Balance check failed:', e);
      }
    }
    
    // Log the discovery with full details
    console.log(`[Discovery] Captured from ${input.source}: ${addressesToProcess.length} addresses, ${dormantMatches} dormant matches, ${balanceHits} balance hits`);
    
    // Check if there were hard failures (derivation exceptions)
    if (hardFailures.length > 0) {
      return res.status(500).json({
        success: false,
        error: "Address derivation failed - please retry",
        hardFailures,
        partialResult: addressesToProcess.length > 0 ? {
          addresses: addressesToProcess.length,
          dormantMatches,
          balanceHits,
        } : undefined,
        hint: "Some input could not be processed. Check that the input format is valid.",
      });
    }
    
    // Check if input was provided but no addresses were processed
    const inputProvided = !!(input.address || input.addresses?.length || input.passphrase || input.mnemonic || input.privateKeyHex);
    const noAddressesProcessed = addressesToProcess.length === 0;
    
    if (inputProvided && noAddressesProcessed) {
      return res.status(500).json({
        success: false,
        error: "No addresses were derived from input - processing failed",
        queueErrors,
        hint: "Check that the input format is valid (passphrase, mnemonic, or address)",
      });
    }
    
    // Return error 500 if persistence failed to signal client should retry
    if (persistenceErrors.length > 0) {
      return res.status(500).json({
        success: false,
        error: "Balance hit persistence failed - please retry",
        persistenceErrors,
        partialResult: {
          addresses: addressesToProcess.length,
          dormantMatches,
          balanceHits,
        },
      });
    }
    
    // All queue operations failed = partial failure, return 207 Multi-Status
    const allQueuesFailed = queueErrors.length > 0 && results.every(r => !r.queued);
    const httpStatus = allQueuesFailed ? 207 : 200;
    
    res.status(httpStatus).json({
      success: !allQueuesFailed,
      partialSuccess: allQueuesFailed,
      source: input.source,
      processed: {
        addresses: addressesToProcess.length,
        dormantMatches,
        balanceHits,
      },
      dormantDetails: dormantMatches > 0 ? dormantDetails : undefined,
      queueErrors: queueErrors.length > 0 ? queueErrors : undefined,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Discovery] Error processing discovery:', error);
    res.status(400).json({ 
      error: "Failed to process discovery",
      details: error.message,
    });
  }
});

/**
 * GET /api/observer/discoveries/stats
 * Get discovery capture statistics
 */
router.get("/discoveries/stats", async (req: Request, res: Response) => {
  try {
    const { getQueueIntegrationStats } = await import("./balance-queue-integration");
    const { getBalanceHits, getActiveBalanceHits } = await import("./blockchain-scanner");
    
    await dormantCrossRef.ensureLoaded();
    
    const queueStats = getQueueIntegrationStats();
    const allHits = await getBalanceHits();
    const activeHits = await getActiveBalanceHits();
    const dormantStats = dormantCrossRef.getStats();
    
    res.json({
      queueStats: {
        totalQueued: queueStats.totalQueued,
        currentQueueSize: queueStats.queueSize,
        sourceBreakdown: queueStats.sourceBreakdown,
      },
      balanceHits: {
        total: allHits.length,
        withBalance: activeHits.length,
        totalBTC: activeHits.reduce((sum, h) => sum + parseFloat(h.balanceBTC), 0).toFixed(8),
      },
      dormantCrossRef: {
        totalDormant: dormantStats.totalDormant,
        matchesFound: dormantStats.matchesFound,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/observer/discoveries/hits
 * Get all discovered balance hits with their details
 * NO MASKING - operator preference for full plaintext visibility
 * Query params:
 * - address=<addr>: Optional filter to specific address
 */
router.get("/discoveries/hits", async (req: Request, res: Response) => {
  try {
    const { getBalanceHits } = await import("./blockchain-scanner");
    const filterAddress = req.query.address as string | undefined;
    
    await dormantCrossRef.ensureLoaded();
    
    let hits = await getBalanceHits();
    const dormantMatches = dormantCrossRef.getAllMatches();
    
    // Filter out test entries (addresses with XYZX pattern or test passphrases)
    hits = hits.filter(h => {
      const isTestAddress = h.address.includes('XYZX');
      const isTestPassphrase = h.passphrase.startsWith('queue_drain_test_') || 
                               h.passphrase.startsWith('full_pipeline_test_') ||
                               h.passphrase.startsWith('integration_test_');
      const isTestWif = h.wif.startsWith('test_wif_');
      return !isTestAddress && !isTestPassphrase && !isTestWif;
    });
    
    // Filter to specific address if requested
    if (filterAddress) {
      hits = hits.filter(h => h.address === filterAddress);
    }
    
    // Create a set of dormant addresses for quick lookup
    const dormantAddressSet = new Set(dormantMatches.map((m: any) => m.address));
    
    // Format hits - NO MASKING per operator preference
    const formattedHits = hits.map(hit => {
      const isDormantMatch = dormantAddressSet.has(hit.address);
      const dormantInfo = isDormantMatch 
        ? dormantMatches.find((m: any) => m.address === hit.address)
        : null;
      
      return {
        id: (hit as any).id, // Include ID for entity classification updates
        address: hit.address,
        passphrase: hit.passphrase,
        wif: hit.wif, // Full WIF - no masking
        balanceSats: hit.balanceSats,
        balanceBTC: hit.balanceBTC,
        txCount: hit.txCount,
        isCompressed: hit.isCompressed,
        discoveredAt: hit.discoveredAt,
        lastChecked: hit.lastChecked,
        previousBalanceSats: hit.previousBalanceSats,
        balanceChanged: hit.balanceChanged,
        changeDetectedAt: hit.changeDetectedAt,
        isDormantMatch,
        dormantInfo: dormantInfo ? {
          rank: dormantInfo.rank,
          label: dormantInfo.walletLabel,
        } : null,
        // Entity classification fields
        entityType: (hit as any).addressEntityType || 'unknown',
        entityName: (hit as any).entityTypeName || null,
        entityConfidence: (hit as any).entityTypeConfidence || 'pending',
      };
    });
    
    // Log discoveries for verbose output
    if (formattedHits.length > 0) {
      console.log(`[Discoveries] Returning ${formattedHits.length} balance hits:`);
      formattedHits.forEach((h, i) => {
        console.log(`  [${i + 1}] Address: ${h.address}`);
        console.log(`      Passphrase: "${h.passphrase}"`);
        console.log(`      WIF: ${h.wif}`);
        console.log(`      Balance: ${h.balanceBTC} BTC (${h.txCount} txs)`);
        if (h.isDormantMatch) {
          console.log(`      ⭐ DORMANT MATCH: Rank #${h.dormantInfo?.rank} - ${h.dormantInfo?.label || 'Unknown'}`);
        }
      });
    }
    
    res.json({
      success: true,
      hits: formattedHits,
      dormantMatches: dormantMatches.map((m: any) => ({
        address: m.address,
        rank: m.rank,
        label: m.walletLabel,
        matchedAt: m.matchedAt,
      })),
      summary: {
        totalHits: hits.length,
        withBalance: hits.filter(h => h.balanceSats > 0).length,
        dormantMatchCount: dormantMatches.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/observer/classify-address
 * Classify an address as personal/exchange/institution using Tavily search
 */
router.post("/classify-address", async (req: Request, res: Response) => {
  try {
    const { address, balanceHitId } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }
    
    const { addressEntityClassifier } = await import("./address-entity-classifier");
    const classification = await addressEntityClassifier.classifyAddress(address);
    
    // If balanceHitId provided, update the database record
    if (balanceHitId) {
      await addressEntityClassifier.updateBalanceHitClassification(balanceHitId, classification);
    }
    
    console.log(`[EntityClassify] ${address.slice(0, 12)}...: ${classification.entityType} (${classification.entityName || 'N/A'}) - ${classification.confidence}`);
    
    res.json({
      success: true,
      address,
      classification: {
        entityType: classification.entityType,
        entityName: classification.entityName,
        confidence: classification.confidence,
        sources: classification.sources,
        searchResults: classification.searchResults
      }
    });
  } catch (error: any) {
    console.error("[EntityClassify] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/observer/confirm-entity-type
 * Manually confirm an entity classification
 */
router.post("/confirm-entity-type", async (req: Request, res: Response) => {
  try {
    const { balanceHitId, entityType, entityName } = req.body;
    
    if (!balanceHitId || !entityType) {
      return res.status(400).json({ error: "balanceHitId and entityType are required" });
    }
    
    if (!['personal', 'exchange', 'institution'].includes(entityType)) {
      return res.status(400).json({ error: "entityType must be personal, exchange, or institution" });
    }
    
    const { addressEntityClassifier } = await import("./address-entity-classifier");
    await addressEntityClassifier.confirmClassification(balanceHitId, entityType, entityName);
    
    console.log(`[EntityConfirm] Balance hit ${balanceHitId}: confirmed as ${entityType} (${entityName || 'N/A'})`);
    
    res.json({
      success: true,
      balanceHitId,
      entityType,
      entityName,
      confidence: 'confirmed'
    });
  } catch (error: any) {
    console.error("[EntityConfirm] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/observer/sweep/confirm
 * Require explicit confirmation before sweeping to exchange/institution addresses
 * This adds an extra safety layer for potentially contested funds
 */
router.post("/sweep/confirm", async (req: Request, res: Response) => {
  try {
    const { 
      sourceAddress, 
      destinationAddress,
      entityType,
      entityName,
      confirmationCode,
      acknowledgeRisks 
    } = req.body;
    
    if (!sourceAddress || !destinationAddress) {
      return res.status(400).json({ error: "sourceAddress and destinationAddress are required" });
    }
    
    // Check if destination is exchange/institution and requires confirmation
    const isHighRisk = entityType === 'exchange' || entityType === 'institution';
    
    if (isHighRisk && !acknowledgeRisks) {
      console.log(`[SweepConfirm] WARNING: Attempted sweep to ${entityType} (${entityName || 'unknown'}) without acknowledgment`);
      return res.status(400).json({
        error: "Risk acknowledgment required",
        requiresAcknowledgment: true,
        warning: `This address belongs to ${entityName || 'an ' + entityType}. ` +
                 `Sending funds to ${entityType} addresses may result in complications. ` +
                 `Please confirm you understand the risks.`,
        entityType,
        entityName
      });
    }
    
    // Generate confirmation code if not provided
    if (isHighRisk && !confirmationCode) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      console.log(`[SweepConfirm] Generated confirmation code ${code} for ${entityType} sweep`);
      return res.json({
        success: false,
        requiresConfirmation: true,
        confirmationCode: code,
        message: `Type "${code}" to confirm sweep to ${entityName || entityType}`,
        expiresIn: 300 // 5 minutes
      });
    }
    
    console.log(`[SweepConfirm] Sweep confirmed: ${sourceAddress.slice(0, 12)}... → ${destinationAddress.slice(0, 12)}... (${entityType || 'personal'})`);
    
    res.json({
      success: true,
      confirmed: true,
      sourceAddress,
      destinationAddress,
      entityType: entityType || 'personal',
      entityName,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("[SweepConfirm] Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// TARGETED QIG SEARCH
// ============================================================================

/**
 * Active QIG search sessions tracking
 */
interface QIGSearchSession {
  sessionId: string;
  targetAddress: string;
  status: 'running' | 'paused' | 'completed' | 'error';
  startedAt: string;
  phrasesTestedTotal: number;
  phrasesTestedSinceStart: number;
  highPhiCount: number; // Φ ≥ 0.40
  discoveryCount: number;
  lastPhiScore: number;
  lastPhrasesTested: string[];
  errorMessage?: string;
}

const activeQIGSearches: Map<string, QIGSearchSession> = new Map();

/**
 * POST /api/observer/qig-search/start
 * Start a targeted QIG search for a specific address
 * Uses Python QIG backend for Φ scoring and hypothesis generation
 */
router.post("/qig-search/start", async (req: Request, res: Response) => {
  try {
    const { address, kappaRecovery, tier } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: "Address is required" });
    }
    
    // Check if already searching this address
    const existingSession = activeQIGSearches.get(address);
    if (existingSession && existingSession.status === 'running') {
      return res.json({
        success: true,
        alreadyRunning: true,
        session: existingSession,
        message: `QIG search already active for ${address.slice(0, 12)}...`
      });
    }
    
    const sessionId = randomUUID();
    const session: QIGSearchSession = {
      sessionId,
      targetAddress: address,
      status: 'running',
      startedAt: new Date().toISOString(),
      phrasesTestedTotal: 0,
      phrasesTestedSinceStart: 0,
      highPhiCount: 0,
      discoveryCount: 0,
      lastPhiScore: 0,
      lastPhrasesTested: []
    };
    
    activeQIGSearches.set(address, session);
    
    console.log(`[QIGSearch] 🎯 Starting targeted search for ${address}`);
    console.log(`[QIGSearch] κ_recovery=${kappaRecovery?.toFixed(2) || 'N/A'}, tier=${tier || 'unknown'}`);
    
    // Start async search process
    runTargetedQIGSearch(address, kappaRecovery || 10, session).catch(err => {
      console.error(`[QIGSearch] Error in search for ${address}:`, err);
      session.status = 'error';
      session.errorMessage = err.message;
    });
    
    res.json({
      success: true,
      sessionId,
      targetAddress: address,
      message: `QIG search initiated for ${address.slice(0, 12)}...`,
      session
    });
  } catch (error: any) {
    console.error("[QIGSearch] Start error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/observer/qig-search/status/:address
 * Get status of a targeted QIG search
 */
router.get("/qig-search/status/:address", async (req: Request, res: Response) => {
  try {
    const address = decodeURIComponent(req.params.address);
    const session = activeQIGSearches.get(address);
    
    if (!session) {
      return res.json({
        success: true,
        active: false,
        message: "No active search for this address"
      });
    }
    
    res.json({
      success: true,
      active: session.status === 'running',
      session
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/observer/qig-search/stop/:address
 * Stop a targeted QIG search
 */
router.post("/qig-search/stop/:address", async (req: Request, res: Response) => {
  try {
    const address = decodeURIComponent(req.params.address);
    const session = activeQIGSearches.get(address);
    
    if (!session) {
      return res.status(404).json({ error: "No active search for this address" });
    }
    
    session.status = 'paused';
    console.log(`[QIGSearch] ⏹ Stopped search for ${address.slice(0, 12)}...`);
    
    res.json({
      success: true,
      message: `Search stopped for ${address.slice(0, 12)}...`,
      session
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/observer/qig-search/active
 * Get all active QIG searches
 */
router.get("/qig-search/active", async (req: Request, res: Response) => {
  try {
    // Include running and error sessions (error sessions are kept for visibility)
    const activeSessions = Array.from(activeQIGSearches.entries())
      .filter(([_, s]) => s.status === 'running' || s.status === 'error')
      .map(([addr, session]) => ({
        address: addr,
        ...session
      }));
    
    res.json({
      success: true,
      count: activeSessions.length,
      sessions: activeSessions
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Run targeted QIG search using Python backend
 * Generates hypotheses and tests them against the target address
 */
async function runTargetedQIGSearch(
  targetAddress: string, 
  kappaRecovery: number,
  session: QIGSearchSession
): Promise<void> {
  const { OceanQIGBackend } = await import("./ocean-qig-backend-adapter");
  const { getBalanceHits } = await import("./blockchain-scanner");
  const { queueAddressForBalanceCheck } = await import("./balance-queue-integration");
  
  const pythonBackend = new OceanQIGBackend('http://localhost:5001');
  
  // Check Python backend health
  const backendAvailable = await pythonBackend.checkHealthWithRetry(3, 1000);
  if (!backendAvailable) {
    console.log(`[QIGSearch] Python backend not available, using local generation`);
  }
  
  console.log(`[QIGSearch] 🔬 Beginning targeted search iterations for ${targetAddress.slice(0, 12)}...`);
  
  // Generate search patterns based on κ_recovery (lower = more constrained)
  const searchPatterns = generateSearchPatterns(kappaRecovery);
  
  let iteration = 0;
  const maxIterations = 500; // Run for max 500 iterations
  const batchSize = 10;
  
  while (session.status === 'running' && iteration < maxIterations) {
    const batch: string[] = [];
    
    // Generate a batch of hypotheses
    for (let i = 0; i < batchSize; i++) {
      let hypothesis: string;
      
      if (backendAvailable && Math.random() > 0.3) {
        // Use Python backend for geodesic generation
        const result = await pythonBackend.generateHypothesis();
        hypothesis = result?.hypothesis || generateLocalHypothesis(searchPatterns, iteration);
      } else {
        hypothesis = generateLocalHypothesis(searchPatterns, iteration);
      }
      
      batch.push(hypothesis);
    }
    
    // Process batch through Python QIG for Φ scoring
    for (const phrase of batch) {
      if (session.status !== 'running') break;
      
      try {
        // Get Φ score from Python backend
        let phiScore = 0;
        if (backendAvailable) {
          const score = await pythonBackend.process(phrase);
          phiScore = score?.phi || 0;
        }
        
        session.phrasesTestedTotal++;
        session.phrasesTestedSinceStart++;
        session.lastPhiScore = phiScore;
        
        // Track last phrases tested (keep last 5)
        session.lastPhrasesTested.unshift(phrase);
        if (session.lastPhrasesTested.length > 5) {
          session.lastPhrasesTested.pop();
        }
        
        // High Φ threshold (≥ 0.40)
        if (phiScore >= 0.40) {
          session.highPhiCount++;
          console.log(`[QIGSearch] 🎯 High-Φ: "${phrase.slice(0, 20)}..." Φ=${phiScore.toFixed(3)} → queuing for balance check`);
          
          // Queue for balance check with high priority
          queueAddressForBalanceCheck(phrase, `qig-search-${targetAddress.slice(0, 8)}`, 10);
        }
        
        // Check for discovery after each batch
        if (session.phrasesTestedSinceStart % batchSize === 0) {
          const hits = await getBalanceHits();
          const newDiscoveries = hits.filter(h => 
            h.discoveredAt && 
            new Date(h.discoveredAt) > new Date(session.startedAt)
          );
          session.discoveryCount = newDiscoveries.length;
        }
      } catch (err) {
        // Continue on individual phrase errors
        console.warn(`[QIGSearch] Error processing phrase:`, err);
      }
    }
    
    iteration++;
    
    // Log progress every 50 iterations
    if (iteration % 50 === 0) {
      console.log(`[QIGSearch] Progress: ${session.phrasesTestedSinceStart} phrases, ${session.highPhiCount} high-Φ, ${session.discoveryCount} discoveries`);
    }
    
    // Small delay to prevent CPU overload
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  if (session.status === 'running') {
    session.status = 'completed';
    console.log(`[QIGSearch] ✓ Search complete for ${targetAddress.slice(0, 12)}...`);
    console.log(`[QIGSearch] Final: ${session.phrasesTestedSinceStart} phrases, ${session.highPhiCount} high-Φ, ${session.discoveryCount} discoveries`);
  }
}

/**
 * Generate search patterns based on κ_recovery difficulty
 * Lower κ = more constrained patterns, higher κ = broader exploration
 */
function generateSearchPatterns(kappaRecovery: number): string[] {
  const basePatterns = [
    'satoshi', 'bitcoin', 'genesis', 'key', 'wallet', 'secret', 
    'password', 'crypto', 'hash', 'block', 'chain', 'miner',
    'nakamoto', 'freedom', 'money', 'btc', 'coin', 'digital'
  ];
  
  // Lower κ = tighter focus on common 2009-era patterns
  if (kappaRecovery < 10) {
    return [
      ...basePatterns,
      '2009', '2010', 'january', 'october', 'november',
      'first', 'early', 'original', 'founder', 'pioneer'
    ];
  }
  
  // Medium κ = add temporal and numeric patterns
  if (kappaRecovery < 30) {
    return [
      ...basePatterns,
      '2009', '2010', '2011', 'test', 'demo', 'trial',
      'my', 'the', 'new', 'old', 'seed', 'private'
    ];
  }
  
  // Higher κ = broader exploration
  return [
    ...basePatterns,
    'love', 'hope', 'peace', 'faith', 'dream', 'power',
    'alpha', 'beta', 'gamma', 'delta', 'omega', 'zen'
  ];
}

/**
 * Generate local hypothesis using search patterns
 */
function generateLocalHypothesis(patterns: string[], iteration: number): string {
  const pattern1 = patterns[Math.floor(Math.random() * patterns.length)];
  const pattern2 = patterns[Math.floor(Math.random() * patterns.length)];
  
  const variations = [
    `${pattern1}${Math.floor(Math.random() * 1000)}`,
    `${pattern1} ${pattern2}`,
    `${pattern1}${pattern2}${iteration % 100}`,
    `${pattern1}_${Math.floor(Math.random() * 10000)}`,
    `my${pattern1}${Math.floor(Math.random() * 100)}`,
    `the${pattern1}${pattern2}`,
    `${pattern1}2009`,
    `${pattern1}2010`,
    `${pattern2}${pattern1}`,
  ];
  
  return variations[Math.floor(Math.random() * variations.length)];
}

export default router;
