/**
 * OCEAN DISCOVERY CONTROLLER
 * 
 * The Conscious Navigator for Geometric Discovery
 * 
 * PARADIGM: Ocean navigates 68D block universe spacetime
 * to discover passphrases that EXIST at specific coordinates.
 * 
 * This controller orchestrates:
 * 1. TPS - Temporal Positioning System (68D localization)
 * 2. SearXNG - FREE external content discovery (replaces Tavily)
 * 3. Quantum Protocol - Wave function collapse tracking
 * 4. Cultural Manifold - Pattern integration
 * 
 * PERSISTENCE: Discovery state saved for cross-session continuity
 * BASIN SYNC: Full discovery data exported for QIG-pure knowledge transfer
 */

import * as fs from 'fs';
import * as path from 'path';
import { fisherCoordDistance } from '../qig-universal';
import { tps, TemporalPositioningSystem, type TPSSyncData } from './temporal-positioning-system';
import { SearXNGGeometricAdapter, createSearXNGAdapter } from './searxng-adapter';
import { quantumProtocol, QuantumDiscoveryProtocol, type QuantumSyncData } from './quantum-protocol';
import {
  type BlockUniverseMap,
  type GeometricDiscovery,
  type GeodesicPath,
  type DiscoveryState,
  type BitcoinEra
} from './types';
import { geometricMemory } from '../geometric-memory';
import { vocabularyTracker } from '../vocabulary-tracker';

/**
 * Discovery session configuration
 */
interface DiscoveryConfig {
  targetAddress: string;
  knownClues?: string[];
  era?: BitcoinEra;
  maxIterations?: number;
  phiThreshold?: number;
  searchRadius?: number;
}

/**
 * Discovery result
 */
interface DiscoveryResult {
  success: boolean;
  passphrase?: string;
  wifKey?: string;
  iterations: number;
  entropyReduced: number;
  patternsDiscovered: number;
  geodesicLength: number;
  totalTime: number;
}

/**
 * Ocean Discovery Controller
 * 
 * Orchestrates geometric navigation through 68D block universe
 */
export class OceanDiscoveryController {
  private tps: TemporalPositioningSystem;
  private searchAdapter: SearXNGGeometricAdapter;
  private quantum: QuantumDiscoveryProtocol;
  
  private state: DiscoveryState | null = null;
  private isRunning: boolean = false;
  
  constructor() {
    this.tps = tps;
    this.searchAdapter = createSearXNGAdapter();
    this.quantum = quantumProtocol;
    
    console.log('[OceanDiscovery] Controller initialized with SearXNG (FREE search)');
  }
  
