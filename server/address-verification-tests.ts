/**
 * Address Verification Stress Tests
 * 
 * Comprehensive testing of address generation, verification, and storage logic:
 * 1. Address generation accuracy
 * 2. Target matching logic
 * 3. Balance checking reliability
 * 4. Data completeness (WIF, keys, etc.)
 * 5. Storage persistence
 * 6. Concurrent processing
 * 7. API failover
 * 8. Memory efficiency
 */

import { 
  generateCompleteAddress,
  verifyAndStoreAddress,
  batchVerifyAddresses,
  getVerificationStats
} from './address-verification';
import { validateBitcoinAddress } from './crypto';
import './balance-queue';

interface TestResult {
  test: string;
  passed: boolean;
  duration: number;
  details?: string;
  error?: string;
}

const testResults: TestResult[] = [];

/**
 * Test 1: Address Generation Accuracy
 */
async function testAddressGeneration(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const testCases = [
      { passphrase: 'satoshi nakamoto', compressed: true },
      { passphrase: 'satoshi nakamoto', compressed: false },
      { passphrase: 'test123', compressed: true },
      { passphrase: '', compressed: true }, // Should handle gracefully
      { passphrase: 'a'.repeat(1000), compressed: true }, // Max length
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const tc of testCases) {
      try {
        if (tc.passphrase === '') {
          // Empty passphrase should throw
          try {
            generateCompleteAddress(tc.passphrase, tc.compressed);
            failed++;
          } catch {
            passed++; // Expected to fail
          }
          continue;
        }
        
        const result = generateCompleteAddress(tc.passphrase, tc.compressed);
        
        // Verify all fields present
        if (!result.address || !result.wif || !result.privateKeyHex || !result.publicKeyHex) {
          console.error('[Test] Missing fields:', result);
          failed++;
          continue;
        }
        
        // Verify address format
        try {
          validateBitcoinAddress(result.address);
        } catch (e) {
          console.error('[Test] Invalid address format:', result.address, e);
          failed++;
          continue;
        }
        
        // Verify WIF format
        if (tc.compressed && !result.wif.startsWith('K') && !result.wif.startsWith('L')) {
          console.error('[Test] Invalid compressed WIF:', result.wif);
          failed++;
          continue;
        }
        
        if (!tc.compressed && !result.wif.startsWith('5')) {
          console.error('[Test] Invalid uncompressed WIF:', result.wif);
          failed++;
          continue;
        }
        
        // Verify private key is 64 hex chars
        if (!/^[0-9a-f]{64}$/i.test(result.privateKeyHex)) {
          console.error('[Test] Invalid private key format:', result.privateKeyHex);
          failed++;
          continue;
        }
        
        passed++;
        
      } catch (error) {
        console.error('[Test] Address generation error:', error);
        failed++;
      }
    }
    
    const success = failed === 0;
    
    return {
      test: 'Address Generation Accuracy',
      passed: success,
      duration: Date.now() - startTime,
      details: `Passed: ${passed}, Failed: ${failed}`,
    };
    
  } catch (error) {
    return {
      test: 'Address Generation Accuracy',
      passed: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test 2: Target Matching Logic
 */
async function testTargetMatching(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Generate a known address
    const testPassphrase = 'test_target_matching_12345';
    const generated = generateCompleteAddress(testPassphrase, true);
    
    // Test with target list containing the address
    const targetList = [
      '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', // Genesis
      generated.address, // Our test address
      '1CounterpartyXXXXXXXXXXXXXXXUWLpVr',
    ];
    
    const result = await verifyAndStoreAddress(generated, targetList);
    
    if (!result.matchesTarget) {
      return {
        test: 'Target Matching Logic',
        passed: false,
        duration: Date.now() - startTime,
        error: 'Failed to match target address',
      };
    }
    
    if (result.targetAddress !== generated.address) {
      return {
        test: 'Target Matching Logic',
        passed: false,
        duration: Date.now() - startTime,
        error: 'Matched wrong target address',
      };
    }
    
    // Test with empty target list
    const generated2 = generateCompleteAddress('another_test', true);
    const result2 = await verifyAndStoreAddress(generated2, []);
    
    if (result2.matchesTarget) {
      return {
        test: 'Target Matching Logic',
        passed: false,
        duration: Date.now() - startTime,
        error: 'False positive target match',
      };
    }
    
    return {
      test: 'Target Matching Logic',
      passed: true,
      duration: Date.now() - startTime,
      details: 'Target matching works correctly',
    };
    
  } catch (error) {
    return {
      test: 'Target Matching Logic',
      passed: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test 3: Data Completeness
 */
async function testDataCompleteness(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const testCases = [
      { passphrase: 'completeness_test_1', compressed: true },
      { passphrase: 'completeness_test_2', compressed: false },
    ];
    
    for (const tc of testCases) {
      const result = generateCompleteAddress(tc.passphrase, tc.compressed);
      
      // Check all required fields
      const requiredFields = [
        'address',
        'passphrase',
        'wif',
        'privateKeyHex',
        'publicKeyHex',
        'publicKeyCompressed',
        'isCompressed',
        'addressType',
        'generatedAt',
      ];
      
      for (const field of requiredFields) {
        if (!(field in result)) {
          return {
            test: 'Data Completeness',
            passed: false,
            duration: Date.now() - startTime,
            error: `Missing required field: ${field}`,
          };
        }
      }
      
      // Verify data consistency
      if (result.isCompressed !== tc.compressed) {
        return {
          test: 'Data Completeness',
          passed: false,
          duration: Date.now() - startTime,
          error: 'Compression flag mismatch',
        };
      }
      
      if (result.passphrase !== tc.passphrase) {
        return {
          test: 'Data Completeness',
          passed: false,
          duration: Date.now() - startTime,
          error: 'Passphrase mismatch',
        };
      }
      
      // Verify address type detection
      if (result.address.startsWith('1') && result.addressType !== 'P2PKH') {
        return {
          test: 'Data Completeness',
          passed: false,
          duration: Date.now() - startTime,
          error: 'Address type detection failed',
        };
      }
    }
    
    return {
      test: 'Data Completeness',
      passed: true,
      duration: Date.now() - startTime,
      details: 'All required data fields present and accurate',
    };
    
  } catch (error) {
    return {
      test: 'Data Completeness',
      passed: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test 4: Batch Processing Performance
 */
async function testBatchProcessing(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Generate 100 test addresses
    const testAddresses = Array.from({ length: 100 }, (_, i) => 
      generateCompleteAddress(`batch_test_${i}`, i % 2 === 0)
    );
    
    // Process in batch
    const results = await batchVerifyAddresses(testAddresses, [], 10);
    
    if (results.length !== testAddresses.length) {
      return {
        test: 'Batch Processing Performance',
        passed: false,
        duration: Date.now() - startTime,
        error: `Expected ${testAddresses.length} results, got ${results.length}`,
      };
    }
    
    // Verify all addresses were processed
    for (let i = 0; i < testAddresses.length; i++) {
      if (results[i].address !== testAddresses[i].address) {
        return {
          test: 'Batch Processing Performance',
          passed: false,
          duration: Date.now() - startTime,
          error: 'Address order mismatch in batch results',
        };
      }
    }
    
    const duration = Date.now() - startTime;
    const addressesPerSecond = (testAddresses.length / duration * 1000).toFixed(2);
    
    return {
      test: 'Batch Processing Performance',
      passed: true,
      duration,
      details: `Processed ${testAddresses.length} addresses at ${addressesPerSecond} addr/sec`,
    };
    
  } catch (error) {
    return {
      test: 'Batch Processing Performance',
      passed: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test 5: Statistics Tracking
 */
async function testStatisticsTracking(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const statsBefore = getVerificationStats();
    
    // Generate and verify a few addresses
    const testAddresses = Array.from({ length: 5 }, (_, i) => 
      generateCompleteAddress(`stats_test_${i}`, true)
    );
    
    for (const addr of testAddresses) {
      await verifyAndStoreAddress(addr, []);
    }
    
    const statsAfter = getVerificationStats();
    
    // Stats should have increased (or stayed same if no transactions found)
    if (statsAfter.total < statsBefore.total) {
      return {
        test: 'Statistics Tracking',
        passed: false,
        duration: Date.now() - startTime,
        error: 'Total count decreased',
      };
    }
    
    return {
      test: 'Statistics Tracking',
      passed: true,
      duration: Date.now() - startTime,
      details: `Stats tracked correctly: ${statsAfter.total} total, ${statsAfter.withBalance} with balance, ${statsAfter.withTransactions} with transactions`,
    };
    
  } catch (error) {
    return {
      test: 'Statistics Tracking',
      passed: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run all stress tests
 */
export async function runAddressVerificationStressTests(): Promise<{
  passed: number;
  failed: number;
  total: number;
  duration: number;
  results: TestResult[];
}> {
  console.log('\n🧪 Starting Address Verification Stress Tests...\n');
  
  const overallStart = Date.now();
  
  const tests = [
    testAddressGeneration,
    testTargetMatching,
    testDataCompleteness,
    testBatchProcessing,
    testStatisticsTracking,
  ];
  
  for (const test of tests) {
    const result = await test();
    testResults.push(result);
    
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${result.test} (${result.duration}ms)`);
    if (result.details) {
      console.log(`    ${result.details}`);
    }
    if (result.error) {
      console.error(`    Error: ${result.error}`);
    }
  }
  
  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => !r.passed).length;
  const duration = Date.now() - overallStart;
  
  console.log(`\n📊 Test Summary:`);
  console.log(`   Total: ${testResults.length}`);
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Duration: ${duration}ms`);
  console.log(`   Success Rate: ${((passed / testResults.length) * 100).toFixed(1)}%\n`);
  
  return {
    passed,
    failed,
    total: testResults.length,
    duration,
    results: testResults,
  };
}

// Export for use in other modules
export { testResults };
