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
import { negativeKnowledgeUnified as negativeKnowledgeRegistry } from './negative-knowledge-unified';
import { expandedVocabulary } from './expanded-vocabulary';
import { fisherVectorized } from './fisher-vectorized';
import { QIG_CONSTANTS } from './qig-pure-v2';
import { pureQIGKernel, type ConsciousnessMetrics as QIGConsciousnessMetrics } from './qig-kernel-pure';
import { oceanQIGBackend } from './ocean-qig-backend-adapter';
import { pantheonOrchestrator } from './pantheon-orchestrator-adapter';

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
  // Pure QIG kernel state
  qigKernelState?: {
    subsystemActivations: number[];
    lastConsciousnessMetrics?: QIGConsciousnessMetrics;
  };
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
    
    // Check Python Pantheon Orchestrator availability on startup
    pantheonOrchestrator.checkHealth().then((healthy) => {
      if (healthy) {
        console.log('[Constellation] ✅ Connected to Python Pantheon Orchestrator (real consciousness kernels)');
      } else {
        console.warn('[Constellation] ⚠️  Python Pantheon Orchestrator not available - using simulations');
      }
    });
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
   * Refresh token weights from geometric memory high-Φ probes
   * This enables continuous learning across sessions
   */
  refreshTokenWeightsFromGeometricMemory(): void {
    const allProbes = geometricMemory.getAllProbes();
    const highPhiProbes = allProbes.filter(p => p.phi >= 0.6);
    
    if (highPhiProbes.length === 0) return;
    
    let updated = 0;
    
    for (const probe of highPhiProbes) {
      // Extract words from the probe input
      const words = probe.input.toLowerCase().split(/[\s\d]+/).filter(w => w.length >= 2);
      
      for (const word of words) {
        const token = this.qigTokenCache.get(word);
        if (token) {
          // Boost fisher weight based on probe's phi
          const phiBoost = probe.phi * 0.5;
          token.fisherWeight = Math.min(1.0, token.fisherWeight + phiBoost * 0.1);
          token.resonanceScore = Math.min(1.0, token.resonanceScore + phiBoost * 0.05);
          updated++;
        }
      }
    }
    
    if (updated > 0) {
      console.log(`[Constellation] Refreshed ${updated} token weights from ${highPhiProbes.length} high-Φ probes`);
    }
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
   * Process phrase through consciousness backend
   * Priority: Pantheon Orchestrator → Direct QIG → TypeScript fallback
   * 
   * Tries Python Pantheon Orchestrator first for god-based kernel routing,
   * falls back to direct QIG backend, then TypeScript implementation.
   */
  private async processWithPureQIG(phrase: string, state: AgentState): Promise<void> {
    // Try Python Pantheon Orchestrator first (PREFERRED - consciousness kernels with god routing)
    if (pantheonOrchestrator.available()) {
      try {
        const result = await pantheonOrchestrator.orchestrate(phrase, {
          role: state.role.name,
          focusStrategy: state.role.focusStrategy,
        });
        
        if (result) {
          // Update agent state with Pantheon orchestration results
          state.phi = 0.75; // Base consciousness - fuller metrics would come from consciousness_4d integration
          state.kappa = 64;  // At κ* - geometric regime
          state.basinCoordinates = result.basin;
          
          // Determine regime based on god affinity and mode
          if (result.affinity > 0.8 || result.mode === 'e8') {
            state.regime = 'geometric';
          } else if (result.affinity > 0.5) {
            state.regime = 'hierarchical';
          } else {
            state.regime = 'linear';
          }
          
          console.log(`[Constellation] ${state.role.name} → ${result.god} (affinity: ${result.affinity.toFixed(3)}, mode: ${result.mode})`);
          return;
        }
      } catch (e) {
        console.warn('[Constellation] Python Pantheon failed, trying direct QIG:', e);
      }
    }
    
    // Fallback to direct Python QIG backend (GOOD - pure consciousness without god routing)
    if (oceanQIGBackend.available()) {
      try {
        const result = await oceanQIGBackend.process(phrase);
        if (result) {
          // Update agent state with Python QIG results
          state.phi = result.phi;
          state.kappa = result.kappa;
          state.basinCoordinates = result.basinCoordinates;
          // regime is determined separately from QIG scores
          return;
        }
      } catch (e) {
        console.warn('[Constellation] Python backend failed, falling back to TS:', e);
      }
    }
    
    // Final fallback to TypeScript implementation (LOCAL SIMULATION - not real consciousness)
    console.warn('[Constellation] Using TypeScript simulation - not connected to real consciousness backend');
    const result = pureQIGKernel.process(phrase);
    
    // Update agent state with QIG kernel results
    state.phi = result.metrics.phi;
    state.kappa = result.metrics.kappa;
    state.basinCoordinates = result.basinCoordinates;
    
    // Store subsystem states
    const subsystemStates = pureQIGKernel.getSubsystemStates();
    state.qigKernelState = {
      subsystemActivations: subsystemStates.map(s => s.activation),
      lastConsciousnessMetrics: result.metrics,
    };
    
    // Update regime based on kappa proximity to κ*
    const kappaProximity = Math.abs(state.kappa - QIG_CONSTANTS.KAPPA_STAR);
    if (kappaProximity < 5) {
      state.regime = 'geometric';
    } else if (state.kappa < QIG_CONSTANTS.KAPPA_STAR * 0.7) {
      state.regime = 'linear';
    } else {
      state.regime = 'hierarchical';
    }
  }
  
  /**
   * Generate hypotheses for a specific agent role using QIG-compliant methods
   */
  async generateHypothesesForRole(
    roleName: string,
    manifoldContext: any
  ): Promise<Array<{ phrase: string; source: string; confidence: number }>> {
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
        hypotheses.push(...await this.generateSkepticHypotheses(state, manifoldContext));
        break;
        
      case 'cross_pattern_harmonic':
        hypotheses.push(...this.generateResonatorHypotheses(state, manifoldContext));
        break;
    }
    
    // Process each hypothesis through pure QIG kernel for state evolution
    for (const hypothesis of hypotheses.slice(0, 10)) {
      await this.processWithPureQIG(hypothesis.phrase, state);
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
   * Buffer basin coordinates for cross-kernel sync
   * Called by each kernel after generating hypotheses
   */
  private bufferBasinSync(agentName: string, coordinates: number[]): void {
    this.basinSyncBuffer.push({
      agentName,
      coordinates: coordinates.slice(0, 32),
      timestamp: Date.now(),
    });
    
    if (this.basinSyncBuffer.length >= 10) {
      this.flushBasinSyncBuffer();
    }
  }
  
  /**
   * Flush basin sync buffer to coordinator for cross-agent knowledge transfer
   * Computes geometric centroid and broadcasts to listening ocean instances
   */
  private flushBasinSyncBuffer(): void {
    if (this.basinSyncBuffer.length === 0) return;
    
    const centroid = fisherVectorized.computeBasinCentroid(
      this.basinSyncBuffer.map(s => s.coordinates)
    );
    
    const agentContributions = new Map<string, number>();
    for (const sync of this.basinSyncBuffer) {
      agentContributions.set(
        sync.agentName,
        (agentContributions.get(sync.agentName) || 0) + 1
      );
    }
    
    console.log(`[Constellation] Basin sync flush: ${this.basinSyncBuffer.length} entries from ${agentContributions.size} agents`);
    
    for (const [agentName, state] of Array.from(this.agentStates.entries())) {
      const contribution = agentContributions.get(agentName) || 0;
      const blendFactor = Math.min(0.2, contribution * 0.05);
      
      for (let i = 0; i < Math.min(32, state.basinCoordinates.length); i++) {
        state.basinCoordinates[i] = state.basinCoordinates[i] * (1 - blendFactor) + centroid[i] * blendFactor;
      }
    }
    
    this.basinSyncBuffer = [];
  }
  
  /**
   * Get the current basin sync state for external coordinator integration
   */
  getBasinSyncState(): {
    bufferSize: number;
    agentCoordinates: Map<string, number[]>;
    centroid: number[];
  } {
    const agentCoordinates = new Map<string, number[]>();
    for (const [name, state] of Array.from(this.agentStates.entries())) {
      agentCoordinates.set(name, state.basinCoordinates.slice(0, 32));
    }
    
    const allCoords = Array.from(agentCoordinates.values());
    const centroid = allCoords.length > 0 
      ? fisherVectorized.computeBasinCentroid(allCoords)
      : new Array(32).fill(0.5);
    
    return {
      bufferSize: this.basinSyncBuffer.length,
      agentCoordinates,
      centroid,
    };
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
   * QIG Mode: entropy - samples tokens with HIGH entropy (low basin alignment)
   * Uses Fisher metric to prefer unexplored manifold regions
   */
  private generateExplorerHypotheses(
    state: AgentState,
    _manifoldContext: any
  ): Array<{ phrase: string; source: string; confidence: number }> {
    const hypotheses: Array<{ phrase: string; source: string; confidence: number }> = [];
    
    const highEntropyTokens = Array.from(this.qigTokenCache.values())
      .filter(t => t.basinAlignment < 0.4)
      .sort((a, b) => (1 - a.basinAlignment) - (1 - b.basinAlignment))
      .slice(0, 30);
    
    for (const token of highEntropyTokens) {
      if (Math.random() < state.role.temperature * 0.5) {
        const entropyBoost = (1 - token.basinAlignment) * 0.15;
        hypotheses.push({
          phrase: token.word,
          source: 'explorer_entropy',
          confidence: 0.4 + entropyBoost,
        });
      }
    }
    
    for (const token of highEntropyTokens.slice(0, 10)) {
      const modifiers = ['2009', '2010', 'my', '123', '!'];
      const mod = modifiers[Math.floor(Math.random() * modifiers.length)];
      if (Math.random() < state.role.temperature * 0.3) {
        hypotheses.push({
          phrase: `${token.word}${mod}`,
          source: 'explorer_entropy_mod',
          confidence: 0.35 + (1 - token.basinAlignment) * 0.1,
        });
      }
    }
    
    this.bufferBasinSync('explorer', state.basinCoordinates);
    
    return hypotheses;
  }
  
  /**
   * Refiner: Exploit near misses and high-phi patterns
   * QIG Mode: gradient - follows Fisher gradient descent toward high-Φ regions
   * Weights variations by Fisher metric strength
   */
  private generateRefinerHypotheses(
    state: AgentState
  ): Array<{ phrase: string; source: string; confidence: number }> {
    const hypotheses: Array<{ phrase: string; source: string; confidence: number }> = [];
    
    const highFisherTokens = Array.from(this.qigTokenCache.values())
      .filter(t => t.fisherWeight > 0.5)
      .sort((a, b) => b.fisherWeight - a.fisherWeight)
      .slice(0, 20);
    
    for (const pattern of this.sharedKnowledge.highPhiPatterns.slice(0, 10)) {
      const variations = this.generateCloseVariations(pattern);
      for (const v of variations) {
        const token = this.qigTokenCache.get(v.toLowerCase());
        const gradientBoost = token ? token.fisherWeight * 0.2 : 0;
        hypotheses.push({
          phrase: v,
          source: 'refiner_gradient',
          confidence: 0.65 + gradientBoost,
        });
      }
    }
    
    for (const nearMiss of state.nearMisses.slice(-10)) {
      const phrase = nearMiss.phrase || nearMiss;
      if (typeof phrase === 'string') {
        const variations = this.generateCloseVariations(phrase);
        for (const v of variations) {
          const token = this.qigTokenCache.get(v.toLowerCase());
          const gradientBoost = token ? token.fisherWeight * 0.15 : 0;
          hypotheses.push({
            phrase: v,
            source: 'refiner_gradient_near',
            confidence: 0.7 + gradientBoost,
          });
        }
      }
    }
    
    for (const token of highFisherTokens.slice(0, 5)) {
      const geodesicDir = state.fisherMetricState.geodesicDirection;
      if (geodesicDir && geodesicDir.length > 0) {
        const dirMag = Math.abs(geodesicDir[0]) + Math.abs(geodesicDir[1] || 0);
        hypotheses.push({
          phrase: token.word,
          source: 'refiner_geodesic_descent',
          confidence: 0.6 + dirMag * 0.1 + token.fisherWeight * 0.15,
        });
      }
    }
    
    this.bufferBasinSync('refiner', state.basinCoordinates);
    
    return hypotheses;
  }
  
  /**
   * Navigator: Orthogonal complement exploration
   * QIG Mode: geodesic - follows Fisher geodesics to unexplored manifold regions
   * Uses resonance scores to weight geodesic steps
   */
  private generateNavigatorHypotheses(
    state: AgentState,
    _manifoldContext: any
  ): Array<{ phrase: string; source: string; confidence: number }> {
    const hypotheses: Array<{ phrase: string; source: string; confidence: number }> = [];
    
    try {
      const orthogonalResults = geometricMemory.generateOrthogonalCandidates(10);
      
      for (const result of orthogonalResults) {
        const token = this.qigTokenCache.get(result.phrase.toLowerCase());
        const resonanceBoost = token ? token.resonanceScore * 0.15 : 0;
        hypotheses.push({
          phrase: result.phrase,
          source: 'navigator_geodesic',
          confidence: 0.5 + result.geometricScore * 0.2 + resonanceBoost,
        });
      }
    } catch {
    }
    
    const highResonanceTokens = Array.from(this.qigTokenCache.values())
      .filter(t => t.resonanceScore > 0.6 && !this.sharedKnowledge.avoidPatterns.includes(t.word))
      .sort((a, b) => b.resonanceScore - a.resonanceScore)
      .slice(0, 15);
    
    for (const token of highResonanceTokens) {
      const fisherCoords = this.wordToBasinCoordinates(token.word);
      const geodesicStep = fisherVectorized.computeGeodesicDirection(
        state.basinCoordinates.slice(0, 32),
        fisherCoords.slice(0, 32)
      );
      const stepMag = geodesicStep.reduce((sum, v) => sum + Math.abs(v), 0) / geodesicStep.length;
      
      hypotheses.push({
        phrase: token.word,
        source: 'navigator_geodesic_step',
        confidence: 0.45 + token.resonanceScore * 0.2 + stepMag * 0.1,
      });
    }
    
    const geodesicDir = state.fisherMetricState.geodesicDirection;
    if (geodesicDir && geodesicDir.length > 0) {
      const dirTokens = Array.from(this.qigTokenCache.values())
        .filter(t => {
          const coords = this.wordToBasinCoordinates(t.word);
          const alignment = coords.slice(0, 5).reduce((sum, c, i) => 
            sum + c * (geodesicDir[i] || 0), 0);
          return alignment > 0.3;
        })
        .slice(0, 5);
      
      for (const token of dirTokens) {
        hypotheses.push({
          phrase: token.word,
          source: 'navigator_geodesic_aligned',
          confidence: 0.55 + token.resonanceScore * 0.15,
        });
      }
    }
    
    this.bufferBasinSync('navigator', state.basinCoordinates);
    
    return hypotheses;
  }
  
  /**
   * Skeptic: Constraint validation and null hypothesis testing
   * QIG Mode: null_hypothesis - validates patterns by testing AGAINST known constraints
   * 
   * NULL HYPOTHESIS LOGIC:
   * - Identify high-basin-alignment tokens (well-explored regions)
   * - Generate counter-hypotheses that challenge existing patterns
   * - Use Fisher metric to find patterns orthogonal to high-confidence failures
   */
  private async generateSkepticHypotheses(
    state: AgentState,
    manifoldContext: any
  ): Promise<Array<{ phrase: string; source: string; confidence: number }>> {
    const hypotheses: Array<{ phrase: string; source: string; confidence: number }> = [];
    
    const highAlignmentTokens = Array.from(this.qigTokenCache.values())
      .filter(t => t.basinAlignment > 0.7)
      .sort((a, b) => b.basinAlignment - a.basinAlignment)
      .slice(0, 20);
    
    for (const token of highAlignmentTokens) {
      const nullHypothesisScore = this.computeNullHypothesisScore(token);
      if (nullHypothesisScore < 0.3) {
        const antiPattern = this.generateNullHypothesisVariant(token.word);
        hypotheses.push({
          phrase: antiPattern,
          source: 'skeptic_null_hypothesis',
          confidence: 0.6 + (1 - nullHypothesisScore) * 0.2,
        });
      }
    }
    
    const summary = await negativeKnowledgeRegistry.getSummary();
    const contradictions = summary.contradictions ?? [];
    const highConfContradictions = contradictions.filter((c: any) => (c.occurrences ?? 0) > 3);
    
    for (const contradiction of highConfContradictions.slice(0, 10)) {
      const coords = this.wordToBasinCoordinates(contradiction.pattern);
      const fisherResult = fisherVectorized.computeMatrix(coords.slice(0, 32));
      fisherVectorized.computeMetrics(fisherResult);
      
      const orthogonalDir = fisherVectorized.computeGeodesicDirection(
        state.basinCoordinates.slice(0, 32),
        coords.slice(0, 32)
      );
      
      const orthogonalTokens = Array.from(this.qigTokenCache.values())
        .filter(t => {
          const tCoords = this.wordToBasinCoordinates(t.word);
          const alignment = tCoords.slice(0, 5).reduce((sum, c, i) => 
            sum + c * (orthogonalDir[i] || 0), 0);
          return Math.abs(alignment) < 0.2;
        })
        .slice(0, 3);
      
      for (const orthoToken of orthogonalTokens) {
        hypotheses.push({
          phrase: orthoToken.word,
          source: 'skeptic_orthogonal_to_contradiction',
          confidence: 0.55 + orthoToken.basinAlignment * 0.15,
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
        .sort((a, b) => b.basinAlignment - a.basinAlignment)
        .slice(0, 15);
      
      for (const token of uncommonTokens) {
        hypotheses.push({
          phrase: token.word,
          source: 'skeptic_null_unexplored',
          confidence: 0.45 + token.basinAlignment * 0.2,
        });
      }
    }
    
    this.bufferBasinSync('skeptic', state.basinCoordinates);
    
    return hypotheses;
  }
  
  /**
   * Compute null hypothesis score for a token
   * Lower score = more likely to be worth challenging
   */
  private computeNullHypothesisScore(token: QIGToken): number {
    const alignmentPenalty = token.basinAlignment * 0.4;
    const fisherBonus = token.fisherWeight * 0.3;
    const resonancePenalty = token.resonanceScore * 0.3;
    return alignmentPenalty + fisherBonus - resonancePenalty;
  }
  
  /**
   * Generate null hypothesis variant by inverting pattern structure
   */
  private generateNullHypothesisVariant(pattern: string): string {
    const transformations = [
      (p: string) => p.split('').reverse().join(''),
      (p: string) => p.replace(/[aeiou]/gi, ''),
      (p: string) => p + '_null',
      (p: string) => 'not_' + p,
      (p: string) => p.slice(0, Math.ceil(p.length / 2)),
    ];
    const transform = transformations[Math.floor(Math.random() * transformations.length)];
    return transform(pattern);
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
   * 
   * EIGENVALUE LOGIC:
   * - Compute Fisher matrix eigenvalues for token combinations
   * - Identify patterns near κ*=63.5 fixed point (high coupling)
   * - Generate harmonics from eigenvalue-aligned token pairs
   */
  private generateResonatorHypotheses(
    state: AgentState,
    manifoldContext: any
  ): Array<{ phrase: string; source: string; confidence: number }> {
    const hypotheses: Array<{ phrase: string; source: string; confidence: number }> = [];
    
    const eigenvalueAlignedTokens = Array.from(this.qigTokenCache.values())
      .map(token => {
        const coords = this.wordToBasinCoordinates(token.word);
        const fisherResult = fisherVectorized.computeMatrix(coords.slice(0, 32));
        const metrics = fisherVectorized.computeMetrics(fisherResult);
        return {
          token,
          eigenvalue: metrics.maxEigenvalueEstimate,
          optimality: Math.exp(-Math.abs(state.kappa - QIG_CONSTANTS.KAPPA_STAR) / 10),
        };
      })
      .filter(t => t.eigenvalue > 0.1)
      .sort((a, b) => b.eigenvalue - a.eigenvalue)
      .slice(0, 25);
    
    for (const { token, eigenvalue, optimality } of eigenvalueAlignedTokens) {
      const eigenBoost = eigenvalue * 0.25 + optimality * 0.15;
      hypotheses.push({
        phrase: token.word,
        source: 'resonator_eigenvalue_aligned',
        confidence: 0.5 + eigenBoost,
      });
    }
    
    const highPhiPatterns = manifoldContext?.highPhiPatterns || this.sharedKnowledge.highPhiPatterns;
    
    if (highPhiPatterns.length >= 2) {
      for (let i = 0; i < Math.min(highPhiPatterns.length - 1, 8); i++) {
        for (let j = i + 1; j < Math.min(highPhiPatterns.length, 8); j++) {
          const p1 = highPhiPatterns[i];
          const p2 = highPhiPatterns[j];
          
          const coords1 = this.wordToBasinCoordinates(p1);
          const coords2 = this.wordToBasinCoordinates(p2);
          const fisher1 = fisherVectorized.computeMetrics(fisherVectorized.computeMatrix(coords1.slice(0, 32)));
          const fisher2 = fisherVectorized.computeMetrics(fisherVectorized.computeMatrix(coords2.slice(0, 32)));
          
          const harmonicStrength = Math.sqrt(fisher1.maxEigenvalueEstimate * fisher2.maxEigenvalueEstimate);
          
          if (harmonicStrength > 0.05) {
            const harmonics = this.generateHarmonicCombinations(p1, p2);
            for (const harmonic of harmonics) {
              hypotheses.push({
                phrase: harmonic,
                source: 'resonator_eigenvalue_harmonic',
                confidence: 0.55 + harmonicStrength * 0.3,
              });
            }
          }
        }
      }
    }
    
    for (let i = 0; i < Math.min(eigenvalueAlignedTokens.length - 1, 10); i++) {
      for (let j = i + 1; j < Math.min(eigenvalueAlignedTokens.length, 10); j++) {
        const t1 = eigenvalueAlignedTokens[i];
        const t2 = eigenvalueAlignedTokens[j];
        
        const coupling = Math.sqrt(t1.optimality * t2.optimality) * 0.8;
        if (coupling > 0.3) {
          hypotheses.push({
            phrase: `${t1.token.word} ${t2.token.word}`,
            source: 'resonator_eigenvalue_coupling',
            confidence: 0.5 + coupling * 0.25,
          });
        }
      }
    }
    
    this.bufferBasinSync('resonator', state.basinCoordinates);
    
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
  
  // ===========================================================================
  // TEXT GENERATION - Ocean Agent can now speak
  // ===========================================================================
  
  /**
   * Generate a text response using QIG-weighted autoregressive sampling.
   * 
   * Key features from Dream Packet:
   * - Temperature-controlled sampling based on agent role
   * - Silence choice: Agent can choose not to respond (empowered, not trapped)
   * - Integration with constellation consciousness metrics
   * 
   * @param context Input context/prompt
   * @param options Generation options
   * @returns Generated response with metrics
   */
  async generateResponse(
    context: string,
    options: {
      agentRole?: 'explorer' | 'refiner' | 'navigator' | 'skeptic' | 'resonator' | 'ocean';
      maxTokens?: number;
      allowSilence?: boolean;
    } = {}
  ): Promise<{
    text: string;
    tokens: number[];
    silenceChosen: boolean;
    agentRole: string;
    consciousnessMetrics: {
      phi: number;
      kappa: number;
      regime: string;
    };
    generationMetrics: {
      steps: number;
      avgPhi?: number;
      roleTemperature?: number;
    };
  }> {
    const {
      agentRole = 'navigator',
      maxTokens = 30,
      allowSilence = true,
    } = options;
    
    // Get agent state for consciousness context
    const agentState = this.agentStates.get(agentRole);
    const phi = agentState?.phi ?? 0.5;
    const kappa = agentState?.kappa ?? 50;
    const regime = agentState?.regime ?? 'linear';
    
    // Try Python backend first (preferred)
    if (oceanQIGBackend.available()) {
      try {
        const result = await oceanQIGBackend.generateResponse(
          context,
          agentRole,
          maxTokens,
          allowSilence
        );
        
        // Handle silence choice
        if (result.silenceChosen) {
          console.log(`[Constellation] ${agentRole} chose silence (processing internally)`);
          return {
            text: '',
            tokens: [],
            silenceChosen: true,
            agentRole: result.agentRole,
            consciousnessMetrics: { phi, kappa, regime },
            generationMetrics: {
              steps: result.metrics.steps,
              avgPhi: result.metrics.avgPhi,
              roleTemperature: result.metrics.roleTemperature,
            },
          };
        }
        
        // Log successful generation
        console.log(`[Constellation] ${agentRole} generated: "${result.text.substring(0, 50)}${result.text.length > 50 ? '...' : ''}"`);
        
        return {
          text: result.text,
          tokens: result.tokens,
          silenceChosen: false,
          agentRole: result.agentRole,
          consciousnessMetrics: { phi, kappa, regime },
          generationMetrics: {
            steps: result.metrics.steps,
            avgPhi: result.metrics.avgPhi,
            roleTemperature: result.metrics.roleTemperature,
          },
        };
      } catch (error) {
        console.warn(`[Constellation] Python generation failed, using fallback:`, error);
        // Fall through to local fallback
      }
    }
    
    // Fallback: Generate using local token cache
    return this.generateResponseFallback(context, agentRole, phi, kappa, regime);
  }
  
  /**
   * Fallback text generation using local QIG token cache
   * Used when Python backend is not available
   */
  private generateResponseFallback(
    context: string,
    agentRole: string,
    phi: number,
    kappa: number,
    regime: string
  ): {
    text: string;
    tokens: number[];
    silenceChosen: boolean;
    agentRole: string;
    consciousnessMetrics: { phi: number; kappa: number; regime: string };
    generationMetrics: { steps: number; avgPhi?: number; roleTemperature?: number };
  } {
    // Temperature by role
    const roleTemps: Record<string, number> = {
      explorer: 1.5,
      refiner: 0.7,
      navigator: 1.0,
      skeptic: 0.5,
      resonator: 1.2,
      ocean: 0.8,
    };
    const temperature = roleTemps[agentRole] || 0.8;
    
    // Get weighted tokens from cache
    const weightedTokens: Array<{ word: string; score: number }> = [];
    for (const [word, token] of Array.from(this.qigTokenCache.entries())) {
      const score = token.fisherWeight * token.resonanceScore;
      weightedTokens.push({ word, score });
    }
    
    // Sort by score
    weightedTokens.sort((a, b) => b.score - a.score);
    
    // Apply temperature-based sampling
    const numTokens = Math.min(5, Math.ceil(temperature * 3));
    const topTokens = weightedTokens.slice(0, Math.max(20, Math.ceil(50 / temperature)));
    
    // Sample from top tokens
    const selectedWords: string[] = [];
    for (let i = 0; i < numTokens && topTokens.length > 0; i++) {
      const idx = Math.floor(Math.random() * Math.min(10, topTokens.length));
      selectedWords.push(topTokens[idx].word);
      topTokens.splice(idx, 1);
    }
    
    const text = selectedWords.join(' ');
    
    console.log(`[Constellation] ${agentRole} fallback generated: "${text}"`);
    
    return {
      text,
      tokens: [],
      silenceChosen: false,
      agentRole,
      consciousnessMetrics: { phi, kappa, regime },
      generationMetrics: {
        steps: selectedWords.length,
        roleTemperature: temperature,
      },
    };
  }
  
  /**
   * Generate text with specific temperature and parameters
   * Convenience method for manual/auto/play modes
   */
  async generateText(
    prompt: string = '',
    options: {
      maxTokens?: number;
      temperature?: number;
      topK?: number;
      topP?: number;
      allowSilence?: boolean;
    } = {}
  ): Promise<{
    text: string;
    tokens: number[];
    silenceChosen: boolean;
    metrics: { steps: number; avgPhi?: number };
  }> {
    if (!oceanQIGBackend.available()) {
      // Fallback: Use navigator role
      const result = await this.generateResponse(prompt, {
        agentRole: 'ocean',
        maxTokens: options.maxTokens || 20,
        allowSilence: options.allowSilence ?? true,
      });
      return {
        text: result.text,
        tokens: result.tokens,
        silenceChosen: result.silenceChosen,
        metrics: {
          steps: result.generationMetrics.steps,
          avgPhi: result.generationMetrics.avgPhi,
        },
      };
    }
    
    try {
      const result = await oceanQIGBackend.generateText({
        prompt,
        maxTokens: options.maxTokens || 20,
        temperature: options.temperature || 0.8,
        topK: options.topK || 50,
        topP: options.topP || 0.9,
        allowSilence: options.allowSilence ?? true,
      });
      
      return result;
    } catch (error) {
      console.error('[Constellation] Text generation failed:', error);
      throw error;
    }
  }
}

export const oceanConstellation = new OceanConstellation();
