/**
 * OCEAN CONSTELLATION
 * 
 * Multi-agent geometric search architecture with specialized roles.
 * Enables parallel exploration of different manifold regions with
 * knowledge transfer via Basin Sync Coordinator.
 * 
 * ARCHITECTURE:
 * - Explorer: High-temperature broad manifold exploration (QIG: high entropy sampling)
 * - Refiner: Low-temperature exploitation of resonance clusters (QIG: gradient descent)
 * - Navigator: Pure orthogonal complement navigation (QIG: Fisher geodesic)
 * - Skeptic: Constraint validation and contradiction detection (QIG: null hypothesis)
 * - Resonator: Cross-pattern harmonic detection (QIG: eigenvalue analysis)
 * 
 * COUPLING: Basin Sync transfers knowledge between instances
 * 
 * QIG COMPLIANCE:
 * All kernels use Fisher Information Metric for:
 * - Tokenization: Vocabulary weighted by geometric resonance
 * - Generation: Candidates scored by manifold position
 * - Sync: Basin coordinates transmitted via geodesic compression
 */

import { geometricMemory } from './geometric-memory';
import { negativeKnowledgeRegistry } from './negative-knowledge-registry';
import { expandedVocabulary } from './expanded-vocabulary';
import { fisherVectorized } from './fisher-vectorized';
import { QIG_CONSTANTS } from './qig-pure-v2';

export interface ConstellationConfig {
  explorerWeight: number;
  refinerWeight: number;
  navigatorWeight: number;
  skepticWeight: number;
  resonatorWeight: number;
  syncIntervalMs: number;
  qigTokenizationEnabled: boolean;
  basinSyncEnabled: boolean;
}

export interface AgentRole {
  name: string;
  temperature: number;
  minPhi: number;
  focusStrategy: string;
  weight: number;
  qigMode: 'entropy' | 'gradient' | 'geodesic' | 'null_hypothesis' | 'eigenvalue';
}

export interface ConstellationResult {
  bestCandidate: any | null;
  explored: number;
  refined: number;
  navigated: number;
  skepticValidated: number;
  resonatorMatched: number;
  totalHypotheses: number;
  resonanceClusters: number;
  duration: number;
}

export interface AgentState {
  role: AgentRole;
  phi: number;
  kappa: number;
  regime: string;
  hypothesesTested: number;
  nearMisses: any[];
  basinCoordinates: number[];
  fisherMetricState: {
    trace: number;
    determinant: number;
    maxEigenvalue: number;
    geodesicDirection: number[];
  };
  vocabularyWeights: Map<string, number>;
}

/**
 * QIG Token - Geometric vocabulary unit
 */
interface QIGToken {
  word: string;
  category: string;
  fisherWeight: number;
  basinAlignment: number;
  resonanceScore: number;
}

/**
 * Constellation Coordinator
 * 
 * Manages multiple specialized agents working in parallel
 * on the same target address, with knowledge sharing.
 */
export class OceanConstellation {
  private config: ConstellationConfig;
  private roles: AgentRole[];
  private agentStates: Map<string, AgentState>;
  private sharedKnowledge: {
    highPhiPatterns: string[];
    avoidPatterns: string[];
    resonanceClusters: Map<string, number>;
  };
  private qigTokenCache: Map<string, QIGToken>;
  private basinSyncBuffer: Array<{ agentName: string; coordinates: number[]; timestamp: number }>;
  
