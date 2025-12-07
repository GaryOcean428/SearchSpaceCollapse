import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import fs from "fs";
import path from "path";
import { storage } from "../storage";
import { unifiedRecovery } from "../unified-recovery";
import { isAuthenticated } from "../replitAuth";

const generousLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const standardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const recoveryRouter = Router();

const recoveriesDir = path.join(process.cwd(), 'data', 'recoveries');

recoveryRouter.get("/session", isAuthenticated, async (req: any, res: Response) => {
  try {
    const sessions = unifiedRecovery.getAllSessions();
    const activeSession = sessions.find(s => s.status === 'running' || s.status === 'analyzing');
    res.json(activeSession || null);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

recoveryRouter.get("/candidates", isAuthenticated, async (req: any, res: Response) => {
  try {
    const sessions = unifiedRecovery.getAllSessions();
    const activeSession = sessions.find(s => s.status === 'running' || s.status === 'analyzing');
    res.json(activeSession?.candidates || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

recoveryRouter.get("/addresses", isAuthenticated, async (req: any, res: Response) => {
  try {
    const addresses = await storage.getTargetAddresses();
    res.json(addresses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

recoveryRouter.post("/checkpoint", standardLimiter, async (req: Request, res: Response) => {
  try {
    const { randomUUID } = await import("crypto");
    const { oceanSessionManager } = await import("../ocean-session-manager");
    const { activityLogStore } = await import("../activity-log-store");
    
    const { search_id, description } = req.body;

    if (!search_id) {
      return res.status(400).json({ error: 'search_id is required' });
    }

    const activeAgent = oceanSessionManager.getActiveAgent();
    if (!activeAgent) {
      return res.status(404).json({
        error: 'No active session to checkpoint',
      });
    }

    const sessionMetrics = {
      phi: 0.75,
      kappa: 64.0,
      regime: 'geometric' as const,
    };
    
    const checkpoint = {
      checkpointId: randomUUID(),
      searchId: search_id,
      timestamp: Date.now(),
      description: description || 'Manual checkpoint',
      state: {
        metrics: sessionMetrics,
        sessionId: 'active-session',
      },
    };

    activityLogStore.log({
      source: 'system',
      category: 'checkpoint_created',
      message: `Checkpoint created for search ${search_id}`,
      type: 'success',
      metadata: checkpoint
    });

    res.json({
      success: true,
      checkpoint,
    });
  } catch (error: any) {
    console.error("[API] Checkpoint creation error:", error);
    res.status(500).json({ error: error.message });
  }
});

export const unifiedRecoveryRouter = Router();

unifiedRecoveryRouter.post("/sessions", isAuthenticated, async (req: any, res: Response) => {
  try {
    const { targetAddress, memoryFragments } = req.body;
    
    if (!targetAddress) {
      return res.status(400).json({ error: "Target address is required" });
    }

    const processedFragments = (memoryFragments || []).map((f: any) => ({
      id: `fragment-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text: f.text,
      confidence: f.confidence || 0.5,
      epoch: f.epoch || 'possible',
      source: f.source,
      notes: f.notes,
      addedAt: new Date().toISOString(),
    }));

    const session = await unifiedRecovery.createSession(targetAddress, processedFragments);
    
    unifiedRecovery.startRecovery(session.id).catch(err => {
      console.error(`[UnifiedRecovery] Background error for ${session.id}:`, err);
    });

    res.json(session);
  } catch (error: any) {
    console.error("[UnifiedRecovery] Session creation error:", error);
    res.status(500).json({ error: error.message });
  }
});

unifiedRecoveryRouter.get("/sessions/:id", isAuthenticated, async (req: any, res: Response) => {
  try {
    const session = unifiedRecovery.getSession(req.params.id);
    
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json(session);
  } catch (error: any) {
    console.error("[UnifiedRecovery] Session fetch error:", error);
    res.status(500).json({ error: error.message });
  }
});

unifiedRecoveryRouter.get("/sessions", isAuthenticated, async (req: any, res: Response) => {
  try {
    const sessions = unifiedRecovery.getAllSessions();
    res.json(sessions);
  } catch (error: any) {
    console.error("[UnifiedRecovery] Sessions list error:", error);
    res.status(500).json({ error: error.message });
  }
});

unifiedRecoveryRouter.post("/sessions/:id/stop", isAuthenticated, async (req: any, res: Response) => {
  try {
    unifiedRecovery.stopRecovery(req.params.id);
    const session = unifiedRecovery.getSession(req.params.id);
    res.json(session || { message: "Session stopped" });
  } catch (error: any) {
    console.error("[UnifiedRecovery] Session stop error:", error);
    res.status(500).json({ error: error.message });
  }
});

export const recoveriesRouter = Router();

recoveriesRouter.get("/", generousLimiter, async (req: Request, res: Response) => {
  try {
    if (!fs.existsSync(recoveriesDir)) {
      return res.json({ recoveries: [], count: 0 });
    }
    
    const files = fs.readdirSync(recoveriesDir);
    const recoveries = files
      .filter(f => f.endsWith('.json'))
      .map(filename => {
        const filePath = path.join(recoveriesDir, filename);
        const stats = fs.statSync(filePath);
        try {
          const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          return {
            filename,
            address: content.address,
            passphrase: content.passphrase ? `${content.passphrase.slice(0, 8)}...` : undefined,
            timestamp: content.timestamp,
            qigMetrics: content.qigMetrics,
            fileSize: stats.size,
            createdAt: stats.mtime,
          };
        } catch {
          return {
            filename,
            error: 'Could not parse file',
            fileSize: stats.size,
            createdAt: stats.mtime,
          };
        }
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    res.json({ recoveries, count: recoveries.length });
  } catch (error: any) {
    console.error("[Recoveries] List error:", error);
    res.status(500).json({ error: error.message });
  }
});

recoveriesRouter.get("/:filename", standardLimiter, async (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    
    if (!filename.endsWith('.json') && !filename.endsWith('.txt')) {
      return res.status(400).json({ error: 'Invalid file type' });
    }
    
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    const filePath = path.join(recoveriesDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Recovery file not found' });
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    
    if (filename.endsWith('.json')) {
      res.json(JSON.parse(content));
    } else {
      res.type('text/plain').send(content);
    }
  } catch (error: any) {
    console.error("[Recoveries] Get error:", error);
    res.status(500).json({ error: error.message });
  }
});

recoveriesRouter.get("/:filename/download", standardLimiter, async (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    
    if (!filename.endsWith('.json') && !filename.endsWith('.txt')) {
      return res.status(400).json({ error: 'Invalid file type' });
    }
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    const filePath = path.join(recoveriesDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Recovery file not found' });
    }
    
    res.download(filePath, filename);
  } catch (error: any) {
    console.error("[Recoveries] Download error:", error);
    res.status(500).json({ error: error.message });
  }
});
