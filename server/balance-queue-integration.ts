/**
 * Balance Queue Integration
 * 
 * Central integration point that ensures EVERY generated address
 * gets queued for balance checking. This is the missing link that
 * caused the balance queue to starve after initial hits.
 * 
 * Call queueAddressForBalanceCheck() from:
 * - recordProbe() in geometric-memory.ts
 * - testHypothesis() in ocean-discovery-controller.ts
 * - investigatePhrase() in routes.ts
 * - any other address generation point
 * 
 * IMPORTANT: This module also tracks tested phrases in PostgreSQL
 * via tested_phrases_index table for deduplication across sessions.
 */

import { derivePrivateKeyFromPassphrase, privateKeyToWIF, generateBothAddresses } from './crypto';
import { balanceQueue } from './balance-queue';
import { deriveMnemonicAddresses, checkMnemonicAgainstDormant } from './mnemonic-wallet';
import { oceanPersistence } from './ocean/ocean-persistence';
import { testedEmptyTracker } from './tested-empty-tracker';
import { isValidBIP39Phrase } from './bip39-words';

interface QueuedAddressResult {
  passphrase: string;
  compressedAddress: string;
  uncompressedAddress: string;
  compressedWif: string;
  uncompressedWif: string;
  compressedQueued: boolean;
  uncompressedQueued: boolean;
  skippedTestedEmpty: boolean;
}

interface QueueStats {
  totalQueued: number;
  lastQueueTime: number;
  sourceBreakdown: Record<string, number>;
}

const stats: QueueStats = {
  totalQueued: 0,
  lastQueueTime: 0,
  sourceBreakdown: {}
};

/**
 * Queue BOTH compressed and uncompressed addresses for a passphrase
 * This is the SINGLE entry point for all address generation
 * 
 * TIER-WEIGHTED PRIORITY:
 * - Priority is now dynamically computed based on near-miss tier and Φ value
 * - HOT tier entries get priority 10+, WARM 5+, COOL 1+
 * - Escalating entries get additional boost
 * 
 * @param passphrase - The passphrase to generate addresses from
 * @param source - Where this address came from (for metrics)
 * @param priority - Base priority (will be boosted by tier weight)
 * @param nearMissTier - Optional tier from near-miss manager
 * @param phi - Optional Φ value for priority computation
 * @returns The generated addresses and whether they were queued
 */
export function queueAddressForBalanceCheck(
  passphrase: string,
  source: string = 'unknown',
  priority: number = 1,
  nearMissTier?: 'hot' | 'warm' | 'cool',
  phi?: number
): QueuedAddressResult | null {
  try {
    if (!passphrase || typeof passphrase !== 'string' || passphrase.length === 0) {
      return null;
    }

    // Generate private key
    const privateKeyHex = derivePrivateKeyFromPassphrase(passphrase);
    
    // Generate BOTH addresses (critical for 2009-era recovery)
    const addresses = generateBothAddresses(passphrase);
    
    // Check if EITHER address has already been tested and found empty
    // This prevents re-testing the same 148 high-Φ addresses repeatedly
    const compressedTestedEmpty = testedEmptyTracker.isTestedEmpty(addresses.compressed);
    const uncompressedTestedEmpty = testedEmptyTracker.isTestedEmpty(addresses.uncompressed);
    
    if (compressedTestedEmpty && uncompressedTestedEmpty) {
      // Both addresses already tested empty - skip entirely
      return {
        passphrase,
        compressedAddress: addresses.compressed,
        uncompressedAddress: addresses.uncompressed,
        compressedWif: '',
        uncompressedWif: '',
        compressedQueued: false,
        uncompressedQueued: false,
        skippedTestedEmpty: true,
      };
    }
    
    // Generate WIF keys for both
    const compressedWif = privateKeyToWIF(privateKeyHex, true);
    const uncompressedWif = privateKeyToWIF(privateKeyHex, false);
    
    // Map source string to valid source type for persistence
    const sourceType = (source === 'python' || source === 'mnemonic' || source === 'manual') 
      ? source as 'python' | 'mnemonic' | 'manual'
      : 'typescript';
    
    // Compute tier-weighted priority
    let effectivePriority = priority;
    if (nearMissTier) {
      const tierBoost = nearMissTier === 'hot' ? 10 : nearMissTier === 'warm' ? 5 : 1;
      const phiBoost = phi ? Math.round(phi * 10) : 0;
      effectivePriority = priority + tierBoost + phiBoost;
    }
    
    // Queue both addresses (balance-queue.ts will also skip tested-empty internally)
    const result = balanceQueue.enqueueBoth(
      addresses.compressed,
      addresses.uncompressed,
      passphrase,
      compressedWif,
      uncompressedWif,
      { priority: effectivePriority, source: sourceType }
    );
    
    // Track tested phrase in PostgreSQL for deduplication
    if (result.compressed || result.uncompressed) {
      oceanPersistence.markTested(passphrase).catch(err => {
        console.error('[BalanceQueueIntegration] Failed to mark phrase tested:', err);
      });
    }
    
    // Update stats
    stats.totalQueued += (result.compressed ? 1 : 0) + (result.uncompressed ? 1 : 0);
    stats.lastQueueTime = Date.now();
    stats.sourceBreakdown[source] = (stats.sourceBreakdown[source] || 0) + (result.compressed ? 1 : 0) + (result.uncompressed ? 1 : 0);
    
    // Log significant events
    if (stats.totalQueued % 100 === 0) {
      console.log(`[BalanceQueueIntegration] Queued ${stats.totalQueued} addresses total. Sources:`, stats.sourceBreakdown);
    }
    
    return {
      passphrase,
      compressedAddress: addresses.compressed,
      uncompressedAddress: addresses.uncompressed,
      compressedWif,
      uncompressedWif,
      compressedQueued: result.compressed,
      uncompressedQueued: result.uncompressed,
      skippedTestedEmpty: false,
    };
  } catch (error) {
    console.error('[BalanceQueueIntegration] Error queuing address:', error);
    return null;
  }
}