  constructor(config: Partial<ConstellationConfig> = {}) {
    this.config = {
      explorerWeight: config.explorerWeight ?? 0.25,
      refinerWeight: config.refinerWeight ?? 0.25,
      navigatorWeight: config.navigatorWeight ?? 0.20,
      skepticWeight: config.skepticWeight ?? 0.15,
      resonatorWeight: config.resonatorWeight ?? 0.15,
      syncIntervalMs: config.syncIntervalMs ?? 3000,
      qigTokenizationEnabled: config.qigTokenizationEnabled ?? true,
      basinSyncEnabled: config.basinSyncEnabled ?? true,
    };
    
    this.roles = [
      {
        name: 'explorer',
        temperature: 1.5,
        minPhi: 0.45,
        focusStrategy: 'explore_new_space',
        weight: this.config.explorerWeight,
        qigMode: 'entropy',
      },
      {
        name: 'refiner',
        temperature: 0.7,
        minPhi: 0.65,
        focusStrategy: 'exploit_near_miss',
        weight: this.config.refinerWeight,
        qigMode: 'gradient',
      },
      {
        name: 'navigator',
        temperature: 1.0,
        minPhi: 0.60,
        focusStrategy: 'orthogonal_complement',
        weight: this.config.navigatorWeight,
        qigMode: 'geodesic',
      },
      {
        name: 'skeptic',
        temperature: 0.5,
        minPhi: 0.70,
        focusStrategy: 'validate_constraints',
        weight: this.config.skepticWeight,
        qigMode: 'null_hypothesis',
      },
      {
        name: 'resonator',
        temperature: 1.2,
        minPhi: 0.55,
        focusStrategy: 'cross_pattern_harmonic',
        weight: this.config.resonatorWeight,
        qigMode: 'eigenvalue',
      },
    ];
    
    this.agentStates = new Map();
    this.sharedKnowledge = {
      highPhiPatterns: [],
      avoidPatterns: [],
      resonanceClusters: new Map(),
    };
    this.qigTokenCache = new Map();
    this.basinSyncBuffer = [];
    
    this.initializeAgents();
    this.initializeQIGTokenization();
  }
  
  /**
   * Initialize agent states with QIG-compliant metrics
   */
  private initializeAgents(): void {
    for (const role of this.roles) {
      this.agentStates.set(role.name, {
        role,
        phi: 0.5,
        kappa: 50,
        regime: 'linear',
        hypothesesTested: 0,
        nearMisses: [],
        basinCoordinates: new Array(64).fill(0.5),
        fisherMetricState: {
          trace: 1.0,
          determinant: 0.0,
          maxEigenvalue: 0.1,
          geodesicDirection: new Array(32).fill(0),
        },
        vocabularyWeights: new Map(),
      });
    }
    console.log(`[Constellation] Initialized ${this.roles.length} QIG-compliant agents: ${this.roles.map(r => r.name).join(', ')}`);
  }
  
  /**
   * Initialize QIG tokenization for vocabulary-weighted generation
   */
  private initializeQIGTokenization(): void {
    if (!this.config.qigTokenizationEnabled) return;
    
    const allWords = expandedVocabulary.getAllWords();
    const categories = ['crypto', 'common', 'cultural', 'names', 'patterns'];
    
    for (const word of allWords) {
      const baseCoords = this.wordToBasinCoordinates(word);
      const fisherResult = fisherVectorized.computeMatrix(baseCoords.slice(0, 32));
      const metrics = fisherVectorized.computeMetrics(fisherResult);
      
      const category = categories[Math.floor(word.charCodeAt(0) % categories.length)];
      
      const token: QIGToken = {
        word,
        category,
        fisherWeight: metrics.trace / 32,
        basinAlignment: this.computeBasinAlignment(baseCoords),
        resonanceScore: Math.abs(50 - metrics.maxEigenvalueEstimate * 100) < 15 ? 1.0 : 0.5,
      };
      
      this.qigTokenCache.set(word, token);
    }
    
    console.log(`[Constellation] QIG tokenization initialized with ${this.qigTokenCache.size} tokens`);
  }
  
  /**
   * Convert word to basin coordinates using consistent hashing
   */
  private wordToBasinCoordinates(word: string): number[] {
    const coords: number[] = [];
    for (let i = 0; i < 64; i++) {
      const charCode = word.charCodeAt(i % word.length) || 0;
      const hash = ((charCode * 31 + i * 17) % 256) / 255;
      coords.push(hash);
    }
    return coords;
  }
  
  /**
   * Compute basin alignment score
   */
  private computeBasinAlignment(coords: number[]): number {
    const mean = coords.reduce((a, b) => a + b, 0) / coords.length;
    const variance = coords.reduce((sum, c) => sum + (c - mean) ** 2, 0) / coords.length;
    return 1 - Math.min(1, variance * 4);
  }
  
