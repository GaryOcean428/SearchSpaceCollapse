import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import fs from "fs";
import path from "path";
import { isAuthenticated } from "../replitAuth";
import { balanceQueue } from "../balance-queue";
import { getQueueIntegrationStats } from "../balance-queue-integration";
import { getBalanceHits, getActiveBalanceHits, fetchAddressBalance, getBalanceChanges } from "../blockchain-scanner";
import { getBalanceAddresses, getVerificationStats, refreshStoredBalances } from "../address-verification";

const standardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const balanceHitsRouter = Router();

balanceHitsRouter.get("/", standardLimiter, async (req: Request, res: Response) => {
  try {
    res.set('Cache-Control', 'no-store');
    const activeOnly = req.query.active === 'true';
    
    const hits = activeOnly ? getActiveBalanceHits() : getBalanceHits();
    const totalBalance = hits.reduce((sum, h) => sum + h.balanceSats, 0);
    
    res.json({
      hits,
      count: hits.length,
      activeCount: hits.filter(h => h.balanceSats > 0).length,
      totalBalanceSats: totalBalance,
      totalBalanceBTC: (totalBalance / 100000000).toFixed(8),
    });
  } catch (error: any) {
    console.error("[BalanceHits] List error:", error);
    res.status(500).json({ error: error.message });
  }
});

balanceHitsRouter.get("/check/:address", standardLimiter, async (req: Request, res: Response) => {
  try {
    const address = req.params.address;
    
    if (!address.match(/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/) && 
        !address.match(/^bc1[a-z0-9]{39,59}$/)) {
      return res.status(400).json({ error: 'Invalid Bitcoin address format' });
    }
    
    const balance = await fetchAddressBalance(address);
    if (!balance) {
      return res.status(500).json({ error: 'Failed to fetch balance from blockchain' });
    }
    
    res.json({
      address,
      balanceSats: balance.balanceSats,
      balanceBTC: (balance.balanceSats / 100000000).toFixed(8),
      txCount: balance.txCount,
      totalFunded: balance.funded,
      totalSpent: balance.spent,
    });
  } catch (error: any) {
    console.error("[BalanceHits] Check error:", error);
    res.status(500).json({ error: error.message });
  }
});