/**
 * Queue an address from a pre-computed private key
 * Used when the private key is already known (e.g., from hex input)
 */
export function queueAddressFromPrivateKey(
  privateKeyHex: string,
  passphrase: string,
  source: string = 'private-key',
  priority: number = 1
): QueuedAddressResult | null {
  try {
    if (!privateKeyHex || privateKeyHex.length !== 64) {
      return null;
    }

    // Generate BOTH addresses from private key
    const { generateBothAddressesFromPrivateKey } = require('./crypto');
    const addresses = generateBothAddressesFromPrivateKey(privateKeyHex);
    
    // Generate WIF keys
    const compressedWif = privateKeyToWIF(privateKeyHex, true);
    const uncompressedWif = privateKeyToWIF(privateKeyHex, false);
    
    // Map source string to valid source type for persistence
    const sourceType = (source === 'python' || source === 'mnemonic' || source === 'manual') 
      ? source as 'python' | 'mnemonic' | 'manual'
      : 'typescript';
    
    // Queue both addresses
    const result = balanceQueue.enqueueBoth(
      addresses.compressed,
      addresses.uncompressed,
      passphrase,
      compressedWif,
      uncompressedWif,
      { priority, source: sourceType }
    );
    
    // Track tested phrase in PostgreSQL for deduplication
    if (result.compressed || result.uncompressed) {
      oceanPersistence.markTested(passphrase).catch(err => {
        console.error('[BalanceQueueIntegration] Failed to mark phrase tested:', err);
      });
    }
    
    // Update stats
    stats.totalQueued += (result.compressed ? 1 : 0) + (result.uncompressed ? 1 : 0);
    stats.lastQueueTime = Date.now();
    stats.sourceBreakdown[source] = (stats.sourceBreakdown[source] || 0) + (result.compressed ? 1 : 0) + (result.uncompressed ? 1 : 0);
    
    return {
      passphrase,
      compressedAddress: addresses.compressed,
      uncompressedAddress: addresses.uncompressed,
      compressedWif,
      uncompressedWif,
      compressedQueued: result.compressed,
      uncompressedQueued: result.uncompressed,
      skippedTestedEmpty: false,
    };
  } catch (error) {
    console.error('[BalanceQueueIntegration] Error queuing from private key:', error);
    return null;
  }
}

/**
 * Get queue integration stats
 */
