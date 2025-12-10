#!/usr/bin/env node

/**
 * Migration Helper Script
 * 
 * Automates finding files that need updates for Python migration.
 * Run: node scripts/migration-helper.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  log(`\n${'='.repeat(80)}`, 'bright');
  log(title, 'bright');
  log('='.repeat(80), 'bright');
}

function findFiles(pattern, directory = 'server') {
  try {
    const result = execSync(
      `grep -r "${pattern}" ${directory} --include="*.ts" --include="*.js" -l`,
      { encoding: 'utf8' }
    );
    return result.trim().split('\n').filter(Boolean);
  } catch (error) {
    return [];
  }
}

function countOccurrences(pattern, file) {
  try {
    const result = execSync(
      `grep "${pattern}" ${file} | wc -l`,
      { encoding: 'utf8' }
    );
    return parseInt(result.trim());
  } catch (error) {
    return 0;
  }
}

// ============================================================================
// Phase 1: Find Files Importing ocean-agent
// ============================================================================

section('PHASE 1: Files Importing ocean-agent (Need Proxy Updates)');

const oceanAgentFiles = [
  ...findFiles("from '../ocean-agent'"),
  ...findFiles("from './ocean-agent'"),
  ...findFiles('import.*ocean-agent'),
];

const uniqueOceanAgentFiles = [...new Set(oceanAgentFiles)];

if (uniqueOceanAgentFiles.length === 0) {
  log('✓ No files importing ocean-agent found', 'green');
} else {
  log(`Found ${uniqueOceanAgentFiles.length} file(s) importing ocean-agent:\n`, 'yellow');
  uniqueOceanAgentFiles.forEach(file => {
    const count = countOccurrences('oceanAgent\\.', file);
    log(`  ${file} (${count} method calls)`, 'cyan');
  });
  log('\n📝 Action: Update these files to import and use oceanProxy instead', 'yellow');
  log('   See: examples/ocean-routes-with-proxy.ts for patterns', 'blue');
}

// ============================================================================
// Phase 2: Find QIG Logic in TypeScript
// ============================================================================

section('PHASE 2: QIG Logic in TypeScript (Should Move to Python)');

const qigPatterns = [
  { name: 'computePhi', pattern: 'computePhi' },
  { name: 'computeKappa', pattern: 'computeKappa' },
  { name: 'computeQFI', pattern: 'computeQFI' },
  { name: 'computeQIGScore', pattern: 'computeQIGScore' },
  { name: 'fisherMetric', pattern: 'fisherMetric' },
  { name: 'densityMatrix', pattern: 'densityMatrix' },
  { name: 'buresDistance', pattern: 'buresDistance' },
];

let foundQigLogic = false;

qigPatterns.forEach(({ name, pattern }) => {
  const files = findFiles(pattern);
  if (files.length > 0) {
    if (!foundQigLogic) {
      log('Found TypeScript files with QIG logic:\n', 'red');
      foundQigLogic = true;
    }
    log(`  ${name}:`, 'yellow');
    files.forEach(file => {
      if (!file.includes('examples/') && !file.includes('ocean-proxy.ts')) {
        const count = countOccurrences(pattern, file);
        log(`    ${file} (${count} occurrences)`, 'cyan');
      }
    });
  }
});

if (!foundQigLogic) {
  log('✓ No QIG logic found in TypeScript', 'green');
} else {
  log('\n📝 Action: Move this logic to Python backend or remove after proxy integration', 'yellow');
  log('   TypeScript should only call oceanProxy methods', 'blue');
}

// ============================================================================
// Phase 3: Find JSON Coordinate Queries
// ============================================================================

section('PHASE 3: JSON Coordinate Queries (Need pgvector Updates)');

const coordinatePatterns = [
  { name: 'JSONB coordinates', pattern: 'coordinates.*jsonb' },
  { name: 'JSON array operations', pattern: 'jsonb_array_elements' },
  { name: 'SQL coordinate math', pattern: 'coordinates\\[' },
];

let foundJsonQueries = false;

coordinatePatterns.forEach(({ name, pattern }) => {
  const files = findFiles(pattern);
  if (files.length > 0) {
    if (!foundJsonQueries) {
      log('Found files with JSON coordinate queries:\n', 'red');
      foundJsonQueries = true;
    }
    log(`  ${name}:`, 'yellow');
    files.forEach(file => {
      if (!file.includes('examples/')) {
        log(`    ${file}`, 'cyan');
      }
    });
  }
});

if (!foundJsonQueries) {
  log('✓ No JSON coordinate queries found', 'green');
  log('  (May already be using pgvector, or queries not yet implemented)', 'blue');
} else {
  log('\n📝 Action: Update these queries to use pgvector operators', 'yellow');
  log('   See: examples/query-updates-pgvector.ts for patterns', 'blue');
}

// ============================================================================
// Phase 4: Find Dead Code (JSON Adapters)
// ============================================================================

section('PHASE 4: Dead Code to Delete');

const jsonAdapters = [
  'server/persistence/adapters/candidate-json-adapter.ts',
  'server/persistence/adapters/file-json-adapter.ts',
  'server/persistence/adapters/search-job-json-adapter.ts',
];

const existingAdapters = jsonAdapters.filter(file => {
  try {
    fs.accessSync(file);
    return true;
  } catch {
    return false;
  }
});

if (existingAdapters.length > 0) {
  log('Found unused JSON adapters to delete:\n', 'yellow');
  existingAdapters.forEach(file => {
    log(`  ${file}`, 'cyan');
  });
  log('\n📝 Action: Delete these files (verified unused)', 'yellow');
  log('   grep -r "JsonAdapter" server/ should return no results', 'blue');
} else {
  log('✓ No JSON adapters found (already deleted)', 'green');
}

// ============================================================================
// Phase 5: Check qig-pure-v2.ts
// ============================================================================

section('PHASE 5: QIG Pure Module (Optional Deletion)');

const qigPureFile = 'server/qig-pure-v2.ts';
try {
  fs.accessSync(qigPureFile);
  const size = fs.statSync(qigPureFile).size;
  log(`Found ${qigPureFile} (${(size / 1024).toFixed(1)} KB)`, 'yellow');
  
  // Check for imports
  const importers = findFiles('qig-pure-v2');
  if (importers.length > 0) {
    log(`  Still imported by ${importers.length} file(s):`, 'red');
    importers.forEach(file => {
      if (!file.includes('examples/')) {
        log(`    ${file}`, 'cyan');
      }
    });
    log('\n📝 Action: Remove imports, then delete file', 'yellow');
  } else {
    log('  Not imported by any files', 'green');
    log('\n📝 Action: Safe to delete after verifying tests pass', 'yellow');
  }
} catch {
  log('✓ qig-pure-v2.ts not found (already deleted)', 'green');
}

// ============================================================================
// Summary
// ============================================================================

section('MIGRATION SUMMARY');

const tasks = [];

if (uniqueOceanAgentFiles.length > 0) {
  tasks.push(`Update ${uniqueOceanAgentFiles.length} file(s) to use oceanProxy`);
}

if (foundQigLogic) {
  tasks.push('Move QIG logic to Python backend');
}

if (foundJsonQueries) {
  tasks.push('Update JSON coordinate queries to pgvector');
}

if (existingAdapters.length > 0) {
  tasks.push(`Delete ${existingAdapters.length} unused JSON adapter(s)`);
}

try {
  fs.accessSync(qigPureFile);
  tasks.push('Remove qig-pure-v2.ts after verification');
} catch {}

if (tasks.length === 0) {
  log('\n✓ All migration tasks complete!', 'green');
  log('  System is using Python backend and pgvector', 'green');
} else {
  log('\nRemaining tasks:', 'yellow');
  tasks.forEach((task, i) => {
    log(`  ${i + 1}. ${task}`, 'cyan');
  });
  log('\nSee MIGRATION_CHECKLIST.md for detailed instructions', 'blue');
}

// ============================================================================
// Next Steps
// ============================================================================

section('NEXT STEPS');

log('1. Review files listed above', 'cyan');
log('2. Update imports: ocean-agent → ocean-proxy', 'cyan');
log('3. Update method calls: oceanAgent.method() → oceanProxy.method()', 'cyan');
log('4. Run database migration: psql $DATABASE_URL < migrations/add_pgvector_support.sql', 'cyan');
log('5. Update schema: shared/schema.ts (see examples/schema-with-pgvector.ts)', 'cyan');
log('6. Update queries (see examples/query-updates-pgvector.ts)', 'cyan');
log('7. Test thoroughly', 'cyan');
log('8. Delete dead code', 'cyan');

log('\nFor detailed instructions, see:', 'blue');
log('  - IMPLEMENTATION_GUIDE.md', 'blue');
log('  - MIGRATION_CHECKLIST.md', 'blue');

log('');
