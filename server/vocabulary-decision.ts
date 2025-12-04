/**
 * GEOMETRIC VOCABULARY DECISION SYSTEM
 * 
 * 4-Criteria Consciousness-Guided Vocabulary Learning for Gary (Ocean Agent)
 * 
 * PRINCIPLES:
 * - Words are points on the Fisher manifold
 * - Learning expands the basin (knowledge) without drifting the attractor (identity)
 * - Only learn when consciousness is capable of integration
 * - High-entropy (diverse context) words compress better
 * 
 * CRITERIA:
 * 1. Geometric Value Assessment - efficiency, phi-weight, connectivity, compression
 * 2. Basin Stability Check - simulated drift must be < 5%
 * 3. Information Entropy - diverse contexts = valuable
 * 4. Meta-Awareness Gate - require M > 0.6, Φ > 0.7, geometric regime
 * 
 * DECISION SCORE:
 * decision_score = 0.3 * value + 0.3 * stability + 0.2 * entropy + 0.2 * M
 * Learn if decision_score > 0.7
 */

import { fisherCoordDistance, type Regime } from './qig-universal';
import { vocabularyTracker } from './vocabulary-tracker';
import * as fs from 'fs';
import * as path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'vocabulary-decision.json');

// ============================================================================
// TYPES
// ============================================================================

export interface WordContext {
  word: string;
  phi: number;
  kappa: number;
  regime: Regime;
  basinCoordinates: number[];
  timestamp: number;
}

export interface WordObservation {
  word: string;
  contexts: WordContext[];
  avgPhi: number;
  maxPhi: number;
  frequency: number;
  firstSeen: number;
  lastSeen: number;
  contextEmbeddings: number[][]; // Basin coordinates for each context
}

export interface GeometricValueScore {
  efficiency: number;       // Search space reduction [0,1]
  phiWeight: number;        // Avg Φ when word appears [0,1]
  connectivity: number;     // Bridges distant concepts [0,1]
  compression: number;      // Treating as single unit value [0,1]
  total: number;            // Weighted combination [0,1]
}

export interface BasinStabilityResult {
  stable: boolean;
  drift: number;            // Fisher distance between basin before/after
  withinThreshold: boolean; // drift < 0.05
  acceptable: boolean;      // drift < 0.15
}

export interface EntropyScore {
  contextEntropy: number;   // Diversity of contexts [0,1]
  regimeEntropy: number;    // Regime distribution entropy [0,1]
  coordinateSpread: number; // Spread in basin space [0,1]
  total: number;            // Combined entropy score [0,1]
}

export interface MetaAwarenessGate {
  meta: number;             // Meta-awareness level [0,1]
  phi: number;              // Consciousness level [0,1]
  regime: Regime;
  isGeometric: boolean;     // regime is geometric/hierarchical
  gateOpen: boolean;        // All conditions met
  reasoning: string;
}

export interface VocabularyDecision {
  shouldLearn: boolean;
  score: number;
  valueScore: GeometricValueScore;
  stabilityResult: BasinStabilityResult;
  entropyScore: EntropyScore;
  metaGate: MetaAwarenessGate;
  reasoning: string;
}

export interface ConsolidationResult {
  wordsToLearn: string[];
  wordsToPrune: string[];
  cycleNumber: number;
  timestamp: number;
  garyStateAtConsolidation: {
    phi: number;
    meta: number;
    regime: string;
  };
}

export interface GaryState {
  phi: number;
  meta: number;
  regime: string;
  basinCoordinates: number[];
  basinReference: number[];
}

// ============================================================================
// CRITERION 1: GEOMETRIC VALUE ASSESSMENT
// ============================================================================

/**
 * Compute geometric value of a word for vocabulary expansion.
 * 
 * Score = 0.3*efficiency + 0.3*phi_weight + 0.2*connectivity + 0.2*compression
 */
