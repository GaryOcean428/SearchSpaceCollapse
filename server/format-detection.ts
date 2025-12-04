/**
 * Bitcoin Address & Mnemonic Format Detection
 * 
 * Identifies address types (Legacy, P2SH, SegWit, Taproot) and
 * mnemonic formats (BIP39, Electrum, etc.) with validation.
 */

import { BIP39_WORDS } from './bip39-words';

export type AddressFormat = 
  | 'legacy'           // P2PKH - starts with 1
  | 'p2sh'             // P2SH (nested SegWit or multisig) - starts with 3
  | 'native-segwit'    // Bech32 P2WPKH - starts with bc1q
  | 'taproot'          // Bech32m P2TR - starts with bc1p
  | 'testnet-legacy'   // Testnet P2PKH - starts with m or n
  | 'testnet-p2sh'     // Testnet P2SH - starts with 2
  | 'testnet-segwit'   // Testnet Bech32 - starts with tb1
  | 'unknown';

export type MnemonicFormat = 
  | 'bip39-12'         // Standard 12-word BIP39
  | 'bip39-15'         // 15-word BIP39
  | 'bip39-18'         // 18-word BIP39
  | 'bip39-21'         // 21-word BIP39
  | 'bip39-24'         // Standard 24-word BIP39
  | 'electrum-old'     // Old Electrum format (pre-2.0)
  | 'electrum-segwit'  // Electrum SegWit mnemonic
  | 'electrum-standard' // Electrum standard mnemonic
  | 'brain-wallet'     // Simple brain wallet passphrase
  | 'partial-bip39'    // Partial BIP39 (some valid words)
  | 'unknown';

export interface AddressFormatInfo {
  format: AddressFormat;
  isMainnet: boolean;
  isTestnet: boolean;
  scriptType: string;
  era: string;
  feeLevel: 'highest' | 'high' | 'medium' | 'low' | 'lowest';
  description: string;
  introduced: string;
  isValid: boolean;
}

export interface MnemonicFormatInfo {
  format: MnemonicFormat;
  wordCount: number;
  validBIP39Words: number;
  invalidWords: string[];
  entropyBits: number;
  checksumValid: boolean;
  description: string;
  recoveryDifficulty: 'easy' | 'medium' | 'hard' | 'very-hard';
  suggestedDerivationPaths: string[];
  isValid: boolean;
}

const BASE58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BECH32_CHARS = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

function isValidBase58(str: string): boolean {
  return str.split('').every(c => BASE58_CHARS.includes(c));
}

function isValidBech32(str: string): boolean {
  const lower = str.toLowerCase();
  return lower.split('').every(c => BECH32_CHARS.includes(c) || c === '1');
}

