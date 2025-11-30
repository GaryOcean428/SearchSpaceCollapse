/**
 * κ_recovery Constraint Solver
 * 
 * Computes recovery difficulty rankings for dormant Bitcoin addresses
 * using Quantum Information Geometry principles:
 * 
 * κ_recovery = Φ_constraints / H_creation
 * 
 * Lower κ = easier to recover (high constraints, low entropy)
 * Higher κ = harder to recover (low constraints, high entropy)
 */

import type { Address, Entity, Artifact } from "@shared/schema";

// ============================================================================
// CONSTRAINT ANALYSIS
// ============================================================================

export interface ConstraintBreakdown {
  // Entity linkage
  entityLinkage: number;  // Renamed from linkedEntities
  entityConfidence: number; // 0-1
  
  // Artifact linkage
  artifactDensity: number; // artifacts per day of activity
  
  // Temporal precision
  temporalPrecisionHours: number; // How precisely we know creation time
  
  // Graph connectivity
  graphSignature: number; // Renamed from graphDegree - graph connectivity score
  clusterSize: number; // Size of address cluster
  
  // Value patterns
  hasRoundNumbers: boolean;
  isCoinbase: boolean;
  valuePatternStrength: number; // 0-1
  
  // Script/software fingerprint
  hasSoftwareFingerprint: boolean;
  scriptComplexity: number; // 0-1
}

/**
 * Compute Φ_constraints (integrated information from constraints)
 * 
 * Higher Φ = more information available to constrain search space
 */
export function computePhiConstraints(
  address: Address,
  entities: Entity[],
  artifacts: Artifact[]
): { phi: number; breakdown: ConstraintBreakdown } {
  
  const breakdown: ConstraintBreakdown = {
    entityLinkage: entities.length,
    entityConfidence: 0,
    artifactDensity: 0,
    temporalPrecisionHours: 0,
    graphSignature: 0,
    clusterSize: 0,
    hasRoundNumbers: false,
    isCoinbase: address.isCoinbaseReward || false,
    valuePatternStrength: 0,
    hasSoftwareFingerprint: false,
    scriptComplexity: 0,
  };
  
  // Entity linkage score (0-30 points)
  const entityScore = Math.min(entities.length * 10, 30);
  
  // Entity confidence: higher if multiple identity fields match
  if (entities.length > 0) {
    const confidenceScores = entities.map(e => {
      let score = 0;
      if (e.knownAddresses && e.knownAddresses.includes(address.address)) score += 0.4;
      if (e.bitcoinTalkUsername) score += 0.2;
      if (e.githubUsername) score += 0.2;
      if (e.emailAddresses && e.emailAddresses.length > 0) score += 0.2;
      return Math.min(score, 1.0);
    });
    breakdown.entityConfidence = Math.max(...confidenceScores);
  }
  
  // Artifact density score (0-25 points)
  const daysSinceCreation = Math.max(1, 
    (Date.now() - new Date(address.firstSeenTimestamp).getTime()) / (1000 * 60 * 60 * 24)
  );
  breakdown.artifactDensity = artifacts.length / daysSinceCreation;
  const artifactScore = Math.min(artifacts.length * 5, 25);
  
  // Temporal precision (0-15 points)
  // Narrow time window = better constraints
  const temporalSig = address.temporalSignature as any;
  let temporalScore = 0;
  if (temporalSig && temporalSig.hourPattern) {
    // If we know hour pattern, precision is high (1-hour precision)
    breakdown.temporalPrecisionHours = 1;
    temporalScore = 15;
  } else {
    // Otherwise use block time (~10 min resolution)
    breakdown.temporalPrecisionHours = 0.167; // ~10 minutes
    temporalScore = 5;
  }
  
  // Graph connectivity (0-15 points)
  const graphSig = address.graphSignature as any;
  if (graphSig) {
    breakdown.graphSignature = graphSig.inputAddresses?.length || 0;
    breakdown.clusterSize = graphSig.clusterSize || 0;
  }
  const graphScore = Math.min(breakdown.graphSignature * 3 + breakdown.clusterSize * 0.5, 15);
  
  // Value pattern analysis (0-10 points)
  const valueSig = address.valueSignature as any;
  if (valueSig) {
    breakdown.hasRoundNumbers = valueSig.hasRoundNumbers || false;
    breakdown.valuePatternStrength = valueSig.patternStrength || 0;
  }
  const valueScore = breakdown.hasRoundNumbers ? 10 : 0;
  
  // Script/software fingerprint (0-5 points)
  const scriptSig = address.scriptSignature as any;
  if (scriptSig && scriptSig.softwareFingerprint) {
    breakdown.hasSoftwareFingerprint = true;
    breakdown.scriptComplexity = scriptSig.complexity || 0.5;
  }
  const scriptScore = breakdown.hasSoftwareFingerprint ? 5 : 0;
  
  // Total Φ_constraints (0-100 scale)
  const phi = entityScore + artifactScore + temporalScore + graphScore + valueScore + scriptScore;
  
  return { phi, breakdown };
}

