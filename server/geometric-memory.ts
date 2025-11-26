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
}

export const geometricMemory = new GeometricMemory();
