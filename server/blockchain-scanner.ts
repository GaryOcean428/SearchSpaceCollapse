/**
 * Blockchain Scanner
 * 
 * Fetches Bitcoin blockchain data from Blockstream API and extracts geometric signatures
 * for the Observer Archaeology System.
 * 
 * Geometric Features Extracted:
 * - Temporal: block height, timestamp, day/hour patterns, timezone inference
 * - Graph: transaction relationships, address clusters, miner patterns
 * - Value: amounts, coinbase rewards, transaction patterns
 * - Script: P2PKH/P2SH types, software fingerprints
 */

import type { Address, Block, Transaction } from "@shared/schema";
import { observerStorage } from "./observer-storage";
import { updateAddressDormancy } from "./dormancy-updater";
import { createHash } from "crypto";
import bs58check from "bs58check";

// Blockstream API base URL (free, no API key required)
const BLOCKSTREAM_API = "https://blockstream.info/api";

interface BlockstreamBlock {
  id: string;
  height: number;
  version: number;
  timestamp: number;
  tx_count: number;
  size: number;
  weight: number;
  merkle_root: string;
  previousblockhash: string;
  nonce: number;
  bits: number;
  difficulty: number;
}

interface BlockstreamTransaction {
  txid: string;
  version: number;
  locktime: number;
  vin: Array<{
    txid?: string;
    vout?: number;
    scriptsig?: string;
    is_coinbase?: boolean;
    sequence: number;
  }>;
  vout: Array<{
    scriptpubkey: string;
    scriptpubkey_address?: string;
    value: number;
  }>;
  size: number;
  weight: number;
  fee?: number;
  status: {
    confirmed: boolean;
    block_height: number;
    block_hash: string;
    block_time: number;
  };
}

/**
 * Extract temporal signature from block data
 */
function extractTemporalSignature(block: BlockstreamBlock) {
  const date = new Date(block.timestamp * 1000);
  const dayOfWeek = date.getUTCDay();
  const hourUTC = date.getUTCHours();
  
  // Infer likely timezones based on mining time patterns
  // Early Bitcoin miners often mined during their local evening/night
  const likelyTimezones: string[] = [];
  if (hourUTC >= 0 && hourUTC <= 6) {
    likelyTimezones.push("America/Los_Angeles", "America/Denver", "America/Chicago");
  } else if (hourUTC >= 7 && hourUTC <= 15) {
    likelyTimezones.push("Europe/London", "Europe/Berlin", "Asia/Tokyo");
  } else {
    likelyTimezones.push("America/New_York", "America/Los_Angeles");
  }
  
  return {
    dayOfWeek,
    hourUTC,
    dayPattern: date.toISOString().split('T')[0],
    hourPattern: `${hourUTC}:00 UTC`,
    likelyTimezones,
    timestamp: block.timestamp,
  };
}

/**
 * Extract value signature from transaction outputs
 */
function extractValueSignature(outputs: Array<{ value: number }>) {
  const values = outputs.map(o => o.value);
  const totalValue = values.reduce((sum, v) => sum + v, 0);
  
  // Detect round numbers (humans like 1 BTC, 10 BTC, 50 BTC, etc.)
  const satoshiThresholds = [
    100000000, // 1 BTC
    1000000000, // 10 BTC
    5000000000, // 50 BTC
    10000000000, // 100 BTC
  ];
  
  const hasRoundNumbers = values.some(v => 
    satoshiThresholds.some(threshold => Math.abs(v - threshold) < 100000)
  );
  
  return {
    totalValue,
    outputCount: outputs.length,
    hasRoundNumbers,
    values,
    avgValue: totalValue / outputs.length,
  };
}

/**
 * Derive Bitcoin address from P2PK (Pay-to-Public-Key) script
 * Early Bitcoin outputs used raw public keys instead of addresses
 * Format: <pubkey_len> <pubkey> OP_CHECKSIG
 */