// ============================================================================
// CREATION ENTROPY ANALYSIS
// ============================================================================

export interface EntropyBreakdown {
  eraFactor: number; // 2009 = 1.0 (highest), 2011 = 0.5
  scriptComplexityFactor: number; // 0-1
  miningFactor: number; // Coinbase = higher entropy
  balanceFactor: number; // Large balance = lower entropy (more careful)
  dormancyFactor: number; // Longer dormancy = higher entropy
}

/**
 * Compute H_creation (creation entropy)
 * 
 * Higher H = more uncertainty at creation time
 */
export function computeHCreation(
  address: Address
): { h: number; breakdown: EntropyBreakdown } {
  
  const breakdown: EntropyBreakdown = {
    eraFactor: 0,
    scriptComplexityFactor: 0,
    miningFactor: 0,
    balanceFactor: 0,
    dormancyFactor: 0,
  };
  
  // Era factor (30 points): Earlier = higher entropy
  const firstSeenYear = new Date(address.firstSeenTimestamp).getFullYear();
  if (firstSeenYear <= 2009) {
    breakdown.eraFactor = 1.0;
  } else if (firstSeenYear === 2010) {
    breakdown.eraFactor = 0.8;
  } else if (firstSeenYear === 2011) {
    breakdown.eraFactor = 0.6;
  } else {
    breakdown.eraFactor = 0.4;
  }
  const eraScore = breakdown.eraFactor * 30;
  
  // Script complexity (20 points): More complex = higher entropy
  const scriptSig = address.scriptSignature as any;
  breakdown.scriptComplexityFactor = scriptSig?.complexity || 0.5;
  const scriptScore = breakdown.scriptComplexityFactor * 20;
  
  // Mining factor (15 points): Coinbase = higher entropy (auto-generated)
  breakdown.miningFactor = address.isCoinbaseReward ? 1.0 : 0.3;
  const miningScore = breakdown.miningFactor * 15;
  
  // Balance factor (20 points): Large balance = LOWER entropy (more careful)
  const balanceBTC = Number(address.currentBalance) / 1e8;
  if (balanceBTC > 1000) {
    breakdown.balanceFactor = 0.2; // Very careful
  } else if (balanceBTC > 100) {
    breakdown.balanceFactor = 0.4;
  } else if (balanceBTC > 10) {
    breakdown.balanceFactor = 0.6;
  } else if (balanceBTC > 1) {
    breakdown.balanceFactor = 0.8;
  } else {
    breakdown.balanceFactor = 1.0; // Small balance = less care
  }
  const balanceScore = breakdown.balanceFactor * 20;
  
  // Dormancy factor (15 points): Longer dormancy = higher entropy
  const dormancyYears = address.dormancyBlocks / (365 * 24 * 6); // ~6 blocks/hour
  breakdown.dormancyFactor = Math.min(dormancyYears / 10, 1.0);
  const dormancyScore = breakdown.dormancyFactor * 15;
  
  // Total H_creation (0-100 scale)
  const h = eraScore + scriptScore + miningScore + balanceScore + dormancyScore;
  
  return { h, breakdown };
}

// ============================================================================
// κ_RECOVERY COMPUTATION
// ============================================================================

export interface KappaRecoveryResult {
  kappa: number; // κ_recovery = Φ / H
  phi: number; // Φ_constraints
  h: number; // H_creation
  tier: 'high' | 'medium' | 'low' | 'unrecoverable';
  recommendedVector: 'estate' | 'constrained_search' | 'social' | 'temporal';
  constraints: ConstraintBreakdown;
  entropy: EntropyBreakdown;
}

