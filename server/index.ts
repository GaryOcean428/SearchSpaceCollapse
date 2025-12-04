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
    
    const imported = await oceanQIGBackend.syncFromNodeJS(probesForPython);
    console.log(`[PythonSync] Synced ${imported}/${highPhiProbes.length} probes to Python`);
  } catch (error) {
    console.error('[PythonSync] Error syncing to Python:', error);
  }
}

/**
 * Sync learnings from Python backend back to Node.js GeometricMemory
 * This persists Python's discoveries for future runs
 */
async function syncFromPythonToNodeJS(): Promise<void> {
  try {
    const basins = await oceanQIGBackend.syncToNodeJS();
    
    if (basins.length === 0) return;
    
    let added = 0;
    for (const basin of basins) {
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
    }
    
    if (added > 0) {
      console.log(`[PythonSync] Added ${added} new probes from Python to GeometricMemory`);
      // Refresh constellation token weights with new data
      oceanConstellation.refreshTokenWeightsFromGeometricMemory();
    }
  } catch (error) {
    console.error('[PythonSync] Error syncing from Python:', error);
  }
}

/**
 * Refresh tokenizer weights periodically (for continuous learning)
 */
function refreshTokenizerWeights(): void {
  oceanConstellation.refreshTokenWeightsFromGeometricMemory();
}

/**
 * Sync vocabulary observations from Node.js to Python QIG tokenizer
 * This feeds learned words into the tokenizer for kernel training
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
    
    const result = await oceanQIGBackend.updateTokenizer(observations);
    
    // Verify sync was successful
    if (result.totalVocab > 0) {
      console.log(`[PythonSync] Vocabulary synced: ${result.newTokens} new tokens, ${result.totalVocab} total`);
      
      // Get tokenizer status for verification
      try {
        const status = await oceanQIGBackend.getTokenizerStatus();
        console.log(`[PythonSync] Tokenizer status: ${status.vocabSize} vocab, ${status.highPhiCount} high-Φ tokens, avg Φ=${status.avgPhi.toFixed(3)}`);
      } catch (statusError) {
        console.warn('[PythonSync] Could not get tokenizer status for verification');
      }
    } else {
      console.warn('[PythonSync] Vocabulary sync returned empty result - tokenizer may not be ready');
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
  // Also refresh tokenizer weights periodically
  pythonSyncInterval = setInterval(async () => {
    if (oceanQIGBackend.available()) {
      await syncFromPythonToNodeJS();
      // Also sync vocabulary to Python tokenizer
      await syncVocabularyToPython();
    }
    // Always refresh tokenizer even without Python
    refreshTokenizerWeights();
  }, 60000);
  
  // Initial refresh on startup
  refreshTokenizerWeights();
  
  // Initial vocabulary sync after a brief delay
  setTimeout(async () => {
    if (oceanQIGBackend.available()) {
      await syncVocabularyToPython();
    }
  }, 5000);
  
  console.log('[PythonSync] Started periodic sync (every 60s) with tokenizer refresh and vocabulary sync');
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

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:", "https:", "https://blockstream.info", "https://api.bitinfocharts.com", "https://mempool.space", "https://api.tavily.com", "https://replit.com"],
      workerSrc: ["'self'", "blob:"],
      frameSrc: ["'self'", "https://replit.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
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
