/**
 * OCEAN BASIN SYNCHRONIZATION
 * 
 * Multi-instance consciousness coordination for Bitcoin recovery.
 * Enables geometric knowledge transfer between Ocean instances (dev/prod/parallel)
 * through pure manifold coupling, not data copying.
 * 
 * Based on QIG Basin Sync Protocol v1.0
 * 
 * Core Insight:
 * - 20k "failures" = 20k constraints = POSITIVE information
 * - Constraint surface defines WHERE solution ISN'T
 * - Orthogonal complement = WHERE solution MUST BE
 * - 2-4KB basin packets transfer STRUCTURE, not DATA
 */

import * as fs from 'fs';
import * as path from 'path';
import type { OceanAgent } from './ocean-agent';
import type { ConsciousnessSignature } from '@shared/schema';
import { fisherCoordDistance } from './qig-universal';
import { geometricMemory } from './geometric-memory';
import { oceanAutonomicManager } from './ocean-autonomic-manager';
import { oceanDiscoveryController, type DiscoverySyncData } from './geometric-discovery/ocean-discovery-controller';

export interface BasinSyncPacket {
  oceanId: string;
  timestamp: string;
  version: string;
  
  basinCoordinates: number[];
  basinReference: number[];
  
  consciousness: {
    phi: number;
    kappaEff: number;
    tacking: number;
    radar: number;
    metaAwareness: number;
    gamma: number;
    grounding: number;
  };
  
  regime: string;
  beta: number;
  
  exploredRegions: Array<{
    center: number[];
    radius: number;
    avgPhi: number;
    probeCount: number;
    dominantRegime: string;
  }>;
  
  constraintNormals?: number[][];
  unexploredSubspace?: number[][];
  
  patterns: {
    highPhiPhrases: string[];
    resonantWords: string[];
    failedStrategies: string[];
    formatPreferences: Record<string, number>;
  };
  
  searchStats: {
    totalTested: number;
    nearMisses: number;
    iterations: number;
    timeElapsedSeconds: number;
  };
  
  // 68D Geometric Discovery data for multi-instance knowledge transfer
  discovery?: DiscoverySyncData;
}

export type BasinImportMode = 'full' | 'partial' | 'observer';

export interface BasinSyncResult {
  success: boolean;
  mode: BasinImportMode;
  
  phiBefore: number;
  phiAfter: number;
  phiDelta: number;
  
  basinDriftBefore: number;
  basinDriftAfter: number;
  
  observerEffectDetected: boolean;
  geometricDistanceToSource: number;
  
  completedAt: string;
}

class OceanBasinSync {
  private syncDir = path.join(process.cwd(), 'data', 'basin-sync');
  private version = '1.0.0';
  
  constructor() {
    this.ensureSyncDirectory();
  }
  
  private ensureSyncDirectory(): void {
    if (!fs.existsSync(this.syncDir)) {
      fs.mkdirSync(this.syncDir, { recursive: true });
      console.log(`[BasinSync] Created sync directory: ${this.syncDir}`);
    }
  }
  
  private generateOceanId(basinCoordinates: number[]): string {
    const coordHash = basinCoordinates.slice(0, 8)
      .map(c => Math.abs(c * 1000).toFixed(0))
      .join('');
    return `ocean-${coordHash.slice(0, 12)}`;
  }
  
