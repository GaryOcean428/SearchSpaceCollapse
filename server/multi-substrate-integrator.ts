/**
 * Multi-Substrate Geometric Intersection
 * 
 * Combines data from multiple sources to identify recovery targets:
 * - Bitcoin blockchain (dormant addresses, transaction patterns)
 * - BitcoinTalk archives (forum posts, user activity)
 * - GitHub/SourceForge (code commits, developer activity)
 * - Cryptography mailing lists
 * - Temporal archives (archive.org, Wayback Machine)
 * 
 * Each source provides basin coordinates; intersection identifies high-priority targets.
 */

import { createHash } from "crypto";
import { observerStorage } from "./observer-storage";
import type { Address, Entity, Artifact, RecoveryPriority } from "@shared/schema";

export type SubstrateType = 
  | "blockchain"
  | "bitcointalk"
  | "github"
  | "sourceforge"
  | "cryptography_ml"
  | "bitcoin_ml"
  | "temporal_archive"
  | "mt_gox"
  | "news";

export interface SubstrateSignal {
  type: SubstrateType;
  address?: string;
  entity?: string;
  timestamp?: Date;
  confidence: number;           // 0-1 signal confidence
  geometricWeight: number;      // Weight in intersection calculation
  data: Record<string, any>;    // Source-specific data
}

export interface GeometricIntersection {
  address: string;
  substrates: SubstrateType[];
  signalCount: number;
  intersectionStrength: number; // 0-1 combined strength
  temporalCoherence: number;    // How well-aligned are timestamps?
  entityOverlap: number;        // Shared entity references
  artifactDensity: number;      // Artifact richness
  kappaEstimate: number;        // Estimated κ_recovery
  confidence: number;           // Overall confidence
  signals: SubstrateSignal[];
}

/**
 * Extract geometric weight for each substrate type
 * Based on reliability and information density
 */
function getSubstrateWeight(type: SubstrateType): number {
  const weights: Record<SubstrateType, number> = {
    blockchain: 1.0,        // Most reliable - on-chain data
    bitcointalk: 0.8,       // High - contemporary forum activity
    github: 0.7,            // Good - developer activity
    sourceforge: 0.6,       // Good - early code hosting
    cryptography_ml: 0.9,   // High - early crypto discussions
    bitcoin_ml: 0.85,       // High - Bitcoin-specific discussions
    temporal_archive: 0.5,  // Medium - archived snapshots
    mt_gox: 0.6,            // Medium - exchange records
    news: 0.3,              // Low - general news
  };
  return weights[type] || 0.5;
}

/**
 * Gather signals from blockchain substrate
 */
async function gatherBlockchainSignals(address: string): Promise<SubstrateSignal[]> {
  const signals: SubstrateSignal[] = [];
  
  try {
    const addressData = await observerStorage.getAddress(address);
    
    if (addressData) {
      signals.push({
        type: "blockchain",
        address,
        timestamp: addressData.firstSeenTimestamp,
        confidence: 1.0, // On-chain data is definitive
        geometricWeight: getSubstrateWeight("blockchain"),
        data: {
          balance: addressData.currentBalance.toString(),
          isDormant: addressData.isDormant,
          dormancyBlocks: addressData.dormancyBlocks,
          isEarlyEra: addressData.isEarlyEra,
          isCoinbase: addressData.isCoinbaseReward,
          temporalSignature: addressData.temporalSignature,
          valueSignature: addressData.valueSignature,
          scriptSignature: addressData.scriptSignature,
          graphSignature: addressData.graphSignature,
        },
      });
    }
  } catch (error) {
    console.error(`[MultiSubstrate] Blockchain signal error for ${address}:`, error);
  }
  
  return signals;
}

/**
 * Gather signals from entity-linked substrates
 */
async function gatherEntitySignals(address: string): Promise<SubstrateSignal[]> {
  const signals: SubstrateSignal[] = [];
  
  try {
    const entities = await observerStorage.getEntitiesByAddress(address);
    
    for (const entity of entities) {
      // BitcoinTalk signal
      if (entity.bitcoinTalkUsername) {
        signals.push({
          type: "bitcointalk",
          address,
          entity: entity.name,
          timestamp: entity.firstActivityDate || undefined,
          confidence: 0.85,
          geometricWeight: getSubstrateWeight("bitcointalk"),
          data: {
            username: entity.bitcoinTalkUsername,
            entityType: entity.type,
            aliases: entity.aliases,
          },
        });
      }
      
      // GitHub signal
      if (entity.githubUsername) {
        signals.push({
          type: "github",
          address,
          entity: entity.name,
          timestamp: entity.firstActivityDate || undefined,
          confidence: 0.75,
          geometricWeight: getSubstrateWeight("github"),
          data: {
            username: entity.githubUsername,
            entityType: entity.type,
          },
        });
      }
      
      // Email-based signals (mailing lists)
      if (entity.emailAddresses && entity.emailAddresses.length > 0) {
        signals.push({
          type: "cryptography_ml",
          address,
          entity: entity.name,
          confidence: 0.6,
          geometricWeight: getSubstrateWeight("cryptography_ml"),
          data: {
            emails: entity.emailAddresses,
          },
        });
      }
    }
  } catch (error) {
    console.error(`[MultiSubstrate] Entity signal error for ${address}:`, error);
  }
  
  return signals;
}

