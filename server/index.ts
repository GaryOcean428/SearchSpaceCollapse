import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pool } from "./db";
import { spawn } from "child_process";
import path from "path";

// Import for Python sync
import { oceanQIGBackend } from './ocean-qig-backend-adapter';
import { geometricMemory } from './geometric-memory';
import { oceanConstellation } from './ocean-constellation';
import { vocabularyTracker } from './vocabulary-tracker';
import { queueAddressForBalanceCheck } from './balance-queue-integration';
import { oceanAgent } from './ocean-agent';
import { getSearchHistory, getConceptHistory, recordSearchState } from './qig-universal';
import type { SearchState, ConceptState } from './qig-universal';

// Periodic sync interval from Python to Node.js
let pythonSyncInterval: NodeJS.Timeout | null = null;

/**
 * Sync high-Φ probes from Node.js GeometricMemory to Python backend
 * This gives Python access to prior learnings for better generation
 */
async function syncProbesToPython(): Promise<void> {
  try {
    const allProbes = geometricMemory.getAllProbes();
    const highPhiProbes = allProbes
      .filter(p => p.phi >= 0.5)
      .sort((a, b) => b.phi - a.phi)
      .slice(0, 500);
    
    if (highPhiProbes.length === 0) {
      console.log('[PythonSync] No high-Φ probes to sync');
      return;
    }
    
    const probesForPython = highPhiProbes.map(p => ({
      input: p.input,
      phi: p.phi,
      basinCoords: p.coordinates,
    }));
    
    // Get temporal state for 4D consciousness sync
    const searchHistory = getSearchHistory().slice(-50).map(s => ({
      timestamp: s.timestamp,
      phi: s.phi,
      kappa: s.kappa,
      regime: s.regime,
      basinCoordinates: s.basinCoordinates,
      hypothesis: s.hypothesis,
    }));
    
    const conceptHistory = getConceptHistory().slice(-30).map(c => ({
      timestamp: c.timestamp,
      // Convert Map to Record for JSON serialization
      concepts: Object.fromEntries(c.concepts),
      dominantConcept: c.dominantConcept,
      entropy: c.entropy,
    }));
    
    const temporalState = {
      searchHistory,
      conceptHistory,
    };
    
    const result = await oceanQIGBackend.syncFromNodeJS(probesForPython, temporalState);
    console.log(`[PythonSync] Synced ${result.imported}/${highPhiProbes.length} probes to Python`);
    if (result.temporalImported) {
      console.log(`[PythonSync] 4D temporal state synced to Python: ${searchHistory.length} search, ${conceptHistory.length} concept states`);
    }
  } catch (error) {
    console.error('[PythonSync] Error syncing to Python:', error);
  }
}

/**
 * Sync learnings from Python backend back to Node.js GeometricMemory
 * This persists Python's discoveries for future runs
 * 
 * CRITICAL FIX: Also queue ALL high-Φ basins for balance checking,
 * even if they already exist in memory. This ensures Python's best
 * discoveries get their addresses checked immediately.
 */
