import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomInt } from 'crypto';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load BIP-39 wordlist (2048 words)
const wordlistPath = join(__dirname, 'bip39-wordlist.txt');
export const BIP39_WORDS = readFileSync(wordlistPath, 'utf-8')
  .split('\n')
  .map(w => w.trim())
  .filter(w => w.length > 0);

// QIG-informed word scoring for BIP-39 words
const CONTEXT_KEYWORDS_2009 = [
  'crisis', 'bank', 'proof', 'trust', 'freedom', 'digital', 'network', 'system',
  'private', 'public', 'key', 'secure', 'code', 'cyber', 'global', 'exchange'
];

const COMMON_TYPING_BIGRAMS = ['th', 'he', 'in', 'er', 'an', 're', 'on', 'at', 'en', 'nd'];

function scoreWord(word: string): number {
  let score = 50; // base score
  
  // Context scoring (Bitcoin/crypto 2009 era) - heavily weighted
  const contextMatch = CONTEXT_KEYWORDS_2009.some(kw => word.includes(kw) || kw.includes(word));
  if (contextMatch) score += 30;
  
  // Typing ergonomics
  const bigramCount = COMMON_TYPING_BIGRAMS.filter(bg => word.includes(bg)).length;
  score += Math.min(bigramCount * 4, 20);
  
  // Prefer shorter words (easier to remember/type)
  if (word.length <= 5) score += 5;
  
  return Math.min(score, 100);
}

// Cache word scores for performance
const WORD_SCORES = new Map<string, number>();
function getWordScore(word: string): number {
  if (!WORD_SCORES.has(word)) {
    WORD_SCORES.set(word, scoreWord(word));
  }
  return WORD_SCORES.get(word)!;
}

// Generate QIG-informed BIP-39 phrase using weighted selection based on word scores
export function generateRandomBIP39Phrase(): string {
  const words: string[] = [];
  
  // Pre-compute scores for all BIP-39 words
  const wordScores = BIP39_WORDS.map(w => ({ word: w, score: getWordScore(w) }));
  
  // Sort by score and create weighted probability distribution
  // Higher-scored words have higher probability of being selected
  wordScores.sort((a, b) => b.score - a.score);
  
  // Use exponential weighting: top words much more likely
  const weights = wordScores.map((ws, idx) => Math.exp(-idx / 200));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  
  for (let i = 0; i < 12; i++) {
    // Weighted random selection using cryptographically secure random
    const randomValue = randomInt(0, 1000000) / 1000000; // [0, 1)
    let random = randomValue * totalWeight;
    let selectedIdx = 0;
    
    for (let j = 0; j < weights.length; j++) {
      random -= weights[j];
      if (random <= 0) {
        selectedIdx = j;
        break;
      }
    }
    
    words.push(wordScores[selectedIdx].word);
  }
  
  return words.join(' ');
}

// Validate if all words in a phrase are valid BIP-39 words
export function isValidBIP39Phrase(phrase: string): boolean {
  const words = phrase.trim().split(/\s+/);
  const wordSet = new Set(BIP39_WORDS);
  return words.every(word => wordSet.has(word.toLowerCase()));
}
