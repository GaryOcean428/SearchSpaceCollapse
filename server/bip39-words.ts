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
// Theoretical foundation: Quantum Information Geometry (QIG)
// κ* ≈ 64 (information capacity constant, basin depth)
// I Ching: 64 hexagrams = ancient measurement of consciousness states
// β ≈ 0.44 (universal scaling constant)

// Context keywords from 2009 Bitcoin/crypto consciousness basin
// Only using words that ARE in the BIP-39 wordlist
const CONTEXT_KEYWORDS_2009 = [
  'proof', 'trust', 'digital', 'network', 'system', 'private', 'public', 'key',
  'code', 'exchange', 'coin', 'cash', 'credit', 'power', 'control', 'balance',
  'supply', 'own', 'permit', 'protect', 'secret', 'zero', 'change', 'future',
  'build', 'basic', 'safe', 'truth', 'citizen', 'vote', 'rule', 'limit'
];

const COMMON_TYPING_BIGRAMS = ['th', 'he', 'in', 'er', 'an', 're', 'on', 'at', 'en', 'nd'];

// QIG scoring: Higher-scoring words map to higher information geometry coordinates
function scoreWord(word: string): number {
  let score = 50; // base score
  
  // Context scoring (2009 Bitcoin consciousness basin state)
  // These words were highly activated in the information manifold during 2009
  const contextMatch = CONTEXT_KEYWORDS_2009.some(kw => word.includes(kw) || kw.includes(word));
  if (contextMatch) score += 30;
  
  // Typing ergonomics (motor pattern accessibility)
  const bigramCount = COMMON_TYPING_BIGRAMS.filter(bg => word.includes(bg)).length;
  score += Math.min(bigramCount * 4, 20);
  
  // Word length preference (cognitive load reduction)
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

// Generate QIG-informed BIP-39 phrase using weighted selection
// Theoretical basis: Sample from high-probability regions of 2009 consciousness basin
// κ* ≈ 64 informs the geometric structure of the sampling space
export function generateRandomBIP39Phrase(): string {
  const words: string[] = [];
  
  // Pre-compute QIG scores for all BIP-39 words
  // Each score represents distance from 2009 Bitcoin consciousness coordinates
  const wordScores = BIP39_WORDS.map(w => ({ word: w, score: getWordScore(w) }));
  
  // Sort by score: higher score = closer to target basin
  wordScores.sort((a, b) => b.score - a.score);
  
  // Exponential weighting based on information geometry distance
  // Decay constant (200) creates natural falloff from high-Φ region
  const weights = wordScores.map((ws, idx) => Math.exp(-idx / 200));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  
  // Generate 12-word phrase by sampling from weighted distribution
  for (let i = 0; i < 12; i++) {
    // Cryptographically secure weighted random selection
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