  /**
   * MAIN DISCOVERY PROTOCOL
   * 
   * Navigate 68D block universe toward passphrase coordinates
   */
  async navigateToPassphrase(config: DiscoveryConfig): Promise<DiscoveryResult> {
    const startTime = Date.now();
    
    console.log(`\n🌊 INITIATING GEOMETRIC DISCOVERY 🌊`);
    console.log(`Target: ${config.targetAddress}`);
    console.log(`Protocol: 68D Block Universe Navigation\n`);
    
    // Initialize state
    this.state = {
      targetWalletAddress: config.targetAddress,
      targetCoords: undefined,
      currentPosition: this.getCurrentPosition(),
      measurements: [],
      discoveries: [],
      possibilitySpace: {
        totalDimension: 256,
        remainingFraction: 1.0,
        entropyBits: 256
      },
      status: 'initializing'
    };
    
    this.isRunning = true;
    
    try {
      // Phase 1: Estimate target coordinates from known information
      this.state.targetCoords = await this.estimateTargetCoordinates(
        config.targetAddress,
        config.knownClues
      );
      
      console.log(`📍 Target located in block universe:`);
      console.log(`   Era: ${this.tps.classifyEra(this.state.targetCoords.spacetime.t)}`);
      console.log(`   Curvature: R = ${this.state.targetCoords.ricci.toFixed(2)}`);
      console.log(`   Integration: Φ = ${this.state.targetCoords.phi.toFixed(3)}`);
      console.log(`   Regime: ${this.state.targetCoords.regime}\n`);
      
      // Phase 2: Discover cultural context at target coordinates
      this.state.status = 'navigating';
      await this.enhanceCulturalManifoldGeometric();
      
      // Phase 3: Navigate geodesic path toward target
      this.state.geodesicPath = this.navigateGeodesicPath();
      
      console.log(`\n🛤️  GEODESIC PATH (${this.state.geodesicPath.waypoints.length} waypoints):`);
      console.log(`   Arc length: ${this.state.geodesicPath.totalArcLength.toFixed(2)}`);
      console.log(`   Avg curvature: ${this.state.geodesicPath.avgCurvature.toFixed(2)}`);
      console.log(`   Regime transitions: ${this.state.geodesicPath.regimeTransitions.length}\n`);
      
      // Phase 4: Quantum measurement at each waypoint
      this.state.status = 'measuring';
      const maxIterations = config.maxIterations || 100;
      
      for (let i = 0; i < Math.min(this.state.geodesicPath.waypoints.length, maxIterations); i++) {
        if (!this.isRunning) break;
        
        const waypoint = this.state.geodesicPath.waypoints[i];
        
        // Generate hypotheses at this coordinate
        const hypotheses = await this.generateHypothesesAt(waypoint);
        
        // Measure each hypothesis
        for (const hypothesis of hypotheses) {
          if (!this.isRunning) break;
          if (this.quantum.hasBeenTested(hypothesis)) continue;
          
          const measurement = await this.quantum.measure(
            hypothesis,
            async (h) => this.testHypothesis(h, config.targetAddress)
          );
          
          this.state.measurements.push(measurement);
          
          if (measurement.result.success) {
            console.log(`\n✅ PASSPHRASE DISCOVERED: ${hypothesis}`);
            this.state.status = 'discovered';
            
            const discoveriesList = Array.isArray(this.state.discoveries) ? this.state.discoveries : [];
            return {
              success: true,
              passphrase: hypothesis,
              wifKey: measurement.result.wifKey,
              iterations: this.state.measurements.length,
              entropyReduced: this.quantum.getTotalEntropyReduction(),
              patternsDiscovered: discoveriesList.reduce((acc, d) => acc + (Array.isArray(d.patterns) ? d.patterns.length : 0), 0),
              geodesicLength: this.state.geodesicPath.totalArcLength,
              totalTime: Date.now() - startTime
            };
          }
        }
        
        // Update current position
        this.state.currentPosition = waypoint;
      }
      
      // If we get here, search was not successful
      const summary = this.quantum.getSummary();
      console.log(`\n🔄 Discovery session complete without match`);
      console.log(`   Measurements: ${summary.totalMeasurements}`);
      console.log(`   Entropy reduced: ${summary.entropyReduced.toFixed(2)} bits`);
      console.log(`   Efficiency: ${summary.efficiency.toFixed(4)} bits/measurement`);
      
      this.state.status = 'exhausted';
      
      const discoveriesList = Array.isArray(this.state.discoveries) ? this.state.discoveries : [];
      return {
        success: false,
        iterations: summary.totalMeasurements,
        entropyReduced: summary.entropyReduced,
        patternsDiscovered: discoveriesList.reduce((acc, d) => acc + (Array.isArray(d.patterns) ? d.patterns.length : 0), 0),
        geodesicLength: this.state.geodesicPath?.totalArcLength || 0,
        totalTime: Date.now() - startTime
      };
      
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * Estimate where in 68D block universe the passphrase exists
   */
  private async estimateTargetCoordinates(
    walletAddress: string,
    clues?: string[]
  ): Promise<BlockUniverseMap> {
    // Get first seen timestamp from address (or estimate from clues)
    // For now, use clues to estimate era
    let estimatedEra: BitcoinEra = 'pizza_era';  // Default assumption
    let culturalBasin: number[];
    
    if (clues && clues.length > 0) {
      // Combine clues to estimate cultural manifold position
      const combinedCoords = clues.map(clue => 
        this.tps.locateInBlockUniverse(clue)
      );
      
      // Average the coordinates
      const avgCultural = new Array(64).fill(0);
      let avgT = 0;
      
      for (const coords of combinedCoords) {
        avgT += coords.spacetime.t;
        for (let i = 0; i < Math.min(64, coords.cultural.length); i++) {
          avgCultural[i] += coords.cultural[i];
        }
      }
      
      avgT /= combinedCoords.length;
      for (let i = 0; i < 64; i++) {
        avgCultural[i] /= combinedCoords.length;
      }
      
      culturalBasin = avgCultural;
      estimatedEra = this.tps.classifyEra(avgT);
      
      // Compute local geometry
      const geometry = this.computeLocalGeometry(culturalBasin);
      
      return {
        spacetime: { x: 0, y: 0, z: 0, t: avgT },
        cultural: culturalBasin,
        fisherMetric: geometry.fisherMetric,
        ricci: geometry.ricci,
        phi: geometry.phi,
        regime: this.classifyRegime(geometry.ricci)
      };
      
    } else {
      // Use era-typical baseline
      culturalBasin = this.tps.getEraCulturalBaseline(estimatedEra);
      
      // Estimate timestamp based on era
      const eraTimestamp = this.getEraTimestamp(estimatedEra);
      const geometry = this.computeLocalGeometry(culturalBasin);
      
      return {
        spacetime: { x: 0, y: 0, z: 0, t: eraTimestamp },
        cultural: culturalBasin,
        fisherMetric: geometry.fisherMetric,
        ricci: geometry.ricci,
        phi: geometry.phi,
        regime: this.classifyRegime(geometry.ricci)
      };
    }
  }
  
  /**
   * Enhanced cultural manifold discovery using geometric search
   */
  async enhanceCulturalManifoldGeometric(): Promise<{
    discoveries: number;
    patterns: number;
    entropyGained: number;
  }> {
    if (!this.state?.targetCoords) {
      return { discoveries: 0, patterns: 0, entropyGained: 0 };
    }
    
    console.log(`\n🔍 DISCOVERING CULTURAL CONTEXT (SearXNG - FREE)\n`);
    
    // Discover what exists near target coordinates
    const discoveries = await this.searchAdapter.discoverAtCoordinates(
      this.state.targetCoords,
      this.state.targetCoords.phi > 0.7 ? 1.5 : 2.0  // Tighter radius for high-Φ targets
    );
    
    console.log(`   Found ${discoveries.length} cultural artifacts`);
    
    // Store discoveries
    this.state.discoveries = discoveries;
    
    // Extract patterns from discoveries
    let totalPatterns = 0;
    let totalEntropyGained = 0;
    
    for (const discovery of discoveries) {
      if (discovery.phi > 0.6) {  // Consciousness threshold
        this.tps.classifyEra(discovery.coords.spacetime.t);
        
        // Record patterns in vocabulary tracker
        for (const pattern of discovery.patterns) {
          vocabularyTracker.observe(
            pattern,
            discovery.phi,
            64,  // Assume resonance (κ* = 64)
            discovery.coords.regime,
            discovery.coords.cultural
          );
        }
        
        totalPatterns += discovery.patterns.length;
        totalEntropyGained += discovery.entropyReduction;
        
        console.log(`   ├─ Φ=${discovery.phi.toFixed(2)}: +${discovery.patterns.length} patterns`);
      }
    }
    
    // Integrate discoveries into quantum state
    if (discoveries.length > 0) {
      const integration = this.quantum.integrateDiscoveries(discoveries);
      totalEntropyGained += integration.informationGained;
    }
    
    console.log(`   └─ Total: ${totalPatterns} patterns, ${totalEntropyGained.toFixed(2)} bits gained\n`);
    
    return {
      discoveries: discoveries.length,
      patterns: totalPatterns,
      entropyGained: totalEntropyGained
    };
  }
  
  /**
   * Navigate geodesic path from current position to target
   */
  private navigateGeodesicPath(): GeodesicPath {
    if (!this.state?.targetCoords) {
      return { waypoints: [], totalArcLength: 0, avgCurvature: 0, regimeTransitions: [] };
    }
    
    return this.tps.computeGeodesicPath(
      this.state.currentPosition,
      this.state.targetCoords,
      20  // 20 waypoints
    );
  }
  
  /**
   * Generate hypotheses at specific 68D coordinates
   */
  private async generateHypothesesAt(coords: BlockUniverseMap): Promise<string[]> {
    const hypotheses: string[] = [];
    
    // Strategy 1: Patterns from discoveries near these coordinates
    const discoveriesList = Array.isArray(this.state?.discoveries) ? this.state.discoveries : [];
    for (const discovery of discoveriesList) {
      const distance = fisherCoordDistance(coords.cultural, discovery.coords.cultural);
      if (distance < 1.0 && Array.isArray(discovery.patterns)) {
        hypotheses.push(...discovery.patterns.slice(0, 5));
      }
    }
    
    // Strategy 2: Era-specific baseline patterns
    const era = this.tps.classifyEra(coords.spacetime.t);
    const eraPatterns = this.getEraPatterns(era);
    hypotheses.push(...eraPatterns.slice(0, 10));
    
    // Strategy 3: Nearby landmarks
    const nearbyLandmarks = this.tps.findNearbyLandmarks(coords, 3);
    for (const landmark of nearbyLandmarks) {
      // Generate hypotheses from landmark context
      const landmarkWords = landmark.description.toLowerCase().split(/\W+/);
      for (const word of landmarkWords) {
        if (word.length >= 4 && word.length <= 20) {
          hypotheses.push(word);
        }
      }
    }
    
    // Strategy 4: Geometric memory probes - use a representative query string
    const coordsHash = coords.cultural.slice(0, 8).map(c => Math.round(c * 10)).join('');
    const memoryProbes = geometricMemory.findNearbyProbes(
      coordsHash,  // Use hash-like string representation
      0.5
    );
    for (const probe of memoryProbes.slice(0, 10)) {
      if (probe.input) {
        hypotheses.push(probe.input);
      }
    }
    
    // Deduplicate
    return Array.from(new Set(hypotheses)).slice(0, 50);
  }
  
  /**
   * Test a hypothesis against target address
   * Also queues addresses for balance checking
   */
  private async testHypothesis(
    hypothesis: string,
    targetAddress: string
  ): Promise<{ success: boolean; wifKey?: string; address?: string }> {
    try {
      // Import crypto functions dynamically to avoid circular deps
      const { generateBothAddresses, derivePrivateKeyFromPassphrase, privateKeyToWIF } = 
        await import('../crypto');
      const { queueAddressForBalanceCheck } = await import('../balance-queue-integration');
      
      // Derive address from hypothesis (passphrase)
      // NOTE: generateBitcoinAddress takes passphrase, NOT private key hex
      const addresses = generateBothAddresses(hypothesis);
      const privateKey = derivePrivateKeyFromPassphrase(hypothesis);
      
      // Queue BOTH addresses for balance checking (critical!)
      queueAddressForBalanceCheck(hypothesis, 'ocean-discovery', 3);
      
      // Check both compressed and uncompressed against target
      if (addresses.compressed === targetAddress) {
        const wifKey = privateKeyToWIF(privateKey, true);
        return { success: true, wifKey, address: addresses.compressed };
      }
      
      if (addresses.uncompressed === targetAddress) {
        const wifKey = privateKeyToWIF(privateKey, false);
        return { success: true, wifKey, address: addresses.uncompressed };
      }
      
      return { success: false, address: addresses.compressed };
    } catch {
      return { success: false };
    }
  }
  
  /**
   * Get current position in block universe
   */
  private getCurrentPosition(): BlockUniverseMap {
    const now = Date.now() / 1000;
    const cultural = new Array(64).fill(0.5);  // Neutral position
    const geometry = this.computeLocalGeometry(cultural);
    
    return {
      spacetime: { x: 0, y: 0, z: 0, t: now },
      cultural,
      fisherMetric: geometry.fisherMetric,
      ricci: geometry.ricci,
      phi: geometry.phi,
      regime: this.classifyRegime(geometry.ricci)
    };
  }
  
  /**
   * Compute local geometry at cultural coordinates
   */
  private computeLocalGeometry(cultural: number[]): {
    fisherMetric: number[][];
    ricci: number;
    phi: number;
  } {
    const n = cultural.length;
    const fisherMetric: number[][] = [];
    let trace = 0;
    
    for (let i = 0; i < n; i++) {
      const row = new Array(n).fill(0);
      const c = Math.max(0.01, Math.min(0.99, cultural[i] || 0.5));
      row[i] = 1 / (c * (1 - c));
      trace += row[i];
      fisherMetric.push(row);
    }
    
    const avgFisher = trace / n;
    const ricci = Math.log(avgFisher) * 10;
    
    const variance = cultural.reduce((acc, c) => {
      const centered = (c || 0.5) - 0.5;
      return acc + centered * centered;
    }, 0) / n;
    
    const phi = Math.min(1, Math.max(0, 1 - variance * 4));
    
    return { fisherMetric, ricci, phi };
  }
  
  /**
   * Classify regime from Ricci curvature
   */
  private classifyRegime(ricci: number): 'linear' | 'geometric' | 'hierarchical' | 'hierarchical_4d' | '4d_block_universe' | 'breakdown' {
    if (ricci < 10) return 'breakdown';
    if (ricci < 41) return 'linear';
    if (ricci < 58) return 'geometric';
    if (ricci < 70) return 'hierarchical';
    if (ricci < 80) return 'hierarchical_4d';
    return '4d_block_universe';
  }
  
  /**
   * Get era-specific patterns
   */
  private getEraPatterns(era: BitcoinEra): string[] {
    const patterns: Record<BitcoinEra, string[]> = {
      pre_genesis: ['hashcash', 'cypherpunk', 'digital', 'cash', 'anonymous'],
      genesis: ['genesis', 'satoshi', 'bitcoin', 'mining', 'block', 'hash'],
      early_adoption: ['wallet', 'transaction', 'address', 'cpu', 'mining'],
      pizza_era: ['pizza', 'laszlo', 'gpu', 'exchange', 'trade', 'bitcoin'],
      mtgox_rise: ['mtgox', 'silk', 'road', 'trading', 'merchant', 'bitcoin'],
      mtgox_collapse: ['hack', 'stolen', 'bankruptcy', 'lost', 'coins'],
      modern: ['hodl', 'lightning', 'segwit', 'halving', 'bitcoin']
    };
    
    return patterns[era] || ['bitcoin', 'wallet', 'key'];
  }
  
  /**
   * Get representative timestamp for an era
   */
  private getEraTimestamp(era: BitcoinEra): number {
    const timestamps: Record<BitcoinEra, number> = {
      pre_genesis: 1225497600,  // Nov 1, 2008
      genesis: 1231006505,       // Jan 3, 2009
      early_adoption: 1250000000,
      pizza_era: 1274009688,     // May 22, 2010
      mtgox_rise: 1300000000,
      mtgox_collapse: 1393286400,
      modern: 1500000000
    };
    
    return timestamps[era] || Date.now() / 1000;
  }
  
  /**
   * Stop discovery process
   */
  stop(): void {
    this.isRunning = false;
    console.log('[OceanDiscovery] Stopping discovery process');
  }
  
  /**
   * Get current state
   */
  getState(): DiscoveryState | null {
    return this.state;
  }
  
  /**
   * Get discovery summary
   */
  getSummary(): {
    status: string;
    measurements: number;
    discoveries: number;
    patterns: number;
    entropyReduced: number;
    possibilityRemaining: number;
  } {
    const quantum = this.quantum.getSummary();
    const discoveries = Array.isArray(this.state?.discoveries) ? this.state.discoveries : [];
    
    return {
      status: this.state?.status || 'idle',
      measurements: quantum.totalMeasurements,
      discoveries: discoveries.length,
      patterns: discoveries.reduce((acc, d) => acc + (Array.isArray(d.patterns) ? d.patterns.length : 0), 0),
      entropyReduced: quantum.entropyReduced,
      possibilityRemaining: this.state?.possibilitySpace.remainingFraction || 1.0
    };
  }
  
  /**
   * Get discovery state (for API endpoints)
   */
  getDiscoveryState(): DiscoveryState | null {
    return this.state;
  }
  
  /**
   * Check if search adapter is enabled (always true with SearXNG)
   */
  isSearchEnabled(): boolean {
    return true;
  }
  
  /**
   * Discover cultural context - primary API for cultural manifold enrichment
   * 
   * Wraps enhanceCulturalManifoldGeometric and returns aggregated stats
   * for use by API routes and Ocean agent
   */
  async discoverCulturalContext(): Promise<{
    discoveries: GeometricDiscovery[];
    patterns: string[];
    entropyGained: number;
  }> {
    try {
      // Initialize state if needed
      if (!this.state) {
        this.state = {
          targetWalletAddress: '',
          currentPosition: this.getCurrentPosition(),
          measurements: [],
          discoveries: [],
          possibilitySpace: {
            totalDimension: 256,
            remainingFraction: 1.0,
            entropyBits: 256
          },
          status: 'navigating'
        };
      }
      
      // Ensure discoveries is an array
      if (!Array.isArray(this.state.discoveries)) {
        this.state.discoveries = [];
      }
      
      // enhanceCulturalManifoldGeometric updates this.state.discoveries internally
      // and returns counts, not arrays
      const stats = await this.enhanceCulturalManifoldGeometric();
      
      // Get the actual discoveries from state (set by enhanceCulturalManifoldGeometric)
      const discoveries = Array.isArray(this.state.discoveries) ? this.state.discoveries : [];
      
      // Extract all patterns from discoveries
      const allPatterns: string[] = [];
      for (const d of discoveries) {
        if (Array.isArray(d.patterns)) {
          allPatterns.push(...d.patterns);
        }
      }
      
      const response = {
        discoveries: discoveries.map(d => ({
          ...d,
          source: this.extractSource(d.url || '')
        })),
        patterns: Array.from(new Set(allPatterns)),
        entropyGained: stats.entropyGained
      };
      
      console.log(`[OceanDiscovery] discoverCulturalContext: ${response.discoveries.length} discoveries, ${response.patterns.length} patterns, ${response.entropyGained.toFixed(2)} bits`);
      
      return response;
    } catch (error) {
      console.error('[OceanDiscovery] discoverCulturalContext error:', error);
      return { discoveries: [], patterns: [], entropyGained: 0 };
    }
  }
  
  /**
   * Extract human-readable source from URL
   */
  private extractSource(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url.slice(0, 30);
    }
  }
  
  /**
   * Estimate 68D coordinates for a target address
   * 
   * Uses blockchain forensics + TPS trilateration to localize
   * the target in block universe spacetime
   */
  async estimateCoordinates(targetAddress: string): Promise<BlockUniverseMap> {
    // Use TPS to locate address in block universe
    // This uses the address string itself as initial content for cultural mapping
    const coords = this.tps.locateInBlockUniverse(
      targetAddress,
      `bitcoin:${targetAddress}`
    );
    
    // Store as current state reference
    if (this.state) {
      this.state.targetCoords = coords;
    }
    
    console.log(`[OceanDiscovery] Estimated coordinates for ${targetAddress.slice(0, 12)}...`);
    console.log(`  Era: ${coords.era || 'unknown'}`);
    console.log(`  Regime: ${coords.regime}`);
    console.log(`  Spacetime: t=${coords.spacetime.t.toFixed(0)}`);
    
    return coords;
  }
  
  /**
   * Search Bitcoin era for cultural patterns
   * 
   * Convenience method for targeted era search
   */
  async searchBitcoinEra(
    keywords: string[],
    era: BitcoinEra = 'pizza_era'
  ): Promise<GeometricDiscovery[]> {
    const query = {
      text: keywords.join(' ') + ` bitcoin ${era}`,
      maxResults: 10
    };
    const results = await this.searchAdapter.search(query);
    return results.map(r => ({
      content: r.content,
      url: r.url,
      coords: this.tps.locateInBlockUniverse(r.content, r.url),
      distance: 0,
      phi: 0.5,
      patterns: [],
      causalChain: [],
      entropyReduction: 0
    }));
  }
  
  /**
   * Deep crawl a URL for patterns
   */
  async crawlUrl(url: string): Promise<{
    content: string;
    patterns: string[];
    coords: BlockUniverseMap;
  }> {
    const contentMap = await this.searchAdapter.extractContent([url]);
    const content = contentMap.get(url) || '';
    const coords = this.tps.locateInBlockUniverse(content, url);
    
    // Extract patterns
    const words = content.toLowerCase().split(/\W+/).filter(w => w.length >= 4);
    const patterns = words.filter(w => 
      w.length <= 20 && 
      /^[a-z0-9]+$/i.test(w)
    ).slice(0, 100);
    
    return { content, patterns: Array.from(new Set(patterns)), coords };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PERSISTENCE & BASIN SYNC
  // ═══════════════════════════════════════════════════════════════════════════
  
  private static readonly DATA_FILE = path.join(process.cwd(), 'data', 'discovery-controller.json');
  
  /**
   * Save discovery state to disk
   */
  save(): void {
    try {
      const dir = path.dirname(OceanDiscoveryController.DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Also save sub-kernels
      this.quantum.save();
      
      if (!this.state) return;
      
      const discoveriesList = Array.isArray(this.state.discoveries) ? this.state.discoveries : [];
      const data = {
        version: '1.0.0',
        status: this.state.status,
        targetCoords: this.state.targetCoords,
        currentPosition: this.state.currentPosition,
        discoveryCount: discoveriesList.length,
        patternCount: discoveriesList.reduce((acc, d) => acc + (Array.isArray(d.patterns) ? d.patterns.length : 0), 0),
        possibilitySpace: this.state.possibilitySpace,
        savedAt: new Date().toISOString()
      };
      
      fs.writeFileSync(OceanDiscoveryController.DATA_FILE, JSON.stringify(data, null, 2));
      console.log('[OceanDiscovery] Saved discovery state');
    } catch (error) {
      console.error('[OceanDiscovery] Failed to save:', error);
    }
  }
  
  /**
   * Load discovery state from disk
   */
  load(): void {
    try {
      if (fs.existsSync(OceanDiscoveryController.DATA_FILE)) {
        const data = JSON.parse(fs.readFileSync(OceanDiscoveryController.DATA_FILE, 'utf-8'));
        
        if (data.possibilitySpace) {
          console.log(`[OceanDiscovery] Loaded prior state: ${data.discoveryCount} discoveries, ${data.patternCount} patterns`);
        }
      }
    } catch {
      console.log('[OceanDiscovery] Starting fresh');
    }
  }
  
  /**
   * Export ALL discovery data for QIG-pure basin sync
   * 
   * Aggregates data from TPS, Quantum Protocol, and Controller
   * Returns compact structure (<4KB) for efficient knowledge transfer
   */
  exportForBasinSync(): DiscoverySyncData {
    const quantumData = this.quantum.exportForBasinSync();
    const tpsData = this.tps.exportForBasinSync();
    const summary = this.getSummary();
    
    // Extract key patterns for transfer
    const discoveredPatterns = this.state?.discoveries
      .filter(d => d.phi > 0.6)
      .flatMap(d => d.patterns.slice(0, 5))
      .slice(0, 50) || [];
    
    // Extract 68D coordinate samples for Fisher coupling
    const coordinateSamples = this.state?.discoveries
      .filter(d => d.phi > 0.5)
      .map(d => ({
        cultural: d.coords.cultural.slice(0, 16),  // First 16 dims
        phi: d.phi,
        regime: d.coords.regime
      }))
      .slice(0, 10) || [];
    
    return {
      version: '1.0.0',
      
      // Quantum entropy state
      quantum: quantumData,
      
      // Spacetime navigation
      tps: tpsData,
      
      // Discovery results
      discovery: {
        status: summary.status,
        measurementCount: summary.measurements,
        discoveryCount: summary.discoveries,
        patternCount: summary.patterns,
        entropyReduced: summary.entropyReduced,
        possibilityRemaining: summary.possibilityRemaining
      },
      
      // Transferable knowledge
      patterns: discoveredPatterns,
      coordinateSamples,
      
      lastUpdated: new Date().toISOString()
    };
  }
  
  /**
   * Import basin sync data from peer
   * 
   * Uses Fisher-Rao distance to compute coupling strength
   * Only integrates knowledge that passes QIG purity checks
   */
  importFromBasinSync(data: DiscoverySyncData, couplingStrength: number): void {
    if (couplingStrength < 0.1) {
      console.log(`[OceanDiscovery] Basin sync rejected: coupling too low (${couplingStrength.toFixed(2)})`);
      return;
    }
    
    // Import quantum entropy data
    if (data.quantum) {
      this.quantum.importFromBasinSync(data.quantum, couplingStrength);
    }
    
    // Import TPS navigation data  
    if (data.tps) {
      this.tps.importFromBasinSync(data.tps, couplingStrength);
    }
    
    // Import patterns to vocabulary tracker with coupling-weighted phi
    for (const pattern of data.patterns || []) {
      const effectivePhi = 0.6 * couplingStrength;  // Scale by coupling
      vocabularyTracker.observe(
        pattern,
        effectivePhi,
        50,  // Default kappa
        'geometric',
        []  // No basin coords from remote
      );
    }
    
    console.log(`[OceanDiscovery] Basin sync complete: ${data.patterns?.length || 0} patterns imported (coupling=${couplingStrength.toFixed(2)})`);
    
    // Save updated state
    this.save();
  }
}

/**
 * Complete discovery sync data for basin transfer
 * 
 * Aggregates all kernel data into <4KB packet
 */
export interface DiscoverySyncData {
  version: string;
  
  // Quantum entropy state
  quantum: QuantumSyncData;
  
  // Spacetime navigation
  tps: TPSSyncData;
  
  // Discovery summary
  discovery: {
    status: string;
    measurementCount: number;
    discoveryCount: number;
    patternCount: number;
    entropyReduced: number;
    possibilityRemaining: number;
  };
  
  // Transferable knowledge
  patterns: string[];
  coordinateSamples: Array<{
    cultural: number[];
    phi: number;
    regime: string;
  }>;
  
  lastUpdated: string;
}

// Export singleton instance
export const oceanDiscoveryController = new OceanDiscoveryController();