function deriveP2PKAddress(scriptpubkey: string): string | null {
  try {
    // P2PK format: <len><pubkey>ac (OP_CHECKSIG)
    // 0x41 (65 bytes) for uncompressed pubkey or 0x21 (33 bytes) for compressed
    if (!scriptpubkey.endsWith("ac")) return null;
    
    const lengthByte = scriptpubkey.substring(0, 2);
    const expectedLength = lengthByte === "41" ? 65 : lengthByte === "21" ? 33 : 0;
    
    if (expectedLength === 0) return null;
    
    // Extract public key (skip length byte, exclude OP_CHECKSIG)
    const pubkeyHex = scriptpubkey.substring(2, 2 + expectedLength * 2);
    
    if (pubkeyHex.length !== expectedLength * 2) return null;
    
    // Hash the public key: SHA-256 then RIPEMD-160
    const pubkeyBuffer = Buffer.from(pubkeyHex, "hex");
    const sha256Hash = createHash("sha256").update(pubkeyBuffer).digest();
    const ripemd160Hash = createHash("ripemd160").update(sha256Hash).digest();
    
    // Add version byte (0x00 for mainnet P2PKH)
    const versionedHash = Buffer.concat([Buffer.from([0x00]), ripemd160Hash]);
    
    // Encode with Base58Check
    const address = bs58check.encode(versionedHash);
    
    return address;
  } catch (error) {
    console.error(`[BlockchainScanner] Error deriving P2PK address:`, error);
    return null;
  }
}

/**
 * Extract script signature from output
 */
function extractScriptSignature(scriptpubkey: string) {
  // Basic script type detection
  let scriptType = "unknown";
  
  if (scriptpubkey.startsWith("76a914") && scriptpubkey.endsWith("88ac")) {
    scriptType = "P2PKH"; // Pay to Public Key Hash
  } else if (scriptpubkey.startsWith("a914") && scriptpubkey.endsWith("87")) {
    scriptType = "P2SH"; // Pay to Script Hash
  } else if (scriptpubkey.startsWith("0014") || scriptpubkey.startsWith("0020")) {
    scriptType = "P2WPKH"; // Pay to Witness Public Key Hash
  } else if (scriptpubkey.startsWith("41") || scriptpubkey.startsWith("21")) {
    scriptType = "P2PK"; // Pay to Public Key (early Bitcoin)
  }
  
  return {
    type: scriptType,
    raw: scriptpubkey,
    softwareFingerprint: scriptType, // Can be expanded with version detection
  };
}

/**
 * Extract miner software fingerprint from coinbase transaction
 */
function extractMinerFingerprint(coinbaseTx: BlockstreamTransaction): string | null {
  if (!coinbaseTx.vin || coinbaseTx.vin.length === 0 || !coinbaseTx.vin[0].is_coinbase) {
    return null;
  }
  
  const coinbase = coinbaseTx.vin[0];
  const scriptsig = coinbase.scriptsig || "";
  
  // Early Bitcoin software fingerprints based on coinbase patterns
  // Satoshi's original client had specific patterns
  if (scriptsig.length < 10) {
    return "satoshi-v0.1"; // Very early blocks
  }
  
  // Known mining pool signatures (added in later years)
  if (scriptsig.includes("slush") || scriptsig.includes("Slush")) return "slushpool";
  if (scriptsig.includes("eligius") || scriptsig.includes("Eligius")) return "eligius";
  if (scriptsig.includes("btcguild") || scriptsig.includes("BTCGuild")) return "btcguild";
  
  // Generic detection based on scriptsig structure
  if (scriptsig.length > 100) return "custom-large";
  if (scriptsig.length > 50) return "custom-medium";
  
  return "unknown";
}

/**
 * Balance check result for a generated address
 * NOTE: We intentionally DO NOT store WIF/private keys for security
 * Only store metadata needed for dormancy verification
 */
