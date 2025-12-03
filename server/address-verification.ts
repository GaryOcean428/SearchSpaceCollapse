/**
 * Comprehensive Address Verification & Storage System
 * 
 * ENSURES:
 * 1. Every generated address is checked against target addresses
 * 2. Every address is checked for balance via blockchain APIs
 * 3. ALL addresses with transactions are stored
 * 4. Balance addresses are highlighted
 * 5. Complete data stored: passphrase, WIF, private key, public key, address type
 * 6. Mnemonic phrases if applicable
 * 7. Stress tested verification logic
 */

import { checkAndRecordBalance, getBalanceHits, getActiveBalanceHits } from './blockchain-scanner';
import { generateBitcoinAddress, getPrivateKeyWIF, getPublicKey } from './crypto';
import { balanceQueue } from './balance-queue';
import { getAddressData } from './blockchain-api-router';
import { createHash } from 'crypto';

export interface AddressGenerationResult {
  address: string;
  passphrase: string;
  wif: string;
  privateKeyHex: string;
  publicKeyHex: string;
  publicKeyCompressed: string;
  isCompressed: boolean;
  addressType: 'P2PKH' | 'P2SH' | 'P2WPKH' | 'P2WSH' | 'Unknown';
  mnemonic?: string; // If generated from BIP39
  derivationPath?: string; // If from HD wallet
  generatedAt: string;
}

export interface VerificationResult {
  address: string;
  passphrase: string;
  matchesTarget: boolean;
  targetAddress?: string;
  hasBalance: boolean;
  balanceSats: number;
  hasTransactions: boolean;
  txCount: number;
  stored: boolean;
  verifiedAt: string;
  error?: string;
}

export interface StoredAddress {
  id: string;
  address: string;
  passphrase: string;
  wif: string;
  privateKeyHex: string;
  publicKeyHex: string;
  publicKeyCompressed: string;
  isCompressed: boolean;
  addressType: string;
  mnemonic?: string;
  derivationPath?: string;
  balanceSats: number;
  balanceBTC: string;
  txCount: number;
  hasBalance: boolean;
  hasTransactions: boolean;
  firstSeen: string;
  lastChecked?: string;
  matchedTarget?: string;
}

// In-memory storage with disk backup
const verifiedAddresses: Map<string, StoredAddress> = new Map();
const VERIFIED_ADDRESSES_FILE = 'data/verified-addresses.json';
const BALANCE_ADDRESSES_FILE = 'data/balance-addresses.json';
const TRANSACTION_ADDRESSES_FILE = 'data/transaction-addresses.json';

/**
 * Generate address with COMPLETE data extraction
 */
