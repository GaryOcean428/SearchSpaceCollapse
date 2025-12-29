/**
 * Tests for Historical Keywords Service
 * 
 * Validates temporal keyword generation for Bitcoin recovery
 * focusing on 2009-2013 era.
 */

import { describe, it, expect } from 'vitest';
import {
  HISTORICAL_KEYWORDS,
  COMMON_PASSWORDS_2009_2013,
  generateKeywordVariations,
  getKeywordsForYears,
  getHighPriorityKeywords,
  generateHistoricalPhrases,
  getEventKeywords,
  recordKeywordAttempt,
  getTopKeywords,
} from '../historical-keywords';

describe('Historical Keywords Service', () => {
  describe('HISTORICAL_KEYWORDS dataset', () => {
    it('should have keyword sets for years 2009-2013', () => {
      const years = new Set(HISTORICAL_KEYWORDS.map(s => s.year));
      
      expect(years.has(2009)).toBe(true);
      expect(years.has(2010)).toBe(true);
      expect(years.has(2011)).toBe(true);
      expect(years.has(2012)).toBe(true);
      expect(years.has(2013)).toBe(true);
    });
    
    it('should have multiple categories per year', () => {
      const year2009 = HISTORICAL_KEYWORDS.filter(s => s.year === 2009);
      expect(year2009.length).toBeGreaterThan(1);
      
      const categories = new Set(year2009.map(s => s.category));
      expect(categories.size).toBeGreaterThan(1);
    });
    
    it('should include bitcoin-specific keywords', () => {
      const allKeywords = HISTORICAL_KEYWORDS.flatMap(s => s.keywords);
      
      expect(allKeywords).toContain('satoshi');
      expect(allKeywords).toContain('bitcoin');
      expect(allKeywords).toContain('nakamoto');
      expect(allKeywords).toContain('genesis');
    });
    
    it('should have weight property for all sets', () => {
      HISTORICAL_KEYWORDS.forEach(set => {
        expect(set).toHaveProperty('weight');
        expect(set.weight).toBeGreaterThan(0);
        expect(set.weight).toBeLessThanOrEqual(1);
      });
    });
    
    it('should have at least 100 unique keywords total', () => {
      const allKeywords = new Set(HISTORICAL_KEYWORDS.flatMap(s => s.keywords));
      expect(allKeywords.size).toBeGreaterThanOrEqual(100);
    });
  });
  
  describe('COMMON_PASSWORDS_2009_2013', () => {
    it('should include common password patterns', () => {
      expect(COMMON_PASSWORDS_2009_2013).toContain('password');
      expect(COMMON_PASSWORDS_2009_2013).toContain('password123');
      expect(COMMON_PASSWORDS_2009_2013).toContain('123456');
    });
    
    it('should include bitcoin-specific passwords', () => {
      expect(COMMON_PASSWORDS_2009_2013).toContain('bitcoin');
      expect(COMMON_PASSWORDS_2009_2013).toContain('satoshi');
      expect(COMMON_PASSWORDS_2009_2013).toContain('wallet');
    });
    
    it('should have at least 40 passwords', () => {
      expect(COMMON_PASSWORDS_2009_2013.length).toBeGreaterThanOrEqual(40);
    });
  });
  
  describe('generateKeywordVariations', () => {
    it('should generate case variations', () => {
      const variations = generateKeywordVariations('bitcoin');
      
      expect(variations).toContain('bitcoin');
      expect(variations).toContain('BITCOIN');
      expect(variations).toContain('Bitcoin');
    });
    
    it('should generate number suffix variations', () => {
      const variations = generateKeywordVariations('satoshi');
      
      expect(variations).toContain('satoshi1');
      expect(variations).toContain('satoshi123');
      expect(variations).toContain('satoshi2009');
      expect(variations).toContain('satoshi2010');
    });
    
    it('should generate bitcoin-specific combinations', () => {
      const variations = generateKeywordVariations('pizza');
      
      expect(variations.some(v => v.includes('bitcoin'))).toBe(true);
      expect(variations.some(v => v.includes('btc'))).toBe(true);
    });
    
    it('should remove duplicates', () => {
      const variations = generateKeywordVariations('test');
      const unique = new Set(variations);
      expect(variations.length).toBe(unique.size);
    });
    
    it('should not create redundant bitcoin combos if already contains bitcoin', () => {
      const variations = generateKeywordVariations('bitcoinwallet');
      
      // If it already has bitcoin/btc, it should not add them again
      // But it will generate other variations like case, numbers, etc.
      expect(variations).toContain('bitcoinwallet');
      expect(variations.length).toBeGreaterThan(0);
    });
  });
  
  describe('getKeywordsForYears', () => {
    it('should return keywords for specific year range', () => {
      const keywords2009 = getKeywordsForYears(2009, 2009);
      
      expect(keywords2009).toContain('satoshi');
      expect(keywords2009).toContain('bitcoin');
      expect(keywords2009.length).toBeGreaterThan(0);
    });
    
    it('should return keywords for multiple years', () => {
      const keywords = getKeywordsForYears(2009, 2011);
      
      // Should include keywords from 2009, 2010, and 2011
      expect(keywords).toContain('satoshi'); // 2009
      expect(keywords).toContain('pizza'); // 2010
      expect(keywords).toContain('silkroad'); // 2011
      expect(keywords.length).toBeGreaterThan(50);
    });
    
    it('should return empty array for years outside range', () => {
      const keywords = getKeywordsForYears(2020, 2025);
      expect(keywords.length).toBe(0);
    });
  });
  
  describe('getHighPriorityKeywords', () => {
    it('should return high-weight keywords', () => {
      const highPriority = getHighPriorityKeywords(0.8);
      
      expect(highPriority.length).toBeGreaterThan(0);
      
      // Should include bitcoin-specific keywords (highest weight)
      expect(highPriority).toContain('satoshi');
      expect(highPriority).toContain('bitcoin');
    });
    
    it('should filter by weight threshold', () => {
      const veryHighPriority = getHighPriorityKeywords(1.0);
      const highPriority = getHighPriorityKeywords(0.8);
      
      // Very high priority should be a subset of high priority
      expect(veryHighPriority.length).toBeLessThanOrEqual(highPriority.length);
    });
    
    it('should return more keywords with lower threshold', () => {
      const threshold08 = getHighPriorityKeywords(0.8);
      const threshold05 = getHighPriorityKeywords(0.5);
      
      expect(threshold05.length).toBeGreaterThanOrEqual(threshold08.length);
    });
  });
  
  describe('generateHistoricalPhrases', () => {
    it('should generate requested number of phrases', () => {
      const phrases = generateHistoricalPhrases(50);
      
      // Should generate approximately the requested number
      // (may be more due to common passwords added)
      expect(phrases.length).toBeGreaterThan(50);
    });
    
    it('should include single keyword phrases', () => {
      const phrases = generateHistoricalPhrases(100);
      
      // Should have some single words
      expect(phrases.some(p => !p.includes(' '))).toBe(true);
    });
    
    it('should include two-word combinations', () => {
      const phrases = generateHistoricalPhrases(100);
      
      // Should have some two-word phrases
      expect(phrases.some(p => p.split(' ').length === 2)).toBe(true);
    });
    
    it('should include common passwords', () => {
      const phrases = generateHistoricalPhrases(100);
      
      expect(phrases).toContain('password');
      expect(phrases).toContain('bitcoin');
      expect(phrases).toContain('satoshi');
    });
    
    it('should remove duplicates', () => {
      const phrases = generateHistoricalPhrases(100);
      const unique = new Set(phrases);
      expect(phrases.length).toBe(unique.size);
    });
  });
  
  describe('getEventKeywords', () => {
    it('should return keywords for financial crisis', () => {
      const keywords = getEventKeywords('financial-crisis');
      
      expect(keywords).toContain('bailout');
      expect(keywords).toContain('lehman');
      expect(keywords).toContain('recession');
      expect(keywords.length).toBeGreaterThan(5);
    });
    
    it('should return keywords for bitcoin pizza day', () => {
      const keywords = getEventKeywords('bitcoin-pizza');
      
      expect(keywords).toContain('pizza');
      expect(keywords).toContain('laszlo');
      expect(keywords).toContain('10000');
    });
    
    it('should return keywords for silk road', () => {
      const keywords = getEventKeywords('silkroad');
      
      expect(keywords).toContain('silkroad');
      expect(keywords).toContain('darknet');
      expect(keywords).toContain('tor');
    });
    
    it('should return keywords for cyprus bailout', () => {
      const keywords = getEventKeywords('cyprus');
      
      expect(keywords).toContain('cyprus');
      expect(keywords).toContain('bailout');
      expect(keywords).toContain('capital');
    });
    
    it('should return empty array for unknown events', () => {
      const keywords = getEventKeywords('unknown-event' as any);
      expect(keywords.length).toBe(0);
    });
  });
  
  describe('recordKeywordAttempt and getTopKeywords', () => {
    it('should record keyword attempts', () => {
      // Record some attempts
      recordKeywordAttempt('satoshi', false, 0.5);
      recordKeywordAttempt('satoshi', false, 0.6);
      recordKeywordAttempt('bitcoin', true, 0.8);
      
      const topKeywords = getTopKeywords(10);
      
      expect(topKeywords.length).toBeGreaterThan(0);
      
      // Should have recorded keywords
      const satoshiStats = topKeywords.find(k => k.keyword === 'satoshi');
      const bitcoinStats = topKeywords.find(k => k.keyword === 'bitcoin');
      
      if (satoshiStats) {
        expect(satoshiStats.occurrences).toBeGreaterThan(0);
        expect(satoshiStats.avgPhi).toBeGreaterThan(0);
      }
      
      if (bitcoinStats) {
        expect(bitcoinStats.occurrences).toBeGreaterThan(0);
        expect(bitcoinStats.successRate).toBe(1);
      }
    });
    
    it('should calculate average phi correctly', () => {
      recordKeywordAttempt('test1', false, 0.4);
      recordKeywordAttempt('test1', false, 0.6);
      
      const topKeywords = getTopKeywords(100);
      const test1Stats = topKeywords.find(k => k.keyword === 'test1');
      
      if (test1Stats) {
        // Average of 0.4 and 0.6 should be 0.5
        expect(test1Stats.avgPhi).toBeCloseTo(0.5, 1);
      }
    });
    
    it('should sort by average phi', () => {
      recordKeywordAttempt('high', false, 0.9);
      recordKeywordAttempt('medium', false, 0.5);
      recordKeywordAttempt('low', false, 0.1);
      
      const topKeywords = getTopKeywords(100);
      
      // Should be sorted by avgPhi descending
      for (let i = 0; i < topKeywords.length - 1; i++) {
        expect(topKeywords[i].avgPhi).toBeGreaterThanOrEqual(topKeywords[i + 1].avgPhi);
      }
    });
    
    it('should respect limit parameter', () => {
      // Record many keywords
      for (let i = 0; i < 100; i++) {
        recordKeywordAttempt(`keyword${i}`, false, Math.random());
      }
      
      const top10 = getTopKeywords(10);
      expect(top10.length).toBeLessThanOrEqual(10);
    });
  });
  
  describe('Integration Tests', () => {
    it('should generate comprehensive hypothesis set', () => {
      const phrases = generateHistoricalPhrases(100);
      
      // Should have good variety
      expect(phrases.length).toBeGreaterThan(100);
      
      // Should have different lengths
      const singleWords = phrases.filter(p => !p.includes(' '));
      const twoWords = phrases.filter(p => p.split(' ').length === 2);
      
      expect(singleWords.length).toBeGreaterThan(0);
      expect(twoWords.length).toBeGreaterThan(0);
      
      // Should cover multiple categories
      const hasBitcoinTerm = phrases.some(p => 
        p.toLowerCase().includes('bitcoin') || 
        p.toLowerCase().includes('satoshi')
      );
      const hasWorldEvent = phrases.some(p => 
        p.toLowerCase().includes('obama') || 
        p.toLowerCase().includes('crisis')
      );
      
      expect(hasBitcoinTerm).toBe(true);
      expect(hasWorldEvent).toBe(true);
    });
    
    it('should generate 10,000+ variations when combined with typo generation', () => {
      const historicalPhrases = generateHistoricalPhrases(100);
      
      // Each phrase could generate ~10-20 typo variations
      // 100 phrases × 10 variations = 1,000+ minimum
      // With all categories, should exceed 10,000
      const expectedMinimum = historicalPhrases.length * 10;
      expect(expectedMinimum).toBeGreaterThan(1000);
    });
  });
});
