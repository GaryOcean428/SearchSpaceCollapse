/**
 * Historical Keywords Service
 * 
 * Provides temporal keyword bursts and historical patterns for Bitcoin recovery
 * Focuses on words trending during Bitcoin's early years (2009-2013)
 * 
 * Categories:
 * - Early adopter patterns (2009-2013 word choices)
 * - Common passwords of that era
 * - Temporal keyword bursts (events, trends, memes)
 * - Tech/crypto terminology popular at the time
 */

export interface HistoricalKeywordSet {
  year: number;
  category: string;
  keywords: string[];
  weight: number; // Relevance weight for recovery
}

/**
 * Historical keyword sets organized by year and category
 */
export const HISTORICAL_KEYWORDS: HistoricalKeywordSet[] = [
  // 2009 - Bitcoin Genesis
  {
    year: 2009,
    category: 'bitcoin-genesis',
    keywords: [
      'satoshi', 'nakamoto', 'bitcoin', 'genesis', 'chancellor', 'brink',
      'bailout', 'banks', 'whitepaper', 'cryptography', 'peer-to-peer',
      'p2p', 'digital', 'cash', 'ecash', 'cypherpunk', 'hal', 'finney',
    ],
    weight: 1.0,
  },
  {
    year: 2009,
    category: 'world-events',
    keywords: [
      'obama', 'inauguration', 'recession', 'bailout', 'stimulus',
      'financial', 'crisis', 'lehman', 'aig', 'tarp', 'bernanke',
      'swine', 'flu', 'h1n1', 'michael', 'jackson',
    ],
    weight: 0.8,
  },
  {
    year: 2009,
    category: 'tech-culture',
    keywords: [
      'iphone', 'iphone3gs', 'twitter', 'facebook', 'avatar', 'minecraft',
      'windows7', 'bing', 'android', 'palm', 'pre', 'chrome',
    ],
    weight: 0.7,
  },
  
  // 2010 - Early Adoption
  {
    year: 2010,
    category: 'bitcoin-milestones',
    keywords: [
      'pizza', 'laszlo', '10000btc', 'mtgox', 'slashdot', 'bitcointalk',
      'mining', 'gpu', 'block', 'reward', 'faucet', 'testnet',
    ],
    weight: 1.0,
  },
  {
    year: 2010,
    category: 'world-events',
    keywords: [
      'wikileaks', 'assange', 'ipad', 'deepwater', 'horizon', 'haiti',
      'earthquake', 'arab', 'spring', 'volcano', 'iceland',
    ],
    weight: 0.8,
  },
  {
    year: 2010,
    category: 'tech-culture',
    keywords: [
      'instagram', 'pinterest', 'whatsapp', 'iphone4', 'retina',
      'angry', 'birds', 'foursquare', 'groupon', 'kindle',
    ],
    weight: 0.7,
  },
  
  // 2011 - Growing Awareness
  {
    year: 2011,
    category: 'bitcoin-ecosystem',
    keywords: [
      'silkroad', 'dread', 'pirate', 'roberts', 'gox', 'exchange',
      'wallet', 'private', 'key', 'address', 'blockchain', 'namecoin',
      'litecoin', 'altcoin', 'difficulty', 'halving',
    ],
    weight: 1.0,
  },
  {
    year: 2011,
    category: 'world-events',
    keywords: [
      'occupy', 'wall', 'street', 'fukushima', 'tsunami', 'japan',
      'arab', 'spring', 'gaddafi', 'libya', 'osama', 'bin', 'laden',
      'steve', 'jobs', 'death',
    ],
    weight: 0.8,
  },
  {
    year: 2011,
    category: 'tech-culture',
    keywords: [
      'siri', 'iphone4s', 'google+', 'snapchat', 'uber', 'airbnb',
      'chromebook', 'icloud', 'minecraft', 'skyrim', 'portal2',
    ],
    weight: 0.7,
  },
  
  // 2012 - Mainstream Curiosity
  {
    year: 2012,
    category: 'bitcoin-growth',
    keywords: [
      'wordpress', 'accepts', 'bitcoin', 'reward', 'halving', '25btc',
      'butterfly', 'labs', 'asic', 'fpga', 'mining', 'pool', 'difficulty',
      'bitpay', 'coinbase', 'blockchain.info',
    ],
    weight: 1.0,
  },
  {
    year: 2012,
    category: 'world-events',
    keywords: [
      'obama', 'romney', 'election', 'sandy', 'hurricane', 'london',
      'olympics', 'gangnam', 'style', 'mayan', 'calendar', '2012',
      'apocalypse', 'higgs', 'boson',
    ],
    weight: 0.8,
  },
  {
    year: 2012,
    category: 'tech-culture',
    keywords: [
      'iphone5', 'windows8', 'surface', 'nexus', 'instagram', 'facebook',
      'pinterest', 'raspberry', 'pi', 'oculus', 'rift', 'avengers',
    ],
    weight: 0.7,
  },
  
  // 2013 - Bull Run
  {
    year: 2013,
    category: 'bitcoin-boom',
    keywords: [
      'cyprus', 'bailout', 'capital', 'controls', '1000', 'dollar',
      'bubble', 'rally', 'mt', 'gox', 'china', 'ban', 'silk', 'road',
      'seized', 'fbi', 'winklevoss', 'twins', 'etf',
    ],
    weight: 1.0,
  },
  {
    year: 2013,
    category: 'world-events',
    keywords: [
      'snowden', 'nsa', 'prism', 'surveillance', 'boston', 'marathon',
      'bombing', 'pope', 'francis', 'mandela', 'death', 'syria',
    ],
    weight: 0.8,
  },
  {
    year: 2013,
    category: 'tech-culture',
    keywords: [
      'iphone5s', 'iphone5c', 'xbox', 'one', 'ps4', 'doge', 'dogecoin',
      'such', 'wow', 'google', 'glass', 'tesla', 'model', 's',
    ],
    weight: 0.7,
  },
];

