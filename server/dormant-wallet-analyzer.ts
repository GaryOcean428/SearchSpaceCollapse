/**
 * Dormant Wallet Analyzer - 4D Block Universe Targeting
 * 
 * Implements intelligent dormant wallet prioritization for recovery attempts.
 * Key insight: Focus on LOST wallets (P2PK, early adopters, long dormancy)
 * rather than random addresses or active HODLers.
 * 
 * Strategy:
 * 1. Prioritize P2PK addresses (2009-2010 only, likely lost, simple passphrases)
 * 2. Target high dormancy (>10 years = likely lost, not HODLing)
 * 3. Filter by meaningful balance (>10 BTC = worth effort)
 * 4. Generate era-specific hypotheses (2009 patterns ≠ 2017 patterns)
 * 5. Use cultural manifold coordinates for temporal targeting
 * 
 * Expected Impact: 100-1000x better ROI vs random testing
 */

import type { BitcoinEra } from './cultural-manifold';
import { dormantCrossRef, type DormantAddressInfo } from './dormant-cross-ref';

export interface DormantWalletSignature {
  address: string;
  rank: number;
  balance: number; // BTC
  balanceUSD: number;
  
  // Temporal characteristics
  creationEra: BitcoinEra;
  firstSeenDate: Date | null;
  lastSeenDate: Date | null;
  dormancyYears: number;
  
  // Classification
  addressType: 'p2pkh' | 'p2sh' | 'p2wpkh' | 'p2wsh' | 'p2tr' | 'p2pk' | 'unknown';
  isProbablyLost: boolean;
  isEarlyAdopter: boolean;
  
  // Recovery probability
  recoveryProbability: number; // [0, 1] composite score
  priorityScore: number; // [0, 100] for ranking
  
  // Era-specific hints
  likelyPassphrasePatterns: string[];
  temporalClues: {
    btcPrice?: number; // Price at creation time
    culturalMemes: string[]; // Era-specific terms
    majorEvents: string[]; // Historical context
  };
}

export interface EraPatternSet {
  era: BitcoinEra;
  commonTerms: string[];
  passphraseStyle: 'simple' | 'anonymity-focused' | 'exchange-related' | 'technical' | 'mainstream';
  avgLength: number;
  complexity: 'low' | 'medium' | 'high';
  examples: string[];
}

/**
 * Era-specific passphrase patterns based on Bitcoin cultural history
 */
const ERA_PATTERNS: Record<BitcoinEra, EraPatternSet> = {
  'satoshi-genesis': {
    era: 'satoshi-genesis',
    commonTerms: ['satoshi', 'genesis', 'chancellor', 'brink', 'bitcoin', 'nakamoto', 'cryptography', 'cypherpunk'],
    passphraseStyle: 'simple',
    avgLength: 10,
    complexity: 'low',
    examples: ['bitcoin2009', 'genesisblock', 'satoshinakamoto', 'cypherpunk', 'cryptography']
  },
  
  'satoshi-late': {
    era: 'satoshi-late',
    commonTerms: ['bitcoin', 'mining', 'blocks', 'transaction', 'wallet', 'satoshi', 'difficulty'],
    passphraseStyle: 'simple',
    avgLength: 12,
    complexity: 'low',
    examples: ['bitcoinmining', 'firstblock', 'blockchain', 'mining2010']
  },
  
  'early-adopter': {
    era: 'early-adopter',
    commonTerms: ['bitcoin', 'btc', 'digital', 'currency', 'peer', 'mining', 'wallet', 'address'],
    passphraseStyle: 'simple',
    avgLength: 14,
    complexity: 'medium',
    examples: ['digitalcurrency', 'bitcoinwallet', 'peertopeer2011', 'cryptomining']
  },
  
  'silk-road': {
    era: 'silk-road',
    commonTerms: ['silk', 'road', 'dpr', 'market', 'vendor', 'escrow', 'tor', 'onion', 'anonymous'],
    passphraseStyle: 'anonymity-focused',
    avgLength: 16,
    complexity: 'medium',
    examples: ['silkroad1234', 'darkmarket', 'vendoraccount', 'torbitcoin', 'anonymity']
  },
  
  'mt-gox': {
    era: 'mt-gox',
    commonTerms: ['mtgox', 'magic', 'karpeles', 'exchange', 'trading', 'bitcoin', 'btc'],
    passphraseStyle: 'exchange-related',
    avgLength: 14,
    complexity: 'medium',
    examples: ['mtgoxtrading', 'exchangepassword', 'magicthegathering', 'bitcointrader']
  },
  
  'post-gox': {
    era: 'post-gox',
    commonTerms: ['bitcoin', 'btc', 'blockchain', 'hodl', 'wallet', 'recovery', 'backup'],
    passphraseStyle: 'technical',
    avgLength: 16,
    complexity: 'medium',
    examples: ['blockchainwallet', 'hodlbitcoin', 'cryptorecovery', 'backupwallet']
  },
  
  'ico-boom': {
    era: 'ico-boom',
    commonTerms: ['bitcoin', 'ethereum', 'ico', 'token', 'crypto', 'blockchain', 'moon', 'lambo'],
    passphraseStyle: 'mainstream',
    avgLength: 18,
    complexity: 'high',
    examples: ['cryptomoon2017', 'icomania', 'tokeninvest', 'lamborghini']
  },
  
  'defi': {
    era: 'defi',
    commonTerms: ['defi', 'yield', 'farming', 'liquidity', 'staking', 'swap', 'uniswap', 'compound'],
    passphraseStyle: 'technical',
    avgLength: 20,
    complexity: 'high',
    examples: ['defifarming', 'yieldoptimizer', 'liquidityprovider', 'stakerewards']
  },
  
  'institutional': {
    era: 'institutional',
    commonTerms: ['bitcoin', 'btc', 'investment', 'portfolio', 'custody', 'institutional', 'grayscale'],
    passphraseStyle: 'technical',
    avgLength: 22,
    complexity: 'high',
    examples: ['institutionalbitcoin', 'custodywallet', 'portfolioallocation']
  }
};

