/**
 * BIP39 Passphrase Combination Module
 * 
 * Generates combinations of BIP39 mnemonic phrases with optional passphrases.
 * Many wallets support an optional "25th word" passphrase on top of the mnemonic.
 * This is a critical recovery vector often overlooked.
 * 
 * BIP39 Standard:
 * - Mnemonic: 12-24 words from BIP39 wordlist
 * - Passphrase: Optional additional password (any UTF-8 string)
 * - Seed = PBKDF2(mnemonic, "mnemonic" + passphrase, 2048 rounds)
 * 
 * The passphrase acts as a "25th word" - different passphrases produce
 * completely different wallets from the same mnemonic.
 */

/**
 * Common passphrase patterns users might have added to their mnemonic
 */
export const COMMON_BIP39_PASSPHRASES = [
  // Empty/none (most common)
  '',
  
  // Simple patterns
  'password',
  'passphrase',
  '123456',
  '12345678',
  '000000',
  '111111',
  
  // Crypto-related
  'bitcoin',
  'btc',
  'satoshi',
  'nakamoto',
  'crypto',
  'hodl',
  'moon',
  'lambo',
  
  // Personal identifiers (examples - would need user input)
  'name',
  'birthdate',
  'anniversary',
  
  // Security phrases
  'secure',
  'safety',
  'backup',
  'recovery',
  'hidden',
  'secret',
  
  // Numbers
  '2009', '2010', '2011', '2012', '2013',
  '1', '2', '3', '4', '5',
  
  // Common words
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all',
];

/**
 * Generate passphrase with year suffix
 */
export function generateYearSuffixes(basePassphrase: string, endYear: number = new Date().getFullYear()): string[] {
  const suffixes: string[] = [];
  
  // Bitcoin era years (2009 to current year)
  for (let year = 2009; year <= endYear; year++) {
    suffixes.push(`${basePassphrase}${year}`);
    suffixes.push(`${basePassphrase} ${year}`);
    suffixes.push(`${basePassphrase}_${year}`);
    suffixes.push(`${basePassphrase}-${year}`);
  }
  
  return suffixes;
}

/**
 * Generate passphrase with number suffix
 */
export function generateNumberSuffixes(basePassphrase: string, maxNumber: number = 100): string[] {
  const suffixes: string[] = [];
  
  for (let i = 0; i <= maxNumber; i++) {
    suffixes.push(`${basePassphrase}${i}`);
    if (i <= 10) {
      suffixes.push(`${basePassphrase} ${i}`);
      suffixes.push(`${basePassphrase}_${i}`);
      suffixes.push(`${basePassphrase}-${i}`);
    }
  }
  
  return suffixes;
}

/**
 * Generate passphrases with common special character patterns
 */
export function generateSpecialCharVariants(basePassphrase: string): string[] {
  const variants: string[] = [
    basePassphrase,
    `${basePassphrase}!`,
    `${basePassphrase}!!`,
    `${basePassphrase}!!!`,
    `${basePassphrase}.`,
    `${basePassphrase}?`,
    `${basePassphrase}@`,
    `${basePassphrase}#`,
    `${basePassphrase}$`,
    `!${basePassphrase}`,
    `${basePassphrase}123`,
    `${basePassphrase}321`,
    `${basePassphrase}1`,
    `${basePassphrase}12`,
  ];
  
  return variants;
}

/**
 * Generate case variations of passphrase
 */
export function generateCaseVariants(passphrase: string): string[] {
  return [
    passphrase,
    passphrase.toLowerCase(),
    passphrase.toUpperCase(),
    passphrase.charAt(0).toUpperCase() + passphrase.slice(1).toLowerCase(),
    passphrase.charAt(0).toLowerCase() + passphrase.slice(1).toUpperCase(),
  ];
}

/**
 * Generate all common BIP39 passphrase combinations for a base phrase
 */
export function generateBIP39PassphraseCombinations(
  basePhrase: string = '',
  options?: {
    includeYears?: boolean;
    includeNumbers?: boolean;
    includeSpecialChars?: boolean;
    includeCaseVariants?: boolean;
    maxCombinations?: number;
  }
): string[] {
  const opts = {
    includeYears: true,
    includeNumbers: true,
    includeSpecialChars: true,
    includeCaseVariants: true,
    maxCombinations: 500,
    ...options,
  };
  
  const combinations = new Set<string>();
  
  // Always include empty passphrase (most common)
  combinations.add('');
  
  // If no base phrase, use common passphrases
  const basePhrases = basePhrase ? [basePhrase] : COMMON_BIP39_PASSPHRASES;
  
  for (const phrase of basePhrases) {
    // Add base phrase
    combinations.add(phrase);
    
    // Case variants
    if (opts.includeCaseVariants && phrase) {
      generateCaseVariants(phrase).forEach(v => combinations.add(v));
    }
    
    // Year suffixes
    if (opts.includeYears && phrase) {
      generateYearSuffixes(phrase).forEach(v => combinations.add(v));
    }
    
    // Number suffixes (limited to avoid explosion)
    if (opts.includeNumbers && phrase) {
      generateNumberSuffixes(phrase, 20).forEach(v => combinations.add(v));
    }
    
    // Special character variants
    if (opts.includeSpecialChars && phrase) {
      generateSpecialCharVariants(phrase).forEach(v => combinations.add(v));
    }
  }
  
  // Convert to array and limit
  const result = Array.from(combinations);
  return result.slice(0, opts.maxCombinations);
}