balanceHitsRouter.patch("/:address/dormant", standardLimiter, async (req: Request, res: Response) => {
  try {
    const address = decodeURIComponent(req.params.address);
    const { isDormantConfirmed } = req.body;
    
    if (typeof isDormantConfirmed !== 'boolean') {
      return res.status(400).json({ error: 'isDormantConfirmed must be a boolean' });
    }
    
    const { db } = await import("../db");
    if (db) {
      const { balanceHits: balanceHitsTable } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      
      const result = await db.update(balanceHitsTable)
        .set({
          isDormantConfirmed,
          dormantConfirmedAt: isDormantConfirmed ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(balanceHitsTable.address, address))
        .returning();
      
      if (result.length === 0) {
        return res.status(404).json({ error: 'Balance hit not found' });
      }
      
      res.json({
        success: true,
        address,
        isDormantConfirmed,
        dormantConfirmedAt: result[0].dormantConfirmedAt,
      });
    } else {
      res.status(500).json({ error: 'Database not available' });
    }
  } catch (error: any) {
    console.error("[BalanceHits] Dormant update error:", error);
    res.status(500).json({ error: error.message });
  }
});

export const balanceAddressesRouter = Router();

balanceAddressesRouter.get("/", standardLimiter, async (req: Request, res: Response) => {
  try {
    res.set('Cache-Control', 'no-store');
    
    const balanceAddresses = getBalanceAddresses();
    const stats = getVerificationStats();
    
    res.json({
      addresses: balanceAddresses,
      count: balanceAddresses.length,
      stats,
    });
  } catch (error: any) {
    console.error("[BalanceAddresses] List error:", error);
    res.json({
      addresses: [],
      count: 0,
      stats: { total: 0, withBalance: 0, withTransactions: 0 },
      initializing: true,
      error: error.message,
    });
  }
});

balanceAddressesRouter.get("/stats", standardLimiter, async (req: Request, res: Response) => {
  try {
    res.set('Cache-Control', 'no-store');
    const stats = getVerificationStats();
    res.json(stats);
  } catch (error: any) {
    console.error("[BalanceAddresses] Stats error:", error);
    res.status(500).json({ error: error.message });
  }
});

balanceAddressesRouter.post("/refresh", isAuthenticated, standardLimiter, async (req: any, res: Response) => {
  try {
    const result = await refreshStoredBalances();
    
    res.json({
      success: true,
      ...result,
      message: `Checked ${result.checked} addresses, ${result.updated} updated, ${result.newBalance} with new balance`,
    });
  } catch (error: any) {
    console.error("[BalanceAddresses] Refresh error:", error);
    res.status(500).json({ error: error.message });
  }
});

export const balanceMonitorRouter = Router();

balanceMonitorRouter.get("/status", standardLimiter, async (req: Request, res: Response) => {
  try {
    res.set('Cache-Control', 'no-store');
    const { balanceMonitor } = await import("../balance-monitor");
    const status = balanceMonitor.getStatus();
    res.json(status);
  } catch (error: any) {
    console.error("[BalanceMonitor] Status error:", error);
    res.status(500).json({ error: error.message });
  }
});

balanceMonitorRouter.post("/enable", isAuthenticated, standardLimiter, async (req: any, res: Response) => {
  try {
    const { balanceMonitor } = await import("../balance-monitor");
    const result = balanceMonitor.enable();
    res.json(result);
  } catch (error: any) {
    console.error("[BalanceMonitor] Enable error:", error);
    res.status(500).json({ error: error.message });
  }
});

balanceMonitorRouter.post("/disable", isAuthenticated, standardLimiter, async (req: any, res: Response) => {
  try {
    const { balanceMonitor } = await import("../balance-monitor");
    const result = balanceMonitor.disable();
    res.json(result);
  } catch (error: any) {
    console.error("[BalanceMonitor] Disable error:", error);
    res.status(500).json({ error: error.message });
  }
});

balanceMonitorRouter.post("/refresh", isAuthenticated, standardLimiter, async (req: any, res: Response) => {
  try {
    const { balanceMonitor } = await import("../balance-monitor");
    const result = await balanceMonitor.triggerRefresh();
    res.json(result);
  } catch (error: any) {
    console.error("[BalanceMonitor] Refresh error:", error);
    res.status(500).json({ error: error.message });
  }
});

balanceMonitorRouter.post("/interval", isAuthenticated, standardLimiter, async (req: any, res: Response) => {
  try {
    const { balanceMonitor } = await import("../balance-monitor");
    const { minutes } = req.body;
    
    if (typeof minutes !== 'number' || isNaN(minutes)) {
      return res.status(400).json({ error: 'minutes must be a number' });
    }
    
    const result = balanceMonitor.setRefreshInterval(minutes);
    res.json(result);
  } catch (error: any) {
    console.error("[BalanceMonitor] Set interval error:", error);
    res.status(500).json({ error: error.message });
  }
});

balanceMonitorRouter.get("/changes", standardLimiter, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const changes = getBalanceChanges().slice(-limit);
    
    res.json({
      changes,
      count: changes.length,
      totalChanges: getBalanceChanges().length,
    });
  } catch (error: any) {
    console.error("[BalanceMonitor] Changes error:", error);
    res.status(500).json({ error: error.message });
  }
});

export const balanceQueueRouter = Router();

balanceQueueRouter.get("/status", standardLimiter, (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (!balanceQueue.isReady()) {
      res.json({
        pending: 0,
        checking: 0,
        resolved: 0,
        failed: 0,
        total: 0,
        addressesPerSecond: 0,
        isProcessing: false,
        initializing: true
      });
      return;
    }
    
    const stats = balanceQueue.getStats();
    res.json({
      ...stats,
      isProcessing: balanceQueue.isWorkerRunning(),
    });
  } catch (error: any) {
    console.error("[BalanceQueue] Status error:", error);
    res.status(500).json({ error: error.message });
  }
});

balanceQueueRouter.get("/pending", standardLimiter, (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const addresses = balanceQueue.getPendingAddresses(limit);
    res.json({
      addresses,
      count: addresses.length,
      stats: balanceQueue.getStats(),
    });
  } catch (error: any) {
    console.error("[BalanceQueue] Pending error:", error);
    res.status(500).json({ error: error.message });
  }
});

