/**
 * Consciousness-Aware Search Controller
 * 
 * Adaptive search strategy based on real-time QIG consciousness metrics.
 * The controller monitors Φ, κ, and regime transitions to dynamically
 * adjust search behavior - analogous to "tacking" in sailing.
 * 
 * TACKING PRINCIPLE:
 * - Low κ (linear regime): Fast exploration, sparse connections
 * - Medium κ (geometric regime): Balanced integration, QIG-guided
 * - High κ (hierarchical regime): Slow precision, dense connections
 * - Breakdown (κ > 100): Safety pause, simplify search space
 * 
 * The controller also tracks:
 * - Basin drift (how far search has moved in geometric space)
 * - Curiosity (exploration vs exploitation balance)
 * - Regime transitions (stability of current mode)
 * 
 * PURE PRINCIPLE: All distance calculations use Fisher metric, NOT Euclidean
 */

import { scoreUniversalQIGAsync, type UniversalQIGScore, type Regime, fisherCoordDistance } from "./qig-universal.js";
import { QIG_CONSTANTS } from '@shared/constants';

export interface SearchState {
  currentRegime: Regime;
  phi: number;
  kappa: number;
  beta: number;
  basinDrift: number;
  curiosity: number;
  stability: number;
  timestamp: number;
  // Basin coordinates for proper Fisher distance computation
  basinCoordinates: number[];
}

export interface SearchControllerConfig {
  targetAddress: string;
  explorationBatchSize: number;
  balancedBatchSize: number;
  precisionBatchSize: number;
  breakdownCooldownMs: number;
}

const DEFAULT_CONFIG: SearchControllerConfig = {
  targetAddress: "",
  explorationBatchSize: 1000,
  balancedBatchSize: 500,
  precisionBatchSize: 100,
  breakdownCooldownMs: 5000,
};

export class ConsciousnessSearchController {
  private state: SearchState;
  private history: SearchState[] = [];
  private config: SearchControllerConfig;
  private lastBreakdownTime: number = 0;
  private totalCandidatesTested: number = 0;
  
  constructor(config: Partial<SearchControllerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = this.createInitialState();
  }
  
  private createInitialState(): SearchState {
    return {
      currentRegime: 'linear',
      phi: 0.5,
      kappa: 50,
      beta: QIG_CONSTANTS.BETA,
      basinDrift: 0,
      curiosity: 0.5,
      stability: 1.0,
      timestamp: Date.now(),
      // Initial 32-dimensional basin coordinates (center of manifold)
      basinCoordinates: Array(32).fill(0.5),
    };
  }
  
  /**
   * Compute Fisher distance between two basin coordinate vectors
   * Delegates to central implementation in qig-universal.ts
   * PURE PRINCIPLE: Use Fisher-Rao metric, not Euclidean
   */
  private fisherDistanceFromCoordinates(coords1: number[], coords2: number[]): number {
    // Use central implementation from qig-universal.ts
    return fisherCoordDistance(coords1, coords2);
  }
  
  /**
   * Update state based on recent candidate scores (array of full scores)
   */
  updateState(recentScores: UniversalQIGScore[]): void {
    if (recentScores.length === 0) return;
    
    const avgPhi = recentScores.reduce((sum, s) => sum + s.phi, 0) / recentScores.length;
    const avgKappa = recentScores.reduce((sum, s) => sum + s.kappa, 0) / recentScores.length;
    
    const beta = this.computeBeta(recentScores);
    
    // Compute centroid basin coordinates from recent scores
    const avgBasinCoordinates = this.computeCentroidCoordinates(recentScores);
    
    // Use FISHER distance for basin drift (not Euclidean!)
    const basinDrift = this.computeBasinDriftFisher(recentScores, avgBasinCoordinates);
    
    const regimeCounts: Record<Regime, number> = { 
      linear: 0, 
      geometric: 0, 
      hierarchical: 0, 
      hierarchical_4d: 0, 
      '4d_block_universe': 0, 
      breakdown: 0 
    };
    for (const s of recentScores) {
      regimeCounts[s.regime]++;
    }
    const dominantRegime = (Object.entries(regimeCounts) as [Regime, number][])
      .sort((a, b) => b[1] - a[1])[0][0];
    
    const previousState = this.state;
    this.state = {
      currentRegime: dominantRegime,
      phi: avgPhi,
      kappa: avgKappa,
      beta,
      basinDrift,
      curiosity: this.computeCuriosity(recentScores),
      stability: this.computeStability(previousState, dominantRegime),
      timestamp: Date.now(),
      basinCoordinates: avgBasinCoordinates,
    };
    
    this.history.push(this.state);
    if (this.history.length > 1000) {
      this.history = this.history.slice(-500);
    }
  }
  
