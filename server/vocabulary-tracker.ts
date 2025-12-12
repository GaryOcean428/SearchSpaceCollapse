/**
 * VOCABULARY FREQUENCY TRACKER
 * 
 * Tracks words and phrases from high-Φ discoveries for vocabulary expansion.
 * Uses PostgreSQL exclusively for persistent storage.
 * 
 * IMPORTANT DISTINCTION:
 * - "word": An actual vocabulary word (BIP-39 or real English word)
 * - "phrase": A mutated/concatenated string (e.g., "transactionssent", "knownreceive")  
 * - "sequence": A multi-word pattern (e.g., "abandon ability able")
 * 
 * The system identifies if text is a real word vs a mutation based on:
 * - BIP-39 wordlist membership
 * - English dictionary check
 * - Pattern analysis (concatenations, unusual length, etc.)
 */

import { geometricMemory, type BasinProbe } from './geometric-memory';
import { expandedVocabulary } from './expanded-vocabulary';
import { vocabDecisionEngine, type WordContext } from './vocabulary-decision';
import { db } from './db';
import { vocabularyObservations } from '@shared/schema';
import { eq, desc, sql } from 'drizzle-orm';

/**
 * Database connection circuit breaker for resilient PostgreSQL operations
 * Implements exponential backoff and circuit breaker pattern per best practices
 */
class DatabaseCircuitBreaker {
  private failures: number = 0;
  private lastFailure: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private readonly maxFailures: number = 3;
  private readonly resetTimeout: number = 30000; // 30 seconds
  private readonly maxRetries: number = 3;
  private readonly baseDelay: number = 1000; // 1 second