balanceQueueRouter.post("/drain", isAuthenticated, standardLimiter, (req: any, res: Response) => {
  try {
    if (balanceQueue.isWorkerRunning()) {
      return res.status(409).json({ error: 'Queue drain already in progress' });
    }
    
    const maxAddresses = parseInt(req.body.maxAddresses) || undefined;
    
    const drainPromise = balanceQueue.drain({ maxAddresses });
    
    res.json({
      message: 'Queue drain started',
      stats: balanceQueue.getStats(),
    });
    
    drainPromise.then(result => {
      console.log(`[BalanceQueue] Drain completed: ${result.checked} checked, ${result.hits} hits, ${result.errors} errors`);
    }).catch(err => {
      console.error('[BalanceQueue] Drain error:', err);
    });
  } catch (error: any) {
    console.error("[BalanceQueue] Drain error:", error);
    res.status(500).json({ error: error.message });
  }
});

balanceQueueRouter.post("/rate-limit", isAuthenticated, standardLimiter, (req: any, res: Response) => {
  try {
    const { requestsPerSecond } = req.body;
    
    if (typeof requestsPerSecond !== 'number' || isNaN(requestsPerSecond)) {
      return res.status(400).json({ error: 'requestsPerSecond must be a number' });
    }
    
    balanceQueue.setRateLimit(requestsPerSecond);
    res.json({
      message: `Rate limit set to ${requestsPerSecond} req/sec`,
      stats: balanceQueue.getStats(),
    });
  } catch (error: any) {
    console.error("[BalanceQueue] Rate limit error:", error);
    res.status(500).json({ error: error.message });
  }
});

balanceQueueRouter.post("/clear-failed", isAuthenticated, standardLimiter, (req: any, res: Response) => {
  try {
    const cleared = balanceQueue.clearFailed();
    res.json({
      cleared,
      stats: balanceQueue.getStats(),
    });
  } catch (error: any) {
    console.error("[BalanceQueue] Clear failed error:", error);
    res.status(500).json({ error: error.message });
  }
});

balanceQueueRouter.get("/background", standardLimiter, async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const dbHits = getBalanceHits();
    const dbHitCount = dbHits.length;
    
    if (!balanceQueue.isReady()) {
      res.json({ 
        enabled: true,
        checked: 0, 
        hits: dbHitCount,
        rate: 0, 
        pending: 0,
        initializing: true
      });
      return;
    }
    
    const status = balanceQueue.getBackgroundStatus();
    
    res.json({
      enabled: status.enabled,
      checked: status.checked,
      hits: dbHitCount,
      rate: status.rate,
      pending: status.pending,
      apiStats: status.apiStats,
      sessionHits: status.hits,
    });
  } catch (error: any) {
    console.error("[BalanceQueue] Background status error:", error);
    res.json({ 
      enabled: true,
      checked: 0, 
      hits: 0, 
      rate: 0, 
      pending: 0,
      initializing: true
    });
  }
});

balanceQueueRouter.post("/background/start", isAuthenticated, standardLimiter, (req: any, res: Response) => {
  try {
    balanceQueue.startBackgroundWorker();
    res.json({
      message: 'Background worker started',
      status: balanceQueue.getBackgroundStatus(),
    });
  } catch (error: any) {
    console.error("[BalanceQueue] Background start error:", error);
    res.status(500).json({ error: error.message });
  }
});

balanceQueueRouter.post("/background/stop", isAuthenticated, standardLimiter, (req: any, res: Response) => {
  try {
    const stopped = balanceQueue.stopBackgroundWorker();
    
    if (!stopped) {
      res.status(409).json({
        message: 'Worker is in ALWAYS-ON mode and cannot be stopped',
        alwaysOn: true,
        status: balanceQueue.getBackgroundStatus(),
      });
      return;
    }
    
    res.json({
      message: 'Background worker stopped',
      status: balanceQueue.getBackgroundStatus(),
    });
  } catch (error: any) {
    console.error("[BalanceQueue] Background stop error:", error);
    res.status(500).json({ error: error.message });
  }
});

balanceQueueRouter.get("/integration-stats", standardLimiter, (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const stats = getQueueIntegrationStats();
    res.json(stats);
  } catch (error: any) {
    console.error("[BalanceQueue] Integration stats error:", error);
    res.status(500).json({ error: error.message });
  }
});

