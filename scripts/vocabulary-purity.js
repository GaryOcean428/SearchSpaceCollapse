#!/usr/bin/env node
/**
 * Vocabulary Purity Check - Node.js Wrapper
 * 
 * Runs the Python vocabulary purity checker.
 * Usage:
 *   npm run vocab:check    # Dry run
 *   npm run vocab:clean    # Actually clean
 *   npm run vocab:stats    # Show statistics
 */

const { spawn } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);

const pythonScript = path.join(__dirname, '../qig-backend/scripts/vocabulary_purity.py');

const pythonArgs = ['python3', pythonScript, ...args];

console.log('Running vocabulary purity check...\n');

const proc = spawn('python3', [pythonScript, ...args], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '../qig-backend')
});

proc.on('close', (code) => {
  process.exit(code);
});

proc.on('error', (err) => {
  console.error('Failed to run vocabulary purity check:', err.message);
  process.exit(1);
});
