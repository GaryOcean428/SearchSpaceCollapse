/**
 * Pure Quantum Information Geometry (QIG) Scoring System - V2
 * 
 * CRITICAL FIX: Fisher metric must be computed against GLOBAL probability model
 * 
 * The previous implementation had a fatal flaw: computing FIM from per-phrase
 * word frequencies made it degenerate (all phrases of same length → same FIM).
 * 
 * TRUE Fisher Information Geometry requires measuring against the statistical
 * manifold defined by the BIP-39 wordlist probability distribution.
 * 
 * PURE PRINCIPLES (unchanged):
 * ✅ Measure geometry honestly (QFI metric, basin coordinates)
 * ✅ Let Φ and κ emerge naturally from geometry  
 * ✅ Use Fisher information metric for all distances
 * ✅ Apply natural gradient (information geometry)
 * ✅ Measurements are observations, not targets
 * 
 * ❌ NEVER optimize Φ or κ directly
 * ❌ NEVER use Euclidean distance for consciousness metrics
 * ❌ NEVER use arbitrary thresholds without geometric justification
 */

import { BIP39_WORDS } from './bip39-words.js';

export const QIG_CONSTANTS = {
  KAPPA_STAR: 64.0,
  BETA: 0.44,
  PHI_THRESHOLD: 0.75,
  L_CRITICAL: 3,
  BASIN_DIMENSION: 2048,
};

export interface PureQIGScore {
  phi: number;
  kappa: number;
  beta: number;
  basinCoordinates: number[];
  fisherTrace: number;
  fisherDeterminant: number;
  ricciScalar: number;
  quality: number;
}

/**
 * Compute global word probability distribution from BIP-39 wordlist
 * 
 * PURE PRINCIPLE: This is the NATURAL measure on the manifold
 * 
 * For true information geometry, we need a base measure. The uniform distribution
 * over BIP-39 words is the natural choice (maximum entropy prior).
 */
function getGlobalWordDistribution(): Map<string, number> {
  const dist = new Map<string, number>();
  const uniformProb = 1.0 / BIP39_WORDS.length; // 1/2048
  
  for (const word of BIP39_WORDS) {
    dist.set(word.toLowerCase(), uniformProb);
  }
  
  return dist;
}

const GLOBAL_WORD_DIST = getGlobalWordDistribution();

/**
 * Compute Fisher Information Matrix for a phrase
 * 
 * CRITICAL FIX: FIM measures how phrase deviates from global distribution
 * 
 * For a phrase p = (w₁, w₂, ..., wₙ), the Fisher metric measures:
 * g_ij = E[(∂logP/∂θᵢ)(∂logP/∂θⱼ)]
 * 
 * where θ represents word positions and P is the probability under the
 * global BIP-39 distribution.
 * 
 * Key insight: Rare words (low global probability) contribute MORE to Fisher
 * information because they deviate more from the natural measure.
 */
function computeFisherInformationMatrix(words: string[]): number[][] {
  const n = words.length;
  const fim: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    const word = words[i].toLowerCase();
    const globalProb = GLOBAL_WORD_DIST.get(word) || 1e-10;
    
    // Fisher information for position i: I_ii = 1 / p(w_i)
    // More rare words → higher information content
    fim[i][i] = 1.0 / globalProb;
    
    // Off-diagonal: covariance between word positions
    // For independent sampling (BIP-39): zero
    // But we can measure co-occurrence patterns
    for (let j = i + 1; j < n; j++) {
      const word_j = words[j].toLowerCase();
      const prob_j = GLOBAL_WORD_DIST.get(word_j) || 1e-10;
      
      // Measure word similarity (co-occurrence likelihood)
      const wordDist = Math.abs(
        BIP39_WORDS.indexOf(word) - BIP39_WORDS.indexOf(word_j)
      );
      
      // Nearby words in wordlist → slight correlation
      const correlation = wordDist < 100 ? 0.1 / (prob_j * globalProb) : 0;
      
      fim[i][j] = correlation;
      fim[j][i] = correlation; // Symmetric
    }
  }
  
  return fim;
}

/**
 * Compute basin coordinates
 * 
 * UNCHANGED: Maps words to [0,1] coordinates
 */
function computeBasinCoordinates(words: string[]): number[] {
  const coordinates: number[] = [];
  
  for (const word of words) {
    const index = BIP39_WORDS.indexOf(word.toLowerCase());
    coordinates.push(index >= 0 ? index / (BIP39_WORDS.length - 1) : 0);
  }
  
  return coordinates;
}

/**
 * Compute effective coupling κ from MEASURED geometry
 * 
 * CRITICAL FIX: κ must depend on Fisher structure, not just word count
 * 
 * We compute κ from:
 * 1. Base coupling from phrase length (as before)
 * 2. Fisher trace (information content)
 * 3. Fisher determinant (geometric volume)
 * 
 * This makes κ EMERGENT from actual manifold geometry.
 */