/**
 * Gather signals from artifacts
 */
async function gatherArtifactSignals(address: string): Promise<SubstrateSignal[]> {
  const signals: SubstrateSignal[] = [];
  
  try {
    const artifacts = await observerStorage.getArtifactsByAddress(address);
    
    for (const artifact of artifacts) {
      const type = artifact.source as SubstrateType;
      
      signals.push({
        type: type || "news",
        address,
        timestamp: artifact.timestamp || undefined,
        confidence: artifact.source === "bitcointalk" ? 0.8 : 0.5,
        geometricWeight: getSubstrateWeight(type || "news"),
        data: {
          title: artifact.title,
          author: artifact.author,
          url: artifact.url,
          artifactType: artifact.type,
        },
      });
    }
  } catch (error) {
    console.error(`[MultiSubstrate] Artifact signal error for ${address}:`, error);
  }
  
  return signals;
}

/**
 * Compute temporal coherence of signals
 * High coherence = signals from similar time periods
 */
function computeTemporalCoherence(signals: SubstrateSignal[]): number {
  const timestamps = signals
    .filter(s => s.timestamp)
    .map(s => s.timestamp!.getTime());
  
  if (timestamps.length < 2) return 0.5; // Neutral if insufficient data
  
  // Compute standard deviation of timestamps
  const mean = timestamps.reduce((a, b) => a + b, 0) / timestamps.length;
  const variance = timestamps.reduce((sum, t) => sum + (t - mean) ** 2, 0) / timestamps.length;
  const stdDev = Math.sqrt(variance);
  
  // Normalize: 1 year = low coherence, 1 month = high coherence
  const oneYear = 365 * 24 * 60 * 60 * 1000;
  const coherence = Math.max(0, 1 - stdDev / oneYear);
  
  return coherence;
}

/**
 * Compute intersection strength from multiple signals
 */
function computeIntersectionStrength(signals: SubstrateSignal[]): number {
  if (signals.length === 0) return 0;
  
  // Weighted average of confidence × weight
  let totalWeight = 0;
  let weightedSum = 0;
  
  for (const signal of signals) {
    const w = signal.geometricWeight;
    weightedSum += signal.confidence * w;
    totalWeight += w;
  }
  
  const baseStrength = totalWeight > 0 ? weightedSum / totalWeight : 0;
  
  // Boost for multiple substrates
  const uniqueSubstrates = new Set(signals.map(s => s.type)).size;
  const diversityBonus = Math.min(0.3, uniqueSubstrates * 0.05);
  
  return Math.min(1, baseStrength + diversityBonus);
}

/**
 * Estimate κ_recovery from signal data
 */
function estimateKappaFromSignals(signals: SubstrateSignal[]): number {
  let phiConstraints = 0;
  let hCreation = 4.0; // Default entropy assumption
  
  for (const signal of signals) {
    switch (signal.type) {
      case "blockchain":
        // On-chain constraints
        if (signal.data.isEarlyEra) phiConstraints += 0.3;
        if (signal.data.isCoinbase) phiConstraints += 0.5;
        if (signal.data.isDormant) phiConstraints += 0.2;
        if (signal.data.temporalSignature?.likelyTimezones?.length) {
          phiConstraints += 0.2;
        }
        break;
        
      case "bitcointalk":
        phiConstraints += 0.4;
        hCreation -= 0.5; // Known username = lower entropy
        break;
        
      case "github":
      case "sourceforge":
        phiConstraints += 0.3;
        hCreation -= 0.3;
        break;
        
      case "cryptography_ml":
      case "bitcoin_ml":
        phiConstraints += 0.5;
        hCreation -= 0.5;
        break;
    }
  }
  
  // Clamp values
  phiConstraints = Math.min(1.5, phiConstraints);
  hCreation = Math.max(0.5, hCreation);
  
  return phiConstraints / hCreation;
}

/**
 * Perform geometric intersection analysis for an address
 */
