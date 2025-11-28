import { describe, it, expect } from 'vitest';
import { 
  generateRecoveryBundle, 
  derivePrivateKeyFromPassphrase, 
  generateBitcoinAddressFromPrivateKey, 
  validateBitcoinAddress,
  generateBitcoinAddress
} from '../crypto';

describe('Crypto Functions', () => {
  describe('Brain Wallet Key Generation', () => {
    it('should generate consistent private key from phrase', () => {
      const phrase = 'satoshi nakamoto';
      const key1 = derivePrivateKeyFromPassphrase(phrase);
      const key2 = derivePrivateKeyFromPassphrase(phrase);
      
      expect(key1).toBe(key2);
      expect(key1).toHaveLength(64);
    });

    it('should generate different keys for different phrases', () => {
      const key1 = derivePrivateKeyFromPassphrase('satoshi nakamoto');
      const key2 = derivePrivateKeyFromPassphrase('bitcoin forever');
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('Address Generation', () => {
    it('should generate valid Bitcoin address from private key', () => {
      const phrase = 'test phrase for address generation';
      const privateKey = derivePrivateKeyFromPassphrase(phrase);
      const address = generateBitcoinAddressFromPrivateKey(privateKey, true);
      
      expect(address).toMatch(/^[13][a-zA-Z0-9]{25,34}$/);
    });

    it('should generate different addresses for compressed vs uncompressed', () => {
      const phrase = 'test phrase for format comparison';
      const privateKey = derivePrivateKeyFromPassphrase(phrase);
      
      const compressed = generateBitcoinAddressFromPrivateKey(privateKey, true);
      const uncompressed = generateBitcoinAddressFromPrivateKey(privateKey, false);
      
      expect(compressed).not.toBe(uncompressed);
    });
  });

  describe('Address Validation', () => {
    it('should validate correct P2PKH addresses', () => {
      expect(() => validateBitcoinAddress('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')).not.toThrow();
      expect(() => validateBitcoinAddress('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2')).not.toThrow();
    });

    it('should reject invalid addresses', () => {
      expect(() => validateBitcoinAddress('invalid')).toThrow();
      expect(() => validateBitcoinAddress('')).toThrow();
      expect(() => validateBitcoinAddress('0x1234')).toThrow();
    });
  });

  describe('Recovery Bundle Generation', () => {
    it('should generate complete recovery bundle when address matches', () => {
      const phrase = 'test phrase for recovery';
      const privateKey = derivePrivateKeyFromPassphrase(phrase);
      const targetAddress = generateBitcoinAddressFromPrivateKey(privateKey, true);
      const qigMetrics = { phi: 0.8, kappa: 64, regime: 'geometric' };
      
      const bundle = generateRecoveryBundle(phrase, targetAddress, qigMetrics);
      
      expect(bundle.passphrase).toBe(phrase);
      expect(bundle.privateKeyHex).toHaveLength(64);
      expect(bundle.privateKeyWIF).toMatch(/^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/);
      expect(bundle.publicKeyHex).toBeTruthy();
      expect(bundle.instructions).toContain('RECOVERY');
    });

    it('should throw error when address does not match', () => {
      const phrase = 'sensitive passphrase';
      const wrongAddress = '1TestAddressThatDoesNotMatch12345';
      const qigMetrics = { phi: 0.8, kappa: 64, regime: 'geometric' };
      
      expect(() => generateRecoveryBundle(phrase, wrongAddress, qigMetrics)).toThrow();
    });
  });
});

describe('Security Constraints', () => {
  it('should not log private keys to console.log', () => {
    const originalLog = console.log;
    const loggedMessages: string[] = [];
    
    console.log = (...args: any[]) => {
      loggedMessages.push(args.join(' '));
    };
    
    try {
      const phrase = 'test phrase';
      const key = derivePrivateKeyFromPassphrase(phrase);
      
      const hasKeyLeak = loggedMessages.some(msg => 
        msg.includes(key) || 
        (msg.toLowerCase().includes('private') && msg.length > 100)
      );
      
      expect(hasKeyLeak).toBe(false);
    } finally {
      console.log = originalLog;
    }
  });

  it('should not log private keys to console.warn', () => {
    const originalWarn = console.warn;
    const warnMessages: string[] = [];
    
    console.warn = (...args: any[]) => {
      warnMessages.push(args.join(' '));
    };
    
    try {
      const phrase = 'test phrase for warn check';
      const key = derivePrivateKeyFromPassphrase(phrase);
      generateBitcoinAddress(phrase);
      
      const hasKeyLeak = warnMessages.some(msg => 
        msg.includes(key) || msg.includes(phrase)
      );
      
      expect(hasKeyLeak).toBe(false);
    } finally {
      console.warn = originalWarn;
    }
  });

  it('should not log private keys to console.error', () => {
    const originalError = console.error;
    const errorMessages: string[] = [];
    
    console.error = (...args: any[]) => {
      errorMessages.push(args.join(' '));
    };
    
    try {
      const phrase = 'test phrase for error check';
      const key = derivePrivateKeyFromPassphrase(phrase);
      generateBitcoinAddress(phrase);
      
      const hasKeyLeak = errorMessages.some(msg => 
        msg.includes(key) || msg.includes(phrase)
      );
      
      expect(hasKeyLeak).toBe(false);
    } finally {
      console.error = originalError;
    }
  });
});

describe('WIF Format Validation', () => {
  it('should generate valid uncompressed WIF starting with 5', () => {
    const phrase = 'test phrase for wif validation';
    const privateKey = derivePrivateKeyFromPassphrase(phrase);
    const targetAddress = generateBitcoinAddressFromPrivateKey(privateKey, true);
    const bundle = generateRecoveryBundle(phrase, targetAddress, { phi: 0.5, kappa: 50, regime: 'linear' });
    
    expect(bundle.privateKeyWIF).toMatch(/^5[HJK][1-9A-HJ-NP-Za-km-z]{49}$/);
  });

  it('should generate valid compressed WIF starting with K or L', () => {
    const phrase = 'test phrase for compressed wif';
    const privateKey = derivePrivateKeyFromPassphrase(phrase);
    const targetAddress = generateBitcoinAddressFromPrivateKey(privateKey, true);
    const bundle = generateRecoveryBundle(phrase, targetAddress, { phi: 0.5, kappa: 50, regime: 'linear' });
    
    expect(bundle.privateKeyWIFCompressed).toMatch(/^[KL][1-9A-HJ-NP-Za-km-z]{51}$/);
  });

  it('should include both WIF formats in bundle', () => {
    const phrase = 'dual format test phrase';
    const privateKey = derivePrivateKeyFromPassphrase(phrase);
    const targetAddress = generateBitcoinAddressFromPrivateKey(privateKey, true);
    const bundle = generateRecoveryBundle(phrase, targetAddress, { phi: 0.5, kappa: 50, regime: 'linear' });
    
    expect(bundle.privateKeyWIF).toBeTruthy();
    expect(bundle.privateKeyWIFCompressed).toBeTruthy();
    expect(bundle.privateKeyWIF).not.toBe(bundle.privateKeyWIFCompressed);
  });
});

describe('Edge Case Handling', () => {
  it('should handle empty string phrases gracefully', () => {
    expect(() => generateBitcoinAddress('')).toThrow();
  });

  it('should handle very long phrases', () => {
    const longPhrase = 'a'.repeat(10000);
    expect(() => generateBitcoinAddress(longPhrase)).toThrow();
  });

  it('should handle unicode characters in phrases', () => {
    const unicodePhrase = 'satoshi 中本聪 🚀';
    const address = generateBitcoinAddress(unicodePhrase);
    expect(address).toMatch(/^[13][a-zA-Z0-9]{25,34}$/);
  });

  it('should handle special characters', () => {
    const specialPhrase = 'test@#$%^&*()!phrase';
    const address = generateBitcoinAddress(specialPhrase);
    expect(address).toMatch(/^[13][a-zA-Z0-9]{25,34}$/);
  });

  it('should handle newlines in phrases', () => {
    const newlinePhrase = 'test\nphrase\twith\rlines';
    const address = generateBitcoinAddress(newlinePhrase);
    expect(address).toMatch(/^[13][a-zA-Z0-9]{25,34}$/);
  });
});
