import { BIP39_WORDS } from './server/bip39-words.js';

const commonWords = ['abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'abandon', 'about'];
const rareWords = ['zone', 'zoo', 'youth', 'zebra', 'yield', 'year', 'write', 'wrong', 'wrap', 'work', 'wolf', 'woman'];

console.log("Word positions in BIP-39 wordlist:");
console.log("=".repeat(60));

console.log("\nCommon phrase:");
for (const word of commonWords.slice(0, 3)) {
  const idx = BIP39_WORDS.indexOf(word);
  console.log(`  "${word}" -> index ${idx}`);
}

console.log("\nRare phrase:");
for (const word of rareWords.slice(0, 3)) {
  const idx = BIP39_WORDS.indexOf(word);
  console.log(`  "${word}" -> index ${idx}`);
}

console.log("\nGlobal probability (uniform):");
console.log(`  p(any word) = 1/2048 = ${(1/2048).toFixed(6)}`);

console.log("\nFisher information I = 1/p:");
console.log(`  I = 2048 (same for all words)`);

console.log("\n❌ PROBLEM: All BIP-39 words have SAME global probability!");
console.log("   Fisher metric can't distinguish based on word choice alone.");
console.log("   It CAN distinguish based on word REPETITION in the phrase.");
