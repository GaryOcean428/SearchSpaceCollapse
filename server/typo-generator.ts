/**
 * Typo Radius Expansion Module
 * 
 * Generates variations of input phrases to capture common typos:
 * - Keyboard adjacency mistakes (qwerty layout)
 * - Character transpositions (teh → the)
 * - Phonetic substitutions (f→ph, k→c, etc.)
 * - Missing/extra characters
 * - Case variations
 * 
 * Used to expand hypothesis space for recovery when users may have
 * misremembered or mistyped their original passphrase.
 */

/**
 * QWERTY keyboard layout for adjacency detection
 * Maps each key to its neighbors
 */
const KEYBOARD_ADJACENCY: Record<string, string[]> = {
  'q': ['w', 'a', 's'],
  'w': ['q', 'e', 'a', 's', 'd'],
  'e': ['w', 'r', 's', 'd', 'f'],
  'r': ['e', 't', 'd', 'f', 'g'],
  't': ['r', 'y', 'f', 'g', 'h'],
  'y': ['t', 'u', 'g', 'h', 'j'],
  'u': ['y', 'i', 'h', 'j', 'k'],
  'i': ['u', 'o', 'j', 'k', 'l'],
  'o': ['i', 'p', 'k', 'l'],
  'p': ['o', 'l'],
  'a': ['q', 'w', 's', 'z'],
  's': ['a', 'w', 'e', 'd', 'z', 'x'],
  'd': ['s', 'e', 'r', 'f', 'x', 'c'],
  'f': ['d', 'r', 't', 'g', 'c', 'v'],
  'g': ['f', 't', 'y', 'h', 'v', 'b'],
  'h': ['g', 'y', 'u', 'j', 'b', 'n'],
  'j': ['h', 'u', 'i', 'k', 'n', 'm'],
  'k': ['j', 'i', 'o', 'l', 'm'],
  'l': ['k', 'o', 'p'],
  'z': ['a', 's', 'x'],
  'x': ['z', 's', 'd', 'c'],
  'c': ['x', 'd', 'f', 'v'],
  'v': ['c', 'f', 'g', 'b'],
  'b': ['v', 'g', 'h', 'n'],
  'n': ['b', 'h', 'j', 'm'],
  'm': ['n', 'j', 'k'],
  '1': ['2', 'q'],
  '2': ['1', '3', 'q', 'w'],
  '3': ['2', '4', 'w', 'e'],
  '4': ['3', '5', 'e', 'r'],
  '5': ['4', '6', 'r', 't'],
  '6': ['5', '7', 't', 'y'],
  '7': ['6', '8', 'y', 'u'],
  '8': ['7', '9', 'u', 'i'],
  '9': ['8', '0', 'i', 'o'],
  '0': ['9', 'o', 'p'],
};

/**
 * Phonetic substitutions for common sound-alike errors
 */
const PHONETIC_SUBSTITUTIONS: Record<string, string[]> = {
  'ph': ['f'],
  'f': ['ph'],
  'k': ['c', 'ck'],
  'c': ['k', 's'],
  's': ['c', 'z'],
  'z': ['s'],
  'ck': ['k', 'c'],
  'th': ['t'],
  't': ['th'],
  'sh': ['ch'],
  'ch': ['sh'],
  'ee': ['ea', 'ie'],
  'ea': ['ee', 'ia'],
  'ie': ['ee', 'ei'],
  'ei': ['ie'],
  'oo': ['ou', 'u'],
  'ou': ['oo', 'ow'],
  'ow': ['ou'],
  'ai': ['ay', 'a'],
  'ay': ['ai'],
  'tion': ['sion', 'shun'],
  'sion': ['tion', 'shun'],
};

export interface TypoVariation {
  variant: string;
  type: 'keyboard' | 'transposition' | 'phonetic' | 'omission' | 'insertion' | 'case';
  distance: number; // Edit distance from original
  likelihood: number; // 0-1 probability this is the intended phrase
}

/**
 * Generate keyboard adjacency typos
 * Example: "bitcoin" → "bitcoim" (n→m), "bitxoin" (c→x)
 */