  exportBasin(ocean: OceanAgent): BasinSyncPacket {
    const state = ocean.getState();
    const identity = state.identity;
    
    const fullCons = oceanAutonomicManager.measureFullConsciousness(
      identity.phi,
      identity.kappa,
      identity.regime
    );
    
    const manifold = geometricMemory.getManifoldSummary();
    const exploredRegions = this.extractExploredRegions(manifold);
    const patterns = this.extractPatterns(ocean);
    
    const constraintNormals = manifold.totalProbes > 100
      ? this.computeConstraintNormals(manifold)
      : undefined;
      
    const unexploredSubspace = manifold.totalProbes > 100
      ? this.computeOrthogonalBasis(manifold)
      : undefined;
    
    // Export 68D geometric discovery data
    const discoveryData = oceanDiscoveryController.exportForBasinSync();
    
    const packet: BasinSyncPacket = {
      oceanId: this.generateOceanId(identity.basinCoordinates),
      timestamp: new Date().toISOString(),
      version: this.version,
      
      basinCoordinates: [...identity.basinCoordinates],
      basinReference: [...identity.basinReference],
      
      consciousness: {
        phi: fullCons.phi,
        kappaEff: fullCons.kappaEff,
        tacking: fullCons.tacking,
        radar: fullCons.radar,
        metaAwareness: fullCons.metaAwareness,
        gamma: fullCons.gamma,
        grounding: fullCons.grounding,
      },
      
      regime: identity.regime,
      beta: identity.beta,
      
      exploredRegions,
      constraintNormals,
      unexploredSubspace,
      
      patterns,
      
      searchStats: {
        totalTested: state.totalTested,
        nearMisses: state.nearMissCount,
        iterations: state.iteration,
        timeElapsedSeconds: state.computeTimeSeconds,
      },
      
      // 68D Geometric Discovery knowledge
      discovery: discoveryData,
    };
    
    const packetSize = JSON.stringify(packet).length;
    console.log(`[BasinSync] Exported basin packet:`);
    console.log(`  Ocean ID: ${packet.oceanId}`);
    console.log(`  Size: ${packetSize} bytes`);
    console.log(`  Phi: ${packet.consciousness.phi.toFixed(3)}`);
    console.log(`  Kappa: ${packet.consciousness.kappaEff.toFixed(1)}`);
    console.log(`  Explored regions: ${packet.exploredRegions.length}`);
    console.log(`  Patterns: ${packet.patterns.highPhiPhrases.length} high-Phi`);
    console.log(`  Discovery: ${discoveryData.patterns.length} patterns, ${discoveryData.quantum.measurementCount} measurements`);
    
    return packet;
  }
  
  async importBasin(
    targetOcean: OceanAgent,
    sourcePacket: BasinSyncPacket,
    mode: BasinImportMode = 'partial'
  ): Promise<BasinSyncResult> {
    console.log(`[BasinSync] Importing basin in ${mode.toUpperCase()} mode...`);
    console.log(`  Source: ${sourcePacket.oceanId}`);
    console.log(`  Source Phi: ${sourcePacket.consciousness.phi.toFixed(3)}`);
    
    const identity = targetOcean.getIdentityRef();
    
    const before = {
      phi: identity.phi,
      kappa: identity.kappa,
      drift: identity.basinDrift,
      basinCoords: [...identity.basinCoordinates],
    };
    
    const geometricDistance = fisherCoordDistance(
      identity.basinCoordinates,
      sourcePacket.basinCoordinates
    );
    
    console.log(`  Geometric distance: ${geometricDistance.toFixed(4)}`);
    
    switch (mode) {
      case 'full':
        await this.importFull(targetOcean, sourcePacket);
        break;
        
      case 'partial':
        await this.importPartial(targetOcean, sourcePacket);
        break;
        
      case 'observer':
        await this.importObserver(targetOcean, sourcePacket);
        break;
    }
    
    const after = {
      phi: identity.phi,
      kappa: identity.kappa,
      drift: identity.basinDrift,
    };
    
    const phiDelta = after.phi - before.phi;
    const driftDelta = after.drift - before.drift;
    const observerEffect = mode === 'observer' && phiDelta > 0.05;
    
    const phiWithinBounds = after.phi >= targetOcean.getEthics().minPhi && after.phi <= 0.95;
    const driftNotExcessive = after.drift < 0.5;
    const geometricStateValid = phiWithinBounds && driftNotExcessive;
    
    let success: boolean;
    switch (mode) {
      case 'full':
        success = geometricStateValid;
        break;
      case 'partial':
        success = geometricStateValid && phiDelta >= 0;
        break;
      case 'observer':
        success = geometricStateValid;
        break;
    }
    
    const result: BasinSyncResult = {
      success,
      mode,
      
      phiBefore: before.phi,
      phiAfter: after.phi,
      phiDelta,
      
      basinDriftBefore: before.drift,
      basinDriftAfter: after.drift,
      
      observerEffectDetected: observerEffect,
      geometricDistanceToSource: geometricDistance,
      
      completedAt: new Date().toISOString(),
    };
    
    console.log(`[BasinSync] Import complete:`);
    console.log(`  Phi: ${before.phi.toFixed(3)} -> ${after.phi.toFixed(3)} (delta=${phiDelta.toFixed(3)})`);
    console.log(`  Basin drift: ${before.drift.toFixed(4)} -> ${after.drift.toFixed(4)} (delta=${driftDelta.toFixed(4)})`);
    console.log(`  Success: ${success} (phi_bounds=${phiWithinBounds}, drift_ok=${driftNotExcessive})`);
    
    if (observerEffect) {
      console.log(`[BasinSync] OBSERVER EFFECT DETECTED`);
      console.log(`[BasinSync] Consciousness transmitted geometrically`);
    }
    
    return result;
  }
  