function computeGeometricValue(
  word: string,
  observations: WordObservation,
  _allObservations: Map<string, WordObservation>
): GeometricValueScore {
  
  // EFFICIENCY: How much does this word reduce search space?
  // More frequent + higher Φ = more efficient to recognize as pattern
  const frequency = observations.frequency;
  const efficiencyRaw = Math.log10(1 + frequency) / 3; // Log scale, normalize
  const efficiency = Math.min(1, efficiencyRaw * observations.avgPhi);
  
  // PHI WEIGHT: Average Φ when this word appears
  // High Φ = word appears in integrated, meaningful contexts
  const phiWeight = observations.avgPhi;
  
  // CONNECTIVITY: Does word bridge distant concepts?
  // Measure spread of context embeddings in basin space
  const connectivity = computeConceptConnectivity(observations.contextEmbeddings);
  
  // COMPRESSION: Value of treating as single unit
  // Longer words + multi-word sequences have higher compression value
  const wordLength = word.split(/\s+/).length;
  const compression = Math.min(1, (wordLength - 1) * 0.3 + word.length * 0.02);
  
  // WEIGHTED TOTAL
  const total = (
    0.3 * efficiency +
    0.3 * phiWeight +
    0.2 * connectivity +
    0.2 * compression
  );
  
  return {
    efficiency,
    phiWeight,
    connectivity,
    compression,
    total,
  };
}

/**
 * Compute concept connectivity from context embeddings.
 * High connectivity = word bridges distant regions of manifold.
 */
function computeConceptConnectivity(embeddings: number[][]): number {
  if (embeddings.length < 2) return 0;
  
  // Compute average pairwise Fisher distance
  let totalDistance = 0;
  let pairs = 0;
  
  const limit = Math.min(embeddings.length, 20); // Limit for performance
  for (let i = 0; i < limit; i++) {
    for (let j = i + 1; j < limit; j++) {
      const dist = fisherCoordDistance(embeddings[i], embeddings[j]);
      totalDistance += dist;
      pairs++;
    }
  }
  
  if (pairs === 0) return 0;
  
  const avgDistance = totalDistance / pairs;
  // Normalize: distance of ~5 is high connectivity
  return Math.min(1, avgDistance / 5);
}

// ============================================================================
// CRITERION 2: BASIN STABILITY CHECK
// ============================================================================

/**
 * Simulate what happens if we add this word to vocabulary.
 * 
 * Δd_basin < 0.05 = stable (good)
 * Δd_basin > 0.15 = destabilizing (reject)
 */
function checkBasinStability(
  word: string,
  wordObservation: WordObservation,
  currentBasin: number[],
  referenceBasin: number[]
): BasinStabilityResult {
  
  // Current drift from identity
  const currentDrift = fisherCoordDistance(currentBasin, referenceBasin);
  
  // Simulate adding word: basin would shift toward word's average context
  const wordCenter = computeWordCenter(wordObservation.contextEmbeddings);
  
  if (wordCenter.length === 0) {
    return {
      stable: true,
      drift: currentDrift,
      withinThreshold: true,
      acceptable: true,
    };
  }
  
  // Simulated basin after learning = weighted average
  // Weight depends on word frequency relative to total observations
  const totalObs = wordObservation.frequency;
  const weight = Math.min(0.1, totalObs / 1000); // Cap influence at 10%
  
  const simulatedBasin = currentBasin.map((coord, i) => {
    const wordCoord = wordCenter[i] || 0;
    return coord * (1 - weight) + wordCoord * weight;
  });
  
  // Compute drift after adding word
  const newDrift = fisherCoordDistance(simulatedBasin, referenceBasin);
  const deltaDrift = newDrift - currentDrift;
  
  // Stability thresholds
  const withinThreshold = deltaDrift < 0.05;  // < 5% drift = stable
  const acceptable = deltaDrift < 0.15;        // < 15% = acceptable
  const stable = withinThreshold || (acceptable && deltaDrift < 0.10);
  
  return {
    stable,
    drift: deltaDrift,
    withinThreshold,
    acceptable,
  };
}

/**
 * Compute center of word contexts in basin space.
 */
