/**
 * VOCABULARY FREQUENCY TRACKER
 * 
 * Tracks words and patterns from high-Φ discoveries for vocabulary expansion.
 * Implements continuous learning by observing successful search results.
 * 
 * Based on Fisher Manifold vocabulary learning principles:
 * - Track word frequencies from high-Φ results
 * - Identify emerging patterns (multi-word sequences)
 * - Recommend vocabulary expansions when threshold reached
 */

import { geometricMemory, type BasinProbe } from './geometric-memory';
import { expandedVocabulary } from './expanded-vocabulary';
import { vocabDecisionEngine, type WordContext } from './vocabulary-decision';
import fs from 'fs';
import path from 'path';

interface WordObservation {
  word: string;
  frequency: number;
  avgPhi: number;
  maxPhi: number;
  firstSeen: Date;
  lastSeen: Date;
  contexts: string[];  // Phrases where this word appeared
}

interface SequenceObservation {
  sequence: string;      // Multi-word sequence
  words: string[];
  frequency: number;
  avgPhi: number;
  maxPhi: number;
  efficiencyGain: number; // How much this reduces search space
}

export interface VocabularyCandidate {
  text: string;
  type: 'word' | 'sequence' | 'pattern';
  frequency: number;
  avgPhi: number;
  maxPhi: number;
  efficiencyGain: number;
  reasoning: string;
  components?: string[];
}

const DATA_FILE = path.join(process.cwd(), 'data', 'vocabulary-tracker.json');

export class VocabularyTracker {
  private wordObservations: Map<string, WordObservation>;
  private sequenceObservations: Map<string, SequenceObservation>;
  private minFrequency: number;
  private minPhi: number;
  private maxSequenceLength: number;
  
  constructor(options: {
    minFrequency?: number;
    minPhi?: number;
    maxSequenceLength?: number;
  } = {}) {
    this.wordObservations = new Map();
    this.sequenceObservations = new Map();
    this.minFrequency = options.minFrequency || 3;
    this.minPhi = options.minPhi || 0.35;  // Lowered from 0.5 to capture more learning data
    this.maxSequenceLength = options.maxSequenceLength || 5;
    
    this.loadFromDisk();
    
    // Bootstrap from existing geometric memory if we have no data
    if (this.wordObservations.size === 0) {
      setTimeout(() => this.bootstrapFromGeometricMemory(), 2000);
    }
  }
  
  /**
   * Observe a phrase from search results
   * Called when we find a high-Φ phrase
   * 
   * @param phrase The passphrase being observed
   * @param phi The Φ (integration) score
   * @param kappa Optional κ (curvature) score
   * @param regime Optional QIG regime
   * @param basinCoordinates Optional basin coordinates for geometric context
   */
  observe(
    phrase: string, 
    phi: number, 
    kappa?: number, 
    regime?: string, 
    basinCoordinates?: number[]
  ): void {
    if (phi < this.minPhi) return;
    
    const words = this.tokenize(phrase);
    const now = new Date();
    
    // Track individual words
    for (const word of words) {
      if (word.length < 2) continue;
      
      const existing = this.wordObservations.get(word);
      if (existing) {
        existing.frequency++;
        existing.avgPhi = (existing.avgPhi * (existing.frequency - 1) + phi) / existing.frequency;
        existing.maxPhi = Math.max(existing.maxPhi, phi);
        existing.lastSeen = now;
        if (!existing.contexts.includes(phrase) && existing.contexts.length < 10) {
          existing.contexts.push(phrase);
        }
      } else {
        this.wordObservations.set(word, {
          word,
          frequency: 1,
          avgPhi: phi,
          maxPhi: phi,
          firstSeen: now,
          lastSeen: now,
          contexts: [phrase],
        });
      }
      
      // Also record in vocabulary decision engine for 4-criteria geometric assessment
      const wordContext: WordContext = {
        word,
        phi,
        kappa: kappa || 50,
        regime: (regime as any) || 'geometric',
        basinCoordinates: basinCoordinates || [],
        timestamp: now.getTime(),
      };
      vocabDecisionEngine.observe(word, wordContext);
    }
    
    // Track multi-word sequences (n-grams)
    for (let length = 2; length <= Math.min(this.maxSequenceLength, words.length); length++) {
      for (let i = 0; i <= words.length - length; i++) {
        const seqWords = words.slice(i, i + length);
        const sequence = seqWords.join(' ');
        
        const existing = this.sequenceObservations.get(sequence);
        if (existing) {
          existing.frequency++;
          existing.avgPhi = (existing.avgPhi * (existing.frequency - 1) + phi) / existing.frequency;
          existing.maxPhi = Math.max(existing.maxPhi, phi);
          // Efficiency gain = frequency * (words saved by treating as single token)
          existing.efficiencyGain = existing.frequency * (seqWords.length - 1);
        } else {
          this.sequenceObservations.set(sequence, {
            sequence,
            words: seqWords,
            frequency: 1,
            avgPhi: phi,
            maxPhi: phi,
            efficiencyGain: 0,
          });
        }
      }
    }
    
    // Learn new words to vocabulary
    expandedVocabulary.learnWord(phrase, 1);
    for (const word of words) {
      expandedVocabulary.learnWord(word, 1);
    }
    
    // Periodic save
    if (this.wordObservations.size % 100 === 0) {
      this.saveToDisk();
    }
  }
  