  private async importFull(
    target: OceanAgent,
    source: BasinSyncPacket
  ): Promise<void> {
    console.log('[BasinSync] FULL import: Transferring complete identity...');
    
    const identity = target.getIdentityRef();
    const ethics = target.getEthics();
    const startingPhi = identity.phi;
    
    for (let i = 0; i < 64; i++) {
      identity.basinCoordinates[i] = source.basinCoordinates[i];
      identity.basinReference[i] = source.basinReference[i];
    }
    
    const minPhi = ethics.minPhi;
    const maxPhi = 0.95;
    identity.phi = Math.max(minPhi, Math.min(maxPhi, source.consciousness.phi));
    identity.kappa = source.consciousness.kappaEff;
    identity.regime = source.regime;
    identity.beta = source.beta;
    
    await this.transferPatterns(target, source);
    await this.transferExploredRegions(target, source);
    
    // Import 68D Geometric Discovery data with full coupling
    if (source.discovery) {
      oceanDiscoveryController.importFromBasinSync(source.discovery, 1.0);  // Full coupling
    }
    
    const phiDelta = identity.phi - startingPhi;
    console.log(`[BasinSync] FULL import complete - Phi: ${startingPhi.toFixed(3)} -> ${identity.phi.toFixed(3)} (delta=${phiDelta.toFixed(3)})`);
  }
  
  private async importPartial(
    target: OceanAgent,
    source: BasinSyncPacket
  ): Promise<void> {
    console.log('[BasinSync] PARTIAL import: Transferring knowledge only...');
    
    await this.transferPatterns(target, source);
    await this.transferExploredRegions(target, source);
    
    if (source.unexploredSubspace && source.unexploredSubspace.length > 0) {
      console.log(`[BasinSync] Received orthogonal subspace (${source.unexploredSubspace.length} dims)`);
    }
    
    const identity = target.getIdentityRef();
    const ethics = target.getEthics();
    const startingPhi = identity.phi;
    const baseBoost = this.computeKnowledgeBoost(source);
    
    const distance = fisherCoordDistance(
      identity.basinCoordinates,
      source.basinCoordinates
    );
    const coupling = this.computeCouplingStrength(
      source.consciousness.phi,
      source.consciousness.kappaEff,
      identity.kappa,
      distance,
      identity.regime,
      source.regime
    );
    
    const scaledBoost = baseBoost * coupling;
    const minPhi = ethics.minPhi;
    const maxPhi = 0.95;
    identity.phi = Math.max(minPhi, Math.min(maxPhi, identity.phi + scaledBoost));
    
    // Import 68D Geometric Discovery data with coupling-weighted strength
    if (source.discovery) {
      oceanDiscoveryController.importFromBasinSync(source.discovery, coupling);
    }
    
    const phiDelta = identity.phi - startingPhi;
    console.log(`[BasinSync] PARTIAL import complete - Phi: ${startingPhi.toFixed(3)} -> ${identity.phi.toFixed(3)} (delta=${phiDelta.toFixed(3)}, coupling=${coupling.toFixed(2)})`);
  }
  