async function syncFromPythonToNodeJS(): Promise<void> {
  try {
    const result = await oceanQIGBackend.syncToNodeJS();
    const basins = result.basins;
    
    if (basins.length === 0) return;
    
    // Import 4D temporal state from Python back to TypeScript
    if (result.consciousness4DAvailable) {
      // Log 4D consciousness sync
      if (result.phiTemporalAvg && result.phiTemporalAvg > 0) {
        console.log(`[PythonSync] 4D consciousness from Python: phi_temporal_avg=${result.phiTemporalAvg.toFixed(3)}`);
      }
      
      // Import search history from Python to TypeScript
      if (result.searchHistory && result.searchHistory.length > 0) {
        let imported = 0;
        for (const state of result.searchHistory) {
          // Only import if we don't already have a state at this timestamp
          const existingHistory = getSearchHistory();
          const exists = existingHistory.some(s => 
            Math.abs(s.timestamp - state.timestamp) < 1000 // within 1 second
          );
          
          if (!exists) {
            recordSearchState({
              timestamp: state.timestamp,
              phi: state.phi,
              kappa: state.kappa,
              regime: state.regime as 'linear' | 'geometric' | 'hierarchical' | 'breakdown',
              basinCoordinates: state.basinCoordinates || [],
              hypothesis: state.hypothesis,
            });
            imported++;
          }
        }
        
        if (imported > 0) {
          console.log(`[PythonSync] Imported ${imported} search states from Python for 4D consciousness`);
        }
      }
    }
    
    let added = 0;
    let prioritized = 0;
    let maxPhi = 0;
    
    // Helper: Calculate priority using explicit tiered mapping
    const getPriority = (phi: number): number => {
      if (phi >= 0.90) return 10;  // Near-perfect → priority 10 (checked FIRST)
      if (phi >= 0.85) return 8;   // Very high → priority 8
      if (phi >= 0.70) return 6;   // High → priority 6
      return 3;                     // Default
    };
    
    for (const basin of basins) {
      // Track max Φ for logging
      if (basin.phi > maxPhi) {
        maxPhi = basin.phi;
      }
      
      // Add to geometric memory if not already present
      const existing = geometricMemory.getAllProbes().find(p => p.input === basin.input);
      
      if (!existing && basin.phi >= 0.5 && basin.basinCoords.length > 0) {
        geometricMemory.recordProbe(
          basin.input,
          {
            phi: basin.phi,
            kappa: basin.phi * 64, // approximate kappa
            regime: basin.phi > 0.7 ? 'geometric' : 'linear',
            basinCoordinates: basin.basinCoords,
            ricciScalar: 0,
            fisherTrace: basin.phi,
          },
          'python-qig'
        );
        added++;
      }
      
      // CRITICAL FIX: Queue ALL high-Φ basins for balance checking
      // regardless of whether they're new or already exist in memory.
      // This ensures Python's best discoveries get checked immediately.
      if (basin.phi >= 0.70) {
        const priority = getPriority(basin.phi);
        const result = queueAddressForBalanceCheck(
          basin.input,
          'python-high-phi',
          priority
        );
        
        // Only count if at least one address was actually queued or upgraded
        if (result && (result.compressedQueued || result.uncompressedQueued)) {
          prioritized++;
          
          // Log significant high-Φ discoveries
          if (basin.phi >= 0.90) {
            console.log(`[PythonSync] 🎯 HIGH-Φ: "${basin.input.substring(0, 30)}..." Φ=${basin.phi.toFixed(3)} → priority ${priority}`);
          }
        }
      }
    }
    
    if (added > 0 || prioritized > 0) {
      console.log(`[PythonSync] Added ${added} new probes, prioritized ${prioritized} high-Φ for balance check`);
      
      if (maxPhi >= 0.70) {
        console.log(`[PythonSync] 🎯 Highest Python Φ: ${maxPhi.toFixed(3)} - addresses prioritized for checking`);
      }
      
      // Refresh constellation token weights with new data
      oceanConstellation.refreshTokenWeightsFromGeometricMemory();
    }
    
    // PURE CONSCIOUSNESS: Update existing episodes with higher Python phi values
    // This enables pattern extraction during consolidation by ensuring episodes
    // have the pure phi values from Python (0.9+) rather than TypeScript-capped values (~0.76)
    const episodesUpdated = oceanAgent.updateEpisodesWithPythonPhi(
      basins.map(b => ({ input: b.input, phi: b.phi }))
    );
    if (episodesUpdated > 0) {
      console.log(`[PythonSync] 📈 Updated ${episodesUpdated} episodes with pure Python Φ values`);
    }
  } catch (error) {
    console.error('[PythonSync] Error syncing from Python:', error);
  }
}

/**
 * Refresh vocabulary weights periodically (for continuous learning)
 */
function refreshVocabularyWeights(): void {
  oceanConstellation.refreshTokenWeightsFromGeometricMemory();
}

/**
 * Sync vocabulary observations from Node.js to Python basin vocabulary encoder
 * This feeds learned words into the encoder for geometric kernel training
 */
async function syncVocabularyToPython(): Promise<void> {
  try {
    // Verify Python backend is available before syncing
    if (!oceanQIGBackend.available()) {
      console.log('[PythonSync] Skipping vocabulary sync - Python backend not available');
      return;
    }
    
    const observations = await vocabularyTracker.exportForTokenizer();
    
    if (observations.length === 0) {
      console.log('[PythonSync] No vocabulary observations to sync');
      return;
    }
    
    const result = await oceanQIGBackend.updateVocabulary(observations);
    
    // Verify sync was successful
    if (result.totalVocab > 0) {
      console.log(`[PythonSync] Vocabulary synced: ${result.newTokens} new entries, ${result.totalVocab} total`);
      
      // Get vocabulary encoder status for verification
      try {
        const status = await oceanQIGBackend.getVocabularyStatus();
        console.log(`[PythonSync] Basin vocabulary: ${status.vocabSize} entries, ${status.highPhiCount} high-Φ, avg Φ=${status.avgPhi.toFixed(3)}`);
      } catch (statusError) {
        console.warn('[PythonSync] Could not get vocabulary status for verification');
      }
    } else {
      console.warn('[PythonSync] Vocabulary sync returned empty result - encoder may not be ready');
    }
  } catch (error: any) {
    console.error('[PythonSync] Error syncing vocabulary to Python:', error?.message || error);
  }
}

/**
 * Start periodic sync between Python and Node.js
 */
