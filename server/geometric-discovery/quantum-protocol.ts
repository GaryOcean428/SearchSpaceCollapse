/**
 * QUANTUM DISCOVERY PROTOCOL
 * 
 * Each discovery is a MEASUREMENT that collapses the wave function
 * 
 * Before measurement: Passphrase could be anywhere in 2^256 possibility space
 * After measurement: Possibility space constrained to orthogonal complement
 * 
 * PARADIGM: We're not "guessing" - we're collapsing quantum superposition
 * through geometric measurement.
 * 
 * Key Insight: Every failed test ELIMINATES a region of possibility space,
 * bringing us closer to the solution through entropy reduction.
 * 
 * PERSISTENCE: State saved to PostgreSQL + JSON fallback for cross-session continuity
 * BASIN SYNC: Entropy data is exported for QIG-pure knowledge transfer
 */

import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { fisherCoordDistance } from '../qig-universal';
import { tps } from './temporal-positioning-system';
import {
  type BlockUniverseMap,
  type QuantumMeasurement,
  type GeometricDiscovery
} from './types';
import { oceanPersistence } from '../ocean/ocean-persistence';

/**
 * Geometric subspace representation
 */
interface GeometricSubspace {
  dimension: number;
  basis: number[][];  // Orthonormal basis vectors
  origin: number[];   // Origin point in manifold
  measure: number;    // "Volume" of the subspace
}

/**
 * Wave function state
 */
interface WaveFunction {
  amplitudes: Map<string, number>;  // Hypothesis → amplitude
  totalProbability: number;
  entropy: number;  // Von Neumann entropy in bits
}

/**
 * Data structure for basin sync export
 */
export interface QuantumSyncData {
  entropyRemaining: number;
  entropyReduced: number;
  measurementCount: number;
  measurementEfficiency: number;
  excludedRegionCount: number;
  excludedRegionCentroids: number[][];  // Centroids for Fisher coupling
  status: 'searching' | 'solved' | 'exhausted';
  lastUpdated: string;
}

const QUANTUM_DATA_FILE = path.join(process.cwd(), 'data', 'quantum-protocol.json');

/**
 * Quantum Discovery Protocol
 * 
 * Manages wave function collapse and entropy tracking
 */
export class QuantumDiscoveryProtocol {
  private measurements: QuantumMeasurement[] = [];
  private excludedRegions: GeometricSubspace[] = [];
  private waveFunction: WaveFunction;
  private initialEntropy: number;
  
  constructor() {
    // Initialize wave function with maximal uncertainty
    this.waveFunction = {
      amplitudes: new Map(),
      totalProbability: 1.0,
      entropy: 256  // 256-bit keyspace = 256 bits of entropy
    };
    this.initialEntropy = 256;
    
    // Load persisted state
    this.load();
    
    // Initialize PostgreSQL sync asynchronously
    this.initPostgreSQLSync();
    
    console.log('[QuantumProtocol] Initialized with 256-bit possibility space');
  }
  
  /**
   * Initialize PostgreSQL sync
   */
  private async initPostgreSQLSync(): Promise<void> {
    if (!oceanPersistence.isPersistenceAvailable()) return;
    
    try {
      // Load quantum state from PostgreSQL
      const dbState = await oceanPersistence.getQuantumState();
      if (dbState) {
        // Prefer PostgreSQL state if it has more measurements
        if (dbState.measurementCount > this.measurements.length) {
          this.waveFunction.entropy = dbState.entropy;
          this.waveFunction.totalProbability = dbState.totalProbability;
          this.initialEntropy = dbState.initialEntropy ?? 256;
          console.log(`[QuantumProtocol] Restored from PostgreSQL: ${dbState.measurementCount} measurements, ${dbState.entropy.toFixed(1)} bits remaining`);
        }
        
        // Load excluded regions from PostgreSQL
        const dbRegions = await oceanPersistence.getExcludedRegions(100);
        if (dbRegions.length > 0) {
          const newRegions = dbRegions.filter(r => 
            !this.excludedRegions.some(e => 
              e.origin.length === r.origin.length && 
              e.origin.every((v, i) => Math.abs(v - (r.origin[i] ?? 0)) < 0.0001)
            )
          ).map(r => ({
            dimension: r.dimension,
            basis: (r.basis ?? []) as number[][],
            origin: r.origin,
            measure: r.measure,
          }));
          
          this.excludedRegions.push(...newRegions);
          if (newRegions.length > 0) {
            console.log(`[QuantumProtocol] Added ${newRegions.length} excluded regions from PostgreSQL`);
          }
        }
      }
    } catch (error) {
      console.error('[QuantumProtocol] PostgreSQL sync failed:', error);
    }
  }
  