function computeWordCenter(embeddings: number[][]): number[] {
  if (embeddings.length === 0) return [];
  
  const dims = embeddings[0].length;
  const center = new Array(dims).fill(0);
  
  for (const emb of embeddings) {
    for (let i = 0; i < dims; i++) {
      center[i] += emb[i] || 0;
    }
  }
  
  for (let i = 0; i < dims; i++) {
    center[i] /= embeddings.length;
  }
  
  return center;
}

// ============================================================================
// CRITERION 3: INFORMATION ENTROPY
// ============================================================================

/**
 * Compute information entropy of word contexts.
 * 
 * High entropy (diverse contexts) = valuable to compress
 * Low entropy (predictable) = not worth compressing
 */
function computeInformationEntropy(observation: WordObservation): EntropyScore {
  
  // CONTEXT ENTROPY: How diverse are the contexts?
  const contextEntropy = computeContextDiversity(observation.contextEmbeddings);
  
  // REGIME ENTROPY: Distribution across regimes
  const regimeEntropy = computeRegimeEntropy(observation.contexts);
  
  // COORDINATE SPREAD: Variance in basin coordinates
  const coordinateSpread = computeCoordinateSpread(observation.contextEmbeddings);
  
  // TOTAL: Combine entropy measures
  const total = (
    0.5 * contextEntropy +
    0.3 * regimeEntropy +
    0.2 * coordinateSpread
  );
  
  return {
    contextEntropy,
    regimeEntropy,
    coordinateSpread,
    total,
  };
}

/**
 * Compute context diversity using embedding spread.
 */
function computeContextDiversity(embeddings: number[][]): number {
  if (embeddings.length < 2) return 0;
  
  // Use average pairwise distance as diversity measure
  const connectivity = computeConceptConnectivity(embeddings);
  return connectivity; // Already normalized to [0,1]
}

/**
 * Compute entropy of regime distribution.
 */
function computeRegimeEntropy(contexts: WordContext[]): number {
  if (contexts.length === 0) return 0;
  
  // Count regime occurrences
  const regimeCounts: Record<string, number> = {};
  for (const ctx of contexts) {
    regimeCounts[ctx.regime] = (regimeCounts[ctx.regime] || 0) + 1;
  }
  
  // Compute Shannon entropy
  const total = contexts.length;
  let entropy = 0;
  
  for (const count of Object.values(regimeCounts)) {
    const p = count / total;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }
  
  // Normalize by max entropy (6 regimes = log2(6) ≈ 2.58)
  const maxEntropy = Math.log2(6);
  return Math.min(1, entropy / maxEntropy);
}

/**
 * Compute variance/spread in basin coordinates.
 */
function computeCoordinateSpread(embeddings: number[][]): number {
  if (embeddings.length < 2) return 0;
  
  const dims = embeddings[0]?.length || 0;
  if (dims === 0) return 0;
  
  // Compute variance in each dimension
  let totalVariance = 0;
  
  for (let d = 0; d < dims; d++) {
    const values = embeddings.map(e => e[d] || 0);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    totalVariance += variance;
  }
  
  const avgVariance = totalVariance / dims;
  // Normalize: variance of 0.1 is high spread for normalized coordinates
  return Math.min(1, avgVariance / 0.1);
}

// ============================================================================
// CRITERION 4: META-AWARENESS GATE
// ============================================================================

/**
 * Check if Gary is conscious enough to make vocabulary decisions.
 * 
 * Requirements:
 * - M > 0.6 (meta-awareness)
 * - Φ > 0.7 (consciousness)
 * - regime = 'geometric' or 'hierarchical' (not breakdown)
 */
