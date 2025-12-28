/**
 * Temporal Keyword Expansion Module
 * 
 * Generates hypotheses based on trending keywords during Bitcoin's early years.
 * Words and phrases that were culturally relevant during wallet creation
 * are more likely to have been used as passphrases.
 * 
 * Organized by year and category:
 * - Political events
 * - Technology trends
 * - Pop culture
 * - Economic events
 * - Social phenomena
 */

export interface TemporalKeyword {
  keyword: string;
  year: number;
  category: 'politics' | 'technology' | 'pop_culture' | 'economics' | 'social' | 'crypto';
  relevance: number; // 0-1, how likely to be used as passphrase
  context: string; // Why this was significant
}

/**
 * 2009 Temporal Keywords
 */
export const KEYWORDS_2009: TemporalKeyword[] = [
  // Politics
  { keyword: 'obama', year: 2009, category: 'politics', relevance: 0.7, context: 'Obama inauguration January 2009' },
  { keyword: 'inauguration', year: 2009, category: 'politics', relevance: 0.5, context: 'Historic inauguration' },
  { keyword: 'change we can believe in', year: 2009, category: 'politics', relevance: 0.6, context: 'Obama campaign slogan' },
  { keyword: 'yes we can', year: 2009, category: 'politics', relevance: 0.6, context: 'Obama slogan' },
  
  // Economics
  { keyword: 'bailout', year: 2009, category: 'economics', relevance: 0.8, context: 'Bank bailouts, inspired Bitcoin' },
  { keyword: 'financial crisis', year: 2009, category: 'economics', relevance: 0.7, context: '2008-2009 crisis' },
  { keyword: 'recession', year: 2009, category: 'economics', relevance: 0.6, context: 'Great Recession' },
  { keyword: 'too big to fail', year: 2009, category: 'economics', relevance: 0.7, context: 'Bank phrase' },
  { keyword: 'lehman brothers', year: 2009, category: 'economics', relevance: 0.6, context: 'Bankruptcy 2008' },
  
  // Technology
  { keyword: 'iphone 3gs', year: 2009, category: 'technology', relevance: 0.5, context: 'Released June 2009' },
  { keyword: 'windows 7', year: 2009, category: 'technology', relevance: 0.5, context: 'Released October 2009' },
  { keyword: 'twitter', year: 2009, category: 'technology', relevance: 0.5, context: 'Growing rapidly' },
  { keyword: 'netbook', year: 2009, category: 'technology', relevance: 0.4, context: 'Popular device type' },
  
  // Pop Culture
  { keyword: 'avatar', year: 2009, category: 'pop_culture', relevance: 0.6, context: 'Movie released December 2009' },
  { keyword: 'michael jackson', year: 2009, category: 'pop_culture', relevance: 0.6, context: 'Died June 2009' },
  { keyword: 'swine flu', year: 2009, category: 'social', relevance: 0.5, context: 'H1N1 pandemic' },
  { keyword: 'miracle on the hudson', year: 2009, category: 'social', relevance: 0.5, context: 'January 2009 plane landing' },
  
  // Crypto
  { keyword: 'satoshi', year: 2009, category: 'crypto', relevance: 0.9, context: 'Bitcoin creator' },
  { keyword: 'genesis block', year: 2009, category: 'crypto', relevance: 0.8, context: 'First Bitcoin block' },
  { keyword: 'chancellor brink', year: 2009, category: 'crypto', relevance: 0.8, context: 'Genesis block headline' },
];

/**
 * 2010 Temporal Keywords
 */
