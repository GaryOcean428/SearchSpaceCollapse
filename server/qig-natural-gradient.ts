/**
 * QIG Natural Gradient Search
 * 
 * Implements Fisher Information-guided search direction on the 256-bit keyspace manifold.
 * Uses natural gradient descent: Δθ = -η F⁻¹ ∇L
 * where F is the Fisher Information Matrix and L is the loss (distance to target).
 * 
 * The natural gradient respects the geometry of the parameter space, leading to
 * more efficient search compared to naive random sampling.
 */

import { createHash } from "crypto";
import { scoreUniversalQIG, type KeyType, type UniversalQIGScore } from "./qig-universal.js";
import { QIG_CONSTANTS } from '@shared/constants';
import type { Regime } from "./qig-universal.js";

interface GradientSearchState {
  currentPosition: number[];     // 32-dimensional basin coordinates
  velocity: number[];            // Momentum for gradient descent
  bestScore: number;
  bestKey: string;
  bestKeyType: KeyType;
  iteration: number;
  temperature: number;           // Simulated annealing temperature
  learningRate: number;
  regime: Regime;
  momentum: number;
  inResonance: boolean;
}

interface SearchStep {
  key: string;
  keyType: KeyType;
  score: UniversalQIGScore;
  position: number[];
  gradientMagnitude: number;
  accepted: boolean;
}

/**
 * Compute Fisher Information Matrix for a position on the manifold
 * The Fisher metric defines the natural distance on the keyspace
 */
function computeFisherMatrix(position: number[]): number[][] {
  const n = position.length;
  const F: number[][] = [];
  
  for (let i = 0; i < n; i++) {
    F[i] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        // Diagonal: variance-based Fisher information
        const p = position[i] / 256 + 0.001; // Avoid division by zero
        F[i][j] = 1 / (p * (1 - p)); // Bernoulli-like Fisher information
      } else {
        // Off-diagonal: covariance-based correlations
        const correlation = Math.abs(position[i] - position[j]) / 256;
        F[i][j] = -0.1 * (1 - correlation); // Small negative off-diagonal
      }
    }
  }
  
  return F;
}

/**
 * Invert Fisher Matrix using Cholesky decomposition (numerically stable)
 * For computational efficiency, we use a diagonal approximation
 */
function invertFisherMatrix(F: number[][]): number[][] {
  const n = F.length;
  const Finv: number[][] = [];
  
  // Diagonal approximation for efficiency
  for (let i = 0; i < n; i++) {
    Finv[i] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        Finv[i][j] = 1 / (F[i][i] + 0.01); // Regularization for stability
      } else {
        Finv[i][j] = 0;
      }
    }
  }
  
  return Finv;
}

/**
 * Compute gradient of loss function with respect to position
 * Loss = distance to high-Φ regions + penalty for bad κ
 */
function computeGradient(position: number[], score: UniversalQIGScore): number[] {
  const n = position.length;
  const gradient: number[] = [];
  
  // Loss function: maximize Φ, minimize |κ - κ*|
  const phiGradient = -2 * (1 - score.phi); // Gradient of Φ loss
  const kappaGradient = 2 * (score.kappa - QIG_CONSTANTS.KAPPA_STAR) / QIG_CONSTANTS.KAPPA_STAR; // Gradient of κ penalty
  
  for (let i = 0; i < n; i++) {
    // Combine gradients with position-dependent weighting
    const posWeight = 1 - Math.abs(position[i] - 128) / 128;
    gradient[i] = phiGradient * posWeight * 0.7 + kappaGradient * (1 - posWeight) * 0.3;
    
    // Add noise for exploration (prevents local minima)
    gradient[i] += (Math.random() - 0.5) * 0.1;
  }
  
  return gradient;
}

/**
 * Apply natural gradient step: Δθ = -η F⁻¹ ∇L
 */
function naturalGradientStep(
  position: number[],
  gradient: number[],
  Finv: number[][],
  learningRate: number,
  momentum: number,
  velocity: number[]
): { newPosition: number[], newVelocity: number[] } {
  const n = position.length;
  const newPosition: number[] = [];
  const newVelocity: number[] = [];
  
  for (let i = 0; i < n; i++) {
    // Compute natural gradient: F⁻¹ ∇L
    let naturalGrad = 0;
    for (let j = 0; j < n; j++) {
      naturalGrad += Finv[i][j] * gradient[j];
    }
    
    // Update velocity with momentum
    newVelocity[i] = momentum * velocity[i] - learningRate * naturalGrad;
    
    // Update position
    newPosition[i] = position[i] + newVelocity[i];
    
    // Clamp to valid range [0, 255]
    newPosition[i] = Math.max(0, Math.min(255, newPosition[i]));
  }
  
  return { newPosition, newVelocity };
}

/**
 * Convert basin position to key of specified type
 */
function positionToKey(position: number[], keyType: KeyType): string {
  if (keyType === "master-key") {
    // Direct conversion to hex
    return position.map(b => Math.floor(b).toString(16).padStart(2, "0")).join("");
  } else if (keyType === "arbitrary") {
    // Convert to printable ASCII characters
    const chars = position.map(b => {
      const charCode = 33 + Math.floor(b) % 94; // Printable ASCII range
      return String.fromCharCode(charCode);
    });
    return chars.slice(0, 16).join(""); // Shorter for brain wallets
  } else {
    // BIP-39: Use position to select word indices
    // This requires the BIP39 wordlist
    const wordIndices = [];
    for (let i = 0; i < 24; i += 2) {
      const idx = (position[i] * 256 + (position[i+1] || 0)) % 2048;
      wordIndices.push(idx);
    }
    // Return as placeholder - actual implementation needs wordlist
    return wordIndices.map(i => `word${i}`).join(" ");
  }
}