export interface BalanceHit {
  address: string;
  passphraseHint: string;  // First 3 chars + length, NOT the full passphrase
  balanceSats: number;
  balanceBTC: string;
  txCount: number;
  discoveredAt: string;
  isCompressed: boolean;
}

// In-memory storage for balance hits (persisted to disk)
const balanceHits: BalanceHit[] = [];
const BALANCE_HITS_FILE = 'data/balance-hits.json';

/**
 * Load balance hits from disk on startup
 */
async function loadBalanceHits(): Promise<void> {
  try {
    const fs = await import('fs/promises');
    const data = await fs.readFile(BALANCE_HITS_FILE, 'utf-8');
    const saved = JSON.parse(data);
    balanceHits.push(...saved);
    console.log(`[BlockchainScanner] Loaded ${balanceHits.length} balance hits from disk`);
  } catch {
    console.log('[BlockchainScanner] No saved balance hits found, starting fresh');
  }
}

/**
 * Save balance hits to disk
 */
async function saveBalanceHits(): Promise<void> {
  try {
    const fs = await import('fs/promises');
    await fs.mkdir('data', { recursive: true });
    await fs.writeFile(BALANCE_HITS_FILE, JSON.stringify(balanceHits, null, 2));
    console.log(`[BlockchainScanner] Saved ${balanceHits.length} balance hits to disk`);
  } catch (error) {
    console.error('[BlockchainScanner] Error saving balance hits:', error);
  }
}

// Load on module init
loadBalanceHits();

/**
 * Fetch address balance and transaction count from Blockstream API
 */
export async function fetchAddressBalance(address: string): Promise<{
  balanceSats: number;
  txCount: number;
  funded: number;
  spent: number;
} | null> {
  try {
    const response = await fetch(`${BLOCKSTREAM_API}/address/${address}`);
    if (!response.ok) {
      if (response.status === 404) {
        return { balanceSats: 0, txCount: 0, funded: 0, spent: 0 };
      }
      return null;
    }
    
    const data = await response.json();
    
    const funded = (data.chain_stats?.funded_txo_sum || 0) + (data.mempool_stats?.funded_txo_sum || 0);
    const spent = (data.chain_stats?.spent_txo_sum || 0) + (data.mempool_stats?.spent_txo_sum || 0);
    const balanceSats = funded - spent;
    const txCount = (data.chain_stats?.tx_count || 0) + (data.mempool_stats?.tx_count || 0);
    
    return { balanceSats, txCount, funded, spent };
  } catch (error) {
    console.error(`[BlockchainScanner] Error fetching balance for ${address}:`, error);
    return null;
  }
}

/**
 * Create a safe passphrase hint for logging/storage
 * Shows first 3 chars and length only - NOT the full passphrase
 */
function createPassphraseHint(passphrase: string): string {
  if (passphrase.length <= 3) return `***[${passphrase.length}]`;
  return `${passphrase.substring(0, 3)}...[${passphrase.length}]`;
}

/**
 * Check if a generated address has any balance and record it
 * NOTE: Does NOT store WIF/private keys for security - only metadata
 */
export async function checkAndRecordBalance(
  address: string,
  passphrase: string,
  _wif: string,  // Accepted but NOT stored for security
  isCompressed: boolean = true
): Promise<BalanceHit | null> {
  const balanceInfo = await fetchAddressBalance(address);
  
  if (!balanceInfo) {
    return null;
  }
  
  if (balanceInfo.balanceSats > 0 || balanceInfo.txCount > 0) {
    // Create safe hint - DO NOT store full passphrase or WIF
    const passphraseHint = createPassphraseHint(passphrase);
    
    const hit: BalanceHit = {
      address,
      passphraseHint,
      balanceSats: balanceInfo.balanceSats,
      balanceBTC: (balanceInfo.balanceSats / 100000000).toFixed(8),
      txCount: balanceInfo.txCount,
      discoveredAt: new Date().toISOString(),
      isCompressed,
    };
    
    const existing = balanceHits.find(h => h.address === address);
    if (!existing) {
      balanceHits.push(hit);
      await saveBalanceHits();
      
      if (balanceInfo.balanceSats > 0) {
        // Log hit WITHOUT sensitive data
        console.log(`\n[BALANCE HIT] ${address}`);
        console.log(`   Balance: ${hit.balanceBTC} BTC (${hit.balanceSats} sats)`);
        console.log(`   Hint: ${passphraseHint}`);
        console.log(`   TX Count: ${hit.txCount}\n`);
      } else {
        console.log(`[BlockchainScanner] Historical activity: ${address} (${hit.txCount} txs, 0 balance)`);
      }
    }
    
    return hit;
  }
  
  return null;
}