  /**
   * Get current constellation status
   */
  getStatus(): {
    agents: Array<{ name: string; phi: number; tested: number; regime: string }>;
    sharedPatterns: number;
    avoidPatterns: number;
  } {
    const agents = Array.from(this.agentStates.entries()).map(([name, state]) => ({
      name,
      phi: state.phi,
      tested: state.hypothesesTested,
      regime: state.regime,
    }));
    
    return {
      agents,
      sharedPatterns: this.sharedKnowledge.highPhiPatterns.length,
      avoidPatterns: this.sharedKnowledge.avoidPatterns.length,
    };
  }
  
  /**
   * Generate hypotheses for a specific agent role using QIG-compliant methods
   */
  generateHypothesesForRole(
    roleName: string,
    manifoldContext: any
  ): Array<{ phrase: string; source: string; confidence: number }> {
    const state = this.agentStates.get(roleName);
    if (!state) return [];
    
    const hypotheses: Array<{ phrase: string; source: string; confidence: number }> = [];
    const role = state.role;
    
    if (this.config.basinSyncEnabled) {
      this.syncBasinState(roleName, state);
    }
    
    switch (role.focusStrategy) {
      case 'explore_new_space':
        hypotheses.push(...this.generateExplorerHypotheses(state, manifoldContext));
        break;
        
      case 'exploit_near_miss':
        hypotheses.push(...this.generateRefinerHypotheses(state));
        break;
        
      case 'orthogonal_complement':
        hypotheses.push(...this.generateNavigatorHypotheses(state, manifoldContext));
        break;
        
      case 'validate_constraints':
        hypotheses.push(...this.generateSkepticHypotheses(state, manifoldContext));
        break;
        
      case 'cross_pattern_harmonic':
        hypotheses.push(...this.generateResonatorHypotheses(state, manifoldContext));
        break;
    }
    
    const qigWeighted = this.applyQIGWeighting(hypotheses, role.qigMode);
    
    const filtered = qigWeighted.filter(h => 
      !this.sharedKnowledge.avoidPatterns.includes(h.phrase.toLowerCase())
    );
    
    return filtered.slice(0, 30);
  }
  
  /**
   * Sync basin state with other kernels
   */
  private syncBasinState(roleName: string, state: AgentState): void {
    this.basinSyncBuffer.push({
      agentName: roleName,
      coordinates: state.basinCoordinates.slice(0, 32),
      timestamp: Date.now(),
    });
    
    if (this.basinSyncBuffer.length > 100) {
      this.basinSyncBuffer = this.basinSyncBuffer.slice(-50);
    }
    
    const recentSyncs = this.basinSyncBuffer.filter(
      s => s.agentName !== roleName && Date.now() - s.timestamp < 10000
    );
    
    if (recentSyncs.length > 0) {
      const avgCoords = new Array(32).fill(0);
      for (const sync of recentSyncs) {
        for (let i = 0; i < 32; i++) {
          avgCoords[i] += sync.coordinates[i] / recentSyncs.length;
        }
      }
      
      for (let i = 0; i < 32; i++) {
        state.basinCoordinates[i] = state.basinCoordinates[i] * 0.9 + avgCoords[i] * 0.1;
      }
    }
  }
  
  /**
   * Apply QIG weighting based on agent mode
   */
  private applyQIGWeighting(
    hypotheses: Array<{ phrase: string; source: string; confidence: number }>,
    qigMode: string
  ): Array<{ phrase: string; source: string; confidence: number }> {
    if (!this.config.qigTokenizationEnabled) return hypotheses;
    
    return hypotheses.map(h => {
      const words = h.phrase.toLowerCase().split(/\s+/);
      let qigBoost = 0;
      
      for (const word of words) {
        const token = this.qigTokenCache.get(word);
        if (token) {
          switch (qigMode) {
            case 'entropy':
              qigBoost += (1 - token.basinAlignment) * 0.1;
              break;
            case 'gradient':
              qigBoost += token.fisherWeight * 0.15;
              break;
            case 'geodesic':
              qigBoost += token.resonanceScore * 0.12;
              break;
            case 'null_hypothesis':
              qigBoost += token.basinAlignment * 0.1;
              break;
            case 'eigenvalue':
              qigBoost += (token.fisherWeight + token.resonanceScore) * 0.08;
              break;
          }
        }
      }
      
      return {
        ...h,
        confidence: Math.min(0.95, h.confidence + qigBoost),
      };
    });
  }
  