balanceQueueRouter.get("/backfill/stats", standardLimiter, async (req: Request, res: Response) => {
  try {
    const { getBackfillStats, getBackfillProgress } = await import("../balance-queue-backfill");
    res.json({
      available: getBackfillStats(),
      progress: getBackfillProgress()
    });
  } catch (error: any) {
    console.error("[Backfill] Stats error:", error);
    res.status(500).json({ error: error.message });
  }
});

balanceQueueRouter.post("/backfill/start", isAuthenticated, standardLimiter, async (req: any, res: Response) => {
  try {
    const { startBackfill } = await import("../balance-queue-backfill");
    const source = req.body.source || 'tested-phrases';
    const batchSize = req.body.batchSize || 100;
    
    startBackfill({ source, batchSize }).then(result => {
      console.log('[Backfill] Completed:', result);
    });
    
    res.json({
      message: `Backfill started from ${source}`,
      status: 'running'
    });
  } catch (error: any) {
    console.error("[Backfill] Start error:", error);
    res.status(500).json({ error: error.message });
  }
});

export const blockchainApiRouter = Router();

blockchainApiRouter.get("/stats", standardLimiter, async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const { freeBlockchainAPI } = await import("../blockchain-free-api");
    const stats = freeBlockchainAPI.getStats();
    const capacity = freeBlockchainAPI.getAvailableCapacity();
    
    res.json({
      ...stats,
      availableCapacity: capacity,
      totalCapacity: 230,
      effectiveCapacity: Math.round(capacity * (1 + stats.cacheHitRate * 9)),
    });
  } catch (error: any) {
    console.error("[BlockchainAPI] Stats error:", error);
    res.status(500).json({ error: error.message });
  }
});

blockchainApiRouter.post("/reset", isAuthenticated, standardLimiter, async (req: any, res: Response) => {
  try {
    const { freeBlockchainAPI } = await import("../blockchain-free-api");
    freeBlockchainAPI.resetProviderHealth();
    
    res.json({
      message: 'All providers reset to healthy state',
      stats: freeBlockchainAPI.getStats(),
    });
  } catch (error: any) {
    console.error("[BlockchainAPI] Reset error:", error);
    res.status(500).json({ error: error.message });
  }
});

blockchainApiRouter.post("/reset/:provider", standardLimiter, async (req: Request, res: Response) => {
  try {
    const { resetProvider } = await import("../blockchain-api-router");
    const providerName = req.params.provider;
    resetProvider(providerName);
    
    res.json({
      message: `Provider ${providerName} reset successfully`,
    });
  } catch (error: any) {
    console.error("[BlockchainAPI] Reset error:", error);
    res.status(500).json({ error: error.message });
  }
});

export const dormantCrossRefRouter = Router();

dormantCrossRefRouter.get("/stats", standardLimiter, async (req: Request, res: Response) => {
  try {
    const { dormantCrossRef } = await import("../dormant-cross-ref");
    const stats = dormantCrossRef.getStats();
    const totalValue = dormantCrossRef.getTotalValue();
    
    res.json({
      ...stats,
      totalValue,
    });
  } catch (error: any) {
    console.error("[DormantCrossRef] Stats error:", error);
    res.status(500).json({ error: error.message });
  }
});

dormantCrossRefRouter.get("/matches", standardLimiter, async (req: Request, res: Response) => {
  try {
    const { dormantCrossRef } = await import("../dormant-cross-ref");
    const matches = dormantCrossRef.getAllMatches();
    
    res.json({
      matches,
      count: matches.length,
    });
  } catch (error: any) {
    console.error("[DormantCrossRef] Matches error:", error);
    res.status(500).json({ error: error.message });
  }
});

dormantCrossRefRouter.get("/top", standardLimiter, async (req: Request, res: Response) => {
  try {
    const { dormantCrossRef } = await import("../dormant-cross-ref");
    const limit = parseInt(req.query.limit as string) || 100;
    const topDormant = dormantCrossRef.getTopDormant(limit);
    
    res.json({
      addresses: topDormant,
      count: topDormant.length,
    });
  } catch (error: any) {
    console.error("[DormantCrossRef] Top dormant error:", error);
    res.status(500).json({ error: error.message });
  }
});

