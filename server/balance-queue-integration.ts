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
 */

import { derivePrivateKeyFromPassphrase, privateKeyToWIF, generateBothAddresses } from './crypto';
import { balanceQueue } from './balance-queue';
import { deriveMnemonicAddresses, checkMnemonicAgainstDormant } from './mnemonic-wallet';

interface QueuedAddressResult {
  passphrase: string;
  compressedAddress: string;
  uncompressedAddress: string;
  compressedWif: string;
  uncompressedWif: string;
  compressedQueued: boolean;
  uncompressedQueued: boolean;
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
 * @param passphrase - The passphrase to generate addresses from
 * @param source - Where this address came from (for metrics)
 * @param priority - Higher priority = checked first
 * @returns The generated addresses and whether they were queued
 */
export function queueAddressForBalanceCheck(
  passphrase: string,
  source: string = 'unknown',
  priority: number = 1
): QueuedAddressResult | null {
  try {
    if (!passphrase || typeof passphrase !== 'string' || passphrase.length === 0) {
      return null;
    }

    // Generate private key
    const privateKeyHex = derivePrivateKeyFromPassphrase(passphrase);
    
    // Generate BOTH addresses (critical for 2009-era recovery)
    const addresses = generateBothAddresses(passphrase);
    
    // Generate WIF keys for both
    const compressedWif = privateKeyToWIF(privateKeyHex, true);
    const uncompressedWif = privateKeyToWIF(privateKeyHex, false);
    
    // Queue both addresses
    const result = balanceQueue.enqueueBoth(
      addresses.compressed,
      addresses.uncompressed,
      passphrase,
      compressedWif,
      uncompressedWif,
      { priority }
    );
    
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
      uncompressedQueued: result.uncompressed
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
    
    // Queue both addresses
    const result = balanceQueue.enqueueBoth(
      addresses.compressed,
      addresses.uncompressed,
      passphrase,
      compressedWif,
      uncompressedWif,
      { priority }
    );
    
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
      uncompressedQueued: result.uncompressed
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
  totalAddresses: number;
  queuedAddresses: number;
  failedAddresses: number;
  dormantMatches: number;
  derivedAddresses: Array<{
    address: string;
    path: string;
    queued: boolean;
    isDormant: boolean;
  }>;
}

/**
 * Queue ALL derived addresses from a BIP39 mnemonic for balance checking
 * 
 * This is the proper way to check mnemonic-based wallets:
 * 1. Derives 50+ addresses using standard HD paths (BIP44/49/84)
 * 2. Checks each against dormant target addresses
 * 3. Queues each for blockchain balance verification
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
      const isDormant = dormantCheckResult.matches.some(m => m.address === derived.address);
      
      const result = balanceQueue.enqueue(
        derived.address,
        mnemonic,
        derived.privateKeyWIFCompressed,
        true,
        { priority: isDormant ? priority + 10 : priority }
      );
      
      const queued = result;
      if (queued) {
        queuedCount++;
      } else {
        failedCount++;
      }
      
      derivedAddresses.push({
        address: derived.address,
        path: derived.derivationPath,
        queued,
        isDormant,
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
      console.log(`[BalanceQueueIntegration] Mnemonic: ${queuedCount}/${derivationResult.totalDerived} addresses queued from ${source}`);
    }
    
    return {
      mnemonic,
      totalAddresses: derivationResult.totalDerived,
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
    
    // Queue both addresses
    const result = balanceQueue.enqueueBoth(
      addresses.compressed,
      addresses.uncompressed,
      `WIF:${wif.substring(0, 8)}...`, // Store partial WIF as reference
      compressedWif,
      uncompressedWif,
      { priority }
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
      uncompressedQueued: result.uncompressed
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
        
        // Queue both addresses
        const result = balanceQueue.enqueueBoth(
          addresses.compressed,
          addresses.uncompressed,
          `xprv:${path}`,
          compressedWif,
          uncompressedWif,
          { priority }
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
