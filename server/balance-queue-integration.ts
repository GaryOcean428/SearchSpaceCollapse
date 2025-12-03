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

import { generateBitcoinAddress, derivePrivateKeyFromPassphrase, privateKeyToWIF, generateBothAddresses } from './crypto';
import { balanceQueue } from './balance-queue';

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
