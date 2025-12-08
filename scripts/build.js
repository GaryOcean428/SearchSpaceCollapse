import { execSync } from 'child_process';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

console.log('Starting build process...\n');

try {
  // Step 1: Build frontend with Vite
  console.log('Building frontend with Vite...');
  execSync('vite build', { stdio: 'inherit' });
  console.log('✓ Frontend build complete\n');

  // Step 2: Bundle backend with esbuild
  console.log('Bundling backend with esbuild...');
  execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { stdio: 'inherit' });
  console.log('✓ Backend bundle complete\n');

  // Step 3: Copy BIP-39 wordlist to dist
  console.log('Copying BIP-39 wordlist...');
  const sourceFile = 'server/bip39-wordlist.txt';
  const destFile = 'dist/bip39-wordlist.txt';
  
  if (!existsSync('dist')) {
    mkdirSync('dist', { recursive: true });
  }
  
  if (!existsSync(sourceFile)) {
    throw new Error(`Source file not found: ${sourceFile}`);
  }
  
  copyFileSync(sourceFile, destFile);
  console.log('✓ BIP-39 wordlist copied to dist/\n');

  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}
