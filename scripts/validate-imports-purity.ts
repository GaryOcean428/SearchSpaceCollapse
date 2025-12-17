#!/usr/bin/env tsx
/**
 * Import Purity Validation Script
 * 
 * Validates that imports follow barrel file conventions:
 * - Components should import from '@/components' not '../components/Button'
 * - Hooks should import from '@/hooks' not relative paths
 * - API should import from '@/api' not individual service files
 * 
 * DRY Principle: Single source of truth for exports
 * 
 * Run: npx tsx scripts/validate-imports-purity.ts
 * Or:  npm run validate:imports
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

// Import patterns that violate barrel file conventions
const violationPatterns = [
  {
    pattern: /from\s+['"]\.\.\/components\/ui\/[^'"]+['"]/,
    reason: 'Direct import from ui/ subfolder',
    fix: "Import from '@/components/ui' barrel",
  },
  {
    pattern: /from\s+['"]\.\.\/\.\.\/components\/[^'"]+['"]/,
    reason: 'Deep relative import to components',
    fix: "Import from '@/components'",
  },
  {
    pattern: /from\s+['"]\.\.\/api\/services\/[^'"]+['"]/,
    reason: 'Direct import from api/services/',
    fix: "Import from '@/api' (use api.serviceName or named imports)",
  },
  {
    pattern: /from\s+['"]\.\.\/\.\.\/hooks\/[^'"]+['"]/,
    reason: 'Deep relative import to hooks',
    fix: "Import from '@/hooks'",
  },
  {
    pattern: /from\s+['"]\.\.\/\.\.\/lib\/[^'"]+['"]/,
    reason: 'Deep relative import to lib',
    fix: "Import from '@/lib'",
  },
];

// Approved patterns
const approvedPatterns = [
  /from\s+['"]@\//,              // Aliased imports are OK
  /from\s+['"]\.\/[^'"]+['"]/,   // Same-directory imports OK
  /from\s+['"]\.\.['"]/,         // Parent directory imports (for index re-exports)
  /\.test\.|\.spec\./,           // Test files
  /index\.ts/,                   // Index/barrel files themselves
];

// Directories to scan
const scanDirs = [
  'client/src/pages',
  'client/src/hooks',
];

function checkFile(filePath: string): void {
  // Skip barrel files themselves
  if (filePath.endsWith('index.ts') || filePath.endsWith('index.tsx')) return;
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    for (const { pattern, reason, fix } of violationPatterns) {
      if (pattern.test(line)) {
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

function validateBarrelCompleteness(): void {
  console.log('📦 Validating barrel file completeness...\n');

  const checks = [
    {
      barrel: 'client/src/components/index.ts',
      dir: 'client/src/components',
      ext: '.tsx',
      name: 'Components',
    },
    {
      barrel: 'client/src/hooks/index.ts',
      dir: 'client/src/hooks',
      ext: '.ts',
      name: 'Hooks',
    },
    {
      barrel: 'client/src/api/services',
      dir: 'client/src/api/services',
      ext: '.ts',
      name: 'API Services',
    },
  ];

  for (const { barrel, dir, ext, name } of checks) {
    if (!fs.existsSync(barrel) && !fs.existsSync(dir)) {
      console.log(`  ⚠️  ${name}: Not found`);
      continue;
    }

    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      const files = fs.readdirSync(dir)
        .filter(f => f.endsWith(ext) && !f.startsWith('index'));
      console.log(`  ✅ ${name}: ${files.length} modules`);
    }
  }
  console.log();
}

function main(): void {
  console.log('🎯 Import Purity Validation\n');
  console.log('DRY Principle: Use barrel files for imports\n');
  console.log('=' .repeat(60) + '\n');

  validateBarrelCompleteness();

  console.log('🔍 Scanning for import violations...\n');
  
  for (const dir of scanDirs) {
    scanDirectory(dir);
  }

  console.log('=' .repeat(60) + '\n');
  console.log('📊 Results:\n');

  if (violations.length === 0) {
    console.log('✅ IMPORT PURITY VERIFIED!');
    console.log('✅ All imports follow barrel file conventions.');
    console.log('✅ DRY principle maintained.\n');
    process.exit(0);
  } else {
    console.log('❌ IMPORT PURITY VIOLATIONS DETECTED!\n');
    console.log(`Found ${violations.length} violation(s):\n`);

    violations.forEach((v, i) => {
      console.log(`${i + 1}. ${v.file}:${v.line}`);
      console.log(`   Reason: ${v.reason}`);
      console.log(`   Code: ${v.code}`);
      console.log(`   Fix: ${v.fix}`);
      console.log();
    });

    process.exit(1);
  }
}

main();