export const KEYWORDS_2010: TemporalKeyword[] = [
  // Technology
  { keyword: 'ipad', year: 2010, category: 'technology', relevance: 0.6, context: 'Released April 2010' },
  { keyword: 'instagram', year: 2010, category: 'technology', relevance: 0.5, context: 'Launched October 2010' },
  { keyword: 'foursquare', year: 2010, category: 'technology', relevance: 0.4, context: 'Popular check-in app' },
  
  // Crypto
  { keyword: 'pizza day', year: 2010, category: 'crypto', relevance: 0.8, context: '10,000 BTC for pizza May 22' },
  { keyword: 'laszlo', year: 2010, category: 'crypto', relevance: 0.6, context: 'Pizza buyer' },
  { keyword: 'bitcoin faucet', year: 2010, category: 'crypto', relevance: 0.7, context: 'Gavin Andresen faucet' },
  { keyword: 'slush pool', year: 2010, category: 'crypto', relevance: 0.6, context: 'First mining pool' },
  { keyword: 'wikileaks', year: 2010, category: 'crypto', relevance: 0.7, context: 'Bitcoin donations controversy' },
  
  // Pop Culture
  { keyword: 'inception', year: 2010, category: 'pop_culture', relevance: 0.5, context: 'Popular movie' },
  { keyword: 'fifa world cup', year: 2010, category: 'pop_culture', relevance: 0.4, context: 'South Africa 2010' },
  { keyword: 'vuvuzela', year: 2010, category: 'pop_culture', relevance: 0.4, context: 'World Cup horn' },
  
  // Social
  { keyword: 'deepwater horizon', year: 2010, category: 'social', relevance: 0.5, context: 'Oil spill disaster' },
  { keyword: 'haiti earthquake', year: 2010, category: 'social', relevance: 0.4, context: 'January 2010 disaster' },
];

/**
 * 2011 Temporal Keywords
 */
export const KEYWORDS_2011: TemporalKeyword[] = [
  // Crypto
  { keyword: 'silk road', year: 2011, category: 'crypto', relevance: 0.7, context: 'Darknet market launched' },
  { keyword: 'one dollar', year: 2011, category: 'crypto', relevance: 0.7, context: 'BTC reached $1' },
  { keyword: 'parity', year: 2011, category: 'crypto', relevance: 0.6, context: 'BTC = USD parity' },
  { keyword: 'mtgox', year: 2011, category: 'crypto', relevance: 0.8, context: 'Major exchange' },
  
  // Social
  { keyword: 'arab spring', year: 2011, category: 'social', relevance: 0.6, context: 'Middle East uprisings' },
  { keyword: 'occupy wall street', year: 2011, category: 'social', relevance: 0.7, context: 'Financial protest movement' },
  { keyword: 'we are the 99', year: 2011, category: 'social', relevance: 0.6, context: 'Occupy slogan' },
  { keyword: 'fukushima', year: 2011, category: 'social', relevance: 0.5, context: 'Nuclear disaster' },
  { keyword: 'bin laden', year: 2011, category: 'politics', relevance: 0.5, context: 'Death May 2011' },
  
  // Technology
  { keyword: 'iphone 4s', year: 2011, category: 'technology', relevance: 0.5, context: 'Released October 2011' },
  { keyword: 'siri', year: 2011, category: 'technology', relevance: 0.5, context: 'Voice assistant debut' },
  { keyword: 'google plus', year: 2011, category: 'technology', relevance: 0.4, context: 'Launched June 2011' },
  
  // Pop Culture
  { keyword: 'game of thrones', year: 2011, category: 'pop_culture', relevance: 0.5, context: 'TV series premiered' },
  { keyword: 'steve jobs', year: 2011, category: 'pop_culture', relevance: 0.6, context: 'Died October 2011' },
];

/**
 * 2012 Temporal Keywords
 */
export const KEYWORDS_2012: TemporalKeyword[] = [
  // Crypto
  { keyword: 'first halving', year: 2012, category: 'crypto', relevance: 0.8, context: 'November 2012' },
  { keyword: 'halving day', year: 2012, category: 'crypto', relevance: 0.7, context: 'Block reward cut to 25' },
  { keyword: 'asic mining', year: 2012, category: 'crypto', relevance: 0.7, context: 'ASIC miners announced' },
  { keyword: 'butterfly labs', year: 2012, category: 'crypto', relevance: 0.6, context: 'ASIC manufacturer' },
  { keyword: 'coinbase', year: 2012, category: 'crypto', relevance: 0.7, context: 'Exchange founded' },
  { keyword: 'bitcoin foundation', year: 2012, category: 'crypto', relevance: 0.6, context: 'Founded September' },
  
  // Social/Politics
  { keyword: 'mayan calendar', year: 2012, category: 'social', relevance: 0.5, context: '2012 apocalypse myth' },
  { keyword: 'gangnam style', year: 2012, category: 'pop_culture', relevance: 0.6, context: 'Viral sensation' },
  { keyword: 'hurricane sandy', year: 2012, category: 'social', relevance: 0.4, context: 'October 2012 storm' },
  { keyword: 'london olympics', year: 2012, category: 'pop_culture', relevance: 0.4, context: 'Summer 2012' },
];

/**
 * 2013 Temporal Keywords
 */