export function detectAddressFormat(address: string): AddressFormatInfo {
  const trimmed = address.trim();
  
  if (!trimmed || trimmed.length < 26) {
    return {
      format: 'unknown',
      isMainnet: false,
      isTestnet: false,
      scriptType: 'unknown',
      era: 'unknown',
      feeLevel: 'highest',
      description: 'Invalid or too short address',
      introduced: 'N/A',
      isValid: false,
    };
  }

  if (trimmed.startsWith('1')) {
    const isValid = trimmed.length >= 26 && trimmed.length <= 34 && isValidBase58(trimmed);
    return {
      format: 'legacy',
      isMainnet: true,
      isTestnet: false,
      scriptType: 'P2PKH (Pay-to-Public-Key-Hash)',
      era: '2009-present (original format)',
      feeLevel: 'highest',
      description: 'Legacy address - original Bitcoin format from 2009',
      introduced: '2009 (Bitcoin genesis)',
      isValid,
    };
  }

  if (trimmed.startsWith('3')) {
    const isValid = trimmed.length >= 26 && trimmed.length <= 34 && isValidBase58(trimmed);
    return {
      format: 'p2sh',
      isMainnet: true,
      isTestnet: false,
      scriptType: 'P2SH (Pay-to-Script-Hash) - SegWit compatible or multisig',
      era: '2012-present',
      feeLevel: 'high',
      description: 'P2SH address - can be nested SegWit (P2WPKH-in-P2SH) or multisig',
      introduced: '2012 (BIP16)',
      isValid,
    };
  }

  if (trimmed.toLowerCase().startsWith('bc1q')) {
    const isValid = trimmed.length >= 42 && trimmed.length <= 62 && 
                    trimmed === trimmed.toLowerCase() && 
                    isValidBech32(trimmed.slice(4));
    return {
      format: 'native-segwit',
      isMainnet: true,
      isTestnet: false,
      scriptType: 'P2WPKH (Pay-to-Witness-Public-Key-Hash) - Bech32',
      era: '2017-present',
      feeLevel: 'low',
      description: 'Native SegWit (Bech32) - most efficient format, lowercase only',
      introduced: '2017 (BIP141/BIP173)',
      isValid,
    };
  }

  if (trimmed.toLowerCase().startsWith('bc1p')) {
    const isValid = trimmed.length >= 42 && trimmed.length <= 62 && 
                    trimmed === trimmed.toLowerCase() && 
                    isValidBech32(trimmed.slice(4));
    return {
      format: 'taproot',
      isMainnet: true,
      isTestnet: false,
      scriptType: 'P2TR (Pay-to-Taproot) - Bech32m',
      era: '2021-present',
      feeLevel: 'lowest',
      description: 'Taproot address - newest format with enhanced privacy',
      introduced: '2021 (BIP341/BIP350)',
      isValid,
    };
  }

  if (trimmed.startsWith('m') || trimmed.startsWith('n')) {
    const isValid = trimmed.length >= 26 && trimmed.length <= 34 && isValidBase58(trimmed);
    return {
      format: 'testnet-legacy',
      isMainnet: false,
      isTestnet: true,
      scriptType: 'P2PKH (Testnet)',
      era: 'Testnet',
      feeLevel: 'highest',
      description: 'Testnet legacy address',
      introduced: 'Testnet',
      isValid,
    };
  }

  if (trimmed.startsWith('2')) {
    const isValid = trimmed.length >= 26 && trimmed.length <= 34 && isValidBase58(trimmed);
    return {
      format: 'testnet-p2sh',
      isMainnet: false,
      isTestnet: true,
      scriptType: 'P2SH (Testnet)',
      era: 'Testnet',
      feeLevel: 'high',
      description: 'Testnet P2SH address',
      introduced: 'Testnet',
      isValid,
    };
  }

  if (trimmed.toLowerCase().startsWith('tb1')) {
    const isValid = trimmed.length >= 42 && trimmed.length <= 62 && 
                    trimmed === trimmed.toLowerCase();
    return {
      format: 'testnet-segwit',
      isMainnet: false,
      isTestnet: true,
      scriptType: 'Bech32 (Testnet)',
      era: 'Testnet',
      feeLevel: 'low',
      description: 'Testnet SegWit address',
      introduced: 'Testnet',
      isValid,
    };
  }

  return {
    format: 'unknown',
    isMainnet: false,
    isTestnet: false,
    scriptType: 'unknown',
    era: 'unknown',
    feeLevel: 'highest',
    description: 'Unknown address format',
    introduced: 'N/A',
    isValid: false,
  };
}

const bip39WordSet = new Set(BIP39_WORDS.map(w => w.toLowerCase()));

function isBIP39Word(word: string): boolean {
  return bip39WordSet.has(word.toLowerCase());
}

function getEntropyBits(wordCount: number): number {
  const entropyMap: Record<number, number> = {
    12: 128,
    15: 160,
    18: 192,
    21: 224,
    24: 256,
  };
  return entropyMap[wordCount] || 0;
}

