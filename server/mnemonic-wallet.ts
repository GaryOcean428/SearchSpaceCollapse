/**
 * Mnemonic Wallet Recovery Service
 * 
 * Properly derives MULTIPLE addresses from BIP39 mnemonic phrases using
 * standard HD wallet derivation paths (BIP32/44/49/84).
 * 
 * The problem: Brain wallets derive ONE address per passphrase.
 * Real BIP39 wallets derive MANY addresses from a single mnemonic.
 * 
 * This service expands each mnemonic into 50+ addresses and checks each
 * against the dormant target addresses.
 * 
 * Standard paths checked:
 * - BIP44: m/44'/0'/0'/0/0 to m/44'/0'/0'/0/19 (20 receiving addresses)
 * - BIP44: m/44'/0'/0'/1/0 to m/44'/0'/0'/1/9 (10 change addresses)
 * - BIP49: m/49'/0'/0'/0/0 to m/49'/0'/0'/0/9 (10 SegWit-compatible)
 * - BIP84: m/84'/0'/0'/0/0 to m/84'/0'/0'/0/9 (10 Native SegWit)
 * 
 * Total: 50 addresses per mnemonic
 */

import { deriveBIP32Address, deriveBIP32PrivateKey, privateKeyToWIF, generateBitcoinAddressFromPrivateKey } from './crypto';
import { dormantCrossRef, type DormantAddressInfo } from './dormant-cross-ref';
import { isValidBIP39Phrase } from './bip39-words';

export interface DerivedAddress {
  address: string;
  derivationPath: string;
  privateKeyHex: string;
  privateKeyWIF: string;
  privateKeyWIFCompressed: string;
  index: number;
  pathType: 'bip44-receive' | 'bip44-change' | 'legacy';
}

export interface MnemonicDerivationResult {
  mnemonic: string;
  isValidBIP39: boolean;
  addresses: DerivedAddress[];
  totalDerived: number;
  derivationTime: number;
}

export interface MnemonicMatch {
  mnemonic: string;
  address: string;
  derivationPath: string;
  privateKeyHex: string;
  privateKeyWIF: string;
  privateKeyWIFCompressed: string;
  pathType: string;
  dormantInfo: DormantAddressInfo;
}

export interface MnemonicCheckResult {
  mnemonic: string;
  isValidBIP39: boolean;
  totalAddressesChecked: number;
  matches: MnemonicMatch[];
  hasMatch: boolean;
  checkTime: number;
}

const DERIVATION_PATHS = {
  BIP44_RECEIVE_COUNT: 20,
  BIP44_CHANGE_COUNT: 10,
  // Additional accounts for multi-account wallets
  BIP44_ACCOUNT_COUNT: 3,
  // Legacy paths (pre-BIP44) used by early wallets
  LEGACY_COUNT: 10,
};

function generateBIP44ReceivePath(index: number, account: number = 0): string {
  return `m/44'/0'/${account}'/0/${index}`;
}

function generateBIP44ChangePath(index: number, account: number = 0): string {
  return `m/44'/0'/${account}'/1/${index}`;
}

function generateLegacyPath(index: number): string {
  // Simple m/0/index path used by very early wallets
  return `m/0/${index}`;
}

/**
 * Derive a single P2PKH address from mnemonic with full key information
 * All dormant 2009-era addresses are P2PKH format (starting with 1)
 */
function deriveAddressWithKeys(mnemonic: string, path: string, index: number, pathType: DerivedAddress['pathType']): DerivedAddress {
  const privateKeyHex = deriveBIP32PrivateKey(mnemonic, path);
  // Generate both compressed and uncompressed P2PKH addresses
  const addressCompressed = generateBitcoinAddressFromPrivateKey(privateKeyHex, true);
  const addressUncompressed = generateBitcoinAddressFromPrivateKey(privateKeyHex, false);
  const privateKeyWIF = privateKeyToWIF(privateKeyHex, false);
  const privateKeyWIFCompressed = privateKeyToWIF(privateKeyHex, true);
  
  return {
    address: addressCompressed, // Primary address (compressed)
    derivationPath: path,
    privateKeyHex,
    privateKeyWIF,
    privateKeyWIFCompressed,
    index,
    pathType,
  };
}