/**
 * Compute κ_recovery for a single address
 * 
 * κ_recovery = Φ_constraints / H_creation
 * 
 * Lower κ = easier to recover (prioritize these)
 */
export function computeKappaRecovery(
  address: Address,
  entities: Entity[],
  artifacts: Artifact[]
): KappaRecoveryResult {
  
  const { phi, breakdown: constraints } = computePhiConstraints(address, entities, artifacts);
  const { h, breakdown: entropy } = computeHCreation(address);
  
  // Compute κ_recovery
  // Add epsilon to avoid division by zero
  const epsilon = 0.1;
  const kappa = phi / (h + epsilon);
  
  // Determine tier based on κ_recovery
  // Lower κ = easier to recover (high priority)
  let tier: 'high' | 'medium' | 'low' | 'unrecoverable';
  if (kappa >= 2.0) {
    tier = 'high'; // High constraints, low entropy
  } else if (kappa >= 1.0) {
    tier = 'medium';
  } else if (kappa >= 0.3) {
    tier = 'low';
  } else {
    tier = 'unrecoverable'; // Very low constraints, high entropy
  }
  
  // Recommend recovery vector
  let recommendedVector: 'estate' | 'constrained_search' | 'social' | 'temporal';
  
  // Estate vector: if we have entity with estate contact
  const hasEstateContact = entities.some(e => e.isDeceased && e.estateContact);
  
  // Social vector: if we have many artifacts
  const hasManyArtifacts = artifacts.length >= 5;
  
  // Temporal vector: if we have meaningful temporal signature (≥1 hour precision = hourPattern exists)
  const hasTemporalSignature = constraints.temporalPrecisionHours >= 1.0;
  
  if (hasEstateContact) {
    recommendedVector = 'estate';
  } else if (hasManyArtifacts) {
    recommendedVector = 'social';
  } else if (hasTemporalSignature || constraints.graphSignature > 0) {
    recommendedVector = 'constrained_search';
  } else {
    recommendedVector = 'temporal';
  }
  
  return {
    kappa,
    phi,
    h,
    tier,
    recommendedVector,
    constraints,
    entropy,
  };
}

// ============================================================================
// BATCH COMPUTATION
// ============================================================================

export interface RankedRecoveryResult {
  address: string;
  rank: number;
  kappa: number;
  phi: number;
  h: number;
  tier: 'high' | 'medium' | 'low' | 'unrecoverable';
  recommendedVector: 'estate' | 'constrained_search' | 'social' | 'temporal';
  constraints: ConstraintBreakdown;
  entropy: EntropyBreakdown;
  estimatedValueUSD: number;
}

/**
 * Compute κ_recovery for all dormant addresses and rank them
 * 
 * Returns addresses sorted by κ_recovery (ascending = easier to recover first)
 */
export function rankRecoveryPriorities(
  addresses: Address[],
  entitiesByAddress: Map<string, Entity[]>,
  artifactsByAddress: Map<string, Artifact[]>,
  btcPriceUSD: number = 100000 // Default BTC price
): RankedRecoveryResult[] {
  
  // Compute κ_recovery for each address
  const results = addresses.map(address => {
    const entities = entitiesByAddress.get(address.address) || [];
    const artifacts = artifactsByAddress.get(address.address) || [];
    
    const result = computeKappaRecovery(address, entities, artifacts);
    
    // Estimate value in USD
    const balanceBTC = Number(address.currentBalance) / 1e8;
    const estimatedValueUSD = balanceBTC * btcPriceUSD;
    
    return {
      address: address.address,
      rank: 0, // Will be set after sorting
      kappa: result.kappa,
      phi: result.phi,
      h: result.h,
      tier: result.tier,
      recommendedVector: result.recommendedVector,
      constraints: result.constraints,
      entropy: result.entropy,
      estimatedValueUSD,
    };
  });
  
  // Sort by κ_recovery (ascending = easier first)
  // Secondary sort by value (descending = higher value first)
  results.sort((a, b) => {
    if (Math.abs(a.kappa - b.kappa) > 0.01) {
      return b.kappa - a.kappa; // Higher κ first (descending)
    }
    return b.estimatedValueUSD - a.estimatedValueUSD;
  });
  
  // Assign ranks
  results.forEach((result, index) => {
    result.rank = index + 1;
  });
  
  return results;
}