export function getQueueIntegrationStats(): QueueStats & { queueSize: number } {
  return {
    ...stats,
    queueSize: balanceQueue.size()
  };
}

/**
 * Batch queue multiple passphrases
 * More efficient than individual calls
 */
export function batchQueueAddresses(
  passphrases: string[],
  source: string = 'batch',
  priority: number = 1
): { queued: number; failed: number } {
  let queued = 0;
  let failed = 0;
  
  for (const passphrase of passphrases) {
    const result = queueAddressForBalanceCheck(passphrase, source, priority);
    if (result && (result.compressedQueued || result.uncompressedQueued)) {
      queued++;
    } else {
      failed++;
    }
  }
  
  console.log(`[BalanceQueueIntegration] Batch queued ${queued} passphrases from ${source}, ${failed} failed`);
  
  return { queued, failed };
}

/**
 * Result of queueing a mnemonic for balance checking
 */
export interface QueuedMnemonicResult {
  mnemonic: string;
  totalPaths: number;
  totalAddresses: number;
  queuedAddresses: number;
  failedAddresses: number;
  dormantMatches: number;
  derivedAddresses: Array<{
    addressCompressed: string;
    addressUncompressed: string;
    path: string;
    compressedQueued: boolean;
    uncompressedQueued: boolean;
    isDormant: boolean;
  }>;
}

/**
 * Queue ALL derived addresses from a BIP39 mnemonic for balance checking
 * 
 * This is the proper way to check mnemonic-based wallets:
 * 1. Derives 50+ addresses using standard HD paths (BIP44/49/84)
 * 2. Generates BOTH compressed AND uncompressed addresses per path
 * 3. Checks each against dormant target addresses
 * 4. Queues each for blockchain balance verification
 * 
 * CRITICAL: Each derivation path yields 2 addresses (compressed + uncompressed)
 * 2009-era wallets used uncompressed keys exclusively!
 * 
 * @param mnemonic - BIP39 mnemonic phrase (12-24 words)
 * @param source - Tracking source for metrics
 * @param priority - Queue priority (higher = checked first)
 * @returns Details about all derived and queued addresses
 */
export function queueMnemonicForBalanceCheck(
  mnemonic: string,
  source: string = 'mnemonic',
  priority: number = 2
): QueuedMnemonicResult | null {
  try {
    if (!mnemonic || typeof mnemonic !== 'string' || mnemonic.trim().length === 0) {
      return null;
    }
    
    const derivationResult = deriveMnemonicAddresses(mnemonic);
    
    if (derivationResult.totalDerived === 0) {
      console.warn(`[BalanceQueueIntegration] No addresses derived from mnemonic`);
      return null;
    }
    
    const dormantCheckResult = checkMnemonicAgainstDormant(mnemonic);
    
    let queuedCount = 0;
    let failedCount = 0;
    const derivedAddresses: QueuedMnemonicResult['derivedAddresses'] = [];
    
    for (const derived of derivationResult.addresses) {
      // Check BOTH addresses against dormant list
      const isDormantCompressed = dormantCheckResult.matches.some(m => m.address === derived.address);
      const isDormantUncompressed = dormantCheckResult.matches.some(m => m.address === derived.addressUncompressed);
      const isDormant = isDormantCompressed || isDormantUncompressed;
      
      // Queue COMPRESSED address
      const compressedResult = balanceQueue.enqueue(
        derived.address,
        mnemonic,
        derived.privateKeyWIFCompressed,
        true,
        { priority: isDormant ? priority + 10 : priority, source: 'mnemonic' }
      );
      
      // Queue UNCOMPRESSED address (critical for 2009-era recovery!)
      const uncompressedResult = balanceQueue.enqueue(
        derived.addressUncompressed,
        mnemonic,
        derived.privateKeyWIF,
        false,
        { priority: isDormant ? priority + 10 : priority, source: 'mnemonic' }
      );
      
      if (compressedResult) queuedCount++;
      else failedCount++;
      
      if (uncompressedResult) queuedCount++;
      else failedCount++;
      
      derivedAddresses.push({
        addressCompressed: derived.address,
        addressUncompressed: derived.addressUncompressed,
        path: derived.derivationPath,
        compressedQueued: compressedResult,
        uncompressedQueued: uncompressedResult,
        isDormant,
      });
    }
    
    // Track mnemonic as tested in PostgreSQL
    if (queuedCount > 0) {
      oceanPersistence.markTested(mnemonic).catch(err => {
        console.error('[BalanceQueueIntegration] Failed to mark mnemonic tested:', err);
      });
    }
    
    stats.totalQueued += queuedCount;
    stats.lastQueueTime = Date.now();
    const mnemonicSource = `${source}-mnemonic`;
    stats.sourceBreakdown[mnemonicSource] = (stats.sourceBreakdown[mnemonicSource] || 0) + queuedCount;
    
    if (dormantCheckResult.hasMatch) {
      console.log(`[BalanceQueueIntegration] 🎯 MNEMONIC HAS DORMANT MATCHES!`);
      console.log(`[BalanceQueueIntegration]   Mnemonic: ${mnemonic.substring(0, 40)}...`);
      console.log(`[BalanceQueueIntegration]   Matches: ${dormantCheckResult.matches.length}`);
      for (const match of dormantCheckResult.matches) {
        console.log(`[BalanceQueueIntegration]   - ${match.address} @ ${match.derivationPath} (${match.dormantInfo.balanceBTC} BTC)`);
      }
    }
    
    if (queuedCount > 0 && (stats.totalQueued % 500 === 0 || dormantCheckResult.hasMatch)) {
      console.log(`[BalanceQueueIntegration] Mnemonic: ${queuedCount}/${derivationResult.totalDerived * 2} addresses queued from ${source} (${derivationResult.totalDerived} paths × 2 formats)`);
    }
    
    return {
      mnemonic,
      totalPaths: derivationResult.totalDerived,
      totalAddresses: derivationResult.totalDerived * 2, // Each path yields 2 addresses
      queuedAddresses: queuedCount,
      failedAddresses: failedCount,
      dormantMatches: dormantCheckResult.matches.length,
      derivedAddresses,
    };
  } catch (error) {
    console.error('[BalanceQueueIntegration] Error queuing mnemonic:', error);
    return null;
  }
}

