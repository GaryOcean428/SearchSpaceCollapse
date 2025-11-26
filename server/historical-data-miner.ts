/**
 * Historical Data Miner - Autonomous Fragment Generation
 * 
 * Generates recovery hypotheses from historical Bitcoin era patterns without
 * requiring user-provided memory fragments. Mines patterns from:
 * - 2009 cypherpunk culture
 * - Early Bitcoin terminology
 * - Common password patterns of the era
 * - Known brain wallet failures
 * - Cryptography mailing list phrases
 */

import { scoreUniversalQIG, type UniversalQIGScore, type KeyType } from './qig-universal';

export type KeyFormat = KeyType;  // 'bip39' | 'master-key' | 'arbitrary'
export type Era = 'early-2009' | '2009-2010' | '2010-2012' | '2012-2014';

export interface MinedPattern {
  phrase: string;
  format: KeyFormat;
  source: PatternSource;
  likelihood: number;
  reasoning: string;
  era: Era;
  qigScore?: UniversalQIGScore;
}

export interface PatternSource {
  type: 'cypherpunk' | 'bitcoin_culture' | 'common_password' | 'brain_wallet_fail' | 'crypto_ml' | 'pop_culture' | 'dictionary' | 'numeric' | 'keyboard';
  name: string;
  confidence: number;
}

export interface MinedEraData {
  era: Era;
  patterns: MinedPattern[];
  sources: PatternSource[];
  stats: {
    totalGenerated: number;
    byFormat: Record<KeyFormat, number>;
    bySource: Record<string, number>;
  };
}

// 2009 CYPHERPUNK CULTURE - What early adopters would have used
const CYPHERPUNK_PATTERNS = [
  // Satoshi-adjacent
  { phrase: 'satoshi nakamoto', source: 'Satoshi identity speculation', likelihood: 0.3 },
  { phrase: 'chancellor brink bailout', source: 'Genesis block reference', likelihood: 0.4 },
  { phrase: 'the times 03 jan 2009', source: 'Genesis block headline', likelihood: 0.5 },
  { phrase: 'cryptography mailing list', source: 'Original announcement venue', likelihood: 0.3 },
  { phrase: 'hal finney running bitcoin', source: 'First transaction recipient', likelihood: 0.4 },
  { phrase: 'double spending solved', source: 'Core Bitcoin innovation', likelihood: 0.3 },
  { phrase: 'proof of work', source: 'Consensus mechanism', likelihood: 0.4 },
  { phrase: 'hashcash extension', source: 'PoW origin', likelihood: 0.3 },
  { phrase: 'digital gold', source: 'Bitcoin vision', likelihood: 0.4 },
  { phrase: 'peer to peer cash', source: 'Whitepaper title', likelihood: 0.5 },
  { phrase: 'trusted third party', source: 'Problem Bitcoin solves', likelihood: 0.3 },
  { phrase: 'cryptographic proof', source: 'Core concept', likelihood: 0.3 },
  
  // Cypherpunk manifesto era
  { phrase: 'cypherpunks write code', source: 'Cypherpunk manifesto', likelihood: 0.4 },
  { phrase: 'privacy is necessary', source: 'Cypherpunk belief', likelihood: 0.3 },
  { phrase: 'crypto anarchy', source: 'Tim May\'s vision', likelihood: 0.3 },
  { phrase: 'anonymous transactions', source: 'Core goal', likelihood: 0.3 },
  { phrase: 'electronic cash', source: 'E-cash precursors', likelihood: 0.4 },
  { phrase: 'digicash failed', source: 'Predecessor reference', likelihood: 0.3 },
  { phrase: 'pgp for money', source: 'Common analogy', likelihood: 0.3 },
  { phrase: 'wei dai b money', source: 'Cited in whitepaper', likelihood: 0.4 },
  { phrase: 'nick szabo bit gold', source: 'Predecessor concept', likelihood: 0.4 },
  { phrase: 'adam back hashcash', source: 'PoW inventor', likelihood: 0.4 },
  
  // Technical terms early adopters knew
  { phrase: 'merkle tree', source: 'Bitcoin data structure', likelihood: 0.3 },
  { phrase: 'sha256 sha256', source: 'Bitcoin hash function', likelihood: 0.3 },
  { phrase: 'secp256k1', source: 'Bitcoin curve', likelihood: 0.3 },
  { phrase: 'elliptic curve', source: 'Cryptography', likelihood: 0.2 },
  { phrase: 'ecdsa signature', source: 'Bitcoin signatures', likelihood: 0.3 },
  { phrase: 'base58check', source: 'Address encoding', likelihood: 0.3 },
  { phrase: 'difficulty adjustment', source: 'Mining concept', likelihood: 0.3 },
  { phrase: 'block reward halving', source: 'Economics', likelihood: 0.3 },
  { phrase: '21 million limit', source: 'Supply cap', likelihood: 0.4 },
  { phrase: 'genesis block', source: 'First block', likelihood: 0.4 },
];