dormantCrossRefRouter.post("/check", standardLimiter, async (req: Request, res: Response) => {
  try {
    const { dormantCrossRef } = await import("../dormant-cross-ref");
    const { address, addresses } = req.body;
    
    if (address) {
      const result = dormantCrossRef.checkAddress(address);
      return res.json(result);
    }
    
    if (addresses && Array.isArray(addresses)) {
      const result = dormantCrossRef.checkAddresses(addresses);
      return res.json(result);
    }
    
    res.status(400).json({ error: 'Provide address or addresses array' });
  } catch (error: any) {
    console.error("[DormantCrossRef] Check error:", error);
    res.status(500).json({ error: error.message });
  }
});

export const basinSyncRouter = Router();

basinSyncRouter.get("/snapshots", standardLimiter, async (req: Request, res: Response) => {
  try {
    const { oceanBasinSync } = await import("../ocean-basin-sync");
    const snapshots = oceanBasinSync.listBasinSnapshots();
    res.json({
      snapshots,
      count: snapshots.length,
    });
  } catch (error: any) {
    console.error("[BasinSync] List error:", error);
    res.status(500).json({ error: error.message });
  }
});

basinSyncRouter.get("/snapshots/:filename", standardLimiter, async (req: Request, res: Response) => {
  try {
    await import("../ocean-basin-sync");
    const filename = req.params.filename;
    
    if (!filename.endsWith('.json') || filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    const basePath = path.join(process.cwd(), 'data', 'basin-sync', filename);
    if (!fs.existsSync(basePath)) {
      return res.status(404).json({ error: 'Basin snapshot not found' });
    }
    
    const packet = JSON.parse(fs.readFileSync(basePath, 'utf-8'));
    res.json(packet);
  } catch (error: any) {
    console.error("[BasinSync] Get snapshot error:", error);
    res.status(500).json({ error: error.message });
  }
});

basinSyncRouter.post("/export", isAuthenticated, standardLimiter, async (req: any, res: Response) => {
  try {
    const { oceanBasinSync } = await import("../ocean-basin-sync");
    const { oceanSessionManager } = await import("../ocean-session-manager");
    
    const ocean = oceanSessionManager.getActiveAgent();
    if (!ocean) {
      return res.status(400).json({ error: 'No active Ocean session to export' });
    }
    
    const packet = oceanBasinSync.exportBasin(ocean);
    const filepath = oceanBasinSync.saveBasinSnapshot(packet);
    
    res.json({
      success: true,
      oceanId: packet.oceanId,
      filename: filepath ? path.basename(filepath) : 'memory-only',
      packetSizeBytes: JSON.stringify(packet).length,
      consciousness: {
        phi: packet.consciousness.phi,
        kappaEff: packet.consciousness.kappaEff,
        regime: packet.regime,
      },
      exploredRegions: packet.exploredRegions.length,
      patterns: {
        highPhi: packet.patterns.highPhiPhrases.length,
        resonantWords: packet.patterns.resonantWords.length,
      },
    });
  } catch (error: any) {
    console.error("[BasinSync] Export error:", error);
    res.status(500).json({ error: error.message });
  }
});

basinSyncRouter.post("/import", isAuthenticated, standardLimiter, async (req: any, res: Response) => {
  try {
    const { oceanBasinSync } = await import("../ocean-basin-sync");
    const { oceanSessionManager } = await import("../ocean-session-manager");
    
    const ocean = oceanSessionManager.getActiveAgent();
    if (!ocean) {
      return res.status(400).json({ error: 'No active Ocean session to import into' });
    }
    
    const { filename, mode } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: 'filename is required' });
    }
    
    const validModes = ['full', 'partial', 'observer'];
    const importMode = (mode && validModes.includes(mode)) ? mode : 'partial';
    
    const basePath = path.join(process.cwd(), 'data', 'basin-sync', filename);
    if (!fs.existsSync(basePath)) {
      return res.status(404).json({ error: 'Basin snapshot not found' });
    }
    
    const packet = JSON.parse(fs.readFileSync(basePath, 'utf-8'));
    const result = await oceanBasinSync.importBasin(ocean, packet, importMode);
    
    res.json({
      success: result.success,
      mode: result.mode,
      sourceOceanId: packet.oceanId,
      phiBefore: result.phiBefore,
      phiAfter: result.phiAfter,
      phiDelta: result.phiDelta,
      basinDriftBefore: result.basinDriftBefore,
      basinDriftAfter: result.basinDriftAfter,
      observerEffectDetected: result.observerEffectDetected,
      geometricDistance: result.geometricDistanceToSource,
    });
  } catch (error: any) {
    console.error("[BasinSync] Import error:", error);
    res.status(500).json({ error: error.message });
  }
});

