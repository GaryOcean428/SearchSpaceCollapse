import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { isAuthenticated } from "../replitAuth";
import { getBalanceHits, getActiveBalanceHits, fetchAddressBalance } from "../blockchain-scanner";
import { getBalanceAddresses, getVerificationStats, refreshStoredBalances } from "../address-verification";
import { balanceQueue } from "../balance-queue";
import { getQueueIntegrationStats } from "../balance-queue-integration";

const standardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const balanceRouter = Router();

balanceRouter.get("/hits", standardLimiter, async (req: Request, res: Response) => {
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

balanceRouter.get("/hits/check/:address", standardLimiter, async (req: Request, res: Response) => {
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

balanceRouter.patch("/hits/:address/dormant", standardLimiter, async (req: Request, res: Response) => {
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

balanceRouter.get("/addresses", standardLimiter, async (req: Request, res: Response) => {
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

balanceRouter.get("/addresses/stats", standardLimiter, async (req: Request, res: Response) => {
  try {
    res.set('Cache-Control', 'no-store');
    const stats = getVerificationStats();
    res.json(stats);
  } catch (error: any) {
    console.error("[BalanceAddresses] Stats error:", error);
    res.status(500).json({ error: error.message });
  }
});

balanceRouter.post("/addresses/refresh", isAuthenticated, standardLimiter, async (req: any, res: Response) => {
  try {
    const result = await refreshStoredBalances();
    res.json(result);
  } catch (error: any) {
    console.error("[BalanceAddresses] Refresh error:", error);
    res.status(500).json({ error: error.message });
  }
});

balanceRouter.get("/queue/stats", standardLimiter, async (req: Request, res: Response) => {
  try {
    res.set('Cache-Control', 'no-store');
    const queueStats = balanceQueue.getStats();
    const integrationStats = getQueueIntegrationStats();
    
    res.json({
      queue: queueStats,
      integration: integrationStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[BalanceQueue] Stats error:", error);
    res.status(500).json({ error: error.message });
  }
});

balanceRouter.get("/queue/recent", standardLimiter, async (req: Request, res: Response) => {
  try {
    res.set('Cache-Control', 'no-store');
    const limit = parseInt(req.query.limit as string) || 10;
    const recent = balanceQueue.getRecentResults(limit);
    
    res.json({
      recent,
      count: recent.length,
    });
  } catch (error: any) {
    console.error("[BalanceQueue] Recent error:", error);
    res.status(500).json({ error: error.message });
  }
});

balanceRouter.post("/queue/pause", isAuthenticated, standardLimiter, async (req: any, res: Response) => {
  try {
    balanceQueue.pause();
    res.json({ success: true, message: 'Queue paused' });
  } catch (error: any) {
    console.error("[BalanceQueue] Pause error:", error);
    res.status(500).json({ error: error.message });
  }
});

balanceRouter.post("/queue/resume", isAuthenticated, standardLimiter, async (req: any, res: Response) => {
  try {
    balanceQueue.resume();
    res.json({ success: true, message: 'Queue resumed' });
  } catch (error: any) {
    console.error("[BalanceQueue] Resume error:", error);
    res.status(500).json({ error: error.message });
  }
});

balanceRouter.post("/queue/clear", isAuthenticated, standardLimiter, async (req: any, res: Response) => {
  try {
    balanceQueue.clear();
    res.json({ success: true, message: 'Queue cleared' });
  } catch (error: any) {
    console.error("[BalanceQueue] Clear error:", error);
    res.status(500).json({ error: error.message });
  }
});