/**
 * Common password patterns from 2009-2013 era
 */
export const COMMON_PASSWORDS_2009_2013 = [
  // Top passwords from data breaches
  'password', 'password1', 'password123', '123456', '12345678', 'qwerty',
  'abc123', 'monkey', 'letmein', 'dragon', 'master', 'sunshine',
  'princess', 'football', 'soccer', 'baseball', 'batman', 'trustno1',
  'welcome', 'login', 'admin', 'root', 'guest', 'test', 'temp',
  
  // Bitcoin-specific patterns
  'bitcoin', 'satoshi', 'btc', 'cryptocurrency', 'blockchain',
  'wallet', 'mybitcoin', 'bitcoinwallet', 'cryptowallet',
  
  // Tech culture
  'matrix', 'anonymous', 'hacker', 'cypherpunk', 'crypto',
  'freedom', 'liberty', 'revolution', 'decentralized',
];

/**
 * Generate variations of a keyword with common patterns
 */
export function generateKeywordVariations(keyword: string): string[] {
  const variations: string[] = [keyword];
  const lower = keyword.toLowerCase();
  const upper = keyword.toUpperCase();
  const capitalized = lower.charAt(0).toUpperCase() + lower.slice(1);
  
  // Case variations
  variations.push(lower, upper, capitalized);
  
  // Number suffixes (common password patterns)
  for (const suffix of ['1', '123', '2009', '2010', '2011', '2012', '2013', '!', '!!']) {
    variations.push(lower + suffix);
    variations.push(capitalized + suffix);
  }
  
  // Bitcoin-specific combinations
  if (!lower.includes('bitcoin') && !lower.includes('btc')) {
    variations.push(lower + 'bitcoin');
    variations.push('bitcoin' + lower);
    variations.push(lower + 'btc');
    variations.push('btc' + lower);
  }
  
  // Common prefixes
  for (const prefix of ['my', 'the', 'bitcoin']) {
    variations.push(prefix + lower);
    variations.push(prefix + capitalized);
  }
  
  return [...new Set(variations)]; // Remove duplicates
}

/**
 * Get keywords for a specific year range
 */
export function getKeywordsForYears(startYear: number, endYear: number): string[] {
  return HISTORICAL_KEYWORDS
    .filter(set => set.year >= startYear && set.year <= endYear)
    .flatMap(set => set.keywords);
}