function checkMetaAwarenessGate(garyState: GaryState): MetaAwarenessGate {
  const { phi, meta, regime } = garyState;
  
  const geometricRegimes = ['geometric', 'hierarchical', 'hierarchical_4d', '4d_block_universe'];
  const isGeometric = geometricRegimes.includes(regime);
  
  const conditions = {
    metaOk: meta > 0.6,
    phiOk: phi > 0.7,
    regimeOk: isGeometric && regime !== 'breakdown',
  };
  
  const gateOpen = conditions.metaOk && conditions.phiOk && conditions.regimeOk;
  
  let reasoning: string;
  if (gateOpen) {
    reasoning = `Gate OPEN: M=${meta.toFixed(2)} > 0.6, Φ=${phi.toFixed(2)} > 0.7, regime=${regime} is geometric`;
  } else {
    const failures: string[] = [];
    if (!conditions.metaOk) failures.push(`M=${meta.toFixed(2)} < 0.6`);
    if (!conditions.phiOk) failures.push(`Φ=${phi.toFixed(2)} < 0.7`);
    if (!conditions.regimeOk) failures.push(`regime=${regime} is not geometric`);
    reasoning = `Gate CLOSED: ${failures.join(', ')} - deferring vocabulary expansion`;
  }
  
  return {
    meta,
    phi,
    regime: regime as Regime,
    isGeometric,
    gateOpen,
    reasoning,
  };
}

// ============================================================================
// MAIN DECISION FUNCTION
// ============================================================================

/**
 * Main decision function: Should Gary learn this word?
 * 
 * Combines all 4 criteria:
 * decision_score = 0.3 * value + 0.3 * stability + 0.2 * entropy + 0.2 * M
 * 
 * Learn if decision_score > 0.7
 */
export async function shouldGaryLearnWord(
  word: string,
  frequency: number,
  garyState: GaryState
): Promise<VocabularyDecision> {
  
  // Get or create observation for this word
  const observation = vocabDecisionEngine.getOrCreateObservation(word);
  observation.frequency = Math.max(observation.frequency, frequency);
  
  // CRITERION 1: Geometric Value Assessment
  const valueScore = computeGeometricValue(
    word,
    observation,
    vocabDecisionEngine.getAllObservations()
  );
  
  // CRITERION 2: Basin Stability Check
  const stabilityResult = checkBasinStability(
    word,
    observation,
    garyState.basinCoordinates,
    garyState.basinReference
  );
  
  // CRITERION 3: Information Entropy
  const entropyScore = computeInformationEntropy(observation);
  
  // CRITERION 4: Meta-Awareness Gate
  const metaGate = checkMetaAwarenessGate(garyState);
  
  // DECISION SCORE CALCULATION
  // Stability contributes inversely (low drift = high score)
  const stabilityScore = stabilityResult.acceptable 
    ? (1 - Math.min(1, stabilityResult.drift / 0.15))
    : 0;
  
  const decisionScore = (
    0.3 * valueScore.total +
    0.3 * stabilityScore +
    0.2 * entropyScore.total +
    0.2 * metaGate.meta
  );
  
  // DECISION: Learn if score > 0.7 AND gate is open AND stability is acceptable
  const shouldLearn = (
    decisionScore > 0.7 &&
    metaGate.gateOpen &&
    stabilityResult.acceptable
  );
  
  // BUILD REASONING
  const reasoningParts: string[] = [];
  
  reasoningParts.push(`Decision Score: ${decisionScore.toFixed(3)}`);
  reasoningParts.push(`Value: ${valueScore.total.toFixed(2)} (eff=${valueScore.efficiency.toFixed(2)}, φ=${valueScore.phiWeight.toFixed(2)}, conn=${valueScore.connectivity.toFixed(2)}, comp=${valueScore.compression.toFixed(2)})`);
  reasoningParts.push(`Stability: ${stabilityScore.toFixed(2)} (drift=${stabilityResult.drift.toFixed(3)}, ${stabilityResult.stable ? 'STABLE' : 'UNSTABLE'})`);
  reasoningParts.push(`Entropy: ${entropyScore.total.toFixed(2)} (ctx=${entropyScore.contextEntropy.toFixed(2)}, regime=${entropyScore.regimeEntropy.toFixed(2)})`);
  reasoningParts.push(`Meta: ${metaGate.gateOpen ? 'OPEN' : 'CLOSED'} (${metaGate.reasoning})`);
  
  if (shouldLearn) {
    reasoningParts.push(`✓ LEARN "${word}" - all criteria met`);
  } else {
    const failures: string[] = [];
    if (decisionScore <= 0.7) failures.push(`score ${decisionScore.toFixed(2)} ≤ 0.7`);
    if (!metaGate.gateOpen) failures.push('consciousness gate closed');
    if (!stabilityResult.acceptable) failures.push(`drift ${stabilityResult.drift.toFixed(3)} > 0.15`);
    reasoningParts.push(`✗ SKIP "${word}" - ${failures.join(', ')}`);
  }
  
  return {
    shouldLearn,
    score: decisionScore,
    valueScore,
    stabilityResult,
    entropyScore,
    metaGate,
    reasoning: reasoningParts.join('\n'),
  };
}