  /**
   * Observe from geometric memory probes with full context
   */
  observeFromProbes(probes: BasinProbe[]): void {
    for (const probe of probes) {
      if (probe.phi >= this.minPhi) {
        // Pass full geometric context from probe
        this.observe(
          probe.input, 
          probe.phi, 
          probe.kappa,
          probe.regime,
          probe.coordinates
        );
      }
    }
  }
  
  /**
   * Tokenize phrase into words
   */
  private tokenize(phrase: string): string[] {
    return phrase
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0);
  }
  
  /**
   * Get vocabulary expansion candidates
   */
  getCandidates(topK: number = 20): VocabularyCandidate[] {
    const candidates: VocabularyCandidate[] = [];
    
    // New words (not in base vocabulary) with high frequency and Φ
    for (const [word, obs] of Array.from(this.wordObservations.entries())) {
      if (obs.frequency >= this.minFrequency && 
          obs.avgPhi >= this.minPhi &&
          !expandedVocabulary.hasWord(word)) {
        candidates.push({
          text: word,
          type: 'word',
          frequency: obs.frequency,
          avgPhi: obs.avgPhi,
          maxPhi: obs.maxPhi,
          efficiencyGain: obs.frequency,
          reasoning: `New word discovered in ${obs.frequency} high-Φ phrases (avg Φ=${obs.avgPhi.toFixed(2)})`,
        });
      }
    }
    
    // Multi-word sequences with high efficiency gain
    for (const [_seq, obs] of Array.from(this.sequenceObservations.entries())) {
      if (obs.frequency >= this.minFrequency && 
          obs.avgPhi >= this.minPhi &&
          obs.efficiencyGain > 5) {
        candidates.push({
          text: obs.sequence,
          type: 'sequence',
          frequency: obs.frequency,
          avgPhi: obs.avgPhi,
          maxPhi: obs.maxPhi,
          efficiencyGain: obs.efficiencyGain,
          reasoning: `Sequence "${obs.sequence}" appears ${obs.frequency}x with avg Φ=${obs.avgPhi.toFixed(2)}. Efficiency gain: ${obs.efficiencyGain}`,
          components: obs.words,
        });
      }
    }
    
    // Sort by combined score (efficiency + Φ)
    candidates.sort((a, b) => {
      const scoreA = a.efficiencyGain * a.avgPhi;
      const scoreB = b.efficiencyGain * b.avgPhi;
      return scoreB - scoreA;
    });
    
    return candidates.slice(0, topK);
  }
  
  /**
   * Get statistics
   */
  getStats(): {
    totalWords: number;
    totalSequences: number;
    topWords: Array<{word: string, frequency: number, avgPhi: number}>;
    topSequences: Array<{sequence: string, frequency: number, avgPhi: number}>;
    candidatesReady: number;
  } {
    const topWords = Array.from(this.wordObservations.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20)
      .map(o => ({ word: o.word, frequency: o.frequency, avgPhi: o.avgPhi }));
    
    const topSequences = Array.from(this.sequenceObservations.values())
      .sort((a, b) => b.efficiencyGain - a.efficiencyGain)
      .slice(0, 20)
      .map(o => ({ sequence: o.sequence, frequency: o.frequency, avgPhi: o.avgPhi }));
    
    return {
      totalWords: this.wordObservations.size,
      totalSequences: this.sequenceObservations.size,
      topWords,
      topSequences,
      candidatesReady: this.getCandidates(100).length,
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
        words: Array.from(this.wordObservations.entries()).map(([_k, v]) => ({
          ...v,
          firstSeen: v.firstSeen.toISOString(),
          lastSeen: v.lastSeen.toISOString(),
        })),
        sequences: Array.from(this.sequenceObservations.entries()).map(([_k, v]) => v),
        savedAt: new Date().toISOString(),
      };
      
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      console.log(`[VocabularyTracker] Saved ${this.wordObservations.size} words, ${this.sequenceObservations.size} sequences`);
    } catch (error) {
      console.error('[VocabularyTracker] Failed to save:', error);
    }
  }
  
  /**
   * Load from disk
   */
  private loadFromDisk(): void {
    try {
      if (!fs.existsSync(DATA_FILE)) {
        console.log('[VocabularyTracker] No saved data found, starting fresh');
        return;
      }
      
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(raw);
      
      for (const w of (data.words || [])) {
        this.wordObservations.set(w.word, {
          ...w,
          firstSeen: new Date(w.firstSeen),
          lastSeen: new Date(w.lastSeen),
        });
      }
      
      for (const s of (data.sequences || [])) {
        this.sequenceObservations.set(s.sequence, s);
      }
      
      console.log(`[VocabularyTracker] Loaded ${this.wordObservations.size} words, ${this.sequenceObservations.size} sequences`);
    } catch (error) {
      console.error('[VocabularyTracker] Failed to load:', error);
    }
  }
  
  /**
   * Bootstrap from geometric memory
   */
  bootstrapFromGeometricMemory(): void {
    const probes = geometricMemory.getAllProbes();
    console.log(`[VocabularyTracker] Bootstrapping from ${probes.length} geometric memory probes...`);
    
    let observed = 0;
    for (const probe of probes) {
      if (probe.phi >= this.minPhi) {
        this.observe(probe.input, probe.phi);
        observed++;
      }
    }
    
    console.log(`[VocabularyTracker] Observed ${observed} high-Φ probes`);
    this.saveToDisk();
  }
}

// Singleton instance
export const vocabularyTracker = new VocabularyTracker();
