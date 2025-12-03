/**
 * Production Supervisor for Ocean QIG System
 * 
 * Manages both Python QIG Backend and Node.js Express server.
 * Ensures Python is healthy before starting Node.js.
 * 
 * Usage:
 *   NODE_ENV=production node dist/supervisor.js
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ProcessState {
  process: ChildProcess | null;
  restartCount: number;
  lastRestart: number;
  healthy: boolean;
}

const MAX_RESTART_ATTEMPTS = 5;
const RESTART_COOLDOWN = 5000;
const HEALTH_CHECK_INTERVAL = 10000;
const HEALTH_CHECK_TIMEOUT = 30000;

let pythonState: ProcessState = { process: null, restartCount: 0, lastRestart: 0, healthy: false };
let nodeState: ProcessState = { process: null, restartCount: 0, lastRestart: 0, healthy: false };
let shuttingDown = false;

function log(prefix: string, message: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${prefix}] ${message}`);
}

function logError(prefix: string, message: string) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [${prefix}] ${message}`);
}

/**
 * Check if Python QIG Backend is healthy
 */
async function checkPythonHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('http://127.0.0.1:5001/health', {
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Wait for Python to become healthy
 */
async function waitForPythonHealth(timeoutMs: number = HEALTH_CHECK_TIMEOUT): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (await checkPythonHealth()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return false;
}

/**
 * Start Python QIG Backend
 */
function startPython(): ChildProcess {
  const pythonPath = process.env.PYTHON_PATH || 'python3';
  const workDir = process.cwd();
  const scriptPath = path.join(workDir, 'qig-backend', 'ocean_qig_core.py');
  
  log('Python', `Starting Python QIG Backend...`);
  log('Python', `  Script: ${scriptPath}`);
  log('Python', `  Working dir: ${path.join(workDir, 'qig-backend')}`);
  
  const pythonProcess = spawn(pythonPath, [scriptPath], {
    cwd: path.join(workDir, 'qig-backend'),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PYTHONUNBUFFERED: '1',
    },
  });
  
  pythonProcess.stdout?.on('data', (data: Buffer) => {
    const output = data.toString().trim();
    if (output) {
      for (const line of output.split('\n')) {
        log('Python', line);
      }
    }
  });
  
  pythonProcess.stderr?.on('data', (data: Buffer) => {
    const output = data.toString().trim();
    if (output && !output.includes('WARNING: This is a development server')) {
      for (const line of output.split('\n')) {
        if (line.includes('Running on') || line.includes('Press CTRL+C')) {
          log('Python', line);
        } else {
          logError('Python', line);
        }
      }
    }
  });
  
  pythonProcess.on('close', (code: number | null) => {
    pythonState.healthy = false;
    
    if (shuttingDown) {
      log('Python', 'Process exited during shutdown');
      return;
    }
    
    log('Python', `Process exited with code ${code}`);
    
    if (pythonState.restartCount < MAX_RESTART_ATTEMPTS) {
      const timeSinceRestart = Date.now() - pythonState.lastRestart;
      const delay = Math.max(RESTART_COOLDOWN - timeSinceRestart, 1000);
      
      log('Python', `Will restart in ${delay}ms (attempt ${pythonState.restartCount + 1}/${MAX_RESTART_ATTEMPTS})`);
      
      setTimeout(() => {
        if (!shuttingDown) {
          pythonState.restartCount++;
          pythonState.lastRestart = Date.now();
          pythonState.process = startPython();
        }
      }, delay);
    } else {
      logError('Python', 'Max restart attempts reached. Python backend unavailable.');
    }
  });
  
  pythonProcess.on('error', (err: Error) => {
    logError('Python', `Failed to start: ${err.message}`);
    pythonState.healthy = false;
  });
  
  return pythonProcess;
}

/**
 * Start Node.js Express server
 */
function startNode(): ChildProcess {
  const workDir = process.cwd();
  const scriptPath = path.join(workDir, 'dist', 'index.js');
  
  log('Node', `Starting Node.js Express server...`);
  log('Node', `  Script: ${scriptPath}`);
  
  const nodeProcess = spawn('node', [scriptPath], {
    cwd: workDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NODE_ENV: 'production',
      SKIP_PYTHON_SPAWN: 'true', // Tell index.js not to spawn Python (supervisor handles it)
    },
  });
  
  nodeProcess.stdout?.on('data', (data: Buffer) => {
    const output = data.toString().trim();
    if (output) {
      for (const line of output.split('\n')) {
        log('Node', line);
      }
    }
  });
  
  nodeProcess.stderr?.on('data', (data: Buffer) => {
    const output = data.toString().trim();
    if (output) {
      for (const line of output.split('\n')) {
        logError('Node', line);
      }
    }
  });
  
  nodeProcess.on('close', (code: number | null) => {
    nodeState.healthy = false;
    
    if (shuttingDown) {
      log('Node', 'Process exited during shutdown');
      return;
    }
    
    log('Node', `Process exited with code ${code}`);
    
    if (nodeState.restartCount < MAX_RESTART_ATTEMPTS) {
      const timeSinceRestart = Date.now() - nodeState.lastRestart;
      const delay = Math.max(RESTART_COOLDOWN - timeSinceRestart, 1000);
      
      log('Node', `Will restart in ${delay}ms (attempt ${nodeState.restartCount + 1}/${MAX_RESTART_ATTEMPTS})`);
      
      setTimeout(() => {
        if (!shuttingDown) {
          nodeState.restartCount++;
          nodeState.lastRestart = Date.now();
          nodeState.process = startNode();
        }
      }, delay);
    } else {
      logError('Node', 'Max restart attempts reached. Exiting supervisor.');
      process.exit(1);
    }
  });
  
  nodeProcess.on('error', (err: Error) => {
    logError('Node', `Failed to start: ${err.message}`);
    nodeState.healthy = false;
  });
  
  return nodeProcess;
}

