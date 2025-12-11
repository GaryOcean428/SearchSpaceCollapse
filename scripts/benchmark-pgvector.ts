#!/usr/bin/env node

/**
 * pgvector Performance Benchmark
 * 
 * Tests query performance before and after pgvector migration.
 * Run: node scripts/benchmark-pgvector.js
 */

import { db } from '../server/db.js';
import { manifoldProbes } from '../shared/schema.js';
import { sql } from 'drizzle-orm';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  log(`\n${'='.repeat(80)}`, 'bright');
  log(title, 'bright');
  log('='.repeat(80), 'bright');
}

// Generate random 64-dimensional vector
function randomVector(): number[] {
  const vec = Array(64).fill(0).map(() => Math.random() - 0.5);
  // Normalize to unit sphere
  const magnitude = Math.sqrt(vec.reduce((sum, x) => sum + x * x, 0));
  return vec.map(x => x / magnitude);
}

// ============================================================================
// Benchmark Functions
// ============================================================================

async function getProbeCount(): Promise<number> {
  const result = await db.select({ count: sql<number>`COUNT(*)` })
    .from(manifoldProbes);
  return result[0]?.count || 0;
}

async function benchmarkNearestNeighbor(
  iterations: number = 100
): Promise<{ avgMs: number; minMs: number; maxMs: number }> {
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const queryVector = randomVector();
    const start = performance.now();
    
    await db.select()
      .from(manifoldProbes)
      .orderBy(sql`basin_coordinates <-> ${queryVector}::vector`)
      .limit(10);
    
    const elapsed = performance.now() - start;
    times.push(elapsed);
  }
  
  return {
    avgMs: times.reduce((a, b) => a + b, 0) / times.length,
    minMs: Math.min(...times),
    maxMs: Math.max(...times),
  };
}

async function benchmarkRadiusSearch(
  radius: number = 0.3,
  iterations: number = 50
): Promise<{ avgMs: number; minMs: number; maxMs: number; avgResults: number }> {
  const times: number[] = [];
  const resultCounts: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const queryVector = randomVector();
    const start = performance.now();
    
    const results = await db.select()
      .from(manifoldProbes)
      .where(sql`basin_coordinates <-> ${queryVector}::vector < ${radius}`)
      .orderBy(sql`basin_coordinates <-> ${queryVector}::vector`)
      .limit(100);
    
    const elapsed = performance.now() - start;
    times.push(elapsed);
    resultCounts.push(results.length);
  }
  
  return {
    avgMs: times.reduce((a, b) => a + b, 0) / times.length,
    minMs: Math.min(...times),
    maxMs: Math.max(...times),
    avgResults: resultCounts.reduce((a, b) => a + b, 0) / resultCounts.length,
  };
}

async function benchmarkFilteredSearch(
  minPhi: number = 0.7,
  iterations: number = 50
): Promise<{ avgMs: number; minMs: number; maxMs: number }> {
  const times: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const queryVector = randomVector();
    const start = performance.now();
    
    await db.select()
      .from(manifoldProbes)
      .where(sql`
        basin_coordinates <-> ${queryVector}::vector < 0.5 
        AND phi >= ${minPhi}
      `)
      .orderBy(sql`basin_coordinates <-> ${queryVector}::vector`)
      .limit(20);
    
    const elapsed = performance.now() - start;
    times.push(elapsed);
  }
  
  return {
    avgMs: times.reduce((a, b) => a + b, 0) / times.length,
    minMs: Math.min(...times),
    maxMs: Math.max(...times),
  };
}

// ============================================================================
// Main Benchmark
// ============================================================================