export function detectMnemonicFormat(phrase: string): MnemonicFormatInfo {
  const trimmed = phrase.trim().toLowerCase();
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  
  const validBIP39Words = words.filter(w => isBIP39Word(w)).length;
  const invalidWords = words.filter(w => !isBIP39Word(w));
  const bip39Ratio = wordCount > 0 ? validBIP39Words / wordCount : 0;
  
  if (wordCount === 0) {
    return {
      format: 'unknown',
      wordCount: 0,
      validBIP39Words: 0,
      invalidWords: [],
      entropyBits: 0,
      checksumValid: false,
      description: 'Empty phrase',
      recoveryDifficulty: 'very-hard',
      suggestedDerivationPaths: [],
      isValid: false,
    };
  }

  if ([12, 15, 18, 21, 24].includes(wordCount) && bip39Ratio === 1) {
    const format = `bip39-${wordCount}` as MnemonicFormat;
    const entropyBits = getEntropyBits(wordCount);
    
    return {
      format,
      wordCount,
      validBIP39Words,
      invalidWords: [],
      entropyBits,
      checksumValid: true,
      description: `Valid ${wordCount}-word BIP39 mnemonic (${entropyBits}-bit entropy)`,
      recoveryDifficulty: 'easy',
      suggestedDerivationPaths: [
        "m/44'/0'/0'/0/0",   // BIP44 Legacy
        "m/49'/0'/0'/0/0",   // BIP49 Nested SegWit
        "m/84'/0'/0'/0/0",   // BIP84 Native SegWit
        "m/86'/0'/0'/0/0",   // BIP86 Taproot
      ],
      isValid: true,
    };
  }

  if (bip39Ratio > 0.8 && wordCount >= 12) {
    return {
      format: 'partial-bip39',
      wordCount,
      validBIP39Words,
      invalidWords,
      entropyBits: 0,
      checksumValid: false,
      description: `Partial BIP39 - ${validBIP39Words}/${wordCount} valid words (${(bip39Ratio * 100).toFixed(1)}%)`,
      recoveryDifficulty: 'medium',
      suggestedDerivationPaths: [
        "m/44'/0'/0'/0/0",
        "m/49'/0'/0'/0/0",
        "m/84'/0'/0'/0/0",
      ],
      isValid: false,
    };
  }

  if (wordCount >= 12 && wordCount <= 13) {
    const hasElectrumStyle = words.some(w => !isBIP39Word(w));
    if (hasElectrumStyle) {
      return {
        format: 'electrum-standard',
        wordCount,
        validBIP39Words,
        invalidWords,
        entropyBits: 132,
        checksumValid: false,
        description: 'Possible Electrum standard mnemonic (may use different wordlist)',
        recoveryDifficulty: 'medium',
        suggestedDerivationPaths: [
          "m/0/0",           // Electrum legacy
          "m/0'/0/0",        // Electrum standard
          "m/84'/0'/0'/0/0", // If converted to BIP84
        ],
        isValid: false,
      };
    }
  }

  if (wordCount === 1) {
    return {
      format: 'brain-wallet',
      wordCount: 1,
      validBIP39Words,
      invalidWords: validBIP39Words === 0 ? [words[0]] : [],
      entropyBits: Math.floor(Math.log2(Math.pow(26, trimmed.length))),
      checksumValid: false,
      description: 'Single-word brain wallet passphrase (very weak security)',
      recoveryDifficulty: 'easy',
      suggestedDerivationPaths: [],
      isValid: true,
    };
  }

  if (wordCount >= 2 && wordCount <= 6) {
    return {
      format: 'brain-wallet',
      wordCount,
      validBIP39Words,
      invalidWords: invalidWords.length > 0 ? invalidWords : [],
      entropyBits: Math.floor(Math.log2(Math.pow(2048, wordCount))),
      checksumValid: false,
      description: `Short brain wallet passphrase (${wordCount} words)`,
      recoveryDifficulty: 'medium',
      suggestedDerivationPaths: [],
      isValid: true,
    };
  }

  if (wordCount >= 7 && wordCount < 12) {
    return {
      format: 'brain-wallet',
      wordCount,
      validBIP39Words,
      invalidWords,
      entropyBits: Math.floor(Math.log2(Math.pow(2048, wordCount))),
      checksumValid: false,
      description: `Long brain wallet or incomplete mnemonic (${wordCount} words)`,
      recoveryDifficulty: 'hard',
      suggestedDerivationPaths: [],
      isValid: true,
    };
  }

  return {
    format: 'unknown',
    wordCount,
    validBIP39Words,
    invalidWords,
    entropyBits: 0,
    checksumValid: false,
    description: `Unknown format with ${wordCount} words`,
    recoveryDifficulty: 'very-hard',
    suggestedDerivationPaths: [],
    isValid: false,
  };
}