export function generateKeyboardTypos(phrase: string, maxDistance: number = 1): TypoVariation[] {
  const variants: TypoVariation[] = [];
  const lowerPhrase = phrase.toLowerCase();
  
  for (let i = 0; i < lowerPhrase.length; i++) {
    const char = lowerPhrase[i];
    if (!char.match(/[a-z0-9]/)) continue;
    
    const neighbors = KEYBOARD_ADJACENCY[char] || [];
    for (const neighbor of neighbors) {
      const variant = lowerPhrase.substring(0, i) + neighbor + lowerPhrase.substring(i + 1);
      variants.push({
        variant,
        type: 'keyboard',
        distance: 1,
        likelihood: 0.3, // Keyboard typos are fairly common
      });
    }
  }
  
  return variants;
}

/**
 * Generate transposition typos (swapped adjacent characters)
 * Example: "satoshi" → "satoish", "bitcoin" → "bitocin"
 */
export function generateTranspositions(phrase: string): TypoVariation[] {
  const variants: TypoVariation[] = [];
  const lowerPhrase = phrase.toLowerCase();
  
  for (let i = 0; i < lowerPhrase.length - 1; i++) {
    const variant = 
      lowerPhrase.substring(0, i) + 
      lowerPhrase[i + 1] + 
      lowerPhrase[i] + 
      lowerPhrase.substring(i + 2);
    
    variants.push({
      variant,
      type: 'transposition',
      distance: 1,
      likelihood: 0.4, // Transpositions are very common
    });
  }
  
  return variants;
}

/**
 * Generate phonetic substitutions
 * Example: "satoshi" → "satoci", "crypto" → "krypto"
 */
export function generatePhoneticVariants(phrase: string): TypoVariation[] {
  const variants: TypoVariation[] = [];
  const lowerPhrase = phrase.toLowerCase();
  
  // Try each phonetic substitution pattern
  for (const [pattern, replacements] of Object.entries(PHONETIC_SUBSTITUTIONS)) {
    let searchPos = 0;
    while (true) {
      const pos = lowerPhrase.indexOf(pattern, searchPos);
      if (pos === -1) break;
      
      for (const replacement of replacements) {
        const variant = 
          lowerPhrase.substring(0, pos) + 
          replacement + 
          lowerPhrase.substring(pos + pattern.length);
        
        variants.push({
          variant,
          type: 'phonetic',
          distance: Math.abs(pattern.length - replacement.length) + 1,
          likelihood: 0.25, // Phonetic errors somewhat common
        });
      }
      
      searchPos = pos + 1;
    }
  }
  
  return variants;
}

/**
 * Generate character omission variants (missing one character)
 * Example: "bitcoin" → "bitcon", "satoshi" → "satshi"
 */
export function generateOmissions(phrase: string, maxOmissions: number = 1): TypoVariation[] {
  const variants: TypoVariation[] = [];
  const lowerPhrase = phrase.toLowerCase();
  
  if (maxOmissions < 1 || lowerPhrase.length < 3) return variants;
  
  for (let i = 0; i < lowerPhrase.length; i++) {
    const variant = lowerPhrase.substring(0, i) + lowerPhrase.substring(i + 1);
    variants.push({
      variant,
      type: 'omission',
      distance: 1,
      likelihood: 0.2, // Missing characters less common but possible
    });
  }
  
  return variants;
}

/**
 * Generate character insertion variants (extra character)
 * Example: "bitcoin" → "bitcooin", "satoshi" → "satooshi"
 */
export function generateInsertions(phrase: string, maxInsertions: number = 1): TypoVariation[] {
  const variants: TypoVariation[] = [];
  const lowerPhrase = phrase.toLowerCase();
  
  if (maxInsertions < 1) return variants;
  
  // Insert doubled characters (most common type)
  for (let i = 0; i < lowerPhrase.length; i++) {
    const char = lowerPhrase[i];
    if (!char.match(/[a-z]/)) continue;
    
    const variant = lowerPhrase.substring(0, i + 1) + char + lowerPhrase.substring(i + 1);
    variants.push({
      variant,
      type: 'insertion',
      distance: 1,
      likelihood: 0.15, // Insertions less common
    });
  }
  
  return variants;
}

/**
 * Generate case variations
 * Example: "Bitcoin" → "bitcoin", "BITCOIN", "BitCoin", "bITCOIN"
 */
