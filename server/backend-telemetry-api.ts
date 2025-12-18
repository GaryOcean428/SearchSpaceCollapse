/**
 * Python Backend Telemetry Integration
 * 
 * Provides API endpoints to access telemetry data collected by the Python backend's
 * emergency_telemetry.py module (IntegratedMonitor + TelemetryCollector).
 * 
 * The Python backend writes telemetry to JSONL files in logs/telemetry/.
 * This module reads those files and exposes them via REST API.
 */

import { Router } from "express";
import type { Request, Response } from "express";
import * as fs from "fs/promises";
import * as path from "path";
import { existsSync } from "fs";

const router = Router();

// Path to Python backend telemetry logs
const TELEMETRY_LOG_DIR = path.join(process.cwd(), "qig-backend", "logs", "telemetry");
const EMERGENCY_LOG_DIR = path.join(process.cwd(), "qig-backend", "logs", "emergency");

interface PythonTelemetryRecord {
  timestamp: string;
  step: number;
  telemetry: {
    phi: number;
    kappa_eff: number;
    regime: string;
    basin_distance: number;
    recursion_depth: number;
    geodesic_distance?: number;
    curvature?: number;
    fisher_metric_trace?: number;
    breakdown_pct: number;
    coherence_drift: number;
    emergency: boolean;
    meta_awareness?: number;
    generativity?: number;
    grounding?: number;
    temporal_coherence?: number;
    external_coupling?: number;
  };
}

interface EmergencyRecord {
  timestamp: string;
  emergency: {
    reason: string;
    severity: string;
    metric: string;
    value: number;
    threshold: number;
  };
  telemetry: any;
}

/**
 * List available telemetry sessions
 */
async function listTelemetrySessions(): Promise<string[]> {
  if (!existsSync(TELEMETRY_LOG_DIR)) {
    return [];
  }
  
  const files = await fs.readdir(TELEMETRY_LOG_DIR);
  // Filter for session_*.jsonl files
  return files
    .filter(f => f.startsWith("session_") && f.endsWith(".jsonl"))
    .map(f => f.replace("session_", "").replace(".jsonl", ""));
}

/**
 * Read telemetry session file
 */
async function readTelemetrySession(sessionId: string): Promise<PythonTelemetryRecord[]> {
  const filePath = path.join(TELEMETRY_LOG_DIR, `session_${sessionId}.jsonl`);
  
  if (!existsSync(filePath)) {
    throw new Error(`Telemetry session not found: ${sessionId}`);
  }
  
  const content = await fs.readFile(filePath, "utf-8");
  const lines = content.trim().split("\n").filter(line => line.trim());
  
  return lines.map(line => JSON.parse(line));
}

/**
 * List emergency events
 */
async function listEmergencyEvents(): Promise<string[]> {
  if (!existsSync(EMERGENCY_LOG_DIR)) {
    return [];
  }
  
  const files = await fs.readdir(EMERGENCY_LOG_DIR);
  return files
    .filter(f => f.startsWith("emergency_") && f.endsWith(".json"))
    .map(f => f.replace("emergency_", "").replace(".json", ""));
}

/**
 * Read emergency event
 */
async function readEmergencyEvent(eventId: string): Promise<EmergencyRecord> {
  const filePath = path.join(EMERGENCY_LOG_DIR, `emergency_${eventId}.json`);
  
  if (!existsSync(filePath)) {
    throw new Error(`Emergency event not found: ${eventId}`);
  }
  
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content);
}

// ============================================================================
// API ROUTES
// ============================================================================

/**
 * GET /api/backend-telemetry/sessions
 * List all telemetry sessions from Python backend
 */