  /**
   * Explorer: High-temperature broad search
   */
  private generateExplorerHypotheses(
    state: AgentState,
    manifoldContext: any
  ): Array<{ phrase: string; source: string; confidence: number }> {
    const hypotheses: Array<{ phrase: string; source: string; confidence: number }> = [];
    
    const bases = [
      'crypto', 'bitcoin', 'freedom', 'genesis', 'block',
      'satoshi', 'hash', 'chain', 'trust', 'secret',
    ];
    
    const modifiers = [
      '', '2009', '2010', '2011', 'my', 'the', 'first',
      '123', '!', 'btc', 'coin', 'p2p',
    ];
    
    for (const base of bases) {
      for (const mod of modifiers) {
        if (Math.random() < state.role.temperature * 0.3) {
          const phrase = `${base}${mod}`.trim();
          hypotheses.push({
            phrase,
            source: 'explorer_broad',
            confidence: 0.4 + Math.random() * 0.2,
          });
        }
      }
    }
    
    return hypotheses;
  }
  
  /**
   * Refiner: Exploit near misses and high-phi patterns
   */
  private generateRefinerHypotheses(
    state: AgentState
  ): Array<{ phrase: string; source: string; confidence: number }> {
    const hypotheses: Array<{ phrase: string; source: string; confidence: number }> = [];
    
    for (const pattern of this.sharedKnowledge.highPhiPatterns.slice(0, 10)) {
      const variations = this.generateCloseVariations(pattern);
      for (const v of variations) {
        hypotheses.push({
          phrase: v,
          source: 'refiner_variation',
          confidence: 0.7,
        });
      }
    }
    
    for (const nearMiss of state.nearMisses.slice(-10)) {
      const phrase = nearMiss.phrase || nearMiss;
      if (typeof phrase === 'string') {
        const variations = this.generateCloseVariations(phrase);
        for (const v of variations) {
          hypotheses.push({
            phrase: v,
            source: 'refiner_near_miss',
            confidence: 0.75,
          });
        }
      }
    }
    
    return hypotheses;
  }
  
  /**
   * Navigator: Orthogonal complement exploration
   */
  private generateNavigatorHypotheses(
    state: AgentState,
    manifoldContext: any
  ): Array<{ phrase: string; source: string; confidence: number }> {
    const hypotheses: Array<{ phrase: string; source: string; confidence: number }> = [];
    
    try {
      const orthogonalResults = geometricMemory.generateOrthogonalCandidates(10);
      
      for (const result of orthogonalResults) {
        hypotheses.push({
          phrase: result.phrase,
          source: 'navigator_orthogonal',
          confidence: 0.55 + result.geometricScore * 0.2,
        });
      }
    } catch (e) {
    }
    
    const unexplored = [
      'chancellor', 'bailout', 'crisis', 'bank', 'reserve',
      'fiat', 'inflation', 'gold', 'sound money', 'cypherpunk',
    ];
    
    for (const word of unexplored) {
      if (!this.sharedKnowledge.avoidPatterns.some(p => p.includes(word))) {
        hypotheses.push({
          phrase: word,
          source: 'navigator_unexplored',
          confidence: 0.5,
        });
      }
    }
    
    return hypotheses;
  }
  