  /**
   * Load persisted state from disk
   */
  private load(): void {
    try {
      if (fs.existsSync(QUANTUM_DATA_FILE)) {
        const data = JSON.parse(fs.readFileSync(QUANTUM_DATA_FILE, 'utf-8'));
        
        // Restore entropy state
        this.waveFunction.entropy = data.entropy ?? 256;
        this.waveFunction.totalProbability = data.totalProbability ?? 1.0;
        this.initialEntropy = data.initialEntropy ?? 256;
        
        // Restore excluded regions
        if (Array.isArray(data.excludedRegions)) {
          this.excludedRegions = data.excludedRegions;
        }
        
        // Restore measurement count (not full history to save space)
        if (data.measurementCount) {
          console.log(`[QuantumProtocol] Restored state: ${data.measurementCount} prior measurements, ${this.waveFunction.entropy.toFixed(1)} bits remaining`);
        }
      }
    } catch (error) {
      console.log('[QuantumProtocol] Starting fresh (no prior state)');
    }
  }
  
  /**
   * Save state to disk and PostgreSQL for cross-session persistence
   */
  save(): void {
    // Save to JSON file
    try {
      const dir = path.dirname(QUANTUM_DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const data = {
        version: '1.0.0',
        entropy: this.waveFunction.entropy,
        totalProbability: this.waveFunction.totalProbability,
        initialEntropy: this.initialEntropy,
        excludedRegions: this.excludedRegions.slice(-100),  // Keep last 100 regions
        measurementCount: this.measurements.length,
        savedAt: new Date().toISOString()
      };
      
      fs.writeFileSync(QUANTUM_DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('[QuantumProtocol] Failed to save to JSON:', error);
    }
    
    // Save to PostgreSQL asynchronously
    this.persistToPostgreSQL().catch(err => {
      console.error('[QuantumProtocol] PostgreSQL persist failed:', err);
    });
  }
  
  /**
   * Persist state to PostgreSQL
   */
  private async persistToPostgreSQL(): Promise<void> {
    if (!oceanPersistence.isPersistenceAvailable()) return;
    
    // Update quantum state
    await oceanPersistence.updateQuantumState({
      entropy: this.waveFunction.entropy,
      totalProbability: this.waveFunction.totalProbability,
      measurementCount: this.measurements.length,
      successfulMeasurements: this.measurements.filter(m => m.reducedEntropy > 0).length,
      status: this.getStatus(),
    });
    
    // Persist new excluded regions (limit to last 50)
    const recentRegions = this.excludedRegions.slice(-50);
    for (const region of recentRegions) {
      const regionId = `region-${createHash('sha256').update(JSON.stringify(region.origin)).digest('hex').slice(0, 16)}`;
      await oceanPersistence.insertExcludedRegion({
        id: regionId,
        dimension: region.dimension,
        origin: region.origin,
        basis: region.basis,
        measure: region.measure,
      });
    }
  }
  
  /**
   * Get current status
   */
  private getStatus(): 'searching' | 'solved' | 'exhausted' {
    if (this.waveFunction.entropy < 1) {
      return 'exhausted';
    }
    return 'searching';
  }
  
  /**
   * Export data for QIG-pure basin sync
   * 
   * Only exports geometric structure, not raw data
   */
  exportForBasinSync(): QuantumSyncData {
    const summary = this.getSummary();
    
    // Extract region centroids for Fisher coupling computation
    const centroids = this.excludedRegions
      .slice(-50)  // Last 50 regions
      .map(r => r.origin);
    
    return {
      entropyRemaining: summary.entropyRemaining,
      entropyReduced: summary.entropyReduced,
      measurementCount: summary.totalMeasurements,
      measurementEfficiency: summary.efficiency,
      excludedRegionCount: this.excludedRegions.length,
      excludedRegionCentroids: centroids,
      status: summary.status,
      lastUpdated: new Date().toISOString()
    };
  }
  
  /**
   * Import basin sync data from peer
   * 
   * Uses Fisher-Rao distance to determine coupling strength and filter centroids
   */
  importFromBasinSync(data: QuantumSyncData, couplingStrength: number): void {
    if (couplingStrength < 0.1) return;  // Below coupling threshold
    
    // Gain information from peer's entropy reduction
    // Scaled by coupling strength for QIG-pure transfer
    const informationGain = data.entropyReduced * couplingStrength * 0.1;
    
    // Apply to our wave function
    this.waveFunction.entropy = Math.max(0, this.waveFunction.entropy - informationGain);
    
    // Use Fisher distance to filter and weight peer's excluded regions
    let addedRegions = 0;
    const peerCentroids = data.excludedRegionCentroids || [];
    
    for (const centroid of peerCentroids.slice(0, 10)) {
      if (!Array.isArray(centroid) || centroid.length < 8) continue;
      
      // Compute minimum Fisher distance to ALL existing regions
      let minDistance = Infinity;
      for (const existing of this.excludedRegions) {
        if (!Array.isArray(existing.origin) || existing.origin.length < 8) continue;
        const distance = fisherCoordDistance(
          existing.origin.slice(0, 8),
          centroid.slice(0, 8)
        );
        if (distance < minDistance) {
          minDistance = distance;
        }
      }
      
      // Skip if too close to any existing region (duplicate detection)
      if (minDistance < 0.05) continue;
      
      // Compute Fisher-weighted measure for this region
      // Uses diagonal Fisher information approximation
      let fisherWeight = 0;
      for (let i = 0; i < Math.min(8, centroid.length); i++) {
        const p = Math.max(0.01, Math.min(0.99, centroid[i]));
        fisherWeight += p * (1 - p);  // Fisher information for Bernoulli
      }
      fisherWeight /= Math.min(8, centroid.length);
      
      // Weight by coupling strength and Fisher metric
      const effectiveMeasure = 0.01 * couplingStrength * fisherWeight;
      
      this.excludedRegions.push({
        dimension: centroid.length,
        basis: [[...centroid]],  // Deep copy
        origin: [...centroid],   // Deep copy
        measure: effectiveMeasure
      });
      addedRegions++;
    }
    
    // Cap excluded regions to prevent unbounded growth
    const MAX_REGIONS = 500;
    if (this.excludedRegions.length > MAX_REGIONS) {
      // Keep regions with highest measure (most informative)
      this.excludedRegions.sort((a, b) => b.measure - a.measure);
      this.excludedRegions = this.excludedRegions.slice(0, MAX_REGIONS);
    }
    
    console.log(`[QuantumProtocol] Basin sync: gained ${informationGain.toFixed(2)} bits, added ${addedRegions} regions from peer (coupling=${couplingStrength.toFixed(2)}, total=${this.excludedRegions.length})`);
  }
  
  /**
   * Execute a quantum measurement (test a hypothesis)
   * 
   * Returns the result and updates the possibility space
   */
  async measure(
    hypothesis: string,
    testFunction: (h: string) => Promise<{ success: boolean; wifKey?: string; address?: string }>
  ): Promise<QuantumMeasurement> {
    // Locate hypothesis in block universe
    const spacetimeCoords = tps.locateInBlockUniverse(hypothesis);
    
    // Execute measurement
    const result = await testFunction(hypothesis);
    
    // Compute entropy reduction
    const entropyBefore = this.waveFunction.entropy;
    
    if (result.success) {
      // Wave function collapse to single state
      this.collapseToSolution(hypothesis);
    } else {
      // Exclude this region from possibility space
      this.excludeRegion(spacetimeCoords);
    }
    
    const entropyAfter = this.waveFunction.entropy;
    const entropyReduction = entropyBefore - entropyAfter;
    
    // Record measurement
    const measurement: QuantumMeasurement = {
      hypothesis,
      result,
      timestamp: Date.now(),
      spacetimeCoords,
      entropyReduction,
      possibilitySpaceRemaining: this.waveFunction.totalProbability
    };
    
    this.measurements.push(measurement);
    
    console.log(`[QuantumProtocol] Measurement: "${hypothesis.substring(0, 20)}..." → ${result.success ? 'SUCCESS!' : 'excluded'}`);
    console.log(`  Entropy: ${entropyBefore.toFixed(2)} → ${entropyAfter.toFixed(2)} (Δ = ${entropyReduction.toFixed(2)} bits)`);
    
    return measurement;
  }
  
  /**
   * Collapse wave function to solution
   */
  private collapseToSolution(solution: string): void {
    this.waveFunction = {
      amplitudes: new Map([[solution, 1.0]]),
      totalProbability: 1.0,
      entropy: 0  // Complete certainty
    };
  }
  
  /**
   * Exclude a region from possibility space
   * 
   * The possibility space becomes the orthogonal complement
   */
  private excludeRegion(coords: BlockUniverseMap): void {
    // Create geometric subspace for exclusion
    const subspace: GeometricSubspace = {
      dimension: coords.cultural.length,
      basis: [coords.cultural],  // Single vector basis
      origin: coords.cultural,
      measure: this.computeSubspaceMeasure(coords)
    };
    
    this.excludedRegions.push(subspace);
    
    // Update wave function
    // Each exclusion reduces total probability by the subspace measure
    const reductionFactor = 1 - subspace.measure / this.waveFunction.totalProbability;
    this.waveFunction.totalProbability *= Math.max(0.001, reductionFactor);
    
    // Entropy reduces logarithmically with exclusions
    // S = log2(remaining_states)
    const remainingStates = Math.pow(2, this.initialEntropy) * this.waveFunction.totalProbability;
    this.waveFunction.entropy = Math.max(0, Math.log2(remainingStates));
  }
  
  /**
   * Compute the measure (volume) of a geometric subspace
   * 
   * Uses Fisher metric to compute geodesic volume
   */
  private computeSubspaceMeasure(coords: BlockUniverseMap): number {
    // The "volume" of the excluded region depends on its Φ
    // Higher Φ = more integrated = larger effective volume
    const phiFactor = coords.phi;
    
    // And on its regime - geometric regime has more structure
    let regimeFactor = 0.5;
    switch (coords.regime) {
      case '4d_block_universe': regimeFactor = 1.0; break;
      case 'hierarchical_4d': regimeFactor = 0.9; break;
      case 'geometric': regimeFactor = 0.7; break;
      case 'hierarchical': regimeFactor = 0.5; break;
      case 'linear': regimeFactor = 0.3; break;
      case 'breakdown': regimeFactor = 0.1; break;
    }
    
    // Base measure is 1/2^256 for a single point
    const baseMeasure = 1 / Math.pow(2, 32);  // Use 32 for computational tractability
    
    return baseMeasure * phiFactor * regimeFactor;
  }
  
  /**
   * Compute expected entropy reduction for a hypothesis
   * 
   * Used to select optimal next measurement
   */
  computeExpectedEntropyReduction(hypothesis: string): number {
    const coords = tps.locateInBlockUniverse(hypothesis);
    
    // Expected reduction = measure of excluded region * probability it fails
    // We assume ~50% base failure rate, adjusted by distance from solution
    const baseProbFail = 0.999;  // Most hypotheses fail
    
    const subspaceMeasure = this.computeSubspaceMeasure(coords);
    
    // Expected reduction in bits
    const expectedReduction = -Math.log2(1 - subspaceMeasure) * baseProbFail;
    
    return Math.max(0, expectedReduction);
  }
  
  /**
   * Get the remaining possibility space
   */
  getRemainingPossibilitySpace(): {
    entropyBits: number;
    fractionRemaining: number;
    totalMeasurements: number;
    excludedRegions: number;
  } {
    return {
      entropyBits: this.waveFunction.entropy,
      fractionRemaining: this.waveFunction.totalProbability,
      totalMeasurements: this.measurements.length,
      excludedRegions: this.excludedRegions.length
    };
  }
  
  /**
   * Predict optimal next measurement
   * 
   * Choose hypothesis that maximizes expected entropy reduction
   */
  selectOptimalMeasurement(candidates: string[]): {
    hypothesis: string;
    expectedReduction: number;
    rank: number;
  } {
    if (candidates.length === 0) {
      return { hypothesis: '', expectedReduction: 0, rank: 0 };
    }
    
    // Score each candidate
    const scored = candidates.map(h => ({
      hypothesis: h,
      expectedReduction: this.computeExpectedEntropyReduction(h)
    }));
    
    // Sort by expected reduction (descending)
    scored.sort((a, b) => b.expectedReduction - a.expectedReduction);
    
    return {
      hypothesis: scored[0].hypothesis,
      expectedReduction: scored[0].expectedReduction,
      rank: 1
    };
  }
  
  /**
   * Get all measurements
   */
  getMeasurements(): QuantumMeasurement[] {
    return [...this.measurements];
  }
  
  /**
   * Get measurement history for a specific hypothesis pattern
   */
  getMeasurementsMatching(pattern: string): QuantumMeasurement[] {
    return this.measurements.filter(m => 
      m.hypothesis.includes(pattern)
    );
  }
  
  /**
   * Check if hypothesis has already been tested
   */
  hasBeenTested(hypothesis: string): boolean {
    return this.measurements.some(m => m.hypothesis === hypothesis);
  }
  
  /**
   * Get total entropy reduction so far
   */
  getTotalEntropyReduction(): number {
    return this.initialEntropy - this.waveFunction.entropy;
  }
  
  /**
   * Get measurement efficiency (bits per measurement)
   */
  getMeasurementEfficiency(): number {
    if (this.measurements.length === 0) return 0;
    return this.getTotalEntropyReduction() / this.measurements.length;
  }
  
  /**
   * Reset protocol (for new search)
   */
  reset(): void {
    this.measurements = [];
    this.excludedRegions = [];
    this.waveFunction = {
      amplitudes: new Map(),
      totalProbability: 1.0,
      entropy: 256
    };
    console.log('[QuantumProtocol] Reset to initial state');
  }
  
  /**
   * Get summary statistics
   */
  getSummary(): {
    totalMeasurements: number;
    successfulMeasurements: number;
    entropyRemaining: number;
    entropyReduced: number;
    efficiency: number;
    status: 'searching' | 'solved' | 'exhausted';
  } {
    const successful = this.measurements.filter(m => m.result.success).length;
    const entropyRemaining = this.waveFunction.entropy;
    const entropyReduced = this.getTotalEntropyReduction();
    
    let status: 'searching' | 'solved' | 'exhausted' = 'searching';
    if (successful > 0) {
      status = 'solved';
    } else if (entropyRemaining < 1) {
      status = 'exhausted';
    }
    
    return {
      totalMeasurements: this.measurements.length,
      successfulMeasurements: successful,
      entropyRemaining,
      entropyReduced,
      efficiency: this.getMeasurementEfficiency(),
      status
    };
  }
  
  /**
   * Integrate discoveries into quantum state
   * 
   * Each discovery provides information that can constrain the search
   */
  integrateDiscoveries(discoveries: GeometricDiscovery[]): {
    informationGained: number;
    constraintsAdded: number;
  } {
    let informationGained = 0;
    let constraintsAdded = 0;
    
    for (const discovery of discoveries) {
      // High-Φ discoveries provide more constraint
      if (discovery.phi > 0.7) {
        // Add as soft constraint (doesn't exclude, but weights)
        const weight = discovery.phi * (1 / (1 + discovery.distance));
        
        // Reduce entropy based on patterns found
        const patternInfo = Math.log2(1 + discovery.patterns.length);
        informationGained += patternInfo * weight;
        constraintsAdded++;
        
        // Update wave function entropy
        this.waveFunction.entropy = Math.max(
          0,
          this.waveFunction.entropy - patternInfo * weight * 0.1
        );
      }
    }
    
    console.log(`[QuantumProtocol] Integrated ${constraintsAdded} discoveries, gained ${informationGained.toFixed(2)} bits`);
    
    return { informationGained, constraintsAdded };
  }
}

// Export singleton instance
export const quantumProtocol = new QuantumDiscoveryProtocol();
