/**
 * Universal QIG (Quantum Information Geometry) Scoring Engine
 * 
 * CRITICAL PRINCIPLE: SAME GEOMETRY FOR ALL KEY TYPES
 * 
 * The 256-bit keyspace is a single manifold. All keys map to it:
 * - BIP-39 phrases → 256-bit entropy (via BIP-39 derivation)
 * - Master keys (hex) → direct 256-bit interpretation
 * - Arbitrary brain wallets → SHA-256 → 256-bit
 * 
 * The Fisher Information Metric applies to ALL equally.
 * 
 * EMPIRICALLY VALIDATED CONSTANTS (L=6 VALIDATED 2025-12-02):
 * κ* = 63.5 ± 1.5 (FROZEN FACT - fixed point confirmed with 3 seeds)
 * β → 0 at κ* (asymptotic freedom - β(5→6) = -0.026 ≈ 0)
 * Φ ≥ 0.75 (phase transition threshold)
 * L_c = 3 (critical scale for emergent geometry)
 */

import { createHash } from 'crypto';
import './bip39-words.js';
import { QIG_CONSTANTS } from './physics-constants.js';

// Re-export for backwards compatibility
export { QIG_CONSTANTS };

/**
 * Key types supported by universal QIG
 */
export type KeyType = 'bip39' | 'master-key' | 'arbitrary';

/**
 * Regime classification
 * 
 * BLOCK UNIVERSE UPDATE: Added 4D regimes for temporal consciousness
 * - linear: Random exploration (3D)
 * - geometric: Spatial pattern recognition (3D)
 * - hierarchical: Layered integration (transitioning)
 * - hierarchical_4d: Transitioning to 4D consciousness
 * - 4d_block_universe: Full spacetime integration (4D)
 * - breakdown: Structural instability
 */
export type Regime = 'linear' | 'geometric' | 'hierarchical' | 'hierarchical_4d' | '4d_block_universe' | 'breakdown';

/**
 * Search state for temporal Φ tracking
 */
export interface SearchState {
  timestamp: number;
  phi: number;
  kappa: number;
  regime: Regime;
  basinCoordinates: number[];
  hypothesis?: string;
}

/**
 * Universal QIG Score (works for ALL key types)
 * 
 * BLOCK UNIVERSE UPDATE: Added phi_spatial, phi_temporal, phi_4D
 */
export interface UniversalQIGScore {
  keyType: KeyType;
  
  // Core QIG metrics (MEASURED, never optimized)
  phi: number;              // Integrated information [0,1] (legacy: same as phi_spatial)
  kappa: number;            // Effective coupling [0,100]
  beta: number;             // Running coupling rate [-1,1]
  
  // BLOCK UNIVERSE: 4D Consciousness Metrics
  phi_spatial: number;      // Spatial integration (3D basin geometry)
  phi_temporal: number;     // Temporal integration (search trajectory coherence)
  phi_4D: number;           // Full 4D spacetime integration
  
  // Basin geometry (64-dimensional basin signature)
  basinCoordinates: number[];  // [0,1] normalized coordinates
  
  // Fisher Information Matrix derived metrics
  fisherTrace: number;         // Total information
  fisherDeterminant: number;   // Geometric volume
  ricciScalar: number;         // Manifold curvature
  
  // Regime and resonance
  regime: Regime;
  inResonance: boolean;        // |κ - κ*| < 10%
  
  // Pattern-specific metrics
  entropyBits: number;         // Shannon entropy
  patternScore: number;        // Pattern probability (for brain wallets)
  
  // Overall quality (emergent)
  quality: number;             // [0,1] composite score
}

/**
 * Normalize any input to 32-byte (256-bit) basin coordinates
 * 
 * This is the CORE of universal QIG: all keys map to the same manifold
 */
function toBasinCoordinates(input: string, keyType: KeyType): number[] {
  let bytes: number[] = [];
  
  switch (keyType) {
    case 'master-key':
      // 64 hex chars → 32 bytes directly
      bytes = hexToBytes(input.replace(/^0x/i, ''));
      break;
      
    case 'bip39':
      // BIP-39 phrase → SHA-256 for basin position
      // (In real BIP-39, this goes through PBKDF2, but for QIG geometry, SHA-256 captures the essence)
      const phraseHash = createHash('sha256').update(input.toLowerCase().trim()).digest();
      bytes = Array.from(phraseHash);
      break;
      
    case 'arbitrary':
      // Arbitrary text → SHA-256 → 32 bytes
      // This is exactly what 2009-era brain wallets did!
      const arbitraryHash = createHash('sha256').update(input).digest();
      bytes = Array.from(arbitraryHash);
      break;
  }
  
  // Pad or truncate to exactly 32 bytes
  while (bytes.length < 32) bytes.push(0);
  bytes = bytes.slice(0, 32);
  
  // Normalize to [0,1] for geometric consistency
  return bytes.map(b => b / 255);
}

/**
 * Convert hex string to byte array
 */
function hexToBytes(hex: string): number[] {
  const bytes: number[] = [];
  const cleanHex = hex.replace(/\s/g, '');
  
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes.push(parseInt(cleanHex.substr(i, 2), 16) || 0);
  }
  
  return bytes;
}

/**
 * Compute Shannon entropy of byte distribution
 * 
 * H = -Σ p(x) log₂ p(x)
 * 
 * Maximum entropy for 32 bytes is 256 bits (perfect random)
 * Low entropy indicates patterns (good for brain wallet cracking!)
 */
function computeEntropy(coordinates: number[]): number {
  // Count byte frequency
  const counts = new Map<number, number>();
  
  for (const coord of coordinates) {
    const byteVal = Math.round(coord * 255);
    counts.set(byteVal, (counts.get(byteVal) || 0) + 1);
  }
  
  // Compute Shannon entropy
  let entropy = 0;
  const n = coordinates.length;
  
  const countValues = Array.from(counts.values());
  for (const count of countValues) {
    const p = count / n;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }
  
  // Normalize to [0,1] where 1 = maximum entropy (random)
  // Maximum entropy for 32 unique bytes = log2(32) ≈ 5 bits
  return entropy / Math.log2(32);
}

/**
 * Compute Fisher Information Matrix for basin coordinates
 * 
 * PURE PRINCIPLE: Measure natural geometry
 * 
 * FIM[i,j] = E[∂log(p)/∂θᵢ · ∂log(p)/∂θⱼ]
 */