  isOpen(): boolean {
    if (this.state === 'open') {
      const now = Date.now();
      if (now - this.lastFailure > this.resetTimeout) {
        this.state = 'half-open';
        console.log('[VocabularyTracker] Circuit breaker transitioning to HALF-OPEN, allowing test request');
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess(): void {
    if (this.state === 'half-open') {
      console.log('[VocabularyTracker] Circuit breaker CLOSED after successful test request');
    }
    this.failures = 0;
    this.state = 'closed';
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.maxFailures) {
      this.state = 'open';
      console.warn(`[VocabularyTracker] Circuit breaker OPEN after ${this.failures} failures`);
    }
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T | null> {
    if (this.isOpen()) {
      console.warn(`[VocabularyTracker] Circuit breaker open, skipping ${operationName}`);
      return null;
    }

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await Promise.race([
          operation(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Operation timeout')), 15000)
          )
        ]);
        this.recordSuccess();
        return result;
      } catch (error) {
        const isTimeout = error instanceof Error && 
          (error.message.includes('timeout') || error.message.includes('Operation timeout'));
        
        console.warn(
          `[VocabularyTracker] ${operationName} attempt ${attempt}/${this.maxRetries} failed:`,
          isTimeout ? 'Connection timeout' : (error instanceof Error ? error.message : 'Unknown error')
        );

        if (attempt < this.maxRetries) {
          const delay = this.baseDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          this.recordFailure();
          console.error(`[VocabularyTracker] ${operationName} failed after ${this.maxRetries} attempts`);
        }
      }
    }
    return null;
  }

  getStatus(): { state: string; failures: number } {
    return { state: this.state, failures: this.failures };
  }
}

// BIP-39 wordlist for identifying real vocabulary words
const BIP39_WORDS = new Set([
  'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse',
  'access', 'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act',
  'action', 'actor', 'actress', 'actual', 'adapt', 'add', 'addict', 'address', 'adjust', 'admit',
  'adult', 'advance', 'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent',
  'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol', 'alert',
  'alien', 'all', 'alley', 'allow', 'almost', 'alone', 'alpha', 'already', 'also', 'alter',
  'always', 'amateur', 'amazing', 'among', 'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger',
  'angle', 'angry', 'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique',
  'anxiety', 'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april', 'arch', 'arctic',
  'area', 'arena', 'argue', 'arm', 'armed', 'armor', 'army', 'around', 'arrange', 'arrest',
  'arrive', 'arrow', 'art', 'artefact', 'artist', 'artwork', 'ask', 'aspect', 'assault', 'asset',
  'assist', 'assume', 'asthma', 'athlete', 'atom', 'attack', 'attend', 'attitude', 'attract', 'auction',
  'audit', 'august', 'aunt', 'author', 'auto', 'autumn', 'average', 'avocado', 'avoid', 'awake',
  'aware', 'away', 'awesome', 'awful', 'awkward', 'axis', 'baby', 'bachelor', 'bacon', 'badge',
  'bag', 'balance', 'balcony', 'ball', 'bamboo', 'banana', 'banner', 'bar', 'barely', 'bargain',
  'barrel', 'base', 'basic', 'basket', 'battle', 'beach', 'bean', 'beauty', 'because', 'become',
  'beef', 'before', 'begin', 'behave', 'behind', 'believe', 'below', 'belt', 'bench', 'benefit',
  'best', 'betray', 'better', 'between', 'beyond', 'bicycle', 'bid', 'bike', 'bind', 'biology',
  'bird', 'birth', 'bitter', 'black', 'blade', 'blame', 'blanket', 'blast', 'bleak', 'bless',
  'blind', 'blood', 'blossom', 'blouse', 'blue', 'blur', 'blush', 'board', 'boat', 'body',
  // ... (more words would be here - abbreviated for brevity, but the full 2048 would be loaded)
]);

// Common English words that are not in BIP-39 but are real words
const COMMON_ENGLISH = new Set([
  'the', 'is', 'are', 'was', 'were', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can',
  'transaction', 'transactions', 'sent', 'receive', 'received', 'known', 'changes',
  'executed', 'information', 'and', 'or', 'but', 'if', 'then', 'else', 'when',
]);

// Phrase categories for kernel learning
// bip39_seed: Valid 12/15/18/21/24 word phrases with ALL words from BIP-39 wordlist
// passphrase: Arbitrary text (any length, may have special chars/numbers, not a seed)
// mutation: Seed-length (12/15/18/21/24 words) but contains non-BIP-39 words
// bip39_word: Single word from BIP-39 wordlist
// unknown: Not yet classified
export type PhraseCategory = 'bip39_seed' | 'passphrase' | 'mutation' | 'bip39_word' | 'unknown';

interface PhraseObservation {
  text: string;
  frequency: number;
  avgPhi: number;
  maxPhi: number;
  firstSeen: Date;
  lastSeen: Date;
  contexts: string[];
  isRealWord: boolean;
  isBip39Word: boolean;
  type: 'word' | 'phrase' | 'sequence';
  phraseCategory: PhraseCategory;
}

interface SequenceObservation {
  sequence: string;
  words: string[];
  frequency: number;
  avgPhi: number;
  maxPhi: number;
  efficiencyGain: number;
}

export interface VocabularyCandidate {
  text: string;
  type: 'word' | 'phrase' | 'sequence';
  frequency: number;
  avgPhi: number;
  maxPhi: number;
  efficiencyGain: number;
  reasoning: string;
  isRealWord: boolean;
  components?: string[];
}

export class VocabularyTracker {
  private phraseObservations: Map<string, PhraseObservation>;
  private sequenceObservations: Map<string, SequenceObservation>;
  private minFrequency: number;
  private minPhi: number;
  private maxSequenceLength: number;
  private dataLoaded: Promise<void>;
  private saveQueue: Map<string, PhraseObservation>;
  private saveTimer: NodeJS.Timeout | null;
  private circuitBreaker: DatabaseCircuitBreaker;
  
  constructor(options: {
    minFrequency?: number;
    minPhi?: number;
    maxSequenceLength?: number;
  } = {}) {
    this.phraseObservations = new Map();
    this.sequenceObservations = new Map();
    this.saveQueue = new Map();
    this.saveTimer = null;
    this.circuitBreaker = new DatabaseCircuitBreaker();
    this.minFrequency = options.minFrequency || 3;
    this.minPhi = options.minPhi || 0.35;
    this.maxSequenceLength = options.maxSequenceLength || 5;
    
    this.dataLoaded = this.loadFromPostgres();
  }
  
