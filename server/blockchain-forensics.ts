/**
 * Blockchain Forensics - Temporal Clustering and Address Analysis
 * 
 * Analyzes blockchain data to find:
 * - Address creation timestamps (first funded date)
 * - Sibling addresses (created in same block/transaction)
 * - Transaction pattern signatures
 * - Related addresses through co-spending analysis
 * - Temporal clusters (addresses created within time windows)
 * - Era detection for strategy selection
 */

import { HistoricalDataMiner, type Era, ERA_FORMAT_WEIGHTS, type KeyFormat } from './historical-data-miner';

const BLOCKSTREAM_API = 'https://blockstream.info/api';
const BLOCKCHAIN_INFO_API = 'https://blockchain.info';

export interface AddressForensics {
  address: string;
  creationBlock?: number;
  creationTimestamp?: Date;
  firstTxHash?: string;
  totalReceived: number;
  totalSent: number;
  balance: number;
  txCount: number;
  siblingAddresses: string[];
  relatedAddresses: string[];
  transactionPatterns: TransactionPattern[];
}

export interface TransactionPattern {
  type: 'regular' | 'consolidation' | 'distribution' | 'dust' | 'round_number';
  frequency: number;
  description: string;
}

export interface TemporalCluster {
  centerAddress: string;
  addresses: string[];
  timeWindowStart: Date;
  timeWindowEnd: Date;
  avgTimeBetweenCreation: number;
  confidence: number;
}

export interface UserProfile {
  username: string;
  bitcointalkPosts: BitcoinTalkPost[];
  githubRepos: GitHubRepo[];
  forumSignatures: string[];
  extractedKeywords: string[];
  potentialPhrases: string[];
}

export interface BitcoinTalkPost {
  id: number;
  title: string;
  content: string;
  date: Date;
  keywords: string[];
}

export interface GitHubRepo {
  name: string;
  description: string;
  createdAt: Date;
  language: string;
  keywords: string[];
}

// Cache for API responses
const addressCache = new Map<string, AddressForensics>();
const TX_CACHE_TTL = 1000 * 60 * 60; // 1 hour

// Clear specific address from cache (for reanalysis)
export function clearAddressCache(address?: string): void {
  if (address) {
    addressCache.delete(address);
    console.log(`[BlockchainForensics] Cleared cache for ${address}`);
  } else {
    addressCache.clear();
    console.log(`[BlockchainForensics] Cleared all address cache`);
  }
}

export class BlockchainForensics {
  
  /**
   * Analyze a Bitcoin address for forensic clues
   * Uses blockchain.info API as primary (complete historical data) 
   * with Blockstream as fallback
   */
  async analyzeAddress(address: string): Promise<AddressForensics> {
    // Check cache
    if (addressCache.has(address)) {
      return addressCache.get(address)!;
    }

    console.log(`[BlockchainForensics] Analyzing address: ${address}`);

    try {
      // Use blockchain.info as primary source (better historical data for 2009-era addresses)
      const bcInfo = await this.fetchFromBlockchainInfo(address);
      
      // Extract first and last transaction data
      let firstTx = null;
      let lastTx = null;
      
      if (bcInfo.txs && bcInfo.txs.length > 0) {
        // blockchain.info returns newest first, so last in array is oldest
        lastTx = bcInfo.txs[0];
        
        // For oldest tx, we need to fetch with offset
        if (bcInfo.n_tx > bcInfo.txs.length) {
          // Fetch the oldest transaction
          const oldestTxData = await this.fetchOldestTransaction(address, bcInfo.n_tx);
          if (oldestTxData) {
            firstTx = oldestTxData;
          } else {
            firstTx = bcInfo.txs[bcInfo.txs.length - 1];
          }
        } else {
          firstTx = bcInfo.txs[bcInfo.txs.length - 1];
        }
      }

      // Find sibling addresses from first transaction
      const siblingAddresses = firstTx?.hash 
        ? await this.findSiblingAddresses(firstTx.hash)
        : [];
      
      // Convert blockchain.info tx format to analyze patterns
      const txHistory = bcInfo.txs || [];
      const transactionPatterns = this.analyzeTransactionPatterns(txHistory);
      
      // Find related addresses through co-spending
      const relatedAddresses = await this.findRelatedAddresses(address, txHistory);

      const forensics: AddressForensics = {
        address,
        creationBlock: firstTx?.block_height,
        creationTimestamp: firstTx?.time 
          ? new Date(firstTx.time * 1000)
          : undefined,
        firstTxHash: firstTx?.hash,
        totalReceived: bcInfo.total_received,
        totalSent: bcInfo.total_sent,
        balance: bcInfo.final_balance,
        txCount: bcInfo.n_tx,
        siblingAddresses,
        relatedAddresses,
        transactionPatterns,
      };

      console.log(`[BlockchainForensics] Address ${address}: ${bcInfo.n_tx} txs, balance: ${bcInfo.final_balance / 100000000} BTC, first seen: ${forensics.creationTimestamp?.toISOString()}`);

      // Cache result
      addressCache.set(address, forensics);
      
      return forensics;
    } catch (error) {
      console.error(`[BlockchainForensics] Error analyzing ${address}:`, error);
      
      // Return minimal forensics on error
      return {
        address,
        totalReceived: 0,
        totalSent: 0,
        balance: 0,
        txCount: 0,
        siblingAddresses: [],
        relatedAddresses: [],
        transactionPatterns: [],
      };
    }
  }