export function generateCaseVariations(phrase: string): TypoVariation[] {
  const variants: TypoVariation[] = [];
  
  // All lowercase
  variants.push({
    variant: phrase.toLowerCase(),
    type: 'case',
    distance: 0,
    likelihood: 0.9, // Most likely
  });
  
  // All uppercase
  variants.push({
    variant: phrase.toUpperCase(),
    type: 'case',
    distance: 0,
    likelihood: 0.5,
  });
  
  // Title case (first letter of each word capitalized)
  const titleCase = phrase
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  variants.push({
    variant: titleCase,
    type: 'case',
    distance: 0,
    likelihood: 0.6,
  });
  
  // First letter capitalized
  if (phrase.length > 0) {
    variants.push({
      variant: phrase.charAt(0).toUpperCase() + phrase.slice(1).toLowerCase(),
      type: 'case',
      distance: 0,
      likelihood: 0.7,
    });
  }
  
  return variants;
}

/**
 * Generate all typo variations for a phrase
 * Returns sorted by likelihood descending
 */
export function generateAllTypoVariations(
  phrase: string,
  options?: {
    includeKeyboard?: boolean;
    includeTransposition?: boolean;
    includePhonetic?: boolean;
    includeOmission?: boolean;
    includeInsertion?: boolean;
    includeCase?: boolean;
    maxVariants?: number;
  }
): TypoVariation[] {
  const opts = {
    includeKeyboard: true,
    includeTransposition: true,
    includePhonetic: true,
    includeOmission: true,
    includeInsertion: true,
    includeCase: true,
    maxVariants: 100,
    ...options,
  };
  
  const allVariants: TypoVariation[] = [];
  
  if (opts.includeCase) {
    allVariants.push(...generateCaseVariations(phrase));
  }
  
  if (opts.includeTransposition) {
    allVariants.push(...generateTranspositions(phrase));
  }
  
  if (opts.includeKeyboard) {
    allVariants.push(...generateKeyboardTypos(phrase));
  }
  
  if (opts.includePhonetic) {
    allVariants.push(...generatePhoneticVariants(phrase));
  }
  
  if (opts.includeOmission) {
    allVariants.push(...generateOmissions(phrase));
  }
  
  if (opts.includeInsertion) {
    allVariants.push(...generateInsertions(phrase));
  }
  
  // Deduplicate
  const seen = new Set<string>();
  const uniqueVariants = allVariants.filter(v => {
    if (seen.has(v.variant) || v.variant === phrase.toLowerCase()) {
      return false;
    }
    seen.add(v.variant);
    return true;
  });
  
  // Sort by likelihood descending, then by edit distance ascending
  uniqueVariants.sort((a, b) => {
    if (Math.abs(a.likelihood - b.likelihood) > 0.01) {
      return b.likelihood - a.likelihood;
    }
    return a.distance - b.distance;
  });
  
  // Limit to max variants
  return uniqueVariants.slice(0, opts.maxVariants);
}

/**
 * Generate multi-word phrase variations with typos in each word
 * Example: "satoshi nakamoto" → "satoshi nakamato", "satoshi nakamotto", etc.
 */
export function generateMultiWordTypos(phrase: string, maxVariants: number = 50): TypoVariation[] {
  const words = phrase.toLowerCase().split(/\s+/);
  if (words.length === 1) {
    return generateAllTypoVariations(phrase, { maxVariants });
  }
  
  const variants: TypoVariation[] = [];
  
  // Generate typos for each word independently
  for (let i = 0; i < words.length; i++) {
    const wordVariants = generateAllTypoVariations(words[i], { maxVariants: 20 });
    
    for (const variant of wordVariants) {
      const newWords = [...words];
      newWords[i] = variant.variant;
      
      variants.push({
        variant: newWords.join(' '),
        type: variant.type,
        distance: variant.distance,
        likelihood: variant.likelihood * 0.8, // Reduce likelihood slightly for multi-word
      });
    }
  }
  
  // Sort and limit
  variants.sort((a, b) => b.likelihood - a.likelihood);
  return variants.slice(0, maxVariants);
}

/**
 * Levenshtein distance calculation for fuzzy matching
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return matrix[len1][len2];
}
