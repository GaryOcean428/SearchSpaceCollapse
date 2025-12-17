#!/usr/bin/env tsx
/**
 * API Purity Validation Script
 * 
 * Validates that all frontend API calls go through the centralized API layer
 * and not through direct fetch() calls.
 * 
 * DRY Principle: All API routes defined once in @/api/routes.ts
 * 
 * Run: npx tsx scripts/validate-api-purity.ts
 * Or:  npm run validate:api
 */

import fs from 'fs';
import path from 'path';

interface Violation {
  file: string;
  line: number;
  code: string;
  reason: string;
  fix: string;
}

const violations: Violation[] = [];

// Patterns that indicate direct fetch violations
const directFetchPatterns = [
  {
    pattern: /fetch\s*\(\s*['"`]\/api\//,
    reason: 'Direct fetch() to /api/ endpoint',
    fix: "Import from '@/api' and use api.serviceName.method()",
  },
  {
    pattern: /fetch\s*\(\s*`\/api\//,
    reason: 'Direct fetch() with template literal to /api/',
    fix: "Use QUERY_KEYS from '@/api' for queries, api.* for mutations",
  },
  {
    pattern: /await\s+fetch\s*\(\s*['"`]\/api/,
    reason: 'Awaited direct fetch to API',
    fix: "Use api.serviceName.method() from '@/api'",
  },
];

// Approved patterns (these are OK)
const approvedPatterns = [
  /\/\/.*fetch/i,                  // Comments
  /\/\*.*fetch.*\*\//,             // Block comments
  /apiRequest/,                    // Using apiRequest helper
  /from\s+['"]@\/api/,             // Importing from API module
  /QUERY_KEYS/,                    // Using query keys
  /client\/src\/api\//,            // Inside the API module itself
  /lib\/queryClient/,              // Query client internals
  /\.test\./,                      // Test files
  /\.spec\./,                      // Spec files
];

// Directories to scan
const scanDirs = [
  'client/src/hooks',
  'client/src/pages',
  'client/src/components',
  'client/src/contexts',
];

// Exempt files (API internals)
const exemptFiles = [
  'client/src/api/',
  'client/src/lib/queryClient.ts',
];

function isExempt(filePath: string): boolean {
  return exemptFiles.some(exempt => filePath.includes(exempt));
}

function checkFile(filePath: string): void {
  if (isExempt(filePath)) return;
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    for (const { pattern, reason, fix } of directFetchPatterns) {
      if (pattern.test(line)) {
        // Check if this is an approved usage
        const isApproved = approvedPatterns.some(approved => approved.test(line));
        
        if (!isApproved) {
          violations.push({
            file: filePath,
            line: lineNum,
            code: line.trim().slice(0, 100),
            reason,
            fix,
          });
        }
      }
    }
  });
}

function scanDirectory(dir: string): void {
  if (!fs.existsSync(dir)) return;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', '.git'].includes(entry.name)) {
        scanDirectory(fullPath);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (['.ts', '.tsx'].includes(ext)) {
        checkFile(fullPath);
      }
    }
  }
}

function validateBarrelExports(): void {
  console.log('📦 Validating barrel file exports...\n');

  const barrelFiles = [
    { path: 'client/src/api/index.ts', name: 'API' },
    { path: 'client/src/components/index.ts', name: 'Components' },
    { path: 'client/src/hooks/index.ts', name: 'Hooks' },
    { path: 'client/src/lib/index.ts', name: 'Lib' },
    { path: 'client/src/pages/index.ts', name: 'Pages' },
    { path: 'client/src/contexts/index.ts', name: 'Contexts' },
  ];

  for (const { path: barrelPath, name } of barrelFiles) {
    if (fs.existsSync(barrelPath)) {
      const content = fs.readFileSync(barrelPath, 'utf-8');
      const exportCount = (content.match(/export/g) || []).length;
      console.log(`  ✅ ${name} barrel exists (${exportCount} exports)`);
    } else {
      console.log(`  ⚠️  ${name} barrel missing: ${barrelPath}`);
    }
  }
  console.log();
}

function validateAPIRouteConsistency(): void {
  console.log('🔗 Validating API route consistency...\n');

  const routesPath = 'client/src/api/routes.ts';
  if (!fs.existsSync(routesPath)) {
    console.log('  ❌ API routes file missing!');
    return;
  }

  const routesContent = fs.readFileSync(routesPath, 'utf-8');
  
  // Count defined routes
  const routeMatches = routesContent.match(/['"`]\/api\/[^'"`]+['"`]/g) || [];
  console.log(`  ✅ API routes defined: ${routeMatches.length} endpoints`);
  
  // Check for QUERY_KEYS
  if (routesContent.includes('QUERY_KEYS')) {
    console.log('  ✅ QUERY_KEYS exported for TanStack Query');
  } else {
    console.log('  ⚠️  QUERY_KEYS not found');
  }

  console.log();
}

function main(): void {
  console.log('🎯 API Purity Validation\n');
  console.log('DRY Principle: All API calls through centralized @/api layer\n');
  console.log('=' .repeat(60) + '\n');

  // Validate barrel exports exist
  validateBarrelExports();

  // Validate API route consistency
  validateAPIRouteConsistency();

  // Scan for direct fetch violations
  console.log('🔍 Scanning for direct fetch() violations...\n');
  
  for (const dir of scanDirs) {
    scanDirectory(dir);
  }

  // Report results
  console.log('=' .repeat(60) + '\n');
  console.log('📊 Results:\n');

  if (violations.length === 0) {
    console.log('✅ API PURITY VERIFIED!');
    console.log('✅ All API calls go through centralized @/api layer.');
    console.log('✅ DRY principle maintained.\n');
    process.exit(0);
  } else {
    console.log('❌ API PURITY VIOLATIONS DETECTED!\n');
    console.log(`Found ${violations.length} violation(s):\n`);

    violations.forEach((v, i) => {
      console.log(`${i + 1}. ${v.file}:${v.line}`);
      console.log(`   Reason: ${v.reason}`);
      console.log(`   Code: ${v.code}`);
      console.log(`   Fix: ${v.fix}`);
      console.log();
    });

    console.log('Please fix these violations to maintain DRY principles.\n');
    process.exit(1);
  }
}

main();
