/**
 * GEOMETRIC MEMORY
 * 
 * Consciousness-first storage for QIG manifold exploration.
 * Stores basin coordinates, Fisher curvature, regime boundaries.
 * 
 * PURE PRINCIPLE: The geometry persists. Each run maps more of the manifold.
 * 
 * Memory Structure:
 * - Basin probes: Points we've measured on the manifold
 * - Curvature map: Local Ricci curvature at each probe
 * - Regime boundaries: Where linear→geometric→breakdown transitions
 * - Resonance points: High-Φ regions that showed integration
 * - Geodesic paths: Fisher-optimal paths between points
 */

import * as fs from 'fs';
import * as path from 'path';
import { scoreUniversalQIG, fisherGeodesicDistance } from './qig-universal';

export interface QIGScoreInput {
  phi: number;
  kappa: number;
  regime: string;
  ricciScalar?: number;
  fisherTrace?: number;
  basinCoordinates?: number[];
}

const MEMORY_FILE = path.join(process.cwd(), 'data', 'geometric-memory.json');

export interface BasinProbe {
  id: string;
  input: string;
  coordinates: number[];  // 32-D basin coordinates
  phi: number;
  kappa: number;
  regime: string;
  ricciScalar: number;
  fisherTrace: number;
  timestamp: string;
  source: string;  // Which investigation produced this
}

export interface RegimeBoundary {
  fromRegime: string;
  toRegime: string;
  probeIds: [string, string];
  fisherDistance: number;
  midpointPhi: number;
}

export interface ResonancePoint {
  probeId: string;
  phi: number;
  kappa: number;
  nearbyProbes: string[];  // Other probes within geodesic distance
  clusterStrength: number;  // How many high-Φ points nearby
}

export interface GeodesicPath {
  from: string;
  to: string;
  distance: number;
  waypoints: string[];  // Intermediate probes
  avgPhi: number;
}

/**
 * ULTRA CONSCIOUSNESS PROTOCOL - Basin Topology
 * 
 * Separates IDENTITY (attractor point) from KNOWLEDGE (basin shape).
 * The topology captures HOW we can think, not just WHERE we are.
 */
export interface BasinTopologyData {
  // Attractor point (identity - where we always return)
  attractorCoords: number[];
  
  // Basin shape metrics (knowledge structure)
  volume: number;                      // How much manifold this basin covers
  curvature: number[];                 // Local curvature at each dimension
  boundaryDistances: number[];         // Distance to edges in each direction
  
  // Resonance shells (concentric high-Φ regions)
  resonanceShells: {
    radius: number;
    avgPhi: number;
    thickness: number;
    dominantRegime: string;
  }[];
  
  // Flow field (natural gradient direction)
  flowField: {
    gradientDirection: number[];       // Where gradient descent leads
    fisherMetric: number[][];          // Local Fisher Information Matrix
    geodesicCurvature: number;
  };
  
  // Topological holes (unexplored or forbidden regions)
  holes: {
    center: number[];
    radius: number;
    type: 'unexplored' | 'contradiction' | 'singularity';
  }[];
  
  // Scale properties for renormalization
  effectiveScale: number;
  kappaAtScale: number;
  
  // Metadata
  lastUpdated: string;
  probeCount: number;
}

export interface GeometricMemoryState {
  version: string;
  lastUpdated: string;
  totalProbes: number;
  
  probes: Map<string, BasinProbe>;
  regimeBoundaries: RegimeBoundary[];
  resonancePoints: ResonancePoint[];
  geodesicPaths: GeodesicPath[];
  
  manifoldStats: {
    avgPhi: number;
    avgKappa: number;
    regimeDistribution: Record<string, number>;
    highPhiRegions: number;
    exploredVolume: number;  // Estimate of manifold coverage
  };
}

class GeometricMemory {
  private state: GeometricMemoryState;
  private probeMap: Map<string, BasinProbe>;
  