export function generateCompleteAddress(
  passphrase: string,
  compressed: boolean = true,
  mnemonic?: string,
  derivationPath?: string
): AddressGenerationResult {
  // Generate address
  const address = generateBitcoinAddress(passphrase, compressed);
  
  // Generate private key
  const privateKeyHash = createHash("sha256").update(passphrase, "utf8").digest();
  const privateKeyHex = privateKeyHash.toString('hex');
  
  // Generate WIF
  const wif = getPrivateKeyWIF(privateKeyHex, compressed);
  
  // Generate public keys
  const publicKeyUncompressed = getPublicKey(privateKeyHex, false);
  const publicKeyCompressed = getPublicKey(privateKeyHex, true);
  
  // Determine address type
  let addressType: 'P2PKH' | 'P2SH' | 'P2WPKH' | 'P2WSH' | 'Unknown' = 'Unknown';
  if (address.startsWith('1')) addressType = 'P2PKH';
  else if (address.startsWith('3')) addressType = 'P2SH';
  else if (address.startsWith('bc1q')) addressType = 'P2WPKH';
  else if (address.startsWith('bc1p')) addressType = 'P2WSH';
  
  return {
    address,
    passphrase,
    wif,
    privateKeyHex,
    publicKeyHex: publicKeyUncompressed,
    publicKeyCompressed,
    isCompressed: compressed,
    addressType,
    mnemonic,
    derivationPath,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Verify address against targets AND check balance
 * STORES everything - target matches, balance addresses, transaction addresses
 */
export async function verifyAndStoreAddress(
  generated: AddressGenerationResult,
  targetAddresses: string[] = []
): Promise<VerificationResult> {
  const result: VerificationResult = {
    address: generated.address,
    passphrase: generated.passphrase,
    matchesTarget: false,
    hasBalance: false,
    balanceSats: 0,
    hasTransactions: false,
    txCount: 0,
    stored: false,
    verifiedAt: new Date().toISOString(),
  };
  
  try {
    // 1. Check against target addresses
    if (targetAddresses.length > 0) {
      const match = targetAddresses.find(t => t === generated.address);
      if (match) {
        result.matchesTarget = true;
        result.targetAddress = match;
        console.log(`\n🎯 [TARGET MATCH] ${generated.address}`);
        console.log(`   🔑 Passphrase: "${generated.passphrase}"`);
        console.log(`   🔐 WIF: ${generated.wif}`);
        console.log(`   🔑 Private Key: ${generated.privateKeyHex}\n`);
      }
    }
    
    // 2. Check balance via blockchain API
    try {
      const addressData = await getAddressData(generated.address);
      
      if (addressData) {
        result.balanceSats = addressData.balance;
        result.txCount = addressData.txCount;
        result.hasBalance = addressData.balance > 0;
        result.hasTransactions = addressData.txCount > 0;
        
        // 3. Store if has transactions OR matches target
        if (result.hasTransactions || result.matchesTarget) {
          const stored: StoredAddress = {
            id: `${generated.address}_${Date.now()}`,
            address: generated.address,
            passphrase: generated.passphrase,
            wif: generated.wif,
            privateKeyHex: generated.privateKeyHex,
            publicKeyHex: generated.publicKeyHex,
            publicKeyCompressed: generated.publicKeyCompressed,
            isCompressed: generated.isCompressed,
            addressType: generated.addressType,
            mnemonic: generated.mnemonic,
            derivationPath: generated.derivationPath,
            balanceSats: addressData.balance,
            balanceBTC: (addressData.balance / 100000000).toFixed(8),
            txCount: addressData.txCount,
            hasBalance: result.hasBalance,
            hasTransactions: result.hasTransactions,
            firstSeen: generated.generatedAt,
            lastChecked: result.verifiedAt,
            matchedTarget: result.matchesTarget ? result.targetAddress : undefined,
          };
          
          verifiedAddresses.set(generated.address, stored);
          result.stored = true;
          
          // Save to appropriate files
          await saveStoredAddresses();
          
          // Also use existing balance recording system
          if (result.hasBalance || result.hasTransactions) {
            await checkAndRecordBalance(
              generated.address,
              generated.passphrase,
              generated.wif,
              generated.isCompressed
            );
          }
          
          // Log based on type
          if (result.hasBalance) {
            console.log(`\n💰 [BALANCE ADDRESS] ${generated.address}`);
            console.log(`   Balance: ${stored.balanceBTC} BTC (${stored.balanceSats} sats)`);
            console.log(`   Transactions: ${stored.txCount}`);
            console.log(`   🔑 Passphrase: "${generated.passphrase}"`);
            console.log(`   🔐 WIF: ${generated.wif}`);
            console.log(`   🔑 Private Key: ${generated.privateKeyHex}\n`);
          } else if (result.hasTransactions) {
            console.log(`\n📊 [TRANSACTION HISTORY] ${generated.address}`);
            console.log(`   Transactions: ${stored.txCount} (balance: 0)`);
            console.log(`   🔑 Passphrase: "${generated.passphrase}"`);
            console.log(`   🔐 WIF: ${generated.wif}\n`);
          }
        }
      }
    } catch (apiError) {
      result.error = `API Error: ${apiError instanceof Error ? apiError.message : String(apiError)}`;
      // Still queue for later checking
      balanceQueue.addAddress({
        address: generated.address,
        passphrase: generated.passphrase,
        wif: generated.wif,
        isCompressed: generated.isCompressed,
      });
    }
    
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    console.error(`[AddressVerification] Error verifying ${generated.address}:`, error);
  }
  
  return result;
}

/**
 * Batch verify multiple addresses (optimized)
 */
export async function batchVerifyAddresses(
  addresses: AddressGenerationResult[],
  targetAddresses: string[] = [],
  concurrency: number = 10
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];
  
  // Process in batches for rate limiting
  for (let i = 0; i < addresses.length; i += concurrency) {
    const batch = addresses.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(addr => verifyAndStoreAddress(addr, targetAddresses))
    );
    results.push(...batchResults);
    
    // Small delay between batches to avoid rate limiting
    if (i + concurrency < addresses.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

/**
 * Save verified addresses to disk (categorized)
 */
async function saveStoredAddresses(): Promise<void> {
  try {
    const fs = await import('fs/promises');
    await fs.mkdir('data', { recursive: true });
    
    const allAddresses = Array.from(verifiedAddresses.values());
    
    // Save all verified addresses
    await fs.writeFile(
      VERIFIED_ADDRESSES_FILE,
      JSON.stringify(allAddresses, null, 2)
    );
    
    // Save balance addresses separately (highlighted)
    const balanceAddresses = allAddresses.filter(a => a.hasBalance);
    await fs.writeFile(
      BALANCE_ADDRESSES_FILE,
      JSON.stringify(balanceAddresses, null, 2)
    );
    
    // Save transaction addresses
    const transactionAddresses = allAddresses.filter(a => a.hasTransactions);
    await fs.writeFile(
      TRANSACTION_ADDRESSES_FILE,
      JSON.stringify(transactionAddresses, null, 2)
    );
    
    console.log(`[AddressVerification] Saved ${allAddresses.length} addresses (${balanceAddresses.length} with balance, ${transactionAddresses.length} with transactions)`);
  } catch (error) {
    console.error('[AddressVerification] Error saving addresses:', error);
  }
}

/**
 * Load verified addresses from disk
 */
async function loadStoredAddresses(): Promise<void> {
  try {
    const fs = await import('fs/promises');
    const data = await fs.readFile(VERIFIED_ADDRESSES_FILE, 'utf-8');
    const addresses: StoredAddress[] = JSON.parse(data);
    
    for (const addr of addresses) {
      verifiedAddresses.set(addr.address, addr);
    }
    
    console.log(`[AddressVerification] Loaded ${addresses.length} verified addresses from disk`);
  } catch {
    console.log('[AddressVerification] No previous verified addresses found');
  }
}

/**
 * Get statistics
 */
export function getVerificationStats() {
  const all = Array.from(verifiedAddresses.values());
  return {
    total: all.length,
    withBalance: all.filter(a => a.hasBalance).length,
    withTransactions: all.filter(a => a.hasTransactions).length,
    matchedTargets: all.filter(a => a.matchedTarget).length,
    totalBalance: all.reduce((sum, a) => sum + a.balanceSats, 0),
    totalBalanceBTC: (all.reduce((sum, a) => sum + a.balanceSats, 0) / 100000000).toFixed(8),
  };
}

/**
 * Get all addresses with balance
 */
export function getBalanceAddresses(): StoredAddress[] {
  return Array.from(verifiedAddresses.values()).filter(a => a.hasBalance);
}

/**
 * Get all addresses with transaction history
 */
export function getTransactionAddresses(): StoredAddress[] {
  return Array.from(verifiedAddresses.values()).filter(a => a.hasTransactions);
}

/**
 * Refresh balance for stored addresses
 */
export async function refreshStoredBalances(): Promise<{
  checked: number;
  updated: number;
  newBalance: number;
}> {
  const addresses = Array.from(verifiedAddresses.values());
  let checked = 0;
  let updated = 0;
  let newBalance = 0;
  
  console.log(`[AddressVerification] Refreshing balances for ${addresses.length} addresses...`);
  
  for (const stored of addresses) {
    try {
      const addressData = await getAddressData(stored.address);
      
      if (addressData) {
        checked++;
        
        if (addressData.balance !== stored.balanceSats) {
          console.log(`[AddressVerification] Balance changed for ${stored.address}: ${stored.balanceSats} → ${addressData.balance} sats`);
          stored.balanceSats = addressData.balance;
          stored.balanceBTC = (addressData.balance / 100000000).toFixed(8);
          stored.hasBalance = addressData.balance > 0;
          updated++;
          
          if (addressData.balance > 0 && !stored.hasBalance) {
            newBalance++;
          }
        }
        
        stored.txCount = addressData.txCount;
        stored.hasTransactions = addressData.txCount > 0;
        stored.lastChecked = new Date().toISOString();
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`[AddressVerification] Error refreshing ${stored.address}:`, error);
    }
  }
  
  if (updated > 0) {
    await saveStoredAddresses();
  }
  
  console.log(`[AddressVerification] Refresh complete: ${checked} checked, ${updated} updated, ${newBalance} new balances`);
  
  return { checked, updated, newBalance };
}

// Auto-load on module init
loadStoredAddresses();

export const addressVerification = {
  generateCompleteAddress,
  verifyAndStoreAddress,
  batchVerifyAddresses,
  getVerificationStats,
  getBalanceAddresses,
  getTransactionAddresses,
  refreshStoredBalances,
};
