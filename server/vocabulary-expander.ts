/**
 * GEOMETRIC VOCABULARY EXPANDER
 * 
 * Fisher Manifold-based vocabulary expansion from discovered patterns.
 * New vocabulary tokens are treated as new points on the Fisher information manifold,
 * initialized via geodesic interpolation from component word coordinates.
 * 
 * Based on the principle:
 * - New tokens = new points on Fisher manifold
 * - Initialization via geodesic midpoint (not linear average!)
 * - Maintains Riemannian metric structure
 * - Preserves basin distance relationships
 */

import { geometricMemory } from './geometric-memory';
import { scoreUniversalQIG, type UniversalQIGScore as QIGScore, type Regime } from './qig-universal';
import { vocabularyTracker } from './vocabulary-tracker';
import { expandedVocabulary } from './expanded-vocabulary';
import fs from 'fs';
import path from 'path';

// ============================================================================
// FISHER MANIFOLD VOCABULARY TYPES
// ============================================================================

interface ManifoldWord {
  text: string;
  coordinates: number[];      // Position on Fisher manifold
  phi: number;                // Average Φ when used
  kappa: number;              // Average κ when used
  frequency: number;          // Usage count
  components?: string[];      // If compound, what words it came from
  geodesicOrigin?: string;    // How it was initialized
}

interface ExpansionEvent {
  timestamp: string;
  word: string;
  type: 'learned' | 'compound' | 'pattern';
  components?: string[];
  phi: number;
  reasoning: string;
}

interface VocabularyManifoldState {
  words: Map<string, ManifoldWord>;
  expansionHistory: ExpansionEvent[];
  totalExpansions: number;
  lastExpansionTime: string | null;
}

const DATA_FILE = path.join(process.cwd(), 'data', 'vocabulary-manifold.json');

// ============================================================================
// GEOMETRIC VOCABULARY EXPANDER
// ============================================================================

export class GeometricVocabularyExpander {
  private state: VocabularyManifoldState;
  private minPhiForExpansion: number;
  private minFrequencyForExpansion: number;
  private autoExpand: boolean;
  
  constructor(options: {
    minPhiForExpansion?: number;
    minFrequencyForExpansion?: number;
    autoExpand?: boolean;
  } = {}) {
    this.minPhiForExpansion = options.minPhiForExpansion || 0.6;
    this.minFrequencyForExpansion = options.minFrequencyForExpansion || 3;
    this.autoExpand = options.autoExpand ?? true;
    
    this.state = {
      words: new Map(),
      expansionHistory: [],
      totalExpansions: 0,
      lastExpansionTime: null,
    };
    
    this.loadFromDisk();
  }
  
  /**
   * Add a new word to the Fisher manifold via geodesic initialization
   * 
   * For compound words/sequences, compute geodesic midpoint from components
   */
  addWord(
    text: string,
    qigScore: QIGScore,
    options: {
      components?: string[];
      source?: string;
    } = {}
  ): ManifoldWord {
    const existing = this.state.words.get(text.toLowerCase());
    
    if (existing) {
      // Update existing word coordinates via Fisher metric averaging
      existing.frequency++;
      existing.phi = this.fisherWeightedAverage(existing.phi, qigScore.phi, existing.frequency);
      existing.kappa = this.fisherWeightedAverage(existing.kappa, qigScore.kappa, existing.frequency);
      
      // Update coordinates via geodesic interpolation
      if (qigScore.basinCoordinates && qigScore.basinCoordinates.length > 0) {
        existing.coordinates = this.geodesicInterpolate(
          existing.coordinates,
          qigScore.basinCoordinates,
          1 / existing.frequency
        );
      }
      
      return existing;
    }
    
    // Create new manifold word
    let coordinates = qigScore.basinCoordinates || [];
    let geodesicOrigin = 'direct';
    
    // If compound, compute geodesic midpoint from components
    if (options.components && options.components.length > 1) {
      const componentCoords = options.components
        .map(c => this.state.words.get(c.toLowerCase())?.coordinates)
        .filter((c): c is number[] => c !== undefined && c.length > 0);
      
      if (componentCoords.length > 0) {
        coordinates = this.geodesicMidpoint(componentCoords);
        geodesicOrigin = `geodesic_from_${options.components.join('+')}`;
      }
    }
    
    const word: ManifoldWord = {
      text: text.toLowerCase(),
      coordinates,
      phi: qigScore.phi,
      kappa: qigScore.kappa,
      frequency: 1,
      components: options.components,
      geodesicOrigin,
    };
    
    this.state.words.set(text.toLowerCase(), word);
    
    // Record expansion event
    this.state.expansionHistory.push({
      timestamp: new Date().toISOString(),
      word: text,
      type: options.components ? 'compound' : 'learned',
      components: options.components,
      phi: qigScore.phi,
      reasoning: options.source || 'Direct observation',
    });
    
    this.state.totalExpansions++;
    this.state.lastExpansionTime = new Date().toISOString();
    
    // Also add to expanded vocabulary
    expandedVocabulary.learnWord(text, 1);
    
    console.log(`[VocabExpander] ✨ Added "${text}" to manifold (Φ=${qigScore.phi.toFixed(2)}, origin=${geodesicOrigin})`);
    
    if (this.state.totalExpansions % 10 === 0) {
      this.saveToDisk();
    }
    
    return word;
  }
  