  /**
   * Fetch address data from blockchain.info (better historical data)
   */
  private async fetchFromBlockchainInfo(address: string): Promise<any> {
    const response = await fetch(`${BLOCKCHAIN_INFO_API}/rawaddr/${address}?limit=50`);
    if (!response.ok) {
      throw new Error(`blockchain.info API failed: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Fetch the oldest transaction for an address
   */
  private async fetchOldestTransaction(address: string, totalTxs: number): Promise<any> {
    try {
      const offset = Math.max(0, totalTxs - 1);
      const response = await fetch(`${BLOCKCHAIN_INFO_API}/rawaddr/${address}?limit=1&offset=${offset}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data.txs && data.txs.length > 0) {
        return data.txs[0];
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch address info from Blockstream API
   */
  private async fetchAddressInfo(address: string): Promise<any> {
    const response = await fetch(`${BLOCKSTREAM_API}/address/${address}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch address info: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Fetch FULL transaction history for an address (with pagination)
   * Blockstream API returns max 25 txs per request, need to paginate to get all
   */
  private async fetchTransactionHistory(address: string): Promise<any[]> {
    const allTxs: any[] = [];
    let lastSeenTxid: string | null = null;
    const maxPages = 10; // Safety limit (250 transactions max)
    
    for (let page = 0; page < maxPages; page++) {
      let fetchUrl: string;
      if (lastSeenTxid) {
        fetchUrl = `${BLOCKSTREAM_API}/address/${address}/txs/chain/${lastSeenTxid}`;
      } else {
        fetchUrl = `${BLOCKSTREAM_API}/address/${address}/txs`;
      }
        
      const fetchResponse: Response = await fetch(fetchUrl);
      if (!fetchResponse.ok) {
        if (page === 0) {
          throw new Error(`Failed to fetch transactions: ${fetchResponse.status}`);
        }
        break; // End of pagination
      }
      
      const txBatch: any[] = await fetchResponse.json();
      if (!txBatch || txBatch.length === 0) {
        break; // No more transactions
      }
      
      allTxs.push(...txBatch);
      
      // Get the last txid for pagination
      lastSeenTxid = txBatch[txBatch.length - 1].txid;
      
      // If we got less than 25 txs, we've reached the end
      if (txBatch.length < 25) {
        break;
      }
      
      // Small delay to be nice to the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`[BlockchainForensics] Fetched ${allTxs.length} transactions for ${address}`);
    return allTxs;
  }

  /**
   * Find sibling addresses from a transaction
   * (addresses created in the same transaction)
   */
  private async findSiblingAddresses(txid: string): Promise<string[]> {
    try {
      const response = await fetch(`${BLOCKSTREAM_API}/tx/${txid}`);
      if (!response.ok) return [];
      
      const tx = await response.json();
      const siblings: string[] = [];
      
      // Collect all output addresses
      for (const vout of tx.vout || []) {
        if (vout.scriptpubkey_address) {
          siblings.push(vout.scriptpubkey_address);
        }
      }
      
      return siblings;
    } catch (error) {
      console.error(`[BlockchainForensics] Error finding siblings for ${txid}:`, error);
      return [];
    }
  }

  /**
   * Analyze transaction patterns
   */
  private analyzeTransactionPatterns(txHistory: any[]): TransactionPattern[] {
    const patterns: TransactionPattern[] = [];
    
    if (txHistory.length === 0) return patterns;

    // Check for round number outputs
    let roundNumberCount = 0;
    let dustCount = 0;
    
    for (const tx of txHistory) {
      for (const vout of tx.vout || []) {
        const value = vout.value;
        
        // Round numbers (1 BTC, 0.5 BTC, 0.1 BTC, etc.)
        if (value % 10000000 === 0 || value % 50000000 === 0) {
          roundNumberCount++;
        }
        
        // Dust outputs (< 546 satoshis)
        if (value < 546) {
          dustCount++;
        }
      }
    }

    if (roundNumberCount > txHistory.length * 0.3) {
      patterns.push({
        type: 'round_number',
        frequency: roundNumberCount / txHistory.length,
        description: 'Frequently uses round BTC amounts',
      });
    }

    if (dustCount > 0) {
      patterns.push({
        type: 'dust',
        frequency: dustCount / txHistory.length,
        description: 'Contains dust outputs (may be spam or encoding)',
      });
    }

    // Check for consolidation pattern (many inputs, few outputs)
    const consolidationTxs = txHistory.filter(tx => 
      (tx.vin?.length || 0) > 3 && (tx.vout?.length || 0) <= 2
    );
    if (consolidationTxs.length > 0) {
      patterns.push({
        type: 'consolidation',
        frequency: consolidationTxs.length / txHistory.length,
        description: 'Shows UTXO consolidation behavior',
      });
    }

    // Check for distribution pattern (few inputs, many outputs)
    const distributionTxs = txHistory.filter(tx => 
      (tx.vin?.length || 0) <= 2 && (tx.vout?.length || 0) > 3
    );
    if (distributionTxs.length > 0) {
      patterns.push({
        type: 'distribution',
        frequency: distributionTxs.length / txHistory.length,
        description: 'Shows fund distribution behavior',
      });
    }

    return patterns;
  }

  /**
   * Find related addresses through co-spending analysis
   */
  private async findRelatedAddresses(
    address: string, 
    txHistory: any[]
  ): Promise<string[]> {
    const related = new Set<string>();
    
    // Look at input addresses (co-spent with our address)
    for (const tx of txHistory.slice(0, 10)) { // Limit to recent 10
      for (const vin of tx.vin || []) {
        if (vin.prevout?.scriptpubkey_address) {
          const addr = vin.prevout.scriptpubkey_address;
          if (addr !== address) {
            related.add(addr);
          }
        }
      }
      
      // Look at change outputs
      for (const vout of tx.vout || []) {
        if (vout.scriptpubkey_address && vout.scriptpubkey_address !== address) {
          related.add(vout.scriptpubkey_address);
        }
      }
    }
    
    return Array.from(related).slice(0, 20);
  }

  /**
   * Find temporal cluster of addresses created within a time window
   */
  async findTemporalCluster(
    address: string,
    timeWindowDays: number = 7
  ): Promise<TemporalCluster | null> {
    const forensics = await this.analyzeAddress(address);
    
    if (!forensics.creationTimestamp) {
      return null;
    }

    const windowMs = timeWindowDays * 24 * 60 * 60 * 1000;
    const windowStart = new Date(forensics.creationTimestamp.getTime() - windowMs);
    const windowEnd = new Date(forensics.creationTimestamp.getTime() + windowMs);

    // Collect related addresses within the time window
    const clusteredAddresses: string[] = [address];
    
    for (const sibling of forensics.siblingAddresses) {
      const siblingForensics = await this.analyzeAddress(sibling);
      if (siblingForensics.creationTimestamp) {
        const siblingTime = siblingForensics.creationTimestamp.getTime();
        if (siblingTime >= windowStart.getTime() && siblingTime <= windowEnd.getTime()) {
          clusteredAddresses.push(sibling);
        }
      }
    }

    if (clusteredAddresses.length < 2) {
      return null;
    }

    return {
      centerAddress: address,
      addresses: clusteredAddresses,
      timeWindowStart: windowStart,
      timeWindowEnd: windowEnd,
      avgTimeBetweenCreation: 0, // TODO: Calculate
      confidence: clusteredAddresses.length / (forensics.siblingAddresses.length + 1),
    };
  }

  /**
   * Check if an address is from the pre-BIP39 era (before 2013)
   */
  isPreBIP39Era(forensics: AddressForensics): boolean {
    if (!forensics.creationTimestamp) return true; // Assume pre-BIP39 if unknown
    
    // BIP39 was finalized in late 2013
    const bip39Date = new Date('2013-09-01');
    return forensics.creationTimestamp < bip39Date;
  }

  /**
   * Estimate the likely key format based on creation date
   */
  estimateLikelyKeyFormat(forensics: AddressForensics): {
    format: string;
    confidence: number;
    reasoning: string;
  }[] {
    const formats: { format: string; confidence: number; reasoning: string }[] = [];
    
    if (this.isPreBIP39Era(forensics)) {
      formats.push({
        format: 'arbitrary',
        confidence: 0.8,
        reasoning: 'Pre-2013 address - likely raw brain wallet (SHA256)',
      });
      formats.push({
        format: 'random',
        confidence: 0.15,
        reasoning: 'Could be early Bitcoin-Qt random key',
      });
      formats.push({
        format: 'bip39',
        confidence: 0.05,
        reasoning: 'BIP39 did not exist yet (very unlikely)',
      });
    } else {
      formats.push({
        format: 'bip39',
        confidence: 0.6,
        reasoning: 'Post-2013 address - BIP39 likely',
      });
      formats.push({
        format: 'arbitrary',
        confidence: 0.25,
        reasoning: 'Brain wallets still possible',
      });
      formats.push({
        format: 'hd_wallet',
        confidence: 0.15,
        reasoning: 'Could be HD wallet derivative',
      });
    }

    return formats.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Analyze user history from BitcoinTalk and GitHub
   * Note: This is a stub - actual implementation would require scraping
   */
  async analyzeUserHistory(username: string): Promise<UserProfile> {
    console.log(`[BlockchainForensics] Analyzing user: ${username}`);
    
    // This would require actual web scraping or API access
    // For now, return a placeholder with potential search patterns
    
    const potentialPhrases = [
      username,
      username.toLowerCase(),
      username.replace(/[0-9]/g, ''),
      // Common patterns
      `${username}bitcoin`,
      `${username}2009`,
      `${username}satoshi`,
    ];

    return {
      username,
      bitcointalkPosts: [],
      githubRepos: [],
      forumSignatures: [],
      extractedKeywords: [username.toLowerCase()],
      potentialPhrases,
    };
  }

  /**
   * Search BitcoinTalk for posts by username
   * Returns potential passphrase hints
   */
  async searchBitcoinTalk(username: string): Promise<{
    posts: BitcoinTalkPost[];
    keywords: string[];
    hints: string[];
  }> {
    // BitcoinTalk search URL pattern (would need actual scraping)
    const searchUrl = `https://bitcointalk.org/index.php?action=search2&advanced=1&search=${encodeURIComponent(username)}`;
    
    console.log(`[BlockchainForensics] BitcoinTalk search: ${searchUrl}`);
    
    // Return search guidance rather than actual results
    return {
      posts: [],
      keywords: [username],
      hints: [
        `Search BitcoinTalk for user "${username}"`,
        'Look for wallet.dat discussions',
        'Check signature lines for personal info',
        'Note any memorable phrases or slogans',
      ],
    };
  }

  /**
   * Search GitHub for early Bitcoin-related repos
   */
  async searchGitHub(username: string): Promise<{
    repos: GitHubRepo[];
    commits: string[];
    hints: string[];
  }> {
    const searchUrl = `https://github.com/search?q=${encodeURIComponent(username)}+created:<2014-01-01&type=users`;
    
    console.log(`[BlockchainForensics] GitHub search: ${searchUrl}`);
    
    return {
      repos: [],
      commits: [],
      hints: [
        `Search GitHub for user "${username}" created before 2014`,
        'Look for bitcoin-related repos',
        'Check commit messages for personal patterns',
        'Note any passphrase-like comments in code',
      ],
    };
  }
}

// Singleton instance
export const blockchainForensics = new BlockchainForensics();
