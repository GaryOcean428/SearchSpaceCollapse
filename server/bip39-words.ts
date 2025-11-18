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

// QIG-informed BIP-39 phrase generation
// Theoretical foundation: Quantum Information Geometry (QIG)
// κ* ≈ 64 (information capacity constant, basin depth)
// β ≈ 0.44 (universal scaling constant)
//
// BLOCK UNIVERSE FRAMEWORK:
// The 2009 passphrase exists eternally at specific coordinates in the information manifold.
// "Generation" is actually DISCOVERY - we're navigating to find pre-existing coordinates.
// The BIP-39 wordlist (2048 words) defines the basin geometry.
// Each phrase is a 12-24 dimensional coordinate in this eternal structure.
//
// We don't "create" candidates - we ACCESS coordinates that already exist.
// The target exists at some (w₁, w₂, ..., wₙ) where each wᵢ ∈ BIP39_WORDS.
// Uniform sampling = geodesic navigation through all possible coordinates.
//
// Φ EVOLUTION:
// Random phrases start at Φ ≈ 0 (no integration, pure noise in basin)
// As we navigate, Φ increases: 0 → 0.50 → 0.75 → 1.0
// Φ ≥ 0.75 = phase transition (meaningful structure emerges)
// Target passphrase = Φ = 1.0 (exact coordinates, complete integration)

// BIP-39 standard word counts and their entropy:
// 12 words = 128 bits (most common)
// 15 words = 160 bits
// 18 words = 192 bits
// 21 words = 224 bits
// 24 words = 256 bits (maximum entropy)
const VALID_WORD_COUNTS = [12, 15, 18, 21, 24];

export function generateRandomBIP39Phrase(wordCount: number = 12): string {
  // Validate word count
  if (!VALID_WORD_COUNTS.includes(wordCount)) {
    wordCount = 12; // Default to 12 if invalid
  }

  const words: string[] = [];
  const wordlistSize = BIP39_WORDS.length; // 2048
  
  // Navigate to coordinates in the eternal information manifold
  // Block universe perspective: All possible phrases exist at their coordinates
  // We're discovering which coordinates match the target, not "creating" them
  // Each word is an independent dimension in the geometric basin (κ* ≈ 64 depth)
  for (let i = 0; i < wordCount; i++) {
    // Cryptographically secure uniform sampling = unbiased geodesic navigation
    const randomIdx = randomInt(0, wordlistSize);
    words.push(BIP39_WORDS[randomIdx]);
  }
  
  return words.join(' ');
}

// Validate if all words in a phrase are valid BIP-39 words
export function isValidBIP39Phrase(phrase: string): boolean {
  const words = phrase.trim().split(/\s+/);
  const wordSet = new Set(BIP39_WORDS);
  return words.every(word => wordSet.has(word.toLowerCase()));
}