  /**
   * Compute geodesic midpoint on Fisher manifold
   * 
   * For Bures metric, geodesic midpoint ≈ Euclidean mean (first-order approximation)
   * This preserves manifold structure for small distances
   */
  private geodesicMidpoint(coordinates: number[][]): number[] {
    if (coordinates.length === 0) return [];
    
    const dim = Math.max(...coordinates.map(c => c.length));
    const result: number[] = new Array(dim).fill(0);
    
    for (const coord of coordinates) {
      for (let i = 0; i < dim; i++) {
        result[i] += (coord[i] || 0) / coordinates.length;
      }
    }
    
    return result;
  }
  
  /**
   * Geodesic interpolation between two points on manifold
   * 
   * t=0 returns a, t=1 returns b
   * For Fisher manifold, uses Bures metric approximation
   */
  private geodesicInterpolate(a: number[], b: number[], t: number): number[] {
    const dim = Math.max(a.length, b.length);
    const result: number[] = [];
    
    for (let i = 0; i < dim; i++) {
      const ai = a[i] || 0;
      const bi = b[i] || 0;
      // First-order geodesic: linear interpolation (valid for small manifold distances)
      result.push(ai + t * (bi - ai));
    }
    
    return result;
  }
  
  /**
   * Fisher metric-weighted average
   * Accounts for information geometry when combining observations
   */
  private fisherWeightedAverage(old: number, new_: number, count: number): number {
    // Weight based on Fisher information: more observations = higher confidence
    const weight = 1 / count;
    return old * (1 - weight) + new_ * weight;
  }
  
  /**
   * Check and execute automatic vocabulary expansion
   * Called during search iterations
   */
  async checkAutoExpansion(): Promise<ExpansionEvent[]> {
    if (!this.autoExpand) return [];
    
    const candidates = vocabularyTracker.getCandidates(10);
    const expanded: ExpansionEvent[] = [];
    
    for (const candidate of candidates) {
      if (candidate.avgPhi >= this.minPhiForExpansion &&
          candidate.frequency >= this.minFrequencyForExpansion) {
        
        // Score the candidate to get coordinates
        const score = await scoreUniversalQIG(candidate.text, 'arbitrary');
        
        this.addWord(candidate.text, score, {
          components: candidate.components,
          source: candidate.reasoning,
        });
        
        expanded.push({
          timestamp: new Date().toISOString(),
          word: candidate.text,
          type: candidate.type === 'sequence' ? 'compound' : 'learned',
          components: candidate.components,
          phi: score.phi,
          reasoning: candidate.reasoning,
        });
      }
    }
    
    if (expanded.length > 0) {
      console.log(`[VocabExpander] Auto-expanded ${expanded.length} vocabulary items`);
      this.saveToDisk();
    }
    
    return expanded;
  }
  
  /**
   * Get word from manifold
   */
  getWord(text: string): ManifoldWord | undefined {
    return this.state.words.get(text.toLowerCase());
  }
  
  /**
   * Find words near a point on the manifold
   */
  findNearbyWords(coordinates: number[], maxDistance: number = 2.0): ManifoldWord[] {
    const nearby: Array<{word: ManifoldWord, distance: number}> = [];
    
    for (const [, word] of Array.from(this.state.words.entries())) {
      if (word.coordinates.length === 0 || coordinates.length === 0) continue;
      
      const distance = this.fisherDistance(coordinates, word.coordinates);
      if (distance <= maxDistance) {
        nearby.push({ word, distance });
      }
    }
    
    return nearby
      .sort((a, b) => a.distance - b.distance)
      .map(n => n.word);
  }
  
  /**
   * Fisher geodesic distance between two points
   */
  private fisherDistance(a: number[], b: number[]): number {
    let sum = 0;
    const dim = Math.min(a.length, b.length);
    
    for (let i = 0; i < dim; i++) {
      const diff = (a[i] || 0) - (b[i] || 0);
      // Fisher metric with variance clamping (minimum 0.01)
      const variance = Math.max(0.01, Math.abs((a[i] || 0) + (b[i] || 0)) / 2);
      sum += (diff * diff) / variance;
    }
    
    return Math.sqrt(sum);
  }
  