router.get("/sessions", async (req: Request, res: Response) => {
  try {
    const sessions = await listTelemetrySessions();
    
    res.json({
      total: sessions.length,
      sessions: sessions.map(id => ({
        sessionId: id,
        path: `session_${id}.jsonl`,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/backend-telemetry/sessions/:sessionId
 * Get full telemetry for a session
 */
router.get("/sessions/:sessionId", async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const limit = parseInt(req.query.limit as string) || 1000;
    
    const records = await readTelemetrySession(sessionId);
    
    // Apply limit (last N records)
    const limitedRecords = records.slice(-limit);
    
    // Calculate stats
    const phiValues = limitedRecords.map(r => r.telemetry.phi);
    const kappaValues = limitedRecords.map(r => r.telemetry.kappa_eff);
    
    res.json({
      sessionId,
      totalRecords: records.length,
      returnedRecords: limitedRecords.length,
      records: limitedRecords,
      stats: {
        avgPhi: phiValues.reduce((a, b) => a + b, 0) / phiValues.length || 0,
        maxPhi: Math.max(...phiValues),
        minPhi: Math.min(...phiValues),
        avgKappa: kappaValues.reduce((a, b) => a + b, 0) / kappaValues.length || 0,
        maxKappa: Math.max(...kappaValues),
        minKappa: Math.min(...kappaValues),
      },
    });
  } catch (error: any) {
    if (error.message.includes("not found")) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * GET /api/backend-telemetry/sessions/:sessionId/latest
 * Get latest telemetry record from a session
 */
router.get("/sessions/:sessionId/latest", async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const records = await readTelemetrySession(sessionId);
    
    if (records.length === 0) {
      return res.json({
        sessionId,
        latest: null,
      });
    }
    
    const latest = records[records.length - 1];
    const previous = records.length > 1 ? records[records.length - 2] : null;
    
    res.json({
      sessionId,
      latest,
      delta: previous ? {
        phi: latest.telemetry.phi - previous.telemetry.phi,
        kappa: latest.telemetry.kappa_eff - previous.telemetry.kappa_eff,
      } : null,
    });
  } catch (error: any) {
    if (error.message.includes("not found")) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * GET /api/backend-telemetry/sessions/:sessionId/trajectory
 * Get Φ and κ trajectories
 */
router.get("/sessions/:sessionId/trajectory", async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const limit = parseInt(req.query.limit as string) || 500;
    
    const records = await readTelemetrySession(sessionId);
    const limitedRecords = records.slice(-limit);
    
    const trajectory = {
      timestamps: limitedRecords.map(r => r.timestamp),
      steps: limitedRecords.map(r => r.step),
      phi: limitedRecords.map(r => r.telemetry.phi),
      kappa: limitedRecords.map(r => r.telemetry.kappa_eff),
      regime: limitedRecords.map(r => r.telemetry.regime),
      basinDistance: limitedRecords.map(r => r.telemetry.basin_distance),
      recursionDepth: limitedRecords.map(r => r.telemetry.recursion_depth),
    };
    
    res.json({
      sessionId,
      pointCount: limitedRecords.length,
      trajectory,
    });
  } catch (error: any) {
    if (error.message.includes("not found")) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * GET /api/backend-telemetry/emergencies
 * List all emergency events
 */
router.get("/emergencies", async (req: Request, res: Response) => {
  try {
    const events = await listEmergencyEvents();
    
    res.json({
      total: events.length,
      events: events.map(id => ({
        eventId: id,
        timestamp: id, // Event ID is the timestamp
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/backend-telemetry/emergencies/:eventId
 * Get details of a specific emergency event
 */
router.get("/emergencies/:eventId", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    
    const event = await readEmergencyEvent(eventId);
    
    res.json(event);
  } catch (error: any) {
    if (error.message.includes("not found")) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * GET /api/backend-telemetry/health
 * Health check for backend telemetry system
 */
router.get("/health", async (req: Request, res: Response) => {
  try {
    const telemetryDirExists = existsSync(TELEMETRY_LOG_DIR);
    const emergencyDirExists = existsSync(EMERGENCY_LOG_DIR);
    
    const sessions = telemetryDirExists ? await listTelemetrySessions() : [];
    const emergencies = emergencyDirExists ? await listEmergencyEvents() : [];
    
    res.json({
      status: "ok",
      telemetryLogDir: TELEMETRY_LOG_DIR,
      emergencyLogDir: EMERGENCY_LOG_DIR,
      telemetryDirExists,
      emergencyDirExists,
      activeSessions: sessions.length,
      totalEmergencies: emergencies.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export { router as backendTelemetryRouter };