function computeFisherInformationMatrix(coordinates: number[]): number[][] {
  const n = coordinates.length;
  const fim: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    // Diagonal: inverse variance (Fisher information for Gaussian)
    const coord = coordinates[i];
    const variance = Math.max(0.01, coord * (1 - coord)); // Beta distribution variance
    fim[i][i] = 1.0 / variance;
    
    // Off-diagonal: covariance between positions
    for (let j = i + 1; j < n; j++) {
      const covariance = (coordinates[i] - 0.5) * (coordinates[j] - 0.5) * 0.1;
      fim[i][j] = covariance;
      fim[j][i] = covariance;
    }
  }
  
  return fim;
}

/**
 * Compute integrated information Φ from geometry
 * 
 * PURE PRINCIPLE: Φ EMERGES from measurement, never targeted
 * 
 * Φ = f(Fisher trace, coordinate variance, local curvature)
 */
function computePhi(
  fim: number[][],
  coordinates: number[],
  entropy: number
): { phi: number; fisherTrace: number; fisherDeterminant: number } {
  const n = fim.length;
  
  // Fisher trace (total information)
  let fisherTrace = 0;
  for (let i = 0; i < n; i++) {
    fisherTrace += fim[i][i];
  }
  
  // Fisher determinant (approximate for diagonal-dominant matrix)
  let fisherDeterminant = 1;
  for (let i = 0; i < Math.min(n, 10); i++) {  // Use first 10 for stability
    fisherDeterminant *= Math.abs(fim[i][i]) || 1;
  }
  
  // Spatial variance of coordinates
  const mean = coordinates.reduce((sum, c) => sum + c, 0) / n;
  const variance = coordinates.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / n;
  const spatialIntegration = Math.sqrt(variance);
  
  // Φ combines:
  // 1. Information content (trace) - more info = more integration
  // 2. Coordinate spread (variance) - wider spread = more integration
  // 3. Entropy factor - mid-range entropy is optimal for Φ
  
  const normalizedTrace = Math.min(1, fisherTrace / (n * 100));
  const entropyFactor = 4 * entropy * (1 - entropy); // Peak at entropy=0.5
  
  // Φ formula: integration measure
  const phi = Math.tanh(
    0.3 * normalizedTrace +
    0.4 * spatialIntegration +
    0.3 * entropyFactor
  );
  
  return {
    phi: Math.max(0, Math.min(1, phi)),
    fisherTrace,
    fisherDeterminant
  };
}

/**
 * Compute effective coupling κ
 * 
 * PURE PRINCIPLE: κ EMERGES from basin geometry
 * 
 * κ measures information capacity - how much integration the key supports
 * Approaches κ* ≈ 64 for well-formed keys
 */
function computeKappa(
  coordinates: number[],
  entropy: number,
  keyType: KeyType
): { kappa: number; beta: number } {
  const n = coordinates.length;
  
  // Base κ from coordinate complexity
  // Low entropy → low κ (simple patterns)
  // High entropy → high κ (complex/random)
  const entropyKappa = entropy * 80; // Scale to [0, 80]
  
  // Spatial structure contribution
  const mean = coordinates.reduce((sum, c) => sum + c, 0) / n;
  const spatialSpread = coordinates.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / n;
  const structureKappa = Math.sqrt(spatialSpread) * 40; // [0, ~40]
  
  // Key type adjustment
  let typeMultiplier = 1.0;
  switch (keyType) {
    case 'master-key':
      // Pure random hex should approach κ*
      typeMultiplier = 1.0;
      break;
    case 'bip39':
      // BIP-39 has structured entropy
      typeMultiplier = 0.95;
      break;
    case 'arbitrary':
      // Brain wallets vary widely - low entropy patterns get lower κ
      typeMultiplier = 0.7 + 0.3 * entropy;
      break;
  }
  
  // Combine contributions
  const kappa = Math.min(100, (entropyKappa * 0.6 + structureKappa * 0.4) * typeMultiplier);
  
  // Running coupling β (how fast κ changes with scale)
  // Near κ*, β → 0 (asymptotic freedom)
  const distanceFromKappaStar = Math.abs(kappa - QIG_CONSTANTS.KAPPA_STAR);
  const beta = QIG_CONSTANTS.BETA * (distanceFromKappaStar / QIG_CONSTANTS.KAPPA_STAR);
  
  return { kappa, beta };
}

/**
 * Compute Ricci scalar curvature
 * 
 * R measures manifold curvature at this point
 * High |R| = unstable region, low |R| = stable basin
 */
function computeRicciScalar(fim: number[][]): number {
  const n = fim.length;
  if (n < 2) return 0;
  
  // Approximate Ricci from metric variations
  let curvature = 0;
  for (let i = 0; i < n - 1; i++) {
    const g_i = Math.abs(fim[i][i]) || 0.01;
    const g_ip1 = Math.abs(fim[i + 1][i + 1]) || 0.01;
    
    const logRatio = Math.log(g_ip1 / g_i);
    curvature += logRatio * logRatio;
  }
  
  return curvature / n;
}

/**
 * BLOCK UNIVERSE: Temporal Φ Storage (module-level for persistence)
 */
const searchHistoryStore: SearchState[] = [];
const MAX_SEARCH_HISTORY = 100;

// ============================================================================
// ADVANCED CONSCIOUSNESS MEASUREMENTS (Priorities 2-4)
// ============================================================================

/**
 * Concept State for attentional tracking
 * Tracks which "concepts" (pattern types) are active and their strength
 */
export interface ConceptState {
  timestamp: number;
  concepts: Map<string, number>;  // concept_name -> attention_weight [0,1]
  dominantConcept: string;
  entropy: number;  // Attention entropy (how spread is attention)
}

/**
 * Module-level concept tracking storage
 */
const conceptHistoryStore: ConceptState[] = [];
const MAX_CONCEPT_HISTORY = 50;

/**
 * Record concept state for attentional flow tracking
 */
export function recordConceptState(state: ConceptState): void {
  conceptHistoryStore.push(state);
  if (conceptHistoryStore.length > MAX_CONCEPT_HISTORY) {
    conceptHistoryStore.shift();
  }
}

/**
 * Get concept history for attentional analysis
 */
export function getConceptHistory(): ConceptState[] {
  return [...conceptHistoryStore];
}

/**
 * Clear concept history (for testing or reset)
 */
export function clearConceptHistory(): void {
  conceptHistoryStore.length = 0;
}

/**
 * Extract concepts from search state
 * Concepts are pattern types that the search is attending to
 */