/**
 * Derive multiple P2PKH addresses from a BIP39 mnemonic phrase
 * 
 * Uses standard HD wallet derivation paths for P2PKH (legacy) addresses:
 * - BIP44 (m/44'/0'/0'/0/x): Standard receiving addresses (first 20)
 * - BIP44 change (m/44'/0'/0'/1/x): Change addresses (first 10)
 * - BIP44 accounts 1-2: Additional accounts that some wallets use
 * - Legacy (m/0/x): Very early HD wallet format
 * 
 * Note: All derived addresses are P2PKH format (1xxx) since 2009-2013 era
 * dormant addresses exclusively use this format. BIP49 (3xxx) and BIP84 (bc1)
 * are not included as they weren't used until much later.
 */
export function deriveMnemonicAddresses(mnemonic: string, options?: {
  bip44ReceiveCount?: number;
  bip44ChangeCount?: number;
  accountCount?: number;
  legacyCount?: number;
}): MnemonicDerivationResult {
  const startTime = Date.now();
  
  if (!mnemonic || typeof mnemonic !== 'string') {
    return {
      mnemonic: mnemonic || '',
      isValidBIP39: false,
      addresses: [],
      totalDerived: 0,
      derivationTime: Date.now() - startTime,
    };
  }
  
  const trimmedMnemonic = mnemonic.trim();
  const isValidBIP39 = isValidBIP39Phrase(trimmedMnemonic);
  
  const bip44ReceiveCount = options?.bip44ReceiveCount ?? DERIVATION_PATHS.BIP44_RECEIVE_COUNT;
  const bip44ChangeCount = options?.bip44ChangeCount ?? DERIVATION_PATHS.BIP44_CHANGE_COUNT;
  const accountCount = options?.accountCount ?? DERIVATION_PATHS.BIP44_ACCOUNT_COUNT;
  const legacyCount = options?.legacyCount ?? DERIVATION_PATHS.LEGACY_COUNT;
  
  const addresses: DerivedAddress[] = [];
  
  try {
    // Derive from multiple accounts (some wallets use account 1, 2, etc.)
    for (let account = 0; account < accountCount; account++) {
      // Receiving addresses
      for (let i = 0; i < bip44ReceiveCount; i++) {
        const path = generateBIP44ReceivePath(i, account);
        addresses.push(deriveAddressWithKeys(trimmedMnemonic, path, i, 'bip44-receive'));
      }
      
      // Change addresses
      for (let i = 0; i < bip44ChangeCount; i++) {
        const path = generateBIP44ChangePath(i, account);
        addresses.push(deriveAddressWithKeys(trimmedMnemonic, path, i, 'bip44-change'));
      }
    }
    
    // Legacy paths (pre-BIP44)
    for (let i = 0; i < legacyCount; i++) {
      const path = generateLegacyPath(i);
      addresses.push(deriveAddressWithKeys(trimmedMnemonic, path, i, 'legacy'));
    }
  } catch (error) {
    console.error('[MnemonicWallet] Error deriving addresses:', error);
  }
  
  return {
    mnemonic: trimmedMnemonic,
    isValidBIP39,
    addresses,
    totalDerived: addresses.length,
    derivationTime: Date.now() - startTime,
  };
}

/**
 * Check a mnemonic phrase against all known dormant addresses
 * 
 * This is the key function for mnemonic-based wallet recovery:
 * 1. Derives 50+ addresses from the mnemonic
 * 2. Checks each address against the dormant address database
 * 3. Returns any matches with full recovery information
 */
export function checkMnemonicAgainstDormant(mnemonic: string): MnemonicCheckResult {
  const startTime = Date.now();
  
  if (!mnemonic || typeof mnemonic !== 'string') {
    return {
      mnemonic: mnemonic || '',
      isValidBIP39: false,
      totalAddressesChecked: 0,
      matches: [],
      hasMatch: false,
      checkTime: Date.now() - startTime,
    };
  }
  
  const derivationResult = deriveMnemonicAddresses(mnemonic);
  const matches: MnemonicMatch[] = [];
  
  for (const derived of derivationResult.addresses) {
    if (dormantCrossRef.isKnownDormant(derived.address)) {
      const dormantInfo = dormantCrossRef.getInfo(derived.address);
      
      if (dormantInfo) {
        matches.push({
          mnemonic: derivationResult.mnemonic,
          address: derived.address,
          derivationPath: derived.derivationPath,
          privateKeyHex: derived.privateKeyHex,
          privateKeyWIF: derived.privateKeyWIF,
          privateKeyWIFCompressed: derived.privateKeyWIFCompressed,
          pathType: derived.pathType,
          dormantInfo,
        });
        
        console.log(`[MnemonicWallet] 🎯 DORMANT MATCH FOUND!`);
        console.log(`[MnemonicWallet]   Mnemonic: ${mnemonic.substring(0, 30)}...`);
        console.log(`[MnemonicWallet]   Address: ${derived.address}`);
        console.log(`[MnemonicWallet]   Path: ${derived.derivationPath}`);
        console.log(`[MnemonicWallet]   Balance: ${dormantInfo.balanceBTC} BTC`);
        console.log(`[MnemonicWallet]   Rank: #${dormantInfo.rank}`);
      }
    }
  }
  
  return {
    mnemonic: derivationResult.mnemonic,
    isValidBIP39: derivationResult.isValidBIP39,
    totalAddressesChecked: derivationResult.totalDerived,
    matches,
    hasMatch: matches.length > 0,
    checkTime: Date.now() - startTime,
  };
}