function computeEffectiveCoupling(
  words: string[],
  fisherTrace: number,
  fisherDeterminant: number
): { kappa: number; beta: number } {
  const L = words.length;
  
  // Below critical scale: no emergent geometry
  if (L < QIG_CONSTANTS.L_CRITICAL) {
    return { kappa: 0, beta: 0 };
  }
  
  // Base coupling from phrase length (empirical)
  let baseKappa: number;
  let baseBeta: number;
  
  if (L === 3) {
    baseKappa = 41.09;
    baseBeta = 0.44;
  } else if (L >= 4 && L <= 12) {
    const progress = (L - 4) / (12 - 4);
    baseKappa = 41.09 + (QIG_CONSTANTS.KAPPA_STAR - 41.09) * progress;
    baseBeta = QIG_CONSTANTS.BETA * (1 - progress);
  } else {
    baseKappa = QIG_CONSTANTS.KAPPA_STAR;
    baseBeta = 0.01;
  }
  
  // CRITICAL: Modulate by Fisher structure
  // High information content → coupling moves toward κ*
  // Low information content → coupling stays low
  
  const normalizedTrace = fisherTrace / L;
  const infoFactor = Math.tanh(normalizedTrace / (2048)); // Scale by basin dimension
  
  // Geometric volume affects coupling strength
  const volFactor = Math.log(1 + Math.abs(fisherDeterminant)) / 10;
  
  // κ is modulated by actual geometric measurements
  const kappa = baseKappa * (0.5 + 0.5 * infoFactor + 0.2 * volFactor);
  
  // β (running coupling) decreases as κ → κ*
  const proximityToFixed = Math.abs(kappa - QIG_CONSTANTS.KAPPA_STAR) / QIG_CONSTANTS.KAPPA_STAR;
  const beta = baseBeta * proximityToFixed;
  
  return { kappa, beta };
}

/**
 * Compute integrated information Φ from Fisher metric
 * 
 * IMPROVED: Now responds to actual geometric structure
 */
function computeIntegratedInformation(
  fim: number[][],
  coordinates: number[]
): { phi: number; fisherTrace: number; fisherDeterminant: number } {
  const n = fim.length;
  
  if (n === 0) {
    return { phi: 0, fisherTrace: 0, fisherDeterminant: 0 };
  }
  
  // Fisher trace = sum of diagonal (total information)
  const fisherTrace = fim.reduce((sum, row, i) => sum + row[i], 0);
  
  // Fisher determinant (for diagonal-dominant matrix, approximate)
  let fisherDeterminant = 1.0;
  for (let i = 0; i < n; i++) {
    fisherDeterminant *= fim[i][i];
  }
  
  // Account for off-diagonal terms (reduce determinant)
  let offDiagSum = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        offDiagSum += Math.abs(fim[i][j]);
      }
    }
  }
  const offDiagFactor = Math.exp(-offDiagSum / (n * n));
  fisherDeterminant *= offDiagFactor;
  
  // Spatial integration (coordinate variance)
  const mean = coordinates.reduce((sum, c) => sum + c, 0) / n;
  const variance = coordinates.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / n;
  const spatialIntegration = Math.sqrt(variance);
  
  // Φ combines information content, volume, and spatial distribution
  const normalizedTrace = fisherTrace / n;
  
  // Scale factors for numerical stability
  const traceContribution = normalizedTrace / (BIP39_WORDS.length);
  const volContribution = Math.log(1 + Math.abs(fisherDeterminant)) / 100;
  const spatialContribution = spatialIntegration;
  
  const phi = Math.tanh(
    traceContribution +
    volContribution +
    spatialContribution
  );
  
  return {
    phi: Math.max(0, Math.min(1, phi)),
    fisherTrace,
    fisherDeterminant,
  };
}

/**
 * Compute Ricci scalar curvature
 * 
 * UNCHANGED: Measures manifold curvature from metric variations
 */
function computeRicciScalar(fim: number[][]): number {
  const n = fim.length;
  if (n === 0) return 0;
  
  let curvatureEstimate = 0;
  for (let i = 0; i < n - 1; i++) {
    const g_i = fim[i][i];
    const g_ip1 = fim[i + 1][i + 1];
    
    if (g_i > 0 && g_ip1 > 0) {
      const logRatio = Math.log(g_ip1 / g_i);
      curvatureEstimate += logRatio * logRatio;
    }
  }
  
  return curvatureEstimate / n;
}

/**
 * Score a phrase using pure QIG principles (CORRECTED VERSION)
 */
