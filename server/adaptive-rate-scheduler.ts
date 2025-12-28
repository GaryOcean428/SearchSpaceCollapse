/**
 * Adaptive Rate Scheduler
 * 
 * Dynamically adjusts API request rates based on:
 * - Time of day (speed up during low-traffic hours)
 * - Provider health and rate limits
 * - Recent error rates
 * - Queue depth
 * 
 * Target: Maximize throughput while respecting rate limits
 */

import { getProviderStats } from './blockchain-api-router';

export interface RateSchedule {
  requestsPerMinute: number;
  parallelQueries: number;
  delayBetweenRequests: number; // milliseconds
  reason: string;
}

export interface TrafficWindow {
  hourUTC: number;
  trafficLevel: 'low' | 'medium' | 'high';
  multiplier: number;
}

/**
 * Expected traffic patterns (UTC time)
 * Low traffic = better API response times
 */
const TRAFFIC_PATTERNS: TrafficWindow[] = [
  { hourUTC: 0, trafficLevel: 'low', multiplier: 1.5 },
  { hourUTC: 1, trafficLevel: 'low', multiplier: 1.5 },
  { hourUTC: 2, trafficLevel: 'low', multiplier: 1.5 },
  { hourUTC: 3, trafficLevel: 'low', multiplier: 1.5 },
  { hourUTC: 4, trafficLevel: 'low', multiplier: 1.5 },
  { hourUTC: 5, trafficLevel: 'low', multiplier: 1.4 },
  { hourUTC: 6, trafficLevel: 'medium', multiplier: 1.2 },
  { hourUTC: 7, trafficLevel: 'medium', multiplier: 1.2 },
  { hourUTC: 8, trafficLevel: 'high', multiplier: 1.0 },
  { hourUTC: 9, trafficLevel: 'high', multiplier: 1.0 },
  { hourUTC: 10, trafficLevel: 'high', multiplier: 1.0 },
  { hourUTC: 11, trafficLevel: 'high', multiplier: 1.0 },
  { hourUTC: 12, trafficLevel: 'high', multiplier: 1.0 },
  { hourUTC: 13, trafficLevel: 'high', multiplier: 1.0 },
  { hourUTC: 14, trafficLevel: 'high', multiplier: 1.0 },
  { hourUTC: 15, trafficLevel: 'high', multiplier: 1.0 },
  { hourUTC: 16, trafficLevel: 'high', multiplier: 1.0 },
  { hourUTC: 17, trafficLevel: 'medium', multiplier: 1.1 },
  { hourUTC: 18, trafficLevel: 'medium', multiplier: 1.2 },
  { hourUTC: 19, trafficLevel: 'medium', multiplier: 1.2 },
  { hourUTC: 20, trafficLevel: 'medium', multiplier: 1.3 },
  { hourUTC: 21, trafficLevel: 'low', multiplier: 1.4 },
  { hourUTC: 22, trafficLevel: 'low', multiplier: 1.5 },
  { hourUTC: 23, trafficLevel: 'low', multiplier: 1.5 },
];

/**
 * Rate scheduler state
 */
class AdaptiveRateScheduler {
  private baseRate: number = 60; // Base requests per minute
  private currentSchedule: RateSchedule | null = null;
  private recentErrors: number[] = [];
  private recentSuccesses: number[] = [];
  private lastAdjustment: number = 0;
  private adjustmentIntervalMs: number = 60000; // Adjust every minute
  
  /**
   * Get current traffic multiplier based on UTC time
   */
  getCurrentTrafficMultiplier(): number {
    const now = new Date();
    const hourUTC = now.getUTCHours();
    const window = TRAFFIC_PATTERNS.find(w => w.hourUTC === hourUTC);
    return window?.multiplier || 1.0;
  }
  
  /**
   * Get current traffic level
   */
  getCurrentTrafficLevel(): 'low' | 'medium' | 'high' {
    const now = new Date();
    const hourUTC = now.getUTCHours();
    const window = TRAFFIC_PATTERNS.find(w => w.hourUTC === hourUTC);
    return window?.trafficLevel || 'high';
  }
  
  /**
   * Calculate provider health score (0-1)
   */
  getProviderHealthScore(): number {
    const stats = getProviderStats();
    const enabledProviders = stats.filter(p => p.enabled);
    
    if (enabledProviders.length === 0) return 0;
    
    const avgSuccessRate = enabledProviders.reduce((sum, p) => sum + p.successRate, 0) / enabledProviders.length;
    const avgCapacityUsed = enabledProviders.reduce((sum, p) => {
      const used = p.rateLimitStatus.requestsLastMinute / p.rateLimitStatus.allowed;
      return sum + used;
    }, 0) / enabledProviders.length;
    
    // Health is combination of success rate and available capacity
    const healthScore = (avgSuccessRate * 0.6) + ((1 - avgCapacityUsed) * 0.4);
    
    return Math.max(0, Math.min(1, healthScore));
  }
  
  /**
   * Calculate recent error rate (last 5 minutes)
   */
  getRecentErrorRate(): number {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    
    const recentErrorCount = this.recentErrors.filter(t => t > fiveMinutesAgo).length;
    const recentSuccessCount = this.recentSuccesses.filter(t => t > fiveMinutesAgo).length;
    const total = recentErrorCount + recentSuccessCount;
    
    if (total === 0) return 0;
    return recentErrorCount / total;
  }
  