/**
 * Determine Bitcoin era from date
 * Uses strict boundaries to avoid overlaps
 */
function dateToEra(date: Date | null): BitcoinEra {
  if (!date) return 'early-adopter'; // Default for unknown
  
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  
  // Satoshi era (2009 - Oct 2010)
  if (year === 2009) {
    return month <= 10 ? 'satoshi-genesis' : 'satoshi-late';
  }
  if (year === 2010 && month <= 10) {
    return 'satoshi-late';
  }
  
  // Early adopter (Nov 2010 - 2011)
  if (year === 2010 && month > 10) return 'early-adopter';
  if (year === 2011) return 'early-adopter';
  
  // Silk Road (2012 - mid 2013)
  if (year === 2012) return 'silk-road';
  if (year === 2013 && month <= 6) return 'silk-road';
  
  // Mt. Gox (mid 2013 - 2014)
  if (year === 2013 && month > 6) return 'mt-gox';
  if (year === 2014) return 'mt-gox';
  
  // Post-Gox (2015 - 2016)
  if (year === 2015 || year === 2016) return 'post-gox';
  
  // ICO boom (2017 - 2018)
  if (year === 2017 || year === 2018) return 'ico-boom';
  
  // DeFi (2019 - 2021)
  if (year >= 2019 && year <= 2021) return 'defi';
  
  // Institutional (2022+)
  return 'institutional';
}

/**
 * Parse date from dormant address info (format: "Jan 2009" or "2009-01-03")
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr === 'Unknown') return null;
  
  try {
    // Try ISO format first
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      return new Date(dateStr);
    }
    
    // Try "Mon YYYY" format
    const match = dateStr.match(/^(\w+)\s+(\d{4})/);
    if (match) {
      const monthMap: Record<string, number> = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      const month = monthMap[match[1]];
      const year = parseInt(match[2], 10);
      if (month !== undefined) {
        return new Date(year, month, 1);
      }
    }
    
    // Fallback: try direct parse
    return new Date(dateStr);
  } catch {
    return null;
  }
}

/**
 * Determine address type from format
 * Note: P2PK detection requires transaction data (not just address string)
 * Very early wallets (2009-2010) may be P2PK but appear as P2PKH addresses
 */
function classifyAddressType(address: string): DormantWalletSignature['addressType'] {
  if (!address) return 'unknown';
  
  if (address.startsWith('1')) return 'p2pkh'; // Legacy (could be P2PK in early era)
  if (address.startsWith('3')) return 'p2sh';  // Script hash
  if (address.startsWith('bc1q')) return 'p2wpkh'; // Native SegWit
  if (address.startsWith('bc1p')) return 'p2tr';   // Taproot
  if (address.startsWith('bc1') && address.length > 50) return 'p2wsh'; // SegWit script
  
  return 'unknown';
}

/**
 * Compute recovery probability based on multiple factors
 */