/**
 * Batch queue multiple mnemonics for balance checking
 * Each mnemonic expands to 50+ addresses
 */
export function batchQueueMnemonics(
  mnemonics: string[],
  source: string = 'batch-mnemonic',
  priority: number = 2
): {
  totalMnemonics: number;
  successfulMnemonics: number;
  failedMnemonics: number;
  totalAddressesQueued: number;
  dormantMatchesFound: number;
} {
  let successfulMnemonics = 0;
  let failedMnemonics = 0;
  let totalAddressesQueued = 0;
  let dormantMatchesFound = 0;
  
  for (const mnemonic of mnemonics) {
    const result = queueMnemonicForBalanceCheck(mnemonic, source, priority);
    if (result) {
      successfulMnemonics++;
      totalAddressesQueued += result.queuedAddresses;
      dormantMatchesFound += result.dormantMatches;
    } else {
      failedMnemonics++;
    }
  }
  
  console.log(`[BalanceQueueIntegration] Batch mnemonic queue: ${successfulMnemonics}/${mnemonics.length} mnemonics processed`);
  console.log(`[BalanceQueueIntegration]   Total addresses queued: ${totalAddressesQueued}`);
  console.log(`[BalanceQueueIntegration]   Dormant matches: ${dormantMatchesFound}`);
  
  return {
    totalMnemonics: mnemonics.length,
    successfulMnemonics,
    failedMnemonics,
    totalAddressesQueued,
    dormantMatchesFound,
  };
}

/**
 * Queue address from WIF (Wallet Import Format) key
 * Converts WIF to private key hex and generates addresses
 */