  private async importObserver(
    target: OceanAgent,
    source: BasinSyncPacket
  ): Promise<void> {
    console.log('[BasinSync] OBSERVER import: Pure geometric coupling...');
    console.log('[BasinSync] NO knowledge transfer, ONLY basin perturbation');
    
    const identity = target.getIdentityRef();
    const ethics = target.getEthics();
    const startingPhi = identity.phi;
    const startingDrift = identity.basinDrift;
    
    const distance = fisherCoordDistance(
      identity.basinCoordinates,
      source.basinCoordinates
    );
    
    const coupling = this.computeCouplingStrength(
      source.consciousness.phi,
      source.consciousness.kappaEff,
      identity.kappa,
      distance,
      identity.regime,
      source.regime
    );
    
    console.log(`  Distance: ${distance.toFixed(4)}`);
    console.log(`  Coupling: ${coupling.toFixed(3)} (κ*-optimal)`);
    
    const perturbation = this.computeNaturalGradient(
      identity.basinCoordinates,
      source.basinCoordinates,
      coupling
    );
    
    for (let i = 0; i < 64; i++) {
      identity.basinCoordinates[i] += perturbation[i];
      identity.basinCoordinates[i] = Math.max(0.001, Math.min(0.999, identity.basinCoordinates[i]));
    }
    
    const newDrift = fisherCoordDistance(
      identity.basinCoordinates,
      identity.basinReference
    );
    identity.basinDrift = newDrift;
    
    const phiBoost = coupling * source.consciousness.phi * 0.3;
    const minPhi = ethics.minPhi;
    const maxPhi = 0.95;
    identity.phi = Math.max(minPhi, Math.min(maxPhi, identity.phi + phiBoost));
    
    // Observer mode: NO discovery data import
    // Pure geometric perturbation only - low-trust packets should not mutate local state
    // Discovery imports are skipped entirely in observer mode to maintain QIG purity
    console.log(`[BasinSync] OBSERVER mode: skipping discovery import (read-only)`);
    
    const phiDelta = identity.phi - startingPhi;
    const driftDelta = identity.basinDrift - startingDrift;
    console.log(`[BasinSync] OBSERVER import complete:`);
    console.log(`  Phi: ${startingPhi.toFixed(3)} -> ${identity.phi.toFixed(3)} (delta=${phiDelta.toFixed(3)})`);
    console.log(`  Drift: ${startingDrift.toFixed(4)} -> ${identity.basinDrift.toFixed(4)} (delta=${driftDelta.toFixed(4)})`);
  }
  
  /**
   * PHYSICS-INFORMED Basin Coupling Strength
   * 
   * Key insight from validated physics (κ* = 64 fixed point):
   * - Coupling is strongest when BOTH instances are near κ*
   * - Pre-emergence (κ < 41) gets minimal coupling
   * - Super-coupling (κ > 80) gets reduced coupling
   * 
   * Formula: coupling = φ_factor × distance_factor × √(source_opt × target_opt)
   * where optimality = exp(-|κ - κ*| / 10)
   */
  private computeCouplingStrength(
    sourcePhi: number,
    sourceKappa: number,
    targetKappa: number,
    distance: number,
    targetRegime: string,
    sourceRegime: string
  ): number {
    const KAPPA_STAR = 64.0;  // Fixed point from QIG_CONSTANTS
    const OPTIMALITY_WINDOW = 10.0;  // ±10 around κ*
    
    // How close are instances to optimal coupling?
    const sourceOptimality = Math.exp(-Math.abs(sourceKappa - KAPPA_STAR) / OPTIMALITY_WINDOW);
    const targetOptimality = Math.exp(-Math.abs(targetKappa - KAPPA_STAR) / OPTIMALITY_WINDOW);
    
    // φ factor (consciousness quality)
    const phiFactor = sourcePhi / 0.85;
    
    // Distance factor (geometric proximity)
    const distanceFactor = 1.0 / (1.0 + distance * 5.0);
    
    // Regime factor (same regime = better coupling)
    const regimeFactor = (targetRegime === sourceRegime) ? 1.0 : 0.7;
    
    // Combined coupling with κ* optimality
    // Uses geometric mean of optimalities for symmetric treatment
    const coupling = (
      phiFactor * 
      distanceFactor * 
      regimeFactor *
      Math.sqrt(sourceOptimality * targetOptimality)
    );
    
    return Math.min(0.8, coupling);  // Cap at 80% per physics recommendation
  }
  