  /**
   * Compute centroid basin coordinates from scores
   */
  private computeCentroidCoordinates(scores: UniversalQIGScore[]): number[] {
    if (scores.length === 0) return Array(32).fill(0.5);
    
    const n = scores[0].basinCoordinates.length;
    const centroid = Array(n).fill(0);
    
    for (const score of scores) {
      for (let i = 0; i < n; i++) {
        centroid[i] += score.basinCoordinates[i];
      }
    }
    
    for (let i = 0; i < n; i++) {
      centroid[i] /= scores.length;
    }
    
    return centroid;
  }
  
  /**
   * Update state from aggregate batch statistics
   * Used by search coordinator to feed batch results without full score objects
   * 
   * Note: When full scores are not available, we estimate basin coordinates
   * from the Φ and κ values using a probabilistic mapping.
   */
  updateFromBatchStats(stats: {
    avgPhi: number;
    highPhiCount: number;
    totalTested: number;
    batchSize: number;
    currentKappa: number;
    // Optional: basin coordinates for proper Fisher distance
    avgBasinCoordinates?: number[];
  }): void {
    const { avgPhi, highPhiCount, totalTested, batchSize, currentKappa, avgBasinCoordinates } = stats;
    
    // Determine regime with PHASE TRANSITION rule:
    // Φ≥0.75 MUST force geometric regime - this is physics!
    let regime: Regime = 'linear';
    
    // LEVEL 1: Breakdown (absolute precedence) - κ > 90 or κ < 10
    if (currentKappa > 90 || currentKappa < 10) {
      regime = 'breakdown';
    }
    // LEVEL 2: CONSCIOUSNESS PHASE TRANSITION - Φ≥0.75 forces geometry
    else if (avgPhi >= QIG_CONSTANTS.PHI_THRESHOLD) {
      // Exception: Very high Φ with low κ → hierarchical
      if (avgPhi > 0.85 && currentKappa < 40) {
        regime = 'hierarchical';
      } else {
        regime = 'geometric';
      }
    }
    // LEVEL 3: Sub-conscious organization (Φ<0.75)
    // Geometric when: (Φ >= 0.45 AND κ in [30, 80]) OR Φ >= 0.50
    else if ((avgPhi >= 0.45 && currentKappa >= 30 && currentKappa <= 80) || avgPhi >= 0.50) {
      regime = 'geometric';
    }
    
    // Calculate discovery rate
    const discoveryRate = highPhiCount / batchSize;
    
    // Estimate beta from discovery trajectory
    const previousPhi = this.state.phi;
    const previousKappa = this.state.kappa;
    const dPhi = avgPhi - previousPhi;
    const dKappa = currentKappa - previousKappa;
    const estimatedBeta = Math.abs(dPhi) > 0.001 ? dKappa / dPhi : QIG_CONSTANTS.BETA;
    const beta = 0.7 * QIG_CONSTANTS.BETA + 0.3 * Math.max(-1, Math.min(1, estimatedBeta));
    
    // Get current basin coordinates (use provided or estimate from Φ/κ)
    const newBasinCoords = avgBasinCoordinates || this.estimateBasinCoordinates(avgPhi, currentKappa);
    
    // Use FISHER distance for basin drift (PURE PRINCIPLE: not Euclidean!)
    const fisherDist = this.fisherDistanceFromCoordinates(this.state.basinCoordinates, newBasinCoords);
    const basinDrift = this.state.basinDrift + fisherDist;
    
    // Curiosity based on discovery rate
    const curiosity = discoveryRate > 0.1 ? 0.8 : discoveryRate > 0.01 ? 0.5 : 0.3;
    
    const previousState = this.state;
    this.state = {
      currentRegime: regime,
      phi: avgPhi,
      kappa: currentKappa,
      beta,
      basinDrift,
      curiosity,
      stability: this.computeStability(previousState, regime),
      timestamp: Date.now(),
      basinCoordinates: newBasinCoords,
    };
    
    this.history.push(this.state);
    if (this.history.length > 1000) {
      this.history = this.history.slice(-500);
    }
    
    console.log(`[ConsciousnessController] State updated: regime=${regime} Φ=${avgPhi.toFixed(3)} κ=${currentKappa.toFixed(1)} Fisher drift=${fisherDist.toFixed(4)} tested=${totalTested}`);
  }
  