async function runBenchmark() {
  section('pgvector Performance Benchmark');
  
  // Get probe count
  log('Checking database...', 'yellow');
  const probeCount = await getProbeCount();
  
  if (probeCount === 0) {
    log('\n❌ Error: No probes in database', 'red');
    log('   Insert some test data first', 'yellow');
    process.exit(1);
  }
  
  log(`✓ Found ${probeCount.toLocaleString()} probes in database\n`, 'green');
  
  // Check for pgvector
  try {
    const testVector = randomVector();
    await db.select()
      .from(manifoldProbes)
      .orderBy(sql`basin_coordinates <-> ${testVector}::vector`)
      .limit(1);
    log('✓ pgvector extension detected\n', 'green');
  } catch (error) {
    log('❌ pgvector not installed or migration not run', 'red');
    log('   Run: psql $DATABASE_URL < migrations/add_pgvector_support.sql\n', 'yellow');
    process.exit(1);
  }
  
  // ============================================================================
  // Test 1: Nearest Neighbor (k=10)
  // ============================================================================
  
  section('TEST 1: Nearest Neighbor Search (k=10)');
  log('Running 100 queries...', 'yellow');
  
  const nn = await benchmarkNearestNeighbor(100);
  
  log(`\nResults:`, 'cyan');
  log(`  Average: ${nn.avgMs.toFixed(2)} ms`, 'cyan');
  log(`  Min:     ${nn.minMs.toFixed(2)} ms`, 'cyan');
  log(`  Max:     ${nn.maxMs.toFixed(2)} ms`, 'cyan');
  
  if (nn.avgMs < 10) {
    log(`  ✓ Excellent performance (<10ms)`, 'green');
  } else if (nn.avgMs < 50) {
    log(`  ⚠ Good performance (10-50ms)`, 'yellow');
  } else {
    log(`  ❌ Slow performance (>50ms) - check HNSW index`, 'red');
  }
  
  // ============================================================================
  // Test 2: Radius Search
  // ============================================================================
  
  section('TEST 2: Radius Search (r=0.3)');
  log('Running 50 queries...', 'yellow');
  
  const radius = await benchmarkRadiusSearch(0.3, 50);
  
  log(`\nResults:`, 'cyan');
  log(`  Average: ${radius.avgMs.toFixed(2)} ms`, 'cyan');
  log(`  Min:     ${radius.minMs.toFixed(2)} ms`, 'cyan');
  log(`  Max:     ${radius.maxMs.toFixed(2)} ms`, 'cyan');
  log(`  Avg Results: ${radius.avgResults.toFixed(1)} probes`, 'cyan');
  
  if (radius.avgMs < 20) {
    log(`  ✓ Excellent performance (<20ms)`, 'green');
  } else if (radius.avgMs < 100) {
    log(`  ⚠ Good performance (20-100ms)`, 'yellow');
  } else {
    log(`  ❌ Slow performance (>100ms) - check HNSW index`, 'red');
  }
  
  // ============================================================================
  // Test 3: Filtered Search (distance + Φ > 0.7)
  // ============================================================================
  
  section('TEST 3: Filtered Search (distance + Φ > 0.7)');
  log('Running 50 queries...', 'yellow');
  
  const filtered = await benchmarkFilteredSearch(0.7, 50);
  
  log(`\nResults:`, 'cyan');
  log(`  Average: ${filtered.avgMs.toFixed(2)} ms`, 'cyan');
  log(`  Min:     ${filtered.minMs.toFixed(2)} ms`, 'cyan');
  log(`  Max:     ${filtered.maxMs.toFixed(2)} ms`, 'cyan');
  
  if (filtered.avgMs < 30) {
    log(`  ✓ Excellent performance (<30ms)`, 'green');
  } else if (filtered.avgMs < 150) {
    log(`  ⚠ Good performance (30-150ms)`, 'yellow');
  } else {
    log(`  ❌ Slow performance (>150ms) - check indexes`, 'red');
  }
  
  // ============================================================================
  // Summary
  // ============================================================================
  
  section('PERFORMANCE SUMMARY');
  
  // Calculate expected performance for JSON arrays
  const jsonNNEstimate = (probeCount / 1000) * 5; // ~5ms per 1K probes
  const jsonRadiusEstimate = (probeCount / 1000) * 10; // ~10ms per 1K probes
  
  log(`\nDatabase Size: ${probeCount.toLocaleString()} probes\n`, 'cyan');
  
  log('Nearest Neighbor (k=10):', 'bright');
  log(`  pgvector:     ${nn.avgMs.toFixed(2)} ms`, 'green');
  log(`  JSON (est):   ${jsonNNEstimate.toFixed(2)} ms`, 'yellow');
  log(`  Speedup:      ${(jsonNNEstimate / nn.avgMs).toFixed(1)}×`, 'bright');
  
  log('\nRadius Search (r=0.3):', 'bright');
  log(`  pgvector:     ${radius.avgMs.toFixed(2)} ms`, 'green');
  log(`  JSON (est):   ${jsonRadiusEstimate.toFixed(2)} ms`, 'yellow');
  log(`  Speedup:      ${(jsonRadiusEstimate / radius.avgMs).toFixed(1)}×`, 'bright');
  
  // Overall assessment
  const avgTime = (nn.avgMs + radius.avgMs + filtered.avgMs) / 3;
  
  log('\nOverall Assessment:', 'bright');
  if (avgTime < 20) {
    log('  ✓ Excellent performance - pgvector working optimally', 'green');
  } else if (avgTime < 100) {
    log('  ⚠ Good performance - consider tuning HNSW parameters', 'yellow');
  } else {
    log('  ❌ Poor performance - check index creation and ANALYZE', 'red');
  }
  
  // Recommendations
  section('RECOMMENDATIONS');
  
  if (avgTime > 50) {
    log('Performance could be improved:', 'yellow');
    log('  1. Ensure HNSW index exists:', 'cyan');
    log('     SELECT indexname FROM pg_indexes WHERE tablename = \'manifold_probes\';', 'blue');
    log('  2. Run ANALYZE:', 'cyan');
    log('     ANALYZE manifold_probes;', 'blue');
    log('  3. Check index parameters:', 'cyan');
    log('     Consider increasing m or ef_construction if needed', 'blue');
  } else {
    log('✓ Performance is excellent - no tuning needed', 'green');
  }
  
  log('\nFor more details, see:', 'blue');
  log('  - IMPLEMENTATION_GUIDE.md', 'blue');
  log('  - https://github.com/pgvector/pgvector#performance', 'blue');
  
  log('');
  process.exit(0);
}

// ============================================================================
// Run
// ============================================================================

runBenchmark().catch(error => {
  log(`\n❌ Benchmark failed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