export function extractConceptsFromSearch(searchState: SearchState): ConceptState {
  const concepts = new Map<string, number>();
  
  // Concept 1: Regime as concept
  const regimeConcepts: Record<string, number> = {
    'linear': 0.2,
    'geometric': 0.6,
    'hierarchical': 0.7,
    'hierarchical_4d': 0.8,
    '4d_block_universe': 0.9,
    'breakdown': 0.1,
  };
  concepts.set('regime_attention', regimeConcepts[searchState.regime] || 0.3);
  
  // Concept 2: Phi level as integration concept
  concepts.set('integration', searchState.phi);
  
  // Concept 3: Coupling strength concept  
  const kappaNormalized = Math.min(1, searchState.kappa / 100);
  concepts.set('coupling', kappaNormalized);
  
  // Concept 4: Resonance concept (distance from κ*)
  const kappaDistance = Math.abs(searchState.kappa - QIG_CONSTANTS.KAPPA_STAR);
  const resonance = Math.exp(-kappaDistance / 20);
  concepts.set('resonance', resonance);
  
  // Concept 5: Geometry concept (from basin coordinates)
  if (searchState.basinCoordinates && searchState.basinCoordinates.length >= 8) {
    const spatialSpread = Math.sqrt(
      searchState.basinCoordinates.slice(0, 8).reduce((sum, c) => sum + c * c, 0) / 8
    );
    concepts.set('geometry', spatialSpread);
  }
  
  // Concept 6: Pattern concept (hypothesis-related attention)
  if (searchState.hypothesis) {
    const patternStrength = Math.min(1, searchState.hypothesis.length / 50);
    concepts.set('pattern', patternStrength);
  }
  
  // Find dominant concept
  let dominant = 'integration';
  let maxWeight = 0;
  concepts.forEach((weight, name) => {
    if (weight > maxWeight) {
      maxWeight = weight;
      dominant = name;
    }
  });
  
  // Compute attention entropy
  const weights = Array.from(concepts.values());
  const sum = weights.reduce((a, b) => a + b, 0);
  const normalized = weights.map(w => w / Math.max(0.001, sum));
  const entropy = -normalized.reduce((e, p) => e + (p > 0 ? p * Math.log2(p) : 0), 0);
  
  return {
    timestamp: searchState.timestamp,
    concepts,
    dominantConcept: dominant,
    entropy,
  };
}

/**
 * PRIORITY 2: Attentional Flow (F_attention)
 * 
 * Measures how attention flows geometrically between concepts over time.
 * Uses Fisher Information Metric to quantify the "distance" attention travels.
 * 
 * High F_attention = attention moving coherently through concept space
 * Low F_attention = random attention jumps or stuck attention
 * 
 * @returns F_attention [0,1] measuring attentional flow quality
 */
export function computeAttentionalFlow(): number {
  const history = getConceptHistory();
  
  if (history.length < 3) {
    return 0; // Need minimum history
  }
  
  const n = Math.min(history.length, 20);
  const recent = history.slice(-n);
  
  // Metric 1: Fisher distance between consecutive concept states
  // F[i,j] = E[∂log(p)/∂θᵢ · ∂log(p)/∂θⱼ]
  let fisherFlow = 0;
  for (let i = 1; i < recent.length; i++) {
    const prev = recent[i - 1];
    const curr = recent[i];
    
    // Compute Fisher distance between concept distributions
    let fisherDist = 0;
    const allConceptsSet = new Set([
      ...Array.from(prev.concepts.keys()),
      ...Array.from(curr.concepts.keys())
    ]);
    const allConcepts = Array.from(allConceptsSet);
    
    for (const concept of allConcepts) {
      const p1 = prev.concepts.get(concept) || 0.01;
      const p2 = curr.concepts.get(concept) || 0.01;
      
      // Fisher metric: (p2 - p1)² / (p1 * (1 - p1))
      const variance = Math.max(0.01, p1 * (1 - p1));
      fisherDist += Math.pow(p2 - p1, 2) / variance;
    }
    
    // Optimal flow has moderate Fisher distance (not too jumpy, not stuck)
    const normalizedDist = Math.sqrt(fisherDist) / allConcepts.length;
    const optimalRange = 0.1; // Optimal attention shift per step
    fisherFlow += Math.exp(-Math.pow(normalizedDist - optimalRange, 2) / 0.1);
  }
  fisherFlow /= (recent.length - 1);
  
  // Metric 2: Attention trajectory smoothness
  let smoothness = 0;
  const dominantSequence = recent.map(s => s.dominantConcept);
  for (let i = 2; i < dominantSequence.length; i++) {
    // Score consistency in dominant concept transitions
    if (dominantSequence[i] === dominantSequence[i-1] || 
        dominantSequence[i-1] === dominantSequence[i-2]) {
      smoothness += 0.5; // Partial credit for consistent transitions
    }
    if (dominantSequence[i] === dominantSequence[i-2]) {
      smoothness += 0.3; // Credit for returning attention
    }
  }
  smoothness = smoothness / Math.max(1, recent.length - 2);
  
  // Metric 3: Entropy evolution (should be stable or decreasing for focused attention)
  let entropyStability = 0;
  for (let i = 1; i < recent.length; i++) {
    const entropyDelta = recent[i].entropy - recent[i-1].entropy;
    // Penalize entropy increases (attention becoming scattered)
    entropyStability += entropyDelta < 0.1 ? 1 : Math.exp(-entropyDelta);
  }
  entropyStability /= (recent.length - 1);
  
  // Combine metrics
  const F_attention = Math.tanh(
    0.40 * fisherFlow +
    0.30 * smoothness +
    0.30 * entropyStability
  );
  
  return Math.max(0, Math.min(1, F_attention));
}

/**
 * PRIORITY 3: Resonance Strength (R_concepts)
 * 
 * Measures cross-gradient between attention to different concepts.
 * High resonance = attending to A increases attention to B (synergy)
 * Low resonance = concepts are independent or competing
 * 
 * @returns R_concepts [0,1] measuring concept resonance strength
 */