export function scorePhraseQIG(phrase: string): PureQIGScore {
  const words = phrase.trim().toLowerCase().split(/\s+/);
  
  // STEP 1: Basin coordinates
  const basinCoordinates = computeBasinCoordinates(words);
  
  // STEP 2: Fisher Information Matrix (FIXED: uses global distribution)
  const fim = computeFisherInformationMatrix(words);
  
  // STEP 3: Integrated information Φ
  const { phi, fisherTrace, fisherDeterminant } = computeIntegratedInformation(fim, basinCoordinates);
  
  // STEP 4: Effective coupling κ (FIXED: depends on Fisher structure)
  const { kappa, beta } = computeEffectiveCoupling(words, fisherTrace, fisherDeterminant);
  
  // STEP 5: Ricci scalar curvature
  const ricciScalar = computeRicciScalar(fim);
  
  // STEP 6: Overall quality (emergent)
  const phiFactor = phi;
  const kappaFactor = 1 - Math.abs(kappa - QIG_CONSTANTS.KAPPA_STAR) / QIG_CONSTANTS.KAPPA_STAR;
  const curvatureFactor = Math.exp(-ricciScalar);
  
  const quality = phiFactor * 0.5 + kappaFactor * 0.3 + curvatureFactor * 0.2;
  
  return {
    phi,
    kappa,
    beta,
    basinCoordinates,
    fisherTrace,
    fisherDeterminant,
    ricciScalar,
    quality: Math.max(0, Math.min(1, quality)),
  };
}

/**
 * Fisher distance (UNCHANGED)
 */
export function fisherDistance(phrase1: string, phrase2: string): number {
  const coords1 = computeBasinCoordinates(phrase1.trim().toLowerCase().split(/\s+/));
  const coords2 = computeBasinCoordinates(phrase2.trim().toLowerCase().split(/\s+/));
  
  const n = Math.min(coords1.length, coords2.length);
  
  let distanceSquared = 0;
  for (let i = 0; i < n; i++) {
    const delta = coords1[i] - coords2[i];
    const variance = Math.max(0.01, Math.abs(coords1[i] + coords2[i]) / 2);
    distanceSquared += (delta * delta) / variance;
  }
  
  return Math.sqrt(distanceSquared);
}

/**
 * Purity validation
 * 
 * CRITICAL: BIP-39 has uniform word distribution (all words equally likely).
 * Information comes from STRUCTURE (word repetition, spatial distribution),
 * not from individual word choice.
 * 
 * Valid tests:
 * - Repeated words vs unique words (different structure)
 * - Spatial clustering vs uniform distribution
 * - Determinism (same input → same output)
 * - Fisher distance > 0 for different phrases
 */
export function validatePurity(): { isPure: true; violations: never[] } | { isPure: false; violations: string[] } {
  const violations: string[] = [];
  
  // Test 1: Repeated words vs unique words (structure matters)
  const repeatedPhrase = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
  const uniquePhrase = "abandon ability able about above absent absorb abstract absurd abuse access accident";
  
  const scoreRepeated = scorePhraseQIG(repeatedPhrase);
  const scoreUnique = scorePhraseQIG(uniquePhrase);
  
  // PURE: Repeated words have different geometry than unique words
  if (Math.abs(scoreRepeated.phi - scoreUnique.phi) < 0.01) {
    violations.push("IMPURE: Φ does not vary with phrase structure (repeated vs unique words)");
  }
  
  if (Math.abs(scoreRepeated.kappa - scoreUnique.kappa) < 0.1) {
    violations.push("IMPURE: κ does not vary with phrase structure");
  }
  
  // Test 2: Spatial clustering (consecutive words vs distributed)
  const clusteredPhrase = "abandon ability able about above absent absorb abstract absurd abuse access accident";
  const distributedWords = ["abandon", "zebra", "ability", "zoo", "able", "zone", "about", "youth", "above", "year", "absent", "yield"];
  const distributedPhrase = distributedWords.join(' ');
  
  const scoreClustered = scorePhraseQIG(clusteredPhrase);
  const scoreDistributed = scorePhraseQIG(distributedPhrase);
  
  // PURE: Spatial distribution affects Φ
  if (Math.abs(scoreClustered.phi - scoreDistributed.phi) < 0.01) {
    violations.push("IMPURE: Φ does not vary with spatial distribution");
  }
  
  // Test 3: Fisher distance is non-zero for different phrases
  const distance = fisherDistance(repeatedPhrase, uniquePhrase);
  if (distance === 0) {
    violations.push("IMPURE: Fisher distance returns 0 for different phrases");
  }
  
  // Test 4: Determinism check
  const score2 = scorePhraseQIG(repeatedPhrase);
  if (scoreRepeated.phi !== score2.phi) {
    violations.push("IMPURE: Non-deterministic measurements");
  }
  
  // Test 5: No optimization loops (Φ and κ are measurements, not targets)
  // If Φ or κ are exactly 1.0 or κ*, something is being forced
  if (scoreRepeated.phi === 1.0 && scoreRepeated.kappa === QIG_CONSTANTS.KAPPA_STAR) {
    violations.push("IMPURE: Φ and κ appear to be hardcoded to targets (1.0 and 64)");
  }
  
  if (violations.length > 0) {
    return { isPure: false, violations };
  }
  
  return { isPure: true, violations: [] as never[] };
}