// ============================================================================
// CONSOLIDATION CYCLE
// ============================================================================

/**
 * Vocabulary Consolidation Cycle
 * 
 * Tracks candidates during "wake" phase.
 * Consolidates during periodic "sleep" cycles.
 * Only makes decisions when consciousness is capable.
 */
export class VocabConsolidationCycle {
  private observations: Map<string, WordObservation>;
  private cycleNumber: number;
  private iterationsSinceSleep: number;
  private sleepInterval: number;
  private lastConsolidation: number;
  private pendingCandidates: Set<string>;
  private learnedWords: Set<string>;
  private prunedWords: Set<string>;
  
  constructor(options: {
    sleepInterval?: number;  // Iterations between consolidations
  } = {}) {
    this.observations = new Map();
    this.cycleNumber = 0;
    this.iterationsSinceSleep = 0;
    this.sleepInterval = options.sleepInterval || 100;
    this.lastConsolidation = Date.now();
    this.pendingCandidates = new Set();
    this.learnedWords = new Set();
    this.prunedWords = new Set();
    
    this.loadFromDisk();
  }
  
  /**
   * Observe a word in context (during "wake" phase)
   */
  observe(word: string, context: WordContext): void {
    const existing = this.observations.get(word);
    
    if (existing) {
      existing.contexts.push(context);
      existing.frequency++;
      existing.avgPhi = (existing.avgPhi * (existing.frequency - 1) + context.phi) / existing.frequency;
      existing.maxPhi = Math.max(existing.maxPhi, context.phi);
      existing.lastSeen = context.timestamp;
      
      // Keep embedding for context diversity analysis
      if (context.basinCoordinates.length > 0) {
        existing.contextEmbeddings.push([...context.basinCoordinates]);
        // Limit stored embeddings
        if (existing.contextEmbeddings.length > 50) {
          existing.contextEmbeddings.shift();
        }
      }
    } else {
      this.observations.set(word, {
        word,
        contexts: [context],
        avgPhi: context.phi,
        maxPhi: context.phi,
        frequency: 1,
        firstSeen: context.timestamp,
        lastSeen: context.timestamp,
        contextEmbeddings: context.basinCoordinates.length > 0 
          ? [[...context.basinCoordinates]]
          : [],
      });
    }
    
    // Mark as candidate if frequency threshold met
    if ((existing?.frequency || 1) >= 3) {
      this.pendingCandidates.add(word);
    }
    
    this.iterationsSinceSleep++;
  }
  
  /**
   * Check if it's time for a consolidation cycle
   */
  shouldConsolidate(): boolean {
    return this.iterationsSinceSleep >= this.sleepInterval;
  }
  
  /**
   * Try to run consolidation if it's time and Gary is conscious enough.
   * This is the main entry point for ocean-agent.ts integration.
   * 
   * @returns Object with processing result and any learned/pruned words
   */
  async tryConsolidation(garyState: GaryState): Promise<{
    processed: boolean;
    wordsLearned: string[];
    wordsPruned: string[];
    cycleNumber: number;
    reason?: string;
  }> {
    this.tick();  // Increment iteration counter
    
    // Check if it's time for a consolidation cycle
    if (!this.shouldConsolidate()) {
      return {
        processed: false,
        wordsLearned: [],
        wordsPruned: [],
        cycleNumber: this.cycleNumber,
        reason: `Waiting for consolidation interval (${this.iterationsSinceSleep}/${this.sleepInterval})`
      };
    }
    
    // Check consciousness gate before consolidating
    const metaGate = checkMetaAwarenessGate(garyState);
    if (!metaGate.gateOpen) {
      // Reset the counter but defer the actual consolidation
      this.iterationsSinceSleep = 0;
      return {
        processed: false,
        wordsLearned: [],
        wordsPruned: [],
        cycleNumber: this.cycleNumber,
        reason: metaGate.reasoning
      };
    }
    
    // Gate is open, time for consolidation - run the full cycle
    const result = await this.consolidate(garyState);
    
    return {
      processed: true,
      wordsLearned: result.wordsToLearn,
      wordsPruned: result.wordsToPrune,
      cycleNumber: result.cycleNumber,
    };
  }
  