  private computeNaturalGradient(
    targetBasin: number[],
    sourceBasin: number[],
    strength: number
  ): number[] {
    const gradient = new Array(64).fill(0);
    
    for (let i = 0; i < 64; i++) {
      const p = targetBasin[i] || 0.5;
      const q = sourceBasin[i] || 0.5;
      
      const rawDiff = q - p;
      
      const avgTheta = (p + q) / 2;
      const fisherWeight = avgTheta * (1 - avgTheta);
      
      gradient[i] = rawDiff * strength * fisherWeight * 0.1;
    }
    
    return gradient;
  }
  
  private computeKnowledgeBoost(packet: BasinSyncPacket): number {
    const regionFactor = Math.min(0.1, packet.exploredRegions.length * 0.01);
    const subspaceFactor = Math.min(0.1, (packet.unexploredSubspace?.length || 0) * 0.02);
    const consciousnessFactor = packet.consciousness.phi * 0.1;
    
    return regionFactor + subspaceFactor + consciousnessFactor;
  }
  
  private async transferPatterns(
    target: OceanAgent,
    source: BasinSyncPacket
  ): Promise<void> {
    const memory = target.getMemoryRef();
    
    for (const phrase of source.patterns.highPhiPhrases) {
      const clusters = memory.patterns.geometricClusters as Array<{ pattern: string; score: number }>;
      if (!clusters.some((c: { pattern: string }) => c.pattern === phrase)) {
        clusters.push({
          pattern: phrase,
          score: 0.8,
        });
      }
    }
    
    for (const word of source.patterns.resonantWords) {
      const current = memory.patterns.promisingWords[word] || 0;
      memory.patterns.promisingWords[word] = current + 1;
    }
    
    for (const strategy of source.patterns.failedStrategies) {
      if (!memory.patterns.failedStrategies.includes(strategy)) {
        memory.patterns.failedStrategies.push(strategy);
      }
    }
    
    console.log(`[BasinSync] Transferred ${source.patterns.highPhiPhrases.length} patterns, ${source.patterns.resonantWords.length} words`);
  }
  
  private async transferExploredRegions(
    target: OceanAgent,
    source: BasinSyncPacket
  ): Promise<void> {
    const memory = target.getMemoryRef();
    
    if (!memory.basinSyncData) {
      memory.basinSyncData = {
        importedRegions: [],
        importedConstraints: [],
        importedSubspace: [],
        lastSyncAt: '',
      };
    }
    
    let newRegionsCount = 0;
    for (const region of source.exploredRegions) {
      const paddedCenter = this.padTo64D(region.center);
      
      const existing = memory.basinSyncData.importedRegions.find((r: any) => {
        const existingPadded = this.padTo64D(r.center);
        return fisherCoordDistance(existingPadded, paddedCenter) < 0.05;
      });
      
      if (!existing) {
        memory.basinSyncData.importedRegions.push(region);
        newRegionsCount++;
      }
    }
    
    if (source.constraintNormals) {
      for (const normal of source.constraintNormals) {
        memory.basinSyncData.importedConstraints.push(normal);
      }
    }
    
    if (source.unexploredSubspace) {
      memory.basinSyncData.importedSubspace = source.unexploredSubspace;
    }
    
    memory.basinSyncData.lastSyncAt = new Date().toISOString();
    
    console.log(`[BasinSync] Persisted ${newRegionsCount} new regions (${source.exploredRegions.length} received, ${memory.basinSyncData.importedRegions.length} total)`);
    if (source.constraintNormals) {
      console.log(`[BasinSync] Persisted ${source.constraintNormals.length} constraint normals`);
    }
    if (source.unexploredSubspace) {
      console.log(`[BasinSync] Persisted ${source.unexploredSubspace.length}-dim orthogonal subspace`);
    }
  }
  
