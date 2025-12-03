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
 * 
 * Data Storage:
 * - Primary: PostgreSQL (balance_hits table, user-associated)
 * - Backup: JSON file (data/balance-hits.json)
 */

import type { Address, Block, Transaction } from "@shared/schema";
import { balanceHits as balanceHitsTable, balanceChangeEvents as balanceChangeEventsTable } from "@shared/schema";
import { observerStorage } from "./observer-storage";
import { updateAddressDormancy } from "./dormancy-updater";
import { createHash } from "crypto";
import bs58check from "bs58check";
import { db } from "./db";
import { eq } from "drizzle-orm";

const DEFAULT_USER_ID = '36468785';

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
 * Stores full recovery data for any addresses with activity
 */
export interface BalanceHit {
  address: string;
  passphrase: string;
  wif: string;
  balanceSats: number;
  balanceBTC: string;
  txCount: number;
  discoveredAt: string;
  isCompressed: boolean;
  lastChecked?: string;
  previousBalanceSats?: number;
  balanceChanged?: boolean;
  changeDetectedAt?: string;
}

/**
 * Balance change event for tracking movements
 */
export interface BalanceChangeEvent {
  address: string;
  previousBalance: number;
  newBalance: number;
  difference: number;
  detectedAt: string;
  passphrase: string;
  wif: string;
}

// Track balance changes separately for alerting
const balanceChanges: BalanceChangeEvent[] = [];
const BALANCE_CHANGES_FILE = 'data/balance-changes.json';

/**
 * Load balance changes from disk
 */
async function loadBalanceChanges(): Promise<void> {
  try {
    const fs = await import('fs/promises');
    const data = await fs.readFile(BALANCE_CHANGES_FILE, 'utf-8');
    const saved = JSON.parse(data);
    balanceChanges.push(...saved);
    console.log(`[BlockchainScanner] Loaded ${balanceChanges.length} balance change events from disk`);
  } catch {
    // File doesn't exist yet, that's fine
  }
}

/**
 * Save balance changes to disk
 */
async function saveBalanceChanges(): Promise<void> {
  try {
    const fs = await import('fs/promises');
    await fs.mkdir('data', { recursive: true });
    await fs.writeFile(BALANCE_CHANGES_FILE, JSON.stringify(balanceChanges, null, 2));
  } catch (error) {
    console.error('[BlockchainScanner] Error saving balance changes:', error);
  }
}

// Load changes on init
loadBalanceChanges();

// In-memory storage for balance hits (synced with PostgreSQL as primary, JSON as backup)
const balanceHits: BalanceHit[] = [];
const BALANCE_HITS_FILE = 'data/balance-hits.json';

/**
 * Load balance hits from PostgreSQL (primary) or disk (fallback)
 */