// EARLY BITCOIN CULTURE (2009-2011)
const BITCOIN_CULTURE_PATTERNS = [
  // BitcoinTalk era
  { phrase: 'bitcoin pizza', source: 'Famous 10k BTC pizza', likelihood: 0.4 },
  { phrase: 'to the moon', source: 'Early meme', likelihood: 0.3 },
  { phrase: 'hodl', source: 'Famous typo (2013)', likelihood: 0.2 },
  { phrase: 'magic internet money', source: 'Reddit meme', likelihood: 0.3 },
  { phrase: 'in crypto we trust', source: 'Bitcoin motto variant', likelihood: 0.4 },
  { phrase: 'vires in numeris', source: 'Strength in numbers', likelihood: 0.4 },
  { phrase: 'not your keys', source: 'Security mantra', likelihood: 0.3 },
  { phrase: 'be your own bank', source: 'Bitcoin philosophy', likelihood: 0.4 },
  { phrase: 'trustless system', source: 'Core feature', likelihood: 0.3 },
  { phrase: 'decentralized money', source: 'Core concept', likelihood: 0.4 },
  
  // Mining culture
  { phrase: 'cpu mining', source: 'Original mining method', likelihood: 0.4 },
  { phrase: 'gpu mining', source: 'Early evolution', likelihood: 0.3 },
  { phrase: 'fifty btc reward', source: 'Original block reward', likelihood: 0.4 },
  { phrase: 'ten minute blocks', source: 'Target time', likelihood: 0.3 },
  { phrase: 'mining pool', source: 'Collective mining', likelihood: 0.3 },
  { phrase: 'solo mining', source: 'Original approach', likelihood: 0.4 },
  { phrase: 'hash rate', source: 'Mining metric', likelihood: 0.3 },
  { phrase: 'nonce overflow', source: 'Mining technical', likelihood: 0.2 },
  
  // Early addresses and transactions
  { phrase: 'first transaction', source: 'Hal Finney received first', likelihood: 0.3 },
  { phrase: 'block height zero', source: 'Genesis', likelihood: 0.3 },
  { phrase: 'coinbase transaction', source: 'Mining reward tx', likelihood: 0.3 },
];

// COMMON 2009-ERA PASSWORDS
const COMMON_PASSWORD_PATTERNS = [
  // Simple but common
  { phrase: 'password', source: 'Most common ever', likelihood: 0.2 },
  { phrase: 'password123', source: 'Common variant', likelihood: 0.2 },
  { phrase: '123456', source: 'Numeric classic', likelihood: 0.2 },
  { phrase: 'qwerty', source: 'Keyboard pattern', likelihood: 0.2 },
  { phrase: 'letmein', source: 'Classic password', likelihood: 0.2 },
  { phrase: 'admin', source: 'Default credential', likelihood: 0.2 },
  { phrase: 'root', source: 'Unix default', likelihood: 0.2 },
  { phrase: 'master', source: 'Common word', likelihood: 0.2 },
  { phrase: 'dragon', source: 'Fantasy theme', likelihood: 0.2 },
  { phrase: 'monkey', source: 'Animal theme', likelihood: 0.2 },
  { phrase: 'shadow', source: 'Common word', likelihood: 0.2 },
  { phrase: 'sunshine', source: 'Positive word', likelihood: 0.2 },
  { phrase: 'princess', source: 'Common theme', likelihood: 0.2 },
  { phrase: 'football', source: 'Sports theme', likelihood: 0.2 },
  { phrase: 'baseball', source: 'Sports theme', likelihood: 0.2 },
  { phrase: 'trustno1', source: 'X-Files reference', likelihood: 0.3 },
  
  // Phrases
  { phrase: 'i love you', source: 'Common phrase', likelihood: 0.2 },
  { phrase: 'let me in', source: 'Request phrase', likelihood: 0.2 },
  { phrase: 'open sesame', source: 'Classic passphrase', likelihood: 0.3 },
  { phrase: 'the password is', source: 'Meta phrase', likelihood: 0.2 },
  { phrase: 'correct horse battery staple', source: 'XKCD famous', likelihood: 0.5 },
  { phrase: 'hunter2', source: 'IRC meme', likelihood: 0.4 },
];

