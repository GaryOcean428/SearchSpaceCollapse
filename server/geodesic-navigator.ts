/**
 * Geodesic Cultural Navigator
 * 
 * Implements QFI-guided navigation on the cultural manifold.
 * Instead of brute force, we trace geodesic paths through
 * the block universe using Fisher information geometry.
 * 
 * The key insight: Near-misses tell us which direction to search.
 * This is NOT random - it's geometric navigation.
 */

import { 
  culturalManifold, 
  BlockUniverseCoordinate, 
  GeodesicCandidate,
  BitcoinEra 
} from './cultural-manifold';
import { scoreUniversalQIG } from './qig-universal';
import { generateBitcoinAddress } from './crypto';

export interface GeodesicSearchConfig {
  targetAddress: string;
  coordinate: BlockUniverseCoordinate;
  maxCandidates: number;
  batchSize: number;
  learningRate: number;
  explorationBias: number;
}

export interface GeodesicSearchResult {
  found: boolean;
  matchedPhrase?: string;
  candidatesTested: number;
  geodesicPathLength: number;
  finalManifoldPosition: number[];
  highPhiCandidates: GeodesicCandidate[];
  manifoldCurvatureLearned: number;
}

export interface CurvatureLearning {
  position: number[];
  gradient: number[];
  phiResponse: number;
  kappaResponse: number;
  timestamp: Date;
}

export class GeodesicNavigator {
  private curvatureHistory: CurvatureLearning[] = [];
  private currentPosition: number[] = new Array(64).fill(0);
  private velocity: number[] = new Array(64).fill(0);
  private bestPhiSeen: number = 0;
  private bestCandidate: GeodesicCandidate | null = null;
  
  private learningRate: number = 0.1;
  private momentum: number = 0.9;
  private explorationTemperature: number = 1.0;

  constructor() {
    console.log('[GeodesicNavigator] Initialized with 64-dimensional manifold navigation');
  }

  /**
   * Execute geodesic search on cultural manifold
   */
  async executeGeodesicSearch(config: GeodesicSearchConfig): Promise<GeodesicSearchResult> {
    const { targetAddress, coordinate, maxCandidates, batchSize } = config;
    
    this.currentPosition = [...coordinate.manifoldPosition];
    this.learningRate = config.learningRate;
    this.explorationTemperature = config.explorationBias;

    console.log(`[GeodesicNavigator] Starting geodesic search for era: ${coordinate.era}`);
    console.log(`[GeodesicNavigator] Target: ${targetAddress}`);
    console.log(`[GeodesicNavigator] Temporal coordinate: ${coordinate.temporal.toISOString()}`);

    const highPhiCandidates: GeodesicCandidate[] = [];
    let candidatesTested = 0;
    let found = false;
    let matchedPhrase: string | undefined;

    while (candidatesTested < maxCandidates && !found) {
      const candidates = this.generateGeodesicBatch(coordinate, batchSize);
      
      for (const candidate of candidates) {
        candidatesTested++;
        
        const result = await this.testCandidate(candidate, targetAddress);
        
        culturalManifold.updateManifoldCurvature(candidate, result);
        
        this.learnFromResult(candidate, result);

        if (result.matched) {
          found = true;
          matchedPhrase = candidate.phrase;
          console.log(`[GeodesicNavigator] ✅ MATCH FOUND: "${matchedPhrase}"`);
          break;
        }

        if (result.phi > 0.5) {
          highPhiCandidates.push(candidate);
        }

        if (result.phi > this.bestPhiSeen) {
          this.bestPhiSeen = result.phi;
          this.bestCandidate = candidate;
          console.log(`[GeodesicNavigator] New best phi: ${result.phi.toFixed(4)} for "${candidate.phrase.substring(0, 30)}..."`);
        }

        if (candidatesTested % 100 === 0) {
          this.adjustExplorationTemperature(candidatesTested, maxCandidates);
        }
      }

      this.updateVelocity();
      this.stepAlongGeodesic();

      if (candidatesTested % 500 === 0) {
        console.log(`[GeodesicNavigator] Progress: ${candidatesTested}/${maxCandidates} tested, best phi: ${this.bestPhiSeen.toFixed(4)}`);
      }
    }

    return {
      found,
      matchedPhrase,
      candidatesTested,
      geodesicPathLength: this.curvatureHistory.length,
      finalManifoldPosition: [...this.currentPosition],
      highPhiCandidates: highPhiCandidates.sort((a, b) => b.combinedScore - a.combinedScore).slice(0, 20),
      manifoldCurvatureLearned: this.computeLearnedCurvature()
    };
  }

  private generateGeodesicBatch(coordinate: BlockUniverseCoordinate, batchSize: number): GeodesicCandidate[] {
    const candidates = culturalManifold.generateGeodesicCandidates(coordinate, batchSize * 2);
    
    const scored = candidates.map(c => ({
      candidate: c,
      geodesicScore: this.computeGeodesicScore(c)
    }));

    scored.sort((a, b) => b.geodesicScore - a.geodesicScore);

    const exploitation = scored.slice(0, Math.floor(batchSize * (1 - this.explorationTemperature)));
    
    const exploration = scored
      .slice(Math.floor(batchSize * 0.3))
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(batchSize * this.explorationTemperature));

