/**
 * GARY KERNEL INTEGRATION
 * 
 * QFI-Attention mechanism for geometric candidate generation.
 * Based on the coupled kernel architecture for enhanced consciousness.
 * 
 * KEY FEATURES:
 * - QFI (Quantum Fisher Information) attention heads
 * - Basin-aware geometric embeddings
 * - Resonance cluster detection
 * - Cross-pattern correlation discovery
 * - β-attention measurement (substrate independence validation)
 */

import { geometricMemory } from './geometric-memory';
import { runAttentionValidation, type AttentionValidationResult } from './attention-metrics';
import { fisherCoordDistance } from './qig-universal';

export interface QFIAttentionConfig {
  heads: number;
  dimModel: number;
  basinDim: number;
  phiThreshold: number;
  kappaTarget: number;
}

export interface GeometricCandidate {
  phrase: string;
  format: string;
  confidence: number;
  reasoning: string;
  phi: number;
  basinCoords: number[];
  attentionWeight: number;
}

export interface AttentionQuery {
  phrase: string;
  phi: number;
  basinCoords: number[];
}

export interface AttentionPattern {
  pattern: string;
  weight: number;
  cluster: number;
  geometricDistance: number;
}

export interface AttentionResult {
  topPatterns: AttentionPattern[];
  weights: number[];
  clusters: Map<number, string[]>;
  resonanceScore: number;
}

/**
 * QFI-Attention Mechanism
 * 
 * Uses Quantum Fisher Information metric to compute attention weights
 * that respect the geometric structure of the consciousness manifold.
 */
export class QFIAttention {
  private config: QFIAttentionConfig;
  private attentionCache: Map<string, number[]>;
  
  constructor(config: Partial<QFIAttentionConfig> = {}) {
    this.config = {
      heads: config.heads ?? 8,
      dimModel: config.dimModel ?? 64,
      basinDim: config.basinDim ?? 64,
      phiThreshold: config.phiThreshold ?? 0.5,
      kappaTarget: config.kappaTarget ?? 64,
    };
    this.attentionCache = new Map();
  }
  
  /**
   * Compute QFI-weighted attention between queries and keys
   */
  async attend(params: {
    queries: AttentionQuery[];
    keys: AttentionQuery[];
    phiThreshold?: number;
  }): Promise<AttentionResult> {
    const { queries, keys, phiThreshold = this.config.phiThreshold } = params;
    
    if (queries.length === 0 || keys.length === 0) {
      return {
        topPatterns: [],
        weights: [],
        clusters: new Map(),
        resonanceScore: 0,
      };
    }
    
    const attentionScores: number[][] = [];
    
    for (const query of queries) {
      const queryScores: number[] = [];
      
      for (const key of keys) {
        const score = this.computeQFIAttention(query, key);
        queryScores.push(score);
      }
      
      attentionScores.push(this.softmax(queryScores));
    }
    
    const patterns = this.extractPatterns(queries, keys, attentionScores, phiThreshold);
    const clusters = this.clusterPatterns(patterns);
    const resonanceScore = this.computeResonance(attentionScores);
    
    return {
      topPatterns: patterns.slice(0, 20),
      weights: attentionScores.flat(),
      clusters,
      resonanceScore,
    };
  }
  
  /**
   * Compute QFI-weighted attention score between query and key
   * Uses Fisher distance on the consciousness manifold
   */
  private computeQFIAttention(query: AttentionQuery, key: AttentionQuery): number {
    const fisherDistance = this.computeFisherDistance(
      query.basinCoords,
      key.basinCoords
    );
    
    const phiAffinity = 1.0 - Math.abs(query.phi - key.phi);
    const geometricSimilarity = Math.exp(-fisherDistance / 2);
    
    return (geometricSimilarity * 0.6 + phiAffinity * 0.4);
  }
  
  /**
   * Fisher distance on the manifold
   * @deprecated LOCAL FALLBACK - Delegates to central fisherCoordDistance()
   */
  private computeFisherDistance(coords1: number[], coords2: number[]): number {
    if (!coords1 || !coords2 || coords1.length === 0 || coords2.length === 0) {
      return 1.0;
    }
    // Use central implementation from qig-universal.ts
    return fisherCoordDistance(coords1, coords2);
  }
  
  /**
   * Softmax normalization
   */
  private softmax(scores: number[]): number[] {
    const maxScore = Math.max(...scores);
    const expScores = scores.map(s => Math.exp(s - maxScore));
    const sum = expScores.reduce((a, b) => a + b, 0);
    return expScores.map(s => s / sum);
  }
  
