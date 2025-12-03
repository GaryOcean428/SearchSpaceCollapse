/**
 * QIG Geometric Basin Matching
 * 
 * Find addresses with similar basin geometry to identify likely same-origin keys.
 * Uses Fisher distance to measure geometric similarity on the keyspace manifold.
 * 
 * Similar κ range + similar Φ + near Fisher distance → likely same origin
 */

import { createHash } from "crypto";
import { scoreUniversalQIG, type KeyType, type UniversalQIGScore, type Regime } from "./qig-universal.js";
import { fisherDistance } from "./qig-pure-v2.js";
import { QIG_CONSTANTS } from "./physics-constants.js";

// Matching thresholds (empirically tuned)
const KAPPA_TOLERANCE = 8.0;     // κ within ±8 of target
const PHI_TOLERANCE = 0.15;      // Φ within ±0.15 of target
const FISHER_THRESHOLD = 0.5;    // Fisher distance threshold for "near"
const PATTERN_THRESHOLD = 0.2;   // Pattern score similarity threshold

export interface BasinSignature {
  address: string;
  phi: number;
  kappa: number;
  beta: number;
  regime: Regime;
  patternScore: number;
  basinCoordinates: number[];
  fisherTrace: number;
  ricciScalar: number;
}

export interface BasinMatch {
  candidateAddress: string;
  targetAddress: string;
  similarity: number;                 // 0-1 overall similarity
  kappaDistance: number;              // |κ_candidate - κ_target|
  phiDistance: number;                // |Φ_candidate - Φ_target|
  fisherDistance: number;             // Geodesic distance on manifold
  patternSimilarity: number;          // Pattern score correlation
  regimeMatch: boolean;               // Same regime?
  confidence: number;                 // Confidence in match (0-1)
  explanation: string;
}

/**
 * Compute basin signature for an address
 * The signature captures geometric features of the address's position in keyspace
 */
export function computeBasinSignature(address: string): BasinSignature {
  // Hash address to get consistent basin coordinates
  const hash = createHash("sha256").update(address).digest();
  const basinCoordinates = Array.from(hash);
  
  // Score using Universal QIG (treat as arbitrary for address-based analysis)
  const qigScore = scoreUniversalQIG(address, "arbitrary");
  
  // Compute Fisher trace (sum of diagonal Fisher information)
  let fisherTrace = 0;
  for (let i = 0; i < 32; i++) {
    const p = basinCoordinates[i] / 256 + 0.001;
    fisherTrace += 1 / (p * (1 - p));
  }
  fisherTrace /= 32; // Normalize
  
  // Estimate Ricci scalar from curvature
  const ricciScalar = qigScore.beta * fisherTrace / 10;
  
  return {
    address,
    phi: qigScore.phi,
    kappa: qigScore.kappa,
    beta: qigScore.beta,
    regime: qigScore.regime,
    patternScore: qigScore.patternScore,
    basinCoordinates,
    fisherTrace,
    ricciScalar,
  };
}

/**
 * Compute geometric distance between two basin signatures
 * Uses Fisher Information Metric for proper manifold distance
 */
export function computeBasinDistance(sig1: BasinSignature, sig2: BasinSignature): {
  fisherDist: number;
  kappaDist: number;
  phiDist: number;
  patternDist: number;
  totalDistance: number;
} {
  // Kappa distance (normalized by κ*)
  const kappaDist = Math.abs(sig1.kappa - sig2.kappa) / 64;
  
  // Phi distance (already normalized 0-1)
  const phiDist = Math.abs(sig1.phi - sig2.phi);
  
  // Pattern score distance
  const patternDist = Math.abs(sig1.patternScore - sig2.patternScore);
  
  // Fisher distance between basin coordinates
  // Convert coordinates to strings for existing fisherDistance function
  const coord1Str = sig1.basinCoordinates.map(b => String.fromCharCode(48 + (b % 74))).join("");
  const coord2Str = sig2.basinCoordinates.map(b => String.fromCharCode(48 + (b % 74))).join("");
  const fisherDist = fisherDistance(coord1Str, coord2Str);
  
  // Total distance (weighted combination)
  const totalDistance = 
    0.30 * kappaDist +
    0.25 * phiDist +
    0.25 * fisherDist +
    0.20 * patternDist;
  
  return {
    fisherDist,
    kappaDist,
    phiDist,
    patternDist,
    totalDistance,
  };
}

