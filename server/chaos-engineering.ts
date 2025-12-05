/**
 * Chaos Engineering Module
 * Follows: TYPE_SYMBOL_CONCEPT_MANIFEST v1.0
 * 
 * Provides controlled failure injection for testing resilience:
 * - Random kernel kills
 * - Network latency injection
 * - Error injection
 * - Resource exhaustion simulation
 * 
 * ⚠️ ONLY ENABLE IN NON-PRODUCTION ENVIRONMENTS
 */

import type { Request, Response, NextFunction } from 'express';
import type { OceanAgent } from './ocean-agent';

export interface ChaosConfig {
  /**
   * Enable chaos engineering
   * Default: false (MUST be explicitly enabled)
   */
  enabled: boolean;
  
  /**
   * Probability of failure (0-1)
   * Default: 0.01 (1% of requests)
   */
  failureProbability?: number;
  
  /**
   * Probability of latency injection (0-1)
   * Default: 0.05 (5% of requests)
   */
  latencyProbability?: number;
  
  /**
   * Min/max latency to inject (ms)
   * Default: 100-5000ms
   */
  latencyRange?: [number, number];
  
  /**
   * Probability of kernel kill (0-1)
   * Default: 0.001 (0.1% of kernel operations)
   */
  kernelKillProbability?: number;
  
  /**
   * Excluded paths (never inject failures)
   * Default: ['/api/health', '/api/metrics']
   */
  excludedPaths?: string[];
}

class ChaosEngineer {
  private config: Required<ChaosConfig>;
  private metrics: {
    totalRequests: number;
    failuresInjected: number;
    latenciesInjected: number;
    kernelsKilled: number;
  };
  
  constructor(config: ChaosConfig) {
    if (!config.enabled) {
      throw new Error('Chaos engineering must be explicitly enabled');
    }
    
    // Safety check - prevent accidental production use
    if (process.env.NODE_ENV === 'production' && !process.env.CHAOS_ENGINEERING_OVERRIDE) {
      throw new Error('Chaos engineering is disabled in production. Set CHAOS_ENGINEERING_OVERRIDE=true to enable.');
    }
    
    this.config = {
      enabled: config.enabled,
      failureProbability: config.failureProbability ?? 0.01,
      latencyProbability: config.latencyProbability ?? 0.05,
      latencyRange: config.latencyRange ?? [100, 5000],
      kernelKillProbability: config.kernelKillProbability ?? 0.001,
      excludedPaths: config.excludedPaths ?? ['/api/health', '/api/metrics'],
    };
    
    this.metrics = {
      totalRequests: 0,
      failuresInjected: 0,
      latenciesInjected: 0,
      kernelsKilled: 0,
    };
    
    console.warn('🔥 CHAOS ENGINEERING ENABLED 🔥');
    console.warn('Failure probability:', this.config.failureProbability);
    console.warn('Latency probability:', this.config.latencyProbability);
    console.warn('Kernel kill probability:', this.config.kernelKillProbability);
  }
  