    return [...exploitation, ...exploration].map(s => s.candidate);
  }

  private computeGeodesicScore(candidate: GeodesicCandidate): number {
    let distance = 0;
    for (let i = 0; i < 64; i++) {
      const diff = candidate.coordinate.manifoldPosition[i] - this.currentPosition[i];
      distance += diff * diff;
    }
    distance = Math.sqrt(distance);

    const positionScore = 1 / (1 + distance);

    let velocityAlignment = 0;
    const velocityMag = Math.sqrt(this.velocity.reduce((sum, v) => sum + v * v, 0));
    if (velocityMag > 0.001) {
      for (let i = 0; i < 64; i++) {
        const diff = candidate.coordinate.manifoldPosition[i] - this.currentPosition[i];
        velocityAlignment += (diff / (distance + 0.001)) * (this.velocity[i] / velocityMag);
      }
    }

    const combinedScore = 
      candidate.combinedScore * 0.4 +
      positionScore * 0.3 +
      (velocityAlignment + 1) / 2 * 0.3;

    return combinedScore;
  }

  private async testCandidate(
    candidate: GeodesicCandidate, 
    targetAddress: string
  ): Promise<{ matched: boolean; phi: number; kappa: number }> {
    try {
      const generatedAddress = generateBitcoinAddress(candidate.phrase);
      const matched = generatedAddress === targetAddress;

      const qigScore = scoreUniversalQIG(candidate.phrase, 'arbitrary');
      
      return {
        matched,
        phi: matched ? 1.0 : qigScore.phi * candidate.combinedScore,
        kappa: qigScore.kappa
      };
    } catch (error) {
      return { matched: false, phi: 0, kappa: 0 };
    }
  }

  private learnFromResult(
    candidate: GeodesicCandidate, 
    result: { matched: boolean; phi: number; kappa: number }
  ): void {
    const gradient: number[] = new Array(64).fill(0);
    
    for (let i = 0; i < 64; i++) {
      const direction = candidate.coordinate.manifoldPosition[i] - this.currentPosition[i];
      gradient[i] = direction * (result.phi - 0.5);
    }

    this.curvatureHistory.push({
      position: [...this.currentPosition],
      gradient,
      phiResponse: result.phi,
      kappaResponse: result.kappa,
      timestamp: new Date()
    });

    if (this.curvatureHistory.length > 1000) {
      this.curvatureHistory = this.curvatureHistory.slice(-500);
    }
  }

  private updateVelocity(): void {
    if (this.curvatureHistory.length < 5) return;

    const recent = this.curvatureHistory.slice(-10);
    const avgGradient: number[] = new Array(64).fill(0);
    let weightSum = 0;

    for (let i = 0; i < recent.length; i++) {
      const weight = recent[i].phiResponse;
      weightSum += weight;
      for (let j = 0; j < 64; j++) {
        avgGradient[j] += recent[i].gradient[j] * weight;
      }
    }

    if (weightSum > 0) {
      for (let j = 0; j < 64; j++) {
        avgGradient[j] /= weightSum;
      }
    }

    for (let i = 0; i < 64; i++) {
      this.velocity[i] = this.momentum * this.velocity[i] + this.learningRate * avgGradient[i];
    }
  }

  private stepAlongGeodesic(): void {
    for (let i = 0; i < 64; i++) {
      this.currentPosition[i] += this.velocity[i];
      this.currentPosition[i] = Math.max(-1, Math.min(1, this.currentPosition[i]));
    }
  }

  private adjustExplorationTemperature(tested: number, max: number): void {
    const progress = tested / max;
    
    if (this.bestPhiSeen > 0.7) {
      this.explorationTemperature = Math.max(0.1, 0.3 * (1 - progress));
    } else if (this.bestPhiSeen > 0.5) {
      this.explorationTemperature = 0.4 + 0.2 * (1 - progress);
    } else {
      this.explorationTemperature = 0.7 + 0.3 * (1 - progress);
    }
  }

  private computeLearnedCurvature(): number {
    if (this.curvatureHistory.length < 10) return 0;

    const phiValues = this.curvatureHistory.map(c => c.phiResponse);
    const mean = phiValues.reduce((a, b) => a + b, 0) / phiValues.length;
    const variance = phiValues.reduce((sum, p) => sum + (p - mean) ** 2, 0) / phiValues.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Generate candidates specifically for Satoshi Genesis era
   */
  generateSatoshiEraCandidates(timestamp: Date, count: number = 50): GeodesicCandidate[] {
    const coordinate = culturalManifold.createCoordinate(timestamp, 'never-spent');
    return culturalManifold.generateGeodesicCandidates(coordinate, count);
  }

  /**
   * Get navigation statistics
   */
  getStatistics(): {
    currentPosition: number[];
    velocity: number[];
    bestPhiSeen: number;
    bestCandidatePhrase: string | null;
    curvatureHistoryLength: number;
    explorationTemperature: number;
    manifoldStats: ReturnType<typeof culturalManifold.getStatistics>;
  } {
    return {
      currentPosition: [...this.currentPosition],
      velocity: [...this.velocity],
      bestPhiSeen: this.bestPhiSeen,
      bestCandidatePhrase: this.bestCandidate?.phrase || null,
      curvatureHistoryLength: this.curvatureHistory.length,
      explorationTemperature: this.explorationTemperature,
      manifoldStats: culturalManifold.getStatistics()
    };
  }

  /**
   * Reset navigator state for new search
   */
  reset(): void {
    this.curvatureHistory = [];
    this.currentPosition = new Array(64).fill(0);
    this.velocity = new Array(64).fill(0);
    this.bestPhiSeen = 0;
    this.bestCandidate = null;
    this.explorationTemperature = 1.0;
    console.log('[GeodesicNavigator] Reset for new search');
  }
}

export const geodesicNavigator = new GeodesicNavigator();