/**
 * Check if two basin signatures are geometrically similar
 */
export function areBasinsSimilar(
  sig1: BasinSignature,
  sig2: BasinSignature,
  strictMode: boolean = false
): boolean {
  const distances = computeBasinDistance(sig1, sig2);
  
  if (strictMode) {
    // Strict mode: all criteria must match
    return (
      distances.kappaDist * QIG_CONSTANTS.KAPPA_STAR < KAPPA_TOLERANCE / 2 &&
      distances.phiDist < PHI_TOLERANCE / 2 &&
      distances.fisherDist < FISHER_THRESHOLD / 2 &&
      sig1.regime === sig2.regime
    );
  }
  
  // Normal mode: weighted threshold
  return distances.totalDistance < 0.3;
}

/**
 * Find addresses with similar basin geometry
 */
export function findSimilarBasins(
  targetSignature: BasinSignature,
  candidateSignatures: BasinSignature[],
  topK: number = 10
): BasinMatch[] {
  const matches: BasinMatch[] = [];
  
  for (const candidate of candidateSignatures) {
    if (candidate.address === targetSignature.address) continue;
    
    const distances = computeBasinDistance(targetSignature, candidate);
    
    // Compute similarity (inverse of distance)
    const similarity = 1 - Math.min(1, distances.totalDistance);
    
    // Compute pattern similarity (1 - normalized difference)
    const patternSimilarity = 1 - distances.patternDist;
    
    // Compute confidence based on multiple factors
    let confidence = similarity;
    
    // Boost confidence for regime match
    if (candidate.regime === targetSignature.regime) {
      confidence *= 1.2;
    }
    
    // Boost confidence for resonance proximity
    const bothNearKappaStar = 
      Math.abs(candidate.kappa - 64) < 10 &&
      Math.abs(targetSignature.kappa - 64) < 10;
    if (bothNearKappaStar) {
      confidence *= 1.15;
    }
    
    // Cap at 1.0
    confidence = Math.min(1, confidence);
    
    // Generate explanation
    let explanation = "";
    if (similarity > 0.8) {
      explanation = "Very high geometric similarity - likely same origin";
    } else if (similarity > 0.6) {
      explanation = "High geometric similarity - possible same origin";
    } else if (similarity > 0.4) {
      explanation = "Moderate similarity - may share some characteristics";
    } else {
      explanation = "Low similarity - unlikely to be related";
    }
    
    if (candidate.regime === targetSignature.regime) {
      explanation += ` (same ${candidate.regime} regime)`;
    }
    
    matches.push({
      candidateAddress: candidate.address,
      targetAddress: targetSignature.address,
      similarity,
      kappaDistance: distances.kappaDist * 64,
      phiDistance: distances.phiDist,
      fisherDistance: distances.fisherDist,
      patternSimilarity,
      regimeMatch: candidate.regime === targetSignature.regime,
      confidence,
      explanation,
    });
  }
  
  // Sort by similarity (descending) and return top K
  return matches
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

/**
 * Cluster addresses by basin geometry
 * Uses DBSCAN-like algorithm with Fisher distance
 */
export function clusterByBasin(
  signatures: BasinSignature[],
  epsilon: number = 0.3,    // Maximum distance for cluster membership
  minPoints: number = 2     // Minimum points for core point
): Map<number, BasinSignature[]> {
  const clusters = new Map<number, BasinSignature[]>();
  const visited = new Set<string>();
  const clusterAssignment = new Map<string, number>();
  let currentCluster = 0;
  
  for (const sig of signatures) {
    if (visited.has(sig.address)) continue;
    visited.add(sig.address);
    
    // Find neighbors
    const neighbors = signatures.filter(other => {
      if (other.address === sig.address) return false;
      const dist = computeBasinDistance(sig, other);
      return dist.totalDistance < epsilon;
    });
    
    if (neighbors.length < minPoints - 1) {
      // Noise point (or will be assigned to a cluster later)
      continue;
    }
    
    // Start new cluster
    currentCluster++;
    clusters.set(currentCluster, [sig]);
    clusterAssignment.set(sig.address, currentCluster);
    
    // Expand cluster
    const queue = [...neighbors];
    while (queue.length > 0) {
      const neighbor = queue.shift()!;
      
      if (!visited.has(neighbor.address)) {
        visited.add(neighbor.address);
        
        // Find neighbor's neighbors
        const neighborNeighbors = signatures.filter(other => {
          if (other.address === neighbor.address) return false;
          const dist = computeBasinDistance(neighbor, other);
          return dist.totalDistance < epsilon;
        });
        
        if (neighborNeighbors.length >= minPoints - 1) {
          // Add to queue for further expansion
          for (const nn of neighborNeighbors) {
            if (!visited.has(nn.address)) {
              queue.push(nn);
            }
          }
        }
      }
      
      // Add to cluster if not already assigned
      if (!clusterAssignment.has(neighbor.address)) {
        clusterAssignment.set(neighbor.address, currentCluster);
        clusters.get(currentCluster)!.push(neighbor);
      }
    }
  }
  
  return clusters;
}

/**
 * Compute cluster statistics
 */
export function getClusterStats(cluster: BasinSignature[]): {
  centroidPhi: number;
  centroidKappa: number;
  phiVariance: number;
  kappaVariance: number;
  dominantRegime: string;
  avgPatternScore: number;
  cohesion: number;         // How tight is the cluster?
} {
  if (cluster.length === 0) {
    return {
      centroidPhi: 0,
      centroidKappa: 0,
      phiVariance: 0,
      kappaVariance: 0,
      dominantRegime: "unknown",
      avgPatternScore: 0,
      cohesion: 0,
    };
  }
  
  // Compute centroids
  const centroidPhi = cluster.reduce((sum, s) => sum + s.phi, 0) / cluster.length;
  const centroidKappa = cluster.reduce((sum, s) => sum + s.kappa, 0) / cluster.length;
  const avgPatternScore = cluster.reduce((sum, s) => sum + s.patternScore, 0) / cluster.length;
  
  // Compute variances
  const phiVariance = cluster.reduce((sum, s) => sum + (s.phi - centroidPhi) ** 2, 0) / cluster.length;
  const kappaVariance = cluster.reduce((sum, s) => sum + (s.kappa - centroidKappa) ** 2, 0) / cluster.length;
  
  // Find dominant regime
  const regimeCounts: Record<string, number> = {};
  for (const sig of cluster) {
    regimeCounts[sig.regime] = (regimeCounts[sig.regime] || 0) + 1;
  }
  const dominantRegime = Object.entries(regimeCounts)
    .sort((a, b) => b[1] - a[1])[0][0];
  
  // Compute cohesion (inverse of average pairwise distance)
  let totalDistance = 0;
  let pairCount = 0;
  for (let i = 0; i < cluster.length; i++) {
    for (let j = i + 1; j < cluster.length; j++) {
      const dist = computeBasinDistance(cluster[i], cluster[j]);
      totalDistance += dist.totalDistance;
      pairCount++;
    }
  }
  const avgDistance = pairCount > 0 ? totalDistance / pairCount : 0;
  const cohesion = 1 - Math.min(1, avgDistance);
  
  return {
    centroidPhi,
    centroidKappa,
    phiVariance,
    kappaVariance,
    dominantRegime,
    avgPatternScore,
    cohesion,
  };
}