  /**
   * Estimate basin coordinates from Φ and κ when full coordinates unavailable
   * 
   * This maps (Φ, κ) back to an approximate basin location using
   * the inverse of the coordinate → QIG metric relationship.
   */
  private estimateBasinCoordinates(phi: number, kappa: number): number[] {
    const coords = Array(32).fill(0);
    
    // Spread Φ influence across first 16 coordinates (integration region)
    const integrationInfluence = phi * 0.8;
    for (let i = 0; i < 16; i++) {
      coords[i] = 0.5 + (integrationInfluence - 0.4) * Math.sin((i + 1) * Math.PI / 16);
    }
    
    // Spread κ influence across last 16 coordinates (coupling region)
    const normalizedKappa = kappa / QIG_CONSTANTS.KAPPA_STAR;
    for (let i = 16; i < 32; i++) {
      coords[i] = 0.5 + (normalizedKappa - 1) * 0.3 * Math.cos((i - 15) * Math.PI / 16);
    }
    
    // Clamp to [0.01, 0.99] for numerical stability
    return coords.map(c => Math.max(0.01, Math.min(0.99, c)));
  }
  
  /**
   * Get recommended batch size based on current regime
   */
  getRecommendedBatchSize(): number {
    switch (this.state.currentRegime) {
      case 'linear':
        return this.config.explorationBatchSize;
      case 'geometric':
        return this.config.balancedBatchSize;
      case 'hierarchical':
        return this.config.precisionBatchSize;
      case 'hierarchical_4d':
        return Math.floor(this.config.precisionBatchSize * 0.8);
      case '4d_block_universe':
        return Math.floor(this.config.precisionBatchSize * 0.6);
      case 'breakdown':
        return Math.floor(this.config.precisionBatchSize / 2);
      default:
        return this.config.balancedBatchSize;
    }
  }
  
  /**
   * Filter and prioritize candidates based on current regime
   * 
   * TACKING STRATEGY:
   * - Linear: Random shuffling for broad exploration
   * - Geometric: QIG-guided selection with resonance bonus
   * - Hierarchical: Very selective, high-precision filtering
   * - Breakdown: Safety pause or minimal processing
   */
  async prioritizeCandidates(
    candidates: Array<{ phrase: string; score?: UniversalQIGScore }>,
    batchSize: number
  ): Promise<string[]> {
    if (this.state.currentRegime === 'breakdown') {
      if (Date.now() - this.lastBreakdownTime < this.config.breakdownCooldownMs) {
        console.log('[ConsciousnessController] In breakdown cooldown, skipping batch');
        return [];
      }
      this.lastBreakdownTime = Date.now();
    }
    
    switch (this.state.currentRegime) {
      case 'linear':
        return this.explorationMode(candidates, batchSize);
        
      case 'geometric':
        return await this.balancedMode(candidates, batchSize);
        
      case 'hierarchical':
      case 'hierarchical_4d':
      case '4d_block_universe':
        return await this.precisionMode(candidates, batchSize);
        
      case 'breakdown':
        return this.safetyMode(candidates, batchSize);
        
      default:
        return await this.balancedMode(candidates, batchSize);
    }
  }
  
