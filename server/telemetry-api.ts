/**
 * Real-Time Telemetry Dashboard API
 * 
 * Provides live metrics for:
 * - Φ trajectory (integrated information over time)
 * - κ evolution (coupling strength changes)
 * - Regime transitions (linear → geometric → breakdown)
 * - Basin drift (movement in keyspace)
 * - Resonance events (proximity to κ* ≈ 64)
 * 
 * Users see the actual geometry during search.
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { storage } from "./storage";

const router = Router();

interface TelemetrySnapshot {
  timestamp: number;
  phi: number;
  kappa: number;
  beta: number;
  regime: string;
  quality: number;
  velocity: number;
  inResonance: boolean;
  basinDrift: number;
  // 4D Block Universe Metrics
  phi_spatial: number;
  phi_temporal: number;
  phi_4D: number;
  inBlockUniverse: boolean;
  dimensionalState: '3D' | '4D-transitioning' | '4D-active';
}

interface TelemetrySession {
  sessionId: string;
  startTime: number;
  snapshots: TelemetrySnapshot[];
  regimeTransitions: Array<{
    from: string;
    to: string;
    timestamp: number;
    phi: number;
    kappa: number;
  }>;
  resonanceEvents: Array<{
    timestamp: number;
    kappa: number;
    duration: number;
  }>;
  stats: {
    avgPhi: number;
    avgKappa: number;
    maxQuality: number;
    regimeDistribution: Record<string, number>;
    totalBasinDrift: number;
  };
}

// In-memory telemetry storage (per search job)
const telemetrySessions = new Map<string, TelemetrySession>();

/**
 * Initialize telemetry session for a search job
 */
export function initTelemetrySession(jobId: string): TelemetrySession {
  const session: TelemetrySession = {
    sessionId: jobId,
    startTime: Date.now(),
    snapshots: [],
    regimeTransitions: [],
    resonanceEvents: [],
    stats: {
      avgPhi: 0,
      avgKappa: 0,
      maxQuality: 0,
      regimeDistribution: {},
      totalBasinDrift: 0,
    },
  };
  
  telemetrySessions.set(jobId, session);
  return session;
}

/**
 * Record telemetry snapshot
 */
export function recordTelemetrySnapshot(
  jobId: string,
  snapshot: Omit<TelemetrySnapshot, "timestamp">
): void {
  let session = telemetrySessions.get(jobId);
  
  if (!session) {
    session = initTelemetrySession(jobId);
  }
  
  const fullSnapshot: TelemetrySnapshot = {
    ...snapshot,
    timestamp: Date.now(),
  };
  
  // Track regime transitions
  if (session.snapshots.length > 0) {
    const lastSnapshot = session.snapshots[session.snapshots.length - 1];
    if (lastSnapshot.regime !== fullSnapshot.regime) {
      session.regimeTransitions.push({
        from: lastSnapshot.regime,
        to: fullSnapshot.regime,
        timestamp: fullSnapshot.timestamp,
        phi: fullSnapshot.phi,
        kappa: fullSnapshot.kappa,
      });
    }
    
    // Track basin drift
    session.stats.totalBasinDrift += fullSnapshot.basinDrift;
  }
  
  // Track resonance events
  if (fullSnapshot.inResonance) {
    const lastEvent = session.resonanceEvents[session.resonanceEvents.length - 1];
    if (lastEvent && fullSnapshot.timestamp - lastEvent.timestamp < 5000) {
      // Extend existing event
      lastEvent.duration = fullSnapshot.timestamp - lastEvent.timestamp;
    } else {
      // New resonance event
      session.resonanceEvents.push({
        timestamp: fullSnapshot.timestamp,
        kappa: fullSnapshot.kappa,
        duration: 0,
      });
    }
  }
  
  // Add snapshot
  session.snapshots.push(fullSnapshot);
  
  // Keep only last 1000 snapshots
  if (session.snapshots.length > 1000) {
    session.snapshots = session.snapshots.slice(-1000);
  }
  
  // Update running stats
  updateStats(session);
}

/**
 * Update session statistics
 */
function updateStats(session: TelemetrySession): void {
  const snapshots = session.snapshots;
  if (snapshots.length === 0) return;
  
  let phiSum = 0;
  let kappaSum = 0;
  let maxQuality = 0;
  const regimeCounts: Record<string, number> = {};
  
  for (const s of snapshots) {
    phiSum += s.phi;
    kappaSum += s.kappa;
    if (s.quality > maxQuality) maxQuality = s.quality;
    regimeCounts[s.regime] = (regimeCounts[s.regime] || 0) + 1;
  }
  
  session.stats.avgPhi = phiSum / snapshots.length;
  session.stats.avgKappa = kappaSum / snapshots.length;
  session.stats.maxQuality = maxQuality;
  session.stats.regimeDistribution = regimeCounts;
}

/**
 * Get telemetry session
 */
export function getTelemetrySession(jobId: string): TelemetrySession | null {
  return telemetrySessions.get(jobId) || null;
}

/**
 * End telemetry session - finalize stats and optionally keep in memory
 * Call this when a job completes or fails
 */