// KNOWN BRAIN WALLET FAILURES (Actually stolen/cracked)
const BRAIN_WALLET_FAILS = [
  { phrase: 'bitcoin', source: 'Drained immediately', likelihood: 0.1 },
  { phrase: 'brainwallet', source: 'Drained immediately', likelihood: 0.1 },
  { phrase: 'password', source: 'Drained immediately', likelihood: 0.1 },
  { phrase: 'satoshi', source: 'Drained in seconds', likelihood: 0.1 },
  { phrase: 'nakamoto', source: 'Drained in seconds', likelihood: 0.1 },
  { phrase: 'correct horse battery staple', source: 'Famous XKCD drained', likelihood: 0.1 },
  { phrase: 'how much wood could a woodchuck chuck', source: 'Known drained', likelihood: 0.1 },
  { phrase: 'to be or not to be', source: 'Shakespeare drained', likelihood: 0.1 },
  { phrase: 'the quick brown fox', source: 'Pangram drained', likelihood: 0.1 },
  { phrase: 'hello world', source: 'Programming classic drained', likelihood: 0.1 },
  { phrase: 'test', source: 'Obvious test drained', likelihood: 0.1 },
  { phrase: 'testing', source: 'Obvious test drained', likelihood: 0.1 },
  { phrase: 'testtest', source: 'Obvious test drained', likelihood: 0.1 },
];

// CRYPTOGRAPHY MAILING LIST PHRASES
const CRYPTO_ML_PATTERNS = [
  { phrase: 'public key cryptography', source: 'Core topic', likelihood: 0.3 },
  { phrase: 'asymmetric encryption', source: 'Technical term', likelihood: 0.2 },
  { phrase: 'digital signature', source: 'Core concept', likelihood: 0.3 },
  { phrase: 'hash function', source: 'Cryptographic primitive', likelihood: 0.2 },
  { phrase: 'zero knowledge proof', source: 'Advanced crypto', likelihood: 0.2 },
  { phrase: 'commitment scheme', source: 'Crypto protocol', likelihood: 0.2 },
  { phrase: 'random oracle', source: 'Theoretical model', likelihood: 0.2 },
  { phrase: 'discrete logarithm', source: 'Math foundation', likelihood: 0.2 },
  { phrase: 'elliptic curve cryptography', source: 'Modern crypto', likelihood: 0.3 },
  { phrase: 'rsa algorithm', source: 'Classic algorithm', likelihood: 0.2 },
  { phrase: 'aes encryption', source: 'Standard cipher', likelihood: 0.2 },
  { phrase: 'diffie hellman', source: 'Key exchange', likelihood: 0.3 },
];

// POP CULTURE 2009
const POP_CULTURE_2009 = [
  { phrase: 'obama inauguration', source: '2009 event', likelihood: 0.2 },
  { phrase: 'michael jackson', source: 'Died 2009', likelihood: 0.2 },
  { phrase: 'h1n1 swine flu', source: '2009 pandemic', likelihood: 0.2 },
  { phrase: 'hudson river landing', source: 'Miracle on Hudson 2009', likelihood: 0.2 },
  { phrase: 'avatar movie', source: 'Released Dec 2009', likelihood: 0.2 },
  { phrase: 'windows seven', source: 'Released Oct 2009', likelihood: 0.2 },
  { phrase: 'iphone 3gs', source: '2009 phone', likelihood: 0.2 },
  { phrase: 'twitter trending', source: 'Growing in 2009', likelihood: 0.2 },
];