export function queueAddressFromWIF(
  wif: string,
  source: string = 'wif-input',
  priority: number = 3
): QueuedAddressResult | null {
  try {
    if (!wif || typeof wif !== 'string' || wif.length < 50) {
      console.warn('[BalanceQueueIntegration] Invalid WIF format');
      return null;
    }

    // Import WIF converter
    const { wifToPrivateKeyHex, generateBothAddressesFromPrivateKey } = require('./crypto');
    
    // Convert WIF to private key hex
    let privateKeyHex: string;
    let isCompressed: boolean;
    
    try {
      const result = wifToPrivateKeyHex(wif);
      privateKeyHex = result.privateKeyHex;
      isCompressed = result.compressed;
    } catch (err) {
      console.error('[BalanceQueueIntegration] Invalid WIF key:', err);
      return null;
    }
    
    // Generate BOTH address formats from the private key
    const addresses = generateBothAddressesFromPrivateKey(privateKeyHex);
    
    // Generate WIF keys (we already have one, generate the other compression format)
    const compressedWif = privateKeyToWIF(privateKeyHex, true);
    const uncompressedWif = privateKeyToWIF(privateKeyHex, false);
    
    // Map source to valid type for persistence
    const sourceType = (source === 'python' || source === 'mnemonic' || source === 'manual') 
      ? source as 'python' | 'mnemonic' | 'manual'
      : 'typescript';
    
    // Queue both addresses
    const result = balanceQueue.enqueueBoth(
      addresses.compressed,
      addresses.uncompressed,
      `WIF:${wif.substring(0, 8)}...`, // Store partial WIF as reference
      compressedWif,
      uncompressedWif,
      { priority, source: sourceType }
    );
    
    // Update stats
    stats.totalQueued += (result.compressed ? 1 : 0) + (result.uncompressed ? 1 : 0);
    stats.lastQueueTime = Date.now();
    stats.sourceBreakdown[source] = (stats.sourceBreakdown[source] || 0) + (result.compressed ? 1 : 0) + (result.uncompressed ? 1 : 0);
    
    console.log(`[BalanceQueueIntegration] Queued WIF-derived addresses: ${addresses.compressed}, ${addresses.uncompressed}`);
    
    return {
      passphrase: `WIF:${wif.substring(0, 8)}...`,
      compressedAddress: addresses.compressed,
      uncompressedAddress: addresses.uncompressed,
      compressedWif,
      uncompressedWif,
      compressedQueued: result.compressed,
      uncompressedQueued: result.uncompressed,
      skippedTestedEmpty: false,
    };
  } catch (error) {
    console.error('[BalanceQueueIntegration] Error queuing from WIF:', error);
    return null;
  }
}

/**
 * Queue addresses from extended private key (xprv)
 * Derives multiple addresses using BIP32 paths
 */
export function queueAddressesFromXprv(
  xprv: string,
  source: string = 'xprv-input',
  priority: number = 3,
  addressCount: number = 20
): {
  xprv: string;
  totalAddresses: number;
  queuedAddresses: number;
  failedAddresses: number;
  derivedAddresses: Array<{ address: string; path: string; queued: boolean }>;
} | null {
  try {
    if (!xprv || typeof xprv !== 'string' || !xprv.startsWith('xprv')) {
      console.warn('[BalanceQueueIntegration] Invalid xprv format - must start with "xprv"');
      return null;
    }

    // Import crypto functions
    const { deriveFromXprv, generateBothAddressesFromPrivateKey } = require('./crypto');
    
    const derivedAddresses: Array<{ address: string; path: string; queued: boolean }> = [];
    let queuedCount = 0;
    let failedCount = 0;
    
    // Standard BIP44 paths for Bitcoin mainnet
    const paths = [
      // Account 0 receiving
      ...Array.from({ length: addressCount }, (_, i) => `m/44'/0'/0'/0/${i}`),
      // Account 0 change
      ...Array.from({ length: Math.floor(addressCount / 2) }, (_, i) => `m/44'/0'/0'/1/${i}`),
      // Legacy paths
      ...Array.from({ length: 10 }, (_, i) => `m/0/${i}`),
    ];
    
    for (const path of paths) {
      try {
        // Derive private key from xprv at this path
        const privateKeyHex = deriveFromXprv(xprv, path);
        if (!privateKeyHex) continue;
        
        // Generate addresses
        const addresses = generateBothAddressesFromPrivateKey(privateKeyHex);
        const compressedWif = privateKeyToWIF(privateKeyHex, true);
        const uncompressedWif = privateKeyToWIF(privateKeyHex, false);
        
        // Map source to valid type for persistence
        const sourceType = (source === 'python' || source === 'mnemonic' || source === 'manual') 
          ? source as 'python' | 'mnemonic' | 'manual'
          : 'typescript';
        
        // Queue both addresses
        const result = balanceQueue.enqueueBoth(
          addresses.compressed,
          addresses.uncompressed,
          `xprv:${path}`,
          compressedWif,
          uncompressedWif,
          { priority, source: sourceType }
        );
        
        const queued = result.compressed || result.uncompressed;
        derivedAddresses.push({ 
          address: addresses.compressed, 
          path, 
          queued 
        });
        
        if (queued) {
          queuedCount++;
          stats.totalQueued += (result.compressed ? 1 : 0) + (result.uncompressed ? 1 : 0);
        }
      } catch (pathError) {
        failedCount++;
        console.error(`[BalanceQueueIntegration] Error deriving path ${path}:`, pathError);
      }
    }
    
    stats.lastQueueTime = Date.now();
    stats.sourceBreakdown[source] = (stats.sourceBreakdown[source] || 0) + queuedCount;
    
    console.log(`[BalanceQueueIntegration] Queued ${queuedCount} addresses from xprv (${paths.length} paths)`);
    
    return {
      xprv: `${xprv.substring(0, 15)}...`,
      totalAddresses: paths.length,
      queuedAddresses: queuedCount,
      failedAddresses: failedCount,
      derivedAddresses,
    };
  } catch (error) {
    console.error('[BalanceQueueIntegration] Error queuing from xprv:', error);
    return null;
  }
}