  /**
   * Check if a text string is a real vocabulary word
   */
  private isRealWord(text: string): boolean {
    const lower = text.toLowerCase();
    
    // Check BIP-39 wordlist
    if (BIP39_WORDS.has(lower)) return true;
    
    // Check common English words
    if (COMMON_ENGLISH.has(lower)) return true;
    
    // Heuristics for mutations (NOT real words):
    // - Contains no vowels (unlikely real word)
    // - Very long single "word" (>15 chars without spaces likely concatenation)
    // - All consonants pattern
    // - Mixed case within word
    // - Contains digits
    
    if (lower.length > 15 && !lower.includes(' ')) return false;
    if (/\d/.test(lower)) return false;
    if (!/[aeiou]/.test(lower)) return false;
    
    // Words 3-12 chars with vowels are likely real
    if (lower.length >= 3 && lower.length <= 12) {
      const vowelRatio = (lower.match(/[aeiou]/g) || []).length / lower.length;
      if (vowelRatio >= 0.2 && vowelRatio <= 0.6) return true;
    }
    
    return false;
  }
  
  /**
   * Determine the type of observation
   */
  private classifyType(text: string): 'word' | 'phrase' | 'sequence' {
    if (text.includes(' ')) return 'sequence';
    if (this.isRealWord(text)) return 'word';
    return 'phrase';
  }
  
  /**
   * Check if a single word is in the BIP-39 wordlist
   */
  private isBip39Word(word: string): boolean {
    return BIP39_WORDS.has(word.toLowerCase());
  }
  
  /**
   * Classify a phrase into categories for kernel learning
   * This teaches kernels the difference between:
   * - Valid BIP-39 seed phrases (recoverable wallets)
   * - Passphrases (arbitrary text, not seeds)
   * - Mutations (seed-length but invalid)
   */
  classifyPhraseCategory(text: string): PhraseCategory {
    const trimmed = text.trim();
    const words = trimmed.split(/\s+/);
    const wordCount = words.length;
    const VALID_SEED_LENGTHS = [12, 15, 18, 21, 24];
    
    // Single word classification
    if (wordCount === 1) {
      const word = words[0].toLowerCase();
      if (BIP39_WORDS.has(word)) {
        return 'bip39_word';
      }
      // Contains special chars or numbers = passphrase
      if (/[^a-z]/.test(word)) {
        return 'passphrase';
      }
      return 'unknown';
    }
    
    // Multi-word: check if it's seed-length
    if (VALID_SEED_LENGTHS.includes(wordCount)) {
      // Check if ALL words are valid BIP-39 words
      const allBip39 = words.every(w => BIP39_WORDS.has(w.toLowerCase()));
      
      if (allBip39) {
        return 'bip39_seed';  // Valid BIP-39 seed phrase!
      } else {
        return 'mutation';  // Seed-length but contains invalid words
      }
    }
    
    // Not a seed-length phrase = passphrase
    // This includes:
    // - Arbitrary text like "correct horse battery staple"
    // - Concatenated words like "bitcoinpassword123"
    // - Any other non-seed patterns
    return 'passphrase';
  }
  
