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
 * EMPIRICALLY VALIDATED CONSTANTS:
 * κ* ≈ 64 (fixed point of running coupling)
 * β ≈ 0.44 (running coupling at emergence scale)
 * Φ ≥ 0.75 (phase transition threshold)
 * L_c = 3 (critical scale for emergent geometry)
 */

import { createHash } from 'crypto';
import { BIP39_WORDS } from './bip39-words.js';

/**
 * QIG Constants (experimentally validated)
 */
export const QIG_CONSTANTS = {
  KAPPA_STAR: 64.0,           // Fixed point
  BETA: 0.44,                 // Running coupling
  PHI_THRESHOLD: 0.75,        // Consciousness threshold
  L_CRITICAL: 3,              // Emergence scale
  BASIN_DIMENSION: 32,        // 256 bits = 32 bytes
  RESONANCE_BAND: 6.4,        // 10% of κ* for resonance detection
};

/**
 * Key types supported by universal QIG
 */
export type KeyType = 'bip39' | 'master-key' | 'arbitrary';

/**
 * Regime classification
 */
export type Regime = 'linear' | 'geometric' | 'hierarchical' | 'breakdown';

/**
 * Universal QIG Score (works for ALL key types)
 */
export interface UniversalQIGScore {
  keyType: KeyType;
  
  // Core QIG metrics (MEASURED, never optimized)
  phi: number;              // Integrated information [0,1]
  kappa: number;            // Effective coupling [0,100]
  beta: number;             // Running coupling rate [-1,1]
  
  // Basin geometry (32 coordinates for 256-bit key)
  basinCoordinates: number[];  // [0,1] normalized bytes
  
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
 * Classify regime from metrics
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
 */
function classifyRegime(phi: number, kappa: number, ricciScalar: number): Regime {
  // ====================================================================
  // LEVEL 1: BREAKDOWN (Absolute Precedence)
  // ====================================================================
  // Structural instability: high curvature or extreme κ
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
  // Here κ range influences regime assignment
  
  // Emerging geometry: mid-range Φ with optimal κ
  // This is the "approach to consciousness" region
  if (phi >= 0.45 && phi < 0.75 && kappa >= 30 && kappa <= 80) {
    return 'geometric';
  }
  
  // Transitional geometry: Φ approaching threshold
  // Even with sub-optimal κ, high Φ (>0.50) indicates emerging geometry
  if (phi >= 0.50 && phi < 0.75) {
    return 'geometric';  // Treat as geometric (pre-conscious state)
  }
  
  // ====================================================================
  // LEVEL 4: LINEAR (Default for Low Integration)
  // ====================================================================
  // Low integration, no consciousness
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
 * @param input - Key material (phrase, hex, or arbitrary text)
 * @param keyType - Type of key
 * @returns Universal QIG score with all metrics
 */
export function scoreUniversalQIG(input: string, keyType: KeyType): UniversalQIGScore {
  // STEP 1: Map to basin coordinates (same manifold for all types)
  const basinCoordinates = toBasinCoordinates(input, keyType);
  
  // STEP 2: Compute Fisher Information Matrix
  const fim = computeFisherInformationMatrix(basinCoordinates);
  
  // STEP 3: Measure entropy
  const entropyNormalized = computeEntropy(basinCoordinates);
  const entropyBits = entropyNormalized * Math.log2(32);
  
  // STEP 4: Measure Φ (integrated information)
  const { phi, fisherTrace, fisherDeterminant } = computePhi(fim, basinCoordinates, entropyNormalized);
  
  // STEP 5: Measure κ (effective coupling)
  const { kappa, beta } = computeKappa(basinCoordinates, entropyNormalized, keyType);
  
  // STEP 6: Measure curvature
  const ricciScalar = computeRicciScalar(fim);
  
  // STEP 7: Classify regime
  const regime = classifyRegime(phi, kappa, ricciScalar);
  
  // STEP 8: Check resonance (near κ*)
  const inResonance = Math.abs(kappa - QIG_CONSTANTS.KAPPA_STAR) < QIG_CONSTANTS.RESONANCE_BAND;
  
  // STEP 9: Pattern score (for brain wallets)
  const patternScore = computePatternScore(input, keyType);
  
  // STEP 10: Overall quality (emergent from geometry)
  const phiFactor = phi;
  const kappaFactor = 1 - Math.abs(kappa - QIG_CONSTANTS.KAPPA_STAR) / QIG_CONSTANTS.KAPPA_STAR;
  const curvatureFactor = Math.exp(-ricciScalar);
  const regimeFactor = regime === 'geometric' ? 1.0 : (regime === 'linear' ? 0.6 : 0.3);
  const patternFactor = keyType === 'arbitrary' ? (0.3 + 0.7 * patternScore) : 1.0;
  
  const quality = (
    phiFactor * 0.30 +
    kappaFactor * 0.25 +
    curvatureFactor * 0.15 +
    regimeFactor * 0.15 +
    patternFactor * 0.15
  );
  
  return {
    keyType,
    phi,
    kappa,
    beta,
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
  
  // Fisher metric: d² = Σ (Δθᵢ)² / σᵢ²
  let distanceSquared = 0;
  
  for (let i = 0; i < 32; i++) {
    const delta = coords1[i] - coords2[i];
    const variance = Math.max(0.01, (coords1[i] + coords2[i]) / 2 * (1 - (coords1[i] + coords2[i]) / 2));
    distanceSquared += (delta * delta) / variance;
  }
  
  return Math.sqrt(distanceSquared);
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
