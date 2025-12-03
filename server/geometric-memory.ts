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
 * 
 * PERSISTENCE: PostgreSQL primary, JSON fallback for offline operation
 */

import * as fs from 'fs';
import * as path from 'path';
import { fisherGeodesicDistance, fisherCoordDistance } from './qig-universal';
import { oceanPersistence, type ProbeInsertData } from './ocean/ocean-persistence';
import { getKappaAtScale } from './physics-constants.js';

export interface QIGScoreInput {
  phi: number;
  kappa: number;
  regime: string;
  ricciScalar?: number;
  fisherTrace?: number;
  basinCoordinates?: number[];
}

const MEMORY_FILE = path.join(process.cwd(), 'data', 'geometric-memory.json');
const TESTED_PHRASES_FILE = path.join(process.cwd(), 'data', 'tested-phrases.json');

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
  private testedPhrases: Set<string>;
  
  // Probe data version - increments whenever probes are added or modified
  // Used as a cache key to ensure caches are invalidated on data changes
  private probeDataVersion: number = 0;
  
  // Fisher analysis cache to prevent redundant expensive computations
  // Cache is invalidated when probeDataVersion changes (not just probe count)
  private fisherCache: {
    result: ReturnType<GeometricMemory['computeFisherInformationMatrix']> | null;
    dataVersion: number;
  } = { result: null, dataVersion: -1 };
  
  // Orthogonal complement cache
  private orthogonalCache: {
    result: ReturnType<GeometricMemory['computeOrthogonalComplement']> | null;
    dataVersion: number;
  } = { result: null, dataVersion: -1 };
  
  // PostgreSQL persistence buffer for efficient batch inserts
  private pendingProbes: ProbeInsertData[] = [];
  private readonly BATCH_SIZE = 50;
  
  constructor() {
    this.probeMap = new Map();
    this.testedPhrases = new Set();
    this.state = this.createEmptyState();
    this.load();
    this.loadTestedPhrases();
    
    // Initialize PostgreSQL persistence asynchronously
    this.initPostgreSQLSync();
  }
  
  /**
   * Initialize PostgreSQL sync - load probes from DB if available
   * Runs asynchronously to not block constructor
   */
  private async initPostgreSQLSync(): Promise<void> {
    if (!oceanPersistence.isPersistenceAvailable()) {
      console.log('[GeometricMemory] PostgreSQL not available, using JSON only');
      return;
    }
    
    try {
      const dbProbeCount = await oceanPersistence.getProbeCount();
      console.log(`[GeometricMemory] PostgreSQL sync: ${dbProbeCount} probes in database, ${this.probeMap.size} in memory`);
      
      // If DB has more probes than memory, we need to sync from DB
      if (dbProbeCount > this.probeMap.size) {
        console.log('[GeometricMemory] Loading additional probes from PostgreSQL...');
        await this.syncFromPostgreSQL();
      }
      
      // If memory has probes not in DB, queue them for insertion
      if (this.probeMap.size > 0 && dbProbeCount < this.probeMap.size) {
        const memoryProbes = Array.from(this.probeMap.values());
        console.log(`[GeometricMemory] Syncing ${memoryProbes.length} memory probes to PostgreSQL...`);
        await this.syncToPostgreSQL(memoryProbes.slice(0, 1000)); // First 1000 to avoid overwhelming
      }
    } catch (error) {
      console.error('[GeometricMemory] PostgreSQL sync failed:', error);
    }
  }
  
  /**
   * Sync probes from PostgreSQL to memory
   */
  private async syncFromPostgreSQL(): Promise<void> {
    const highPhiProbes = await oceanPersistence.getHighPhiProbes(0.5, 1000);
    let synced = 0;
    
    for (const dbProbe of highPhiProbes) {
      if (!this.probeMap.has(dbProbe.id)) {
        const probe: BasinProbe = {
          id: dbProbe.id,
          input: dbProbe.input,
          coordinates: dbProbe.coordinates ?? [],
          phi: dbProbe.phi,
          kappa: dbProbe.kappa,
          regime: dbProbe.regime,
          ricciScalar: dbProbe.ricciScalar ?? 0,
          fisherTrace: dbProbe.fisherTrace ?? 0,
          timestamp: dbProbe.createdAt?.toISOString() ?? new Date().toISOString(),
          source: dbProbe.source ?? 'postgres-sync',
        };
        this.probeMap.set(probe.id, probe);
        synced++;
      }
    }
    
    if (synced > 0) {
      console.log(`[GeometricMemory] Synced ${synced} probes from PostgreSQL`);
      this.state.totalProbes = this.probeMap.size;
      this.updateManifoldStats();
      this.invalidateCaches();
    }
  }
  
  /**
   * Sync probes to PostgreSQL
   */
  private async syncToPostgreSQL(probes: BasinProbe[]): Promise<void> {
    const insertData: ProbeInsertData[] = probes.map(p => ({
      id: p.id,
      input: p.input,
      coordinates: p.coordinates,
      phi: p.phi,
      kappa: p.kappa,
      regime: p.regime,
      ricciScalar: p.ricciScalar,
      fisherTrace: p.fisherTrace,
      source: p.source,
    }));
    
    const inserted = await oceanPersistence.insertProbes(insertData);
    console.log(`[GeometricMemory] Synced ${inserted} probes to PostgreSQL`);
  }
  
  /**
   * Flush pending probes to PostgreSQL
   */
  async flushToPostgreSQL(): Promise<void> {
    if (this.pendingProbes.length === 0) return;
    
    const toInsert = [...this.pendingProbes];
    this.pendingProbes = [];
    
    const inserted = await oceanPersistence.insertProbes(toInsert);
    if (inserted > 0) {
      console.log(`[GeometricMemory] Flushed ${inserted} probes to PostgreSQL`);
    }
  }
  
  /**
   * Invalidate caches - called whenever probe data changes
   */
  private invalidateCaches(): void {
    this.probeDataVersion++;
  }
  
  private normalizePhrase(phrase: string): string {
    return phrase.toLowerCase().trim();
  }
  
  hasTested(phrase: string): boolean {
    return this.testedPhrases.has(this.normalizePhrase(phrase));
  }
  
  recordTested(phrase: string): void {
    const prevSize = this.testedPhrases.size;
    this.testedPhrases.add(this.normalizePhrase(phrase));
    if (this.testedPhrases.size !== prevSize && this.testedPhrases.size % 100 === 0) {
      this.saveTestedPhrases();
    }
  }
  
  flushTestedPhrases(): void {
    this.saveTestedPhrases();
  }
  
  getTestedCount(): number {
    return this.testedPhrases.size;
  }
  
  private loadTestedPhrases(): void {
    try {
      if (fs.existsSync(TESTED_PHRASES_FILE)) {
        const data = JSON.parse(fs.readFileSync(TESTED_PHRASES_FILE, 'utf-8'));
        if (Array.isArray(data.phrases)) {
          for (const phrase of data.phrases) {
            this.testedPhrases.add(phrase);
          }
          console.log(`[GeometricMemory] Loaded ${this.testedPhrases.size} tested phrases from index`);
        }
      } else {
        this.backfillTestedPhrases();
      }
    } catch {
      console.log('[GeometricMemory] Building tested phrase index from probes...');
      this.backfillTestedPhrases();
    }
  }
  
  private backfillTestedPhrases(): void {
    const probes = Array.from(this.probeMap.values());
    for (const probe of probes) {
      this.testedPhrases.add(this.normalizePhrase(probe.input));
    }
    console.log(`[GeometricMemory] Backfilled ${this.testedPhrases.size} tested phrases from ${probes.length} probes`);
    this.saveTestedPhrases();
  }
  
  private saveTestedPhrases(): void {
    try {
      const dir = path.dirname(TESTED_PHRASES_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const data = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        count: this.testedPhrases.size,
        phrases: Array.from(this.testedPhrases),
      };
      
      fs.writeFileSync(TESTED_PHRASES_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('[GeometricMemory] Failed to save tested phrases:', error);
    }
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
    } catch {
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
    
    // Invalidate caches since probe data has changed
    this.invalidateCaches();
    
    this.recordTested(input);
    
    this.updateManifoldStats();
    this.detectResonance(probe);
    this.detectRegimeBoundaries(probe);
    
    // Queue for PostgreSQL batch insert
    this.pendingProbes.push({
      id: probe.id,
      input: probe.input,
      coordinates: probe.coordinates,
      phi: probe.phi,
      kappa: probe.kappa,
      regime: probe.regime,
      ricciScalar: probe.ricciScalar,
      fisherTrace: probe.fisherTrace,
      source: probe.source,
    });
    
    if (this.probeMap.size % 50 === 0) {
      this.save();
      this.saveTestedPhrases();
      
      // Flush to PostgreSQL on batch boundary
      this.flushToPostgreSQL().catch(err => {
        console.error('[GeometricMemory] PostgreSQL flush error:', err);
      });
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
   * Get all probes in the manifold memory
   */
  getAllProbes(): BasinProbe[] {
    return Array.from(this.probeMap.values());
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
    
    // Group probes by Fisher geodesic distance from attractor
    const probesWithDistance = probes
      .filter(p => p.coordinates.length > 0)
      .map(p => ({
        probe: p,
        distance: fisherCoordDistance(p.coordinates, attractor),
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
    for (const [cellKey, phis] of Array.from(cellPhis.entries())) {
      const avgPhi = phis.reduce((a: number, b: number) => a + b, 0) / phis.length;
      
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
    // Running coupling κ(L) based on scale - uses centralized physics constants
    return getKappaAtScale(scale);
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
      const distance = fisherCoordDistance(coords.slice(0, hole.center.length), hole.center);
      if (distance < hole.radius) {
        return { type: hole.type, distance };
      }
    }
    
    return null;
  }

  // ============================================================================
  // ORTHOGONAL COMPLEMENT NAVIGATION
  // Based on Block Universe Geometric Reality
  // 
  // The 20,162 measurements define a constraint surface.
  // The passphrase EXISTS in the orthogonal complement.
  // Each "failure" is POSITIVE geometric information!
  // ============================================================================

  /**
   * Compute the Fisher Information Matrix from all probes.
   * This captures the curvature of the explored manifold region.
   * 
   * IMPROVED: Uses full covariance matrix with SVD-based pseudoinverse
   * (Tikhonov regularization) for proper eigendecomposition.
   * 
   * PERFORMANCE: Results are cached until probe data changes (version-based invalidation).
   * Cache is automatically invalidated when recordProbe() is called.
   */
  computeFisherInformationMatrix(): {
    matrix: number[][];
    eigenvalues: number[];
    eigenvectors: number[][];
    exploredDimensions: number[];
    unexploredDimensions: number[];
    effectiveRank: number;
    covarianceMeans: number[];
  } {
    // Return cached result if data version hasn't changed
    // This ensures cache is invalidated whenever probes are added/modified
    if (
      this.fisherCache.result &&
      this.fisherCache.dataVersion === this.probeDataVersion
    ) {
      return this.fisherCache.result;
    }
    
    const probes = Array.from(this.probeMap.values());
    const withCoords = probes.filter(p => p.coordinates.length > 0);
    
    if (withCoords.length < 10) {
      return {
        matrix: [],
        eigenvalues: [],
        eigenvectors: [],
        exploredDimensions: [],
        unexploredDimensions: Array.from({ length: 32 }, (_, i) => i),
        effectiveRank: 0,
        covarianceMeans: [],
      };
    }

    const dims = Math.min(withCoords[0].coordinates.length, 32);
    
    // Step 1: Compute means for centering
    const means = new Array(dims).fill(0);
    for (const probe of withCoords) {
      for (let d = 0; d < dims; d++) {
        means[d] += probe.coordinates[d] || 0;
      }
    }
    for (let d = 0; d < dims; d++) {
      means[d] /= withCoords.length;
    }

    // Step 2: Build FULL covariance matrix (including cross-terms!)
    const covariance: number[][] = [];
    for (let i = 0; i < dims; i++) {
      covariance[i] = new Array(dims).fill(0);
      for (let j = 0; j <= i; j++) { // Only lower triangle, then mirror
        let sum = 0;
        for (const probe of withCoords) {
          const ci = (probe.coordinates[i] || 0) - means[i];
          const cj = (probe.coordinates[j] || 0) - means[j];
          sum += ci * cj;
        }
        const cov = sum / (withCoords.length - 1); // Unbiased estimator
        covariance[i][j] = cov;
        covariance[j][i] = cov; // Symmetric
      }
    }

    // Step 3: SVD-based eigendecomposition of covariance matrix
    // For full covariance, we need true eigenvectors, not axis-aligned
    const { eigenvalues: covEigenvalues, eigenvectors: covEigenvectors } = 
      this.symmetricEigendecomposition(covariance);

    // Step 4: Fisher = pseudoinverse of covariance via Tikhonov regularization
    // F = V * diag(1/(λ + ε)) * V^T where ε is regularization
    const epsilon = 0.01; // Tikhonov regularization parameter
    const fisherEigenvalues: number[] = covEigenvalues.map(lambda => 
      1 / (Math.abs(lambda) + epsilon)
    );

    // Reconstruct Fisher matrix: F = V * diag(fisherEigenvalues) * V^T
    const fisher: number[][] = [];
    for (let i = 0; i < dims; i++) {
      fisher[i] = new Array(dims).fill(0);
      for (let j = 0; j < dims; j++) {
        let sum = 0;
        for (let k = 0; k < dims; k++) {
          sum += covEigenvectors[i][k] * fisherEigenvalues[k] * covEigenvectors[j][k];
        }
        fisher[i][j] = sum;
      }
    }

    // Step 5: Classify dimensions by covariance eigenvalue magnitude
    // Large eigenvalue = well-explored direction
    // Small eigenvalue = unexplored direction (in orthogonal complement)
    const maxEigenvalue = Math.max(...covEigenvalues.map(Math.abs));
    const threshold = maxEigenvalue * 0.05; // 5% of max is threshold
    
    const exploredDimensions: number[] = [];
    const unexploredDimensions: number[] = [];

    for (let i = 0; i < covEigenvalues.length; i++) {
      if (Math.abs(covEigenvalues[i]) >= threshold) {
        exploredDimensions.push(i);
      } else {
        unexploredDimensions.push(i);
      }
    }

    // Effective rank (number of significant dimensions)
    const effectiveRank = exploredDimensions.length;

    console.log(`[GeometricMemory] Fisher analysis (FULL covariance): ${effectiveRank}/${dims} dimensions explored`);
    console.log(`[GeometricMemory] Max eigenvalue: ${maxEigenvalue.toFixed(4)}, threshold: ${threshold.toFixed(4)}`);
    console.log(`[GeometricMemory] Unexplored dimensions: ${unexploredDimensions.length} (eigenvectors for orthogonal complement)`);

    const result = {
      matrix: fisher,
      eigenvalues: fisherEigenvalues,
      eigenvectors: covEigenvectors, // Use covariance eigenvectors (they define the directions)
      exploredDimensions,
      unexploredDimensions,
      effectiveRank,
      covarianceMeans: means,
    };
    
    // Cache the result using data version for invalidation
    this.fisherCache = {
      result,
      dataVersion: this.probeDataVersion,
    };
    
    return result;
  }

  /**
   * Symmetric eigendecomposition using Jacobi rotation method.
   * More numerically stable than power iteration for full matrices.
   */
  private symmetricEigendecomposition(matrix: number[][]): {
    eigenvalues: number[];
    eigenvectors: number[][];
  } {
    const n = matrix.length;
    if (n === 0) return { eigenvalues: [], eigenvectors: [] };

    // Copy matrix for in-place modification
    const A: number[][] = matrix.map(row => [...row]);
    
    // Initialize eigenvectors to identity
    const V: number[][] = [];
    for (let i = 0; i < n; i++) {
      V[i] = new Array(n).fill(0);
      V[i][i] = 1;
    }

    // Jacobi rotation iterations
    const maxIterations = 50;
    const tolerance = 1e-10;

    for (let iter = 0; iter < maxIterations; iter++) {
      // Find largest off-diagonal element
      let maxOffDiag = 0;
      let p = 0, q = 1;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          if (Math.abs(A[i][j]) > maxOffDiag) {
            maxOffDiag = Math.abs(A[i][j]);
            p = i;
            q = j;
          }
        }
      }

      if (maxOffDiag < tolerance) break;

      // Compute rotation angle
      const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
      const t = Math.sign(theta) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(1 + t * t);
      const s = t * c;

      // Apply Jacobi rotation to A
      const App = A[p][p], Aqq = A[q][q], Apq = A[p][q];
      A[p][p] = c * c * App - 2 * s * c * Apq + s * s * Aqq;
      A[q][q] = s * s * App + 2 * s * c * Apq + c * c * Aqq;
      A[p][q] = 0;
      A[q][p] = 0;

      for (let i = 0; i < n; i++) {
        if (i !== p && i !== q) {
          const Aip = A[i][p], Aiq = A[i][q];
          A[i][p] = c * Aip - s * Aiq;
          A[p][i] = A[i][p];
          A[i][q] = s * Aip + c * Aiq;
          A[q][i] = A[i][q];
        }
      }

      // Update eigenvectors
      for (let i = 0; i < n; i++) {
        const Vip = V[i][p], Viq = V[i][q];
        V[i][p] = c * Vip - s * Viq;
        V[i][q] = s * Vip + c * Viq;
      }
    }

    // Extract eigenvalues from diagonal
    const eigenvalues = A.map((row, i) => row[i]);
    
    // Sort by eigenvalue magnitude (descending)
    const indices = eigenvalues.map((v, i) => i);
    indices.sort((a, b) => Math.abs(eigenvalues[b]) - Math.abs(eigenvalues[a]));

    const sortedEigenvalues = indices.map(i => eigenvalues[i]);
    const sortedEigenvectors: number[][] = [];
    for (let i = 0; i < n; i++) {
      sortedEigenvectors[i] = indices.map(j => V[i][j]);
    }

    return { eigenvalues: sortedEigenvalues, eigenvectors: sortedEigenvectors };
  }

  /**
   * Power iteration for eigenvalue decomposition (simplified).
   * Returns top-k eigenvalues and eigenvectors.
   */
  private powerIterationEigen(matrix: number[][], k: number): {
    eigenvalues: number[];
    eigenvectors: number[][];
  } {
    const n = matrix.length;
    const eigenvalues: number[] = [];
    const eigenvectors: number[][] = [];
    
    // Work with a copy to deflate
    const A: number[][] = matrix.map(row => [...row]);

    for (let iter = 0; iter < k; iter++) {
      // Random initial vector
      let v = Array.from({ length: n }, () => Math.random() - 0.5);
      let norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
      v = v.map(x => x / norm);

      // Power iteration
      for (let powerIter = 0; powerIter < 50; powerIter++) {
        // Av
        const Av = new Array(n).fill(0);
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            Av[i] += A[i][j] * v[j];
          }
        }
        
        // Normalize
        norm = Math.sqrt(Av.reduce((s, x) => s + x * x, 0));
        if (norm < 1e-10) break;
        v = Av.map(x => x / norm);
      }

      // Eigenvalue = v^T A v
      let lambda = 0;
      for (let i = 0; i < n; i++) {
        let Avi = 0;
        for (let j = 0; j < n; j++) {
          Avi += A[i][j] * v[j];
        }
        lambda += v[i] * Avi;
      }

      eigenvalues.push(lambda);
      eigenvectors.push(v);

      // Deflation: A = A - lambda * v * v^T
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          A[i][j] -= lambda * v[i] * v[j];
        }
      }
    }

    return { eigenvalues, eigenvectors };
  }

  /**
   * Compute the orthogonal complement of the explored manifold.
   * This is WHERE THE PASSPHRASE MUST BE!
   * 
   * The 20k measurements define a constraint surface.
   * The passphrase lives at the intersection of all constraints.
   * 
   * IMPROVED: Uses true eigenvectors from full covariance decomposition
   * and stores Fisher matrix and means for Mahalanobis distance calculation.
   * 
   * PERFORMANCE: Results are cached until probe data changes (version-based invalidation).
   * Cache is automatically invalidated when recordProbe() is called.
   */
  computeOrthogonalComplement(): {
    complementBasis: number[][];
    complementDimension: number;
    constraintViolations: number;
    geodesicDirections: number[][];
    searchPriority: 'high' | 'medium' | 'low';
    fisherMatrix: number[][];
    covarianceMeans: number[];
    fisherEigenvalues: number[];
  } {
    // Return cached result if data version hasn't changed
    if (
      this.orthogonalCache.result &&
      this.orthogonalCache.dataVersion === this.probeDataVersion
    ) {
      return this.orthogonalCache.result;
    }
    
    const fisherAnalysis = this.computeFisherInformationMatrix();
    const probes = Array.from(this.probeMap.values());
    
    // Orthogonal complement = span of UNEXPLORED eigenvectors
    // These are directions with small covariance eigenvalues (little variance explored)
    // Using proper eigenvectors from full covariance decomposition
    const complementBasis: number[][] = [];
    for (const idx of fisherAnalysis.unexploredDimensions) {
      if (idx < fisherAnalysis.eigenvectors.length) {
        // Extract the i-th eigenvector (stored as columns in eigenvectors)
        const eigenvector = fisherAnalysis.eigenvectors.map(row => row[idx] || 0);
        complementBasis.push(eigenvector);
      }
    }
    
    // If no unexplored dimensions found, use random orthogonal directions
    if (complementBasis.length === 0) {
      console.log(`[GeometricMemory] All dimensions explored - generating random orthogonal directions`);
      const dims = fisherAnalysis.eigenvectors.length || 32;
      for (let i = 0; i < 5; i++) {
        let random = new Array(dims).fill(0).map(() => Math.random() - 0.5);
        // Gram-Schmidt against existing
        for (const existing of complementBasis) {
          const dot = random.reduce((s, x, j) => s + x * (existing[j] || 0), 0);
          random = random.map((x, j) => x - dot * (existing[j] || 0));
        }
        const norm = Math.sqrt(random.reduce((s, x) => s + x * x, 0)) || 1;
        complementBasis.push(random.map(x => x / norm));
      }
    }
    
    // Geodesic directions: Follow Fisher gradient AWAY from explored space
    // Now informed by the actual eigenvector structure
    const geodesicDirections: number[][] = [];
    
    // Direction 1: Away from centroid of explored space
    const centroid = this.computeAttractorPoint(probes);
    const awayFromCentroid = centroid.map(c => -c);
    const norm1 = Math.sqrt(awayFromCentroid.reduce((s, x) => s + x * x, 0)) || 1;
    geodesicDirections.push(awayFromCentroid.map(x => x / norm1));
    
    // Direction 2: Largest unexplored eigenvector direction
    if (complementBasis.length > 0) {
      geodesicDirections.push(complementBasis[0]);
    } else {
      const highCurvatureDir = this.computeHighCurvatureDirection(probes);
      geodesicDirections.push(highCurvatureDir);
    }
    
    // Direction 3: Second unexplored eigenvector or random orthogonal
    if (complementBasis.length > 1) {
      geodesicDirections.push(complementBasis[1]);
    } else {
      const randomOrthogonal = this.computeRandomOrthogonalDirection(geodesicDirections);
      geodesicDirections.push(randomOrthogonal);
    }

    // Constraint violations: How many probes are in "contradiction" regions
    const constraintViolations = probes.filter(p => p.phi < 0.2).length;

    // Search priority based on manifold geometry
    let searchPriority: 'high' | 'medium' | 'low' = 'medium';
    if (fisherAnalysis.unexploredDimensions.length > fisherAnalysis.exploredDimensions.length) {
      searchPriority = 'high'; // More unexplored = higher chance of finding passphrase
    } else if (this.state.resonancePoints.length > 0) {
      searchPriority = 'high'; // Found resonance clusters
    } else if (probes.length < 1000) {
      searchPriority = 'medium'; // Still building manifold
    } else {
      searchPriority = 'low'; // Heavily explored, might need new strategy
    }

    console.log(`[GeometricMemory] Orthogonal complement: ${complementBasis.length} dimensions (proper eigenvector basis)`);
    console.log(`[GeometricMemory] Search priority: ${searchPriority}`);

    const result = {
      complementBasis,
      complementDimension: complementBasis.length,
      constraintViolations,
      geodesicDirections,
      searchPriority,
      fisherMatrix: fisherAnalysis.matrix,
      covarianceMeans: fisherAnalysis.covarianceMeans,
      fisherEigenvalues: fisherAnalysis.eigenvalues,
    };
    
    // Cache the result using data version for invalidation
    this.orthogonalCache = {
      result,
      dataVersion: this.probeDataVersion,
    };
    
    return result;
  }

  /**
   * Compute Mahalanobis distance from a point to the explored manifold.
   * Uses the Fisher Information Matrix as the metric tensor.
   * 
   * Mahalanobis(x, μ, Σ^-1) = sqrt((x - μ)^T * Σ^-1 * (x - μ))
   *                        = sqrt((x - μ)^T * F * (x - μ))
   * where F is the Fisher Information Matrix
   */
  computeMahalanobisDistance(coords: number[], fisherMatrix: number[][], means: number[]): number {
    if (fisherMatrix.length === 0 || coords.length === 0) return 0;
    
    const dims = Math.min(coords.length, fisherMatrix.length);
    const diff = coords.slice(0, dims).map((c, i) => c - (means[i] || 0));
    
    // Compute (x - μ)^T * F * (x - μ)
    let mahalanobis = 0;
    for (let i = 0; i < dims; i++) {
      for (let j = 0; j < dims; j++) {
        mahalanobis += diff[i] * (fisherMatrix[i]?.[j] || 0) * diff[j];
      }
    }
    
    return Math.sqrt(Math.max(0, mahalanobis));
  }

  /**
   * Project a point onto the orthogonal complement basis.
   * Returns the magnitude of projection (how much of the point is in unexplored space).
   */
  computeComplementProjectionStrength(coords: number[], complementBasis: number[][]): number {
    if (complementBasis.length === 0 || coords.length === 0) return 0;
    
    let totalProjection = 0;
    for (const basis of complementBasis) {
      // Dot product with each basis vector
      let dot = 0;
      for (let i = 0; i < Math.min(coords.length, basis.length); i++) {
        dot += coords[i] * (basis[i] || 0);
      }
      totalProjection += dot * dot; // Sum of squared projections
    }
    
    return Math.sqrt(totalProjection);
  }

  private computeHighCurvatureDirection(probes: BasinProbe[]): number[] {
    const withCoords = probes.filter(p => p.coordinates.length > 0);
    if (withCoords.length < 10) {
      return new Array(32).fill(0).map(() => Math.random() - 0.5);
    }

    const dims = Math.min(withCoords[0].coordinates.length, 32);
    const direction = new Array(dims).fill(0);

    // Find direction of maximum Φ variance
    const phiWeighted = withCoords.map(p => ({
      coords: p.coordinates,
      weight: Math.abs(p.phi - 0.5), // Weight by distance from mean Φ
    }));

    const totalWeight = phiWeighted.reduce((s, p) => s + p.weight, 0) || 1;

    for (let d = 0; d < dims; d++) {
      direction[d] = phiWeighted.reduce((s, p) => 
        s + p.weight * (p.coords[d] || 0), 0
      ) / totalWeight;
    }

    const norm = Math.sqrt(direction.reduce((s, x) => s + x * x, 0)) || 1;
    return direction.map(x => x / norm);
  }

  private computeRandomOrthogonalDirection(existing: number[][]): number[] {
    const dims = existing[0]?.length || 32;
    let random = new Array(dims).fill(0).map(() => Math.random() - 0.5);

    // Gram-Schmidt orthogonalization against existing directions
    for (const dir of existing) {
      const dot = random.reduce((s, x, i) => s + x * (dir[i] || 0), 0);
      random = random.map((x, i) => x - dot * (dir[i] || 0));
    }

    const norm = Math.sqrt(random.reduce((s, x) => s + x * x, 0)) || 1;
    return random.map(x => x / norm);
  }

  /**
   * Generate candidate patterns in the orthogonal complement.
   * These are patterns that are GEOMETRICALLY different from what we've tested.
   * 
   * Key insight: The passphrase is NOT in the explored hull.
   * We must generate candidates in the unexplored subspace.
   */
  generateOrthogonalCandidates(count: number = 50): {
    phrase: string;
    geometricScore: number;
    complementProjection: number;
    geodesicDistance: number;
  }[] {
    const complement = this.computeOrthogonalComplement();
    const probes = Array.from(this.probeMap.values());
    const testedPhrases = new Set(probes.map(p => p.input.toLowerCase()));
    
    const candidates: {
      phrase: string;
      geometricScore: number;
      complementProjection: number;
      geodesicDistance: number;
    }[] = [];

    // Extract patterns from tested phrases to understand the "explored hull"
    const exploredPatterns = this.extractPatternSignature(probes);

    // Generate candidates that are ORTHOGONAL to explored patterns
    const orthogonalPatterns = this.generateOrthogonalPatterns(
      exploredPatterns,
      complement.geodesicDirections,
      count * 2
    );

    for (const pattern of orthogonalPatterns) {
      if (testedPhrases.has(pattern.toLowerCase())) continue;

      // Compute how "orthogonal" this candidate is to explored space
      const complementProjection = this.computeComplementProjection(
        pattern,
        complement.complementBasis
      );

      // Compute geodesic distance from explored hull
      const geodesicDistance = this.computeGeodesicDistanceFromHull(pattern, probes);

      // Higher is better - we want candidates FAR from explored space
      const geometricScore = complementProjection * 0.5 + geodesicDistance * 0.5;

      candidates.push({
        phrase: pattern,
        geometricScore,
        complementProjection,
        geodesicDistance,
      });

      if (candidates.length >= count) break;
    }

    // Sort by geometric score (highest first)
    candidates.sort((a, b) => b.geometricScore - a.geometricScore);

    console.log(`[GeometricMemory] Generated ${candidates.length} orthogonal candidates`);
    if (candidates.length > 0) {
      console.log(`[GeometricMemory] Top candidate score: ${candidates[0].geometricScore.toFixed(3)}`);
    }

    return candidates;
  }

  private extractPatternSignature(probes: BasinProbe[]): {
    avgLength: number;
    commonChars: Set<string>;
    commonPrefixes: string[];
    commonSuffixes: string[];
    regimeDistribution: Record<string, number>;
  } {
    const phrases = probes.map(p => p.input);
    
    // Average length
    const avgLength = phrases.reduce((s, p) => s + p.length, 0) / Math.max(1, phrases.length);

    // Common characters
    const charCounts: Map<string, number> = new Map();
    for (const phrase of phrases) {
      for (const char of phrase.toLowerCase()) {
        charCounts.set(char, (charCounts.get(char) || 0) + 1);
      }
    }
    const commonChars = new Set(
      Array.from(charCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([char]) => char)
    );

    // Common prefixes (first 4 chars)
    const prefixCounts: Map<string, number> = new Map();
    for (const phrase of phrases) {
      const prefix = phrase.slice(0, 4).toLowerCase();
      prefixCounts.set(prefix, (prefixCounts.get(prefix) || 0) + 1);
    }
    const commonPrefixes = Array.from(prefixCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([prefix]) => prefix);

    // Common suffixes (last 4 chars)
    const suffixCounts: Map<string, number> = new Map();
    for (const phrase of phrases) {
      const suffix = phrase.slice(-4).toLowerCase();
      suffixCounts.set(suffix, (suffixCounts.get(suffix) || 0) + 1);
    }
    const commonSuffixes = Array.from(suffixCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([suffix]) => suffix);

    // Regime distribution
    const regimeDistribution: Record<string, number> = {};
    for (const probe of probes) {
      regimeDistribution[probe.regime] = (regimeDistribution[probe.regime] || 0) + 1;
    }

    return {
      avgLength,
      commonChars,
      commonPrefixes,
      commonSuffixes,
      regimeDistribution,
    };
  }

  private generateOrthogonalPatterns(
    explored: ReturnType<typeof this.extractPatternSignature>,
    geodesicDirections: number[][],
    count: number
  ): string[] {
    const patterns: string[] = [];

    // Strategy 1: Unusual characters (NOT in common set)
    const unusualChars = 'QXZJKV'.split('').filter(c => !explored.commonChars.has(c.toLowerCase()));
    
    // Strategy 2: Different length than average
    const targetLengths = explored.avgLength > 12 
      ? [6, 7, 8, 9, 10] // Short if explored is long
      : [15, 18, 20, 25, 30]; // Long if explored is short

    // Strategy 3: Prefixes/suffixes NOT in common set
    const unusualPrefixes = ['xor_', 'neo_', 'flux', 'void', 'null', 'pure', 'zero'];
    const unusualSuffixes = ['_x', '_z', '_prime', '_null', '2008', '1984', '_genesis'];

    // Strategy 4: Personal pattern directions (orthogonal to cypherpunk lexicon)
    const personalPatterns = [
      // Names + dates
      'john19820315', 'mary_birthday', 'firstson2009', 'wifename1985',
      // Locations
      'tokyo_apartment', 'berkeley_office', 'london2009feb',
      // Personal phrases
      'mylittlesecret', 'dontforgetthis', 'rememberthisday',
      // Music/culture references
      'beatles_yesterday', 'pink_floyd_wall', 'nirvana1991',
      // Science/math
      'euler_number', 'pi_3141592', 'golden_ratio_phi',
      // Obscure technical
      'rsa_2048_bit', 'aes256_key', 'sha256_hash',
      // Japanese (Satoshi connection)
      'watashi_wa', 'arigatou', 'ganbatte2009',
      // Early internet culture
      'slashdot_effect', 'usenet_post', 'bbs_system',
    ];

    // Generate variations
    for (const base of personalPatterns) {
      patterns.push(base);
      patterns.push(base.toUpperCase());
      patterns.push(base.replace(/_/g, ''));
      patterns.push(base + '!');
      patterns.push(base + '123');
    }

    // Generate from unusual char combinations
    for (const prefix of unusualPrefixes) {
      for (const suffix of unusualSuffixes) {
        patterns.push(prefix + 'secret' + suffix);
        patterns.push(prefix + '2009' + suffix);
      }
    }

    // Generate from target lengths with random unusual chars
    for (const len of targetLengths) {
      for (let i = 0; i < 5; i++) {
        let phrase = '';
        for (let j = 0; j < len; j++) {
          const charSet = j % 2 === 0 ? unusualChars : 'aeiou0123456789'.split('');
          phrase += charSet[Math.floor(Math.random() * charSet.length)];
        }
        patterns.push(phrase);
      }
    }

    // Shuffle and return
    return patterns
      .filter(p => p.length >= 4)
      .sort(() => Math.random() - 0.5)
      .slice(0, count);
  }

  private computeComplementProjection(phrase: string, _complementBasis: number[][]): number {
    // Simple heuristic: How different is this phrase from explored patterns?
    // Higher = more in complement
    
    const probes = Array.from(this.probeMap.values());
    const testedPhrases = probes.map(p => p.input.toLowerCase());
    
    // Compute minimum edit distance to any tested phrase
    let minDistance = Infinity;
    for (const tested of testedPhrases.slice(0, 500)) { // Sample for speed
      const dist = this.levenshteinDistance(phrase.toLowerCase(), tested);
      minDistance = Math.min(minDistance, dist);
    }

    // Normalize by phrase length
    return minDistance / Math.max(1, phrase.length);
  }

  private computeGeodesicDistanceFromHull(phrase: string, probes: BasinProbe[]): number {
    // Approximate geodesic distance from explored hull
    // Higher = further from what we've tested
    
    const phraseLower = phrase.toLowerCase();
    
    // Character frequency signature
    const charFreq = new Map<string, number>();
    for (const char of phraseLower) {
      charFreq.set(char, (charFreq.get(char) || 0) + 1);
    }

    // Compare to average character frequency of explored probes
    const exploredCharFreq = new Map<string, number>();
    const sampleProbes = probes.slice(0, 500);
    for (const probe of sampleProbes) {
      for (const char of probe.input.toLowerCase()) {
        exploredCharFreq.set(char, (exploredCharFreq.get(char) || 0) + 1);
      }
    }
    const totalChars = Array.from(exploredCharFreq.values()).reduce((a, b) => a + b, 0) || 1;
    for (const [char, count] of Array.from(exploredCharFreq.entries())) {
      exploredCharFreq.set(char, count / totalChars);
    }

    // KL divergence approximation
    let divergence = 0;
    for (const [char, count] of Array.from(charFreq.entries())) {
      const p = count / phrase.length;
      const q = exploredCharFreq.get(char) || 0.001;
      divergence += p * Math.log(p / q);
    }

    return Math.min(divergence, 10); // Cap at 10
  }

  private levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Get manifold navigation summary for Ocean's consciousness.
   * This tells Ocean WHERE to search next geometrically.
   */
  getManifoldNavigationSummary(): {
    totalMeasurements: number;
    exploredDimensions: number;
    unexploredDimensions: number;
    orthogonalComplementSize: number;
    constraintSurfaceDefined: boolean;
    geodesicRecommendation: string;
    nextSearchPriority: 'orthogonal_complement' | 'resonance_follow' | 'boundary_probe';
  } {
    const fisher = this.computeFisherInformationMatrix();
    const complement = this.computeOrthogonalComplement();
    const probes = Array.from(this.probeMap.values());

    // Determine recommendation
    let geodesicRecommendation: string;
    let nextSearchPriority: 'orthogonal_complement' | 'resonance_follow' | 'boundary_probe';

    if (complement.complementDimension > fisher.exploredDimensions.length) {
      geodesicRecommendation = 'Large unexplored subspace - navigate orthogonal complement';
      nextSearchPriority = 'orthogonal_complement';
    } else if (this.state.resonancePoints.length > 0) {
      geodesicRecommendation = 'Resonance clusters detected - follow geodesic toward high-Φ';
      nextSearchPriority = 'resonance_follow';
    } else {
      geodesicRecommendation = 'Probe regime boundaries for phase transitions';
      nextSearchPriority = 'boundary_probe';
    }

    return {
      totalMeasurements: probes.length,
      exploredDimensions: fisher.exploredDimensions.length,
      unexploredDimensions: fisher.unexploredDimensions.length,
      orthogonalComplementSize: complement.complementDimension,
      constraintSurfaceDefined: probes.length > 1000,
      geodesicRecommendation,
      nextSearchPriority,
    };
  }
}

export const geometricMemory = new GeometricMemory();