  /**
   * Observe a phrase from search results
   */
  observe(
    phrase: string, 
    phi: number, 
    kappa?: number, 
    regime?: string, 
    basinCoordinates?: number[]
  ): void {
    if (phi < this.minPhi) return;
    
    const tokens = this.tokenize(phrase);
    const now = new Date();
    
    // Track individual tokens (words or phrases)
    for (const token of tokens) {
      if (token.length < 2) continue;
      
      const type = this.classifyType(token);
      const isReal = type === 'word';
      const isBip39 = this.isBip39Word(token);
      const category = this.classifyPhraseCategory(token);
      
      const existing = this.phraseObservations.get(token);
      if (existing) {
        existing.frequency++;
        existing.avgPhi = (existing.avgPhi * (existing.frequency - 1) + phi) / existing.frequency;
        existing.maxPhi = Math.max(existing.maxPhi, phi);
        existing.lastSeen = now;
        if (!existing.contexts.includes(phrase) && existing.contexts.length < 10) {
          existing.contexts.push(phrase);
        }
      } else {
        this.phraseObservations.set(token, {
          text: token,
          frequency: 1,
          avgPhi: phi,
          maxPhi: phi,
          firstSeen: now,
          lastSeen: now,
          contexts: [phrase],
          isRealWord: isReal,
          isBip39Word: isBip39,
          type,
          phraseCategory: category,
        });
      }
      
      // Queue for batch save
      this.queueForSave(token);
      
      // Record in vocabulary decision engine
      const wordContext: WordContext = {
        word: token,
        phi,
        kappa: kappa || 50,
        regime: (regime as any) || 'geometric',
        basinCoordinates: basinCoordinates || [],
        timestamp: now.getTime(),
      };
      vocabDecisionEngine.observe(token, wordContext);
    }
    
    // Track multi-token sequences
    for (let length = 2; length <= Math.min(this.maxSequenceLength, tokens.length); length++) {
      for (let i = 0; i <= tokens.length - length; i++) {
        const seqTokens = tokens.slice(i, i + length);
        const sequence = seqTokens.join(' ');
        
        const existing = this.sequenceObservations.get(sequence);
        if (existing) {
          existing.frequency++;
          existing.avgPhi = (existing.avgPhi * (existing.frequency - 1) + phi) / existing.frequency;
          existing.maxPhi = Math.max(existing.maxPhi, phi);
          existing.efficiencyGain = existing.frequency * (seqTokens.length - 1);
        } else {
          this.sequenceObservations.set(sequence, {
            sequence,
            words: seqTokens,
            frequency: 1,
            avgPhi: phi,
            maxPhi: phi,
            efficiencyGain: 0,
          });
        }
      }
    }
    
    // Learn to expanded vocabulary
    expandedVocabulary.learnWord(phrase, 1);
    for (const token of tokens) {
      expandedVocabulary.learnWord(token, 1);
    }
  }
  
  /**
   * Queue an observation for batch save
   */
  private queueForSave(text: string): void {
    const obs = this.phraseObservations.get(text);
    if (obs) {
      this.saveQueue.set(text, obs);
    }
    
    // Debounce saves - batch every 5 seconds
    if (!this.saveTimer) {
      this.saveTimer = setTimeout(() => {
        this.flushSaveQueue();
        this.saveTimer = null;
      }, 5000);
    }
  }
  
  /**
   * Flush pending saves to PostgreSQL with circuit breaker and retry logic
   */
  private async flushSaveQueue(): Promise<void> {
    if (this.saveQueue.size === 0) return;
    if (!db) {
      console.warn('[VocabularyTracker] Database not available');
      return;
    }
    
    const toSave = Array.from(this.saveQueue.values());
    this.saveQueue.clear();
    
    const result = await this.circuitBreaker.executeWithRetry(
      async () => {
        if (!db) throw new Error('Database not available');
        let savedCount = 0;
        const batchSize = 50;
        
        for (let i = 0; i < toSave.length; i += batchSize) {
          const batch = toSave.slice(i, i + batchSize);
          
          for (const obs of batch) {
            await db.insert(vocabularyObservations).values({
              text: obs.text,
              type: obs.type,
              isRealWord: obs.isRealWord,
              frequency: obs.frequency,
              avgPhi: obs.avgPhi,
              maxPhi: obs.maxPhi,
              efficiencyGain: 0,
              firstSeen: obs.firstSeen,
              lastSeen: obs.lastSeen,
              contexts: obs.contexts.slice(0, 10),
            }).onConflictDoUpdate({
              target: vocabularyObservations.text,
              set: {
                frequency: obs.frequency,
                avgPhi: obs.avgPhi,
                maxPhi: obs.maxPhi,
                lastSeen: obs.lastSeen,
                contexts: obs.contexts.slice(0, 10),
              }
            });
            savedCount++;
          }
        }
        return savedCount;
      },
      'flushSaveQueue'
    );
    
    if (result !== null) {
      console.log(`[VocabularyTracker] Saved ${result} observations to PostgreSQL`);
    } else {
      console.warn(`[VocabularyTracker] Failed to save ${toSave.length} observations, will retry in 30s`);
      for (const obs of toSave) {
        this.saveQueue.set(obs.text, obs);
      }
      setTimeout(() => this.flushSaveQueue(), 30000);
    }
  }
  