/**
 * Get high-weight keywords (most relevant for recovery)
 */
export function getHighPriorityKeywords(minWeight: number = 0.8): string[] {
  return HISTORICAL_KEYWORDS
    .filter(set => set.weight >= minWeight)
    .flatMap(set => set.keywords);
}

/**
 * Generate hypothesis phrases combining historical keywords
 */
export function generateHistoricalPhrases(count: number = 100): string[] {
  const phrases: string[] = [];
  const allKeywords = HISTORICAL_KEYWORDS.flatMap(set => set.keywords);
  // Note: weights variable is intentionally unused - kept for future statistical weighting
  // const weights = HISTORICAL_KEYWORDS.flatMap(set => 
  //   set.keywords.map(() => set.weight)
  // );
  
  // Single keyword phrases
  for (let i = 0; i < count / 2; i++) {
    const idx = Math.floor(Math.random() * allKeywords.length);
    const keyword = allKeywords[idx];
    phrases.push(...generateKeywordVariations(keyword));
  }
  
  // Two-word combinations (higher Φ potential)
  for (let i = 0; i < count / 2; i++) {
    const idx1 = Math.floor(Math.random() * allKeywords.length);
    const idx2 = Math.floor(Math.random() * allKeywords.length);
    if (idx1 !== idx2) {
      const phrase = `${allKeywords[idx1]} ${allKeywords[idx2]}`;
      phrases.push(phrase);
      phrases.push(phrase.toLowerCase());
    }
  }
  
  // Add common passwords
  phrases.push(...COMMON_PASSWORDS_2009_2013);
  
  return [...new Set(phrases)]; // Remove duplicates
}

/**
 * Get temporal keyword burst for a specific event
 */
export function getEventKeywords(event: 'financial-crisis' | 'bitcoin-pizza' | 'silkroad' | 'cyprus'): string[] {
  const eventMaps: Record<string, string[]> = {
    'financial-crisis': [
      'bailout', 'lehman', 'crisis', 'recession', 'stimulus', 'tarp',
      'bernanke', 'fed', 'federal', 'reserve', 'wall', 'street',
    ],
    'bitcoin-pizza': [
      'pizza', 'laszlo', '10000', '10000btc', 'bitcoinpizza', 'first',
      'transaction', 'may', '22', '2010',
    ],
    'silkroad': [
      'silkroad', 'silk', 'road', 'darknet', 'tor', 'dread', 'pirate',
      'roberts', 'ulbricht', 'drugs', 'marketplace',
    ],
    'cyprus': [
      'cyprus', 'bailout', 'capital', 'controls', 'bank', 'run',
      'confiscation', 'safe', 'haven', '2013',
    ],
  };
  
  return eventMaps[event] || [];
}

/**
 * Statistical analysis of keyword effectiveness
 */
export interface KeywordStats {
  keyword: string;
  occurrences: number;
  successRate: number;
  avgPhi: number;
}

let keywordStats: Map<string, KeywordStats> = new Map();

export function recordKeywordAttempt(keyword: string, success: boolean, phi: number): void {
  const stats = keywordStats.get(keyword) || {
    keyword,
    occurrences: 0,
    successRate: 0,
    avgPhi: 0,
  };
  
  stats.occurrences++;
  const prevTotal = stats.occurrences - 1;
  stats.avgPhi = (stats.avgPhi * prevTotal + phi) / stats.occurrences;
  stats.successRate = success ? 1 : stats.successRate;
  
  keywordStats.set(keyword, stats);
}

export function getTopKeywords(limit: number = 50): KeywordStats[] {
  return Array.from(keywordStats.values())
    .sort((a, b) => b.avgPhi - a.avgPhi)
    .slice(0, limit);
}

console.log('[HistoricalKeywords] Loaded historical keyword database');
console.log(`[HistoricalKeywords] Total keyword sets: ${HISTORICAL_KEYWORDS.length}`);
console.log(`[HistoricalKeywords] Total unique keywords: ${new Set(HISTORICAL_KEYWORDS.flatMap(s => s.keywords)).size}`);