/**
 * Get all recorded balance hits
 */
export function getBalanceHits(): BalanceHit[] {
  return [...balanceHits];
}

/**
 * Get balance hits with non-zero balance
 */
export function getActiveBalanceHits(): BalanceHit[] {
  return balanceHits.filter(h => h.balanceSats > 0);
}

/**
 * Fetch block by height from Blockstream API
 */
export async function fetchBlockByHeight(height: number): Promise<BlockstreamBlock | null> {
  try {
    // First get block hash by height
    const hashResponse = await fetch(`${BLOCKSTREAM_API}/block-height/${height}`);
    if (!hashResponse.ok) return null;
    
    const blockHash = await hashResponse.text();
    
    // Then fetch full block data
    const blockResponse = await fetch(`${BLOCKSTREAM_API}/block/${blockHash}`);
    if (!blockResponse.ok) return null;
    
    const block = await blockResponse.json();
    return block;
  } catch (error) {
    console.error(`[BlockchainScanner] Error fetching block ${height}:`, error);
    return null;
  }
}

/**
 * Fetch transactions in a block
 */
export async function fetchBlockTransactions(blockHash: string): Promise<BlockstreamTransaction[]> {
  try {
    const response = await fetch(`${BLOCKSTREAM_API}/block/${blockHash}/txs`);
    if (!response.ok) return [];
    
    const txs = await response.json();
    return txs;
  } catch (error) {
    console.error(`[BlockchainScanner] Error fetching transactions for block ${blockHash}:`, error);
    return [];
  }
}

/**
 * Parse block into database format with geometric features
 */
export function parseBlock(blockData: BlockstreamBlock): Partial<Block> {
  const temporal = extractTemporalSignature(blockData);
  
  return {
    height: blockData.height,
    hash: blockData.id,
    previousHash: blockData.previousblockhash,
    timestamp: new Date(blockData.timestamp * 1000),
    difficulty: blockData.difficulty.toString(), // Store as string to preserve precision
    nonce: blockData.nonce, // Schema uses { mode: "number" } for nonce
    transactionCount: blockData.tx_count,
    dayOfWeek: temporal.dayOfWeek,
    hourUTC: temporal.hourUTC,
    likelyTimezones: temporal.likelyTimezones,
    minerSoftwareFingerprint: null, // Extracted from coinbase later
  };
}

/**
 * Parse transaction into database format
 * Note: UTXO resolution required for accurate input values/fees (deferred to Phase 2)
 */
export function parseTransaction(txData: BlockstreamTransaction): Partial<Transaction> {
  const isCoinbase = txData.vin.some(input => input.is_coinbase);
  
  // Calculate total output value using BigInt throughout to avoid overflow
  let totalOutputValue = BigInt(0);
  for (const output of txData.vout) {
    totalOutputValue += BigInt(output.value);
  }
  
  // Note: totalInputValue requires UTXO resolution
  // For now, we store null for inputs (will be enriched in Phase 2)
  return {
    txid: txData.txid,
    blockHeight: txData.status.block_height,
    blockTimestamp: new Date(txData.status.block_time * 1000),
    isCoinbase,
    inputCount: txData.vin.length,
    outputCount: txData.vout.length,
    totalInputValue: isCoinbase ? BigInt(0) : null, // Requires UTXO resolution
    totalOutputValue,
    fee: txData.fee ? BigInt(txData.fee) : BigInt(0), // Blockstream provides this directly
  };
}