function computeRecoveryProbability(
  addressType: DormantWalletSignature['addressType'],
  dormancyYears: number,
  era: BitcoinEra,
  balance: number
): number {
  let score = 0;
  
  // Factor 1: Address type (early P2PKH treated as potentially P2PK)
  if (addressType === 'p2pk') {
    score += 0.35;
  } else if (addressType === 'p2pkh') {
    // Early P2PKH addresses (2009-2010) treated as high priority
    if (era === 'satoshi-genesis' || era === 'satoshi-late') {
      score += 0.30; // Likely simple passphrases
    } else {
      score += 0.15;
    }
  } else {
    score += 0.05;
  }
  
  // Factor 2: Dormancy (longer = more likely lost)
  if (dormancyYears > 12) score += 0.30;
  else if (dormancyYears > 10) score += 0.25;
  else if (dormancyYears > 8) score += 0.20;
  else if (dormancyYears > 5) score += 0.15;
  else score += 0.05;
  
  // Factor 3: Era (earlier = simpler passphrases)
  if (era === 'satoshi-genesis') score += 0.25;
  else if (era === 'satoshi-late') score += 0.20;
  else if (era === 'early-adopter') score += 0.15;
  else if (era === 'silk-road') score += 0.10;
  else score += 0.05;
  
  // Factor 4: Balance (meaningful but not too high = likely forgotten)
  if (balance >= 10 && balance <= 100) score += 0.10;
  else if (balance > 100 && balance <= 1000) score += 0.05;
  else if (balance > 1000) score += 0.02; // Too valuable, likely remembered
  else score += 0.01;
  
  return Math.min(1, score);
}

/**
 * Generate era-specific passphrase hypotheses
 */
export function generateTemporalHypotheses(
  wallet: DormantWalletSignature,
  limit: number = 50
): string[] {
  const hypotheses: string[] = [];
  const eraPattern = ERA_PATTERNS[wallet.creationEra];
  
  if (!eraPattern) return [];
  
  // Combine era terms with temporal context
  for (const term of eraPattern.commonTerms) {
    hypotheses.push(term);
    
    // Year variations
    if (wallet.firstSeenDate) {
      const year = wallet.firstSeenDate.getFullYear();
      hypotheses.push(`${term}${year}`);
      hypotheses.push(`${year}${term}`);
      hypotheses.push(`${term}${year.toString().slice(-2)}`); // 2009 -> 09
    }
    
    // Price variations (if available)
    if (wallet.temporalClues.btcPrice) {
      const price = Math.round(wallet.temporalClues.btcPrice);
      hypotheses.push(`${term}${price}`);
    }
    
    // Common suffixes
    hypotheses.push(`${term}123`);
    hypotheses.push(`${term}!`);
    hypotheses.push(`${term}2009`); // Default to genesis year
  }
  
  // Add example patterns
  for (const example of eraPattern.examples) {
    hypotheses.push(example);
  }
  
  // Add cultural memes
  for (const meme of wallet.temporalClues.culturalMemes) {
    hypotheses.push(meme);
    if (wallet.firstSeenDate) {
      hypotheses.push(`${meme}${wallet.firstSeenDate.getFullYear()}`);
    }
  }
  
  // Deduplicate and limit
  const unique = Array.from(new Set(hypotheses));
  return unique.slice(0, limit);
}

/**
 * Analyze dormant address and create wallet signature
 */
