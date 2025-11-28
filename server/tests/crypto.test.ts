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
  it('should not log private keys to console', () => {
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
});
