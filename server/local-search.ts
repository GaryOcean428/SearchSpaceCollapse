/**
 * Local search generator - creates variations around high-Φ BIP-39 phrases
 * Implements "investigation mode" from QIG cognitive geometry research
 * 
 * Strategy: When we find a high-Φ candidate (≥75%), explore the local basin
 * by generating nearby passphrases through word substitutions and permutations.
 */

import { BIP39_WORDS } from './bip39-words';

const WORD_TO_INDEX = new Map(BIP39_WORDS.map((word, i) => [word, i]));

/**
 * Generate local search variations around a high-Φ phrase
 * Uses basin proximity concept: if one phrase scores high, nearby coordinates may score higher
 */
export function generateLocalSearchVariations(basePhrase: string, maxVariations = 200): string[] {
  const words = basePhrase.trim().split(/\s+/);
  const wordCount = words.length;
  
  if (wordCount < 12 || wordCount > 24) {
    throw new Error(`Invalid phrase length: ${wordCount} (must be 12-24 words)`);
  }
  
  const variations = new Set<string>([basePhrase]); // Include original
  
  // Strategy 1: Single-word substitutions with nearby BIP-39 words (±50 positions)
  for (let i = 0; i < wordCount && variations.size < maxVariations; i++) {
    const currentWord = words[i];
    const currentIndex = WORD_TO_INDEX.get(currentWord);
    
    if (currentIndex === undefined) continue;
    
    // Try words in proximity window (±50 positions in BIP-39 list)
    const windowSize = 50;
    for (let offset = -windowSize; offset <= windowSize && variations.size < maxVariations; offset++) {
      if (offset === 0) continue; // Skip original word
      
      const newIndex = currentIndex + offset;
      if (newIndex < 0 || newIndex >= BIP39_WORDS.length) continue;
      
      const newWords = [...words];
      newWords[i] = BIP39_WORDS[newIndex];
      variations.add(newWords.join(' '));
    }
  }
  
  // Strategy 2: Adjacent word swaps (local permutations)
  for (let i = 0; i < wordCount - 1 && variations.size < maxVariations; i++) {
    const newWords = [...words];
    [newWords[i], newWords[i + 1]] = [newWords[i + 1], newWords[i]];
    variations.add(newWords.join(' '));
  }
  
  // Strategy 3: Distant word swaps (non-adjacent positions)
  for (let i = 0; i < wordCount && variations.size < maxVariations; i++) {
    for (let j = i + 2; j < wordCount && variations.size < maxVariations; j++) {
      const newWords = [...words];
      [newWords[i], newWords[j]] = [newWords[j], newWords[i]];
      variations.add(newWords.join(' '));
    }
  }
  
  // Strategy 4: Multiple simultaneous substitutions (2-word changes)
  for (let i = 0; i < wordCount && variations.size < maxVariations; i++) {
    for (let j = i + 1; j < wordCount && variations.size < maxVariations; j++) {
      const index1 = WORD_TO_INDEX.get(words[i]);
      const index2 = WORD_TO_INDEX.get(words[j]);
      
      if (index1 === undefined || index2 === undefined) continue;
      
      // Try small offsets on both words simultaneously
      for (let offset1 = -10; offset1 <= 10 && variations.size < maxVariations; offset1++) {
        for (let offset2 = -10; offset2 <= 10 && variations.size < maxVariations; offset2++) {
          if (offset1 === 0 && offset2 === 0) continue;
          
          const newIndex1 = index1 + offset1;
          const newIndex2 = index2 + offset2;
          
          if (newIndex1 < 0 || newIndex1 >= BIP39_WORDS.length) continue;
          if (newIndex2 < 0 || newIndex2 >= BIP39_WORDS.length) continue;
          
          const newWords = [...words];
          newWords[i] = BIP39_WORDS[newIndex1];
          newWords[j] = BIP39_WORDS[newIndex2];
          variations.add(newWords.join(' '));
        }
      }
    }
  }
  
  const result = Array.from(variations);
  
  // Shuffle to avoid testing in predictable order
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  
  return result.slice(0, maxVariations);
}

/**
 * Calculate "basin proximity" between two phrases
 * Returns normalized distance (0 = identical, 1 = completely different)
 */
export function calculateBasinDistance(phrase1: string, phrase2: string): number {
  const words1 = phrase1.trim().split(/\s+/);
  const words2 = phrase2.trim().split(/\s+/);
  
  if (words1.length !== words2.length) return 1.0; // Different lengths = far apart
  
  let totalDistance = 0;
  for (let i = 0; i < words1.length; i++) {
    const index1 = WORD_TO_INDEX.get(words1[i]) ?? 0;
    const index2 = WORD_TO_INDEX.get(words2[i]) ?? 0;
    
    // Normalized distance: 0 (same word) to 1 (opposite ends of BIP-39 list)
    const wordDistance = Math.abs(index1 - index2) / BIP39_WORDS.length;
    totalDistance += wordDistance;
  }
  
  return totalDistance / words1.length;
}