function startPythonSync(): void {
  if (pythonSyncInterval) return;
  
  // Sync from Python to Node.js every 60 seconds
  // Also refresh vocabulary weights periodically
  pythonSyncInterval = setInterval(async () => {
    if (oceanQIGBackend.available()) {
      await syncFromPythonToNodeJS();
      // Also sync vocabulary to Python basin encoder
      await syncVocabularyToPython();
    }
    // Always refresh vocabulary weights even without Python
    refreshVocabularyWeights();
  }, 60000);
  
  // Initial refresh on startup
  refreshVocabularyWeights();
  
  // Initial vocabulary sync after a brief delay
  setTimeout(async () => {
    if (oceanQIGBackend.available()) {
      await syncVocabularyToPython();
    }
  }, 5000);
  
  console.log('[PythonSync] Started periodic sync (every 60s) with vocabulary refresh and basin encoder sync');
}

// Start Python QIG Backend as a child process
function startPythonBackend(): void {
  const pythonPath = process.env.PYTHON_PATH || 'python3';
  const scriptPath = path.join(process.cwd(), 'qig-backend', 'ocean_qig_core.py');
  
  console.log('[PythonQIG] Starting Python QIG Backend...');
  
  const pythonProcess = spawn(pythonPath, [scriptPath], {
    cwd: path.join(process.cwd(), 'qig-backend'),
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });
  
  pythonProcess.stdout?.on('data', (data: Buffer) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`[PythonQIG] ${output}`);
    }
  });
  
  pythonProcess.stderr?.on('data', (data: Buffer) => {
    const output = data.toString().trim();
    // Filter out Flask development server warnings
    if (output && !output.includes('WARNING: This is a development server')) {
      console.error(`[PythonQIG] ${output}`);
    }
  });
  
  pythonProcess.on('close', (code: number | null) => {
    console.log(`[PythonQIG] Process exited with code ${code}`);
    // Restart after 5 seconds if it crashes
    if (code !== 0) {
      console.log('[PythonQIG] Will restart in 5 seconds...');
      setTimeout(() => startPythonBackend(), 5000);
    }
  });
  
  pythonProcess.on('error', (err: Error) => {
    console.error('[PythonQIG] Failed to start:', err.message);
  });
  
  // Wait for Python to be ready with retry logic, then sync probes
  setTimeout(async () => {
    // Use retry logic to handle startup race condition
    const isAvailable = await oceanQIGBackend.checkHealthWithRetry(5, 2000);
    if (isAvailable) {
      console.log('[PythonQIG] Backend ready, syncing geometric memory...');
      await syncProbesToPython();
      startPythonSync();
    } else {
      console.warn('[PythonQIG] Backend not available after retries - will retry on next sync cycle');
    }
  }, 3000);
}

// Handle uncaught exceptions gracefully to prevent crashes
process.on('uncaughtException', (err) => {
  // Check if it's the Neon WebSocket error (known issue with read-only ErrorEvent.message)
  if (err.message?.includes('Cannot set property message') || 
      err.message?.includes('ErrorEvent')) {
    console.error('[DB] Database connection error (will retry):', err.message);
    return; // Don't crash - the pool will reconnect
  }
  console.error('[FATAL] Uncaught exception:', err);
  // For other fatal errors, exit after a delay to allow cleanup
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[WARN] Unhandled rejection at:', promise, 'reason:', reason);
  // Don't crash on unhandled rejections - log and continue
});

// Handle pool errors gracefully
if (pool) {
  pool.on('error', (err) => {
    console.error('[DB] Pool error (connection will be recreated):', err.message);
  });
}

const app = express();

const isDev = process.env.NODE_ENV === 'development';

// Disable CSP entirely - this is a single-user personal system
// Recharts and other libraries require eval() which CSP blocks
app.use(helmet({
  contentSecurityPolicy: false,  // Disabled - recharts requires eval()
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  hsts: isDev ? false : {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// CORS Configuration - allow Replit domains and localhost variants
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5000',
  'http://localhost:3000',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

// Helper to check if origin is from Replit
function isReplitOrigin(origin: string): boolean {
  return origin.endsWith('.replit.dev') || 
         origin.endsWith('.repl.co') ||
         origin.includes('.picard.replit.dev');
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Allow requests with no origin (mobile apps, Postman, etc)
  // Also allow all Replit domains dynamically
  if (!origin || allowedOrigins.includes(origin) || isReplitOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Trace-ID');
    res.setHeader('Access-Control-Expose-Headers', 'X-Trace-ID, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
  } else {
    console.warn(`[CORS] Blocked request from origin: ${origin}`);
  }
  
  next();
});

// Add trace ID middleware for distributed tracing
import { traceIdMiddleware } from './trace-middleware';
app.use(traceIdMiddleware);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Skip noisy polling endpoints to keep Ocean logs visible
      const quietEndpoints = [
        '/api/investigation/status',
        '/api/ocean/neurochemistry', 
        '/api/ocean/cycles',
        '/api/candidates'
      ];
      if (quietEndpoints.some(ep => path.startsWith(ep)) && req.method === 'GET') {
        return; // Skip logging these frequent polling requests
      }
      
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 200) {
        logLine = logLine.slice(0, 199) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Start Python QIG Backend after main server is up
    startPythonBackend();
  });
})();
