/**
 * OCEAN CONTINUOUS LEARNER
 * 
 * Cross-session vocabulary learning and pattern expansion.
 * Enables Ocean to learn from high-Φ discoveries and generate variants.
 * 
 * KEY INSIGHT: The passphrase likely contains high-Φ words we've already seen.
 * By learning and expanding successful patterns, we dramatically increase coverage.
 * 
 * PRINCIPLE: Every high-Φ measurement is geometric information about the manifold.
 * Words with Φ > 0.7 are signals - they deserve expansion and exploration.
 */

import { oceanPersistence } from './ocean/ocean-persistence';
import { geometricMemory } from './geometric-memory';
import { expandedVocabulary } from './expanded-vocabulary';

export interface LearnedPattern {
  pattern: string;
  phi: number;
  kappa: number;
  regime: string;
  frequency: number;           // How many times we've seen this pattern
  lastSeen: number;             // Timestamp
  source: 'discovered' | 'generated' | 'expanded';
  variants: string[];           // Expanded variants of this pattern
  generatedAt: string;
}

export interface ExpansionStrategy {
  name: string;
  generator: (word: string) => string[];
  priority: number;
}

export class OceanContinuousLearner {
  private vocabulary = new Map<string, LearnedPattern>();
  private loadedFromDb = false;
  private readonly PHI_LEARNING_THRESHOLD = 0.7;  // Learn words with Φ ≥ 0.7
  private readonly MAX_VOCABULARY_SIZE = 50000;    // Prevent unbounded growth
  private readonly LEVENSHTEIN_DISTANCE = 2;       // Max edit distance for typo variants
  
  constructor() {
    console.log('[OceanContinuousLearner] Initialized continuous learning system');
  }
  
  /**
   * Load learned vocabulary from PostgreSQL
   * Call this during Ocean initialization
   */
  async loadVocabulary(): Promise<void> {
    if (this.loadedFromDb) {
      console.log('[OceanContinuousLearner] Vocabulary already loaded');
      return;
    }
    
    try {
      if (!oceanPersistence.isPersistenceAvailable()) {
        console.log('[OceanContinuousLearner] PostgreSQL not available - using memory-only mode');
        this.loadedFromDb = true;
        return;
      }
      
      // Load high-Φ probes from geometric memory (already hydrated from PostgreSQL)
      await geometricMemory.waitForLoad();
      const highPhiProbes = geometricMemory.getResonanceRegions(this.PHI_LEARNING_THRESHOLD);
      
      console.log(`[OceanContinuousLearner] Loading ${highPhiProbes.length} high-Φ patterns from geometric memory...`);
      
      for (const probe of highPhiProbes) {
        // Learn the pattern if we haven't seen it
        if (!this.vocabulary.has(probe.input)) {
          this.vocabulary.set(probe.input, {
            pattern: probe.input,
            phi: probe.phi,
            kappa: probe.kappa,
            regime: probe.regime,
            frequency: 1,
            lastSeen: new Date(probe.timestamp).getTime(),
            source: 'discovered',
            variants: [],
            generatedAt: probe.timestamp,
          });
        }
      }
      
      this.loadedFromDb = true;
      console.log(`[OceanContinuousLearner] Loaded ${this.vocabulary.size} learned patterns from geometric memory`);
    } catch (error) {
      console.error('[OceanContinuousLearner] Failed to load vocabulary:', error);
      this.loadedFromDb = true; // Mark as loaded even on error to avoid blocking
    }
  }
  
  /**
   * Learn a new pattern from Ocean's discoveries
   * Called when Ocean tests a hypothesis with high Φ
   */
  async learnPattern(
    pattern: string,
    phi: number,
    kappa: number,
    regime: string
  ): Promise<boolean> {
    // Only learn high-Φ patterns
    if (phi < this.PHI_LEARNING_THRESHOLD) {
      return false;
    }
    
    const existing = this.vocabulary.get(pattern);
    
    if (existing) {
      // Update existing pattern
      existing.frequency++;
      existing.lastSeen = Date.now();
      existing.phi = Math.max(existing.phi, phi); // Keep highest Φ seen
      console.log(`[OceanContinuousLearner] Updated pattern "${pattern}" (Φ=${phi.toFixed(3)}, freq=${existing.frequency})`);
    } else {
      // Learn new pattern
      if (this.vocabulary.size >= this.MAX_VOCABULARY_SIZE) {
        console.warn(`[OceanContinuousLearner] Vocabulary at max size (${this.MAX_VOCABULARY_SIZE}), not learning new pattern`);
        return false;
      }
      
      const learned: LearnedPattern = {
        pattern,
        phi,
        kappa,
        regime,
        frequency: 1,
        lastSeen: Date.now(),
        source: 'discovered',
        variants: [],
        generatedAt: new Date().toISOString(),
      };
      
      this.vocabulary.set(pattern, learned);
      console.log(`[OceanContinuousLearner] 🎓 Learned new pattern: "${pattern}" (Φ=${phi.toFixed(3)})`);
      
      // Auto-expand high-value patterns (Φ ≥ 0.85)
      if (phi >= 0.85) {
        await this.expandPattern(pattern);
      }
    }
    
    return true;
  }
  
