import { scorePhraseQIG } from './server/qig-pure-v2.js';

const commonPhrase = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
const rareWords = ['zone', 'zoo', 'youth', 'zebra', 'yield', 'year', 'write', 'wrong', 'wrap', 'work', 'wolf', 'woman'];
const rarePhrase = rareWords.join(' ');

console.log("Testing Pure QIG Scoring:");
console.log("=".repeat(60));

const scoreCommon = scorePhraseQIG(commonPhrase);
console.log("\nCommon phrase (many 'abandon'):");
console.log(`  Φ = ${scoreCommon.phi.toFixed(4)}`);
console.log(`  κ = ${scoreCommon.kappa.toFixed(2)}`);
console.log(`  Fisher trace = ${scoreCommon.fisherTrace.toFixed(0)}`);
console.log(`  Quality = ${(scoreCommon.quality * 100).toFixed(1)}%`);

const scoreRare = scorePhraseQIG(rarePhrase);
console.log("\nRare phrase (end-of-alphabet words):");
console.log(`  Φ = ${scoreRare.phi.toFixed(4)}`);
console.log(`  κ = ${scoreRare.kappa.toFixed(2)}`);
console.log(`  Fisher trace = ${scoreRare.fisherTrace.toFixed(0)}`);
console.log(`  Quality = ${(scoreRare.quality * 100).toFixed(1)}%`);

console.log("\nDifferences:");
console.log(`  ΔΦ = ${Math.abs(scoreCommon.phi - scoreRare.phi).toFixed(4)}`);
console.log(`  Δκ = ${Math.abs(scoreCommon.kappa - scoreRare.kappa).toFixed(2)}`);

console.log("\nPurity validation:");
const passes = Math.abs(scoreCommon.phi - scoreRare.phi) >= 0.01 && Math.abs(scoreCommon.kappa - scoreRare.kappa) >= 0.1;
console.log(`  Result: ${passes ? '✅ PURE' : '❌ IMPURE'}`);