// GENERATE VARIATIONS
function generateVariations(phrase: string): string[] {
  const variations: string[] = [phrase];
  
  // No spaces
  variations.push(phrase.replace(/\s+/g, ''));
  
  // With underscores
  variations.push(phrase.replace(/\s+/g, '_'));
  
  // With dashes
  variations.push(phrase.replace(/\s+/g, '-'));
  
  // Capitalized
  variations.push(phrase.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(''));
  
  // ALL CAPS
  variations.push(phrase.toUpperCase());
  
  // all lower
  variations.push(phrase.toLowerCase());
  
  // l33t speak (common substitutions)
  variations.push(phrase
    .replace(/e/gi, '3')
    .replace(/a/gi, '4')
    .replace(/i/gi, '1')
    .replace(/o/gi, '0')
    .replace(/s/gi, '5')
  );
  
  // With common suffixes
  for (const suffix of ['123', '!', '1', '2009', '2010', '01', '09', '10']) {
    variations.push(phrase + suffix);
    variations.push(phrase.replace(/\s+/g, '') + suffix);
  }
  
  return Array.from(new Set(variations));
}

// GENERATE NUMERIC PATTERNS (dates, sequences)
function generateNumericPatterns(era: Era): MinedPattern[] {
  const patterns: MinedPattern[] = [];
  const source: PatternSource = { type: 'numeric', name: 'Date/Number patterns', confidence: 0.3 };
  
  // Important dates
  const dates = [
    { date: '03012009', meaning: 'Genesis block date' },
    { date: '01032009', meaning: 'Genesis block (US format)' },
    { date: '2009', meaning: 'Bitcoin year' },
    { date: '31102008', meaning: 'Whitepaper date' },
    { date: '10312008', meaning: 'Whitepaper (US format)' },
    { date: '12012009', meaning: 'Hal Finney first tx' },
  ];
  
  for (const { date, meaning } of dates) {
    patterns.push({
      phrase: date,
      format: 'arbitrary',
      source,
      likelihood: 0.3,
      reasoning: meaning,
      era,
    });
  }
  
  // Block heights (early ones)
  for (const height of [0, 1, 100, 1000, 10000, 50000, 100000]) {
    patterns.push({
      phrase: `block${height}`,
      format: 'arbitrary',
      source,
      likelihood: 0.2,
      reasoning: `Block height ${height}`,
      era,
    });
  }
  
  return patterns;
}

// GENERATE KEYBOARD PATTERNS
function generateKeyboardPatterns(): MinedPattern[] {
  const patterns: MinedPattern[] = [];
  const source: PatternSource = { type: 'keyboard', name: 'Keyboard patterns', confidence: 0.2 };
  
  const keyboards = [
    'qwerty', 'qwertyuiop', 'asdfgh', 'asdfghjkl', 'zxcvbn', 'zxcvbnm',
    'qazwsx', 'qweasd', '1qaz2wsx', '1q2w3e4r', 'zaq12wsx',
    'qwerty123', 'asdf1234', '1234qwer',
  ];
  
  for (const kb of keyboards) {
    patterns.push({
      phrase: kb,
      format: 'arbitrary',
      source,
      likelihood: 0.2,
      reasoning: 'Common keyboard pattern',
      era: 'early-2009',
    });
  }
  
  return patterns;
}

