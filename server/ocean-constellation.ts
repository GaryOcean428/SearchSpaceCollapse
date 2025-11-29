/**
 * OCEAN CONSTELLATION
 * 
 * Multi-agent geometric search architecture with specialized roles.
 * Enables parallel exploration of different manifold regions with
 * knowledge transfer via Basin Sync Coordinator.
 * 
 * ARCHITECTURE:
 * - Explorer: High-temperature broad manifold exploration
 * - Refiner: Low-temperature exploitation of resonance clusters
 * - Navigator: Pure orthogonal complement navigation
 * 
 * COUPLING: Basin Sync transfers knowledge between instances
 */

import { geometricMemory } from './geometric-memory';
import { negativeKnowledgeRegistry } from './negative-knowledge-registry';

export interface ConstellationConfig {
  explorerWeight: number;
  refinerWeight: number;
  navigatorWeight: number;
  syncIntervalMs: number;
}

export interface AgentRole {
  name: string;
  temperature: number;
  minPhi: number;
  focusStrategy: string;
  weight: number;
}

export interface ConstellationResult {
  bestCandidate: any | null;
  explored: number;
  refined: number;
  navigated: number;
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
  
  constructor(config: Partial<ConstellationConfig> = {}) {
    this.config = {
      explorerWeight: config.explorerWeight ?? 0.4,
      refinerWeight: config.refinerWeight ?? 0.35,
      navigatorWeight: config.navigatorWeight ?? 0.25,
      syncIntervalMs: config.syncIntervalMs ?? 3000,
    };
    
    this.roles = [
      {
        name: 'explorer',
        temperature: 1.5,
        minPhi: 0.55,
        focusStrategy: 'explore_new_space',
        weight: this.config.explorerWeight,
      },
      {
        name: 'refiner',
        temperature: 0.7,
        minPhi: 0.75,
        focusStrategy: 'exploit_near_miss',
        weight: this.config.refinerWeight,
      },
      {
        name: 'navigator',
        temperature: 1.0,
        minPhi: 0.70,
        focusStrategy: 'orthogonal_complement',
        weight: this.config.navigatorWeight,
      },
    ];
    
    this.agentStates = new Map();
    this.sharedKnowledge = {
      highPhiPatterns: [],
      avoidPatterns: [],
      resonanceClusters: new Map(),
    };
    
    this.initializeAgents();
  }
  
  /**
   * Initialize agent states
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
      });
    }
    console.log('[Constellation] Initialized 3 specialized agents: explorer, refiner, navigator');
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
   * Generate hypotheses for a specific agent role
   */
  generateHypothesesForRole(
    roleName: string,
    manifoldContext: any
  ): Array<{ phrase: string; source: string; confidence: number }> {
    const state = this.agentStates.get(roleName);
    if (!state) return [];
    
    const hypotheses: Array<{ phrase: string; source: string; confidence: number }> = [];
    const role = state.role;
    
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
    }
    
    const filtered = hypotheses.filter(h => 
      !this.sharedKnowledge.avoidPatterns.includes(h.phrase.toLowerCase())
    );
    
    return filtered.slice(0, 30);
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