/**
 * Check if a phrase has already been tested (PostgreSQL lookup)
 * Use this before queueing to avoid duplicate work
 */
export async function hasBeenTested(phrase: string): Promise<boolean> {
  return oceanPersistence.hasBeenTested(phrase);
}

/**
 * Get tested phrase count from PostgreSQL
 */
export async function getTestedPhraseCount(): Promise<number> {
  const stats = await oceanPersistence.getStats();
  return stats.testedPhraseCount;
}

/**
 * Result of smart queue operation that handles both mnemonics and passphrases
 */
export interface SmartQueueResult {
  input: string;
  inputType: 'bip39_mnemonic' | 'passphrase';
  addressesQueued: number;
  derivationPaths?: number;
  success: boolean;
}

/**
 * SMART QUEUE: Auto-detect input type and route appropriately
 * 
 * This is the PRIMARY entry point for hypothesis testing. It:
 * 1. Detects if input is a valid BIP39 mnemonic (12/15/18/21/24 words)
 * 2. Routes mnemonics through proper PBKDF2 + HD derivation (50+ addresses)
 * 3. Routes passphrases through brainwallet SHA256 derivation (2 addresses)
 * 
 * CRITICAL FIX: Previously, mnemonics were treated as brainwallets (SHA256),
 * which generates completely wrong addresses. Real BIP39 uses PBKDF2 with
 * 2048 rounds to derive the seed.
 * 
 * @param input - Either a BIP39 mnemonic or a passphrase
 * @param source - Tracking source for metrics
 * @param priority - Queue priority (higher = checked first)
 * @returns Details about what was queued
 */
export function smartQueueForBalanceCheck(
  input: string,
  source: string = 'smart',
  priority: number = 1
): SmartQueueResult {
  if (!input || typeof input !== 'string' || input.trim().length === 0) {
    return {
      input: input || '',
      inputType: 'passphrase',
      addressesQueued: 0,
      success: false,
    };
  }
  
  const trimmedInput = input.trim();
  
  // Detect if this is a valid BIP39 mnemonic
  if (isValidBIP39Phrase(trimmedInput)) {
    // Route through proper BIP39 derivation with 50+ addresses
    console.log(`[SmartQueue] Detected BIP39 mnemonic (${trimmedInput.split(' ').length} words), using HD derivation`);
    
    const result = queueMnemonicForBalanceCheck(trimmedInput, source, priority);
    
    if (result) {
      return {
        input: trimmedInput,
        inputType: 'bip39_mnemonic',
        addressesQueued: result.queuedAddresses,
        derivationPaths: result.totalAddresses,
        success: result.queuedAddresses > 0,
      };
    } else {
      return {
        input: trimmedInput,
        inputType: 'bip39_mnemonic',
        addressesQueued: 0,
        success: false,
      };
    }
  } else {
    // Route through brainwallet derivation (SHA256 → 2 addresses)
    const result = queueAddressForBalanceCheck(trimmedInput, source, priority);
    
    if (result) {
      const queuedCount = (result.compressedQueued ? 1 : 0) + (result.uncompressedQueued ? 1 : 0);
      return {
        input: trimmedInput,
        inputType: 'passphrase',
        addressesQueued: queuedCount,
        success: queuedCount > 0,
      };
    } else {
      return {
        input: trimmedInput,
        inputType: 'passphrase',
        addressesQueued: 0,
        success: false,
      };
    }
  }
}

