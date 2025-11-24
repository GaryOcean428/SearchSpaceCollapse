/**
 * Dormancy Updater
 * 
 * Updates dormancy status for all addresses based on blockchain progress.
 * Runs after each scan batch to increment dormancy for inactive addresses.
 */

import { observerStorage } from "./observer-storage";

/**
 * Update dormancy for all addresses based on latest block height
 * This should be called after scanning a batch of blocks
 */
export async function updateAddressDormancy(latestBlockHeight: number): Promise<void> {
  console.log(`[DormancyUpdater] Updating dormancy for addresses (latest block: ${latestBlockHeight})`);
  
  // Get all addresses (paginated for large datasets)
  const pageSize = 100;
  let offset = 0;
  let processedCount = 0;
  let dormantCount = 0;
  
  while (true) {
    // Get ALL addresses (not just dormant ones) for dormancy calculation
    const addresses = await observerStorage.getAllAddresses(pageSize, offset);
    
    if (addresses.length === 0) break;
    
    for (const address of addresses) {
      // Calculate dormancy blocks (monotonic - always relative to current scan height)
      const dormancyBlocks = Math.max(0, latestBlockHeight - address.lastActivityHeight);
      
      // Mark as dormant if inactive for 52,000 blocks (~1 year at 10 min/block)
      const isDormant = dormancyBlocks >= 52000;
      
      // Only update if dormancy actually changed (avoid unnecessary writes)
      if (address.dormancyBlocks !== dormancyBlocks || address.isDormant !== isDormant) {
        await observerStorage.updateAddress(address.address, {
          dormancyBlocks,
          isDormant,
        });
        
        if (isDormant && !address.isDormant) {
          dormantCount++;
        }
      }
      
      processedCount++;
    }
    
    offset += pageSize;
  }
  
  console.log(`[DormancyUpdater] Updated ${processedCount} addresses, ${dormantCount} newly dormant`);
}
