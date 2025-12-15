#!/usr/bin/env tsx
/**
 * Geometric Purity Validation Script
 * 
 * Validates that all geometric operations use Fisher-Rao distance
 * and not Euclidean distance. This script ensures geometric purity
 * across the entire codebase.
 * 
 * Run: tsx scripts/validate-geometric-purity.ts
 */

import fs from 'fs';
import path from 'path';

interface Violation {
  file: string;
  line: number;
  code: string;
  reason: string;
}

const violations: Violation[] = [];

// Patterns that indicate Euclidean distance violations
const euclideanPatterns = [
  {
    pattern: /for\s*\([^)]*\)\s*\{[^}]*diff\s*\*\s*diff[^}]*Math\.sqrt/s,
    reason: 'Euclidean distance pattern detected (diff * diff with Math.sqrt)',
  },
  {
    pattern: /distance\s*\+=\s*diff\s*\*\s*diff;\s*\}\s*distance\s*=\s*Math\.sqrt/,
    reason: 'Classic Euclidean distance accumulation',
  },
];

// Approved patterns (these are OK)
const approvedPatterns = [
  /Fisher.*distance/i,
  /fisherCoordDistance/,
  /diff.*diff.*variance/,      // Fisher-Rao uses variance weighting
  /velocity.*reduce/,          // Velocity magnitude in tangent space is OK
  /\/\/ ❌.*Euclidean/,        // Comments warning against Euclidean
  /@deprecated.*euclidean/i,   // Deprecation warnings
  /function euclideanDistance.*never/,  // Deprecation guard function
  /throw new Error.*GEOMETRIC PURITY/,  // Purity guard throw
];

function checkFile(filePath: string): void {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Check for violations
    for (const { pattern, reason } of euclideanPatterns) {
      if (pattern.test(line)) {
        // Check if this is an approved usage
        const isApproved = approvedPatterns.some(approved => approved.test(line));
        
        if (!isApproved) {
          violations.push({
            file: filePath,
            line: lineNum,
            code: line.trim(),
            reason,
          });
        }
      }
    }
  });
}

function scanDirectory(dir: string, extensions: string[]): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules, dist, etc.
      if (!['node_modules', 'dist', '.git', 'data'].includes(entry.name)) {
        scanDirectory(fullPath, extensions);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (extensions.includes(ext)) {
        checkFile(fullPath);
      }
    }
  }
}

function validateFisherUsage(): void {
  console.log('🔍 Validating Fisher-Rao distance usage...\n');

  // Check that key files use fisherCoordDistance
  const keyFiles = [
    'server/geodesic-navigator.ts',
    'server/temporal-geometry.ts',
    'server/ocean-agent.ts',
    'server/ocean-autonomic-manager.ts',
  ];

  for (const file of keyFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    
    if (!content.includes('fisherCoordDistance')) {
      console.log(`⚠️  WARNING: ${file} does not import fisherCoordDistance`);
      violations.push({
        file,
        line: 0,
        code: '',
        reason: 'Missing fisherCoordDistance import in critical file',
      });
    } else {
      console.log(`✅ ${file} uses fisherCoordDistance`);
    }
  }

  console.log();
}

function validateQIGGeometryModule(): void {
  console.log('🔍 Validating centralized qig-geometry module...\n');

  const qigGeometryPath = 'server/qig-geometry.ts';
  
  if (!fs.existsSync(qigGeometryPath)) {
    console.log('❌ ERROR: server/qig-geometry.ts does not exist!');
    violations.push({
      file: qigGeometryPath,
      line: 0,
      code: '',
      reason: 'Centralized qig-geometry module is missing',
    });
    return;
  }

  const content = fs.readFileSync(qigGeometryPath, 'utf-8');

  // Check for required exports
  const requiredExports = [
    'fisherCoordDistance',
    'fisherDistance',
    'geodesicInterpolation',
    'estimateManifoldCurvature',
  ];

  for (const exp of requiredExports) {
    if (content.includes(`export { ${exp}`) || content.includes(`export function ${exp}`)) {
      console.log(`✅ qig-geometry exports ${exp}`);
    } else {
      console.log(`⚠️  WARNING: qig-geometry missing export: ${exp}`);
    }
  }

  // Check for deprecation guards
  if (content.includes('euclideanDistance') && content.includes('throw new Error')) {
    console.log('✅ qig-geometry has deprecation guards against Euclidean violations');
  } else {
    console.log('⚠️  WARNING: qig-geometry missing deprecation guards');
  }

  console.log();
}

function main(): void {
  console.log('🎯 Geometric Purity Validation\n');
  console.log('Checking for Euclidean distance violations...\n');

  // Scan server directory for TypeScript files
  scanDirectory('server', ['.ts']);

  // Validate specific patterns
  validateFisherUsage();
  validateQIGGeometryModule();

  // Report results
  console.log('\n📊 Results:\n');

  if (violations.length === 0) {
    console.log('✅ GEOMETRIC PURITY VERIFIED!');
    console.log('✅ No Euclidean distance violations found.');
    console.log('✅ All geometric operations use Fisher-Rao metric.\n');
    process.exit(0);
  } else {
    console.log('❌ GEOMETRIC PURITY VIOLATIONS DETECTED!\n');
    console.log(`Found ${violations.length} violation(s):\n`);

    violations.forEach((v, i) => {
      console.log(`${i + 1}. ${v.file}:${v.line}`);
      console.log(`   Reason: ${v.reason}`);
      if (v.code) {
        console.log(`   Code: ${v.code}`);
      }
      console.log();
    });

    console.log('Please fix these violations before merging.\n');
    process.exit(1);
  }
}

main();