/**
 * Extract dormant addresses from early era (2009-2011)
 * Block heights: 0 (Genesis) to ~155,000 (end of 2011)
 */
export async function scanEarlyEraBlocks(
  startHeight: number = 0,
  endHeight: number = 1000, // Start with first 1000 blocks
  onProgress?: (height: number, total: number) => void
): Promise<void> {
  console.log(`[BlockchainScanner] Starting scan from block ${startHeight} to ${endHeight}`);
  
  for (let height = startHeight; height <= endHeight; height++) {
    if (onProgress) onProgress(height, endHeight - startHeight);
    
    const blockData = await fetchBlockByHeight(height);
    if (!blockData) {
      console.error(`[BlockchainScanner] Failed to fetch block ${height}`);
      continue;
    }
    
    // Fetch transactions first (needed for miner fingerprint)
    const txs = await fetchBlockTransactions(blockData.id);
    console.log(`[BlockchainScanner] Block ${height} has ${txs.length} transactions`);
    
    // Parse and save block with miner fingerprint
    const blockToSave = parseBlock(blockData);
    
    // Extract miner fingerprint from coinbase transaction
    const coinbaseTx = txs.find(tx => tx.vin.some(input => input.is_coinbase));
    if (coinbaseTx) {
      blockToSave.minerSoftwareFingerprint = extractMinerFingerprint(coinbaseTx);
    }
    
    try {
      await observerStorage.saveBlock(blockToSave as any);
      console.log(`[BlockchainScanner] ✓ Saved block ${height}: ${blockToSave.hash}${blockToSave.minerSoftwareFingerprint ? ` (miner: ${blockToSave.minerSoftwareFingerprint})` : ''}`);
    } catch (error) {
      console.error(`[BlockchainScanner] Error saving block ${height}:`, error);
      continue;
    }
    
    // Process each transaction
    for (let position = 0; position < txs.length; position++) {
      const txData = txs[position];
      const tx = parseTransaction(txData);
      
      try {
        // Save transaction
        await observerStorage.saveTransaction(tx as any);
        
        // Extract and save addresses from outputs
        for (const output of txData.vout) {
          // Get address from Blockstream, or derive from P2PK script for early blocks
          let address: string | null = output.scriptpubkey_address || null;
          
          if (!address && output.scriptpubkey) {
            // Early Bitcoin used P2PK (Pay-to-Public-Key) without addresses
            address = deriveP2PKAddress(output.scriptpubkey);
            
            if (address) {
              console.log(`[BlockchainScanner]   → Derived P2PK address: ${address}`);
            }
          }
          
          if (!address) {
            console.log(`[BlockchainScanner]   ⚠ Skipped output: no address (script: ${output.scriptpubkey?.substring(0, 20)}...)`);
            continue; // Skip outputs without recoverable addresses
          }
          
          // Always call saveAddress - it handles both insert and update idempotently
          const scriptSig = extractScriptSignature(output.scriptpubkey);
          const temporal = extractTemporalSignature(blockData);
          const valueSig = extractValueSignature(txData.vout);
          
          const addressRecord: Omit<Address, "createdAt" | "updatedAt"> = {
            address,
            firstSeenHeight: height,
            firstSeenTxid: txData.txid,
            firstSeenTimestamp: new Date(blockData.timestamp * 1000),
            lastActivityHeight: height,
            lastActivityTxid: txData.txid,
            lastActivityTimestamp: new Date(blockData.timestamp * 1000),
            currentBalance: BigInt(output.value), // Balance tracking (proper UTXO tracking in Phase 2)
            dormancyBlocks: 0, // Will be calculated by dormancy-updater
            isDormant: false,
            isCoinbaseReward: txData.vin.some(input => input.is_coinbase),
            isEarlyEra: height <= 155000, // 2009-2011 era
            temporalSignature: {
              dayOfWeek: temporal.dayOfWeek,
              hourUTC: temporal.hourUTC,
              dayPattern: temporal.dayPattern,
              hourPattern: temporal.hourPattern,
              likelyTimezones: temporal.likelyTimezones,
              timestamp: temporal.timestamp,
            },
            graphSignature: {
              // Basic graph features (will be enriched with multi-block analysis in Phase 2)
              inputCount: txData.vin.length,
              outputCount: txData.vout.length,
              isFirstOutput: txData.vout.indexOf(output) === 0,
            },
            valueSignature: {
              initialValue: output.value,
              totalValue: valueSig.totalValue,
              hasRoundNumbers: valueSig.hasRoundNumbers,
              isCoinbase: txData.vin.some(input => input.is_coinbase),
              outputCount: valueSig.outputCount,
            },
            scriptSignature: {
              type: scriptSig.type,
              raw: scriptSig.raw,
              softwareFingerprint: scriptSig.softwareFingerprint,
            },
          };
          
          await observerStorage.saveAddress(addressRecord);
          console.log(`[BlockchainScanner]   → Saved address: ${address} (${scriptSig.type}, ${output.value} sats)`);
        }
      } catch (error) {
        console.error(`[BlockchainScanner] Error processing tx ${txData.txid}:`, error);
      }
    }
    
    // Rate limiting: wait 200ms between blocks to respect API limits
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`[BlockchainScanner] ✓ Scan complete: blocks ${startHeight} to ${endHeight}`);
  
  // After scanning, update dormancy for all addresses
  await updateAddressDormancy(endHeight);
}