  /**
   * Record an API request result
   */
  recordResult(success: boolean): void {
    const now = Date.now();
    if (success) {
      this.recentSuccesses.push(now);
    } else {
      this.recentErrors.push(now);
    }
    
    // Keep only last 5 minutes
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    this.recentErrors = this.recentErrors.filter(t => t > fiveMinutesAgo);
    this.recentSuccesses = this.recentSuccesses.filter(t => t > fiveMinutesAgo);
  }
  
  /**
   * Compute optimal rate schedule
   */
  computeSchedule(queueDepth: number = 0): RateSchedule {
    const now = Date.now();
    
    // Only adjust at most once per interval
    if (this.currentSchedule && (now - this.lastAdjustment < this.adjustmentIntervalMs)) {
      return this.currentSchedule;
    }
    
    const trafficMultiplier = this.getCurrentTrafficMultiplier();
    const trafficLevel = this.getCurrentTrafficLevel();
    const healthScore = this.getProviderHealthScore();
    const errorRate = this.getRecentErrorRate();
    
    // Start with base rate
    let targetRate = this.baseRate;
    
    // Apply traffic multiplier (speed up during low traffic)
    targetRate *= trafficMultiplier;
    
    // Apply health score (slow down if providers are unhealthy)
    targetRate *= (0.5 + healthScore * 0.5); // Scale 0.5x to 1.0x
    
    // Apply error rate penalty (slow down if errors are high)
    if (errorRate > 0.2) {
      targetRate *= (1 - errorRate * 0.5); // Reduce by up to 50% at 100% error rate
    }
    
    // Apply queue depth boost (speed up if queue is deep)
    if (queueDepth > 100) {
      const queueBoost = Math.min(1.5, 1 + (queueDepth / 1000));
      targetRate *= queueBoost;
    }
    
    // Determine parallel query count based on traffic and health
    let parallelQueries = 1;
    if (trafficLevel === 'low' && healthScore > 0.7) {
      parallelQueries = 3;
    } else if (trafficLevel === 'medium' && healthScore > 0.6) {
      parallelQueries = 2;
    }
    
    // Calculate delay between requests
    const delayBetweenRequests = Math.max(100, Math.floor((60000 / targetRate) / parallelQueries));
    
    // Build reason string
    const reasons: string[] = [];
    reasons.push(`Traffic: ${trafficLevel} (${trafficMultiplier.toFixed(1)}x)`);
    reasons.push(`Health: ${(healthScore * 100).toFixed(0)}%`);
    if (errorRate > 0.1) {
      reasons.push(`Errors: ${(errorRate * 100).toFixed(0)}%`);
    }
    if (queueDepth > 100) {
      reasons.push(`Queue: ${queueDepth}`);
    }
    
    this.currentSchedule = {
      requestsPerMinute: Math.round(targetRate),
      parallelQueries,
      delayBetweenRequests,
      reason: reasons.join(', '),
    };
    
    this.lastAdjustment = now;
    
    console.log(`[AdaptiveRate] Adjusted schedule: ${this.currentSchedule.requestsPerMinute} req/min, ${parallelQueries}x parallel, ${delayBetweenRequests}ms delay - ${this.currentSchedule.reason}`);
    
    return this.currentSchedule;
  }
  
  /**
   * Get current schedule (or compute if needed)
   */
  getCurrentSchedule(queueDepth: number = 0): RateSchedule {
    if (!this.currentSchedule) {
      return this.computeSchedule(queueDepth);
    }
    
    // Check if adjustment interval has passed
    const now = Date.now();
    if (now - this.lastAdjustment >= this.adjustmentIntervalMs) {
      return this.computeSchedule(queueDepth);
    }
    
    return this.currentSchedule;
  }
  
  /**
   * Force immediate schedule recalculation
   */
  forceRecalculate(queueDepth: number = 0): RateSchedule {
    this.lastAdjustment = 0;
    return this.computeSchedule(queueDepth);
  }
  
  /**
   * Get statistics
   */
  getStats(): {
    currentRate: number;
    parallelQueries: number;
    trafficLevel: string;
    healthScore: number;
    errorRate: number;
    nextAdjustmentIn: number;
  } {
    const schedule = this.getCurrentSchedule();
    const nextAdjustmentIn = Math.max(0, this.adjustmentIntervalMs - (Date.now() - this.lastAdjustment));
    
    return {
      currentRate: schedule.requestsPerMinute,
      parallelQueries: schedule.parallelQueries,
      trafficLevel: this.getCurrentTrafficLevel(),
      healthScore: this.getProviderHealthScore(),
      errorRate: this.getRecentErrorRate(),
      nextAdjustmentIn,
    };
  }
}

// Singleton instance
export const adaptiveRateScheduler = new AdaptiveRateScheduler();

console.log('[AdaptiveRate] Adaptive rate scheduler initialized');
console.log(`[AdaptiveRate] Base rate: 60 req/min`);
console.log(`[AdaptiveRate] Traffic-aware: ${TRAFFIC_PATTERNS.length} time windows`);
console.log(`[AdaptiveRate] Health-aware: Provider monitoring enabled`);