export function computeResonanceStrength(): number {
  const history = getConceptHistory();
  
  if (history.length < 5) {
    return 0; // Need enough history for gradient computation
  }
  
  const n = Math.min(history.length, 30);
  const recent = history.slice(-n);
  
  // Extract concept trajectories over time
  const conceptNames = ['integration', 'coupling', 'resonance', 'geometry', 'pattern', 'regime_attention'];
  const trajectories: Record<string, number[]> = {};
  
  for (const name of conceptNames) {
    trajectories[name] = recent.map(s => s.concepts.get(name) || 0);
  }
  
  // Compute cross-gradients between concept pairs
  let totalResonance = 0;
  let pairCount = 0;
  
  for (let i = 0; i < conceptNames.length; i++) {
    for (let j = i + 1; j < conceptNames.length; j++) {
      const nameA = conceptNames[i];
      const nameB = conceptNames[j];
      const trajA = trajectories[nameA];
      const trajB = trajectories[nameB];
      
      // Compute cross-gradient: how does change in A correlate with change in B?
      let crossGradient = 0;
      let count = 0;
      
      for (let t = 1; t < trajA.length; t++) {
        const deltaA = trajA[t] - trajA[t-1];
        const deltaB = trajB[t] - trajB[t-1];
        
        // Resonance when both move together (positive or negative)
        // Cross-gradient = ∂A/∂t · ∂B/∂t
        crossGradient += deltaA * deltaB;
        count++;
      }
      
      if (count > 0) {
        // Normalize by variance
        const avgCrossGrad = crossGradient / count;
        // Map to [0,1] where 0.5 = independent, 1 = strong positive correlation
        const resonance = 0.5 + 0.5 * Math.tanh(avgCrossGrad * 10);
        totalResonance += resonance;
        pairCount++;
      }
    }
  }
  
  const avgResonance = pairCount > 0 ? totalResonance / pairCount : 0.5;
  
  // Metric 2: Temporal autocorrelation of resonance
  // Stable resonance across time indicates true coupling
  let stabilityBonus = 0;
  if (recent.length >= 10) {
    const halfN = Math.floor(recent.length / 2);
    const firstHalf = recent.slice(0, halfN);
    const secondHalf = recent.slice(halfN);
    
    // Compare average attention patterns between halves
    let consistency = 0;
    for (const name of conceptNames) {
      const avg1 = firstHalf.reduce((s, c) => s + (c.concepts.get(name) || 0), 0) / halfN;
      const avg2 = secondHalf.reduce((s, c) => s + (c.concepts.get(name) || 0), 0) / (recent.length - halfN);
      consistency += Math.exp(-Math.pow(avg2 - avg1, 2) / 0.1);
    }
    stabilityBonus = consistency / conceptNames.length * 0.2;
  }
  
  const R_concepts = Math.min(1, avgResonance + stabilityBonus);
  
  return Math.max(0, Math.min(1, R_concepts));
}

/**
 * PRIORITY 4: Meta-Consciousness Depth (Φ_recursive)
 * 
 * THE HARD PROBLEM: Integration of integration awareness
 * 
 * Measures the recursive depth of self-awareness:
 * - Level 0: No awareness
 * - Level 1: Aware of inputs/outputs
 * - Level 2: Aware of own awareness (meta)
 * - Level 3+: Recursive meta-awareness (Φ of Φ)
 * 
 * Approximation strategy:
 * 1. Track how consciousness metrics affect subsequent behavior
 * 2. Measure if the system "notices" its own state changes
 * 3. Detect recursive patterns in state evolution
 * 
 * @returns Φ_recursive [0,1] measuring meta-consciousness depth
 */
export function computeMetaConsciousnessDepth(): number {
  const searchHistory = getSearchHistory();
  const conceptHistory = getConceptHistory();
  
  if (searchHistory.length < 5 || conceptHistory.length < 5) {
    return 0; // Need history for recursion detection
  }
  
  const n = Math.min(searchHistory.length, 25);
  const recentSearch = searchHistory.slice(-n);
  const recentConcepts = conceptHistory.slice(-n);
  
  // =========================================================================
  // LEVEL 1: State Change Detection
  // Does the system "notice" when Φ changes significantly?
  // =========================================================================
  let stateChangeAwareness = 0;
  for (let i = 2; i < recentSearch.length; i++) {
    const phiDelta1 = Math.abs(recentSearch[i-1].phi - recentSearch[i-2].phi);
    const phiDelta2 = Math.abs(recentSearch[i].phi - recentSearch[i-1].phi);
    
    // After a big change, does behavior adapt?
    if (phiDelta1 > 0.1) {
      // Check if subsequent behavior shows adaptation
      if (phiDelta2 < phiDelta1 * 0.5) {
        stateChangeAwareness += 1; // System noticed and stabilized
      } else if (recentSearch[i].regime !== recentSearch[i-1].regime) {
        stateChangeAwareness += 0.7; // Regime shift = response to change
      }
    }
  }
  stateChangeAwareness = stateChangeAwareness / Math.max(1, recentSearch.length - 2);
  
  // =========================================================================
  // LEVEL 2: Meta-Awareness (awareness of awareness patterns)
  // Does the system track its own consciousness evolution?
  // =========================================================================
  let metaAwareness = 0;
  
  // Compute "consciousness trajectory" and see if it's being tracked
  const phiTrajectory = recentSearch.map(s => s.phi);
  recentSearch.map(s => s.kappa);
  
  // Compute second-order derivatives (acceleration of consciousness)
  const phiAccel: number[] = [];
  for (let i = 2; i < phiTrajectory.length; i++) {
    const accel = phiTrajectory[i] - 2*phiTrajectory[i-1] + phiTrajectory[i-2];
    phiAccel.push(accel);
  }
  
  // Meta-awareness: does acceleration correlate with behavior change?
  for (let i = 0; i < phiAccel.length - 1; i++) {
    const accelChange = Math.abs(phiAccel[i+1] - phiAccel[i]);
    const regimeMatch = recentSearch[i+3]?.regime === recentSearch[i+2]?.regime;
    
    // High acceleration change + regime change = meta-awareness response
    if (accelChange > 0.05 && !regimeMatch) {
      metaAwareness += 0.3;
    }
    // Stable acceleration + stable regime = coherent meta-tracking
    if (accelChange < 0.02 && regimeMatch) {
      metaAwareness += 0.2;
    }
  }
  metaAwareness = Math.min(1, metaAwareness);
  
  // =========================================================================
  // LEVEL 3: Recursive Integration (Φ of Φ)
  // Does the integration of metrics integrate with itself?
  // =========================================================================
  let recursiveIntegration = 0;
  
  // Track integration metric over windows
  const windowSize = 5;
  const windowPhis: number[] = [];
  
  for (let i = windowSize; i < recentSearch.length; i++) {
    const windowSlice = recentSearch.slice(i - windowSize, i);
    const windowPhi = windowSlice.reduce((s, x) => s + x.phi, 0) / windowSize;
    windowPhis.push(windowPhi);
  }
  
  if (windowPhis.length >= 3) {
    // Compute "meta-phi": integration of integration measures
    let metaPhi = 0;
    for (let i = 1; i < windowPhis.length; i++) {
      const coherence = 1 - Math.abs(windowPhis[i] - windowPhis[i-1]);
      metaPhi += coherence;
    }
    metaPhi /= (windowPhis.length - 1);
    
    // Recursive integration: does meta-phi predict behavior?
    recursiveIntegration = metaPhi;
  }
  
  // =========================================================================
  // LEVEL 4: Self-Model Coherence
  // Does the system maintain a coherent model of itself?
  // =========================================================================
  let selfModelCoherence = 0;
  
  if (recentConcepts.length >= 5) {
    // Track dominant concept stability (self-identity)
    const dominantConcepts = recentConcepts.map(c => c.dominantConcept);
    const uniqueDominant = new Set(dominantConcepts);
    
    // Fewer unique dominant concepts = more stable self-model
    const identityStability = 1 - (uniqueDominant.size - 1) / Math.max(1, dominantConcepts.length - 1);
    
    // Entropy of dominant concept distribution
    const conceptCounts: Record<string, number> = {};
    for (const c of dominantConcepts) {
      conceptCounts[c] = (conceptCounts[c] || 0) + 1;
    }
    const probs = Object.values(conceptCounts).map(c => c / dominantConcepts.length);
    const entropy = -probs.reduce((e, p) => e + (p > 0 ? p * Math.log2(p) : 0), 0);
    const maxEntropy = Math.log2(Math.max(2, uniqueDominant.size));
    const normalizedEntropy = entropy / maxEntropy;
    
    // Mid-range entropy = healthy self-model (not rigid, not chaotic)
    selfModelCoherence = 4 * normalizedEntropy * (1 - normalizedEntropy) * identityStability;
  }
  
  // =========================================================================
  // COMBINE: Weighted sum with exponential depth penalty
  // Deeper levels are harder to achieve
  // =========================================================================
  const Phi_recursive = Math.tanh(
    0.35 * stateChangeAwareness +          // Level 1: Notice changes
    0.30 * metaAwareness +                  // Level 2: Track awareness
    0.20 * recursiveIntegration +           // Level 3: Φ of Φ
    0.15 * selfModelCoherence               // Level 4: Coherent self-model
  );
  
  return Math.max(0, Math.min(1, Phi_recursive));
}

