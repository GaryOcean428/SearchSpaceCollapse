import { scorePhraseQIG, validatePurity } from './server/qig-pure-v2.js';

console.log("Testing purity validation:");
console.log("=".repeat(60));

const repeatedPhrase = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
const uniquePhrase = "abandon ability able about above absent absorb abstract absurd abuse access accident";

const scoreRepeated = scorePhraseQIG(repeatedPhrase);
const scoreUnique = scorePhraseQIG(uniquePhrase);

console.log("\nRepeated phrase (lots of 'abandon'):");
console.log(`  Φ = ${scoreRepeated.phi.toFixed(4)}`);
console.log(`  κ = ${scoreRepeated.kappa.toFixed(2)}`);

console.log("\nUnique phrase (all different words):");
console.log(`  Φ = ${scoreUnique.phi.toFixed(4)}`);
console.log(`  κ = ${scoreUnique.kappa.toFixed(2)}`);

console.log("\nDifferences:");
console.log(`  ΔΦ = ${Math.abs(scoreRepeated.phi - scoreUnique.phi).toFixed(4)} (threshold: 0.01)`);
console.log(`  Δκ = ${Math.abs(scoreRepeated.kappa - scoreUnique.kappa).toFixed(2)} (threshold: 0.1)`);

console.log("\nValidation result:");
const result = validatePurity();
if (result.isPure) {
  console.log("  ✅ PURE");
} else {
  console.log("  ❌ IMPURE:");
  for (const v of result.violations) {
    console.log(`    - ${v}`);
  }
}