/**
 * Get all standard derivation paths that will be checked
 * Useful for UI display and verification
 */
export function getStandardDerivationPaths(): Array<{
  path: string;
  type: string;
  description: string;
}> {
  const paths: Array<{ path: string; type: string; description: string }> = [];
  
  for (let i = 0; i < DERIVATION_PATHS.BIP44_RECEIVE_COUNT; i++) {
    paths.push({
      path: generateBIP44ReceivePath(i),
      type: 'BIP44 Receive',
      description: `Receiving address #${i + 1}`,
    });
  }
  
  for (let i = 0; i < DERIVATION_PATHS.BIP44_CHANGE_COUNT; i++) {
    paths.push({
      path: generateBIP44ChangePath(i),
      type: 'BIP44 Change',
      description: `Change address #${i + 1}`,
    });
  }
  
  for (let i = 0; i < DERIVATION_PATHS.BIP49_COUNT; i++) {
    paths.push({
      path: generateBIP49Path(i),
      type: 'BIP49 SegWit',
      description: `SegWit-compatible address #${i + 1}`,
    });
  }
  
  for (let i = 0; i < DERIVATION_PATHS.BIP84_COUNT; i++) {
    paths.push({
      path: generateBIP84Path(i),
      type: 'BIP84 Native SegWit',
      description: `Native SegWit address #${i + 1}`,
    });
  }
  
  return paths;
}

/**
 * Get statistics about mnemonic derivation configuration
 */
export function getMnemonicStats(): {
  totalPathsPerMnemonic: number;
  bip44ReceivePaths: number;
  bip44ChangePaths: number;
  bip49Paths: number;
  bip84Paths: number;
} {
  return {
    totalPathsPerMnemonic: 
      DERIVATION_PATHS.BIP44_RECEIVE_COUNT + 
      DERIVATION_PATHS.BIP44_CHANGE_COUNT + 
      DERIVATION_PATHS.BIP49_COUNT + 
      DERIVATION_PATHS.BIP84_COUNT,
    bip44ReceivePaths: DERIVATION_PATHS.BIP44_RECEIVE_COUNT,
    bip44ChangePaths: DERIVATION_PATHS.BIP44_CHANGE_COUNT,
    bip49Paths: DERIVATION_PATHS.BIP49_COUNT,
    bip84Paths: DERIVATION_PATHS.BIP84_COUNT,
  };
}

/**
 * Batch check multiple mnemonics against dormant addresses
 * More efficient for bulk processing
 */
export function batchCheckMnemonicsAgainstDormant(mnemonics: string[]): {
  totalMnemonics: number;
  totalAddressesChecked: number;
  allMatches: MnemonicMatch[];
  mnemonicsWithMatches: number;
  checkTime: number;
} {
  const startTime = Date.now();
  const allMatches: MnemonicMatch[] = [];
  let totalAddresses = 0;
  let mnemonicsWithMatches = 0;
  
  for (const mnemonic of mnemonics) {
    const result = checkMnemonicAgainstDormant(mnemonic);
    totalAddresses += result.totalAddressesChecked;
    
    if (result.hasMatch) {
      mnemonicsWithMatches++;
      allMatches.push(...result.matches);
    }
  }
  
  return {
    totalMnemonics: mnemonics.length,
    totalAddressesChecked: totalAddresses,
    allMatches,
    mnemonicsWithMatches,
    checkTime: Date.now() - startTime,
  };
}