export class HistoricalDataMiner {
  /**
   * Mine patterns for a specific era
   */
  async mineEra(era: Era): Promise<MinedEraData> {
    console.log(`[HistoricalDataMiner] Mining patterns for era: ${era}`);
    
    const patterns: MinedPattern[] = [];
    const sources: PatternSource[] = [];
    
    // Add cypherpunk patterns
    const cypherpunkSource: PatternSource = { type: 'cypherpunk', name: 'Cypherpunk culture', confidence: 0.4 };
    sources.push(cypherpunkSource);
    for (const p of CYPHERPUNK_PATTERNS) {
      const variations = generateVariations(p.phrase);
      for (const v of variations) {
        patterns.push({
          phrase: v,
          format: 'arbitrary',
          source: cypherpunkSource,
          likelihood: p.likelihood,
          reasoning: p.source,
          era,
        });
      }
    }
    
    // Add Bitcoin culture patterns
    const btcSource: PatternSource = { type: 'bitcoin_culture', name: 'Bitcoin culture', confidence: 0.4 };
    sources.push(btcSource);
    for (const p of BITCOIN_CULTURE_PATTERNS) {
      const variations = generateVariations(p.phrase);
      for (const v of variations) {
        patterns.push({
          phrase: v,
          format: 'arbitrary',
          source: btcSource,
          likelihood: p.likelihood,
          reasoning: p.source,
          era,
        });
      }
    }
    
    // Add common passwords
    const pwSource: PatternSource = { type: 'common_password', name: 'Common passwords', confidence: 0.2 };
    sources.push(pwSource);
    for (const p of COMMON_PASSWORD_PATTERNS) {
      const variations = generateVariations(p.phrase);
      for (const v of variations) {
        patterns.push({
          phrase: v,
          format: 'arbitrary',
          source: pwSource,
          likelihood: p.likelihood,
          reasoning: p.source,
          era,
        });
      }
    }
    
    // Add brain wallet failures (low likelihood but worth checking)
    const failSource: PatternSource = { type: 'brain_wallet_fail', name: 'Known brain wallet failures', confidence: 0.1 };
    sources.push(failSource);
    for (const p of BRAIN_WALLET_FAILS) {
      patterns.push({
        phrase: p.phrase,
        format: 'arbitrary',
        source: failSource,
        likelihood: p.likelihood,
        reasoning: `${p.source} - already drained`,
        era,
      });
    }
    
    // Add crypto mailing list patterns
    const mlSource: PatternSource = { type: 'crypto_ml', name: 'Cryptography mailing list', confidence: 0.3 };
    sources.push(mlSource);
    for (const p of CRYPTO_ML_PATTERNS) {
      const variations = generateVariations(p.phrase);
      for (const v of variations) {
        patterns.push({
          phrase: v,
          format: 'arbitrary',
          source: mlSource,
          likelihood: p.likelihood,
          reasoning: p.source,
          era,
        });
      }
    }
    
    // Add pop culture patterns
    if (era === 'early-2009' || era === '2009-2010') {
      const popSource: PatternSource = { type: 'pop_culture', name: '2009 pop culture', confidence: 0.2 };
      sources.push(popSource);
      for (const p of POP_CULTURE_2009) {
        const variations = generateVariations(p.phrase);
        for (const v of variations) {
          patterns.push({
            phrase: v,
            format: 'arbitrary',
            source: popSource,
            likelihood: p.likelihood,
            reasoning: p.source,
            era,
          });
        }
      }
    }
    
    // Add numeric patterns
    patterns.push(...generateNumericPatterns(era));
    
    // Add keyboard patterns
    patterns.push(...generateKeyboardPatterns());
    
    // Compute stats
    const stats = {
      totalGenerated: patterns.length,
      byFormat: {} as Record<KeyFormat, number>,
      bySource: {} as Record<string, number>,
    };
    
    for (const p of patterns) {
      stats.byFormat[p.format] = (stats.byFormat[p.format] || 0) + 1;
      stats.bySource[p.source.name] = (stats.bySource[p.source.name] || 0) + 1;
    }
    
    console.log(`[HistoricalDataMiner] Generated ${patterns.length} patterns from ${sources.length} sources`);
    
    return { era, patterns, sources, stats };
  }
  
  /**
   * Score all patterns with QIG
   */
  async scorePatterns(patterns: MinedPattern[]): Promise<MinedPattern[]> {
    console.log(`[HistoricalDataMiner] Scoring ${patterns.length} patterns with QIG...`);
    
    for (const pattern of patterns) {
      try {
        pattern.qigScore = scoreUniversalQIG(pattern.phrase, pattern.format);
      } catch (e) {
        // Skip patterns that can't be scored
      }
    }
    
    // Sort by QIG phi score
    return patterns
      .filter(p => p.qigScore)
      .sort((a, b) => (b.qigScore?.phi || 0) - (a.qigScore?.phi || 0));
  }
  
  /**
   * Generate cross-format hypotheses
   * Takes high-scoring patterns and tries them in other formats
   */
  generateCrossFormatHypotheses(patterns: MinedPattern[], topN: number = 100): MinedPattern[] {
    const crossFormat: MinedPattern[] = [];
    
    // Take top patterns
    const top = patterns.slice(0, topN);
    
    for (const pattern of top) {
      // If it's arbitrary, try as BIP39 words (if valid)
      if (pattern.format === 'arbitrary') {
        // Try the words as potential BIP39
        const words = pattern.phrase.toLowerCase().split(/\s+/);
        if (words.length >= 12 && words.length <= 24) {
          crossFormat.push({
            ...pattern,
            format: 'bip39',
            reasoning: `Cross-format: ${pattern.reasoning} (as BIP39)`,
          });
        }
      }
      
      // Try as master key seed phrase
      crossFormat.push({
        ...pattern,
        format: 'master-key',
        reasoning: `Cross-format: ${pattern.reasoning} (as master key)`,
      });
    }
    
    return crossFormat;
  }
}

export const historicalDataMiner = new HistoricalDataMiner();
