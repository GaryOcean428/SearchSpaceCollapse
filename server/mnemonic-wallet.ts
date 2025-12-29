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

import { 
  deriveBIP39PrivateKey, 
  privateKeyToWIF, 
  generateBitcoinAddressFromPrivateKey, 
  generateP2SHP2WPKHAddress, 
  generateP2WPKHAddress, 
  generateP2TRAddress,
  generateBIP45Path,
  generateBIP48Path,
  generateBIP47Path
} from './crypto';
import { dormantCrossRef, type DormantAddressInfo } from './dormant-cross-ref';
import { isValidBIP39Phrase } from './bip39-words';
import { DERIVATION_PATH_CONFIG } from './ocean-config';

export interface DerivedAddress {
  address: string;              // Primary address for path type (P2PKH for BIP44, P2SH for BIP49, etc.)
  addressUncompressed: string;  // P2PKH uncompressed (2009-era legacy)
  addressP2SH?: string;         // P2SH-P2WPKH (3xxx) - for BIP49 paths
  addressSegWit?: string;       // Native SegWit (bc1q) - for BIP84 paths  
  addressTaproot?: string;      // Taproot (bc1p) - for BIP86 paths
  derivationPath: string;
  privateKeyHex: string;
  privateKeyWIF: string;
  privateKeyWIFCompressed: string;
  index: number;
  pathType: 'bip44-receive' | 'bip44-change' | 'bip49-receive' | 'bip49-change' | 'bip84-receive' | 'bip84-change' | 'bip86-receive' | 'bip86-change' | 'electrum-receive' | 'electrum-change' | 'legacy' | 'bip45-multisig' | 'bip48-p2sh' | 'bip48-p2wsh' | 'bip47-payment';
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

// Use centralized config from ocean-config.ts
// Fallback values for backwards compatibility
const getDerivationConfig = () => DERIVATION_PATH_CONFIG;

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
 * BIP49: P2WPKH-nested-in-P2SH (SegWit compatibility)
 * Purpose: 49' (0x80000031)
 * Coin type: 0' (Bitcoin)
 * Account: 0'
 * Change: 0 (receive) / 1 (change)
 */
function generateBIP49Path(index: number, account: number = 0, change: number = 0): string {
  return `m/49'/0'/${account}'/${change}/${index}`;
}

/**
 * BIP84: P2WPKH (Native SegWit)
 * Purpose: 84' (0x80000054)
 * Coin type: 0' (Bitcoin)
 * Account: 0'
 * Change: 0 (receive) / 1 (change)
 */
function generateBIP84Path(index: number, account: number = 0, change: number = 0): string {
  return `m/84'/0'/${account}'/${change}/${index}`;
}

/**
 * BIP86: P2TR (Taproot)
 * Purpose: 86' (0x80000056)
 * Coin type: 0' (Bitcoin)
 * Account: 0'
 * Change: 0 (receive) / 1 (change)
 */
function generateBIP86Path(index: number, account: number = 0, change: number = 0): string {
  return `m/86'/0'/${account}'/${change}/${index}`;
}

/**
 * Electrum legacy paths
 * Simple m/0/index for receive, m/1/index for change
 */
function generateElectrumReceivePath(index: number): string {
  return `m/0/${index}`;
}

function generateElectrumChangePath(index: number): string {
  return `m/1/${index}`;
}

/**
 * Derive addresses from mnemonic with full key information
 * Generates the appropriate address format(s) based on path type:
 * - BIP44/Legacy/Electrum: P2PKH (1xxx) - compressed and uncompressed
 * - BIP49: P2SH-P2WPKH (3xxx) - SegWit wrapped in P2SH
 * - BIP84: P2WPKH (bc1q...) - Native SegWit
 * - BIP86: P2TR (bc1p...) - Taproot
 * 
 * USES PROPER BIP39 DERIVATION:
 * 1. PBKDF2(mnemonic, "mnemonic", 2048 rounds) → seed
 * 2. HMAC-SHA512(seed, "Bitcoin seed") → master key
 * 3. BIP32 path derivation → child key
 * 
 * CRITICAL: Returns BOTH compressed and uncompressed P2PKH addresses
 * 2009-era wallets used uncompressed keys exclusively!
 */
function deriveAddressWithKeys(mnemonic: string, path: string, index: number, pathType: DerivedAddress['pathType']): DerivedAddress {
  const privateKeyHex = deriveBIP39PrivateKey(mnemonic, path);
  
  // Always generate P2PKH addresses (for cross-checking)
  const addressCompressed = generateBitcoinAddressFromPrivateKey(privateKeyHex, true);
  const addressUncompressed = generateBitcoinAddressFromPrivateKey(privateKeyHex, false);
  const privateKeyWIF = privateKeyToWIF(privateKeyHex, false);
  const privateKeyWIFCompressed = privateKeyToWIF(privateKeyHex, true);

  // Base result with P2PKH addresses
  const result: DerivedAddress = {
    address: addressCompressed, // Default to compressed P2PKH
    addressUncompressed,
    derivationPath: path,
    privateKeyHex,
    privateKeyWIF,
    privateKeyWIFCompressed,
    index,
    pathType,
  };

  // Generate path-specific addresses (keep P2PKH as primary for cross-checking)
  // Also populate the path-specific optional fields for proper format queueing
  try {
    if (pathType === 'bip49-receive' || pathType === 'bip49-change') {
      // BIP49: P2SH-P2WPKH (3xxx) - generate as optional field for this path
      result.addressP2SH = generateP2SHP2WPKHAddress(privateKeyHex);
    } else if (pathType === 'bip84-receive' || pathType === 'bip84-change') {
      // BIP84: Native SegWit P2WPKH (bc1q) - generate as optional field for this path
      result.addressSegWit = generateP2WPKHAddress(privateKeyHex);
    } else if (pathType === 'bip86-receive' || pathType === 'bip86-change') {
      // BIP86: Taproot P2TR (bc1p) - generate as optional field for this path
      result.addressTaproot = generateP2TRAddress(privateKeyHex);
    }
    // BIP44/Legacy/Electrum: Only P2PKH (already set as primary)
  } catch (error) {
    // If SegWit/Taproot generation fails, log error but continue with P2PKH
    console.error(`[MnemonicWallet] Error generating ${pathType} address:`, error);
  }

  return result;
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

  const config = getDerivationConfig();
  const bip44ReceiveCount = options?.bip44ReceiveCount ?? config.BIP44_RECEIVE_COUNT;
  const bip44ChangeCount = options?.bip44ChangeCount ?? config.BIP44_CHANGE_COUNT;
  const accountCount = options?.accountCount ?? config.BIP44_ACCOUNT_COUNT;
  const legacyCount = options?.legacyCount ?? config.LEGACY_COUNT;

  const addresses: DerivedAddress[] = [];

  try {
    // Derive from multiple accounts (some wallets use account 1, 2, etc.)
    for (let account = 0; account < accountCount; account++) {
      // BIP44 Receiving addresses (P2PKH - 1xxx)
      for (let i = 0; i < bip44ReceiveCount; i++) {
        const path = generateBIP44ReceivePath(i, account);
        addresses.push(deriveAddressWithKeys(trimmedMnemonic, path, i, 'bip44-receive'));
      }

      // BIP44 Change addresses
      for (let i = 0; i < bip44ChangeCount; i++) {
        const path = generateBIP44ChangePath(i, account);
        addresses.push(deriveAddressWithKeys(trimmedMnemonic, path, i, 'bip44-change'));
      }
    }

    // BIP49 P2SH-P2WPKH (3xxx - SegWit compatible) - with extended account support
    if (config.BIP49_ENABLED) {
      const bip49AccountCount = config.BIP49_ACCOUNT_COUNT || accountCount;
      for (let account = 0; account < bip49AccountCount; account++) {
        for (let i = 0; i < config.BIP49_RECEIVE_COUNT; i++) {
          const path = generateBIP49Path(i, account, 0);
          addresses.push(deriveAddressWithKeys(trimmedMnemonic, path, i, 'bip49-receive'));
        }
        for (let i = 0; i < config.BIP49_CHANGE_COUNT; i++) {
          const path = generateBIP49Path(i, account, 1);
          addresses.push(deriveAddressWithKeys(trimmedMnemonic, path, i, 'bip49-change'));
        }
      }
    }

    // BIP84 Native SegWit P2WPKH (bc1q) - with extended account support
    if (config.BIP84_ENABLED) {
      const bip84AccountCount = config.BIP84_ACCOUNT_COUNT || accountCount;
      for (let account = 0; account < bip84AccountCount; account++) {
        for (let i = 0; i < config.BIP84_RECEIVE_COUNT; i++) {
          const path = generateBIP84Path(i, account, 0);
          addresses.push(deriveAddressWithKeys(trimmedMnemonic, path, i, 'bip84-receive'));
        }
        for (let i = 0; i < config.BIP84_CHANGE_COUNT; i++) {
          const path = generateBIP84Path(i, account, 1);
          addresses.push(deriveAddressWithKeys(trimmedMnemonic, path, i, 'bip84-change'));
        }
      }
    }

    // BIP86 Taproot P2TR (bc1p) - with extended account support
    if (config.BIP86_ENABLED) {
      const bip86AccountCount = config.BIP86_ACCOUNT_COUNT || accountCount;
      for (let account = 0; account < bip86AccountCount; account++) {
        for (let i = 0; i < config.BIP86_RECEIVE_COUNT; i++) {
          const path = generateBIP86Path(i, account, 0);
          addresses.push(deriveAddressWithKeys(trimmedMnemonic, path, i, 'bip86-receive'));
        }
        for (let i = 0; i < config.BIP86_CHANGE_COUNT; i++) {
          const path = generateBIP86Path(i, account, 1);
          addresses.push(deriveAddressWithKeys(trimmedMnemonic, path, i, 'bip86-change'));
        }
      }
    }

    // Electrum legacy paths (m/0/i and m/1/i)
    if (config.ELECTRUM_ENABLED) {
      for (let i = 0; i < config.ELECTRUM_RECEIVE_COUNT; i++) {
        const path = generateElectrumReceivePath(i);
        addresses.push(deriveAddressWithKeys(trimmedMnemonic, path, i, 'electrum-receive'));
      }
      for (let i = 0; i < config.ELECTRUM_CHANGE_COUNT; i++) {
        const path = generateElectrumChangePath(i);
        addresses.push(deriveAddressWithKeys(trimmedMnemonic, path, i, 'electrum-change'));
      }
    }

    // Legacy pre-BIP44 paths
    if (config.LEGACY_ENABLED) {
      for (let i = 0; i < legacyCount; i++) {
        const path = generateLegacyPath(i);
        addresses.push(deriveAddressWithKeys(trimmedMnemonic, path, i, 'legacy'));
      }
    }
    
    // BIP45 Multisig paths (for shared/multisig wallets)
    if (config.MULTISIG_ENABLED && config.MULTISIG_BIP45_COUNT > 0) {
      // Check multiple cosigner indices (configurable, default 3)
      const cosignerCount = config.MULTISIG_BIP45_COSIGNER_COUNT || 3;
      for (let cosigner = 0; cosigner < cosignerCount; cosigner++) {
        const addressLimit = Math.min(config.MULTISIG_BIP45_COUNT, 20);
        for (let i = 0; i < addressLimit; i++) {
          // Receive addresses
          const receivePath = generateBIP45Path(cosigner, 0, i);
          addresses.push(deriveAddressWithKeys(trimmedMnemonic, receivePath, i, 'bip45-multisig'));
          
          // Change addresses
          const changePath = generateBIP45Path(cosigner, 1, i);
          addresses.push(deriveAddressWithKeys(trimmedMnemonic, changePath, i, 'bip45-multisig'));
        }
      }
    }
    
    // BIP48 Multisig SegWit paths
    if (config.MULTISIG_ENABLED && config.MULTISIG_BIP48_COUNT > 0) {
      // Check account 0 only for multisig
      for (let i = 0; i < Math.min(config.MULTISIG_BIP48_COUNT, 20); i++) {
        // Script type 1: P2SH-P2WSH
        const p2shPath = generateBIP48Path(0, 1, 0, i);
        addresses.push(deriveAddressWithKeys(trimmedMnemonic, p2shPath, i, 'bip48-p2sh'));
        
        // Script type 2: P2WSH
        const p2wshPath = generateBIP48Path(0, 2, 0, i);
        addresses.push(deriveAddressWithKeys(trimmedMnemonic, p2wshPath, i, 'bip48-p2wsh'));
      }
    }
    
    // BIP47 Payment Codes (reusable payment addresses)
    if (config.BIP47_ENABLED && config.BIP47_COUNT > 0) {
      for (let i = 0; i < Math.min(config.BIP47_COUNT, 10); i++) {
        const path = generateBIP47Path(i);
        addresses.push(deriveAddressWithKeys(trimmedMnemonic, path, i, 'bip47-payment'));
      }
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
  const config = getDerivationConfig();
  const paths: Array<{ path: string; type: string; description: string }> = [];

  // BIP44 (P2PKH - 1xxx addresses)
  for (let i = 0; i < config.BIP44_RECEIVE_COUNT; i++) {
    paths.push({
      path: generateBIP44ReceivePath(i),
      type: 'BIP44 Receive',
      description: `P2PKH receiving address #${i + 1}`,
    });
  }
  for (let i = 0; i < config.BIP44_CHANGE_COUNT; i++) {
    paths.push({
      path: generateBIP44ChangePath(i),
      type: 'BIP44 Change',
      description: `P2PKH change address #${i + 1}`,
    });
  }

  // BIP49 (P2SH-P2WPKH - 3xxx addresses)
  if (config.BIP49_ENABLED) {
    for (let i = 0; i < config.BIP49_RECEIVE_COUNT; i++) {
      paths.push({
        path: generateBIP49Path(i),
        type: 'BIP49 SegWit',
        description: `P2SH-P2WPKH address #${i + 1}`,
      });
    }
  }

  // BIP84 (P2WPKH - bc1q addresses)
  if (config.BIP84_ENABLED) {
    for (let i = 0; i < config.BIP84_RECEIVE_COUNT; i++) {
      paths.push({
        path: generateBIP84Path(i),
        type: 'BIP84 Native SegWit',
        description: `P2WPKH address #${i + 1}`,
      });
    }
  }

  // BIP86 (P2TR - bc1p Taproot addresses)
  if (config.BIP86_ENABLED) {
    for (let i = 0; i < config.BIP86_RECEIVE_COUNT; i++) {
      paths.push({
        path: generateBIP86Path(i),
        type: 'BIP86 Taproot',
        description: `P2TR Taproot address #${i + 1}`,
      });
    }
  }

  // Electrum legacy paths
  if (config.ELECTRUM_ENABLED) {
    for (let i = 0; i < config.ELECTRUM_RECEIVE_COUNT; i++) {
      paths.push({
        path: generateElectrumReceivePath(i),
        type: 'Electrum',
        description: `Electrum receive address #${i + 1}`,
      });
    }
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
  bip86Paths: number;
  electrumPaths: number;
  legacyPaths: number;
} {
  const config = getDerivationConfig();
  const bip44Total = (config.BIP44_RECEIVE_COUNT + config.BIP44_CHANGE_COUNT) * config.BIP44_ACCOUNT_COUNT;
  const bip49Total = config.BIP49_ENABLED ? (config.BIP49_RECEIVE_COUNT + config.BIP49_CHANGE_COUNT) * config.BIP44_ACCOUNT_COUNT : 0;
  const bip84Total = config.BIP84_ENABLED ? (config.BIP84_RECEIVE_COUNT + config.BIP84_CHANGE_COUNT) * config.BIP44_ACCOUNT_COUNT : 0;
  const bip86Total = config.BIP86_ENABLED ? (config.BIP86_RECEIVE_COUNT + config.BIP86_CHANGE_COUNT) * config.BIP44_ACCOUNT_COUNT : 0;
  const electrumTotal = config.ELECTRUM_ENABLED ? config.ELECTRUM_RECEIVE_COUNT + config.ELECTRUM_CHANGE_COUNT : 0;
  const legacyTotal = config.LEGACY_ENABLED ? config.LEGACY_COUNT : 0;

  return {
    totalPathsPerMnemonic: bip44Total + bip49Total + bip84Total + bip86Total + electrumTotal + legacyTotal,
    bip44ReceivePaths: config.BIP44_RECEIVE_COUNT * config.BIP44_ACCOUNT_COUNT,
    bip44ChangePaths: config.BIP44_CHANGE_COUNT * config.BIP44_ACCOUNT_COUNT,
    bip49Paths: bip49Total,
    bip84Paths: bip84Total,
    bip86Paths: bip86Total,
    electrumPaths: electrumTotal,
    legacyPaths: legacyTotal,
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