  /**
   * Skeptic: Constraint validation and null hypothesis testing
   * QIG Mode: null_hypothesis - validates patterns against known constraints
   */
  private generateSkepticHypotheses(
    state: AgentState,
    manifoldContext: any
  ): Array<{ phrase: string; source: string; confidence: number }> {
    const hypotheses: Array<{ phrase: string; source: string; confidence: number }> = [];
    
    const summary = negativeKnowledgeRegistry.getSummary();
    const contradictions = summary.contradictions || [];
    const highConfContradictions = contradictions.filter((c: any) => c.occurrences > 3);
    
    for (const contradiction of highConfContradictions.slice(0, 10)) {
      const antiPatterns = this.generateAntiPatterns(contradiction.pattern);
      for (const anti of antiPatterns) {
        hypotheses.push({
          phrase: anti,
          source: 'skeptic_anti_pattern',
          confidence: 0.65,
        });
      }
    }
    
    const testedPatterns = manifoldContext?.testedPhrases || [];
    if (testedPatterns.length > 10) {
      const patternFreq = new Map<string, number>();
      for (const p of testedPatterns.slice(-500)) {
        const words = (p as string).toLowerCase().split(/\s+/);
        for (const word of words) {
          patternFreq.set(word, (patternFreq.get(word) || 0) + 1);
        }
      }
      
      const uncommonTokens = Array.from(this.qigTokenCache.values())
        .filter(t => !patternFreq.has(t.word) || patternFreq.get(t.word)! < 2)
        .slice(0, 20);
      
      for (const token of uncommonTokens) {
        hypotheses.push({
          phrase: token.word,
          source: 'skeptic_unexplored_token',
          confidence: 0.5 + token.basinAlignment * 0.15,
        });
      }
    }
    
    return hypotheses;
  }
  
  /**
   * Generate anti-patterns from contradiction
   */
  private generateAntiPatterns(pattern: string): string[] {
    const results: string[] = [];
    const words = pattern.split(/[\s_-]+/);
    
    if (words.length >= 2) {
      results.push(words.reverse().join(' '));
    }
    
    const numMatch = pattern.match(/\d+/);
    if (numMatch) {
      const num = parseInt(numMatch[0], 10);
      results.push(pattern.replace(numMatch[0], String(num + 1)));
      results.push(pattern.replace(numMatch[0], String(num - 1)));
    }
    
    if (pattern.length > 3) {
      results.push(pattern.slice(0, -1));
      results.push(pattern.slice(1));
    }
    
    return results.filter(r => r.length > 2);
  }
  
  /**
   * Resonator: Cross-pattern harmonic detection
   * QIG Mode: eigenvalue - finds patterns with high Fisher eigenvalue resonance
   */
  private generateResonatorHypotheses(
    state: AgentState,
    manifoldContext: any
  ): Array<{ phrase: string; source: string; confidence: number }> {
    const hypotheses: Array<{ phrase: string; source: string; confidence: number }> = [];
    
    const highPhiPatterns = manifoldContext?.highPhiPatterns || this.sharedKnowledge.highPhiPatterns;
    
    if (highPhiPatterns.length >= 2) {
      for (let i = 0; i < Math.min(highPhiPatterns.length - 1, 10); i++) {
        for (let j = i + 1; j < Math.min(highPhiPatterns.length, 10); j++) {
          const p1 = highPhiPatterns[i];
          const p2 = highPhiPatterns[j];
          
          const harmonics = this.generateHarmonicCombinations(p1, p2);
          for (const harmonic of harmonics) {
            hypotheses.push({
              phrase: harmonic,
              source: 'resonator_harmonic',
              confidence: 0.6,
            });
          }
        }
      }
    }
    
    const resonantTokens = Array.from(this.qigTokenCache.values())
      .filter(t => t.resonanceScore > 0.7)
      .sort((a, b) => b.resonanceScore - a.resonanceScore)
      .slice(0, 15);
    
    for (const token of resonantTokens) {
      hypotheses.push({
        phrase: token.word,
        source: 'resonator_eigenvalue',
        confidence: 0.55 + token.resonanceScore * 0.2,
      });
      
      for (const other of resonantTokens.slice(0, 3)) {
        if (other.word !== token.word) {
          hypotheses.push({
            phrase: `${token.word} ${other.word}`,
            source: 'resonator_coupling',
            confidence: 0.5 + (token.resonanceScore + other.resonanceScore) * 0.1,
          });
        }
      }
    }
    
    return hypotheses;
  }
  
  /**
   * Generate harmonic combinations from two patterns
   */
  private generateHarmonicCombinations(p1: string, p2: string): string[] {
    const results: string[] = [];
    const words1 = p1.split(/\s+/);
    const words2 = p2.split(/\s+/);
    
    if (words1.length > 0 && words2.length > 0) {
      results.push(`${words1[0]} ${words2[words2.length - 1]}`);
      results.push(`${words2[0]} ${words1[words1.length - 1]}`);
    }
    
    if (p1.length >= 3 && p2.length >= 3) {
      results.push(p1.slice(0, 3) + p2.slice(-3));
      results.push(p2.slice(0, 3) + p1.slice(-3));
    }
    
    return results.filter(r => r.length > 3);
  }
  