  /**
   * Should we inject chaos for this request?
   */
  private shouldInjectChaos(req: Request): boolean {
    // Never inject on excluded paths
    if (this.config.excludedPaths.some(path => req.path.startsWith(path))) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Get random number between 0 and 1
   */
  private random(): number {
    return Math.random();
  }
  
  /**
   * Get random integer between min and max (inclusive)
   */
  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  /**
   * Inject random latency
   */
  private async injectLatency(): Promise<void> {
    const [min, max] = this.config.latencyRange;
    const latency = this.randomInt(min, max);
    
    console.warn(`[Chaos] Injecting ${latency}ms latency`);
    this.metrics.latenciesInjected++;
    
    await new Promise(resolve => setTimeout(resolve, latency));
  }
  
  /**
   * Inject random failure
   */
  private injectFailure(res: Response): void {
    const errorTypes = [
      { status: 500, message: 'Internal Server Error (Chaos Injection)' },
      { status: 503, message: 'Service Unavailable (Chaos Injection)' },
      { status: 504, message: 'Gateway Timeout (Chaos Injection)' },
      { status: 429, message: 'Too Many Requests (Chaos Injection)' },
    ];
    
    const error = errorTypes[this.randomInt(0, errorTypes.length - 1)];
    
    console.warn(`[Chaos] Injecting ${error.status} error`);
    this.metrics.failuresInjected++;
    
    res.status(error.status).json({
      error: error.message,
      chaos: true,
      timestamp: Date.now(),
    });
  }
  
  /**
   * Kill kernel (if active)
   */
  async killKernel(agent: OceanAgent | null): Promise<void> {
    if (!agent) {
      return;
    }
    
    if (this.random() < this.config.kernelKillProbability) {
      console.warn('[Chaos] 💀 Killing active kernel');
      this.metrics.kernelsKilled++;
      
      // Force stop the agent
      try {
        await agent.stop();
        console.warn('[Chaos] Kernel killed successfully');
      } catch (err) {
        console.error('[Chaos] Failed to kill kernel:', err);
      }
    }
  }
  
  /**
   * Express middleware for chaos injection
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      this.metrics.totalRequests++;
      
      if (!this.shouldInjectChaos(req)) {
        return next();
      }
      
      // Inject latency?
      if (this.random() < this.config.latencyProbability) {
        await this.injectLatency();
      }
      
      // Inject failure?
      if (this.random() < this.config.failureProbability) {
        return this.injectFailure(res);
      }
      
      next();
    };
  }
  
  /**
   * Get chaos metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      failureRate: this.metrics.totalRequests > 0 
        ? this.metrics.failuresInjected / this.metrics.totalRequests 
        : 0,
      latencyRate: this.metrics.totalRequests > 0
        ? this.metrics.latenciesInjected / this.metrics.totalRequests
        : 0,
    };
  }
  
  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      failuresInjected: 0,
      latenciesInjected: 0,
      kernelsKilled: 0,
    };
  }
}

// Singleton instance (only created if explicitly enabled)
let chaosInstance: ChaosEngineer | null = null;

/**
 * Initialize chaos engineering
 * 
 * @example
 * // In development only
 * if (process.env.NODE_ENV === 'development' && process.env.CHAOS_ENABLED === 'true') {
 *   initChaos({ enabled: true, failureProbability: 0.05 });
 * }
 */
export function initChaos(config: ChaosConfig): ChaosEngineer {
  if (chaosInstance) {
    console.warn('[Chaos] Already initialized');
    return chaosInstance;
  }
  
  if (!config.enabled) {
    throw new Error('Chaos engineering must be explicitly enabled');
  }
  
  chaosInstance = new ChaosEngineer(config);
  return chaosInstance;
}

/**
 * Get chaos instance (if initialized)
 */
export function getChaos(): ChaosEngineer | null {
  return chaosInstance;
}

/**
 * Chaos middleware (no-op if not initialized)
 */
export function chaosMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (chaosInstance) {
      return chaosInstance.middleware()(req, res, next);
    }
    next();
  };
}

/**
 * Kill kernel with chaos (if enabled)
 */
export async function chaosKillKernel(agent: OceanAgent | null): Promise<void> {
  if (chaosInstance && agent) {
    await chaosInstance.killKernel(agent);
  }
}

/**
 * Get chaos metrics
 */
export function getChaosMetrics() {
  return chaosInstance?.getMetrics() ?? null;
}

/**
 * Example usage in routes:
 * 
 * ```typescript
 * // Initialize in development
 * if (process.env.NODE_ENV === 'development' && process.env.CHAOS_ENABLED === 'true') {
 *   initChaos({ 
 *     enabled: true,
 *     failureProbability: 0.05,  // 5% failure rate
 *     latencyProbability: 0.10,  // 10% latency injection
 *     kernelKillProbability: 0.01, // 1% kernel kills
 *   });
 * }
 * 
 * // Apply middleware
 * app.use(chaosMiddleware());
 * 
 * // Kill kernel during operations
 * await chaosKillKernel(activeAgent);
 * 
 * // Get metrics
 * app.get('/api/chaos/metrics', (req, res) => {
 *   res.json(getChaosMetrics());
 * });
 * ```
 */
