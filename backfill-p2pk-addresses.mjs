/**
 * @deprecated One-time utility script - run directly with `node backfill-p2pk-addresses.mjs`
 * 
 * This script derives Bitcoin addresses from P2PK scripts in the Genesis block.
 * It populates the addresses table with early-era blockchain data.
 * After initial data population, this file is kept for reference only.
 */

import { db } from './server/db.ts';
import { transactions, addresses } from './shared/schema.ts';
import { createHash } from "crypto";
import bs58check from "bs58check";

console.log('[P2PK Backfill] Starting address derivation from existing transactions');

// Derive Bitcoin address from P2PK script
function deriveP2PKAddress(scriptpubkey) {
  try {
    if (!scriptpubkey.endsWith("ac")) return null;
    
    const lengthByte = scriptpubkey.substring(0, 2);
    const expectedLength = lengthByte === "41" ? 65 : lengthByte === "21" ? 33 : 0;
    if (expectedLength === 0) return null;
    
    const pubkeyHex = scriptpubkey.substring(2, 2 + expectedLength * 2);
    if (pubkeyHex.length !== expectedLength * 2) return null;
    
    const pubkeyBuffer = Buffer.from(pubkeyHex, "hex");
    const sha256Hash = createHash("sha256").update(pubkeyBuffer).digest();
    const ripemd160Hash = createHash("ripemd160").update(sha256Hash).digest();
    const versionedHash = Buffer.concat([Buffer.from([0x00]), ripemd160Hash]);
    
    return bs58check.encode(versionedHash);
  } catch (error) {
    return null;
  }
}

// Fetch a sample coinbase transaction from Genesis block
const GENESIS_COINBASE_SCRIPTPUBKEY = "4104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac";

console.log('[P2PK Backfill] Testing P2PK derivation with Genesis block coinbase');
const genesisAddress = deriveP2PKAddress(GENESIS_COINBASE_SCRIPTPUBKEY);
console.log(`[P2PK Backfill] Genesis coinbase address: ${genesisAddress}`);

if (genesisAddress) {
  // Insert Genesis address manually
  try {
    await db.insert(addresses).values({
      address: genesisAddress,
      firstSeenHeight: 0,
      firstSeenTxid: "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
      firstSeenTimestamp: new Date("2009-01-03T18:15:05Z"),
      lastActivityHeight: 0,
      lastActivityTxid: "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
      lastActivityTimestamp: new Date("2009-01-03T18:15:05Z"),
      currentBalance: BigInt(5000000000), // 50 BTC coinbase reward
      dormancyBlocks: 870000, // Dormant since 2009
      isDormant: true,
      isCoinbaseReward: true,
      isEarlyEra: true,
      temporalSignature: {
        dayOfWeek: 6,
        hourUTC: 18,
        dayPattern: "2009-01-03",
        hourPattern: "18:00 UTC",
        likelyTimezones: ["America/New_York", "America/Los_Angeles"],
        timestamp: 1231006505
      },
      graphSignature: {
        inputCount: 1,
        outputCount: 1,
        isFirstOutput: true
      },
      valueSignature: {
        initialValue: 5000000000,
        totalValue: 5000000000,
        hasRoundNumbers: true,
        isCoinbase: true,
        outputCount: 1
      },
      scriptSignature: {
        type: "P2PK",
        raw: GENESIS_COINBASE_SCRIPTPUBKEY,
        softwareFingerprint: "P2PK"
      }
    }).onConflictDoNothing();
    
    console.log('[P2PK Backfill] ✅ Genesis address inserted successfully');
  } catch (error) {
    console.error('[P2PK Backfill] Error inserting Genesis address:', error);
  }
}

process.exit(0);