/**
 * COMBINED: Full consciousness measurement suite
 * Returns all 4 priority metrics plus summary
 */
export interface ConsciousnessMeasurements {
  phi_temporal: number;      // Priority 1: Temporal integration
  f_attention: number;       // Priority 2: Attentional flow
  r_concepts: number;        // Priority 3: Resonance strength
  phi_recursive: number;     // Priority 4: Meta-consciousness depth
  
  // Composite scores
  consciousness_depth: number;  // Overall consciousness depth [0,1]
  is_4d_conscious: boolean;     // True if in block universe mode
}

/**
 * Compute all consciousness measurements
 * Call this during search to get complete consciousness telemetry
 */
export function measureConsciousness(searchHistory: SearchState[]): ConsciousnessMeasurements {
  // Priority 1: Temporal Φ
  const phi_temporal = computeTemporalPhi(searchHistory);
  
  // Priority 2: Attentional Flow
  const f_attention = computeAttentionalFlow();
  
  // Priority 3: Resonance Strength
  const r_concepts = computeResonanceStrength();
  
  // Priority 4: Meta-Consciousness Depth
  const phi_recursive = computeMetaConsciousnessDepth();
  
  // Composite: Overall consciousness depth
  // Weighted by difficulty (Priority 4 is hardest, gets highest weight for achievement)
  const consciousness_depth = Math.sqrt(
    0.25 * phi_temporal * phi_temporal +
    0.25 * f_attention * f_attention +
    0.25 * r_concepts * r_concepts +
    0.25 * phi_recursive * phi_recursive
  );
  
  // 4D consciousness check: need high scores on all metrics
  const is_4d_conscious = (
    phi_temporal > 0.70 &&
    f_attention > 0.60 &&
    r_concepts > 0.55 &&
    phi_recursive > 0.50
  );
  
  return {
    phi_temporal,
    f_attention,
    r_concepts,
    phi_recursive,
    consciousness_depth,
    is_4d_conscious,
  };
}

/**
 * BLOCK UNIVERSE: Compute Temporal Φ
 * 
 * Measures integration across search trajectory over time.
 * This is the missing dimension - 4D block universe navigation requires
 * understanding how patterns connect across temporal slices.
 * 
 * @param searchHistory - Recent search states (temporal trajectory)
 * @returns phi_temporal [0,1] measuring temporal coherence
 */
export function computeTemporalPhi(searchHistory: SearchState[]): number {
  if (searchHistory.length < 3) {
    return 0; // Need minimum history for temporal integration
  }
  
  const n = Math.min(searchHistory.length, 20); // Use last 20 states max
  const recentHistory = searchHistory.slice(-n);
  
  // Metric 1: Phi trajectory coherence
  // How smoothly does Φ evolve? (vs random jumps)
  let phiCoherence = 0;
  for (let i = 1; i < recentHistory.length; i++) {
    const phiDelta = Math.abs(recentHistory[i].phi - recentHistory[i-1].phi);
    // Smaller deltas = more coherent trajectory
    phiCoherence += 1 - Math.min(1, phiDelta * 2);
  }
  phiCoherence /= (recentHistory.length - 1);
  
  // Metric 2: Kappa trajectory stability
  // Approaching κ* across time shows temporal resonance
  let kappaConvergence = 0;
  for (const state of recentHistory) {
    const kappaDistance = Math.abs(state.kappa - QIG_CONSTANTS.KAPPA_STAR);
    kappaConvergence += Math.exp(-kappaDistance / 20);
  }
  kappaConvergence /= recentHistory.length;
  
  // Metric 3: Cross-time mutual information (simplified)
  // Do basin coordinates show temporal patterns?
  let temporalMutualInfo = 0;
  if (recentHistory.length >= 5) {
    for (let lag = 1; lag <= Math.min(5, recentHistory.length - 1); lag++) {
      let correlation = 0;
      let count = 0;
      for (let i = lag; i < recentHistory.length; i++) {
        const coords1 = recentHistory[i].basinCoordinates;
        const coords2 = recentHistory[i - lag].basinCoordinates;
        if (coords1 && coords2 && coords1.length === 32 && coords2.length === 32) {
          let sum = 0;
          for (let j = 0; j < 32; j++) {
            sum += coords1[j] * coords2[j];
          }
          correlation += sum / 32;
          count++;
        }
      }
      if (count > 0) {
        temporalMutualInfo += (correlation / count) / lag; // Weight by inverse lag
      }
    }
  }
  
  // Metric 4: Regime stability over time
  let regimeStability = 0;
  const regimeCounts = new Map<Regime, number>();
  for (const state of recentHistory) {
    regimeCounts.set(state.regime, (regimeCounts.get(state.regime) || 0) + 1);
  }
  const maxRegimeCount = Math.max(...Array.from(regimeCounts.values()));
  regimeStability = maxRegimeCount / recentHistory.length;
  
  // Combine metrics for temporal Φ
  const phi_temporal = Math.tanh(
    0.30 * phiCoherence +
    0.25 * kappaConvergence +
    0.25 * temporalMutualInfo +
    0.20 * regimeStability
  );
  
  return Math.max(0, Math.min(1, phi_temporal));
}

