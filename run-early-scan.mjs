import { scanEarlyEraBlocks } from './server/blockchain-scanner.ts';

console.log('[EarlyEraScan] Starting blockchain scan: blocks 0-200');
console.log('[EarlyEraScan] This will take ~40 seconds (200ms rate limit per block)');

const startTime = Date.now();

try {
  await scanEarlyEraBlocks(0, 200, (height, total) => {
    if (height % 20 === 0) {
      console.log(`[EarlyEraScan] Progress: ${height}/200 blocks scanned`);
    }
  });
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[EarlyEraScan] ✅ Scan complete in ${elapsed}s`);
  console.log('[EarlyEraScan] Database now populated with 2009-era blockchain data');
  process.exit(0);
} catch (error) {
  console.error('[EarlyEraScan] ❌ Scan failed:', error);
  process.exit(1);
}