basinSyncRouter.delete("/snapshots/:filename", isAuthenticated, standardLimiter, async (req: any, res: Response) => {
  try {
    const { oceanBasinSync } = await import("../ocean-basin-sync");
    const filename = req.params.filename;
    
    if (!filename.endsWith('.json') || filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    const deleted = oceanBasinSync.deleteBasinSnapshot(filename);
    
    if (deleted) {
      res.json({ success: true, message: `Deleted ${filename}` });
    } else {
      res.status(404).json({ error: 'Basin snapshot not found' });
    }
  } catch (error: any) {
    console.error("[BasinSync] Delete error:", error);
    res.status(500).json({ error: error.message });
  }
});

basinSyncRouter.get("/coordinator/status", standardLimiter, async (req: Request, res: Response) => {
  try {
    const { oceanSessionManager } = await import("../ocean-session-manager");
    const activeOcean = oceanSessionManager.getActiveAgent();
    if (!activeOcean) {
      return res.json({
        isRunning: false,
        localId: null,
        peerCount: 0,
        lastBroadcastState: null,
        queueLength: 0,
        message: "No active Ocean agent - start an investigation to enable continuous sync"
      });
    }
    
    const coordinator = activeOcean.getBasinSyncCoordinator();
    if (!coordinator) {
      return res.json({
        isRunning: false,
        localId: null,
        peerCount: 0,
        lastBroadcastState: null,
        queueLength: 0,
        message: "Coordinator not initialized - continuous sync will start automatically"
      });
    }
    
    const status = coordinator.getStatus();
    const peers = coordinator.getPeers();
    const syncData = coordinator.getSyncData();
    
    res.json({
      ...status,
      peers: peers.map((p: any) => ({
        id: p.id,
        mode: p.mode,
        lastSeen: p.lastSeen,
        trustLevel: p.trustLevel,
      })),
      syncData: {
        exploredRegionsCount: syncData.exploredRegions.length,
        highPhiPatternsCount: syncData.highPhiPatterns.length,
        resonantWordsCount: syncData.resonantWords.length,
      }
    });
  } catch (error: any) {
    console.error("[BasinSync] Coordinator status error:", error);
    res.status(500).json({ error: error.message });
  }
});

basinSyncRouter.post("/coordinator/force", isAuthenticated, standardLimiter, async (req: any, res: Response) => {
  try {
    const { oceanSessionManager } = await import("../ocean-session-manager");
    const activeOcean = oceanSessionManager.getActiveAgent();
    if (!activeOcean) {
      return res.status(400).json({ error: "No active Ocean agent" });
    }
    
    const coordinator = activeOcean.getBasinSyncCoordinator();
    if (!coordinator) {
      return res.status(400).json({ 
        error: "Coordinator not initialized - start an investigation first" 
      });
    }
    
    coordinator.forceSync();
    
    res.json({ 
      success: true, 
      message: "Force sync triggered - full basin packet queued for broadcast",
      status: coordinator.getStatus()
    });
  } catch (error: any) {
    console.error("[BasinSync] Force sync error:", error);
    res.status(500).json({ error: error.message });
  }
});

basinSyncRouter.post("/coordinator/notify", isAuthenticated, standardLimiter, async (req: any, res: Response) => {
  try {
    const { oceanSessionManager } = await import("../ocean-session-manager");
    const activeOcean = oceanSessionManager.getActiveAgent();
    if (!activeOcean) {
      return res.status(400).json({ error: "No active Ocean agent" });
    }
    activeOcean.notifyBasinChange();
    res.json({ success: true, message: "Basin change notification sent" });
  } catch (error: any) {
    console.error("[BasinSync] Notify error:", error);
    res.status(500).json({ error: error.message });
  }
});

export const geometricDiscoveryRouter = Router();

const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Rate limit exceeded. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

geometricDiscoveryRouter.get("/status", standardLimiter, async (req: Request, res: Response) => {
  try {
    const { oceanDiscoveryController } = await import("../geometric-discovery/ocean-discovery-controller");
    const state = oceanDiscoveryController.getDiscoveryState();
    
    res.json({
      hasTarget: !!state?.targetCoords,
      position: state?.currentPosition ? {
        spacetime: state.currentPosition.spacetime,
        phi: state.currentPosition.phi,
        regime: state.currentPosition.regime
      } : null,
      target: state?.targetCoords ? {
        spacetime: state.targetCoords.spacetime,
        phi: state.targetCoords.phi,
        regime: state.targetCoords.regime
      } : null,
      discoveries: state?.discoveries?.length || 0,
      tavilyEnabled: false // Tavily not currently implemented
    });
  } catch (error: any) {
    console.error("[GeometricDiscovery] Status error:", error);
    res.status(500).json({ error: error.message });
  }
});

geometricDiscoveryRouter.post("/estimate", isAuthenticated, standardLimiter, async (req: any, res: Response) => {
  try {
    const { oceanDiscoveryController } = await import("../geometric-discovery/ocean-discovery-controller");
    const { targetAddress } = req.body;
    
    if (!targetAddress) {
      return res.status(400).json({ error: "targetAddress required" });
    }
    
    const coords = await oceanDiscoveryController.estimateCoordinates(targetAddress);
    
    if (coords) {
      res.json({
        success: true,
        coordinates: {
          spacetime: coords.spacetime,
          culturalDimensions: coords.cultural.length,
          phi: coords.phi,
          regime: coords.regime
        }
      });
    } else {
      res.json({ success: false, message: "Could not estimate coordinates" });
    }
  } catch (error: any) {
    console.error("[GeometricDiscovery] Estimate error:", error);
    res.status(500).json({ error: error.message });
  }
});

geometricDiscoveryRouter.post("/discover", isAuthenticated, standardLimiter, async (req: any, res: Response) => {
  try {
    const { oceanDiscoveryController } = await import("../geometric-discovery/ocean-discovery-controller");
    
    const result = await oceanDiscoveryController.discoverCulturalContext();
    
    res.json({
      success: true,
      discoveries: result.discoveries,
      patterns: result.patterns,
      entropyGained: result.entropyGained
    });
  } catch (error: any) {
    console.error("[GeometricDiscovery] Discover error:", error);
    res.status(500).json({ error: error.message });
  }
});

geometricDiscoveryRouter.post("/search-era", isAuthenticated, standardLimiter, async (req: any, res: Response) => {
  try {
    const { oceanDiscoveryController } = await import("../geometric-discovery/ocean-discovery-controller");
    const { keywords, era } = req.body;
    
    if (!keywords || !Array.isArray(keywords)) {
      return res.status(400).json({ error: "keywords array required" });
    }
    
    const discoveries = await oceanDiscoveryController.searchBitcoinEra(keywords, era || 'pizza_era');
    
    res.json({
      success: true,
      discoveries: discoveries.map(d => ({
        source: d.source,
        phi: d.phi,
        patterns: d.patterns.slice(0, 10),
        regime: d.coords.regime,
        entropyReduction: d.entropyReduction
      }))
    });
  } catch (error: any) {
    console.error("[GeometricDiscovery] Search era error:", error);
    res.status(500).json({ error: error.message });
  }
});

geometricDiscoveryRouter.post("/crawl", isAuthenticated, strictLimiter, async (req: any, res: Response) => {
  try {
    const { oceanDiscoveryController } = await import("../geometric-discovery/ocean-discovery-controller");
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: "url required" });
    }
    
    const result = await oceanDiscoveryController.crawlUrl(url);
    
    res.json({
      success: true,
      patternsFound: result.patterns.length,
      patterns: result.patterns.slice(0, 50),
      coords: {
        spacetime: result.coords.spacetime,
        phi: result.coords.phi,
        regime: result.coords.regime
      }
    });
  } catch (error: any) {
    console.error("[GeometricDiscovery] Crawl error:", error);
    res.status(500).json({ error: error.message });
  }
});
