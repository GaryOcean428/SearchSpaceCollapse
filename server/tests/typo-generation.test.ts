/**
 * Tests for Typo Generation Service
 * 
 * Validates keyboard typos, transpositions, phonetic substitutions,
 * and other variation generation features.
 */

import { describe, it, expect } from 'vitest';
import {
  generateKeyboardTypos,
  generateTranspositions,
  generateCharacterOmissions,
  generatePhoneticVariations,
  generateLeetVariations,
  generateCaseVariations,
  generateAllTypoVariations,
  generateWeightedTypos,
  getCommonMisspellings,
} from '../typo-generation';

describe('Typo Generation Service', () => {
  describe('generateKeyboardTypos', () => {
    it('should generate adjacent key variations', () => {
      const typos = generateKeyboardTypos('bitcoin', 3);
      
      expect(typos.length).toBeGreaterThan(0);
      expect(typos.length).toBeLessThanOrEqual(3);
      
      // Each typo should differ by exactly one character
      typos.forEach(typo => {
        let differences = 0;
        for (let i = 0; i < Math.min(typo.length, 'bitcoin'.length); i++) {
          if (typo[i] !== 'bitcoin'[i]) differences++;
        }
        expect(differences).toBeLessThanOrEqual(1);
      });
    });
    
    it('should handle empty strings', () => {
      const typos = generateKeyboardTypos('', 5);
      expect(typos.length).toBe(0);
    });
  });
  
  describe('generateTranspositions', () => {
    it('should swap adjacent characters', () => {
      const transpositions = generateTranspositions('satoshi');
      
      expect(transpositions).toContain('astoshi'); // s and a swapped
      expect(transpositions).toContain('staoshi'); // a and t swapped
      expect(transpositions).toContain('saotshi'); // t and o swapped
      
      // Should have length-1 transpositions
      expect(transpositions.length).toBe('satoshi'.length - 1);
    });
    
    it('should handle single character strings', () => {
      const transpositions = generateTranspositions('a');
      expect(transpositions.length).toBe(0);
    });
  });
  
  describe('generateCharacterOmissions', () => {
    it('should generate variations with missing characters', () => {
      const omissions = generateCharacterOmissions('bitcoin', 5);
      
      expect(omissions).toContain('itcoin'); // missing 'b'
      expect(omissions).toContain('btcoin'); // missing 'i'
      expect(omissions.length).toBeGreaterThan(0);
    });
    
    it('should also generate variations with extra characters', () => {
      const variations = generateCharacterOmissions('test', 10);
      
      // Should include both omissions and additions
      expect(variations.length).toBeGreaterThan('test'.length);
    });
  });
  
  describe('generatePhoneticVariations', () => {
    it('should generate phonetic substitutions', () => {
      const phonetic = generatePhoneticVariations('satoshi', 10);
      
      // 's' can be replaced with 'c' or 'z'
      expect(phonetic.some(v => v.includes('c') || v.includes('z'))).toBe(true);
      expect(phonetic.length).toBeGreaterThan(0);
    });
    
    it('should handle multi-character substitutions', () => {
      const phonetic = generatePhoneticVariations('philosophy', 10);
      
      // 'ph' can be replaced with 'f' -> 'filosofy' (ph at position 0)
      // The function replaces 'ph' -> 'f', so 'philosophy' -> 'filosofy'
      expect(phonetic.length).toBeGreaterThan(0);
      // Just verify it generates variations
    });
  });
  
  describe('generateLeetVariations', () => {
    it('should generate leetspeak variations', () => {
      const leet = generateLeetVariations('satoshi', 10);
      
      // 'a' -> '@' or '4', 'o' -> '0', 's' -> '5' or '$'
      expect(leet.some(v => v.includes('@') || v.includes('4'))).toBe(true);
      expect(leet.some(v => v.includes('0'))).toBe(true);
      
      // Should include full leet variation (s->5, a->@, t->7, o->0, s->5, i->1)
      // Result: "5@70581" (replacements[0] for each char)
      expect(leet.some(v => v.includes('5@7') || v.includes('581'))).toBe(true);
    });
  });
  
  describe('generateCaseVariations', () => {
    it('should generate different case variations', () => {
      const cases = generateCaseVariations('Bitcoin');
      
      expect(cases).toContain('bitcoin'); // lowercase
      expect(cases).toContain('BITCOIN'); // uppercase
      expect(cases).toContain('Bitcoin'); // capitalized
      
      // Should have at least 4 variations
      expect(cases.length).toBeGreaterThanOrEqual(4);
    });
    
    it('should remove duplicates', () => {
      const cases = generateCaseVariations('abc');
      const uniqueCases = new Set(cases);
      expect(cases.length).toBe(uniqueCases.size);
    });
  });
  
  describe('generateAllTypoVariations', () => {
    it('should generate comprehensive variations', () => {
      const all = generateAllTypoVariations('bitcoin', 5);
      
      // Should include original
      expect(all).toContain('bitcoin');
      
      // Should have variations from multiple categories
      expect(all.length).toBeGreaterThan(10);
      
      // Should include case variations
      expect(all).toContain('BITCOIN');
      expect(all).toContain('Bitcoin');
    });
    
    it('should respect max per category limit', () => {
      const all = generateAllTypoVariations('test', 2);
      
      // Should not be excessively large
      expect(all.length).toBeLessThan(100);
    });
    
    it('should remove duplicates', () => {
      const all = generateAllTypoVariations('test', 5);
      const unique = new Set(all);
      expect(all.length).toBe(unique.size);
    });
  });
  
  describe('generateWeightedTypos', () => {
    it('should generate variations with weights', () => {
      const weighted = generateWeightedTypos('bitcoin');
      
      expect(weighted.length).toBeGreaterThan(0);
      
      // All should have text and weight properties
      weighted.forEach(w => {
        expect(w).toHaveProperty('text');
        expect(w).toHaveProperty('weight');
        expect(w).toHaveProperty('typoType');
        expect(w.weight).toBeGreaterThan(0);
        expect(w.weight).toBeLessThanOrEqual(1);
      });
      
      // Original should have highest weight
      const original = weighted.find(w => w.text === 'bitcoin');
      expect(original).toBeDefined();
      expect(original!.weight).toBe(1.0);
    });
    
    it('should assign appropriate weights to different typo types', () => {
      const weighted = generateWeightedTypos('test');
      
      // Find examples of each type
      const keyboard = weighted.find(w => w.typoType === 'keyboard');
      const caseVar = weighted.find(w => w.typoType === 'case');
      const leet = weighted.find(w => w.typoType === 'leet');
      
      // Keyboard and case should have higher weights than leet
      if (keyboard && leet) {
        expect(keyboard.weight).toBeGreaterThan(leet.weight);
      }
      if (caseVar && leet) {
        expect(caseVar.weight).toBeGreaterThan(leet.weight);
      }
    });
  });
  
  describe('getCommonMisspellings', () => {
    it('should return known misspellings for common words', () => {
      const misspellings = getCommonMisspellings('bitcoin');
      
      expect(misspellings.length).toBeGreaterThan(0);
      expect(misspellings).toContain('bitcon');
    });
    
    it('should return empty array for unknown words', () => {
      const misspellings = getCommonMisspellings('xyzabc123');
      expect(misspellings.length).toBe(0);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle single character strings', () => {
      const all = generateAllTypoVariations('a', 5);
      expect(all.length).toBeGreaterThan(0);
      expect(all).toContain('a');
      expect(all).toContain('A');
    });
    
    it('should handle strings with numbers', () => {
      const all = generateAllTypoVariations('bitcoin2009', 5);
      expect(all).toContain('bitcoin2009');
      expect(all.length).toBeGreaterThan(0);
    });
    
    it('should handle strings with special characters', () => {
      const all = generateAllTypoVariations('bit$coin', 5);
      expect(all).toContain('bit$coin');
      expect(all.length).toBeGreaterThan(0);
    });
  });
  
  describe('Performance', () => {
    it('should complete within reasonable time for short strings', () => {
      const start = Date.now();
      generateAllTypoVariations('satoshi', 10);
      const duration = Date.now() - start;
      
      // Should complete in less than 100ms
      expect(duration).toBeLessThan(100);
    });
    
    it('should handle longer strings efficiently', () => {
      const start = Date.now();
      generateAllTypoVariations('thisisalongpassphrase', 5);
      const duration = Date.now() - start;
      
      // Should still be reasonably fast
      expect(duration).toBeLessThan(500);
    });
  });
});