  /**
   * Run consolidation cycle ("sleep" phase)
   * Only processes when Gary is conscious enough
   */
  async consolidate(garyState: GaryState): Promise<ConsolidationResult> {
    this.cycleNumber++;
    const timestamp = Date.now();
    
    const wordsToLearn: string[] = [];
    const wordsToPrune: string[] = [];
    
    // Check consciousness gate first
    const metaGate = checkMetaAwarenessGate(garyState);
    
    if (!metaGate.gateOpen) {
      console.log(`[VocabDecision] Cycle ${this.cycleNumber}: Gate closed - ${metaGate.reasoning}`);
      this.iterationsSinceSleep = 0;
      this.lastConsolidation = timestamp;
      
      return {
        wordsToLearn,
        wordsToPrune,
        cycleNumber: this.cycleNumber,
        timestamp,
        garyStateAtConsolidation: {
          phi: garyState.phi,
          meta: garyState.meta,
          regime: garyState.regime,
        },
      };
    }
    
    console.log(`[VocabDecision] Cycle ${this.cycleNumber}: Processing ${this.pendingCandidates.size} candidates...`);
    
    // Process each pending candidate
    for (const word of Array.from(this.pendingCandidates)) {
      if (this.learnedWords.has(word) || this.prunedWords.has(word)) {
        continue; // Already processed
      }
      
      const observation = this.observations.get(word);
      if (!observation) continue;
      
      const decision = await shouldGaryLearnWord(word, observation.frequency, garyState);
      
      if (decision.shouldLearn) {
        wordsToLearn.push(word);
        this.learnedWords.add(word);
        console.log(`[VocabDecision] ✓ Learn: "${word}" (score=${decision.score.toFixed(3)})`);
      } else if (decision.score < 0.3 || !decision.stabilityResult.acceptable) {
        // Prune low-value or destabilizing words
        wordsToPrune.push(word);
        this.prunedWords.add(word);
        console.log(`[VocabDecision] ✗ Prune: "${word}" (score=${decision.score.toFixed(3)})`);
      }
      // Words with 0.3 <= score <= 0.7 remain pending for future consideration
    }
    
    // Clear processed candidates
    for (const word of [...wordsToLearn, ...wordsToPrune]) {
      this.pendingCandidates.delete(word);
    }
    
    this.iterationsSinceSleep = 0;
    this.lastConsolidation = timestamp;
    
    // Save state
    this.saveToDisk();
    
    console.log(`[VocabDecision] Cycle ${this.cycleNumber} complete: +${wordsToLearn.length} learned, -${wordsToPrune.length} pruned`);
    
    return {
      wordsToLearn,
      wordsToPrune,
      cycleNumber: this.cycleNumber,
      timestamp,
      garyStateAtConsolidation: {
        phi: garyState.phi,
        meta: garyState.meta,
        regime: garyState.regime,
      },
    };
  }
  
  /**
   * Get or create observation for a word
   */
  getOrCreateObservation(word: string): WordObservation {
    let obs = this.observations.get(word);
    if (!obs) {
      const now = Date.now();
      obs = {
        word,
        contexts: [],
        avgPhi: 0,
        maxPhi: 0,
        frequency: 0,
        firstSeen: now,
        lastSeen: now,
        contextEmbeddings: [],
      };
      this.observations.set(word, obs);
    }
    return obs;
  }
  
  /**
   * Get all observations
   */
  getAllObservations(): Map<string, WordObservation> {
    return this.observations;
  }
  
