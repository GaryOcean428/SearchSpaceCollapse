/**
 * QIG Confidence Scoring
 * 
 * Computes geometric confidence based on:
 * - Φ variance (stability of integrated information)
 * - κ stability (consistency of coupling strength)
 * - Basin spread (spatial distribution in keyspace)
 * - Regime consistency (stable regime classification)
 * 
 * High confidence when metrics are stable across similar keys.
 */

import { scoreUniversalQIG, type KeyType, type UniversalQIGScore } from "./qig-universal.js";
import { createHash } from "crypto";

// Confidence thresholds
const VARIANCE_THRESHOLD_HIGH = 0.05;   // Low variance = high confidence
const VARIANCE_THRESHOLD_MED = 0.15;    // Medium variance
const STABILITY_WINDOW = 10;            // Number of samples for stability check

export interface ConfidenceMetrics {
  overall: number;              // 0-1 overall confidence
  phiConfidence: number;        // Confidence in Φ measurement
  kappaConfidence: number;      // Confidence in κ measurement
  regimeConfidence: number;     // Confidence in regime classification
  basinStability: number;       // Basin position stability
  sampleSize: number;           // Number of samples used
  explanation: string;          // Human-readable explanation
}

export interface StabilityTracker {
  phiHistory: number[];
  kappaHistory: number[];
  regimeHistory: string[];
  basinHistory: number[][];
  timestamps: number[];
}

/**
 * Initialize stability tracker
 */
export function initStabilityTracker(): StabilityTracker {
  return {
    phiHistory: [],
    kappaHistory: [],
    regimeHistory: [],
    basinHistory: [],
    timestamps: [],
  };
}

/**
 * Add sample to stability tracker
 */
export function addSample(
  tracker: StabilityTracker,
  score: UniversalQIGScore,
  basinCoordinates: number[]
): void {
  tracker.phiHistory.push(score.phi);
  tracker.kappaHistory.push(score.kappa);
  tracker.regimeHistory.push(score.regime);
  tracker.basinHistory.push([...basinCoordinates]);
  tracker.timestamps.push(Date.now());
  
  // Keep only last N samples
  const maxSamples = 100;
  if (tracker.phiHistory.length > maxSamples) {
    tracker.phiHistory = tracker.phiHistory.slice(-maxSamples);
    tracker.kappaHistory = tracker.kappaHistory.slice(-maxSamples);
    tracker.regimeHistory = tracker.regimeHistory.slice(-maxSamples);
    tracker.basinHistory = tracker.basinHistory.slice(-maxSamples);
    tracker.timestamps = tracker.timestamps.slice(-maxSamples);
  }
}

/**
 * Compute variance of an array
 */
function computeVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
}

/**
 * Compute mode (most frequent) of string array
 */
