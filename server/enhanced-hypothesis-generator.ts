/**
 * Enhanced Hypothesis Generator
 * 
 * Integrates all hypothesis generation strategies:
 * 1. Historical patterns (2009-2013 era keywords)
 * 2. Typo variations (keyboard, transposition, phonetic)
 * 3. Temporal keywords (trending words by year)
 * 4. BIP39 mnemonic + passphrase combinations
 * 5. Common password patterns
 * 
 * This module acts as the orchestrator for all hypothesis generation,
 * feeding high-quality candidates into the QIG scoring pipeline.
 */

import { generateAllTypoVariations, generateMultiWordTypos, type TypoVariation } from './typo-generator';
import { 
  getHighRelevanceKeywords, 
  generateTemporalCombinations, 
  getAllKeywordsSorted,
  type TemporalKeyword 
} from './temporal-keywords';
import { 
  generateBIP39PassphraseCombinations, 
  generateMnemonicWithPassphraseVariants,
  COMMON_BIP39_PASSPHRASES 
} from './bip39-passphrase-combos';
import { isValidBIP39Phrase } from './bip39-words';

export interface HypothesisCandidate {
  phrase: string;
  source: 'historical' | 'typo' | 'temporal' | 'mnemonic_passphrase' | 'common_password' | 'user_provided';
  confidence: number; // 0-1 likelihood this is correct
  metadata?: {
    originalPhrase?: string;
    typoType?: string;
    temporalYear?: number;
    isMnemonic?: boolean;
    passphrase?: string;
  };
}

export interface HypothesisGenerationOptions {
  userHints?: string[]; // User-provided memory fragments
  targetYear?: number; // Year wallet was created (if known)
  includeTypos?: boolean;
  includeTemporal?: boolean;
  includeMnemonics?: boolean;
  includeCommonPasswords?: boolean;
  maxHypotheses?: number;
}

/**
 * Generate hypotheses from user-provided hints with typo expansion
 */
export function generateFromUserHints(
  hints: string[],
  options?: { includeTypos?: boolean; maxVariantsPerHint?: number }
): HypothesisCandidate[] {
  const opts = {
    includeTypos: true,
    maxVariantsPerHint: 50,
    ...options,
  };
  
  const hypotheses: HypothesisCandidate[] = [];
  
  for (const hint of hints) {
    // Add the hint itself
    hypotheses.push({
      phrase: hint,
      source: 'user_provided',
      confidence: 0.9, // User hints are high confidence
      metadata: { originalPhrase: hint },
    });
    
    // Generate typo variations if enabled
    if (opts.includeTypos) {
      const typoVariants = hint.includes(' ') 
        ? generateMultiWordTypos(hint, opts.maxVariantsPerHint)
        : generateAllTypoVariations(hint, { maxVariants: opts.maxVariantsPerHint });
      
      for (const variant of typoVariants) {
        hypotheses.push({
          phrase: variant.variant,
          source: 'typo',
          confidence: variant.likelihood * 0.8, // Reduce confidence for typos
          metadata: {
            originalPhrase: hint,
            typoType: variant.type,
          },
        });
      }
    }
  }
  
  return hypotheses;
}

/**
 * Generate hypotheses from historical/temporal keywords
 */
export function generateFromTemporalKeywords(
  year?: number,
  maxHypotheses: number = 200
): HypothesisCandidate[] {
  const hypotheses: HypothesisCandidate[] = [];
  
  // Get high-relevance keywords
  const keywords = year 
    ? getAllKeywordsSorted().filter(k => k.year === year)
    : getHighRelevanceKeywords(0.6);
  
  for (const keyword of keywords.slice(0, maxHypotheses)) {
    hypotheses.push({
      phrase: keyword.keyword,
      source: 'temporal',
      confidence: keyword.relevance,
      metadata: {
        temporalYear: keyword.year,
      },
    });
    
    // Add common variations
    hypotheses.push({
      phrase: keyword.keyword.toLowerCase(),
      source: 'temporal',
      confidence: keyword.relevance * 0.95,
      metadata: {
        temporalYear: keyword.year,
      },
    });
    
    // Add with year suffix
    hypotheses.push({
      phrase: `${keyword.keyword}${keyword.year}`,
      source: 'temporal',
      confidence: keyword.relevance * 0.7,
      metadata: {
        temporalYear: keyword.year,
      },
    });
  }
  
  return hypotheses;
}