  /**
   * Generate close variations of a pattern
   */
  private generateCloseVariations(pattern: string): string[] {
    const variations = [pattern];
    
    variations.push(pattern.toLowerCase());
    variations.push(pattern.toUpperCase());
    variations.push(pattern.charAt(0).toUpperCase() + pattern.slice(1).toLowerCase());
    
    variations.push(pattern + '1');
    variations.push(pattern + '!');
    variations.push(pattern + '123');
    
    variations.push('my' + pattern);
    variations.push('the' + pattern);
    
    return Array.from(new Set(variations));
  }
  
  /**
   * Update agent state after testing
   */
  updateAgentState(
    roleName: string,
    results: {
      phi: number;
      kappa: number;
      regime: string;
      tested: number;
      nearMisses: any[];
    }
  ): void {
    const state = this.agentStates.get(roleName);
    if (!state) return;
    
    state.phi = results.phi;
    state.kappa = results.kappa;
    state.regime = results.regime;
    state.hypothesesTested += results.tested;
    state.nearMisses.push(...results.nearMisses);
    
    if (state.nearMisses.length > 50) {
      state.nearMisses = state.nearMisses.slice(-50);
    }
    
    for (const miss of results.nearMisses) {
      const phrase = miss.phrase || miss;
      if (typeof phrase === 'string' && results.phi > 0.6) {
        if (!this.sharedKnowledge.highPhiPatterns.includes(phrase)) {
          this.sharedKnowledge.highPhiPatterns.push(phrase);
        }
      }
    }
    
    if (this.sharedKnowledge.highPhiPatterns.length > 100) {
      this.sharedKnowledge.highPhiPatterns = 
        this.sharedKnowledge.highPhiPatterns.slice(-100);
    }
  }
  
  /**
   * Mark pattern as tested/avoid
   */
  markTested(phrase: string): void {
    const lower = phrase.toLowerCase();
    if (!this.sharedKnowledge.avoidPatterns.includes(lower)) {
      this.sharedKnowledge.avoidPatterns.push(lower);
    }
    
    if (this.sharedKnowledge.avoidPatterns.length > 10000) {
      this.sharedKnowledge.avoidPatterns = 
        this.sharedKnowledge.avoidPatterns.slice(-10000);
    }
  }
  
  /**
   * Synthesize results from all agents
   */
  synthesize(): {
    totalTested: number;
    combinedNearMisses: any[];
    resonanceScore: number;
    recommendation: string;
  } {
    let totalTested = 0;
    const allNearMisses: any[] = [];
    let totalPhi = 0;
    
    for (const [_, state] of Array.from(this.agentStates)) {
      totalTested += state.hypothesesTested;
      allNearMisses.push(...state.nearMisses);
      totalPhi += state.phi;
    }
    
    const avgPhi = totalPhi / this.agentStates.size;
    
    let recommendation = 'continue_balanced';
    if (avgPhi > 0.7) {
      recommendation = 'focus_refinement';
    } else if (avgPhi < 0.4) {
      recommendation = 'expand_exploration';
    }
    
    return {
      totalTested,
      combinedNearMisses: allNearMisses.slice(-100),
      resonanceScore: avgPhi,
      recommendation,
    };
  }
  
  /**
   * Export constellation state for persistence
   */
  export(): any {
    return {
      agents: Array.from(this.agentStates.entries()).map(([name, state]) => ({
        name,
        phi: state.phi,
        kappa: state.kappa,
        regime: state.regime,
        hypothesesTested: state.hypothesesTested,
      })),
      sharedKnowledge: {
        highPhiPatterns: this.sharedKnowledge.highPhiPatterns,
        avoidPatternsCount: this.sharedKnowledge.avoidPatterns.length,
      },
    };
  }
}

export const oceanConstellation = new OceanConstellation();