/**
 * Generate mnemonic + passphrase test cases
 * 
 * For a given mnemonic, generate multiple passphrase variations to test
 */
export function generateMnemonicWithPassphraseVariants(
  mnemonic: string,
  userHints?: string[]
): Array<{ mnemonic: string; passphrase: string }> {
  const variants: Array<{ mnemonic: string; passphrase: string }> = [];
  
  // Always test with no passphrase first (most common)
  variants.push({ mnemonic, passphrase: '' });
  
  // Test with common passphrases
  for (const passphrase of COMMON_BIP39_PASSPHRASES.slice(1, 20)) {
    variants.push({ mnemonic, passphrase });
  }
  
  // If user provided hints, use those
  if (userHints && userHints.length > 0) {
    for (const hint of userHints) {
      // Add hint as-is
      variants.push({ mnemonic, passphrase: hint });
      
      // Add common variations of the hint
      const hintVariants = generateBIP39PassphraseCombinations(hint, {
        maxCombinations: 50,
      });
      
      for (const variant of hintVariants) {
        variants.push({ mnemonic, passphrase: variant });
      }
    }
  }
  
  return variants;
}

/**
 * Generate personalized passphrase suggestions based on common patterns
 */
export function generatePersonalizedPassphrases(
  personalInfo?: {
    name?: string;
    birthYear?: number;
    favoriteWords?: string[];
    significantDates?: string[]; // Format: YYYY, MMDD, etc.
  }
): string[] {
  const passphrases: string[] = [];
  
  if (!personalInfo) {
    return COMMON_BIP39_PASSPHRASES;
  }
  
  // Name-based
  if (personalInfo.name) {
    passphrases.push(personalInfo.name);
    passphrases.push(personalInfo.name.toLowerCase());
    passphrases.push(personalInfo.name.toUpperCase());
    
    // Name + birth year
    if (personalInfo.birthYear) {
      passphrases.push(`${personalInfo.name}${personalInfo.birthYear}`);
      passphrases.push(`${personalInfo.name} ${personalInfo.birthYear}`);
    }
  }
  
  // Birth year variations
  if (personalInfo.birthYear) {
    passphrases.push(`${personalInfo.birthYear}`);
    // Two-digit year
    const twoDigit = personalInfo.birthYear % 100;
    passphrases.push(`${twoDigit}`);
    passphrases.push(`${twoDigit}${twoDigit}`);
  }
  
  // Favorite words
  if (personalInfo.favoriteWords) {
    for (const word of personalInfo.favoriteWords) {
      passphrases.push(word);
      passphrases.push(word.toLowerCase());
      
      // Word + year
      if (personalInfo.birthYear) {
        passphrases.push(`${word}${personalInfo.birthYear}`);
      }
    }
  }
  
  // Significant dates
  if (personalInfo.significantDates) {
    for (const date of personalInfo.significantDates) {
      passphrases.push(date);
      
      if (personalInfo.name) {
        passphrases.push(`${personalInfo.name}${date}`);
      }
    }
  }
  
  return passphrases;
}

/**
 * Salt reuse detection - check if a passphrase was used across multiple mnemonics
 * This is for analysis, not generation
 */
export interface PassphraseUsagePattern {
  passphrase: string;
  usageCount: number;
  associatedMnemonics: string[]; // First 4 words only for privacy
  likelihood: number; // How likely this is a real passphrase vs random
}

/**
 * Analyze passphrase patterns for salt reuse
 */
export function analyzePassphrasePatterns(
  testedCombinations: Array<{ mnemonic: string; passphrase: string; found: boolean }>
): PassphraseUsagePattern[] {
  const passphraseMap = new Map<string, { mnemonics: Set<string>; foundCount: number }>();
  
  for (const combo of testedCombinations) {
    if (!combo.passphrase) continue; // Skip empty passphrases
    
    if (!passphraseMap.has(combo.passphrase)) {
      passphraseMap.set(combo.passphrase, {
        mnemonics: new Set(),
        foundCount: 0,
      });
    }
    
    const entry = passphraseMap.get(combo.passphrase)!;
    entry.mnemonics.add(combo.mnemonic.split(' ').slice(0, 4).join(' '));
    if (combo.found) {
      entry.foundCount++;
    }
  }
  
  // Convert to array and calculate likelihood
  const patterns: PassphraseUsagePattern[] = [];
  
  for (const [passphrase, data] of passphraseMap.entries()) {
    if (data.mnemonics.size > 1) {
      // This passphrase was used with multiple mnemonics - likely a real pattern
      patterns.push({
        passphrase,
        usageCount: data.mnemonics.size,
        associatedMnemonics: Array.from(data.mnemonics),
        likelihood: Math.min(1.0, data.mnemonics.size / 10),
      });
    }
  }
  
  return patterns.sort((a, b) => b.likelihood - a.likelihood);
}