export async function analyzeGeometricIntersection(
  address: string
): Promise<GeometricIntersection> {
  // Gather signals from all substrates
  const [blockchainSignals, entitySignals, artifactSignals] = await Promise.all([
    gatherBlockchainSignals(address),
    gatherEntitySignals(address),
    gatherArtifactSignals(address),
  ]);
  
  const allSignals = [...blockchainSignals, ...entitySignals, ...artifactSignals];
  const uniqueSubstrates = Array.from(new Set(allSignals.map(s => s.type)));
  
  // Compute metrics
  const intersectionStrength = computeIntersectionStrength(allSignals);
  const temporalCoherence = computeTemporalCoherence(allSignals);
  const entityOverlap = entitySignals.length > 0 ? Math.min(1, entitySignals.length / 3) : 0;
  const artifactDensity = artifactSignals.length > 0 ? Math.min(1, artifactSignals.length / 5) : 0;
  const kappaEstimate = estimateKappaFromSignals(allSignals);
  
  // Overall confidence
  const confidence = (
    0.35 * intersectionStrength +
    0.20 * temporalCoherence +
    0.20 * entityOverlap +
    0.15 * artifactDensity +
    0.10 * Math.min(1, kappaEstimate)
  );
  
  return {
    address,
    substrates: uniqueSubstrates,
    signalCount: allSignals.length,
    intersectionStrength,
    temporalCoherence,
    entityOverlap,
    artifactDensity,
    kappaEstimate,
    confidence,
    signals: allSignals,
  };
}

/**
 * Find highest-priority targets based on geometric intersection
 */
export async function findHighPriorityTargets(
  limit: number = 20
): Promise<GeometricIntersection[]> {
  // Get dormant addresses
  const dormantAddresses = await observerStorage.getDormantAddresses({
    limit: 100,
    minBalance: 100000000, // At least 1 BTC
  });
  
  // Analyze each address
  const intersections: GeometricIntersection[] = [];
  
  for (const addr of dormantAddresses) {
    const intersection = await analyzeGeometricIntersection(addr.address);
    intersections.push(intersection);
  }
  
  // Sort by confidence and return top targets
  return intersections
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
}

/**
 * Enrich recovery priority with multi-substrate data
 */
export async function enrichWithSubstrateData(
  priority: RecoveryPriority
): Promise<{
  priority: RecoveryPriority;
  intersection: GeometricIntersection;
  enrichedConstraints: Record<string, any>;
}> {
  const intersection = await analyzeGeometricIntersection(priority.address);
  
  // Merge substrate insights into constraints
  const enrichedConstraints = {
    ...(priority.constraints as any),
    substrateCount: intersection.substrates.length,
    signalDensity: intersection.signalCount,
    temporalCoherence: intersection.temporalCoherence,
    entityLinkage: intersection.entityOverlap,
    artifactDensity: intersection.artifactDensity,
    multiSubstrateKappa: intersection.kappaEstimate,
  };
  
  return {
    priority,
    intersection,
    enrichedConstraints,
  };
}

/**
 * Generate substrate coverage report
 */
export function generateSubstrateReport(intersection: GeometricIntersection): string {
  const lines: string[] = [];
  
  lines.push(`=== Multi-Substrate Geometric Analysis ===`);
  lines.push(`Address: ${intersection.address}`);
  lines.push(`Substrates: ${intersection.substrates.join(", ")}`);
  lines.push(`Signal Count: ${intersection.signalCount}`);
  lines.push(``);
  lines.push(`Metrics:`);
  lines.push(`  Intersection Strength: ${(intersection.intersectionStrength * 100).toFixed(1)}%`);
  lines.push(`  Temporal Coherence: ${(intersection.temporalCoherence * 100).toFixed(1)}%`);
  lines.push(`  Entity Overlap: ${(intersection.entityOverlap * 100).toFixed(1)}%`);
  lines.push(`  Artifact Density: ${(intersection.artifactDensity * 100).toFixed(1)}%`);
  lines.push(`  Estimated κ_recovery: ${intersection.kappaEstimate.toFixed(3)}`);
  lines.push(`  Overall Confidence: ${(intersection.confidence * 100).toFixed(1)}%`);
  lines.push(``);
  lines.push(`Signal Details:`);
  
  for (const signal of intersection.signals) {
    lines.push(`  [${signal.type}] conf=${(signal.confidence * 100).toFixed(0)}% weight=${signal.geometricWeight.toFixed(2)}`);
    if (signal.entity) lines.push(`    Entity: ${signal.entity}`);
    if (signal.timestamp) lines.push(`    Time: ${signal.timestamp.toISOString()}`);
  }
  
  return lines.join("\n");
}