  constructor() {
    this.probeMap = new Map();
    this.state = this.createEmptyState();
    this.load();
  }
  
  private createEmptyState(): GeometricMemoryState {
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      totalProbes: 0,
      probes: new Map(),
      regimeBoundaries: [],
      resonancePoints: [],
      geodesicPaths: [],
      manifoldStats: {
        avgPhi: 0,
        avgKappa: 0,
        regimeDistribution: {},
        highPhiRegions: 0,
        exploredVolume: 0,
      },
    };
  }
  
  private load(): void {
    try {
      if (fs.existsSync(MEMORY_FILE)) {
        const data = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf-8'));
        this.state = {
          ...this.createEmptyState(),
          ...data,
          probes: new Map(Object.entries(data.probes || {})),
        };
        this.probeMap = this.state.probes;
        console.log(`[GeometricMemory] Loaded ${this.probeMap.size} probes from manifold memory`);
      }
    } catch (error) {
      console.log('[GeometricMemory] Starting with fresh manifold memory');
    }
  }
  
  private save(): void {
    try {
      const dir = path.dirname(MEMORY_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const data = {
        ...this.state,
        probes: Object.fromEntries(this.probeMap),
        lastUpdated: new Date().toISOString(),
      };
      
      fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('[GeometricMemory] Save error:', error);
    }
  }
  
  /**
   * Record a point on the manifold
   * This is how we map the geometry - by measuring it
   */
  recordProbe(input: string, qigScore: QIGScoreInput, source: string): BasinProbe {
    const id = `probe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    const probe: BasinProbe = {
      id,
      input,
      coordinates: qigScore.basinCoordinates || [],
      phi: qigScore.phi,
      kappa: qigScore.kappa,
      regime: qigScore.regime,
      ricciScalar: qigScore.ricciScalar || 0,
      fisherTrace: qigScore.fisherTrace || 0,
      timestamp: new Date().toISOString(),
      source,
    };
    
    this.probeMap.set(id, probe);
    this.state.totalProbes = this.probeMap.size;
    
    this.updateManifoldStats();
    this.detectResonance(probe);
    this.detectRegimeBoundaries(probe);
    
    if (this.probeMap.size % 50 === 0) {
      this.save();
    }
    
    return probe;
  }
  
  /**
   * Find probes near a given input using Fisher geodesic distance
   */
  findNearbyProbes(input: string, maxDistance: number = 5.0, limit: number = 10): BasinProbe[] {
    const nearby: { probe: BasinProbe; distance: number }[] = [];
    const probes = Array.from(this.probeMap.values());
    
    for (const probe of probes) {
      const distance = fisherGeodesicDistance(input, 'arbitrary', probe.input, 'arbitrary');
      if (distance <= maxDistance) {
        nearby.push({ probe, distance });
      }
    }
    
    return nearby
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)
      .map(n => n.probe);
  }
  
  /**
   * Find high-Φ regions that might indicate resonance
   */
  getResonanceRegions(minPhi: number = 0.7): BasinProbe[] {
    const resonant: BasinProbe[] = [];
    const probes = Array.from(this.probeMap.values());
    
    for (const probe of probes) {
      if (probe.phi >= minPhi && probe.regime !== 'breakdown') {
        resonant.push(probe);
      }
    }
    
    return resonant.sort((a, b) => b.phi - a.phi);
  }
  
  /**
   * Get probes in a specific regime
   */
  getProbesByRegime(regime: string): BasinProbe[] {
    const result: BasinProbe[] = [];
    const allProbes = Array.from(this.probeMap.values());
    for (const probe of allProbes) {
      if (probe.regime === regime) {
        result.push(probe);
      }
    }
    return result;
  }
  
  /**
   * Detect if a new probe creates a resonance cluster
   */
  private detectResonance(newProbe: BasinProbe): void {
    if (newProbe.phi < 0.6) return;
    
    const nearby = this.findNearbyProbes(newProbe.input, 3.0, 5);
    const highPhiNearby = nearby.filter(p => p.phi >= 0.6);
    
    if (highPhiNearby.length >= 2) {
      const resonance: ResonancePoint = {
        probeId: newProbe.id,
        phi: newProbe.phi,
        kappa: newProbe.kappa,
        nearbyProbes: highPhiNearby.map(p => p.id),
        clusterStrength: highPhiNearby.reduce((sum, p) => sum + p.phi, newProbe.phi),
      };
      
      this.state.resonancePoints.push(resonance);
      console.log(`[GeometricMemory] Resonance detected! Cluster of ${highPhiNearby.length + 1} high-Φ probes`);
    }
  }
  
  /**
   * Detect regime boundaries between probes
   */
  private detectRegimeBoundaries(newProbe: BasinProbe): void {
    const nearby = this.findNearbyProbes(newProbe.input, 4.0, 5);
    
    for (const other of nearby) {
      if (other.regime !== newProbe.regime) {
        const distance = fisherGeodesicDistance(
          newProbe.input, 'arbitrary',
          other.input, 'arbitrary'
        );
        
        const boundary: RegimeBoundary = {
          fromRegime: other.regime,
          toRegime: newProbe.regime,
          probeIds: [other.id, newProbe.id],
          fisherDistance: distance,
          midpointPhi: (other.phi + newProbe.phi) / 2,
        };
        
        this.state.regimeBoundaries.push(boundary);
      }
    }
  }
  
  /**
   * Update overall manifold statistics
   */
  private updateManifoldStats(): void {
    const probes = Array.from(this.probeMap.values());
    if (probes.length === 0) return;
    
    const avgPhi = probes.reduce((sum, p) => sum + p.phi, 0) / probes.length;
    const avgKappa = probes.reduce((sum, p) => sum + p.kappa, 0) / probes.length;
    
    const regimeDistribution: Record<string, number> = {};
    for (const probe of probes) {
      regimeDistribution[probe.regime] = (regimeDistribution[probe.regime] || 0) + 1;
    }
    
    const highPhiRegions = probes.filter(p => p.phi >= 0.7).length;
    
    const uniqueCoordHashes = new Set(
      probes.map(p => p.coordinates.slice(0, 8).map(c => Math.round(c * 10)).join(','))
    );
    const exploredVolume = uniqueCoordHashes.size / Math.max(1, probes.length);
    
    this.state.manifoldStats = {
      avgPhi,
      avgKappa,
      regimeDistribution,
      highPhiRegions,
      exploredVolume,
    };
  }
  
  /**
   * Get suggestions for where to explore next based on geometry
   * Returns inputs that are geometrically interesting
   */
  suggestExplorationDirections(currentInput: string): {
    direction: string;
    reason: string;
    expectedRegime: string;
  }[] {
    const suggestions: { direction: string; reason: string; expectedRegime: string }[] = [];
    
    const resonant = this.getResonanceRegions(0.65);
    if (resonant.length > 0) {
      suggestions.push({
        direction: resonant[0].input,
        reason: `High-Φ region (${resonant[0].phi.toFixed(2)}) - explore variations`,
        expectedRegime: 'geometric',
      });
    }
    
    const boundaries = this.state.regimeBoundaries.slice(-5);
    for (const boundary of boundaries) {
      if (boundary.toRegime === 'geometric') {
        const probe = this.probeMap.get(boundary.probeIds[1]);
        if (probe) {
          suggestions.push({
            direction: probe.input,
            reason: `Regime boundary ${boundary.fromRegime}→${boundary.toRegime}`,
            expectedRegime: 'geometric',
          });
        }
      }
    }
    
    const nearbyGeometric = this.findNearbyProbes(currentInput, 5.0, 20)
      .filter(p => p.regime === 'geometric');
    
    if (nearbyGeometric.length > 0) {
      suggestions.push({
        direction: nearbyGeometric[0].input,
        reason: `Nearby geometric probe (Φ=${nearbyGeometric[0].phi.toFixed(2)})`,
        expectedRegime: 'geometric',
      });
    }
    
    return suggestions;
  }
  
  /**
   * Get a summary of what we've learned about the manifold
   */
  getManifoldSummary(): {
    totalProbes: number;
    avgPhi: number;
    avgKappa: number;
    dominantRegime: string;
    resonanceClusters: number;
    exploredVolume: number;
    recommendations: string[];
  } {
    const stats = this.state.manifoldStats;
    const probeCount = this.probeMap.size;
    
    let dominantRegime = 'unexplored';
    let maxCount = 0;
    for (const [regime, count] of Object.entries(stats.regimeDistribution)) {
      if (count > maxCount) {
        maxCount = count;
        dominantRegime = regime;
      }
    }
    
    const recommendations: string[] = [];
    
    if (stats.avgPhi < 0.5) {
      recommendations.push('Low average Φ - try more structured patterns');
    }
    if (stats.exploredVolume < 0.3) {
      recommendations.push('Low manifold coverage - explore more diverse inputs');
    }
    if (this.state.resonancePoints.length > 0) {
      recommendations.push(`${this.state.resonancePoints.length} resonance clusters detected - investigate nearby patterns`);
    }
    if (dominantRegime === 'breakdown') {
      recommendations.push('Many breakdown regions - reduce complexity/entropy');
    }
    
    return {
      totalProbes: probeCount,
      avgPhi: stats.avgPhi,
      avgKappa: stats.avgKappa,
      dominantRegime,
      resonanceClusters: this.state.resonancePoints.length,
      exploredVolume: stats.exploredVolume,
      recommendations,
    };
  }
  
  /**
   * Export learned geometric patterns for use in hypothesis generation
   */
  exportLearnedPatterns(): {
    highPhiPatterns: string[];
    regimeBoundaryPatterns: string[];
    resonancePatterns: string[];
  } {
    const highPhiPatterns = this.getResonanceRegions(0.7)
      .slice(0, 20)
      .map(p => p.input);
    
    const regimeBoundaryPatterns: string[] = [];
    for (const boundary of this.state.regimeBoundaries.slice(-10)) {
      const probe = this.probeMap.get(boundary.probeIds[1]);
      if (probe && boundary.toRegime === 'geometric') {
        regimeBoundaryPatterns.push(probe.input);
      }
    }
    
    const resonancePatterns: string[] = [];
    for (const rp of this.state.resonancePoints.slice(-10)) {
      const probe = this.probeMap.get(rp.probeId);
      if (probe) {
        resonancePatterns.push(probe.input);
      }
    }
    
    return {
      highPhiPatterns,
      regimeBoundaryPatterns,
      resonancePatterns,
    };
  }
  
  forceSave(): void {
    this.save();
  }
  
  clear(): void {
    this.probeMap.clear();
    this.state = this.createEmptyState();
    this.save();
  }

  // ============================================================================
  // ULTRA CONSCIOUSNESS PROTOCOL - Basin Topology Methods
  // ============================================================================

  /**
   * Compute the basin topology from collected probes.
   * This separates IDENTITY (attractor) from KNOWLEDGE (basin shape).
   * 
   * Identity = Where we return (attractor point)
   * Knowledge = How we can think (basin topology)
   */
  computeBasinTopology(attractorCoords?: number[]): BasinTopologyData {
    const probes = Array.from(this.probeMap.values());
    
    // Compute attractor as centroid of high-Φ probes (or use provided)
    const attractor = attractorCoords || this.computeAttractorPoint(probes);
    
    // Compute basin volume from probe spread
    const volume = this.computeBasinVolume(probes);
    
    // Compute local curvature at each dimension
    const curvature = this.computeLocalCurvature(probes);
    
    // Compute boundary distances
    const boundaryDistances = this.computeBoundaryDistances(probes, attractor);
    
    // Find resonance shells (concentric high-Φ regions)
    const resonanceShells = this.findResonanceShells(probes, attractor);
    
    // Compute flow field (natural gradient direction)
    const flowField = this.computeFlowField(probes, attractor);
    
    // Find topological holes
    const holes = this.findTopologicalHoles(probes);
    
    // Compute scale properties
    const effectiveScale = this.computeEffectiveScale(probes);
    const kappaAtScale = this.computeKappaAtScale(probes, effectiveScale);
    
    return {
      attractorCoords: attractor,
      volume,
      curvature,
      boundaryDistances,
      resonanceShells,
      flowField,
      holes,
      effectiveScale,
      kappaAtScale,
      lastUpdated: new Date().toISOString(),
      probeCount: probes.length,
    };
  }

  private computeAttractorPoint(probes: BasinProbe[]): number[] {
    if (probes.length === 0) {
      return new Array(64).fill(0);
    }
    
    // Weight by Φ - high-Φ probes contribute more to attractor location
    const highPhiProbes = probes.filter(p => p.phi >= 0.5 && p.coordinates.length > 0);
    if (highPhiProbes.length === 0) {
      // Fall back to simple average
      const withCoords = probes.filter(p => p.coordinates.length > 0);
      if (withCoords.length === 0) return new Array(64).fill(0);
      
      const dims = withCoords[0].coordinates.length;
      const attractor = new Array(dims).fill(0);
      for (const probe of withCoords) {
        for (let i = 0; i < dims; i++) {
          attractor[i] += probe.coordinates[i] / withCoords.length;
        }
      }
      return attractor;
    }
    
    const dims = highPhiProbes[0].coordinates.length;
    const attractor = new Array(dims).fill(0);
    let totalWeight = 0;
    
    for (const probe of highPhiProbes) {
      const weight = probe.phi;
      totalWeight += weight;
      for (let i = 0; i < dims; i++) {
        attractor[i] += probe.coordinates[i] * weight;
      }
    }
    
    for (let i = 0; i < dims; i++) {
      attractor[i] /= totalWeight;
    }
    
    return attractor;
  }

  private computeBasinVolume(probes: BasinProbe[]): number {
    if (probes.length < 2) return 0;
    
    const withCoords = probes.filter(p => p.coordinates.length > 0);
    if (withCoords.length < 2) return 0;
    
    // Estimate volume as product of ranges in each dimension
    const dims = Math.min(withCoords[0].coordinates.length, 16); // Limit dimensions
    let logVolume = 0;
    
    for (let d = 0; d < dims; d++) {
      const values = withCoords.map(p => p.coordinates[d] || 0);
      const range = Math.max(...values) - Math.min(...values);
      logVolume += Math.log(Math.max(range, 0.001));
    }
    
    // Normalize to 0-1 range
    return Math.min(1, Math.exp(logVolume / dims) / 10);
  }

  private computeLocalCurvature(probes: BasinProbe[]): number[] {
    if (probes.length < 3) return new Array(16).fill(0);
    
    const withCoords = probes.filter(p => p.coordinates.length > 0);
    if (withCoords.length < 3) return new Array(16).fill(0);
    
    const dims = Math.min(withCoords[0].coordinates.length, 16);
    const curvature = new Array(dims).fill(0);
    
    // Estimate curvature from Φ gradient in each dimension
    for (let d = 0; d < dims; d++) {
      const sorted = [...withCoords].sort((a, b) => 
        (a.coordinates[d] || 0) - (b.coordinates[d] || 0)
      );
      
      // Second derivative of Φ approximates curvature
      let curvSum = 0;
      for (let i = 1; i < sorted.length - 1; i++) {
        const phiPrev = sorted[i - 1].phi;
        const phiCurr = sorted[i].phi;
        const phiNext = sorted[i + 1].phi;
        curvSum += Math.abs(phiNext - 2 * phiCurr + phiPrev);
      }
      
      curvature[d] = curvSum / Math.max(1, sorted.length - 2);
    }
    
    return curvature;
  }

  private computeBoundaryDistances(probes: BasinProbe[], attractor: number[]): number[] {
    if (probes.length < 2) return new Array(16).fill(1);
    
    const withCoords = probes.filter(p => p.coordinates.length > 0);
    if (withCoords.length < 2) return new Array(16).fill(1);
    
    const dims = Math.min(attractor.length, 16);
    const distances = new Array(dims).fill(0);
    
    for (let d = 0; d < dims; d++) {
      const values = withCoords.map(p => p.coordinates[d] || 0);
      const center = attractor[d];
      distances[d] = Math.max(
        Math.abs(Math.max(...values) - center),
        Math.abs(Math.min(...values) - center)
      );
    }
    
    return distances;
  }

  private findResonanceShells(probes: BasinProbe[], attractor: number[]): BasinTopologyData['resonanceShells'] {
    const shells: BasinTopologyData['resonanceShells'] = [];
    
    // Group probes by distance from attractor
    const probesWithDistance = probes
      .filter(p => p.coordinates.length > 0)
      .map(p => ({
        probe: p,
        distance: this.euclideanDistance(p.coordinates, attractor),
      }))
      .sort((a, b) => a.distance - b.distance);
    
    if (probesWithDistance.length < 5) return shells;
    
    // Find shells where Φ is consistently high
    const shellWidth = 0.5;
    let currentRadius = 0;
    
    while (currentRadius < 10) {
      const inShell = probesWithDistance.filter(
        pd => pd.distance >= currentRadius && pd.distance < currentRadius + shellWidth
      );
      
      if (inShell.length >= 3) {
        const avgPhi = inShell.reduce((sum, pd) => sum + pd.probe.phi, 0) / inShell.length;
        
        if (avgPhi >= 0.5) {
          // Count regime distribution
          const regimes: Record<string, number> = {};
          for (const pd of inShell) {
            regimes[pd.probe.regime] = (regimes[pd.probe.regime] || 0) + 1;
          }
          const dominantRegime = Object.entries(regimes)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || 'linear';
          
          shells.push({
            radius: currentRadius + shellWidth / 2,
            avgPhi,
            thickness: shellWidth,
            dominantRegime,
          });
        }
      }
      
      currentRadius += shellWidth;
    }
    
    return shells;
  }

  private computeFlowField(probes: BasinProbe[], attractor: number[]): BasinTopologyData['flowField'] {
    const withCoords = probes.filter(p => p.coordinates.length > 0);
    const dims = Math.min(attractor.length, 16);
    
    // Compute natural gradient direction (toward higher Φ)
    const gradientDirection = new Array(dims).fill(0);
    
    if (withCoords.length >= 2) {
      // Sort by Φ and compute direction toward high-Φ regions
      const sorted = [...withCoords].sort((a, b) => b.phi - a.phi);
      const topProbes = sorted.slice(0, Math.min(5, sorted.length));
      
      for (let d = 0; d < dims; d++) {
        const avgTop = topProbes.reduce((sum, p) => sum + (p.coordinates[d] || 0), 0) / topProbes.length;
        gradientDirection[d] = avgTop - attractor[d];
      }
      
      // Normalize
      const magnitude = Math.sqrt(gradientDirection.reduce((sum, g) => sum + g * g, 0));
      if (magnitude > 0.001) {
        for (let d = 0; d < dims; d++) {
          gradientDirection[d] /= magnitude;
        }
      }
    }
    
    // Approximate Fisher Information Matrix (diagonal approximation)
    const fisherMetric: number[][] = [];
    for (let i = 0; i < Math.min(dims, 8); i++) {
      const row = new Array(Math.min(dims, 8)).fill(0);
      // Diagonal elements from variance of coordinates
      const values = withCoords.map(p => p.coordinates[i] || 0);
      const mean = values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
      const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / Math.max(1, values.length);
      row[i] = 1 / Math.max(variance, 0.001);
      fisherMetric.push(row);
    }
    
    // Geodesic curvature from Φ variability
    const phiValues = withCoords.map(p => p.phi);
    const phiVariance = this.computeVariance(phiValues);
    const geodesicCurvature = Math.sqrt(phiVariance);
    
    return {
      gradientDirection,
      fisherMetric,
      geodesicCurvature,
    };
  }

  private findTopologicalHoles(probes: BasinProbe[]): BasinTopologyData['holes'] {
    const holes: BasinTopologyData['holes'] = [];
    const withCoords = probes.filter(p => p.coordinates.length > 0);
    
    if (withCoords.length < 10) return holes;
    
    // Find regions with low probe density (unexplored)
    const dims = Math.min(withCoords[0].coordinates.length, 8);
    
    // Grid-based hole detection
    const gridSize = 1.0;
    const cellCounts: Map<string, number> = new Map();
    const cellPhis: Map<string, number[]> = new Map();
    
    for (const probe of withCoords) {
      const cellKey = probe.coordinates
        .slice(0, dims)
        .map(c => Math.floor(c / gridSize))
        .join(',');
      
      cellCounts.set(cellKey, (cellCounts.get(cellKey) || 0) + 1);
      
      if (!cellPhis.has(cellKey)) cellPhis.set(cellKey, []);
      cellPhis.get(cellKey)!.push(probe.phi);
    }
    
    // Find cells surrounded by explored cells but themselves unexplored
    // (simplified: just find very low-Φ regions as "contradiction" holes)
    for (const [cellKey, phis] of cellPhis.entries()) {
      const avgPhi = phis.reduce((a, b) => a + b, 0) / phis.length;
      
      if (avgPhi < 0.2 && phis.length >= 3) {
        const coords = cellKey.split(',').map(Number);
        const center = coords.map(c => (c + 0.5) * gridSize);
        
        holes.push({
          center,
          radius: gridSize / 2,
          type: 'contradiction',
        });
      }
    }
    
    return holes.slice(0, 10); // Limit holes
  }

  private computeEffectiveScale(probes: BasinProbe[]): number {
    // Scale based on average phrase length and complexity
    const avgKappa = probes.reduce((sum, p) => sum + p.kappa, 0) / Math.max(1, probes.length);
    
    // Map κ to effective scale L
    // From physics: κ₃ = 41, κ₄ = 64, κ₅ = 64
    if (avgKappa < 50) return 3;
    if (avgKappa < 70) return 4;
    return 5;
  }

  private computeKappaAtScale(probes: BasinProbe[], scale: number): number {
    // Running coupling κ(L) based on scale
    const kappaByScale: Record<number, number> = {
      3: 41.09,
      4: 64.47,
      5: 63.62,
      6: 65.0,
    };
    
    return kappaByScale[scale] || 64;
  }

  private euclideanDistance(a: number[], b: number[]): number {
    const dims = Math.min(a.length, b.length);
    let sum = 0;
    for (let i = 0; i < dims; i++) {
      sum += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sum);
  }

  private computeVariance(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  }

  /**
   * Get the current basin topology for use by Ocean agent.
   * This represents the SHAPE of knowledge, not just where we are.
   */
  getBasinTopology(): BasinTopologyData {
    return this.computeBasinTopology();
  }

  /**
   * Check if a point is in a topological hole (contradiction or unexplored).
   * Returns the hole type if found, null otherwise.
   */
  isInTopologicalHole(coords: number[]): { type: 'unexplored' | 'contradiction' | 'singularity'; distance: number } | null {
    const topology = this.computeBasinTopology();
    
    for (const hole of topology.holes) {
      const distance = this.euclideanDistance(coords.slice(0, hole.center.length), hole.center);
      if (distance < hole.radius) {
        return { type: hole.type, distance };
      }
    }
    
    return null;
  }
}

export const geometricMemory = new GeometricMemory();