/**
 * Generate common password pattern hypotheses
 */
export function generateCommonPasswordPatterns(): HypothesisCandidate[] {
  const commonPasswords = [
    'password', 'password123', '123456', 'qwerty', 'letmein',
    'admin', 'root', 'master', 'dragon', 'monkey', 'shadow',
    'sunshine', 'princess', 'football', 'baseball', 'trustno1',
    'iloveyou', 'letmein', 'opensesame', 'hunter2',
    'correct horse battery staple', // XKCD famous
  ];
  
  const hypotheses: HypothesisCandidate[] = [];
  
  for (const password of commonPasswords) {
    hypotheses.push({
      phrase: password,
      source: 'common_password',
      confidence: 0.5, // Medium confidence - these are often tried
    });
    
    // Add year suffixes (2009-2013 range)
    for (let year = 2009; year <= 2013; year++) {
      hypotheses.push({
        phrase: `${password}${year}`,
        source: 'common_password',
        confidence: 0.4,
      });
    }
  }
  
  return hypotheses;
}

/**
 * Generate BIP39 mnemonic + passphrase combinations
 */
export function generateMnemonicPassphraseCombos(
  possibleMnemonics: string[],
  userHints?: string[]
): HypothesisCandidate[] {
  const hypotheses: HypothesisCandidate[] = [];
  
  for (const mnemonic of possibleMnemonics) {
    if (!isValidBIP39Phrase(mnemonic)) continue;
    
    // Generate with common passphrases
    const commonVariants = generateBIP39PassphraseCombinations('', {
      maxCombinations: 50,
    });
    
    for (const passphrase of commonVariants) {
      hypotheses.push({
        phrase: mnemonic, // Phrase is the mnemonic
        source: 'mnemonic_passphrase',
        confidence: passphrase === '' ? 0.8 : 0.5, // Empty passphrase most common
        metadata: {
          isMnemonic: true,
          passphrase: passphrase,
        },
      });
    }
    
    // If user provided hints, use those as potential passphrases
    if (userHints && userHints.length > 0) {
      for (const hint of userHints) {
        const hintVariants = generateBIP39PassphraseCombinations(hint, {
          maxCombinations: 20,
        });
        
        for (const passphrase of hintVariants) {
          hypotheses.push({
            phrase: mnemonic,
            source: 'mnemonic_passphrase',
            confidence: 0.7,
            metadata: {
              isMnemonic: true,
              passphrase: passphrase,
              originalPhrase: hint,
            },
          });
        }
      }
    }
  }
  
  return hypotheses;
}

/**
 * Master hypothesis generator - combines all strategies
 */