/**
 * Compute κ_recovery for an address based on geometric signatures
 */
export function computeKappaRecovery(address: Partial<Address>): {
  kappaRecovery: number;
  phiConstraints: number;
  hCreation: number;
  tier: string;
} {
  // Φ_constraints: Integrated information from available constraints
  let phiConstraints = 0;
  
  // Temporal constraints (higher = more constrained)
  if (address.temporalSignature) {
    const temporal = address.temporalSignature as any;
    if (temporal.dayOfWeek !== undefined) phiConstraints += 0.1;
    if (temporal.hourUTC !== undefined) phiConstraints += 0.1;
    if (temporal.likelyTimezones?.length) phiConstraints += 0.2;
  }
  
  // Graph constraints
  if (address.graphSignature) {
    const graph = address.graphSignature as any;
    if (graph.inputAddresses?.length) phiConstraints += 0.2;
    if (graph.clusterSize > 1) phiConstraints += 0.3;
  }
  
  // Value constraints
  if (address.isCoinbaseReward) phiConstraints += 0.5; // Coinbase = miner identity
  if (address.valueSignature) {
    const value = address.valueSignature as any;
    if (value.hasRoundNumbers) phiConstraints += 0.2;
  }
  
  // Script constraints
  if (address.scriptSignature) {
    const script = address.scriptSignature as any;
    if (script.type === "P2PK") phiConstraints += 0.3; // Early Bitcoin pattern
  }
  
  // H_creation: Entropy of passphrase creation (estimated)
  // For 2009-era addresses, assume lower entropy (people used simple passphrases)
  let hCreation = address.isEarlyEra ? 2.0 : 4.0;
  
  // Adjust based on balance (high value = likely more careful)
  if (address.currentBalance && address.currentBalance > BigInt(5000000000)) {
    hCreation += 1.0; // 50+ BTC = likely more secure
  }
  
  // κ_recovery = Φ_constraints / H_creation
  const kappaRecovery = phiConstraints / hCreation;
  
  // Tier classification
  let tier = "unrecoverable";
  if (kappaRecovery > 0.5) tier = "high";
  else if (kappaRecovery > 0.2) tier = "medium";
  else if (kappaRecovery > 0.1) tier = "low";
  
  return {
    kappaRecovery,
    phiConstraints,
    hCreation,
    tier,
  };
}
