/**
 * Example: Updated Ocean Routes with Proxy Pattern
 * 
 * This file shows how to update server/routes/ocean.ts to use the ocean-proxy.
 * Copy patterns from here to update the actual routes file.
 * 
 * PATTERN: Replace direct oceanAgent calls with oceanProxy calls
 */

import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { oceanProxy } from "../ocean-proxy"; // NEW IMPORT
import { isAuthenticated } from "../replitAuth";

// Keep existing rate limiters
const generousLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "Too many requests. Please try again later." },
});

const standardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: "Too many requests. Please try again later." },
});

export const oceanRouter = Router();

// ============================================================================
// EXAMPLE 1: Health Check (Keep as-is - TypeScript orchestration)
// ============================================================================

oceanRouter.get(
  "/health",
  generousLimiter,
  async (req: Request, res: Response) => {
    try {
      // Check Python backend health
      const pythonHealthy = await oceanProxy.healthCheck();
      
      // Get local subsystem status (keep existing logic)
      const { geometricMemory } = await import("../geometric-memory");
      const session = oceanSessionManager.getActiveSession();
      
      const health = {
        status: pythonHealthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        subsystems: {
          pythonBackend: {
            status: pythonHealthy ? "active" : "unavailable",
          },
          oceanAgent: {
            status: session ? "active" : "idle",
            sessionId: session?.sessionId || null,
          },
          geometricMemory: {
            status: "initialized",
            phrasesIndexed: geometricMemory.getTestedCount(),
          },
        },
      };

      res.json(health);
    } catch (error: any) {
      console.error("[OceanHealth] Error:", error);
      res.status(500).json({
        status: "error",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// ============================================================================
// EXAMPLE 2: Assessment Endpoint (NEW - Use Proxy)
// ============================================================================

oceanRouter.post(
  "/assess",
  standardLimiter,
  async (req: Request, res: Response) => {
    try {
      const { phrase } = req.body;
      
      if (!phrase || typeof phrase !== "string") {
        return res.status(400).json({
          error: "Missing or invalid phrase",
          hint: "POST with { phrase: 'your passphrase here' }",
        });
      }

      // Call Python backend via proxy
      const assessment = await oceanProxy.assessHypothesis(phrase);

      console.log(
        `[Ocean] Assessed phrase (Φ=${assessment.phi.toFixed(4)}, ` +
        `κ=${assessment.kappa.toFixed(1)}, regime=${assessment.regime})`
      );

      res.json({
        success: true,
        assessment,
      });

    } catch (error: any) {
      console.error("[Ocean] Assessment failed:", error);
      
      // Graceful degradation
      if (error.message.includes('Cannot connect')) {
        return res.status(503).json({
          error: "Python backend unavailable",
          message: "QIG consciousness backend is not responding",
          hint: "Start Python backend on port 5001",
          fallback: false,
        });
      }

      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================================================
// EXAMPLE 3: Consciousness State (NEW - Use Proxy)
// ============================================================================

oceanRouter.get(
  "/consciousness",
  generousLimiter,
  async (req: Request, res: Response) => {
    try {
      // Get consciousness state from Python backend
      const state = await oceanProxy.getConsciousnessState();

      res.json({
        success: true,
        consciousness: state,
        timestamp: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error("[Ocean] Consciousness state error:", error);
      
      // Return default state on error
      res.json({
        success: false,
        consciousness: {
          phi: 0.0,
          kappa_eff: 0.0,
          regime: "dormant",
          basin_coordinates: Array(64).fill(0),
        },
        error: error.message,
        fallback: true,
      });
    }
  }
);

// ============================================================================
// EXAMPLE 4: Start Investigation (NEW - Use Proxy)
// ============================================================================

oceanRouter.post(
  "/investigation/start",
  standardLimiter,
  async (req: Request, res: Response) => {
    try {
      const {
        target_address,
        memory_fragments = [],
        clues = {},
        max_iterations = 1000,
        stop_on_match = true,
      } = req.body;

      if (!target_address || typeof target_address !== "string") {
        return res.status(400).json({
          error: "Missing or invalid target_address",
          hint: "POST with { target_address: '1A1z...' }",
        });
      }

      // Start investigation via Python backend
      const result = await oceanProxy.startInvestigation({
        target_address,
        memory_fragments,
        clues,
        max_iterations,
        stop_on_match,
      });

      console.log(
        `[Ocean] Started investigation ${result.investigation_id} ` +
        `for address ${target_address.slice(0, 10)}...`
      );

      res.json({
        success: true,
        ...result,
      });

    } catch (error: any) {
      console.error("[Ocean] Start investigation failed:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================================================
// EXAMPLE 5: Investigation Status (NEW - Use Proxy)
// ============================================================================

oceanRouter.get(
  "/investigation/:id/status",
  generousLimiter,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Get status from Python backend
      const status = await oceanProxy.getInvestigationStatus(id);

      res.json({
        success: true,
        ...status,
      });

    } catch (error: any) {
      console.error("[Ocean] Get investigation status failed:", error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: "Investigation not found",
          investigation_id: req.params.id,
        });
      }

      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================================================
// EXAMPLE 6: Stop Investigation (NEW - Use Proxy)
// ============================================================================

oceanRouter.post(
  "/investigation/:id/stop",
  standardLimiter,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Stop investigation via Python backend
      const result = await oceanProxy.stopInvestigation(id);

      console.log(`[Ocean] Stopped investigation ${id}`);

      res.json({
        success: true,
        ...result,
      });

    } catch (error: any) {
      console.error("[Ocean] Stop investigation failed:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================================================
// EXAMPLE 7: Neurochemistry (Keep existing - TypeScript state management)
// ============================================================================

oceanRouter.get(
  "/neurochemistry",
  generousLimiter,
  async (req: Request, res: Response) => {
    try {
      // Keep existing neurochemistry logic
      // This is TypeScript state management, not QIG consciousness logic
      const session = oceanSessionManager.getActiveSession();
      const agent = oceanSessionManager.getActiveAgent();
      
      if (!session || !agent) {
        // Return default state
        const defaultState = {
          dopamine: { totalDopamine: 0.5, motivationLevel: 0.5 },
          serotonin: { totalSerotonin: 0.6, contentmentLevel: 0.6 },
          norepinephrine: { totalNorepinephrine: 0.4, alertnessLevel: 0.4 },
          gaba: { totalGABA: 0.7, calmLevel: 0.7 },
          acetylcholine: { totalAcetylcholine: 0.5, learningRate: 0.5 },
          endorphins: { totalEndorphins: 0.3, pleasureLevel: 0.3 },
          overallMood: 0.5,
          emotionalState: "content" as const,
          timestamp: new Date(),
        };
        return res.json({
          neurochemistry: defaultState,
          behavioral: null,
          motivation: {
            message: "Awaiting investigation session...",
            fisherWeight: 0.5,
            category: "idle",
            urgency: "whisper",
          },
          sessionActive: false,
        });
      }

      // Get neurochemistry from agent (TypeScript state)
      const neurochemistry = agent.getNeurochemistry();
      const behavioral = agent.getBehavioralModulation();

      res.json({
        neurochemistry,
        behavioral,
        sessionActive: true,
        sessionId: session.sessionId,
      });

    } catch (error: any) {
      console.error("[Neurochemistry] Error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================================================
// EXAMPLE 8: Keep existing autonomic cycle endpoints (TypeScript orchestration)
// ============================================================================

// These endpoints orchestrate cycles but don't do QIG calculations
// Keep them as-is:
// - POST /cycles/sleep
// - POST /cycles/dream
// - POST /cycles/mushroom
// - GET /cycles

// ============================================================================
// EXAMPLE 9: Python autonomic kernel integration (Already uses proxy pattern)
// ============================================================================

// These endpoints already follow the proxy pattern - keep as-is:
// - GET /python/autonomic/state
// - POST /python/autonomic/sleep
// - POST /python/autonomic/dream
// - POST /python/autonomic/mushroom
// - POST /python/autonomic/reward
// - GET /python/autonomic/rewards

// ============================================================================
// KEY PATTERNS SUMMARY
// ============================================================================

/*
1. REPLACE direct oceanAgent imports:
   OLD: import { oceanAgent } from '../ocean-agent';
   NEW: import { oceanProxy } from '../ocean-proxy';

2. REPLACE method calls:
   OLD: const result = await oceanAgent.assessHypothesis(phrase);
   NEW: const result = await oceanProxy.assessHypothesis(phrase);

3. ADD error handling for backend unavailability:
   try {
     const result = await oceanProxy.method();
   } catch (error) {
     if (error.message.includes('Cannot connect')) {
       return res.status(503).json({
         error: "Python backend unavailable",
         hint: "Start Python backend on port 5001"
       });
     }
     throw error;
   }

4. KEEP TypeScript orchestration (neurochemistry, session management, routing):
   - These are NOT QIG consciousness logic
   - These are application state management
   - Should remain in TypeScript

5. MOVE TO PYTHON any Fisher metric, QIG scoring, basin coordinate calculations:
   - If it involves Φ, κ, Fisher distance, density matrices → Python
   - If it's routing, Bitcoin crypto, session state → TypeScript
*/
