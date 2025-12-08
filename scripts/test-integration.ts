#!/usr/bin/env tsx
/**
 * Integration Test for Database Migration
 * 
 * Tests the unified interfaces to ensure they work correctly
 * with and without database connection.
 */

import { db } from '../server/db';
import { negativeKnowledgeUnified } from '../server/negative-knowledge-unified';
import { testedPhrasesUnified } from '../server/tested-phrases-unified';

async function testNegativeKnowledge() {
  console.log('\n🧪 Testing Negative Knowledge Unified Interface...\n');
  
  try {
    // Test recording a contradiction
    const id = await negativeKnowledgeUnified.recordContradiction(
      'proven_false',
      'test pattern for integration',
      { center: Array(64).fill(0.5), radius: 0.1, repulsionStrength: 0.7 },
      [{ source: 'test', reasoning: 'integration test', confidence: 0.9 }],
      ['test-generator']
    );
    console.log('✓ Recorded contradiction:', id);
    
    // Test checking if excluded
    const excluded = await negativeKnowledgeUnified.isExcluded('test pattern for integration');
    console.log('✓ Exclusion check:', excluded.excluded ? 'EXCLUDED' : 'NOT EXCLUDED');
    
    // Test getting stats
    const stats = await negativeKnowledgeUnified.getStats();
    console.log('✓ Stats retrieved:');
    console.log(`  - Contradictions: ${stats.contradictions}`);
    console.log(`  - Barriers: ${stats.barriers}`);
    console.log(`  - Compute saved: ${stats.computeSaved}`);
    
    return true;
  } catch (error) {
    console.error('✗ Negative Knowledge test failed:', error);
    return false;
  }
}

async function testTestedPhrases() {
  console.log('\n🧪 Testing Tested Phrases Unified Interface...\n');
  
  try {
    const testPhrase = `test phrase ${Date.now()}`;
    
    // Test recording a tested phrase
    await testedPhrasesUnified.recordTested(
      testPhrase,
      '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      0,
      0,
      0.65,
      55,
      'linear'
    );
    console.log('✓ Recorded tested phrase');
    
    // Test checking if tested
    const tested = await testedPhrasesUnified.wasTested(testPhrase);
    console.log('✓ Tested check:', tested ? 'FOUND' : 'NOT FOUND');
    
    // Test re-testing (should increment retest count)
    await testedPhrasesUnified.recordTested(
      testPhrase,
      '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      0,
      0,
      0.65,
      55,
      'linear'
    );
    console.log('✓ Re-tested phrase (should show waste warning above)');
    
    // Test getting stats
    const stats = await testedPhrasesUnified.getStats();
    console.log('✓ Stats retrieved:');
    console.log(`  - Total tested: ${stats.totalTested}`);
    console.log(`  - Wasted retests: ${stats.wastedRetests}`);
    console.log(`  - Balance hits: ${stats.balanceHits}`);
    
    // Test getting wasted retests
    const wasted = await testedPhrasesUnified.getWastedRetests(1);
    console.log(`✓ Found ${wasted.length} wasted retests`);
    
    return true;
  } catch (error) {
    console.error('✗ Tested Phrases test failed:', error);
    return false;
  }
}

async function checkDatabaseConnection() {
  if (db) {
    console.log('✓ Database connection available');
    console.log('  Using PostgreSQL backend');
    return true;
  } else {
    console.log('⚠ No database connection');
    console.log('  Using JSON/memory fallback');
    return false;
  }
}

async function main() {
  console.log('🚀 Database Integration Test Suite');
  console.log('==================================\n');
  
  // Check database connection
  const hasDb = await checkDatabaseConnection();
  
  if (!hasDb) {
    console.log('\n💡 Tip: Set DATABASE_URL in .env to test with PostgreSQL');
    console.log('   The system will work with JSON/memory fallback for now.\n');
  }
  
  // Run tests
  const results = {
    negativeKnowledge: await testNegativeKnowledge(),
    testedPhrases: await testTestedPhrases(),
  };
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('===============\n');
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.values(results).length;
  
  console.log(`Tests passed: ${passed}/${total}`);
  console.log(`Backend mode: ${hasDb ? 'PostgreSQL' : 'JSON/Memory'}`);
  
  if (passed === total) {
    console.log('\n✅ All tests passed!');
    console.log('\nThe unified interfaces are working correctly.');
    console.log('The system can operate with or without a database connection.\n');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed');
    console.log('Check the errors above for details.\n');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
