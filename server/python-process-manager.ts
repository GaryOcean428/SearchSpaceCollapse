/**
 * PythonProcessManager - Centralized lifecycle management for the Python QIG backend
 * 
 * Provides:
 * - Process supervision with auto-restart and exponential backoff
 * - Health monitoring with readiness gating
 * - Shared state for all consumers (OlympusClient, etc.)
 * - Event-driven notifications for state changes
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { EventEmitter } from 'events';

export interface PythonBackendState {
  isRunning: boolean;
  isReady: boolean;
  lastHealthCheck: number;
  consecutiveFailures: number;
  restartCount: number;
  uptime: number;
}

export class PythonProcessManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private isRunning: boolean = false;
  private isReady: boolean = false;
  private startTime: number = 0;
  private lastHealthCheck: number = 0;
  private consecutiveFailures: number = 0;
  private restartCount: number = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private pendingRequests: Array<{ resolve: (ready: boolean) => void; timeout: NodeJS.Timeout }> = [];
  
  // Configuration
  private readonly backendUrl: string;
  private readonly maxRestarts: number = 10;
  private readonly restartDelays: number[] = [1000, 2000, 5000, 10000, 20000, 30000, 60000];
  private readonly healthCheckIntervalMs: number = 5000;
  private readonly healthTimeout: number = 3000;
  private readonly maxConsecutiveFailures: number = 5;
  
  constructor(backendUrl: string = 'http://localhost:5001') {
    super();
    this.backendUrl = backendUrl;
  }
  
  /**
   * Get current state
   */
  getState(): PythonBackendState {
    return {
      isRunning: this.isRunning,
      isReady: this.isReady,
      lastHealthCheck: this.lastHealthCheck,
      consecutiveFailures: this.consecutiveFailures,
      restartCount: this.restartCount,
      uptime: this.isRunning ? Date.now() - this.startTime : 0,
    };
  }
  
  /**
   * Check if backend is ready to receive requests
   */
  ready(): boolean {
    return this.isReady;
  }
  
  /**
   * Wait for backend to be ready (with timeout)
   */
  waitForReady(timeoutMs: number = 30000): Promise<boolean> {
    if (this.isReady) {
      return Promise.resolve(true);
    }
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        // Remove from pending
        this.pendingRequests = this.pendingRequests.filter(r => r.resolve !== resolve);
        resolve(false);
      }, timeoutMs);
      
      this.pendingRequests.push({ resolve, timeout });
    });
  }
  
  /**
   * Start the Python backend process
   */
  async start(): Promise<boolean> {
    if (this.isRunning) {
      console.log('[PythonManager] Already running');
      return this.isReady;
    }
    
    const qigBackendDir = path.resolve(process.cwd(), 'qig-backend');
    const pythonPath = process.env.PYTHON_PATH || 'python3';
    const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
    
    let spawnCommand: string;
    let spawnArgs: string[];
    
    if (isProduction) {
      spawnCommand = 'gunicorn';
      spawnArgs = [
        '--bind', '0.0.0.0:5001',
        '--workers', '2',
        '--timeout', '120',
        '--graceful-timeout', '30',
        '--keep-alive', '5',
        '--max-requests', '1000',
        '--max-requests-jitter', '50',
        '--log-level', 'info',
        'ocean_qig_core:app',
      ];
      console.log('[PythonManager] Starting Python QIG Backend (Gunicorn production mode)...');
    } else {
      spawnCommand = pythonPath;
      spawnArgs = ['-u', path.join(qigBackendDir, 'ocean_qig_core.py')];
      console.log('[PythonManager] Starting Python QIG Backend (Flask development mode)...');
    }
    
    this.process = spawn(spawnCommand, spawnArgs, {
      cwd: qigBackendDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
      },
    });
    
    this.isRunning = true;
    this.startTime = Date.now();
    
    // Handle stdout
    this.process.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      for (const line of lines) {
        // Skip Flask dev server noise
        if (line.includes('Running on') || line.includes('Debugger') || line.includes('Restarting')) {
          continue;
        }
        console.log(`[PythonQIG] ${line}`);
      }
    });
    
    // Handle stderr
    this.process.stderr?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      for (const line of lines) {
        if (line.includes('WARNING') || line.includes('Development server')) {
          continue;
        }
        console.log(`[PythonQIG] ${line}`);
      }
    });
    
    // Handle process exit
    this.process.on('close', (code: number | null) => {
      console.log(`[PythonManager] Process exited with code ${code}`);
      this.isRunning = false;
      this.setReady(false);
      
      // Stop health checks
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }
      
      // Attempt restart with backoff
      if (this.restartCount < this.maxRestarts) {
        const delayIndex = Math.min(this.restartCount, this.restartDelays.length - 1);
        const delay = this.restartDelays[delayIndex];
        this.restartCount++;
        
        console.log(`[PythonManager] Restart ${this.restartCount}/${this.maxRestarts} in ${delay}ms...`);
        setTimeout(() => this.start(), delay);
      } else {
        console.error(`[PythonManager] Max restarts (${this.maxRestarts}) reached. Manual intervention required.`);
        this.emit('maxRestartsReached');
      }
    });
    
    // Handle spawn error
    this.process.on('error', (err: Error) => {
      console.error('[PythonManager] Failed to start:', err.message);
      this.isRunning = false;
      this.setReady(false);
    });
    
    // Wait for initial readiness
    const ready = await this.waitForHealthy(30, 1000);
    
    if (ready) {
      console.log('[PythonManager] ✅ Backend is ready');
      this.restartCount = 0; // Reset restart count on successful start
      this.startHealthMonitoring();
    } else {
      console.warn('[PythonManager] ⚠️ Backend not responding after startup');
    }
    
    return ready;
  }
  
  /**
   * Stop the Python backend
   */
  async stop(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    if (this.process) {
      this.process.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          if (this.process) {
            this.process.kill('SIGKILL');
          }
          resolve();
        }, 5000);
        
        this.process?.on('close', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
      
      this.process = null;
    }
    
    this.isRunning = false;
    this.setReady(false);
    console.log('[PythonManager] Stopped');
  }
  
  /**
   * Check health with single request
   */
  private async checkHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.healthTimeout);
      
      const response = await fetch(`${this.backendUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        this.consecutiveFailures = 0;
        this.lastHealthCheck = Date.now();
        return true;
      }
      
      this.consecutiveFailures++;
      return false;
    } catch (error) {
      this.consecutiveFailures++;
      return false;
    }
  }
  
  /**
   * Wait for healthy state with retries
   */
  private async waitForHealthy(maxAttempts: number, delayMs: number): Promise<boolean> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const healthy = await this.checkHealth();
      
      if (healthy) {
        this.setReady(true);
        return true;
      }
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    return false;
  }
  
  /**
   * Start periodic health monitoring
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      return;
    }
    
    this.healthCheckInterval = setInterval(async () => {
      const healthy = await this.checkHealth();
      
      if (healthy && !this.isReady) {
        this.setReady(true);
        console.log('[PythonManager] Backend recovered');
      } else if (!healthy && this.isReady && this.consecutiveFailures >= this.maxConsecutiveFailures) {
        this.setReady(false);
        console.warn(`[PythonManager] Backend unhealthy after ${this.consecutiveFailures} consecutive failures`);
        this.emit('unhealthy');
      }
    }, this.healthCheckIntervalMs);
  }
  
  /**
   * Set ready state and notify waiting promises
   */
  private setReady(ready: boolean): void {
    const wasReady = this.isReady;
    this.isReady = ready;
    
    if (ready && !wasReady) {
      // Resolve all pending waitForReady calls
      for (const pending of this.pendingRequests) {
        clearTimeout(pending.timeout);
        pending.resolve(true);
      }
      this.pendingRequests = [];
      this.emit('ready');
    } else if (!ready && wasReady) {
      this.emit('notReady');
    }
  }
}

// Singleton instance
let instance: PythonProcessManager | null = null;

export function getPythonManager(): PythonProcessManager {
  if (!instance) {
    instance = new PythonProcessManager();
  }
  return instance;
}

export function createPythonManager(backendUrl?: string): PythonProcessManager {
  instance = new PythonProcessManager(backendUrl);
  return instance;
}