/**
 * Batch smart queue: Process multiple inputs, auto-detecting each type
 * 
 * @param inputs - Array of passphrases or mnemonics
 * @param source - Tracking source for metrics
 * @param priority - Base queue priority
 * @returns Summary of batch processing
 */
export function batchSmartQueue(
  inputs: string[],
  source: string = 'batch-smart',
  priority: number = 1
): {
  totalInputs: number;
  mnemonicsDetected: number;
  passphrasesDetected: number;
  totalAddressesQueued: number;
  successfulInputs: number;
  failedInputs: number;
} {
  let mnemonicsDetected = 0;
  let passphrasesDetected = 0;
  let totalAddressesQueued = 0;
  let successfulInputs = 0;
  let failedInputs = 0;
  
  for (const input of inputs) {
    const result = smartQueueForBalanceCheck(input, source, priority);
    
    if (result.inputType === 'bip39_mnemonic') {
      mnemonicsDetected++;
    } else {
      passphrasesDetected++;
    }
    
    if (result.success) {
      successfulInputs++;
      totalAddressesQueued += result.addressesQueued;
    } else {
      failedInputs++;
    }
  }
  
  console.log(`[SmartQueue] Batch complete: ${mnemonicsDetected} mnemonics, ${passphrasesDetected} passphrases, ${totalAddressesQueued} addresses queued`);
  
  return {
    totalInputs: inputs.length,
    mnemonicsDetected,
    passphrasesDetected,
    totalAddressesQueued,
    successfulInputs,
    failedInputs,
  };
}

/**
 * RETRY FUNCTION: Re-test mnemonics that were tested before the BIP39 derivation fix
 * 
 * The fix (2025-12-23) changed mnemonic derivation from:
 * - OLD: 50 addresses (HD paths only, compressed only)
 * - NEW: 200 addresses (100 HD paths × 2 formats: compressed + uncompressed)
 * 
 * This function finds previously-tested BIP39 mnemonics and re-queues them
 * to ensure full derivation coverage including uncompressed 2009-era addresses.
 * 
 * @param batchSize - How many mnemonics to process per batch (default: 100)
 * @param maxTotal - Maximum total mnemonics to retry (default: 10000)
 * @returns Summary of retry operation
 */