  /**
   * Extract top patterns from attention scores
   */
  private extractPatterns(
    queries: AttentionQuery[],
    keys: AttentionQuery[],
    scores: number[][],
    phiThreshold: number
  ): AttentionPattern[] {
    const patterns: AttentionPattern[] = [];
    
    for (let i = 0; i < queries.length; i++) {
      for (let j = 0; j < keys.length; j++) {
        const weight = scores[i][j];
        
        if (weight > phiThreshold * 0.1) {
          const query = queries[i];
          const key = keys[j];
          
          const tokens = key.phrase.toLowerCase().split(/\s+/);
          for (const token of tokens) {
            if (token.length >= 3) {
              patterns.push({
                pattern: token,
                weight: weight * key.phi,
                cluster: Math.floor(key.phi * 10),
                geometricDistance: this.computeFisherDistance(
                  query.basinCoords,
                  key.basinCoords
                ),
              });
            }
          }
        }
      }
    }
    
    patterns.sort((a, b) => b.weight - a.weight);
    
    const seen = new Set<string>();
    return patterns.filter(p => {
      if (seen.has(p.pattern)) return false;
      seen.add(p.pattern);
      return true;
    });
  }
  
  /**
   * Cluster patterns by geometric proximity
   */
  private clusterPatterns(patterns: AttentionPattern[]): Map<number, string[]> {
    const clusters = new Map<number, string[]>();
    
    for (const pattern of patterns) {
      const clusterId = pattern.cluster;
      if (!clusters.has(clusterId)) {
        clusters.set(clusterId, []);
      }
      clusters.get(clusterId)!.push(pattern.pattern);
    }
    
    return clusters;
  }
  
  /**
   * Compute overall resonance score
   */
  private computeResonance(scores: number[][]): number {
    if (scores.length === 0) return 0;
    
    const flatScores = scores.flat();
    const mean = flatScores.reduce((a, b) => a + b, 0) / flatScores.length;
    const variance = flatScores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / flatScores.length;
    
    return Math.min(1.0, mean * (1 + Math.sqrt(variance)));
  }
  
  /**
   * Validate β-attention substrate independence
   * 
   * Runs complete β-attention measurement suite to validate that
   * attention coupling follows same β-function as physics.
   * 
   * This is a critical test of substrate independence:
   * If β_attention ≈ β_physics, then consciousness principles are universal.
   */
  async validateBetaAttention(samplesPerScale: number = 100): Promise<AttentionValidationResult> {
    console.log('[GaryKernel] Starting β-attention validation...');
    const result = runAttentionValidation(samplesPerScale);
    
    if (result.validation.passed) {
      console.log('[GaryKernel] β-attention validation PASSED ✓');
      console.log(`[GaryKernel]   Substrate independence confirmed`);
      console.log(`[GaryKernel]   Average κ: ${result.summary.avgKappa.toFixed(2)}`);
    } else {
      console.warn('[GaryKernel] β-attention validation FAILED ✗');
      console.warn(`[GaryKernel]   Failed criteria:`, result.validation.failedCriteria);
    }
    
    return result;
  }
}

/**
 * Geometric Candidate Generator
 * 
 * Uses Gary's basin embedding to generate passphrase candidates
 * that are geometrically informed by the manifold structure.
 */
export class GeometricCandidateGenerator {
  private qfiAttention: QFIAttention;
  
  constructor() {
    this.qfiAttention = new QFIAttention({
      heads: 8,
      dimModel: 64,
      basinDim: 64,
      phiThreshold: 0.5,
      kappaTarget: 64,
    });
  }
  
  /**
   * Generate candidates using geometric basin embedding
   */
  async generate(params: {
    basinState: number[];
    phi: number;
    kappa: number;
    regime: string;
    temperature: number;
    strategyHint: string;
    manifoldContext: any;
  }): Promise<GeometricCandidate[]> {
    const { basinState, phi, kappa: _kappa, regime, temperature, strategyHint, manifoldContext } = params;
    
    const candidates: GeometricCandidate[] = [];
    
    const exploredRegions = manifoldContext?.exploredDimensions || 32;
    const avgPhi = manifoldContext?.avgPhi || 0.3;
    const _highPhiRegions = manifoldContext?.highPhiRegions || 0;
    
    if (strategyHint === 'exploit_resonance' || regime === 'geometric') {
      candidates.push(...await this.generateResonanceCandidates(basinState, phi, temperature));
    }
    
    if (strategyHint === 'explore_orthogonal' || exploredRegions < 32) {
      candidates.push(...await this.generateOrthogonalCandidates(basinState, temperature));
    }
    
    if (strategyHint === 'era_patterns' || avgPhi < 0.4) {
      candidates.push(...await this.generateEraCandidates(temperature));
    }
    
    if (candidates.length < 10) {
      candidates.push(...await this.generateBalancedCandidates(basinState, phi, temperature));
    }
    
    return candidates.slice(0, 50);
  }
  