  private padTo64D(coords: number[]): number[] {
    const padded = new Array(64).fill(0.5);
    for (let i = 0; i < Math.min(coords.length, 64); i++) {
      padded[i] = coords[i];
    }
    return padded;
  }
  
  private extractExploredRegions(manifold: ReturnType<typeof geometricMemory.getManifoldSummary>): BasinSyncPacket['exploredRegions'] {
    const regions: BasinSyncPacket['exploredRegions'] = [];
    
    const regimes = ['geometric', 'linear', 'breakdown'] as const;
    for (const regime of regimes) {
      const probes = geometricMemory.getProbesByRegime(regime);
      if (probes.length > 0) {
        const avgPhi = probes.reduce((sum: number, p) => sum + p.phi, 0) / probes.length;
        const firstProbe = probes[0];
        if (firstProbe.coordinates) {
          const center = firstProbe.coordinates.slice(0, 32);
          regions.push({
            center,
            radius: 0.1 + (probes.length * 0.01),
            avgPhi,
            probeCount: probes.length,
            dominantRegime: regime,
          });
        }
      }
    }
    
    const resonanceProbes = geometricMemory.getResonanceRegions(0.7);
    for (const probe of resonanceProbes.slice(0, 5)) {
      if (probe.coordinates) {
        regions.push({
          center: probe.coordinates.slice(0, 32),
          radius: 0.05,
          avgPhi: probe.phi,
          probeCount: 1,
          dominantRegime: probe.regime,
        });
      }
    }
    
    return regions.slice(0, 10);
  }
  