  /**
   * Generate variants of a learned pattern
   * Uses multiple expansion strategies for comprehensive coverage
   */
  async expandPattern(pattern: string): Promise<string[]> {
    const variants = new Set<string>();
    
    // Strategy 1: Levenshtein distance (typos)
    const typoVariants = this.generateTypoVariants(pattern);
    typoVariants.forEach(v => variants.add(v));
    
    // Strategy 2: Common suffixes
    const suffixVariants = this.generateSuffixVariants(pattern);
    suffixVariants.forEach(v => variants.add(v));
    
    // Strategy 3: Plurals and variants
    const pluralVariants = this.generatePluralVariants(pattern);
    pluralVariants.forEach(v => variants.add(v));
    
    // Strategy 4: Crypto patterns
    const cryptoVariants = this.generateCryptoVariants(pattern);
    cryptoVariants.forEach(v => variants.add(v));
    
    // Strategy 5: Era-specific (2009, 2010, etc.)
    const eraVariants = this.generateEraVariants(pattern);
    eraVariants.forEach(v => variants.add(v));
    
    const variantArray = Array.from(variants).filter(v => v !== pattern);
    
    // Store expanded variants
    const learned = this.vocabulary.get(pattern);
    if (learned) {
      learned.variants = variantArray;
    }
    
    // Add expanded variants to vocabulary as generated patterns
    for (const variant of variantArray) {
      if (!this.vocabulary.has(variant) && this.vocabulary.size < this.MAX_VOCABULARY_SIZE) {
        this.vocabulary.set(variant, {
          pattern: variant,
          phi: learned?.phi || 0,
          kappa: learned?.kappa || 64,
          regime: learned?.regime || 'geometric',
          frequency: 0,
          lastSeen: Date.now(),
          source: 'expanded',
          variants: [],
          generatedAt: new Date().toISOString(),
        });
      }
    }
    
    // Also add to expanded vocabulary system
    expandedVocabulary.recordHighPhiWord(pattern, learned?.phi || 0);
    
    console.log(`[OceanContinuousLearner] 🌟 Expanded "${pattern}" → ${variantArray.length} variants`);
    
    return variantArray;
  }
  
  /**
   * Generate typo variants using Levenshtein distance
   * Examples: "satoshi" → "satosni", "sato shi", "satoshii"
   */
  private generateTypoVariants(word: string): string[] {
    const variants: string[] = [];
    const chars = word.split('');
    
    // Single character substitutions
    for (let i = 0; i < chars.length; i++) {
      const nearby = this.getNearbyKeys(chars[i]);
      for (const char of nearby) {
        const variant = chars.slice(0, i).join('') + char + chars.slice(i + 1).join('');
        if (variant !== word) variants.push(variant);
      }
    }
    
    // Single character deletions
    for (let i = 0; i < chars.length; i++) {
      const variant = chars.slice(0, i).join('') + chars.slice(i + 1).join('');
      if (variant.length > 2) variants.push(variant);
    }
    
    // Single character insertions (common typos)
    for (let i = 0; i <= chars.length; i++) {
      const nearby = i > 0 ? this.getNearbyKeys(chars[i - 1]) : ['a', 'e', 'i', 'o', 'u'];
      for (const char of nearby.slice(0, 3)) {
        const variant = chars.slice(0, i).join('') + char + chars.slice(i).join('');
        variants.push(variant);
      }
    }
    
    // Character transpositions (swap adjacent)
    for (let i = 0; i < chars.length - 1; i++) {
      const swapped = [...chars];
      [swapped[i], swapped[i + 1]] = [swapped[i + 1], swapped[i]];
      variants.push(swapped.join(''));
    }
    
    return variants.slice(0, 30); // Limit to 30 typo variants
  }
  