export function analyzeDormantAddress(info: DormantAddressInfo): DormantWalletSignature | null {
  // Parse balance
  const balanceMatch = info.balanceBTC.replace(/,/g, '').match(/[\d.]+/);
  const balanceUSDMatch = info.balanceUSD.replace(/,/g, '').match(/[\d.]+/);
  
  if (!balanceMatch) return null;
  
  const balance = parseFloat(balanceMatch[0]);
  const balanceUSD = balanceUSDMatch ? parseFloat(balanceUSDMatch[0]) : 0;
  
  // Parse dates
  const firstSeenDate = parseDate(info.firstIn);
  const lastSeenDate = parseDate(info.lastIn);
  
  // Calculate dormancy
  const now = new Date();
  const dormancyYears = lastSeenDate 
    ? (now.getTime() - lastSeenDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    : 10; // Default to 10 years if unknown
  
  // Determine era
  const creationEra = dateToEra(firstSeenDate);
  
  // Classify address type
  const addressType = classifyAddressType(info.address);
  
  // Determine if likely lost
  const isProbablyLost = (
    dormancyYears > 8 &&
    (info.classification.toLowerCase().includes('dormant') ||
     info.classification.toLowerCase().includes('lost') ||
     info.classification.toLowerCase().includes('inactive'))
  );
  
  // Check if early adopter (before 2012)
  const isEarlyAdopter = firstSeenDate ? firstSeenDate.getFullYear() < 2012 : false;
  
  // Compute recovery probability
  const recoveryProbability = computeRecoveryProbability(
    addressType,
    dormancyYears,
    creationEra,
    balance
  );
  
  // Compute priority score (0-100)
  const priorityScore = Math.round(
    recoveryProbability * 40 +
    (isProbablyLost ? 20 : 0) +
    (isEarlyAdopter ? 20 : 0) +
    (balance >= 10 ? Math.min(20, balance / 10) : 0)
  );
  
  // Generate temporal clues
  const eraPattern = ERA_PATTERNS[creationEra];
  const culturalMemes = eraPattern ? eraPattern.commonTerms.slice(0, 5) : [];
  const majorEvents: string[] = [];
  
  if (creationEra === 'satoshi-genesis') {
    majorEvents.push('Genesis block', 'First BTC transaction', 'Bitcoin 0.1 release');
  } else if (creationEra === 'silk-road') {
    majorEvents.push('Silk Road launch', 'First Bitcoin bubble', 'Mt. Gox dominance');
  }
  
  // Estimate BTC price at creation
  let btcPrice: number | undefined;
  if (firstSeenDate) {
    const year = firstSeenDate.getFullYear();
    if (year === 2009) btcPrice = 0.001;
    else if (year === 2010) btcPrice = 0.05;
    else if (year === 2011) btcPrice = 5;
    else if (year === 2012) btcPrice = 10;
    else if (year === 2013) btcPrice = 100;
  }
  
  return {
    address: info.address,
    rank: info.rank,
    balance,
    balanceUSD,
    creationEra,
    firstSeenDate,
    lastSeenDate,
    dormancyYears,
    addressType,
    isProbablyLost,
    isEarlyAdopter,
    recoveryProbability,
    priorityScore,
    likelyPassphrasePatterns: [],
    temporalClues: {
      btcPrice,
      culturalMemes,
      majorEvents,
    },
  };
}

/**
 * Get prioritized list of dormant wallets for recovery attempts
 */
export function getPrioritizedDormantWallets(
  minBalance: number = 10,
  minDormancyYears: number = 8,
  limit: number = 100
): DormantWalletSignature[] {
  // Get all dormant addresses
  const allDormant = dormantCrossRef.getTopDormant(1000);
  
  // Analyze and filter
  const analyzed = allDormant
    .map(info => analyzeDormantAddress(info))
    .filter((sig): sig is DormantWalletSignature => 
      sig !== null &&
      sig.balance >= minBalance &&
      sig.dormancyYears >= minDormancyYears &&
      sig.isProbablyLost
    );
  
  // Sort by priority score (highest first)
  analyzed.sort((a, b) => b.priorityScore - a.priorityScore);
  
  // Generate passphrase patterns for top candidates
  const topCandidates = analyzed.slice(0, limit);
  for (const wallet of topCandidates) {
    wallet.likelyPassphrasePatterns = generateTemporalHypotheses(wallet, 20);
  }
  
  return topCandidates;
}

/**
 * Get statistics about dormant wallet population
 */
export function getDormantWalletStats(): {
  totalDormant: number;
  highPriority: number; // Priority score >= 70
  earlyAdopters: number;
  totalValue: { btc: number; usd: number };
  eraDistribution: Record<BitcoinEra, number>;
} {
  const all = dormantCrossRef.getTopDormant(1000);
  const analyzed = all
    .map(info => analyzeDormantAddress(info))
    .filter((sig): sig is DormantWalletSignature => sig !== null);
  
  const highPriority = analyzed.filter(w => w.priorityScore >= 70).length;
  const earlyAdopters = analyzed.filter(w => w.isEarlyAdopter).length;
  
  let totalBTC = 0;
  let totalUSD = 0;
  const eraDistribution: Record<string, number> = {};
  
  for (const wallet of analyzed) {
    totalBTC += wallet.balance;
    totalUSD += wallet.balanceUSD;
    eraDistribution[wallet.creationEra] = (eraDistribution[wallet.creationEra] || 0) + 1;
  }
  
  return {
    totalDormant: analyzed.length,
    highPriority,
    earlyAdopters,
    totalValue: { btc: totalBTC, usd: totalUSD },
    eraDistribution: eraDistribution as Record<BitcoinEra, number>,
  };
}

console.log('[DormantWalletAnalyzer] Initialized 4D block universe targeting system');