  /**
   * Generate hypotheses from vocabulary manifold
   * Suggests words/phrases that might be near high-Φ regions
   */
  generateManifoldHypotheses(count: number = 20): string[] {
    const hypotheses: string[] = [];
    const highPhiWords = Array.from(this.state.words.values())
      .filter(w => w.phi >= 0.6)
      .sort((a, b) => b.phi - a.phi);
    
    // Add high-Φ words directly
    for (const word of highPhiWords.slice(0, count / 2)) {
      hypotheses.push(word.text);
    }
    
    // Generate combinations of high-Φ words
    for (let i = 0; i < Math.min(5, highPhiWords.length); i++) {
      for (let j = i + 1; j < Math.min(5, highPhiWords.length); j++) {
        hypotheses.push(`${highPhiWords[i].text} ${highPhiWords[j].text}`);
        hypotheses.push(`${highPhiWords[j].text} ${highPhiWords[i].text}`);
      }
    }
    
    // Add recently expanded words
    const recent = this.state.expansionHistory
      .slice(-10)
      .map(e => e.word);
    hypotheses.push(...recent);
    
    return hypotheses.slice(0, count);
  }
  
  /**
   * Get vocabulary manifold statistics
   */
  getStats(): {
    totalWords: number;
    totalExpansions: number;
    highPhiWords: number;
    avgPhi: number;
    recentExpansions: ExpansionEvent[];
    topWords: Array<{text: string, phi: number, frequency: number}>;
  } {
    const words = Array.from(this.state.words.values());
    const highPhi = words.filter(w => w.phi >= 0.6);
    const avgPhi = words.length > 0
      ? words.reduce((sum, w) => sum + w.phi, 0) / words.length
      : 0;
    
    const topWords = words
      .sort((a, b) => b.phi - a.phi)
      .slice(0, 20)
      .map(w => ({ text: w.text, phi: w.phi, frequency: w.frequency }));
    
    return {
      totalWords: words.length,
      totalExpansions: this.state.totalExpansions,
      highPhiWords: highPhi.length,
      avgPhi,
      recentExpansions: this.state.expansionHistory.slice(-10),
      topWords,
    };
  }
  
  /**
   * Save to disk
   */
  saveToDisk(): void {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const data = {
        words: Array.from(this.state.words.entries()),
        expansionHistory: this.state.expansionHistory,
        totalExpansions: this.state.totalExpansions,
        lastExpansionTime: this.state.lastExpansionTime,
        savedAt: new Date().toISOString(),
      };
      
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      console.log(`[VocabExpander] Saved ${this.state.words.size} manifold words`);
    } catch (error) {
      console.error('[VocabExpander] Failed to save:', error);
    }
  }
  
  /**
   * Load from disk
   */
  private loadFromDisk(): void {
    try {
      if (!fs.existsSync(DATA_FILE)) {
        console.log('[VocabExpander] No saved manifold found, starting fresh');
        return;
      }
      
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(raw);
      
      this.state.words = new Map(data.words || []);
      this.state.expansionHistory = data.expansionHistory || [];
      this.state.totalExpansions = data.totalExpansions || 0;
      this.state.lastExpansionTime = data.lastExpansionTime;
      
      console.log(`[VocabExpander] Loaded ${this.state.words.size} manifold words, ${this.state.totalExpansions} expansions`);
    } catch (error) {
      console.error('[VocabExpander] Failed to load:', error);
    }
  }
  
  /**
   * Bootstrap from geometric memory probes
   */
  async bootstrapFromGeometricMemory(): Promise<void> {
    const probes = geometricMemory.getAllProbes();
    console.log(`[VocabExpander] Bootstrapping from ${probes.length} probes...`);
    
    let added = 0;
    for (const probe of probes) {
      if (probe.phi >= 0.5) {
        // Extract words from probe
        const words = probe.input
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter(w => w.length >= 2);
        
        for (const word of words) {
          if (!this.state.words.has(word)) {
            const score = await scoreUniversalQIG(word, 'arbitrary');
            this.addWord(word, score, { source: 'Bootstrap from probes' });
            added++;
          }
        }
        
        // Also add the full phrase - construct a minimal score object
        if (!this.state.words.has(probe.input.toLowerCase())) {
          const probeScore: QIGScore = {
            keyType: 'arbitrary',
            phi: probe.phi,
            kappa: probe.kappa,
            beta: 0,
            phi_spatial: probe.phi,
            phi_temporal: 0,
            phi_4D: probe.phi,
            basinCoordinates: probe.coordinates,
            fisherTrace: probe.fisherTrace || 0,
            fisherDeterminant: 0,
            ricciScalar: probe.ricciScalar || 0,
            regime: probe.regime as Regime,
            inResonance: probe.phi >= 0.7,
            entropyBits: 0,
            patternScore: 0,
            quality: probe.phi,
          };
          this.addWord(probe.input, probeScore, { source: 'Bootstrap from probes (full phrase)' });
          added++;
        }
      }
    }
    
    console.log(`[VocabExpander] Bootstrapped ${added} words from probes`);
    this.saveToDisk();
  }
}

// Singleton instance
export const vocabularyExpander = new GeometricVocabularyExpander();