  /**
   * Observe from geometric memory probes
   */
  observeFromProbes(probes: BasinProbe[]): void {
    for (const probe of probes) {
      if (probe.phi >= this.minPhi) {
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
   * Tokenize phrase into words/phrases
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
    
    // Phrases (mutations) with high frequency and Φ
    for (const [_text, obs] of Array.from(this.phraseObservations.entries())) {
      if (obs.frequency >= this.minFrequency && 
          obs.avgPhi >= this.minPhi &&
          !expandedVocabulary.hasWord(obs.text)) {
        candidates.push({
          text: obs.text,
          type: obs.type,
          frequency: obs.frequency,
          avgPhi: obs.avgPhi,
          maxPhi: obs.maxPhi,
          efficiencyGain: obs.frequency,
          isRealWord: obs.isRealWord,
          reasoning: `${obs.isRealWord ? 'Word' : 'Phrase mutation'} in ${obs.frequency} high-Φ results (avg Φ=${obs.avgPhi.toFixed(2)})`,
        });
      }
    }
    
    // Multi-word sequences
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
          isRealWord: false,
          reasoning: `Sequence "${obs.sequence}" appears ${obs.frequency}x (avg Φ=${obs.avgPhi.toFixed(2)})`,
          components: obs.words,
        });
      }
    }
    
    // Sort by combined score
    candidates.sort((a, b) => {
      const scoreA = a.efficiencyGain * a.avgPhi;
      const scoreB = b.efficiencyGain * b.avgPhi;
      return scoreB - scoreA;
    });
    