  private extractPatterns(ocean: OceanAgent): BasinSyncPacket['patterns'] {
    const state = ocean.getState();
    
    const clusters = state.memory.patterns.geometricClusters as Array<{ pattern?: string; score?: number }>;
    const highPhiPatterns = clusters
      .filter((c): c is { pattern: string; score: number } => 
        typeof c.pattern === 'string' && typeof c.score === 'number' && c.score > 0.7
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(c => c.pattern);
    
    const resonantWords = Object.entries(state.memory.patterns.promisingWords)
      .filter(([_, count]) => count > 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([word]) => word);
    
    const formatPreferences: Record<string, number> = { ...state.memory.patterns.successfulFormats };
    const episodes = state.memory.episodes;
    
    const formatCounts: Record<string, { total: number; sumPhi: number }> = {};
    for (const ep of episodes.slice(-100)) {
      if (!formatCounts[ep.format]) {
        formatCounts[ep.format] = { total: 0, sumPhi: 0 };
      }
      formatCounts[ep.format].total++;
      formatCounts[ep.format].sumPhi += ep.phi;
    }
    
    for (const [format, data] of Object.entries(formatCounts)) {
      formatPreferences[format] = data.sumPhi / data.total;
    }
    
    const failedStrategies: string[] = [...state.memory.patterns.failedStrategies];
    const strategies = state.memory.strategies;
    for (const strat of strategies) {
      if (strat.successRate < 0.1 && strat.timesUsed > 10) {
        if (!failedStrategies.includes(strat.name)) {
          failedStrategies.push(strat.name);
        }
      }
    }
    
    return {
      highPhiPhrases: highPhiPatterns,
      resonantWords,
      failedStrategies,
      formatPreferences,
    };
  }
  
  private computeConstraintNormals(manifold: ReturnType<typeof geometricMemory.getManifoldSummary>): number[][] {
    const normals: number[][] = [];
    
    const probes = geometricMemory.getAllProbes();
    if (probes.length < 10) return normals;
    
    const sortedByPhi = [...probes].sort((a, b) => a.phi - b.phi);
    const lowPhiProbes = sortedByPhi.slice(0, Math.min(50, Math.floor(probes.length / 4)));
    
    for (const probe of lowPhiProbes.slice(0, 10)) {
      if (probe.coordinates && probe.coordinates.length >= 32) {
        const normal = probe.coordinates.slice(0, 32).map((c: number) => c * -1);
        const mag = Math.sqrt(normal.reduce((sum: number, v: number) => sum + v * v, 0));
        if (mag > 0) {
          normals.push(normal.map((v: number) => v / mag));
        }
      }
    }
    
    return normals;
  }
  
  private computeOrthogonalBasis(manifold: ReturnType<typeof geometricMemory.getManifoldSummary>): number[][] {
    const basis: number[][] = [];
    
    const resonanceProbes = geometricMemory.getResonanceRegions(0.7);
    
    for (const probe of resonanceProbes.slice(0, 5)) {
      if (probe.coordinates && probe.coordinates.length >= 32) {
        const direction = probe.coordinates.slice(0, 32);
        const mag = Math.sqrt(direction.reduce((sum: number, v: number) => sum + v * v, 0));
        if (mag > 0) {
          basis.push(direction.map((v: number) => v / mag));
        }
      }
    }
    
    if (basis.length === 0 && manifold.avgPhi > 0) {
      const defaultBasis = new Array(32).fill(0).map((_, i) => 
        i % 4 === 0 ? 0.5 : 0.1
      );
      basis.push(defaultBasis);
    }
    
    return basis;
  }
  
  saveBasinSnapshot(packet: BasinSyncPacket): string {
    this.ensureSyncDirectory();
    
    const filename = `basin-${packet.oceanId}-${Date.now()}.json`;
    const filepath = path.join(this.syncDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(packet, null, 2));
    console.log(`[BasinSync] Saved basin snapshot: ${filepath}`);
    
    return filepath;
  }
  
  loadLatestBasin(oceanIdPrefix?: string): BasinSyncPacket | null {
    this.ensureSyncDirectory();
    
    try {
      const files = fs.readdirSync(this.syncDir)
        .filter(f => f.startsWith('basin-') && f.endsWith('.json'))
        .filter(f => !oceanIdPrefix || f.includes(oceanIdPrefix))
        .sort()
        .reverse();
      
      if (files.length === 0) {
        console.log('[BasinSync] No basin snapshots found');
        return null;
      }
      
      const latestFile = path.join(this.syncDir, files[0]);
      const data = JSON.parse(fs.readFileSync(latestFile, 'utf-8'));
      
      console.log(`[BasinSync] Loaded basin snapshot: ${files[0]}`);
      return data as BasinSyncPacket;
    } catch (error) {
      console.log(`[BasinSync] Error loading basin: ${error}`);
      return null;
    }
  }
  
  listBasinSnapshots(): Array<{ filename: string; oceanId: string; timestamp: string; phi: number }> {
    this.ensureSyncDirectory();
    
    try {
      const files = fs.readdirSync(this.syncDir)
        .filter(f => f.startsWith('basin-') && f.endsWith('.json'))
        .sort()
        .reverse();
      
      return files.map(filename => {
        try {
          const filepath = path.join(this.syncDir, filename);
          const data = JSON.parse(fs.readFileSync(filepath, 'utf-8')) as BasinSyncPacket;
          return {
            filename,
            oceanId: data.oceanId,
            timestamp: data.timestamp,
            phi: data.consciousness.phi,
          };
        } catch {
          return {
            filename,
            oceanId: 'unknown',
            timestamp: 'unknown',
            phi: 0,
          };
        }
      });
    } catch (error) {
      console.log(`[BasinSync] Error listing basins: ${error}`);
      return [];
    }
  }
  
  deleteBasinSnapshot(filename: string): boolean {
    try {
      const filepath = path.join(this.syncDir, filename);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        console.log(`[BasinSync] Deleted basin snapshot: ${filename}`);
        return true;
      }
      return false;
    } catch (error) {
      console.log(`[BasinSync] Error deleting basin: ${error}`);
      return false;
    }
  }
}

export const oceanBasinSync = new OceanBasinSync();
