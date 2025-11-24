/**
 * Resonance Detector
 * 
 * PURE PRINCIPLE: DETECT resonance, NEVER optimize toward κ*
 * 
 * Context:
 * - Running coupling β ≈ 0.44 (L=3→4)
 * - Coupling plateaus at κ* ≈ 64 (optimal, fixed point)
 * - Near κ*, system is RESONANT - small perturbations cause large Φ changes
 * 
 * Geometric Insight:
 * κ* is an ATTRACTOR on the coupling manifold. Near attractors, the basin 
 * of attraction has HIGH CURVATURE - small movements get amplified.
 * 
 * Like pushing a swing at resonance: small pushes have big effects.
 * 
 * PURITY CHECK:
 * ✅ κ* = 64 is MEASURED optimal (from physics validation)
 * ✅ Near κ*, small changes amplified (geometric resonance)
 * ✅ We detect resonance, adapt control (not optimize toward κ*)
 * ✅ Resonance is observation (not optimization target)
 * ✅ LR adjustment is control (not loss modification)
 * ✅ κ emerges naturally, never targeted
 * 
 * ❌ NEVER optimize κ toward κ* (no kappa_loss)
 * ❌ NEVER force system toward resonance
 */

import { QIG_CONSTANTS } from './qig-pure-v2.js';

export interface ResonanceMeasurement {
  // Current coupling strength (measured, not optimized)
  kappa: number;
  
  // Distance from optimal coupling
  distanceToOptimal: number;
  
  // Are we in resonance region?
  inResonance: boolean;
  
  // Resonance strength (0 = far, 1 = at κ*)
  resonanceStrength: number;
  
  // Suggested learning rate multiplier
  suggestedLRMultiplier: number;
}

interface ResonanceHistoryEntry {
  kappa: number;
  timestamp: number;
  inResonance: boolean;
}

/**
 * Resonance Detector
 * 
 * Detects proximity to optimal coupling κ* and adjusts learning accordingly.
 * Never optimizes toward κ* - that would be impure.
 */
export class ResonanceDetector {
  private history: ResonanceHistoryEntry[] = [];
  private readonly kappaStar: number;
  private readonly resonanceWidth: number;
  
  /**
   * @param kappaStar - Optimal coupling (from physics: κ₄ = 64.47)
   * @param resonanceWidth - Half-width of resonance region
   */
  constructor(
    kappaStar: number = QIG_CONSTANTS.KAPPA_STAR,
    resonanceWidth: number = 10.0
  ) {
    this.kappaStar = kappaStar;
    this.resonanceWidth = resonanceWidth;
  }
  
  /**
   * Check if current κ is near resonance
   * 
   * PURE: We measure proximity, we don't optimize toward it.
   * 
   * @param kappaCurrent - Current coupling strength (measured from phrase)
   * @returns Resonance measurement (pure observation)
   */
  checkResonance(kappaCurrent: number): ResonanceMeasurement {
    // Measure distance from optimal (geometric distance on κ manifold)
    const distanceToOptimal = Math.abs(kappaCurrent - this.kappaStar);
    
    // Are we in resonance region?
    const inResonance = distanceToOptimal < this.resonanceWidth;
    
    // Resonance strength (0 = far, 1 = exactly at κ*)
    // Uses smooth tanh to avoid sharp transitions
    const resonanceStrength = Math.max(
      0.0,
      1.0 - distanceToOptimal / this.resonanceWidth
    );
    
    // Compute suggested learning rate multiplier
    const suggestedLRMultiplier = this.computeLearningRateMultiplier(resonanceStrength);
    
    // Record in history
    this.history.push({
      kappa: kappaCurrent,
      timestamp: Date.now(),
      inResonance,
    });
    
    // Keep history bounded
    if (this.history.length > 100) {
      this.history.shift();
    }
    
    return {
      kappa: kappaCurrent,
      distanceToOptimal,
      inResonance,
      resonanceStrength,
      suggestedLRMultiplier,
    };
  }
  
  /**
   * Compute learning rate multiplier based on resonance proximity
   * 
   * PURE: Adaptive control based on geometry, not optimization.
   * 
   * Strategy:
   * - Far from κ*: normal LR (multiplier = 1.0)
   * - Near κ*: reduce LR proportionally (multiplier < 1.0)
   * - At κ*: minimum LR (multiplier = 0.1)
   * 
   * Rationale: Near resonance, small updates cause large Φ changes.
   * Like a swing at resonance - gentle pushes only.
   * 
   * @param resonanceStrength - Measured resonance (0-1)
   * @returns Learning rate multiplier (0.1-1.0)
   */
  private computeLearningRateMultiplier(resonanceStrength: number): number {
    if (resonanceStrength <= 0) {
      return 1.0; // Far from resonance, normal LR
    }
    
    // Reduce LR proportionally to resonance strength
    // strength=0 → mult=1.0 (normal)
    // strength=1 → mult=0.1 (minimum, very gentle)
    const multiplier = 1.0 - 0.9 * resonanceStrength;
    
    return Math.max(0.1, Math.min(1.0, multiplier));
  }
  
  /**
   * Get resonance statistics for telemetry
   */
  getStats(): {
    currentKappa: number;
    averageKappa: number;
    timeInResonance: number;
    resonanceFrequency: number;
  } {
    if (this.history.length === 0) {
      return {
        currentKappa: 0,
        averageKappa: 0,
        timeInResonance: 0,
        resonanceFrequency: 0,
      };
    }
    
    const currentKappa = this.history[this.history.length - 1].kappa;
    const averageKappa = this.history.reduce((sum, h) => sum + h.kappa, 0) / this.history.length;
    
    // Count how many measurements were in resonance
    const resonanceCount = this.history.filter(h => h.inResonance).length;
    const resonanceFrequency = resonanceCount / this.history.length;
    
    // Estimate time in resonance (rough approximation)
    const timeInResonance = resonanceFrequency;
    
    return {
      currentKappa,
      averageKappa,
      timeInResonance,
      resonanceFrequency,
    };
  }
  
  /**
   * Check if we're approaching resonance (predictive)
   * 
   * Looks at trajectory to predict if we're moving toward κ*
   * Useful for early warning before entering high-sensitivity region
   */
  isApproachingResonance(): boolean {
    if (this.history.length < 3) {
      return false;
    }
    
    // Get recent trajectory
    const recent = this.history.slice(-3);
    
    // Check if distance to κ* is decreasing
    const dist1 = Math.abs(recent[0].kappa - this.kappaStar);
    const dist2 = Math.abs(recent[1].kappa - this.kappaStar);
    const dist3 = Math.abs(recent[2].kappa - this.kappaStar);
    
    // Approaching if distance is consistently decreasing
    return dist2 < dist1 && dist3 < dist2;
  }
  
  /**
   * Reset detector (e.g., when starting new search)
   */
  reset(): void {
    this.history = [];
  }
}
