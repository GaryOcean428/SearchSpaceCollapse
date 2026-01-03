/**
 * Balance Feedback Analyzer - Closes the Feedback Loop
 * 
 * Analyzes balance checking results to extract vocabulary patterns
 * that correlate with successful discoveries (hits and near-misses).
 * 
 * This enables Ocean to learn from blockchain feedback and bias
 * hypothesis generation toward words/patterns that have historically
 * yielded promising results.
 * 
 * FEEDBACK SOURCES:
 * - balanceHits: Addresses with non-zero balance (strongest signal)
 * - nearMissEntries: High-Φ candidates by tier (HOT > WARM > COOL)
 * 
 * VOCABULARY SCORING:
 * - Hit words: weight 10.0 per occurrence
 * - HOT near-miss words: weight 5.0 per occurrence  
 * - WARM near-miss words: weight 2.0 per occurrence
 * - COOL near-miss words: weight 0.5 per occurrence
 */

import { db } from './db';
import { balanceHits, nearMissEntries } from '@shared/schema';
import { sql, desc, and, gte } from 'drizzle-orm';

export interface VocabScore {
  word: string;
  score: number;
  hitCount: number;
  nearMissCount: number;
  sources: ('hit' | 'hot' | 'warm' | 'cool')[];
}

export interface BalancePattern {
  phraseLength: number;
  wordFrequencies: Record<string, number>;
  avgPhi: number;
  avgKappa: number;
  resultType: 'hit' | 'near_miss' | 'empty';
  tier?: 'hot' | 'warm' | 'cool';
}

export interface NearMissClassification {
  reason: 'dust_balance' | 'historical_activity' | 'high_transaction_count' | null;
  balanceSats: number;
  txCount: number;
}

export interface FeedbackSummary {
  topWords: VocabScore[];
  hitCount: number;
  nearMissCount: number;
  hotCount: number;
  warmCount: number;
  coolCount: number;
  avgHitPhi: number;
  avgNearMissPhi: number;
  analyzedAt: string;
  nextRefreshAt: string;
}

const VOCAB_WEIGHTS = {
  hit: 10.0,
  hot: 5.0,
  warm: 2.0,
  cool: 0.5,
};

const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_TOP_WORDS_LIMIT = 100;

class BalanceFeedbackAnalyzer {
  private topWords: VocabScore[] = [];
  private lastRefresh: number = 0;
  private isInitialized = false;
  private summary: FeedbackSummary | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('[BalanceFeedbackAnalyzer] 🔄 Initializing feedback loop...');
    