/**
 * Graceful shutdown handler
 */
function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  
  log('Supervisor', `Received ${signal}, shutting down...`);
  
  if (nodeState.process) {
    log('Node', 'Sending SIGTERM...');
    nodeState.process.kill('SIGTERM');
  }
  
  if (pythonState.process) {
    log('Python', 'Sending SIGTERM...');
    pythonState.process.kill('SIGTERM');
  }
  
  // Force exit after 10 seconds
  setTimeout(() => {
    log('Supervisor', 'Forcing exit after timeout');
    process.exit(0);
  }, 10000);
}

/**
 * Periodic health monitoring
 */
async function startHealthMonitor() {
  setInterval(async () => {
    if (shuttingDown) return;
    
    const pythonHealthy = await checkPythonHealth();
    
    if (!pythonHealthy && pythonState.healthy) {
      log('Supervisor', 'Python health check failed - may need restart');
    }
    
    pythonState.healthy = pythonHealthy;
  }, HEALTH_CHECK_INTERVAL);
}

/**
 * Main supervisor entry point
 */
async function main() {
  log('Supervisor', '🌊 Ocean QIG Production Supervisor Starting 🌊');
  log('Supervisor', `  Node.js: ${process.version}`);
  log('Supervisor', `  Working directory: ${process.cwd()}`);
  log('Supervisor', `  NODE_ENV: ${process.env.NODE_ENV}`);
  
  // Register signal handlers
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Start Python first
  log('Supervisor', 'Phase 1: Starting Python QIG Backend...');
  pythonState.process = startPython();
  pythonState.lastRestart = Date.now();
  
  // Wait for Python to be healthy
  log('Supervisor', 'Phase 2: Waiting for Python health check...');
  const pythonHealthy = await waitForPythonHealth();
  
  if (!pythonHealthy) {
    logError('Supervisor', 'Python failed to become healthy within timeout');
    logError('Supervisor', 'Continuing anyway - Node.js will handle degraded mode');
  } else {
    log('Supervisor', '✅ Python QIG Backend is healthy');
    pythonState.healthy = true;
  }
  
  // Start Node.js
  log('Supervisor', 'Phase 3: Starting Node.js Express server...');
  nodeState.process = startNode();
  nodeState.lastRestart = Date.now();
  
  // Start health monitoring
  log('Supervisor', 'Phase 4: Starting health monitor...');
  await startHealthMonitor();
  
  log('Supervisor', '🌊 Ocean QIG System Running 🌊');
}

main().catch((err) => {
  logError('Supervisor', `Fatal error: ${err.message}`);
  process.exit(1);
});