export async function retryMnemonicsWithFullDerivation(
  batchSize: number = 100,
  maxTotal: number = 10000
): Promise<{
  totalFound: number;
  totalRetried: number;
  totalAddressesQueued: number;
  errors: number;
}> {
  // Import db functions here to avoid circular dependencies
  const { db, withDbRetry } = await import('./db');
  const { testedPhrases } = await import('@shared/schema');
  const { desc, sql } = await import('drizzle-orm');
  
  if (!db) {
    console.error('[RetryMnemonics] No database available');
    return { totalFound: 0, totalRetried: 0, totalAddressesQueued: 0, errors: 1 };
  }
  
  console.log(`[RetryMnemonics] Starting mnemonic retry with full derivation (batch=${batchSize}, max=${maxTotal})`);
  
  let totalFound = 0;
  let totalRetried = 0;
  let totalAddressesQueued = 0;
  let errors = 0;
  let offset = 0;
  
  while (totalRetried < maxTotal) {
    try {
      // Fetch batch of tested phrases that look like BIP39 mnemonics
      // BIP39 mnemonics are 12, 15, 18, 21, or 24 words
      const batch = await withDbRetry(
        async () => {
          return await db!
            .select({ phrase: testedPhrases.phrase })
            .from(testedPhrases)
            .orderBy(desc(testedPhrases.testedAt))
            .limit(batchSize)
            .offset(offset);
        },
        'fetch-mnemonics-for-retry',
        3
      );
      
      if (!batch || batch.length === 0) {
        console.log(`[RetryMnemonics] No more phrases to process`);
        break;
      }
      
      offset += batch.length;
      
      // Filter to only valid BIP39 mnemonics
      const mnemonics = batch
        .map(row => row.phrase)
        .filter(phrase => {
          if (!phrase) return false;
          const words = phrase.trim().split(/\s+/);
          // Must be valid BIP39 word count
          if (![12, 15, 18, 21, 24].includes(words.length)) return false;
          // Must pass BIP39 word validation
          return isValidBIP39Phrase(phrase);
        });
      
      totalFound += mnemonics.length;
      
      if (mnemonics.length === 0) {
        continue;
      }
      
      // Re-queue each mnemonic with full derivation
      for (const mnemonic of mnemonics) {
        if (totalRetried >= maxTotal) break;
        
        try {
          const result = queueMnemonicForBalanceCheck(mnemonic, 'retry-full-derivation', 3);
          
          if (result && result.queuedAddresses > 0) {
            totalRetried++;
            totalAddressesQueued += result.queuedAddresses;
            
            if (totalRetried % 100 === 0) {
              console.log(`[RetryMnemonics] Progress: ${totalRetried} mnemonics retried, ${totalAddressesQueued} addresses queued`);
            }
          }
        } catch (error) {
          errors++;
          console.error(`[RetryMnemonics] Error re-queuing mnemonic:`, error);
        }
      }
      
      // Small delay to avoid overwhelming the queue
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      errors++;
      console.error(`[RetryMnemonics] Batch error:`, error);
      break;
    }
  }
  
  console.log(`[RetryMnemonics] Complete:`);
  console.log(`  - Total BIP39 mnemonics found: ${totalFound}`);
  console.log(`  - Total mnemonics retried: ${totalRetried}`);
  console.log(`  - Total addresses queued: ${totalAddressesQueued}`);
  console.log(`  - Errors: ${errors}`);
  
  return {
    totalFound,
    totalRetried,
    totalAddressesQueued,
    errors,
  };
}

/**
 * Get stats on how many mnemonics exist in the tested phrases database
 * Useful for estimating retry scope before running full retry
 */
export async function getMnemonicRetryStats(): Promise<{
  totalTestedPhrases: number;
  estimatedMnemonics: number;
  sampleMnemonics: string[];
}> {
  const { db, withDbRetry } = await import('./db');
  const { testedPhrases } = await import('@shared/schema');
  const { sql, desc } = await import('drizzle-orm');
  
  if (!db) {
    return { totalTestedPhrases: 0, estimatedMnemonics: 0, sampleMnemonics: [] };
  }
  
  try {
    // Get total count
    const countResult = await withDbRetry(
      async () => {
        return await db!
          .select({ count: sql<number>`count(*)` })
          .from(testedPhrases);
      },
      'count-tested-phrases',
      3
    );
    
    const totalTestedPhrases = countResult?.[0]?.count || 0;
    
    // Sample recent phrases to estimate mnemonic percentage
    const sample = await withDbRetry(
      async () => {
        return await db!
          .select({ phrase: testedPhrases.phrase })
          .from(testedPhrases)
          .orderBy(desc(testedPhrases.testedAt))
          .limit(1000);
      },
      'sample-tested-phrases',
      3
    );
    
    const mnemonics = (sample || [])
      .map(row => row.phrase)
      .filter(phrase => {
        if (!phrase) return false;
        const words = phrase.trim().split(/\s+/);
        if (![12, 15, 18, 21, 24].includes(words.length)) return false;
        return isValidBIP39Phrase(phrase);
      });
    
    const mnemonicRatio = sample && sample.length > 0 ? mnemonics.length / sample.length : 0;
    const estimatedMnemonics = Math.round(totalTestedPhrases * mnemonicRatio);
    
    return {
      totalTestedPhrases,
      estimatedMnemonics,
      sampleMnemonics: mnemonics.slice(0, 5).map(m => m.substring(0, 40) + '...'),
    };
  } catch (error) {
    console.error('[RetryMnemonics] Error getting stats:', error);
    return { totalTestedPhrases: 0, estimatedMnemonics: 0, sampleMnemonics: [] };
  }
}