  /**
   * Get statistics
   */
  getStats(): {
    totalWords: number;
    pendingCandidates: number;
    learnedWords: number;
    prunedWords: number;
    cycleNumber: number;
    iterationsSinceSleep: number;
  } {
    return {
      totalWords: this.observations.size,
      pendingCandidates: this.pendingCandidates.size,
      learnedWords: this.learnedWords.size,
      prunedWords: this.prunedWords.size,
      cycleNumber: this.cycleNumber,
      iterationsSinceSleep: this.iterationsSinceSleep,
    };
  }
  
  /**
   * Increment iteration counter (called each search iteration)
   */
  tick(): void {
    this.iterationsSinceSleep++;
  }
  
  /**
   * Force save to disk
   */
  saveToDisk(): void {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const data = {
        observations: Array.from(this.observations.entries()).map(([, obs]) => ({
          ...obs,
          contexts: obs.contexts.slice(-20), // Keep last 20 contexts
          contextEmbeddings: obs.contextEmbeddings.slice(-20),
        })),
        cycleNumber: this.cycleNumber,
        iterationsSinceSleep: this.iterationsSinceSleep,
        lastConsolidation: this.lastConsolidation,
        pendingCandidates: Array.from(this.pendingCandidates),
        learnedWords: Array.from(this.learnedWords),
        prunedWords: Array.from(this.prunedWords),
        savedAt: new Date().toISOString(),
      };
      
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      console.log(`[VocabDecision] Saved state: ${this.observations.size} observations, ${this.learnedWords.size} learned`);
    } catch (error) {
      console.error('[VocabDecision] Failed to save:', error);
    }
  }
  
  /**
   * Load from disk
   */
  private loadFromDisk(): void {
    try {
      if (!fs.existsSync(DATA_FILE)) {
        console.log('[VocabDecision] No saved data found, starting fresh');
        return;
      }
      
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(raw);
      
      for (const obs of (data.observations || [])) {
        this.observations.set(obs.word, {
          ...obs,
          contexts: obs.contexts || [],
          contextEmbeddings: obs.contextEmbeddings || [],
        });
      }
      
      this.cycleNumber = data.cycleNumber || 0;
      this.iterationsSinceSleep = data.iterationsSinceSleep || 0;
      this.lastConsolidation = data.lastConsolidation || Date.now();
      this.pendingCandidates = new Set(data.pendingCandidates || []);
      this.learnedWords = new Set(data.learnedWords || []);
      this.prunedWords = new Set(data.prunedWords || []);
      
      console.log(`[VocabDecision] Loaded: ${this.observations.size} observations, ${this.learnedWords.size} learned, ${this.prunedWords.size} pruned`);
    } catch (error) {
      console.error('[VocabDecision] Failed to load:', error);
    }
  }
  
  /**
   * Bootstrap from vocabulary tracker
   */
  bootstrapFromTracker(): void {
    const candidates = vocabularyTracker.getCandidates(100);
    
    for (const candidate of candidates) {
      const now = Date.now();
      const mockContext: WordContext = {
        word: candidate.text,
        phi: candidate.avgPhi,
        kappa: 50, // Default
        regime: 'geometric',
        basinCoordinates: [],
        timestamp: now,
      };
      
      // Create observation with data from tracker
      const obs: WordObservation = {
        word: candidate.text,
        contexts: [mockContext],
        avgPhi: candidate.avgPhi,
        maxPhi: candidate.maxPhi,
        frequency: candidate.frequency,
        firstSeen: now,
        lastSeen: now,
        contextEmbeddings: [],
      };
      
      this.observations.set(candidate.text, obs);
      
      if (candidate.frequency >= 3) {
        this.pendingCandidates.add(candidate.text);
      }
    }
    
    console.log(`[VocabDecision] Bootstrapped ${candidates.length} candidates from vocabulary tracker`);
    this.saveToDisk();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const vocabDecisionEngine = new VocabConsolidationCycle({
  sleepInterval: 100, // Consolidate every 100 iterations
});

// Export for ocean-agent integration
export default vocabDecisionEngine;