async function loadBalanceHits(): Promise<void> {
  try {
    if (db) {
      const rows = await db.select().from(balanceHitsTable);
      for (const row of rows) {
        balanceHits.push({
          address: row.address,
          passphrase: row.passphrase,
          wif: row.wif,
          balanceSats: row.balanceSats,
          balanceBTC: row.balanceBtc,
          txCount: row.txCount,
          discoveredAt: row.discoveredAt.toISOString(),
          isCompressed: row.isCompressed,
          lastChecked: row.lastChecked?.toISOString(),
          previousBalanceSats: row.previousBalanceSats ?? undefined,
          balanceChanged: row.balanceChanged ?? undefined,
          changeDetectedAt: row.changeDetectedAt?.toISOString(),
        });
      }
      console.log(`[BlockchainScanner] Loaded ${balanceHits.length} balance hits from PostgreSQL`);
      return;
    }
  } catch (error) {
    console.error('[BlockchainScanner] Error loading from PostgreSQL, falling back to JSON:', error);
  }
  
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
 * Save balance hits to PostgreSQL (primary) and disk (backup)
 */
async function saveBalanceHits(): Promise<void> {
  try {
    const fs = await import('fs/promises');
    await fs.mkdir('data', { recursive: true });
    await fs.writeFile(BALANCE_HITS_FILE, JSON.stringify(balanceHits, null, 2));
    console.log(`[BlockchainScanner] Saved ${balanceHits.length} balance hits to disk backup`);
  } catch (error) {
    console.error('[BlockchainScanner] Error saving balance hits to disk:', error);
  }
}

/**
 * Save a single balance hit to PostgreSQL
 */
async function saveBalanceHitToDb(hit: BalanceHit, userId: string = DEFAULT_USER_ID): Promise<void> {
  if (!db) return;
  
  try {
    const existing = await db.select()
      .from(balanceHitsTable)
      .where(eq(balanceHitsTable.address, hit.address))
      .limit(1);
    
    if (existing.length > 0) {
      await db.update(balanceHitsTable)
        .set({
          balanceSats: hit.balanceSats,
          balanceBtc: hit.balanceBTC,
          txCount: hit.txCount,
          lastChecked: hit.lastChecked ? new Date(hit.lastChecked) : null,
          previousBalanceSats: hit.previousBalanceSats ?? null,
          balanceChanged: hit.balanceChanged ?? false,
          changeDetectedAt: hit.changeDetectedAt ? new Date(hit.changeDetectedAt) : null,
          updatedAt: new Date(),
        })
        .where(eq(balanceHitsTable.address, hit.address));
    } else {
      await db.insert(balanceHitsTable).values({
        userId,
        address: hit.address,
        passphrase: hit.passphrase,
        wif: hit.wif,
        balanceSats: hit.balanceSats,
        balanceBtc: hit.balanceBTC,
        txCount: hit.txCount,
        isCompressed: hit.isCompressed,
        discoveredAt: new Date(hit.discoveredAt),
        lastChecked: hit.lastChecked ? new Date(hit.lastChecked) : null,
        previousBalanceSats: hit.previousBalanceSats ?? null,
        balanceChanged: hit.balanceChanged ?? false,
        changeDetectedAt: hit.changeDetectedAt ? new Date(hit.changeDetectedAt) : null,
      });
      console.log(`[BlockchainScanner] Saved balance hit to PostgreSQL: ${hit.address}`);
    }
  } catch (error) {
    console.error('[BlockchainScanner] Error saving to PostgreSQL:', error);
  }
}

/**
 * Save a balance change event to PostgreSQL
 */
async function saveBalanceChangeEventToDb(
  address: string,
  previousBalance: number,
  newBalance: number,
  balanceHitId?: string
): Promise<void> {
  if (!db) return;
  
  try {
    await db.insert(balanceChangeEventsTable).values({
      balanceHitId: balanceHitId ?? null,
      address,
      previousBalanceSats: previousBalance,
      newBalanceSats: newBalance,
      deltaSats: newBalance - previousBalance,
      detectedAt: new Date(),
    });
    console.log(`[BlockchainScanner] Saved balance change event to PostgreSQL: ${address}`);
  } catch (error) {
    console.error('[BlockchainScanner] Error saving balance change event to PostgreSQL:', error);
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
 * Check if a generated address has any balance and record it
 * Stores full recovery data (passphrase + WIF) for any addresses with activity
 * Primary storage: PostgreSQL, Backup: JSON file
 */
export async function checkAndRecordBalance(
  address: string,
  passphrase: string,
  wif: string,
  isCompressed: boolean = true
): Promise<BalanceHit | null> {
  const balanceInfo = await fetchAddressBalance(address);
  
  if (!balanceInfo) {
    return null;
  }
  
  if (balanceInfo.balanceSats > 0 || balanceInfo.txCount > 0) {
    const hit: BalanceHit = {
      address,
      passphrase,
      wif,
      balanceSats: balanceInfo.balanceSats,
      balanceBTC: (balanceInfo.balanceSats / 100000000).toFixed(8),
      txCount: balanceInfo.txCount,
      discoveredAt: new Date().toISOString(),
      isCompressed,
    };
    
    const existing = balanceHits.find(h => h.address === address);
    if (!existing) {
      balanceHits.push(hit);
      
      await saveBalanceHitToDb(hit);
      await saveBalanceHits();
      
      if (balanceInfo.balanceSats > 0) {
        console.log(`\n🎯 [BALANCE HIT] ${address}`);
        console.log(`   💰 Balance: ${hit.balanceBTC} BTC (${hit.balanceSats} sats)`);
        console.log(`   🔑 Passphrase: "${passphrase}"`);
        console.log(`   🔐 WIF: ${wif}`);
        console.log(`   📊 TX Count: ${hit.txCount}\n`);
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
 * Get all recorded balance changes
 */
export function getBalanceChanges(): BalanceChangeEvent[] {
  return [...balanceChanges];
}

/**
 * Refresh balance for a single address and detect changes
 */
export async function refreshSingleBalance(address: string): Promise<{
  updated: boolean;
  changed: boolean;
  hit: BalanceHit | null;
  error?: string;
}> {
  const hit = balanceHits.find(h => h.address === address);
  if (!hit) {
    return { updated: false, changed: false, hit: null, error: 'Address not found in balance hits' };
  }

  const balanceInfo = await fetchAddressBalance(address);
  if (!balanceInfo) {
    return { updated: false, changed: false, hit, error: 'Failed to fetch balance from API' };
  }

  const previousBalance = hit.balanceSats;
  const newBalance = balanceInfo.balanceSats;
  const now = new Date().toISOString();
  
  hit.lastChecked = now;
  hit.previousBalanceSats = previousBalance;
  
  if (previousBalance !== newBalance) {
    hit.balanceChanged = true;
    hit.changeDetectedAt = now;
    hit.balanceSats = newBalance;
    hit.balanceBTC = (newBalance / 100000000).toFixed(8);
    hit.txCount = balanceInfo.txCount;
    
    const changeEvent: BalanceChangeEvent = {
      address,
      previousBalance,
      newBalance,
      difference: newBalance - previousBalance,
      detectedAt: now,
      passphrase: hit.passphrase,
      wif: hit.wif,
    };
    
    balanceChanges.push(changeEvent);
    await saveBalanceChanges();
    
    const direction = newBalance > previousBalance ? '📈 INCREASED' : '📉 DECREASED';
    const diffBTC = Math.abs(newBalance - previousBalance) / 100000000;
    console.log(`\n⚠️  [BALANCE CHANGE] ${address}`);
    console.log(`   ${direction}: ${previousBalance / 100000000} → ${newBalance / 100000000} BTC`);
    console.log(`   Difference: ${diffBTC.toFixed(8)} BTC`);
    console.log(`   🔑 Passphrase: "${hit.passphrase}"`);
    console.log(`   🔐 WIF: ${hit.wif}\n`);
    
    await saveBalanceChangeEventToDb(address, previousBalance, newBalance);
    await saveBalanceHitToDb(hit);
    await saveBalanceHits();
    return { updated: true, changed: true, hit };
  }
  
  hit.balanceChanged = false;
  await saveBalanceHitToDb(hit);
  await saveBalanceHits();
  return { updated: true, changed: false, hit };
}

/**
 * Refresh all balance hits and detect any changes
 * Returns summary of refresh operation
 */
export async function refreshAllBalances(options?: {
  delayMs?: number;
  onProgress?: (current: number, total: number, address: string) => void;
}): Promise<{
  total: number;
  refreshed: number;
  changed: number;
  errors: number;
  changes: BalanceChangeEvent[];
  duration: number;
}> {
  const startTime = Date.now();
  const delayMs = options?.delayMs ?? 1000; // Default 1 second between API calls to avoid rate limiting
  
  let refreshed = 0;
  let changed = 0;
  let errors = 0;
  const newChanges: BalanceChangeEvent[] = [];
  
  console.log(`[BlockchainScanner] Starting balance refresh for ${balanceHits.length} addresses...`);
  
  for (let i = 0; i < balanceHits.length; i++) {
    const hit = balanceHits[i];
    
    if (options?.onProgress) {
      options.onProgress(i + 1, balanceHits.length, hit.address);
    }
    
    const result = await refreshSingleBalance(hit.address);
    
    if (result.error) {
      errors++;
      console.error(`[BlockchainScanner] Error refreshing ${hit.address}: ${result.error}`);
    } else if (result.updated) {
      refreshed++;
      if (result.changed) {
        changed++;
        const latestChange = balanceChanges[balanceChanges.length - 1];
        if (latestChange) {
          newChanges.push(latestChange);
        }
      }
    }
    
    // Rate limiting delay between API calls
    if (i < balanceHits.length - 1 && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  const duration = Date.now() - startTime;
  
  console.log(`[BlockchainScanner] Balance refresh complete:`);
  console.log(`   Total: ${balanceHits.length}, Refreshed: ${refreshed}, Changed: ${changed}, Errors: ${errors}`);
  console.log(`   Duration: ${(duration / 1000).toFixed(1)}s`);
  
  if (changed > 0) {
    console.log(`\n🚨 [ALERT] ${changed} balance(s) have changed!`);
  }
  
  return {
    total: balanceHits.length,
    refreshed,
    changed,
    errors,
    changes: newChanges,
    duration,
  };
}

/**
 * Get the last time balances were checked
 */
export function getLastBalanceCheck(): string | null {
  const lastCheckedDates = balanceHits
    .filter(h => h.lastChecked)
    .map(h => new Date(h.lastChecked!).getTime());
  
  if (lastCheckedDates.length === 0) return null;
  
  const mostRecent = Math.max(...lastCheckedDates);
  return new Date(mostRecent).toISOString();
}

/**
 * Get addresses that haven't been checked recently
 */
export function getStaleBalanceHits(maxAgeMinutes: number = 30): BalanceHit[] {
  const threshold = Date.now() - maxAgeMinutes * 60 * 1000;
  
  return balanceHits.filter(h => {
    if (!h.lastChecked) return true;
    return new Date(h.lastChecked).getTime() < threshold;
  });
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