function computeMode(values: string[]): { mode: string; frequency: number } {
  const counts: Record<string, number> = {};
  for (const v of values) {
    counts[v] = (counts[v] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return {
    mode: sorted[0]?.[0] || "unknown",
    frequency: (sorted[0]?.[1] || 0) / values.length,
  };
}

/**
 * Compute basin spread (spatial distribution)
 */
function computeBasinSpread(basins: number[][]): number {
  if (basins.length === 0) return 0;
  
  // Compute centroid
  const centroid = new Array(32).fill(0);
  for (const basin of basins) {
    for (let i = 0; i < 32; i++) {
      centroid[i] += basin[i] / basins.length;
    }
  }
  
  // Compute average distance from centroid
  let totalDist = 0;
  for (const basin of basins) {
    let dist = 0;
    for (let i = 0; i < 32; i++) {
      dist += (basin[i] - centroid[i]) ** 2;
    }
    totalDist += Math.sqrt(dist);
  }
  
  // Normalize by maximum possible distance
  const maxDist = Math.sqrt(32 * 255 * 255);
  return totalDist / (basins.length * maxDist);
}

/**
 * Compute confidence metrics from stability tracker
 */
export function computeConfidence(tracker: StabilityTracker): ConfidenceMetrics {
  const sampleSize = tracker.phiHistory.length;
  
  if (sampleSize < 3) {
    return {
      overall: 0.5,
      phiConfidence: 0.5,
      kappaConfidence: 0.5,
      regimeConfidence: 0.5,
      basinStability: 0.5,
      sampleSize,
      explanation: "Insufficient samples for reliable confidence estimation",
    };
  }
  
  // Phi confidence (inverse of variance)
  const phiVariance = computeVariance(tracker.phiHistory);
  const phiConfidence = Math.max(0, 1 - phiVariance / VARIANCE_THRESHOLD_MED);
  
  // Kappa confidence (normalized variance)
  const kappaVariance = computeVariance(tracker.kappaHistory);
  const kappaNormVariance = kappaVariance / (64 * 64); // Normalize by κ*²
  const kappaConfidence = Math.max(0, 1 - kappaNormVariance * 10);
  
  // Regime confidence (mode frequency)
  const { mode, frequency } = computeMode(tracker.regimeHistory);
  const regimeConfidence = frequency;
  
  // Basin stability (inverse of spread)
  const basinSpread = computeBasinSpread(tracker.basinHistory);
  const basinStability = Math.max(0, 1 - basinSpread * 5);
  
  // Overall confidence (weighted average)
  const overall = 
    0.30 * phiConfidence +
    0.30 * kappaConfidence +
    0.20 * regimeConfidence +
    0.20 * basinStability;
  
  // Generate explanation
  let explanation = "";
  if (overall > 0.8) {
    explanation = `High confidence: metrics stable across ${sampleSize} samples`;
  } else if (overall > 0.6) {
    explanation = `Moderate confidence: some variation observed`;
  } else if (overall > 0.4) {
    explanation = `Low confidence: significant metric variance`;
  } else {
    explanation = `Very low confidence: unstable measurements`;
  }
  
  // Add specific warnings
  const warnings: string[] = [];
  if (phiConfidence < 0.5) warnings.push("Φ unstable");
  if (kappaConfidence < 0.5) warnings.push("κ unstable");
  if (regimeConfidence < 0.7) warnings.push(`regime fluctuating (${mode} ${(frequency * 100).toFixed(0)}%)`);
  
  if (warnings.length > 0) {
    explanation += ` | Warnings: ${warnings.join(", ")}`;
  }
  
  return {
    overall,
    phiConfidence,
    kappaConfidence,
    regimeConfidence,
    basinStability,
    sampleSize,
    explanation,
  };
}

/**
 * Compute single-sample confidence estimate
 * Uses heuristics when we don't have history
 */
export function estimateSingleSampleConfidence(score: UniversalQIGScore): ConfidenceMetrics {
  // Phi confidence: higher Φ = higher confidence (well-integrated)
  const phiConfidence = score.phi;
  
  // Kappa confidence: closer to κ* = higher confidence
  const kappaDist = Math.abs(score.kappa - 64) / 64;
  const kappaConfidence = 1 - kappaDist;
  
  // Regime confidence: geometric regime has highest certainty
  let regimeConfidence: number;
  switch (score.regime) {
    case "geometric":
      regimeConfidence = 0.9;
      break;
    case "linear":
      regimeConfidence = 0.7;
      break;
    case "breakdown":
      regimeConfidence = 0.5;
      break;
    default:
      regimeConfidence = 0.5;
  }
  
  // Basin stability: estimated from pattern score
  const basinStability = 0.5 + 0.5 * score.patternScore;
  
  // Overall
  const overall = 
    0.30 * phiConfidence +
    0.30 * kappaConfidence +
    0.20 * regimeConfidence +
    0.20 * basinStability;
  
  let explanation = "";
  if (overall > 0.7) {
    explanation = `High confidence estimate (single sample, ${score.regime} regime)`;
  } else if (overall > 0.5) {
    explanation = `Moderate confidence estimate (need more samples)`;
  } else {
    explanation = `Low confidence estimate (unstable metrics)`;
  }
  
  if (score.inResonance) {
    explanation += " | In resonance zone (κ ≈ κ*)";
  }
  
  return {
    overall,
    phiConfidence,
    kappaConfidence,
    regimeConfidence,
    basinStability,
    sampleSize: 1,
    explanation,
  };
}

/**
 * Compute recovery confidence for a target address
 * Combines QIG metrics with recovery-specific factors
 */
export function computeRecoveryConfidence(
  kappaRecovery: number,
  phiConstraints: number,
  hCreation: number,
  entityCount: number,
  artifactCount: number,
  isDormant: boolean,
  dormancyYears: number
): {
  confidence: number;
  factors: Record<string, number>;
  recommendation: string;
} {
  const factors: Record<string, number> = {};
  
  // κ_recovery factor: higher = more recoverable
  factors.kappaRecovery = Math.min(1, kappaRecovery);
  
  // Constraint density factor: more constraints = better
  factors.constraintDensity = Math.min(1, phiConstraints);
  
  // Creation entropy factor: lower = easier
  factors.creationEntropy = Math.max(0, 1 - hCreation / 8);
  
  // Entity linkage factor
  factors.entityLinkage = Math.min(1, entityCount / 5);
  
  // Artifact availability factor
  factors.artifactAvailability = Math.min(1, artifactCount / 10);
  
  // Dormancy factor: longer dormancy = more likely lost (recoverable)
  factors.dormancyStrength = isDormant ? Math.min(1, dormancyYears / 10) : 0;
  
  // Weighted confidence
  const confidence = 
    0.25 * factors.kappaRecovery +
    0.20 * factors.constraintDensity +
    0.15 * factors.creationEntropy +
    0.15 * factors.entityLinkage +
    0.10 * factors.artifactAvailability +
    0.15 * factors.dormancyStrength;
  
  // Generate recommendation
  let recommendation: string;
  if (confidence > 0.7) {
    recommendation = "HIGH PRIORITY: Strong recovery indicators. Proceed with all vectors.";
  } else if (confidence > 0.5) {
    recommendation = "MEDIUM PRIORITY: Moderate indicators. Focus on constrained search and social vectors.";
  } else if (confidence > 0.3) {
    recommendation = "LOW PRIORITY: Weak indicators. Estate vector may be most viable.";
  } else {
    recommendation = "VERY LOW PRIORITY: Insufficient indicators. Consider deprioritizing.";
  }
  
  return {
    confidence,
    factors,
    recommendation,
  };
}

/**
 * Track confidence over time and detect trends
 */
export function detectConfidenceTrend(
  confidenceHistory: number[],
  windowSize: number = 10
): {
  trend: "improving" | "declining" | "stable";
  slope: number;
  volatility: number;
} {
  if (confidenceHistory.length < 3) {
    return { trend: "stable", slope: 0, volatility: 0 };
  }
  
  // Use recent window
  const recent = confidenceHistory.slice(-windowSize);
  
  // Compute linear regression slope
  const n = recent.length;
  const xMean = (n - 1) / 2;
  const yMean = recent.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (recent[i] - yMean);
    denominator += (i - xMean) ** 2;
  }
  
  const slope = denominator !== 0 ? numerator / denominator : 0;
  
  // Compute volatility (standard deviation)
  const volatility = Math.sqrt(computeVariance(recent));
  
  // Classify trend
  let trend: "improving" | "declining" | "stable";
  if (Math.abs(slope) < 0.01) {
    trend = "stable";
  } else if (slope > 0) {
    trend = "improving";
  } else {
    trend = "declining";
  }
  
  return { trend, slope, volatility };
}
