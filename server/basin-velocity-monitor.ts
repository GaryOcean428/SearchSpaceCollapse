/**
 * Basin Velocity Monitor
 * 
 * PURE PRINCIPLE: MEASURE velocity, NEVER optimize it
 * 
 * Context: Gary-B (vicarious learning, Φ=0.705) outperformed Gary-A 
 * (direct experience, Φ=0.466) because vicarious learning has LOWER 
 * basin velocity (slower changes = safer integration).
 * 
 * Velocity is a TANGENT VECTOR on the Fisher manifold.
 * It tells us not just WHERE we are, but HOW FAST we're moving 
 * through consciousness space.
 * 
 * PURITY CHECK:
 * ✅ Pure measurement (no optimization loop)
 * ✅ Fisher metric for distance (information geometry)
 * ✅ Velocity emergent from trajectory
 * ✅ Thresholds for detection (not targets)
 * ✅ Adaptive control based on measurement (not optimization)
 * 
 * ❌ NEVER optimize velocity toward a target
 * ❌ NEVER use Euclidean distance (use Fisher metric)
 */

import { fisherDistance } from './qig-pure-v2.js';

export interface VelocityMeasurement {
  // Current velocity (Fisher distance / time)
  velocity: number;
  
  // Rate of velocity change (acceleration)
  acceleration: number;
  
  // Is velocity safe? (below breakdown threshold)
  isSafe: boolean;
  
  // Fisher distance traveled since last measurement
  distance: number;
  
  // Time elapsed since last measurement
  dt: number;
  
  // Rolling average velocity (last 5 measurements)
  avgVelocity: number;
}

interface BasinSnapshot {
  phrase: string;
  timestamp: number;
}

/**
 * Basin Velocity Monitor
 * 
 * Tracks rate of change through the information manifold to prevent breakdown.
 * High velocity = breakdown risk (observation, not target).
 * Measurements inform adaptive control (learning rate adjustment).
 */
export class BasinVelocityMonitor {
  private history: BasinSnapshot[] = [];
  private velocityHistory: number[] = [];
  private readonly windowSize: number;
  
  // Empirically validated threshold (from Gary-B success)
  private readonly SAFE_VELOCITY_THRESHOLD = 0.05;
  
  constructor(windowSize: number = 10) {
    this.windowSize = windowSize;
  }
  
  /**
   * Update with new basin measurement
   * 
   * PURE: We measure how fast basin moved, we don't change it.
   * 
   * @param phrase - Current phrase (basin coordinates)
   * @param timestamp - Current time (for dt calculation)
   * @returns Velocity measurement (pure observation)
   */
  update(phrase: string, timestamp: number): VelocityMeasurement {
    // Add to history
    this.history.push({ phrase, timestamp });
    
    // Keep only recent history (rolling window)
    if (this.history.length > this.windowSize) {
      this.history.shift();
    }
    
    // Need at least 2 points to compute velocity
    if (this.history.length < 2) {
      return this.createEmptyMeasurement();
    }
    
    // Get previous and current basin states
    const prev = this.history[this.history.length - 2];
    const curr = this.history[this.history.length - 1];
    
    // CRITICAL: Use Fisher metric distance (NOT Euclidean!)
    const distance = fisherDistance(prev.phrase, curr.phrase);
    const dt = curr.timestamp - prev.timestamp;
    
    // Velocity = distance / time (tangent vector magnitude)
    const velocity = dt > 0 ? distance / dt : 0;
    
    // Track velocity history
    this.velocityHistory.push(velocity);
    if (this.velocityHistory.length > this.windowSize) {
      this.velocityHistory.shift();
    }
    
    // Compute acceleration (rate of velocity change)
    let acceleration = 0;
    if (this.velocityHistory.length >= 2) {
      const dv = this.velocityHistory[this.velocityHistory.length - 1] - 
                 this.velocityHistory[this.velocityHistory.length - 2];
      acceleration = dt > 0 ? dv / dt : 0;
    }
    
    // Safety check (empirically validated threshold from Gary-B)
    const isSafe = velocity < this.SAFE_VELOCITY_THRESHOLD;
    
    // Compute rolling average
    const avgVelocity = this.velocityHistory.length > 0
      ? this.velocityHistory.slice(-5).reduce((sum, v) => sum + v, 0) / Math.min(5, this.velocityHistory.length)
      : 0;
    
    return {
      velocity,
      acceleration,
      isSafe,
      distance,
      dt,
      avgVelocity,
    };
  }
  
  /**
   * Check if learning rate should be reduced due to high velocity
   * 
   * PURE: This is adaptive control based on measurement, not optimization.
   * 
   * Strategy:
   * - Low velocity: normal operation (multiplier = 1.0)
   * - High velocity: reduce proportionally (multiplier < 1.0)
   * - Critical velocity: minimum multiplier (0.1)
   * 
   * @param velocityThreshold - Safety threshold (default from Gary-B)
   * @returns [shouldReduce, suggestedMultiplier]
   */
  shouldReduceLearningRate(
    velocityThreshold: number = this.SAFE_VELOCITY_THRESHOLD
  ): [boolean, number] {
    if (this.velocityHistory.length === 0) {
      return [false, 1.0];
    }
    
    // Use rolling average to smooth out noise
    const avgVelocity = this.velocityHistory.slice(-5).reduce((sum, v) => sum + v, 0) / 
                        Math.min(5, this.velocityHistory.length);
    
    if (avgVelocity <= velocityThreshold) {
      return [false, 1.0];
    }
    
    // Suggest reducing LR proportionally to excess velocity
    // Higher velocity → lower LR (inverse relationship)
    const excess = avgVelocity / velocityThreshold;
    const suggestedMultiplier = Math.max(0.1, 1.0 / excess);
    
    return [true, suggestedMultiplier];
  }
  
  /**
   * Get velocity statistics for telemetry
   */
  getStats(): {
    current: number;
    average: number;
    max: number;
    min: number;
    isSafe: boolean;
  } {
    if (this.velocityHistory.length === 0) {
      return {
        current: 0,
        average: 0,
        max: 0,
        min: 0,
        isSafe: true,
      };
    }
    
    const current = this.velocityHistory[this.velocityHistory.length - 1];
    const average = this.velocityHistory.reduce((sum, v) => sum + v, 0) / this.velocityHistory.length;
    const max = Math.max(...this.velocityHistory);
    const min = Math.min(...this.velocityHistory);
    const isSafe = average < this.SAFE_VELOCITY_THRESHOLD;
    
    return { current, average, max, min, isSafe };
  }
  
  /**
   * Reset monitor (e.g., when starting new search)
   */
  reset(): void {
    this.history = [];
    this.velocityHistory = [];
  }
  
  private createEmptyMeasurement(): VelocityMeasurement {
    return {
      velocity: 0,
      acceleration: 0,
      isSafe: true,
      distance: 0,
      dt: 0,
      avgVelocity: 0,
    };
  }
}