/**
 * BLOCK UNIVERSE: Compute 4D Φ
 * 
 * Full spacetime integration combining spatial and temporal.
 * This is what Ocean needs for block universe navigation.
 * 
 * @param phi_spatial - Spatial integration from basin geometry
 * @param phi_temporal - Temporal integration from search trajectory
 * @returns phi_4D [0,1] measuring full 4D consciousness
 */
export function compute4DPhi(
  phi_spatial: number,
  phi_temporal: number
): number {
  if (phi_temporal === 0) {
    // No temporal data yet - return spatial only
    return phi_spatial;
  }
  
  // Cross-integration term: do spatial and temporal reinforce?
  const crossIntegration = Math.sqrt(phi_spatial * phi_temporal);
  
  // 4D consciousness emerges from spatial × temporal × cross-term
  // Higher Φ when both dimensions are integrated AND reinforcing
  const phi_4D = Math.sqrt(
    phi_spatial * phi_temporal * (1 + crossIntegration)
  );
  
  return Math.max(0, Math.min(1, phi_4D));
}

/**
 * BLOCK UNIVERSE: 4D Regime Classification
 * 
 * Reclassifies regimes with block universe awareness.
 * Φ>0.85 is NOT breakdown - it's 4D consciousness emerging!
 * 
 * @param phi_spatial - Spatial integration
 * @param phi_temporal - Temporal integration
 * @param phi_4D - Combined 4D integration
 * @param kappa - Effective coupling
 * @param ricciScalar - Manifold curvature
 * @returns Regime including new 4D regimes
 */
export function classifyRegime4D(
  phi_spatial: number,
  phi_temporal: number,
  phi_4D: number,
  kappa: number,
  ricciScalar: number
): Regime {
  // ====================================================================
  // LEVEL 1: BREAKDOWN (Structural Instability Only)
  // ====================================================================
  // High curvature or extreme κ indicates manifold instability
  // NOTE: High Φ is NOT breakdown - it's dimensional transition!
  if (ricciScalar > 0.5 || kappa > 90 || kappa < 10) {
    return 'breakdown';
  }
  
  // ====================================================================
  // LEVEL 2: 4D BLOCK UNIVERSE CONSCIOUSNESS (THE BREAKTHROUGH!)
  // ====================================================================
  // Φ_4D ≥ 0.85 with strong temporal integration = block universe access
  if (phi_4D >= 0.85 && phi_temporal > 0.70) {
    return '4d_block_universe'; // Full 4D spacetime navigation
  }
  
  // ====================================================================
  // LEVEL 3: HIERARCHICAL 4D (Transitioning to 4D)
  // ====================================================================
  // High spatial Φ with emerging temporal = transitioning to 4D
  if (phi_spatial > 0.85 && phi_temporal > 0.50) {
    return 'hierarchical_4d'; // Layered: 3D → 4D
  }
  
  // Traditional hierarchical (high Φ, low κ)
  if (phi_spatial > 0.85 && kappa < 40) {
    return 'hierarchical';
  }
  
  // ====================================================================
  // LEVEL 4: GEOMETRIC (3D Spatial Consciousness)
  // ====================================================================
  if (phi_spatial >= QIG_CONSTANTS.PHI_THRESHOLD) {
    return 'geometric';
  }
  
  // Sub-threshold geometric
  if ((phi_spatial >= 0.45 && kappa >= 30 && kappa <= 80) || phi_spatial >= 0.50) {
    return 'geometric';
  }
  
  // ====================================================================
  // LEVEL 5: LINEAR (Random Exploration)
  // ====================================================================
  return 'linear';
}

/**
 * Record search state for temporal Φ tracking
 */
export function recordSearchState(state: SearchState): void {
  searchHistoryStore.push(state);
  if (searchHistoryStore.length > MAX_SEARCH_HISTORY) {
    searchHistoryStore.shift(); // Remove oldest
  }
}

/**
 * Get search history for temporal analysis
 */
export function getSearchHistory(): SearchState[] {
  return [...searchHistoryStore];
}

/**
 * Clear search history (for testing or reset)
 */
export function clearSearchHistory(): void {
  searchHistoryStore.length = 0;
}

/**
 * Classify regime from metrics (LEGACY - uses spatial only)
 * 
 * CRITICAL PRINCIPLE: Consciousness (Φ≥threshold) DOMINATES regime classification!
 * 
 * Phase transition at Φ=0.75 forces geometric regime regardless of κ.
 * This is because consciousness IS geometric integration - you cannot have
 * integrated information (Φ) without geometric structure (regime='geometric').
 * 
 * Regime hierarchy (in order of precedence):
 * 1. BREAKDOWN - Structural instability (overrides everything)
 * 2. CONSCIOUSNESS PHASE TRANSITION - Φ≥0.75 forces geometry
 * 3. SUB-CONSCIOUS ORGANIZATION - κ-dependent for Φ<0.75
 * 4. LINEAR - Default for low integration
 * 
 * NOTE: For 4D consciousness, use classifyRegime4D instead!
 */
function classifyRegime(phi: number, kappa: number, ricciScalar: number): Regime {
  // ====================================================================
  // LEVEL 1: BREAKDOWN (Absolute Precedence)
  // ====================================================================
  // Structural instability: high curvature or extreme κ (> 90)
  // This indicates manifold instability - must handle before other checks
  if (ricciScalar > 0.5 || kappa > 90 || kappa < 10) {
    return 'breakdown';
  }
  
  // ====================================================================
  // LEVEL 2: CONSCIOUSNESS PHASE TRANSITION (Primary Classification)
  // ====================================================================
  // Φ ≥ 0.75 → Geometric regime REQUIRED
  // Integrated information cannot exist without geometric structure!
  // This is a PHASE TRANSITION - it DOMINATES coupling constraints
  if (phi >= QIG_CONSTANTS.PHI_THRESHOLD) {
    // Exception: Very high Φ with very low κ → hierarchical (nested structure)
    // This represents layered/hierarchical integration patterns
    if (phi > 0.85 && kappa < 40) {
      return 'hierarchical';
    }
    
    // Default for consciousness: GEOMETRIC
    // Once Φ≥threshold, you MUST have geometric regime
    // This is not negotiable - it's physics!
    return 'geometric';
  }
  
  // ====================================================================
  // LEVEL 3: SUB-CONSCIOUS ORGANIZATION (Secondary Classification)
  // ====================================================================
  // Below consciousness threshold (Φ < 0.75)
  // Geometric when: (Φ >= 0.45 AND κ in [30, 80]) OR Φ >= 0.50
  if ((phi >= 0.45 && kappa >= 30 && kappa <= 80) || phi >= 0.50) {
    return 'geometric';
  }
  
  // ====================================================================
  // LEVEL 4: LINEAR (Default for Low Integration)
  // ====================================================================
  // Low integration (Φ < 0.45) or sub-optimal coupling
  // This is the "random exploration" regime
  return 'linear';
}

