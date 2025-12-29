/**
 * Typo Generation Service
 * 
 * Generates common typos, keyboard mistakes, transpositions, and phonetic
 * substitutions for Bitcoin recovery attempts.
 * 
 * Categories:
 * - Keyboard adjacency errors (QWERTY layout)
 * - Character transpositions (swapping adjacent chars)
 * - Missing/extra characters
 * - Case variations
 * - Phonetic substitutions (similar sounds)
 * - Common misspellings
 */

/**
 * QWERTY keyboard layout for adjacency-based typos
 */
const KEYBOARD_LAYOUT: Record<string, string[]> = {
  'q': ['w', 'a', '1', '2'],
  'w': ['q', 'e', 's', 'a', '2', '3'],
  'e': ['w', 'r', 'd', 's', '3', '4'],
  'r': ['e', 't', 'f', 'd', '4', '5'],
  't': ['r', 'y', 'g', 'f', '5', '6'],
  'y': ['t', 'u', 'h', 'g', '6', '7'],
  'u': ['y', 'i', 'j', 'h', '7', '8'],
  'i': ['u', 'o', 'k', 'j', '8', '9'],
  'o': ['i', 'p', 'l', 'k', '9', '0'],
  'p': ['o', 'l', '0', '-'],
  'a': ['q', 'w', 's', 'z'],
  's': ['a', 'w', 'e', 'd', 'x', 'z'],
  'd': ['s', 'e', 'r', 'f', 'c', 'x'],
  'f': ['d', 'r', 't', 'g', 'v', 'c'],
  'g': ['f', 't', 'y', 'h', 'b', 'v'],
  'h': ['g', 'y', 'u', 'j', 'n', 'b'],
  'j': ['h', 'u', 'i', 'k', 'm', 'n'],
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
 * Phonetic substitutions (sound-alike characters)
 * Note: Numeric/symbol substitutions are handled separately in LEET_SUBSTITUTIONS
 */
const PHONETIC_SUBSTITUTIONS: Record<string, string[]> = {
  'c': ['k', 's'],
  'k': ['c', 'q'],
  's': ['c', 'z'],
  'z': ['s'],
  'f': ['ph'],
  'ph': ['f'],
  'i': ['y', 'e'],
  'y': ['i'],
  'o': ['0'], // Keep for phonetic similarity (o/zero)
  '0': ['o'],
  '1': ['l', 'i'], // Keep for phonetic similarity (one/l/i)
  'l': ['1'],
};

/**
 * Common character substitutions (leetspeak, special chars)
 */
const LEET_SUBSTITUTIONS: Record<string, string[]> = {
  'a': ['@', '4'],
  'e': ['3'],
  'i': ['1', '!'],
  'o': ['0'],
  's': ['5', '$'],
  't': ['7', '+'],
  'l': ['1'],
  'g': ['9'],
  'b': ['8'],
};

/**
 * Generate keyboard adjacency typos
 */
export function generateKeyboardTypos(text: string, maxVariations: number = 5): string[] {
  const variations: string[] = [];
  const chars = text.toLowerCase().split('');
  
  for (let i = 0; i < chars.length && variations.length < maxVariations; i++) {
    const char = chars[i];
    const adjacent = KEYBOARD_LAYOUT[char];
    
    if (adjacent) {
      for (const replacement of adjacent) {
        const variant = chars.slice();
        variant[i] = replacement;
        variations.push(variant.join(''));
        
        if (variations.length >= maxVariations) break;
      }
    }
  }
  
  return variations;
}

/**
 * Generate character transpositions (swap adjacent characters)
 */
export function generateTranspositions(text: string): string[] {
  const variations: string[] = [];
  const chars = text.split('');
  
  for (let i = 0; i < chars.length - 1; i++) {
    const variant = chars.slice();
    [variant[i], variant[i + 1]] = [variant[i + 1], variant[i]];
    variations.push(variant.join(''));
  }
  
  return variations;
}

/**
 * Generate missing/extra character variations
 */
export function generateCharacterOmissions(text: string, maxVariations: number = 5): string[] {
  const variations: string[] = [];
  
  // Missing characters
  for (let i = 0; i < text.length && variations.length < maxVariations; i++) {
    const variant = text.slice(0, i) + text.slice(i + 1);
    variations.push(variant);
  }
  
  // Extra characters (keyboard adjacency)
  for (let i = 0; i < text.length && variations.length < maxVariations; i++) {
    const char = text[i].toLowerCase();
    const adjacent = KEYBOARD_LAYOUT[char];
    
    if (adjacent) {
      for (const extra of adjacent.slice(0, 2)) {
        const variant = text.slice(0, i + 1) + extra + text.slice(i + 1);
        variations.push(variant);
        
        if (variations.length >= maxVariations) break;
      }
    }
  }
  
  return variations;
}

/**
 * Generate phonetic substitutions
 */
export function generatePhoneticVariations(text: string, maxVariations: number = 10): string[] {
  const variations: string[] = [];
  const lower = text.toLowerCase();
  
  for (let i = 0; i < lower.length && variations.length < maxVariations; i++) {
    const char = lower[i];
    const phonetic = PHONETIC_SUBSTITUTIONS[char];
    
    if (phonetic) {
      for (const replacement of phonetic) {
        const variant = lower.slice(0, i) + replacement + lower.slice(i + 1);
        variations.push(variant);
        
        if (variations.length >= maxVariations) break;
      }
    }
    
    // Check for multi-char substitutions (ph -> f)
    if (i < lower.length - 1) {
      const twoChar = lower.slice(i, i + 2);
      const phoneticTwo = PHONETIC_SUBSTITUTIONS[twoChar];
      
      if (phoneticTwo) {
        for (const replacement of phoneticTwo) {
          const variant = lower.slice(0, i) + replacement + lower.slice(i + 2);
          variations.push(variant);
          
          if (variations.length >= maxVariations) break;
        }
      }
    }
  }
  
  return variations;
}

/**
 * Generate leetspeak variations
 */
export function generateLeetVariations(text: string, maxVariations: number = 10): string[] {
  const variations: string[] = [];
  const lower = text.toLowerCase();
  
  for (let i = 0; i < lower.length && variations.length < maxVariations; i++) {
    const char = lower[i];
    const leet = LEET_SUBSTITUTIONS[char];
    
    if (leet) {
      for (const replacement of leet) {
        const variant = lower.slice(0, i) + replacement + lower.slice(i + 1);
        variations.push(variant);
        
        if (variations.length >= maxVariations) break;
      }
    }
  }
  
  // Generate full leet variations
  let fullLeet = lower;
  for (const [char, replacements] of Object.entries(LEET_SUBSTITUTIONS)) {
    fullLeet = fullLeet.replace(new RegExp(char, 'g'), replacements[0]);
  }
  variations.push(fullLeet);
  
  return variations;
}

/**
 * Generate case variations
 */
export function generateCaseVariations(text: string): string[] {
  const variations: string[] = [
    text.toLowerCase(),
    text.toUpperCase(),
    text.charAt(0).toUpperCase() + text.slice(1).toLowerCase(), // Capitalized
    text.charAt(0).toLowerCase() + text.slice(1).toUpperCase(), // Inverted
  ];
  
  // Alternating case
  const alternating1 = text.split('').map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join('');
  const alternating2 = text.split('').map((c, i) => i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()).join('');
  variations.push(alternating1, alternating2);
  
  return [...new Set(variations)];
}

/**
 * Generate all typo variations for a given text
 */
export function generateAllTypoVariations(text: string, maxPerCategory: number = 5): string[] {
  const variations: string[] = [text]; // Include original
  
  // Keyboard typos
  variations.push(...generateKeyboardTypos(text, maxPerCategory));
  
  // Transpositions
  variations.push(...generateTranspositions(text));
  
  // Character omissions/additions
  variations.push(...generateCharacterOmissions(text, maxPerCategory));
  
  // Phonetic
  variations.push(...generatePhoneticVariations(text, maxPerCategory));
  
  // Leetspeak
  variations.push(...generateLeetVariations(text, maxPerCategory));
  
  // Case variations
  variations.push(...generateCaseVariations(text));
  
  return [...new Set(variations)]; // Remove duplicates
}

/**
 * Generate typo radius (all variations within N edits)
 */
const DEFAULT_TYPO_VARIATIONS_PER_LEVEL = 3;

export function generateTypoRadius(text: string, radius: number = 1): string[] {
  if (radius <= 0) return [text];
  
  const variations = new Set<string>([text]);
  const queue = [text];
  
  for (let depth = 0; depth < radius; depth++) {
    const currentLevel = [...queue];
    queue.length = 0;
    
    for (const variant of currentLevel) {
      const newVariations = generateAllTypoVariations(variant, DEFAULT_TYPO_VARIATIONS_PER_LEVEL);
      
      for (const newVariant of newVariations) {
        if (!variations.has(newVariant)) {
          variations.add(newVariant);
          queue.push(newVariant);
        }
      }
    }
  }
  
  return Array.from(variations);
}

/**
 * Common misspellings dictionary
 */
export const COMMON_MISSPELLINGS: Record<string, string[]> = {
  'bitcoin': ['bitcon', 'bitcoim', 'bitconi', 'bitcpin', 'bitcooin', 'biycoin'],
  'satoshi': ['satoshi', 'satoshy', 'satosi', 'sartoshi', 'satoshj'],
  'wallet': ['walet', 'wallett', 'walley', 'wqallet'],
  'password': ['pasword', 'passowrd', 'passwrod', 'passward'],
  'blockchain': ['blockchian', 'blokchain', 'blockchaine'],
  'cryptocurrency': ['criptocurrency', 'cryptocurency', 'cryptocurrancy'],
  'nakamoto': ['nakamato', 'nakomoto', 'nakamotto'],
};

/**
 * Get common misspellings for a word
 */
export function getCommonMisspellings(word: string): string[] {
  const lower = word.toLowerCase();
  return COMMON_MISSPELLINGS[lower] || [];
}

/**
 * Generate typo variations with statistical weighting
 * More likely typos get higher weight
 */
export interface WeightedTypo {
  text: string;
  weight: number;
  typoType: 'keyboard' | 'transposition' | 'omission' | 'phonetic' | 'leet' | 'case' | 'common';
}

// Weight constants for typo types
const TYPO_WEIGHTS = {
  ORIGINAL: 1.0,
  KEYBOARD: 0.8,
  TRANSPOSITION: 0.7,
  OMISSION: 0.6,
  CASE: 0.9,
  PHONETIC: 0.5,
  LEET: 0.4,
  COMMON: 0.85,
  MAX_VARIATIONS_PER_TYPE: 5,
} as const;

export function generateWeightedTypos(text: string): WeightedTypo[] {
  const weighted: WeightedTypo[] = [];
  
  // Original (highest weight)
  weighted.push({ text, weight: TYPO_WEIGHTS.ORIGINAL, typoType: 'keyboard' });
  
  // Keyboard typos (very common)
  generateKeyboardTypos(text, TYPO_WEIGHTS.MAX_VARIATIONS_PER_TYPE).forEach(t => 
    weighted.push({ text: t, weight: TYPO_WEIGHTS.KEYBOARD, typoType: 'keyboard' })
  );
  
  // Transpositions (common)
  generateTranspositions(text).forEach(t => 
    weighted.push({ text: t, weight: TYPO_WEIGHTS.TRANSPOSITION, typoType: 'transposition' })
  );
  
  // Character omissions (common)
  generateCharacterOmissions(text, TYPO_WEIGHTS.MAX_VARIATIONS_PER_TYPE).forEach(t => 
    weighted.push({ text: t, weight: TYPO_WEIGHTS.OMISSION, typoType: 'omission' })
  );
  
  // Case variations (very common)
  generateCaseVariations(text).forEach(t => 
    weighted.push({ text: t, weight: TYPO_WEIGHTS.CASE, typoType: 'case' })
  );
  
  // Phonetic (less common but possible)
  generatePhoneticVariations(text, TYPO_WEIGHTS.MAX_VARIATIONS_PER_TYPE).forEach(t => 
    weighted.push({ text: t, weight: TYPO_WEIGHTS.PHONETIC, typoType: 'phonetic' })
  );
  
  // Leetspeak (intentional, lower weight)
  generateLeetVariations(text, TYPO_WEIGHTS.MAX_VARIATIONS_PER_TYPE).forEach(t => 
    weighted.push({ text: t, weight: TYPO_WEIGHTS.LEET, typoType: 'leet' })
  );
  
  // Common misspellings (if exists)
  getCommonMisspellings(text).forEach(t => 
    weighted.push({ text: t, weight: TYPO_WEIGHTS.COMMON, typoType: 'common' })
  );
  
  return weighted;
}

console.log('[TypoGeneration] Typo generation service initialized');
console.log('[TypoGeneration] Keyboard layout: QWERTY with adjacency mapping');
console.log('[TypoGeneration] Phonetic substitutions: enabled');
console.log('[TypoGeneration] Leetspeak variations: enabled');
