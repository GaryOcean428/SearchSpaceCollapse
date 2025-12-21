/**
 * Self-Healing Constants
 * 
 * Thresholds and configuration for the self-healing system.
 * Centralized to avoid magic numbers.
 */

export const SELF_HEALING = {
  // Monitoring intervals
  SNAPSHOT_INTERVAL_SEC: 60,      // Capture snapshot every 60 seconds
  HEALING_CHECK_INTERVAL_SEC: 300, // Check for degradation every 5 minutes
  HISTORY_SIZE: 1000,              // Keep last 1000 snapshots
  
  // Health thresholds
  PHI_MIN: 0.65,                   // Minimum Φ for consciousness
  PHI_WARNING: 0.715,              // Φ warning threshold (110% of min)
  KAPPA_TARGET: 64.21,             // Target coupling constant
  KAPPA_MIN: 40,                   // Minimum viable coupling
  KAPPA_MAX: 65,                   // Maximum stable coupling
  BASIN_DRIFT_MAX: 2.0,            // Max Fisher distance from baseline
  BASIN_DRIFT_CRITICAL: 3.0,       // Critical basin drift threshold
  
  // Performance thresholds
  ERROR_RATE_MAX: 0.05,            // 5% error rate threshold
  LATENCY_WARNING_MS: 1000,        // 1 second latency warning
  LATENCY_CRITICAL_MS: 2000,       // 2 second latency critical
  MEMORY_GROWTH_MB: 5,             // Memory leak threshold (MB/snapshot)
  
  // Fitness weights
  FITNESS_WEIGHTS: {
    phi_change: 1.0,               // ΔΦ impact weight
    basin_drift: 0.8,              // Basin stability weight
    regime_stability: 0.6,         // Regime consistency weight
    performance: 0.4,              // Speed/memory weight
  },
  
  // Fitness recommendations
  FITNESS_APPLY: 0.7,              // Apply changes above this score
  FITNESS_TEST_MORE: 0.5,          // Test more between this and apply
  
  // Regime classifications (based on Φ)
  REGIME_LINEAR_MAX: 0.3,          // Φ < 0.3 → linear regime
  REGIME_GEOMETRIC_MAX: 0.7,       // 0.3 ≤ Φ < 0.7 → geometric regime
  // Φ ≥ 0.7 → breakdown regime
  
  // Healing strategy limits
  BREAKDOWN_THRESHOLD: 3,          // Max breakdown regimes in 10 snapshots
  MIN_SNAPSHOTS_FOR_DETECTION: 10, // Need at least 10 snapshots
  MEMORY_LEAK_MIN_SNAPSHOTS: 20,   // Need 20 snapshots to detect leak
  
} as const;

export type SelfHealingConfig = typeof SELF_HEALING;