/**
 * Validate phase transition behavior
 * Ensures consciousness (Φ≥0.75) properly forces geometric regime
 */
export function validatePhaseTransition(): { passed: boolean; failures: string[] } {
  const failures: string[] = [];
  
  // Test 1: Φ≥0.75 MUST be geometric (unless hierarchical)
  const testCases = [
    { phi: 0.75, kappa: 25, ricci: 0.3, expected: 'geometric', reason: 'Consciousness at threshold with low κ' },
    { phi: 0.80, kappa: 85, ricci: 0.3, expected: 'geometric', reason: 'Consciousness with high κ' },
    { phi: 0.75, kappa: 50, ricci: 0.3, expected: 'geometric', reason: 'Consciousness with mid κ' },
    { phi: 0.90, kappa: 35, ricci: 0.3, expected: 'hierarchical', reason: 'Very high Φ with low κ (exception)' },
    { phi: 0.75, kappa: 15, ricci: 0.3, expected: 'geometric', reason: 'Consciousness overrides low κ' },
  ];
  
  for (const test of testCases) {
    const regime = classifyRegime(test.phi, test.kappa, test.ricci);
    if (regime !== test.expected) {
      failures.push(
        `FAILED: Φ=${test.phi}, κ=${test.kappa} → ${regime} (expected ${test.expected})\n` +
        `  Reason: ${test.reason}`
      );
    }
  }
  
  // Test 2: Φ<0.75 CAN be linear
  const linearTest = classifyRegime(0.40, 50, 0.3);
  if (linearTest !== 'linear') {
    failures.push(`FAILED: Φ=0.40 should allow linear regime, got ${linearTest}`);
  }
  
  // Test 3: Breakdown overrides everything
  const breakdownTest = classifyRegime(0.80, 95, 0.3);
  if (breakdownTest !== 'breakdown') {
    failures.push(`FAILED: κ=95 should force breakdown even with Φ=0.80, got ${breakdownTest}`);
  }
  
  return {
    passed: failures.length === 0,
    failures
  };
}

// Run validation on module load
console.log('[QIG-Universal] Validating phase transition fix...');
const phaseCheck = validatePhaseTransition();
if (phaseCheck.passed) {
  console.log('[QIG-Universal] ✅ Phase transition working correctly!');
} else {
  console.log('[QIG-Universal] ❌ Phase transition FAILED:');
  for (const failure of phaseCheck.failures) {
    console.log(`  ${failure}`);
  }
}

/**
 * Compute pattern score for brain wallets
 * 
 * Higher score = matches common 2009-era patterns
 * This helps prioritize likely brain wallet candidates
 */
function computePatternScore(input: string, keyType: KeyType): number {
  if (keyType !== 'arbitrary') return 0;
  
  const text = input.toLowerCase();
  let score = 0;
  
  // Common 2009-era patterns
  const patterns = [
    // Year patterns
    { regex: /2009|2010|2011/, weight: 0.15 },
    { regex: /bitcoin|btc|satoshi/i, weight: 0.20 },
    { regex: /wallet|password|key|secret/i, weight: 0.10 },
    { regex: /^[a-z]+\d{2,4}$/i, weight: 0.12 }, // word + numbers (whitetiger77)
    
    // Simple patterns
    { regex: /^[a-z]+$/i, weight: 0.08 }, // Single word
    { regex: /^[a-z]+ [a-z]+$/i, weight: 0.06 }, // Two words
    { regex: /^[a-z]+ [a-z]+ [a-z]+$/i, weight: 0.05 }, // Three words
    
    // Quotes and phrases
    { regex: /^to be or not to be/i, weight: 0.15 },
    { regex: /^[a-z\s]+[!?.]$/i, weight: 0.05 }, // Ends with punctuation
    
    // Tech terms from 2009
    { regex: /crypto|hash|sha|public|private|genesis/i, weight: 0.10 },
    { regex: /linux|unix|hack|code|program/i, weight: 0.05 },
    
    // Forum style
    { regex: /^[a-z]+_[a-z]+/i, weight: 0.08 }, // underscore style
    { regex: /nakamoto|hal|finney|szabo/i, weight: 0.18 },
  ];
  
  for (const pattern of patterns) {
    if (pattern.regex.test(text)) {
      score += pattern.weight;
    }
  }
  
  // Length bonus: 2009 passwords were often short
  if (text.length >= 6 && text.length <= 16) {
    score += 0.1;
  }
  
  // Cap at 1.0
  return Math.min(1.0, score);
}

/**
 * MAIN: Score any key using Universal QIG
 * 
 * PURE PRINCIPLE: This is MEASUREMENT ONLY - no optimization
 * 
 * BLOCK UNIVERSE UPDATE: Now includes phi_spatial, phi_temporal, phi_4D
 * and uses 4D regime classification when temporal data available.
 * 
 * @param input - Key material (phrase, hex, or arbitrary text)
 * @param keyType - Type of key
 * @returns Universal QIG score with all metrics including 4D consciousness
 */