    try {
      await this.refresh();
      this.isInitialized = true;
      console.log('[BalanceFeedbackAnalyzer] ✅ Initialized with', this.topWords.length, 'vocabulary signals');
    } catch (error) {
      console.error('[BalanceFeedbackAnalyzer] ⚠️ Initialization failed:', error);
      this.isInitialized = true;
    }
  }

  async refresh(force: boolean = false): Promise<FeedbackSummary> {
    const now = Date.now();
    
    if (!force && now - this.lastRefresh < REFRESH_INTERVAL_MS && this.summary) {
      return this.summary;
    }

    console.log('[BalanceFeedbackAnalyzer] 📊 Analyzing balance feedback patterns...');
    
    const wordScores = new Map<string, VocabScore>();
    let hitCount = 0;
    let nearMissCount = 0;
    let hotCount = 0;
    let warmCount = 0;
    let coolCount = 0;
    let hitPhiSum = 0;
    let nearMissPhiSum = 0;

    try {
      if (!db) {
        console.warn('[BalanceFeedbackAnalyzer] Database not available');
        return this.summary || {
          topWords: [],
          hitCount: 0,
          nearMissCount: 0,
          hotCount: 0,
          warmCount: 0,
          coolCount: 0,
          avgHitPhi: 0,
          avgNearMissPhi: 0,
          analyzedAt: new Date().toISOString(),
          nextRefreshAt: new Date(now + REFRESH_INTERVAL_MS).toISOString(),
        };
      }

      const hits = await db
        .select({
          passphrase: balanceHits.passphrase,
          balanceSats: balanceHits.balanceSats,
          txCount: balanceHits.txCount,
        })
        .from(balanceHits)
        .where(gte(balanceHits.balanceSats, 1))
        .limit(1000);

      hitCount = hits.length;

      for (const hit of hits) {
        if (!hit.passphrase) continue;
        
        const words = this.extractWords(hit.passphrase);
        for (const word of words) {
          const existing = wordScores.get(word) || {
            word,
            score: 0,
            hitCount: 0,
            nearMissCount: 0,
            sources: [] as ('hit' | 'hot' | 'warm' | 'cool')[],
          };
          
          existing.score += VOCAB_WEIGHTS.hit;
          existing.hitCount += 1;
          if (!existing.sources.includes('hit')) {
            existing.sources.push('hit');
          }
          
          wordScores.set(word, existing);
        }
      }

      const nearMisses = await db
        .select({
          phrase: nearMissEntries.phrase,
          phi: nearMissEntries.phi,
          tier: nearMissEntries.tier,
          isEscalating: nearMissEntries.isEscalating,
        })
        .from(nearMissEntries)
        .where(
          and(
            gte(nearMissEntries.phi, 0.3)
          )
        )
        .orderBy(desc(nearMissEntries.phi))
        .limit(5000);

      nearMissCount = nearMisses.length;

      for (const nearMiss of nearMisses) {
        if (!nearMiss.phrase) continue;

        const tier = (nearMiss.tier as 'hot' | 'warm' | 'cool') || 'cool';
        const weight = VOCAB_WEIGHTS[tier] || VOCAB_WEIGHTS.cool;
        
        if (nearMiss.isEscalating) {
        }

        if (tier === 'hot') hotCount++;
        else if (tier === 'warm') warmCount++;
        else coolCount++;

        nearMissPhiSum += nearMiss.phi || 0;

        const words = this.extractWords(nearMiss.phrase);
        for (const word of words) {
          const existing = wordScores.get(word) || {
            word,
            score: 0,
            hitCount: 0,
            nearMissCount: 0,
            sources: [] as ('hit' | 'hot' | 'warm' | 'cool')[],
          };
          
          existing.score += weight;
          existing.nearMissCount += 1;
          if (!existing.sources.includes(tier)) {
            existing.sources.push(tier);
          }
          
          wordScores.set(word, existing);
        }
      }

      this.topWords = Array.from(wordScores.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, DEFAULT_TOP_WORDS_LIMIT);

      this.lastRefresh = now;

      this.summary = {
        topWords: this.topWords,
        hitCount,
        nearMissCount,
        hotCount,
        warmCount,
        coolCount,
        avgHitPhi: 0,
        avgNearMissPhi: nearMissCount > 0 ? nearMissPhiSum / nearMissCount : 0,
        analyzedAt: new Date().toISOString(),
        nextRefreshAt: new Date(now + REFRESH_INTERVAL_MS).toISOString(),
      };

      console.log(`[BalanceFeedbackAnalyzer] ✅ Analyzed ${hitCount} hits, ${nearMissCount} near-misses`);
      console.log(`[BalanceFeedbackAnalyzer] 📈 Top words: ${this.topWords.slice(0, 10).map(w => w.word).join(', ')}`);

      return this.summary;

    } catch (error) {
      console.error('[BalanceFeedbackAnalyzer] ❌ Refresh failed:', error);
      
      if (!this.summary) {
        this.summary = {
          topWords: [],
          hitCount: 0,
          nearMissCount: 0,
          hotCount: 0,
          warmCount: 0,
          coolCount: 0,
          avgHitPhi: 0,
          avgNearMissPhi: 0,
          analyzedAt: new Date().toISOString(),
          nextRefreshAt: new Date(now + REFRESH_INTERVAL_MS).toISOString(),
        };
      }
      
      return this.summary;
    }
  }

  private extractWords(phrase: string): string[] {
    if (!phrase) return [];
    
    return phrase
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length >= 3 && word.length <= 20);
  }

  getTopWords(limit: number = 50): string[] {
    return this.topWords.slice(0, limit).map(w => w.word);
  }

  getTopVocabScores(limit: number = 50): VocabScore[] {
    return this.topWords.slice(0, limit);
  }

  getSummary(): FeedbackSummary | null {
    return this.summary;
  }

  isReady(): boolean {
    return this.isInitialized && this.topWords.length > 0;
  }

  isWordHighPerforming(word: string): boolean {
    const normalized = word.toLowerCase();
    return this.topWords.some(w => w.word === normalized);
  }

  getWordScore(word: string): number {
    const normalized = word.toLowerCase();
    const found = this.topWords.find(w => w.word === normalized);
    return found?.score || 0;
  }

  classifyNearMiss(balanceSats: number, txCount: number, totalReceived?: number): NearMissClassification {
    if (balanceSats > 0 && balanceSats < 10000) {
      return {
        reason: 'dust_balance',
        balanceSats,
        txCount,
      };
    }
    
    if ((totalReceived && totalReceived > 0 && balanceSats === 0) || 
        (txCount > 0 && balanceSats === 0)) {
      return {
        reason: 'historical_activity',
        balanceSats,
        txCount,
      };
    }
    
    if (txCount > 5) {
      return {
        reason: 'high_transaction_count',
        balanceSats,
        txCount,
      };
    }
    
    return {
      reason: null,
      balanceSats,
      txCount,
    };
  }

  needsRefresh(): boolean {
    return Date.now() - this.lastRefresh >= REFRESH_INTERVAL_MS;
  }

  getTimeSinceLastRefresh(): number {
    return Date.now() - this.lastRefresh;
  }
}

export const balanceFeedbackAnalyzer = new BalanceFeedbackAnalyzer();