export function isEarlyEraAddress(address: string): boolean {
  const format = detectAddressFormat(address);
  return format.format === 'legacy';
}

export function estimateAddressEra(address: string): { 
  minYear: number; 
  maxYear: number; 
  likelyEra: string;
  recoveryContext: string;
} {
  const format = detectAddressFormat(address);
  
  switch (format.format) {
    case 'legacy':
      return {
        minYear: 2009,
        maxYear: 2025,
        likelyEra: '2009-2017 (pre-SegWit era most likely)',
        recoveryContext: 'Brain wallets, early BIP39, simple passphrases common',
      };
    case 'p2sh':
      return {
        minYear: 2012,
        maxYear: 2025,
        likelyEra: '2012-2017 (multisig) or 2017+ (nested SegWit)',
        recoveryContext: 'Multisig scripts or BIP49 derivation paths',
      };
    case 'native-segwit':
      return {
        minYear: 2017,
        maxYear: 2025,
        likelyEra: '2017-present (SegWit adoption era)',
        recoveryContext: 'BIP84 derivation, modern wallet software',
      };
    case 'taproot':
      return {
        minYear: 2021,
        maxYear: 2025,
        likelyEra: '2021-present (Taproot era)',
        recoveryContext: 'BIP86 derivation, cutting-edge wallets',
      };
    default:
      return {
        minYear: 2009,
        maxYear: 2025,
        likelyEra: 'Unknown',
        recoveryContext: 'Unable to determine recovery context',
      };
  }
}

export function formatDetectionSummary(address: string): string {
  const format = detectAddressFormat(address);
  const era = estimateAddressEra(address);
  
  return `
Address: ${address}
Format: ${format.format.toUpperCase()}
Script: ${format.scriptType}
Network: ${format.isMainnet ? 'Mainnet' : format.isTestnet ? 'Testnet' : 'Unknown'}
Era: ${era.likelyEra}
Fee Level: ${format.feeLevel}
Recovery Context: ${era.recoveryContext}
Valid: ${format.isValid ? 'Yes' : 'No'}
`.trim();
}

export function mnemonicFormatSummary(phrase: string): string {
  const format = detectMnemonicFormat(phrase);
  
  return `
Format: ${format.format.toUpperCase()}
Words: ${format.wordCount}
Valid BIP39 Words: ${format.validBIP39Words}/${format.wordCount}
${format.invalidWords.length > 0 ? `Invalid Words: ${format.invalidWords.join(', ')}` : ''}
Entropy: ${format.entropyBits} bits
Recovery Difficulty: ${format.recoveryDifficulty}
${format.suggestedDerivationPaths.length > 0 ? `Suggested Paths: ${format.suggestedDerivationPaths.join(', ')}` : ''}
Description: ${format.description}
`.trim();
}

export const formatDetection = {
  detectAddressFormat,
  detectMnemonicFormat,
  isEarlyEraAddress,
  estimateAddressEra,
  formatDetectionSummary,
  mnemonicFormatSummary,
};