export function generateAllHypotheses(
  options: HypothesisGenerationOptions = {}
): HypothesisCandidate[] {
  const opts = {
    includeTypos: true,
    includeTemporal: true,
    includeMnemonics: true,
    includeCommonPasswords: true,
    maxHypotheses: 1000,
    ...options,
  };
  
  const allHypotheses: HypothesisCandidate[] = [];
  
  // 1. User hints (highest priority)
  if (opts.userHints && opts.userHints.length > 0) {
    const userHints = generateFromUserHints(opts.userHints, {
      includeTypos: opts.includeTypos,
      maxVariantsPerHint: 50,
    });
    allHypotheses.push(...userHints);
  }
  
  // 2. Temporal keywords (high priority for dormant wallets)
  if (opts.includeTemporal) {
    const temporal = generateFromTemporalKeywords(opts.targetYear, 200);
    allHypotheses.push(...temporal);
  }
  
  // 3. Common passwords (medium priority)
  if (opts.includeCommonPasswords) {
    const commonPasswords = generateCommonPasswordPatterns();
    allHypotheses.push(...commonPasswords);
  }
  
  // 4. Mnemonic + passphrase combos (if mnemonics detected in hints)
  if (opts.includeMnemonics && opts.userHints) {
    const possibleMnemonics = opts.userHints.filter(hint => {
      const wordCount = hint.trim().split(/\s+/).length;
      // BIP39 supports 12, 15, 18, 21, and 24-word mnemonics
      return wordCount === 12 || wordCount === 15 || wordCount === 18 || wordCount === 21 || wordCount === 24;
    });
    
    if (possibleMnemonics.length > 0) {
      const mnemonicCombos = generateMnemonicPassphraseCombos(
        possibleMnemonics,
        opts.userHints
      );
      allHypotheses.push(...mnemonicCombos);
    }
  }
  
  // Deduplicate by phrase
  const seen = new Set<string>();
  const unique = allHypotheses.filter(h => {
    const key = `${h.phrase}:${h.metadata?.passphrase || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  // Sort by confidence descending
  unique.sort((a, b) => b.confidence - a.confidence);
  
  // Limit to max hypotheses
  return unique.slice(0, opts.maxHypotheses);
}

/**
 * Generate hypothesis batch for iterative testing
 * Returns batches sorted by confidence with diversity
 */
export function generateHypothesisBatch(
  batchSize: number,
  options: HypothesisGenerationOptions,
  previouslyTested: Set<string> = new Set()
): HypothesisCandidate[] {
  const allHypotheses = generateAllHypotheses(options);
  
  // Filter out previously tested
  const untested = allHypotheses.filter(h => {
    const key = `${h.phrase}:${h.metadata?.passphrase || ''}`;
    return !previouslyTested.has(key);
  });
  
  // Take top batch by confidence
  return untested.slice(0, batchSize);
}

/**
 * Estimate total hypothesis space size
 */
export function estimateHypothesisSpace(options: HypothesisGenerationOptions): number {
  let total = 0;
  
  if (options.userHints) {
    // Each hint can generate ~50 variants with typos
    total += options.userHints.length * (options.includeTypos ? 50 : 1);
  }
  
  if (options.includeTemporal) {
    // ~200 temporal keywords with variations
    total += 600;
  }
  
  if (options.includeCommonPasswords) {
    // ~20 common passwords * ~5 year variants
    total += 100;
  }
  
  if (options.includeMnemonics && options.userHints) {
    const possibleMnemonics = options.userHints.filter(hint => {
      const wordCount = hint.trim().split(/\s+/).length;
      return wordCount === 12 || wordCount === 15 || wordCount === 18 || wordCount === 24;
    });
    
    // Each mnemonic * ~50 passphrase variants
    total += possibleMnemonics.length * 50;
  }
  
  return total;
}

/**
 * Get statistics about generated hypotheses
 */
export function getHypothesisStats(
  hypotheses: HypothesisCandidate[]
): {
  total: number;
  bySource: Record<string, number>;
  avgConfidence: number;
  highConfidence: number; // confidence >= 0.7
  mediumConfidence: number; // 0.5 <= confidence < 0.7
  lowConfidence: number; // confidence < 0.5
} {
  const bySource: Record<string, number> = {};
  let totalConfidence = 0;
  let highConfidence = 0;
  let mediumConfidence = 0;
  let lowConfidence = 0;
  
  for (const h of hypotheses) {
    bySource[h.source] = (bySource[h.source] || 0) + 1;
    totalConfidence += h.confidence;
    
    if (h.confidence >= 0.7) highConfidence++;
    else if (h.confidence >= 0.5) mediumConfidence++;
    else lowConfidence++;
  }
  
  return {
    total: hypotheses.length,
    bySource,
    avgConfidence: hypotheses.length > 0 ? totalConfidence / hypotheses.length : 0,
    highConfidence,
    mediumConfidence,
    lowConfidence,
  };
}
