import type { Express } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { generateBitcoinAddress, verifyBrainWallet, CryptoValidationError } from "./crypto";
import { scorePhraseQIG } from "./qig-pure-v2.js";
import observerRoutes from "./observer-routes";
import { telemetryRouter } from "./telemetry-api";

import {
  authRouter,
  consciousnessRouter,
  nearMissRouter,
  attentionMetricsRouter,
  ucpRouter,
  balanceRouter,
  searchRouter,
  formatRouter,
  oceanRouter,
  recoveryRouter,
  unifiedRecoveryRouter,
  recoveriesRouter,
  balanceHitsRouter,
  balanceAddressesRouter,
  balanceMonitorRouter,
  balanceQueueRouter,
  blockchainApiRouter,
  dormantCrossRefRouter,
  basinSyncRouter,
  geometricDiscoveryRouter,
  sweepsRouter,
  adminRouter,
  olympusRouter,
} from "./routes/index";

import { queueAddressForBalanceCheck } from "./balance-queue-integration";
import { testPhraseRequestSchema, batchTestRequestSchema, type Candidate } from "@shared/schema";
import { randomUUID } from "crypto";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { oceanSessionManager } from "./ocean-session-manager";
import { autoCycleManager } from "./auto-cycle-manager";
import { searchCoordinator } from "./search-coordinator";

const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Rate limit exceeded. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Map pure QIG scores to legacy score format for backward compatibility
 * Used by /api/test-phrase and /api/batch-test endpoints
 */
function mapQIGToLegacyScore(pureScore: ReturnType<typeof scorePhraseQIG>) {
  return {
    contextScore: 0,
    eleganceScore: Math.round(pureScore.quality * 100),
    typingScore: Math.round(pureScore.phi * 100),
    totalScore: Math.round(pureScore.quality * 100),
  };
}