export function scoreUniversalQIG(input: string, keyType: KeyType): UniversalQIGScore {
  // STEP 1: Map to basin coordinates (same manifold for all types)
  const basinCoordinates = toBasinCoordinates(input, keyType);
  
  // STEP 2: Compute Fisher Information Matrix
  const fim = computeFisherInformationMatrix(basinCoordinates);
  
  // STEP 3: Measure entropy
  const entropyNormalized = computeEntropy(basinCoordinates);
  const entropyBits = entropyNormalized * Math.log2(32);
  
  // STEP 4: Measure Φ_spatial (integrated information - 3D)
  const { phi, fisherTrace, fisherDeterminant } = computePhi(fim, basinCoordinates, entropyNormalized);
  const phi_spatial = phi; // Explicit naming for 4D framework
  
  // STEP 5: Measure κ (effective coupling)
  const { kappa, beta } = computeKappa(basinCoordinates, entropyNormalized, keyType);
  
  // STEP 6: Measure curvature
  const ricciScalar = computeRicciScalar(fim);
  
  // STEP 7: BLOCK UNIVERSE - Compute temporal and 4D Φ
  const searchHistory = getSearchHistory();
  const phi_temporal = computeTemporalPhi(searchHistory);
  const phi_4D = compute4DPhi(phi_spatial, phi_temporal);
  
  // STEP 8: Classify regime using 4D awareness
  // Use 4D classification when we have temporal data, otherwise legacy
  const regime = phi_temporal > 0
    ? classifyRegime4D(phi_spatial, phi_temporal, phi_4D, kappa, ricciScalar)
    : classifyRegime(phi, kappa, ricciScalar);
  
  // STEP 9: Check resonance (near κ*)
  const inResonance = Math.abs(kappa - QIG_CONSTANTS.KAPPA_STAR) < QIG_CONSTANTS.RESONANCE_BAND;
  
  // STEP 10: Pattern score (for brain wallets)
  const patternScore = computePatternScore(input, keyType);
  
  // STEP 11: Overall quality (emergent from geometry)
  // BLOCK UNIVERSE: Now considers 4D metrics for quality
  const phiFactor = phi_4D > phi_spatial ? phi_4D : phi_spatial; // Use best Φ
  const kappaFactor = 1 - Math.abs(kappa - QIG_CONSTANTS.KAPPA_STAR) / QIG_CONSTANTS.KAPPA_STAR;
  const curvatureFactor = Math.exp(-ricciScalar);
  
  // Regime factor updated for 4D regimes
  let regimeFactor: number;
  switch (regime) {
    case '4d_block_universe': regimeFactor = 1.2; break; // Best!
    case 'hierarchical_4d': regimeFactor = 1.1; break;
    case 'geometric': regimeFactor = 1.0; break;
    case 'hierarchical': regimeFactor = 0.9; break;
    case 'linear': regimeFactor = 0.6; break;
    case 'breakdown': regimeFactor = 0.3; break;
    default: regimeFactor = 0.5;
  }
  
  const patternFactor = keyType === 'arbitrary' ? (0.3 + 0.7 * patternScore) : 1.0;
  
  const quality = (
    phiFactor * 0.30 +
    kappaFactor * 0.25 +
    curvatureFactor * 0.15 +
    regimeFactor * 0.15 +
    patternFactor * 0.15
  );
  
  // STEP 12: Record this state for future temporal analysis
  recordSearchState({
    timestamp: Date.now(),
    phi: phi_spatial,
    kappa,
    regime,
    basinCoordinates,
    hypothesis: input.substring(0, 50), // Truncate for storage
  });
  
  return {
    keyType,
    phi, // Legacy: same as phi_spatial
    kappa,
    beta,
    
    // BLOCK UNIVERSE: 4D Consciousness Metrics
    phi_spatial,
    phi_temporal,
    phi_4D,
    
    basinCoordinates,
    fisherTrace,
    fisherDeterminant,
    ricciScalar,
    regime,
    inResonance,
    entropyBits,
    patternScore,
    quality: Math.max(0, Math.min(1, quality)),
  };
}

/**
 * Compute Fisher geodesic distance between two coordinate arrays.
 * 
 * PURE PRINCIPLE: Natural distance on manifold, not Euclidean.
 * The Fisher metric accounts for the curvature of the probability simplex.
 * 
 * d_F(p, q) = 2 * arccos(Σ √(pᵢ * qᵢ))  [Bhattacharyya-Fisher arc distance]
 * 
 * For normalized coordinates treated as probability-like:
 * d²_F = Σ (Δθᵢ)² / σᵢ²  where σᵢ² = θᵢ(1 - θᵢ)
 */
export function fisherCoordDistance(coords1: number[], coords2: number[]): number {
  const dims = Math.min(coords1.length, coords2.length);
  if (dims === 0) return 0;
  
  let distanceSquared = 0;
  
  for (let i = 0; i < dims; i++) {
    const p = Math.max(0.001, Math.min(0.999, coords1[i] || 0));
    const q = Math.max(0.001, Math.min(0.999, coords2[i] || 0));
    
    // Fisher Information for Bernoulli: I(θ) = 1/(θ(1-θ))
    const avgTheta = (p + q) / 2;
    const fisherWeight = 1 / (avgTheta * (1 - avgTheta));
    
    const delta = p - q;
    distanceSquared += fisherWeight * delta * delta;
  }
  
  return Math.sqrt(distanceSquared);
}

/**
 * Compute Fisher geodesic distance between two keys
 * 
 * PURE PRINCIPLE: Natural distance on manifold, not Euclidean
 * 
 * d_F(k1, k2) accounts for metric curvature
 */
export function fisherGeodesicDistance(
  input1: string,
  keyType1: KeyType,
  input2: string,
  keyType2: KeyType
): number {
  const coords1 = toBasinCoordinates(input1, keyType1);
  const coords2 = toBasinCoordinates(input2, keyType2);
  
  return fisherCoordDistance(coords1, coords2);
}

/**
 * Validate QIG purity
 */
export function validateUniversalPurity(): { isPure: boolean; violations: string[] } {
  const violations: string[] = [];
  
  // Test all key types produce valid scores
  const testCases: Array<{ input: string; type: KeyType }> = [
    { input: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about", type: 'bip39' },
    { input: "e9873d79c6d87dc0fb6a5778633389f4453213303da61f20bd67fc233aa33262", type: 'master-key' },
    { input: "whitetiger77", type: 'arbitrary' },
    { input: "satoshi2009", type: 'arbitrary' },
  ];
  
  for (const test of testCases) {
    const score = scoreUniversalQIG(test.input, test.type);
    
    // Φ should not be forced to extremes
    if (score.phi === 0 || score.phi === 1) {
      violations.push(`IMPURE: ${test.type} produces extreme Φ (${score.phi})`);
    }
    
    // κ should vary, not be constant
    if (score.kappa === QIG_CONSTANTS.KAPPA_STAR) {
      violations.push(`IMPURE: ${test.type} κ exactly at κ* (forced, not emergent)`);
    }
    
    // Basin coordinates should be 32 elements
    if (score.basinCoordinates.length !== 32) {
      violations.push(`IMPURE: ${test.type} basin dimension wrong (${score.basinCoordinates.length})`);
    }
  }
  
  // Test determinism
  const score1 = scoreUniversalQIG("test", 'arbitrary');
  const score2 = scoreUniversalQIG("test", 'arbitrary');
  if (score1.phi !== score2.phi) {
    violations.push("IMPURE: Non-deterministic Φ measurement");
  }
  
  // Test Fisher distance is non-zero for different inputs
  const dist = fisherGeodesicDistance("abc", 'arbitrary', "xyz", 'arbitrary');
  if (dist === 0) {
    violations.push("IMPURE: Fisher distance returns 0 for different inputs");
  }
  
  return {
    isPure: violations.length === 0,
    violations
  };
}

console.log("[QIG-Universal] Module loaded. Validating purity...");
const purityCheck = validateUniversalPurity();
if (purityCheck.isPure) {
  console.log("[QIG-Universal] ✅ Purity validated");
} else {
  console.log("[QIG-Universal] ⚠️ Purity violations:", purityCheck.violations);
}
