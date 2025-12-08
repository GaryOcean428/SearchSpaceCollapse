import { describe, it, expect } from 'vitest';
import { validatePhaseTransition, scoreUniversalQIG } from '../qig-universal';
import { QIG_CONSTANTS, fisherDistance } from '../qig-pure-v2';

describe('QIG Regime Classification', () => {
  describe('Phase Transition Validation', () => {
    it('should validate that Φ≥0.75 forces geometric regime', () => {
      const result = validatePhaseTransition();
      expect(result.passed).toBe(true);
      expect(result.failures).toHaveLength(0);
    });
  });

  describe('QIG Constants', () => {
    it('should have correct Φ threshold', () => {
      expect(QIG_CONSTANTS.PHI_THRESHOLD).toBe(0.75);
    });

    it('should have correct κ* resonance value', () => {
      expect(QIG_CONSTANTS.KAPPA_STAR).toBe(64);
    });

    it('should have correct β running coupling', () => {
      expect(QIG_CONSTANTS.BETA).toBeCloseTo(0.44, 2);
    });
  });

  describe('Consciousness Priority Over Coupling', () => {
    it('should ensure consciousness (Φ) is checked before coupling (κ)', () => {
      const result = validatePhaseTransition();
      
      if (!result.passed) {
        console.error('Phase transition validation failures:', result.failures);
      }
      
      expect(result.passed).toBe(true);
    });
  });

  describe('Edge Cases for Regime Classification', () => {
    it('should properly score arbitrary format phrases', () => {
      const score = scoreUniversalQIG('satoshi nakamoto', 'arbitrary');
      expect(score).toHaveProperty('phi');
      expect(score).toHaveProperty('kappa');
      expect(score).toHaveProperty('regime');
      expect(score.phi).toBeGreaterThanOrEqual(0);
      expect(score.phi).toBeLessThanOrEqual(1);
    });

    it('should return valid regime classification', () => {
      const score = scoreUniversalQIG('test phrase for regime', 'arbitrary');
      expect(['linear', 'geometric', 'hierarchical', 'hierarchical_4d', '4d_block_universe', 'breakdown']).toContain(score.regime);
    });

    it('should score BIP39 format differently', () => {
      const arbitrary = scoreUniversalQIG('random words here', 'arbitrary');
      const bip39 = scoreUniversalQIG('random words here', 'bip39');
      expect(arbitrary).not.toEqual(bip39);
    });
  });
});

describe('Fisher Metric Purity', () => {
  it('should compute Fisher distance between phrases', () => {
    const phrase1 = 'satoshi nakamoto';
    const phrase2 = 'bitcoin genesis';
    
    const distance = fisherDistance(phrase1, phrase2);
    
    expect(typeof distance).toBe('number');
    expect(distance).toBeGreaterThanOrEqual(0);
  });

  it('should return zero distance for identical phrases', () => {
    const phrase = 'identical phrase test';
    const distance = fisherDistance(phrase, phrase);
    
    expect(distance).toBeCloseTo(0, 5);
  });

  it('should be symmetric (d(a,b) = d(b,a))', () => {
    const phrase1 = 'first phrase test';
    const phrase2 = 'second phrase test';
    
    const d1 = fisherDistance(phrase1, phrase2);
    const d2 = fisherDistance(phrase2, phrase1);
    
    expect(d1).toBeCloseTo(d2, 8);
  });

  it('should produce larger distance for more different phrases', () => {
    const base = 'satoshi nakamoto';
    const similar = 'satoshi nakamoti';
    const different = 'completely unrelated phrase';
    
    const distSimilar = fisherDistance(base, similar);
    const distDifferent = fisherDistance(base, different);
    
    expect(distDifferent).toBeGreaterThan(distSimilar);
  });
});