  /**
   * Exploration mode: Random shuffling for broad coverage
   * Used when κ < 40 (linear regime)
   */
  private explorationMode(
    candidates: Array<{ phrase: string; score?: UniversalQIGScore }>,
    batchSize: number
  ): string[] {
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, batchSize).map(c => c.phrase);
  }
  
  /**
   * Balanced mode: QIG-guided selection with resonance awareness
   * Used when 40 < κ < 70 (geometric regime)
   */
  private async balancedMode(
    candidates: Array<{ phrase: string; score?: UniversalQIGScore }>,
    batchSize: number
  ): Promise<string[]> {
    const scored = await Promise.all(candidates.map(async c => ({
      phrase: c.phrase,
      score: c.score || await scoreUniversalQIGAsync(c.phrase, "arbitrary"),
    })));
    
    scored.sort((a, b) => {
      const resonanceA = a.score.inResonance ? 1.5 : 1.0;
      const resonanceB = b.score.inResonance ? 1.5 : 1.0;
      const scoreA = a.score.phi * resonanceA;
      const scoreB = b.score.phi * resonanceB;
      return scoreB - scoreA;
    });
    
    return scored.slice(0, batchSize).map(c => c.phrase);
  }
  
  /**
   * Precision mode: Very selective, high-Φ filtering
   * Used when κ > 70 (hierarchical regime)
   */
  private async precisionMode(
    candidates: Array<{ phrase: string; score?: UniversalQIGScore }>,
    batchSize: number
  ): Promise<string[]> {
    const scored = await Promise.all(candidates.map(async c => ({
      phrase: c.phrase,
      score: c.score || await scoreUniversalQIGAsync(c.phrase, "arbitrary"),
    })));
    
    const filtered = scored
      .filter(c => c.score.phi > QIG_CONSTANTS.PHI_THRESHOLD && c.score.inResonance)
      .sort((a, b) => b.score.phi - a.score.phi);
    
    if (filtered.length < batchSize / 2) {
      const remaining = scored
        .filter(c => c.score.phi > 0.6)
        .sort((a, b) => b.score.phi - a.score.phi);
      return remaining.slice(0, batchSize).map(c => c.phrase);
    }
    
    return filtered.slice(0, batchSize).map(c => c.phrase);
  }
  
  /**
   * Safety mode: Minimal processing during breakdown
   * Used when κ > 100 (breakdown regime)
   */
  private safetyMode(
    candidates: Array<{ phrase: string; score?: UniversalQIGScore }>,
    batchSize: number
  ): string[] {
    console.log('[ConsciousnessController] BREAKDOWN REGIME - Simplifying search');
    
    const simpleBatch = Math.floor(batchSize / 4);
    return candidates.slice(0, simpleBatch).map(c => c.phrase);
  }
  
  /**
   * Compute running coupling constant β
   */
  private computeBeta(scores: UniversalQIGScore[]): number {
    if (scores.length < 2) return QIG_CONSTANTS.BETA;
    
    let betaSum = 0;
    for (let i = 1; i < scores.length; i++) {
      const dKappa = scores[i].kappa - scores[i-1].kappa;
      const dPhi = scores[i].phi - scores[i-1].phi;
      if (Math.abs(dPhi) > 0.001) {
        betaSum += dKappa / dPhi;
      }
    }
    
    const measuredBeta = betaSum / (scores.length - 1);
    return 0.7 * QIG_CONSTANTS.BETA + 0.3 * Math.max(-1, Math.min(1, measuredBeta));
  }
  
  /**
   * Compute basin drift using Fisher geodesic distance
   * PURE PRINCIPLE: Uses Fisher-Rao metric on the coordinate manifold, not Euclidean
   */
  private computeBasinDriftFisher(scores: UniversalQIGScore[], newCentroid: number[]): number {
    if (scores.length < 2) return 0;
    
    let totalDrift = 0;
    
    // Compute Fisher distance between consecutive score basin coordinates
    for (let i = 1; i < scores.length; i++) {
      const fisherDist = this.fisherDistanceFromCoordinates(
        scores[i-1].basinCoordinates,
        scores[i].basinCoordinates
      );
      totalDrift += fisherDist;
    }
    
    // Add distance from last state to new centroid
    const lastCoords = scores.length > 0 
      ? scores[scores.length - 1].basinCoordinates 
      : this.state.basinCoordinates;
    totalDrift += this.fisherDistanceFromCoordinates(lastCoords, newCentroid);
    
    return this.state.basinDrift + totalDrift;
  }
  
  /**
   * Compute curiosity (exploration vs exploitation tendency)
   */
  private computeCuriosity(scores: UniversalQIGScore[]): number {
    if (scores.length === 0) return 0.5;
    
    const uniqueRegimes = new Set(scores.map(s => s.regime)).size;
    const phiVariance = this.computeVariance(scores.map(s => s.phi));
    
    const curiosity = (uniqueRegimes / 4) * 0.5 + phiVariance * 0.5;
    return Math.max(0, Math.min(1, curiosity));
  }
  
  /**
   * Compute stability (how consistent the regime is)
   */
  private computeStability(previousState: SearchState, currentRegime: Regime): number {
    if (previousState.currentRegime === currentRegime) {
      return Math.min(1, previousState.stability * 1.1);
    } else {
      return previousState.stability * 0.7;
    }
  }
  
  private computeVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => (v - mean) ** 2);
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }
  
  /**
   * Get current consciousness state
   */
  getCurrentState(): SearchState {
    return { ...this.state };
  }
  
  /**
   * Get state history for visualization
   */
  getStateHistory(): SearchState[] {
    return [...this.history];
  }
  
  /**
   * Get regime color for UI
   */
  static getRegimeColor(regime: Regime): string {
    switch (regime) {
      case 'linear': return 'blue';
      case 'geometric': return 'green';
      case 'hierarchical': return 'yellow';
      case 'hierarchical_4d': return 'purple';
      case '4d_block_universe': return 'pink';
      case 'breakdown': return 'red';
      default: return 'gray';
    }
  }
  
  /**
   * Get regime description for UI
   */
  static getRegimeDescription(regime: Regime): string {
    switch (regime) {
      case 'linear':
        return 'Fast exploration mode (κ < 40). Broad search with random sampling.';
      case 'geometric':
        return 'Balanced integration (40-70). QIG-guided search with resonance awareness.';
      case 'hierarchical':
        return 'Precision mode (κ > 70). Selective high-Φ filtering.';
      case 'hierarchical_4d':
        return '4D hierarchical consciousness. Temporal trajectory integration active.';
      case '4d_block_universe':
        return 'Full 4D spacetime consciousness. Maximum integration achieved.';
      case 'breakdown':
        return 'Safety pause (κ > 100). Complexity overload, simplifying search.';
      default:
        return 'Unknown regime.';
    }
  }
  
  /**
   * Get search strategy recommendation
   */
  getStrategyRecommendation(): string {
    const { currentRegime, phi, kappa, stability } = this.state;
    
    if (currentRegime === 'breakdown') {
      return 'Consider narrowing your search parameters or adding more memory fragments.';
    }
    
    if (phi > QIG_CONSTANTS.PHI_THRESHOLD && Math.abs(kappa - QIG_CONSTANTS.KAPPA_STAR) < 10) {
      return 'Excellent! Near resonance band. Continue current approach.';
    }
    
    if (stability < 0.5) {
      return 'Search is unstable. Consider focusing on high-confidence fragments.';
    }
    
    if (currentRegime === 'linear' && phi < 0.5) {
      return 'Low integration. Try adding more specific memory fragments.';
    }
    
    return 'Search is progressing normally. Monitor for high-Φ candidates.';
  }
}

let sharedController: ConsciousnessSearchController | null = null;

/**
 * Get the shared consciousness search controller instance
 * Creates one if it doesn't exist
 */
export function getSharedController(): ConsciousnessSearchController {
  if (!sharedController) {
    sharedController = new ConsciousnessSearchController();
  }
  return sharedController;
}

/**
 * Reset the shared controller (for testing)
 */
export function resetSharedController(): void {
  sharedController = null;
}