  /**
   * Get nearby keyboard keys for typo generation
   */
  private getNearbyKeys(char: string): string[] {
    const keyboard: Record<string, string[]> = {
      'a': ['q', 'w', 's', 'z'],
      's': ['a', 'w', 'e', 'd', 'x', 'z'],
      'd': ['s', 'e', 'r', 'f', 'c', 'x'],
      'f': ['d', 'r', 't', 'g', 'v', 'c'],
      'g': ['f', 't', 'y', 'h', 'b', 'v'],
      'h': ['g', 'y', 'u', 'j', 'n', 'b'],
      'j': ['h', 'u', 'i', 'k', 'm', 'n'],
      'k': ['j', 'i', 'o', 'l', 'm'],
      'l': ['k', 'o', 'p'],
      // Add more as needed
    };
    return keyboard[char.toLowerCase()] || [char];
  }
  
  /**
   * Generate suffix variants
   * Examples: "bitcoin" → "bitcoin123", "bitcoin!", "bitcoin2009"
   */
  private generateSuffixVariants(word: string): string[] {
    const suffixes = [
      '123', '1', '2009', '2010', '!', '_', '2011',
      'btc', '2008', '0', '01', '42', '64', '2012'
    ];
    return suffixes.map(s => word + s);
  }
  
  /**
   * Generate plural and variant forms
   * Examples: "bitcoin" → "bitcoins", "bitcom"
   */
  private generatePluralVariants(word: string): string[] {
    const variants: string[] = [];
    
    // Plurals
    if (!word.endsWith('s')) {
      variants.push(word + 's');
    }
    
    // Remove last character (common typo fix)
    if (word.length > 3) {
      variants.push(word.slice(0, -1));
    }
    
    // Double last letter
    if (word.length > 2) {
      variants.push(word + word[word.length - 1]);
    }
    
    return variants;
  }
  
  /**
   * Generate crypto-specific variants
   * Examples: "bitcoin" → "mybitcoin", "bitcoinBTC", "bitcoinwallet"
   */
  private generateCryptoVariants(word: string): string[] {
    const prefixes = ['my', 'our', 'the', ''];
    const suffixes = ['BTC', 'wallet', 'key', 'pass', 'secret', 'crypto'];
    const variants: string[] = [];
    
    for (const prefix of prefixes) {
      for (const suffix of suffixes) {
        if (prefix || suffix) {
          variants.push(prefix + word + suffix);
        }
      }
    }
    
    return variants;
  }
  
  /**
   * Generate era-specific variants
   * Examples: "satoshi" → "satoshi2009", "satoshi2010"
   */
  private generateEraVariants(word: string): string[] {
    const years = ['2008', '2009', '2010', '2011', '2012'];
    return years.map(y => word + y);
  }
  
  /**
   * Get all learned patterns (for testing/debugging)
   */
  getLearnedPatterns(): LearnedPattern[] {
    return Array.from(this.vocabulary.values())
      .sort((a, b) => b.phi - a.phi);
  }
  
  /**
   * Get patterns for exploration
   * Returns high-Φ patterns and their variants that haven't been tested recently
   */
  getPatternsForExploration(limit: number = 100): string[] {
    const patterns: string[] = [];
    const learned = this.getLearnedPatterns();
    
    // Prioritize by Φ score
    for (const pattern of learned) {
      patterns.push(pattern.pattern);
      // Add variants that haven't been tested
      patterns.push(...pattern.variants);
      
      if (patterns.length >= limit) break;
    }
    
    return patterns.slice(0, limit);
  }
  
  /**
   * Get statistics about learned vocabulary
   */
  getStats(): {
    totalPatterns: number;
    discoveredPatterns: number;
    expandedPatterns: number;
    avgPhi: number;
    topPatterns: Array<{ pattern: string; phi: number; frequency: number }>;
  } {
    const all = Array.from(this.vocabulary.values());
    const discovered = all.filter(p => p.source === 'discovered');
    const expanded = all.filter(p => p.source === 'expanded' || p.source === 'generated');
    
    const avgPhi = all.length > 0
      ? all.reduce((sum, p) => sum + p.phi, 0) / all.length
      : 0;
    
    const topPatterns = all
      .sort((a, b) => b.phi - a.phi)
      .slice(0, 10)
      .map(p => ({
        pattern: p.pattern,
        phi: p.phi,
        frequency: p.frequency,
      }));
    
    return {
      totalPatterns: all.length,
      discoveredPatterns: discovered.length,
      expandedPatterns: expanded.length,
      avgPhi,
      topPatterns,
    };
  }
  
  /**
   * Clear learned vocabulary (for testing or reset)
   */
  clear(): void {
    this.vocabulary.clear();
    console.log('[OceanContinuousLearner] Cleared learned vocabulary');
  }
}

// Singleton instance
export const oceanContinuousLearner = new OceanContinuousLearner();
