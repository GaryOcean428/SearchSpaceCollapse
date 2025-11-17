import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load BIP-39 wordlist (2048 words)
const wordlistPath = join(__dirname, 'bip39-wordlist.txt');
export const BIP39_WORDS = readFileSync(wordlistPath, 'utf-8')
  .split('\n')
  .map(w => w.trim())
  .filter(w => w.length > 0);

// Generate a random 12-word BIP-39 phrase
export function generateRandomBIP39Phrase(): string {
  const words: string[] = [];
  for (let i = 0; i < 12; i++) {
    const randomIndex = Math.floor(Math.random() * BIP39_WORDS.length);
    words.push(BIP39_WORDS[randomIndex]);
  }
  return words.join(' ');
}

// Validate if all words in a phrase are valid BIP-39 words
export function isValidBIP39Phrase(phrase: string): boolean {
  const words = phrase.trim().split(/\s+/);
  const wordSet = new Set(BIP39_WORDS);
  return words.every(word => wordSet.has(word.toLowerCase()));
}