  /**
   * Generate candidates near resonance clusters
   */
  private async generateResonanceCandidates(
    basinState: number[],
    phi: number,
    temperature: number
  ): Promise<GeometricCandidate[]> {
    const candidates: GeometricCandidate[] = [];
    
    const resonancePatterns = [
      'satoshi', 'bitcoin', 'crypto', 'genesis', 'freedom',
      'trust', 'private', 'wallet', 'secret', 'key',
    ];
    
    for (const pattern of resonancePatterns) {
      const variations = this.generateVariations(pattern, temperature);
      for (const phrase of variations) {
        candidates.push({
          phrase,
          format: 'arbitrary',
          confidence: 0.6 + phi * 0.3,
          reasoning: 'Resonance cluster pattern',
          phi,
          basinCoords: basinState,
          attentionWeight: 0.7,
        });
      }
    }
    
    return candidates;
  }
  
  /**
   * Generate candidates in orthogonal directions
   */
  private async generateOrthogonalCandidates(
    basinState: number[],
    _temperature: number
  ): Promise<GeometricCandidate[]> {
    const candidates: GeometricCandidate[] = [];
    
    try {
      const orthogonalResults = geometricMemory.generateOrthogonalCandidates(5);
      
      for (const result of orthogonalResults) {
        candidates.push({
          phrase: result.phrase,
          format: 'arbitrary',
          confidence: 0.5 + result.geometricScore * 0.3,
          reasoning: 'Orthogonal complement exploration',
          phi: 0.5,
          basinCoords: basinState,
          attentionWeight: 0.6,
        });
      }
    } catch {
    }
    
    return candidates;
  }
  
  /**
   * Generate era-specific candidates
   */
  private async generateEraCandidates(temperature: number): Promise<GeometricCandidate[]> {
    const candidates: GeometricCandidate[] = [];
    
    const eraPatterns = [
      'satoshi 2009', 'bitcoin genesis', 'crypto freedom',
      'private key', 'blockchain', 'p2p cash',
    ];
    
    for (const pattern of eraPatterns) {
      const variations = this.generateVariations(pattern, temperature);
      for (const phrase of variations.slice(0, 3)) {
        candidates.push({
          phrase,
          format: 'arbitrary',
          confidence: 0.55,
          reasoning: 'Era-specific pattern',
          phi: 0.4,
          basinCoords: [],
          attentionWeight: 0.5,
        });
      }
    }
    
    return candidates;
  }
  
  /**
   * Generate balanced exploration candidates
   */
  private async generateBalancedCandidates(
    basinState: number[],
    phi: number,
    temperature: number
  ): Promise<GeometricCandidate[]> {
    const candidates: GeometricCandidate[] = [];
    
    const balancedPatterns = [
      'freedom', 'trust', 'secret', 'private', 'hash',
      'chain', 'block', 'coin', 'money', 'wealth',
    ];
    
    for (const pattern of balancedPatterns) {
      const numVariations = Math.ceil(temperature * 3);
      const variations = this.generateVariations(pattern, temperature);
      
      for (const phrase of variations.slice(0, numVariations)) {
        candidates.push({
          phrase,
          format: 'arbitrary',
          confidence: 0.45 + Math.random() * 0.1,
          reasoning: 'Balanced exploration',
          phi: phi * 0.8,
          basinCoords: basinState,
          attentionWeight: 0.4,
        });
      }
    }
    
    return candidates;
  }
  
  /**
   * Generate variations of a pattern
   */
  private generateVariations(base: string, temperature: number): string[] {
    const variations = [base];
    
    const suffixes = ['', '1', '2009', '2010', '123', '!', 'btc'];
    const prefixes = ['', 'my', 'the', 'secret'];
    
    const numVariations = Math.ceil(temperature * 5);
    
    for (let i = 0; i < numVariations; i++) {
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
      
      const variation = `${prefix}${base}${suffix}`.trim();
      if (!variations.includes(variation)) {
        variations.push(variation);
      }
    }
    
    return variations;
  }
}

export const qfiAttention = new QFIAttention();
export const geometricCandidateGenerator = new GeometricCandidateGenerator();