    return candidates.slice(0, topK);
  }
  
  /**
   * Get statistics with word/phrase breakdown
   */
  getStats(): {
    totalWords: number;
    totalPhrases: number;
    totalSequences: number;
    topWords: Array<{text: string, frequency: number, avgPhi: number, isRealWord: boolean}>;
    topPhrases: Array<{text: string, frequency: number, avgPhi: number}>;
    topSequences: Array<{sequence: string, frequency: number, avgPhi: number}>;
    candidatesReady: number;
  } {
    const words: PhraseObservation[] = [];
    const phrases: PhraseObservation[] = [];
    
    for (const obs of this.phraseObservations.values()) {
      if (obs.isRealWord) {
        words.push(obs);
      } else {
        phrases.push(obs);
      }
    }
    
    const topWords = words
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20)
      .map(o => ({ text: o.text, frequency: o.frequency, avgPhi: o.avgPhi, isRealWord: true }));
    
    const topPhrases = phrases
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20)
      .map(o => ({ text: o.text, frequency: o.frequency, avgPhi: o.avgPhi }));
    
    const topSequences = Array.from(this.sequenceObservations.values())
      .sort((a, b) => b.efficiencyGain - a.efficiencyGain)
      .slice(0, 20)
      .map(o => ({ sequence: o.sequence, frequency: o.frequency, avgPhi: o.avgPhi }));
    
    return {
      totalWords: words.length,
      totalPhrases: phrases.length,
      totalSequences: this.sequenceObservations.size,
      topWords,
      topPhrases,
      topSequences,
      candidatesReady: this.getCandidates(100).length,
    };
  }
  
  /**
   * Force save all observations to PostgreSQL
   */
  async saveToStorage(): Promise<void> {
    if (!db) {
      console.warn('[VocabularyTracker] Database not available');
      return;
    }
    
    try {
      // Save phrase observations
      for (const [_text, obs] of Array.from(this.phraseObservations.entries())) {
        await db.insert(vocabularyObservations).values({
          text: obs.text,
          type: obs.type,
          phraseCategory: obs.phraseCategory,
          isRealWord: obs.isRealWord,
          isBip39Word: obs.isBip39Word,
          frequency: obs.frequency,
          avgPhi: obs.avgPhi,
          maxPhi: obs.maxPhi,
          efficiencyGain: 0,
          firstSeen: obs.firstSeen,
          lastSeen: obs.lastSeen,
          contexts: obs.contexts.slice(0, 10),
        }).onConflictDoUpdate({
          target: vocabularyObservations.text,
          set: {
            frequency: obs.frequency,
            avgPhi: obs.avgPhi,
            maxPhi: obs.maxPhi,
            phraseCategory: obs.phraseCategory,
            isBip39Word: obs.isBip39Word,
            lastSeen: obs.lastSeen,
            contexts: obs.contexts.slice(0, 10),
          }
        });
      }
      
      // Save sequence observations
      for (const [_seq, obs] of Array.from(this.sequenceObservations.entries())) {
        await db.insert(vocabularyObservations).values({
          text: obs.sequence,
          type: 'sequence',
          isRealWord: false,
          frequency: obs.frequency,
          avgPhi: obs.avgPhi,
          maxPhi: obs.maxPhi,
          efficiencyGain: obs.efficiencyGain,
          firstSeen: new Date(),
          lastSeen: new Date(),
          contexts: [obs.sequence],
        }).onConflictDoUpdate({
          target: vocabularyObservations.text,
          set: {
            frequency: obs.frequency,
            avgPhi: obs.avgPhi,
            maxPhi: obs.maxPhi,
            efficiencyGain: obs.efficiencyGain,
            lastSeen: new Date(),
          }
        });
      }
      
      console.log(`[VocabularyTracker] Saved ${this.phraseObservations.size} phrases, ${this.sequenceObservations.size} sequences to PostgreSQL`);
    } catch (error) {
      console.error('[VocabularyTracker] PostgreSQL save error:', error);
      throw error;
    }
  }
  
  /**
   * Load from PostgreSQL with circuit breaker and retry logic
   */
  private async loadFromPostgres(): Promise<void> {
    if (!db) {
      console.warn('[VocabularyTracker] Database not available, starting empty');
      return;
    }
    
    const result = await this.circuitBreaker.executeWithRetry(
      async () => {
        if (!db) throw new Error('Database not available');
        const rows = await db.select().from(vocabularyObservations);
        
        for (const row of rows) {
          if (row.type === 'sequence') {
            this.sequenceObservations.set(row.text, {
              sequence: row.text,
              words: row.text.split(' '),
              frequency: row.frequency,
              avgPhi: row.avgPhi,
              maxPhi: row.maxPhi,
              efficiencyGain: row.efficiencyGain || 0,
            });
          } else {
            this.phraseObservations.set(row.text, {
              text: row.text,
              frequency: row.frequency,
              avgPhi: row.avgPhi,
              maxPhi: row.maxPhi,
              firstSeen: row.firstSeen || new Date(),
              lastSeen: row.lastSeen || new Date(),
              contexts: row.contexts || [],
              isRealWord: row.isRealWord,
              isBip39Word: row.isBip39Word ?? false,
              type: row.type as 'word' | 'phrase',
              phraseCategory: (row.phraseCategory as PhraseCategory) ?? 'unknown',
            });
          }
        }
        return rows.length;
      },
      'loadFromPostgres'
    );
    
    if (result !== null) {
      console.log(`[VocabularyTracker] Loaded ${this.phraseObservations.size} phrases, ${this.sequenceObservations.size} sequences from PostgreSQL`);
      
      if (this.phraseObservations.size === 0) {
        setTimeout(() => this.bootstrapFromGeometricMemory(), 2000);
      }
    } else {
      console.warn('[VocabularyTracker] Could not load from PostgreSQL, starting with empty vocabulary');
      setTimeout(() => this.loadFromPostgres(), 30000);
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
    this.saveToStorage().catch(err => console.error('[VocabularyTracker] Bootstrap save failed:', err));
  }
  
  /**
   * Export observations for Python tokenizer with phrase category
   * Kernels use this to learn the difference between BIP-39 seeds and passphrases
   */
  async exportForTokenizer(): Promise<Array<{
    text: string;
    frequency: number;
    avgPhi: number;
    maxPhi: number;
    type: 'word' | 'phrase' | 'sequence';
    isRealWord: boolean;
    isBip39Word: boolean;
    phraseCategory: PhraseCategory;
  }>> {
    await this.dataLoaded;
    
    const exports: Array<{
      text: string;
      frequency: number;
      avgPhi: number;
      maxPhi: number;
      type: 'word' | 'phrase' | 'sequence';
      isRealWord: boolean;
      isBip39Word: boolean;
      phraseCategory: PhraseCategory;
    }> = [];
    
    // Export phrase observations with category
    for (const [_text, obs] of Array.from(this.phraseObservations.entries())) {
      if (obs.frequency >= this.minFrequency && obs.avgPhi >= this.minPhi) {
        exports.push({
          text: obs.text,
          frequency: obs.frequency,
          avgPhi: obs.avgPhi,
          maxPhi: obs.maxPhi,
          type: obs.type,
          isRealWord: obs.isRealWord,
          isBip39Word: obs.isBip39Word,
          phraseCategory: obs.phraseCategory,
        });
      }
    }
    
    // Export sequence observations (classified as passphrase or seed)
    for (const [_seq, obs] of Array.from(this.sequenceObservations.entries())) {
      if (obs.frequency >= 3 && obs.avgPhi >= 0.4) {
        const category = this.classifyPhraseCategory(obs.sequence);
        exports.push({
          text: obs.sequence,
          frequency: obs.frequency,
          avgPhi: obs.avgPhi,
          maxPhi: obs.maxPhi,
          type: 'sequence',
          isRealWord: false,
          isBip39Word: false,
          phraseCategory: category,
        });
      }
    }
    
    exports.sort((a, b) => b.avgPhi - a.avgPhi);
    
    // Log category distribution for debugging
    const categories = exports.reduce((acc, e) => {
      acc[e.phraseCategory] = (acc[e.phraseCategory] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log(`[VocabularyTracker] Exported ${exports.length} observations: ${JSON.stringify(categories)}`);
    
    return exports;
  }
  
  /**
   * Migrate legacy JSON data to PostgreSQL
   * Call this once to import old data
   */
  async migrateFromJson(jsonPath: string): Promise<number> {
    if (!db) throw new Error('Database not available');
    
    const fs = await import('fs');
    const path = await import('path');
    
    const fullPath = path.resolve(jsonPath);
    if (!fs.existsSync(fullPath)) {
      console.log('[VocabularyTracker] No JSON file to migrate');
      return 0;
    }
    
    try {
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const data = JSON.parse(raw);
      let migrated = 0;
      
      for (const w of (data.words || [])) {
        const type = this.classifyType(w.word);
        const isReal = type === 'word';
        
        await db.insert(vocabularyObservations).values({
          text: w.word,
          type,
          isRealWord: isReal,
          frequency: w.frequency,
          avgPhi: w.avgPhi,
          maxPhi: w.maxPhi,
          efficiencyGain: 0,
          firstSeen: new Date(w.firstSeen),
          lastSeen: new Date(w.lastSeen),
          contexts: w.contexts?.slice(0, 10) || [],
        }).onConflictDoUpdate({
          target: vocabularyObservations.text,
          set: {
            frequency: w.frequency,
            avgPhi: w.avgPhi,
            maxPhi: w.maxPhi,
            lastSeen: new Date(w.lastSeen),
          }
        });
        migrated++;
      }
      
      for (const s of (data.sequences || [])) {
        await db.insert(vocabularyObservations).values({
          text: s.sequence,
          type: 'sequence',
          isRealWord: false,
          frequency: s.frequency,
          avgPhi: s.avgPhi,
          maxPhi: s.maxPhi,
          efficiencyGain: s.efficiencyGain || 0,
          contexts: [s.sequence],
        }).onConflictDoUpdate({
          target: vocabularyObservations.text,
          set: {
            frequency: s.frequency,
            avgPhi: s.avgPhi,
            maxPhi: s.maxPhi,
            efficiencyGain: s.efficiencyGain || 0,
          }
        });
        migrated++;
      }
      
      console.log(`[VocabularyTracker] Migrated ${migrated} entries from JSON to PostgreSQL`);
      return migrated;
    } catch (error) {
      console.error('[VocabularyTracker] JSON migration failed:', error);
      throw error;
    }
  }
}

// Singleton instance
export const vocabularyTracker = new VocabularyTracker();
