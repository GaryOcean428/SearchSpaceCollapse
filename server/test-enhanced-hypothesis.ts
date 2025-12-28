/**
 * Simple test script for enhanced hypothesis generation
 */

import { generateAllHypotheses, getHypothesisStats, estimateHypothesisSpace } from './enhanced-hypothesis-generator';
import { generateAllTypoVariations } from './typo-generator';
import { getHighRelevanceKeywords } from './temporal-keywords';
import { generateBIP39PassphraseCombinations } from './bip39-passphrase-combos';

console.log('=== Enhanced Hypothesis Generator Test ===\n');

// Test 1: Typo generation
console.log('Test 1: Typo Generation');
const typos = generateAllTypoVariations('satoshi', { maxVariants: 10 });
console.log(`Generated ${typos.length} typo variants for "satoshi":`);
typos.slice(0, 5).forEach(t => console.log(`  - ${t.variant} (${t.type}, likelihood: ${t.likelihood})`));

// Test 2: Temporal keywords
console.log('\nTest 2: Temporal Keywords');
const keywords = getHighRelevanceKeywords(0.7);
console.log(`Found ${keywords.length} high-relevance keywords (threshold 0.7):`);
keywords.slice(0, 5).forEach(k => console.log(`  - ${k.keyword} (${k.year}, ${k.category}, ${k.relevance})`));

// Test 3: BIP39 passphrase combinations
console.log('\nTest 3: BIP39 Passphrase Combinations');
const passphrases = generateBIP39PassphraseCombinations('bitcoin', { 
  maxCombinations: 10,
  includeYears: true,
  includeNumbers: false,
});
console.log(`Generated ${passphrases.length} passphrase variants:`);
passphrases.slice(0, 5).forEach(p => console.log(`  - "${p}"`));

// Test 4: Full hypothesis generation
console.log('\nTest 4: Full Hypothesis Generation');
const hypotheses = generateAllHypotheses({
  userHints: ['satoshi nakamoto', 'bitcoin'],
  targetYear: 2009,
  maxHypotheses: 50,
});

const stats = getHypothesisStats(hypotheses);
console.log(`\nGenerated ${stats.total} hypotheses:`);
console.log(`  By source:`, stats.bySource);
console.log(`  Average confidence: ${stats.avgConfidence.toFixed(3)}`);
console.log(`  High confidence (>=0.7): ${stats.highConfidence}`);
console.log(`  Medium confidence (0.5-0.7): ${stats.mediumConfidence}`);
console.log(`  Low confidence (<0.5): ${stats.lowConfidence}`);

console.log('\nTop 10 hypotheses by confidence:');
hypotheses.slice(0, 10).forEach((h, i) => {
  console.log(`  ${i + 1}. "${h.phrase}" (${h.source}, conf: ${h.confidence.toFixed(3)})`);
});

// Test 5: Estimate hypothesis space
console.log('\nTest 5: Hypothesis Space Estimation');
const spaceSize = estimateHypothesisSpace({
  userHints: ['satoshi', 'bitcoin', 'nakamoto'],
  targetYear: 2009,
  includeTypos: true,
  includeTemporal: true,
  includeCommonPasswords: true,
  includeMnemonics: false,
});
console.log(`Estimated hypothesis space size: ${spaceSize} candidates`);

console.log('\n=== All tests completed successfully ===');