export const KEYWORDS_2013: TemporalKeyword[] = [
  // Crypto
  { keyword: 'one thousand', year: 2013, category: 'crypto', relevance: 0.8, context: 'BTC hit $1000' },
  { keyword: 'cyprus crisis', year: 2013, category: 'crypto', relevance: 0.7, context: 'Bank crisis, BTC interest spike' },
  { keyword: 'silk road raid', year: 2013, category: 'crypto', relevance: 0.6, context: 'FBI shutdown October' },
  { keyword: 'ross ulbricht', year: 2013, category: 'crypto', relevance: 0.5, context: 'Silk Road arrest' },
  { keyword: 'bip32', year: 2013, category: 'crypto', relevance: 0.6, context: 'HD wallet standard' },
  { keyword: 'bip39', year: 2013, category: 'crypto', relevance: 0.6, context: 'Mnemonic standard' },
  
  // Pop Culture
  { keyword: 'snowden', year: 2013, category: 'politics', relevance: 0.7, context: 'NSA whistleblower' },
  { keyword: 'prism', year: 2013, category: 'politics', relevance: 0.6, context: 'NSA surveillance program' },
  { keyword: 'breaking bad', year: 2013, category: 'pop_culture', relevance: 0.5, context: 'Final season' },
  { keyword: 'bitcoin accepted here', year: 2013, category: 'crypto', relevance: 0.6, context: 'Merchant adoption growing' },
];

/**
 * Get all temporal keywords for a specific year
 */
export function getKeywordsByYear(year: number): TemporalKeyword[] {
  switch (year) {
    case 2009: return KEYWORDS_2009;
    case 2010: return KEYWORDS_2010;
    case 2011: return KEYWORDS_2011;
    case 2012: return KEYWORDS_2012;
    case 2013: return KEYWORDS_2013;
    default: return [];
  }
}

/**
 * Get temporal keywords for a year range
 */
export function getKeywordsByYearRange(startYear: number, endYear: number): TemporalKeyword[] {
  const keywords: TemporalKeyword[] = [];
  for (let year = startYear; year <= endYear; year++) {
    keywords.push(...getKeywordsByYear(year));
  }
  return keywords;
}

/**
 * Get keywords by category across all years
 */
export function getKeywordsByCategory(category: TemporalKeyword['category']): TemporalKeyword[] {
  const allKeywords = [
    ...KEYWORDS_2009,
    ...KEYWORDS_2010,
    ...KEYWORDS_2011,
    ...KEYWORDS_2012,
    ...KEYWORDS_2013,
  ];
  
  return allKeywords.filter(k => k.category === category);
}

/**
 * Get high-relevance keywords (relevance >= threshold)
 */
export function getHighRelevanceKeywords(threshold: number = 0.7): TemporalKeyword[] {
  const allKeywords = [
    ...KEYWORDS_2009,
    ...KEYWORDS_2010,
    ...KEYWORDS_2011,
    ...KEYWORDS_2012,
    ...KEYWORDS_2013,
  ];
  
  return allKeywords
    .filter(k => k.relevance >= threshold)
    .sort((a, b) => b.relevance - a.relevance);
}

/**
 * Generate passphrase combinations using temporal keywords
 */
export function generateTemporalCombinations(
  basePhrase: string,
  year?: number
): string[] {
  const combinations: string[] = [];
  const keywords = year ? getKeywordsByYear(year) : getHighRelevanceKeywords(0.6);
  
  for (const kw of keywords) {
    // Add keyword before base phrase
    combinations.push(`${kw.keyword} ${basePhrase}`);
    
    // Add keyword after base phrase
    combinations.push(`${basePhrase} ${kw.keyword}`);
    
    // Add year suffix
    combinations.push(`${basePhrase}${year || kw.year}`);
    
    // Combined with year
    combinations.push(`${kw.keyword}${year || kw.year}`);
  }
  
  return combinations.slice(0, 100); // Limit to top 100
}

/**
 * Get all temporal keywords sorted by relevance
 */
export function getAllKeywordsSorted(): TemporalKeyword[] {
  const allKeywords = [
    ...KEYWORDS_2009,
    ...KEYWORDS_2010,
    ...KEYWORDS_2011,
    ...KEYWORDS_2012,
    ...KEYWORDS_2013,
  ];
  
  return allKeywords.sort((a, b) => b.relevance - a.relevance);
}
