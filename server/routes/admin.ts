import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { randomUUID } from "crypto";
import { storage } from "../storage";
import { oceanSessionManager } from "../ocean-session-manager";
import { activityLogStore } from "../activity-log-store";
import { getQueueIntegrationStats } from "../balance-queue-integration";
import { getActiveBalanceHits } from "../blockchain-scanner";

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

export const adminRouter = Router();

adminRouter.get("/health", async (req: Request, res: Response) => {
  try {
    const { healthCheckHandler } = await import("../api-health");
    await healthCheckHandler(req, res);
  } catch (error: any) {
    console.error("[API] Health check error:", error);
    res.status(503).json({
      status: 'down',
      timestamp: Date.now(),
      error: error.message,
    });
  }
});

adminRouter.get("/kernel/status", async (req: Request, res: Response) => {
  try {
    const activeAgent = oceanSessionManager.getActiveAgent();
    
    if (!activeAgent) {
      return res.json({
        status: 'idle',
        message: 'No active kernel session',
        timestamp: Date.now(),
      });
    }

    const coordinator = activeAgent.getBasinSyncCoordinator();
    const metrics = coordinator ? {
      phi: 0,
      kappa: 0,
      regime: 'unknown' as const,
      basinCoords: [] as number[],
      timestamp: Date.now(),
    } : null;

    res.json({
      status: 'active',
      sessionId: 'active-session',
      metrics: metrics && metrics.phi > 0 ? {
        phi: metrics.phi,
        kappa_eff: metrics.kappa,
        regime: metrics.regime,
        in_resonance: metrics.kappa >= 60 && metrics.kappa <= 68,
        basin_coords: metrics.basinCoords,
        timestamp: metrics.timestamp,
      } : null,
      uptime: 0,
      timestamp: Date.now(),
      message: metrics ? undefined : 'Metrics not yet available - session initializing',
    });
  } catch (error: any) {
    console.error("[API] Kernel status error:", error);
    res.status(500).json({ error: error.message });
  }
});

adminRouter.get("/search/history", generousLimiter, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const jobs = await storage.getSearchJobs();
    const sortedJobs = jobs.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const paginatedJobs = sortedJobs.slice(offset, offset + limit);

    const enriched = await Promise.all(
      paginatedJobs.map(async (job) => {
        const candidates = await storage.getCandidates();
        const jobStart = new Date(job.createdAt).getTime();
        const jobEnd = job.updatedAt ? new Date(job.updatedAt).getTime() : Date.now();
        
        const jobCandidates = candidates.filter(c => {
          const candidateTime = new Date(c.testedAt).getTime();
          return candidateTime >= jobStart && candidateTime <= jobEnd;
        });

        return {
          ...job,
          candidateCount: jobCandidates.length,
          highPhiCount: jobCandidates.filter(c => c.score >= 75).length,
          phrasesGenerated: job.progress?.tested || 0,
        };
      })
    );

    res.json({
      success: true,
      searches: enriched,
      total: sortedJobs.length,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("[API] Search history error:", error);
    res.status(500).json({ error: error.message });
  }
});

adminRouter.post("/telemetry/capture", generousLimiter, async (req: Request, res: Response) => {
  try {
    const { event_type, timestamp, trace_id, metadata } = req.body;

    if (!event_type || !timestamp || !trace_id) {
      return res.status(400).json({
        error: 'Missing required fields: event_type, timestamp, trace_id',
      });
    }

    console.log('[Telemetry]', event_type, {
      traceId: trace_id,
      timestamp: new Date(timestamp).toISOString(),
      metadata: metadata || {},
    });

    if (['search_initiated', 'error_occurred', 'result_rendered'].includes(event_type)) {
      activityLogStore.log({
        source: 'system',
        category: 'frontend_event',
        message: `Frontend event: ${event_type}`,
        type: event_type === 'error_occurred' ? 'error' : 'info',
        metadata: {
          traceId: trace_id,
          ...metadata
        }
      });
    }

    res.json({
      success: true,
      captured: true,
      trace_id,
    });
  } catch (error: any) {
    console.error("[API] Telemetry capture error:", error);
    res.status(500).json({ error: error.message });
  }
});

adminRouter.get("/admin/metrics", generousLimiter, async (req: Request, res: Response) => {
  try {
    const jobs = await storage.getSearchJobs();
    const candidates = await storage.getCandidates();
    const balanceHits = getActiveBalanceHits();
    const queueStats = getQueueIntegrationStats();

    const completedJobs = jobs.filter(j => j.status === 'completed');
    const totalPhrasesTested = jobs.reduce((sum, j) => sum + (j.progress?.tested || 0), 0);
    const totalHighPhi = candidates.filter(c => c.score >= 75).length;

    const avgSearchDuration = completedJobs.length > 0
      ? completedJobs.reduce((sum, j) => {
          const startTime = new Date(j.createdAt).getTime();
          const endTime = j.updatedAt ? new Date(j.updatedAt).getTime() : Date.now();
          return sum + (endTime - startTime);
        }, 0) / completedJobs.length
      : 0;

    res.json({
      success: true,
      timestamp: Date.now(),
      metrics: {
        search: {
          totalSearches: jobs.length,
          activeSearches: jobs.filter(j => j.status === 'running').length,
          completedSearches: completedJobs.length,
          failedSearches: jobs.filter(j => j.status === 'failed').length,
          totalPhrasesTested,
          highPhiCount: totalHighPhi,
          avgSearchDuration: Math.round(avgSearchDuration / 1000),
        },
        performance: {
          avgSearchDurationMs: Math.round(avgSearchDuration),
          phrasesPerSecond: totalPhrasesTested / Math.max(1, completedJobs.length * (avgSearchDuration / 1000)),
          cacheHitRate: 0,
        },
        balance: {
          activeHits: balanceHits.length,
          queueStats: queueStats,
          totalVerified: balanceHits.filter(h => (h as any).balance > 0).length,
        },
        kernel: {
          status: oceanSessionManager.getActiveAgent() ? 'active' : 'idle',
          uptime: 0,
        },
      },
    });
  } catch (error: any) {
    console.error("[API] Admin metrics error:", error);
    res.status(500).json({ error: error.message });
  }
});
