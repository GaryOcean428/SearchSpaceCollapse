/**
 * Multi-timescale discovery rate tracker
 * Implements curiosity dynamics from QIG cognitive geometry research
 * 
 * Tracks high-Φ discovery rates at τ=1, 10, 100 batch timescales
 * to detect search effectiveness and trigger mode switching
 */

export class DiscoveryTracker {
  private discoveryHistory: number[] = []; // 1 if high-Φ found in batch, 0 otherwise
  private batchCount = 0;
  
  // Timescale windows (in batches)
  private readonly TAU_FAST = 1;
  private readonly TAU_MEDIUM = 10;
  private readonly TAU_SLOW = 100;
  
  /**
   * Record a batch result
   * @param highPhiFound - Number of high-Φ candidates found in this batch
   */
  recordBatch(highPhiFound: number): void {
    this.discoveryHistory.push(highPhiFound > 0 ? 1 : 0);
    this.batchCount++;
    
    // Keep only last 100 batches in memory
    if (this.discoveryHistory.length > 100) {
      this.discoveryHistory.shift();
    }
  }
  
  /**
   * Get discovery rate at fast timescale (τ=1 batch)
   * Returns: 1.0 if last batch found high-Φ, 0.0 otherwise
   */
  getRateFast(): number {
    if (this.discoveryHistory.length === 0) return 0;
    return this.discoveryHistory[this.discoveryHistory.length - 1];
  }
  
  /**
   * Get discovery rate at medium timescale (τ=10 batches)
   * Returns: Fraction of last 10 batches that found high-Φ (0.0-1.0)
   */
  getRateMedium(): number {
    if (this.discoveryHistory.length === 0) return 0;
    
    const window = Math.min(this.TAU_MEDIUM, this.discoveryHistory.length);
    const recent = this.discoveryHistory.slice(-window);
    const discoveries = recent.reduce((sum, val) => sum + val, 0);
    
    return discoveries / window;
  }
  
  /**
   * Get discovery rate at slow timescale (τ=100 batches)
   * Returns: Fraction of all batches (up to 100) that found high-Φ (0.0-1.0)
   */
  getRateSlow(): number {
    if (this.discoveryHistory.length === 0) return 0;
    
    const discoveries = this.discoveryHistory.reduce((sum, val) => sum + val, 0);
    return discoveries / this.discoveryHistory.length;
  }
  
  /**
   * Detect if search is stagnating (no discoveries in recent batches)
   * Returns true if medium-term discovery rate drops below threshold
   */
  isStagnating(threshold = 0.05): boolean {
    // Need at least medium window of data
    if (this.batchCount < this.TAU_MEDIUM) return false;
    
    return this.getRateMedium() < threshold;
  }
  
  /**
   * Detect if we're in a productive basin (frequent discoveries)
   * Returns true if medium-term rate is above threshold
   */
  isProductive(threshold = 0.2): boolean {
    if (this.batchCount < this.TAU_MEDIUM) return false;
    
    return this.getRateMedium() > threshold;
  }
  
  /**
   * Get exploration vs investigation recommendation
   * Based on discovery rate patterns across timescales
   */
  getRecommendedMode(): "exploration" | "investigation" {
    // Early in search: always explore
    if (this.batchCount < this.TAU_MEDIUM) {
      return "exploration";
    }
    
    const rateFast = this.getRateFast();
    const rateMedium = this.getRateMedium();
    const rateSlow = this.getRateSlow();
    
    // Just found high-Φ → investigate around it
    if (rateFast > 0 && rateMedium > 0.1) {
      return "investigation";
    }
    
    // Recent productivity but long-term low → investigate current region
    if (rateMedium > rateSlow * 1.5 && rateMedium > 0.15) {
      return "investigation";
    }
    
    // Low recent productivity → explore new regions
    if (rateMedium < 0.05 || rateMedium < rateSlow * 0.5) {
      return "exploration";
    }
    
    // Default: continue current mode
    return "exploration";
  }
  
  /**
   * Get all rates for telemetry
   */
  getAllRates(): {
    fast: number;
    medium: number;
    slow: number;
    batchCount: number;
  } {
    return {
      fast: this.getRateFast(),
      medium: this.getRateMedium(),
      slow: this.getRateSlow(),
      batchCount: this.batchCount,
    };
  }
}