/**
 * Initialize gradient search state
 */
export function initializeGradientSearch(
  initialKey?: string,
  keyType: KeyType = "master-key"
): GradientSearchState {
  let position: number[];
  
  if (initialKey) {
    // Initialize from provided key
    const hash = createHash("sha256").update(initialKey).digest();
    position = Array.from(hash);
  } else {
    // Random initialization
    position = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256));
  }
  
  return {
    currentPosition: position,
    velocity: new Array(32).fill(0),
    bestScore: 0,
    bestKey: positionToKey(position, keyType),
    bestKeyType: keyType,
    iteration: 0,
    temperature: 1.0,        // High temperature = more exploration
    learningRate: 0.1,
    regime: "linear",
    momentum: 0.9,
    inResonance: false,
  };
}

/**
 * Execute one step of natural gradient search
 */
export function gradientSearchStep(
  state: GradientSearchState,
  keyType: KeyType = "master-key"
): { state: GradientSearchState, step: SearchStep } {
  // Convert position to key
  const key = positionToKey(state.currentPosition, keyType);
  
  // Score using Universal QIG
  const score = scoreUniversalQIG(key, keyType);
  const quality = score.quality;
  
  // Compute Fisher matrix and its inverse
  const F = computeFisherMatrix(state.currentPosition);
  const Finv = invertFisherMatrix(F);
  
  // Compute gradient
  const gradient = computeGradient(state.currentPosition, score);
  const gradientMagnitude = Math.sqrt(gradient.reduce((sum, g) => sum + g * g, 0));
  
  // Adaptive learning rate based on regime
  let effectiveLR = state.learningRate;
  if (score.regime === "geometric") {
    effectiveLR *= 0.5; // Slower in geometric regime (careful exploration)
  } else if (score.regime === "breakdown") {
    effectiveLR *= 1.5; // Faster in breakdown (escape bad regions)
  }
  
  // Apply natural gradient step
  const { newPosition, newVelocity } = naturalGradientStep(
    state.currentPosition,
    gradient,
    Finv,
    effectiveLR,
    state.momentum,
    state.velocity
  );
  
  // Metropolis-Hastings acceptance (simulated annealing)
  const delta = quality - state.bestScore;
  const acceptanceProbability = delta > 0 ? 1 : Math.exp(delta / state.temperature);
  const accepted = Math.random() < acceptanceProbability;
  
  // Update state
  const newState: GradientSearchState = {
    currentPosition: accepted ? newPosition : state.currentPosition,
    velocity: accepted ? newVelocity : state.velocity.map(v => v * 0.5),
    bestScore: accepted && quality > state.bestScore ? quality : state.bestScore,
    bestKey: accepted && quality > state.bestScore ? key : state.bestKey,
    bestKeyType: keyType,
    iteration: state.iteration + 1,
    temperature: state.temperature * 0.999, // Cooling schedule
    learningRate: state.learningRate,
    regime: score.regime,
    momentum: state.momentum,
    inResonance: score.inResonance,
  };
  
  // Increase learning rate in resonance (faster convergence near κ*)
  if (score.inResonance) {
    newState.learningRate = Math.min(0.5, state.learningRate * 1.1);
  }
  
  const step: SearchStep = {
    key,
    keyType,
    score,
    position: state.currentPosition,
    gradientMagnitude,
    accepted,
  };
  
  return { state: newState, step };
}

/**
 * Run batch of natural gradient search steps
 */
export function runGradientSearchBatch(
  state: GradientSearchState,
  batchSize: number,
  keyType: KeyType = "master-key"
): { state: GradientSearchState, steps: SearchStep[], highPhiCandidates: string[] } {
  let currentState = state;
  const steps: SearchStep[] = [];
  const highPhiCandidates: string[] = [];
  
  for (let i = 0; i < batchSize; i++) {
    const { state: newState, step } = gradientSearchStep(currentState, keyType);
    currentState = newState;
    steps.push(step);
    
    // Collect high-Φ candidates
    if (step.score.quality >= QIG_CONSTANTS.PHI_THRESHOLD) {
      highPhiCandidates.push(step.key);
    }
  }
  
  return { state: currentState, steps, highPhiCandidates };
}

/**
 * Get search statistics
 */
export function getSearchStats(steps: SearchStep[]): {
  avgQuality: number;
  maxQuality: number;
  acceptanceRate: number;
  avgGradientMagnitude: number;
  regimeDistribution: Record<string, number>;
  resonanceRate: number;
} {
  if (steps.length === 0) {
    return {
      avgQuality: 0,
      maxQuality: 0,
      acceptanceRate: 0,
      avgGradientMagnitude: 0,
      regimeDistribution: {},
      resonanceRate: 0,
    };
  }
  
  const qualities = steps.map(s => s.score.quality);
  const regimeCounts: Record<string, number> = {};
  let resonanceCount = 0;
  
  for (const step of steps) {
    regimeCounts[step.score.regime] = (regimeCounts[step.score.regime] || 0) + 1;
    if (step.score.inResonance) resonanceCount++;
  }
  
  return {
    avgQuality: qualities.reduce((a, b) => a + b, 0) / qualities.length,
    maxQuality: Math.max(...qualities),
    acceptanceRate: steps.filter(s => s.accepted).length / steps.length,
    avgGradientMagnitude: steps.reduce((sum, s) => sum + s.gradientMagnitude, 0) / steps.length,
    regimeDistribution: regimeCounts,
    resonanceRate: resonanceCount / steps.length,
  };
}