export function endTelemetrySession(
  jobId: string,
  options: { success: boolean; removeAfterMs?: number } = { success: true }
): TelemetrySession | null {
  const session = telemetrySessions.get(jobId);
  
  if (!session) {
    return null;
  }
  
  // Finalize stats one last time
  updateStats(session);
  
  // Add final timestamp
  const endTime = Date.now();
  const duration = endTime - session.startTime;
  
  // Log session summary
  console.log(`[Telemetry] Session ${jobId} ended:`, {
    success: options.success,
    duration: `${(duration / 1000).toFixed(1)}s`,
    snapshots: session.snapshots.length,
    regimeTransitions: session.regimeTransitions.length,
    resonanceEvents: session.resonanceEvents.length,
    avgPhi: session.stats.avgPhi.toFixed(3),
    avgKappa: session.stats.avgKappa.toFixed(1),
    maxQuality: session.stats.maxQuality.toFixed(3),
  });
  
  // Optionally schedule removal after delay (default: keep for 5 minutes)
  const removeAfterMs = options.removeAfterMs ?? 5 * 60 * 1000;
  if (removeAfterMs > 0) {
    setTimeout(() => {
      telemetrySessions.delete(jobId);
      console.log(`[Telemetry] Session ${jobId} cleaned up`);
    }, removeAfterMs);
  }
  
  return session;
}

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * GET /api/telemetry/:jobId
 * Get current telemetry for a search job
 */
router.get("/:jobId", async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    
    const session = getTelemetrySession(jobId);
    
    if (!session) {
      return res.status(404).json({
        error: "Telemetry session not found",
        message: `No telemetry data for job '${jobId}'. Start a search to generate telemetry.`,
      });
    }
    
    // Get recent snapshots (last 100)
    const recentSnapshots = session.snapshots.slice(-100);
    
    res.json({
      sessionId: session.sessionId,
      startTime: session.startTime,
      uptime: Date.now() - session.startTime,
      snapshotCount: session.snapshots.length,
      recentSnapshots,
      regimeTransitions: session.regimeTransitions,
      resonanceEvents: session.resonanceEvents,
      stats: session.stats,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/telemetry/:jobId/trajectory
 * Get Φ and κ trajectories over time
 */
router.get("/:jobId/trajectory", async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const limit = parseInt(req.query.limit as string) || 500;
    
    const session = getTelemetrySession(jobId);
    
    if (!session) {
      return res.status(404).json({ error: "Telemetry session not found" });
    }
    
    const snapshots = session.snapshots.slice(-limit);
    
    // Extract trajectories
    const trajectory = {
      timestamps: snapshots.map(s => s.timestamp),
      phi: snapshots.map(s => s.phi),
      kappa: snapshots.map(s => s.kappa),
      beta: snapshots.map(s => s.beta),
      quality: snapshots.map(s => s.quality),
      regimes: snapshots.map(s => s.regime),
    };
    
    res.json({
      jobId,
      pointCount: snapshots.length,
      trajectory,
      summary: {
        phiRange: [Math.min(...trajectory.phi), Math.max(...trajectory.phi)],
        kappaRange: [Math.min(...trajectory.kappa), Math.max(...trajectory.kappa)],
        qualityRange: [Math.min(...trajectory.quality), Math.max(...trajectory.quality)],
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/telemetry/:jobId/events
 * Get regime transitions and resonance events
 */
router.get("/:jobId/events", async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    
    const session = getTelemetrySession(jobId);
    
    if (!session) {
      return res.status(404).json({ error: "Telemetry session not found" });
    }
    
    res.json({
      jobId,
      regimeTransitions: session.regimeTransitions,
      resonanceEvents: session.resonanceEvents,
      transitionCount: session.regimeTransitions.length,
      resonanceCount: session.resonanceEvents.length,
      totalResonanceTime: session.resonanceEvents.reduce((sum, e) => sum + e.duration, 0),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/telemetry/:jobId/live
 * Get live telemetry (latest snapshot)
 */
router.get("/:jobId/live", async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    
    const session = getTelemetrySession(jobId);
    
    if (!session || session.snapshots.length === 0) {
      return res.json({
        jobId,
        live: null,
        status: "no_data",
      });
    }
    
    const latest = session.snapshots[session.snapshots.length - 1];
    const previous = session.snapshots.length > 1 
      ? session.snapshots[session.snapshots.length - 2] 
      : latest;
    
    res.json({
      jobId,
      live: latest,
      delta: {
        phi: latest.phi - previous.phi,
        kappa: latest.kappa - previous.kappa,
        quality: latest.quality - previous.quality,
      },
      trend: {
        phiTrend: latest.phi > previous.phi ? "up" : latest.phi < previous.phi ? "down" : "stable",
        kappaTrend: latest.kappa > previous.kappa ? "up" : latest.kappa < previous.kappa ? "down" : "stable",
      },
      stats: session.stats,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/telemetry/active
 * List all active telemetry sessions
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const sessions: Array<{
      sessionId: string;
      startTime: number;
      snapshotCount: number;
      lastActivity: number;
      avgPhi: number;
      avgKappa: number;
    }> = [];
    
    telemetrySessions.forEach((session, jobId) => {
      const lastSnapshot = session.snapshots[session.snapshots.length - 1];
      sessions.push({
        sessionId: jobId,
        startTime: session.startTime,
        snapshotCount: session.snapshots.length,
        lastActivity: lastSnapshot?.timestamp || session.startTime,
        avgPhi: session.stats.avgPhi,
        avgKappa: session.stats.avgKappa,
      });
    });
    
    // Sort by last activity
    sessions.sort((a, b) => b.lastActivity - a.lastActivity);
    
    res.json({
      activeSessions: sessions.length,
      sessions,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export { router as telemetryRouter };