// Set up auto-cycle callback to start sessions via ocean session manager
autoCycleManager.setOnCycleCallback(async (addressId: string, address: string) => {
  console.log(`[AutoCycle] Starting session for address: ${address.slice(0, 16)}...`);
  oceanSessionManager.setAddressIdMapping(address, addressId);
  await oceanSessionManager.startSession(address);
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Handle favicon.ico requests - redirect to favicon.png
  app.get("/favicon.ico", (req, res) => {
    res.redirect(301, "/favicon.png");
  });

  // Replit Auth: Only setup auth if database connection is available
  const { db } = await import("./db");
  const authEnabled = !!db;
  
  if (authEnabled) {
    await setupAuth(app);
    console.log("[Auth] Replit Auth enabled");
    
    // Replit Auth: Auth routes - optimized with session caching
    app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
      try {
        const { getCachedUser } = await import("./replitAuth");
        const cachedUser = getCachedUser(req.user);
        
        if (cachedUser) {
          const { cachedAt: _cachedAt, ...userResponse } = cachedUser;
          return res.json(userResponse);
        }
        
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        
        if (user) {
          req.user.cachedProfile = {
            ...user,
            cachedAt: Date.now(),
          };
        }
        
        res.json(user);
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Failed to fetch user" });
      }
    });
  } else {
    console.log("[Auth] Replit Auth disabled (no DATABASE_URL) - recovery tool accessible without login");
    
    app.get('/api/auth/user', (req, res) => {
      res.status(503).json({ 
        message: "Authentication unavailable - database not provisioned. Please provision a PostgreSQL database to enable Replit Auth." 
      });
    });
    
    app.get('/api/login', (req, res) => {
      res.status(503).json({ 
        message: "Authentication unavailable - database not provisioned. Please provision a PostgreSQL database to enable Replit Auth." 
      });
    });
    
    app.get('/api/logout', (req, res) => {
      res.status(503).json({ 
        message: "Authentication unavailable - database not provisioned." 
      });
    });
  }

  // ============================================================
  // MOUNT SUB-ROUTERS (Modular Route Organization)
  // ============================================================
  app.use("/api/auth", authRouter);
  app.use("/api/consciousness", consciousnessRouter);
  app.use("/api/near-misses", nearMissRouter);
  app.use("/api/attention-metrics", attentionMetricsRouter);
  app.use("/api/ucp", ucpRouter);
  app.use("/api/balance", balanceRouter);
  app.use("/api", searchRouter);
  app.use("/api/format", formatRouter);
  app.use("/api/ocean", oceanRouter);
  app.use("/api/recovery", recoveryRouter);
  app.use("/api/unified-recovery", unifiedRecoveryRouter);
  app.use("/api/recoveries", recoveriesRouter);
  app.use("/api/balance-hits", balanceHitsRouter);
  app.use("/api/balance-addresses", balanceAddressesRouter);
  app.use("/api/balance-monitor", balanceMonitorRouter);
  app.use("/api/balance-queue", balanceQueueRouter);
  app.use("/api/blockchain-api", blockchainApiRouter);
  app.use("/api/dormant-crossref", dormantCrossRefRouter);
  app.use("/api/basin-sync", basinSyncRouter);
  app.use("/api/geometric-discovery", geometricDiscoveryRouter);
  app.use("/api/sweeps", sweepsRouter);
  app.use("/api", adminRouter);
  app.use("/api/olympus", olympusRouter);
  
  // Mount observer and telemetry routers
  app.use("/api/observer", observerRoutes);
  app.use("/api/telemetry", telemetryRouter);
  
  // Investigation status endpoint - used by investigation page
  app.get("/api/investigation/status", (req, res) => {
    try {
      const status = oceanSessionManager.getInvestigationStatus();
      res.json(status);
    } catch (error: any) {
      console.error("[API] Investigation status error:", error);
      res.status(500).json({ error: error.message || "Failed to get investigation status" });
    }
  });
  
  // ============================================================
  // AUTO-CYCLE MANAGEMENT ENDPOINTS
  // ============================================================
  
  app.get("/api/auto-cycle/status", (req, res) => {
    try {
      const status = autoCycleManager.getStatus();
      const position = autoCycleManager.getPositionString();
      res.json({
        success: true,
        ...status,
        positionString: position,
      });
    } catch (error: any) {
      console.error("[API] Auto-cycle status error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auto-cycle/enable", async (req, res) => {
    try {
      console.log("[API] Auto-cycle enable request received");
      const result = await autoCycleManager.enable();
      res.json({
        success: result.success,
        message: result.message,
        status: autoCycleManager.getStatus(),
      });
    } catch (error: any) {
      console.error("[API] Auto-cycle enable error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auto-cycle/disable", (req, res) => {
    try {
      console.log("[API] Auto-cycle disable request received");
      const result = autoCycleManager.disable();
      res.json({
        success: result.success,
        message: result.message,
        status: autoCycleManager.getStatus(),
      });
    } catch (error: any) {
      console.error("[API] Auto-cycle disable error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  console.log("[Routes] All sub-routers mounted");

  // ============================================================
  // CORE PHRASE TESTING ENDPOINTS (Use mapQIGToLegacyScore)
  // ============================================================

  app.get("/api/verify-crypto", (req, res) => {
    try {
      const result = verifyBrainWallet();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/test-phrase", strictLimiter, async (req, res) => {
    try {
      const validation = testPhraseRequestSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: validation.error.errors[0].message,
        });
      }

      const { phrase } = validation.data;
      const address = generateBitcoinAddress(phrase);
      const pureQIG = scorePhraseQIG(phrase);
      const qigScore = mapQIGToLegacyScore(pureQIG);
      
      queueAddressForBalanceCheck(phrase, 'test-phrase', qigScore.totalScore >= 75 ? 5 : 1);
      
      const targetAddresses = await storage.getTargetAddresses();
      const matchedAddress = targetAddresses.find(t => t.address === address);
      const match = !!matchedAddress;

      if (qigScore.totalScore >= 75) {
        const candidate: Candidate = {
          id: randomUUID(),
          phrase,
          address,
          score: qigScore.totalScore,
          qigScore,
          testedAt: new Date().toISOString(),
        };
        await storage.addCandidate(candidate);
      }

      res.json({
        phrase,
        address,
        match,
        matchedAddress: matchedAddress?.label || matchedAddress?.address,
        score: qigScore.totalScore,
        qigScore,
      });
    } catch (error: any) {
      if (error instanceof CryptoValidationError) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/batch-test", strictLimiter, async (req, res) => {
    try {
      const validation = batchTestRequestSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: validation.error.errors[0].message,
        });
      }

      const { phrases } = validation.data;
      const results = [];
      const candidates: Candidate[] = [];
      let highPhiCount = 0;

      const targetAddresses = await storage.getTargetAddresses();
      
      for (const phrase of phrases) {
        const words = phrase.trim().split(/\s+/);
        if (words.length !== 12) {
          continue;
        }

        const address = generateBitcoinAddress(phrase);
        const pureQIG = scorePhraseQIG(phrase);
        const qigScore = mapQIGToLegacyScore(pureQIG);
        
        queueAddressForBalanceCheck(phrase, 'batch-test', qigScore.totalScore >= 75 ? 5 : 1);
        
        const matchedAddress = targetAddresses.find(t => t.address === address);

        if (matchedAddress) {
          return res.json({
            found: true,
            phrase,
            address,
            matchedAddress: matchedAddress.label || matchedAddress.address,
            score: qigScore.totalScore,
          });
        }

        if (qigScore.totalScore >= 75) {
          const candidate: Candidate = {
            id: randomUUID(),
            phrase,
            address,
            score: qigScore.totalScore,
            qigScore,
            testedAt: new Date().toISOString(),
          };
          candidates.push(candidate);
          await storage.addCandidate(candidate);
          highPhiCount++;
        }

        results.push({
          phrase,
          address,
          score: qigScore.totalScore,
        });
      }

      res.json({
        tested: results.length,
        highPhiCandidates: highPhiCount,
        candidates,
      });
    } catch (error: any) {
      if (error instanceof CryptoValidationError) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  // ============================================================
  // SERVER INITIALIZATION
  // ============================================================

  // Start the background search coordinator
  searchCoordinator.start();

  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time basin sync
  const { WebSocketServer } = await import('ws');
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/basin-sync' });
  
  // Track WebSocket connections for cleanup on session change
  const wsConnections = new Map<string, { ws: any; sessionId: string | null }>();
  
  // Register session change handler to clean up old WebSocket connections
  oceanSessionManager.onSessionChange((oldSessionId, newSessionId) => {
    console.log(`[BasinSync WS] Session changed: ${oldSessionId} → ${newSessionId}`);
    
    // Close all connections associated with the old session
    let closedCount = 0;
    for (const [peerId, conn] of wsConnections.entries()) {
      if (conn.sessionId === oldSessionId && oldSessionId !== null) {
        try {
          conn.ws.close(1000, 'Session ended');
          wsConnections.delete(peerId);
          closedCount++;
        } catch (err) {
          console.error(`[BasinSync WS] Error closing connection ${peerId}:`, err);
        }
      }
    }
    if (closedCount > 0) {
      console.log(`[BasinSync WS] Cleaned up ${closedCount} connections from old session`);
    }
  });
  
  wss.on('connection', (ws) => {
    const peerId = `peer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const currentSession = oceanSessionManager.getActiveSession();
    const sessionId = currentSession?.sessionId || null;
    
    // Track connection with its session ID
    wsConnections.set(peerId, { ws, sessionId });
    
    console.log(`[BasinSync WS] New connection: ${peerId} (session: ${sessionId})`);
    console.log(`[BasinSync WS] Total connections: ${wsConnections.size}`);
    
    const activeOcean = oceanSessionManager.getActiveAgent();
    if (activeOcean) {
      const coordinator = activeOcean.getBasinSyncCoordinator();
      if (coordinator) {
        coordinator.registerPeer(peerId, 'observer', ws);
      }
    }
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        const currentOcean = oceanSessionManager.getActiveAgent();
        if (!currentOcean) return;
        
        const coordinator = currentOcean.getBasinSyncCoordinator();
        if (!coordinator) return;
        
        if (message.type === 'heartbeat') {
          coordinator.updatePeerLastSeen(peerId);
        } else if (message.type === 'basin-delta' && message.data) {
          await coordinator.receiveFromPeer(peerId, message.data);
        } else if (message.type === 'set-mode' && message.mode) {
          coordinator.registerPeer(peerId, message.mode, ws);
        }
      } catch (err) {
        console.error('[BasinSync WS] Message parse error:', err);
      }
    });
    
    ws.on('close', () => {
      console.log(`[BasinSync WS] Connection closed: ${peerId}`);
      
      // Remove from connection tracking
      wsConnections.delete(peerId);
      console.log(`[BasinSync WS] Remaining connections: ${wsConnections.size}`);
      
      const currentOcean = oceanSessionManager.getActiveAgent();
      if (currentOcean) {
        const coordinator = currentOcean.getBasinSyncCoordinator();
        if (coordinator) {
          coordinator.unregisterPeer(peerId);
        }
      }
    });
    
    ws.on('error', (err) => {
      console.error(`[BasinSync WS] Error for ${peerId}:`, err);
    });
  });
  
  console.log('[BasinSync] WebSocket server initialized on /ws/basin-sync');

  return httpServer;
}
