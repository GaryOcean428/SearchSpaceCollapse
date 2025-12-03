import { db } from './db';
import { balanceHits, userTargetAddresses } from '../shared/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

const USER_ID = '36468785';
const DATA_DIR = path.join(process.cwd(), 'data');

interface JsonBalanceHit {
  address: string;
  passphrase: string;
  wif: string;
  balanceSats: number;
  balanceBTC: string;
  txCount: number;
  discoveredAt: string;
  isCompressed: boolean;
  lastChecked?: string;
  previousBalanceSats?: number;
  balanceChanged?: boolean;
}

interface JsonTargetAddress {
  id: string;
  address: string;
  label?: string;
  addedAt: string;
}

async function consolidateBalanceHits(): Promise<number> {
  if (!db) {
    throw new Error('Database not initialized');
  }
  
  const filePath = path.join(DATA_DIR, 'balance-hits.json');
  
  if (!fs.existsSync(filePath)) {
    console.log('No balance-hits.json found');
    return 0;
  }
  
  const rawData = fs.readFileSync(filePath, 'utf-8');
  const hits: JsonBalanceHit[] = JSON.parse(rawData);
  
  console.log(`Found ${hits.length} balance hits in JSON`);
  
  let imported = 0;
  for (const hit of hits) {
    try {
      const existing = await db.select()
        .from(balanceHits)
        .where(eq(balanceHits.address, hit.address))
        .limit(1);
      
      if (existing.length > 0) {
        console.log(`  Skipping ${hit.address} - already exists`);
        continue;
      }
      
      await db.insert(balanceHits).values({
        userId: USER_ID,
        address: hit.address,
        passphrase: hit.passphrase,
        wif: hit.wif,
        balanceSats: hit.balanceSats,
        balanceBtc: hit.balanceBTC || '0.00000000',
        txCount: hit.txCount,
        isCompressed: hit.isCompressed,
        discoveredAt: new Date(hit.discoveredAt),
        lastChecked: hit.lastChecked ? new Date(hit.lastChecked) : null,
        previousBalanceSats: hit.previousBalanceSats ?? null,
        balanceChanged: hit.balanceChanged ?? false,
      });
      
      console.log(`  Imported: ${hit.address} (${hit.passphrase})`);
      imported++;
    } catch (error) {
      console.error(`  Error importing ${hit.address}:`, error);
    }
  }
  
  return imported;
}

async function consolidateTargetAddresses(): Promise<number> {
  if (!db) {
    throw new Error('Database not initialized');
  }
  
  const filePath = path.join(DATA_DIR, 'target-addresses.json');
  
  if (!fs.existsSync(filePath)) {
    console.log('No target-addresses.json found');
    return 0;
  }
  
  const rawData = fs.readFileSync(filePath, 'utf-8');
  const addresses: JsonTargetAddress[] = JSON.parse(rawData);
  
  console.log(`Found ${addresses.length} target addresses in JSON`);
  
  let imported = 0;
  for (const addr of addresses) {
    try {
      const existing = await db.select()
        .from(userTargetAddresses)
        .where(eq(userTargetAddresses.address, addr.address))
        .limit(1);
      
      if (existing.length > 0) {
        console.log(`  Skipping ${addr.address} - already exists`);
        continue;
      }
      
      await db.insert(userTargetAddresses).values({
        userId: USER_ID,
        address: addr.address,
        label: addr.label || null,
        addedAt: new Date(addr.addedAt),
      });
      
      console.log(`  Imported: ${addr.address} (${addr.label || 'no label'})`);
      imported++;
    } catch (error) {
      console.error(`  Error importing ${addr.address}:`, error);
    }
  }
  
  return imported;
}

async function main() {
  console.log('='.repeat(60));
  console.log('DATA CONSOLIDATION TO POSTGRESQL');
  console.log(`User ID: ${USER_ID} (braden.lang77@gmail.com)`);
  console.log('='.repeat(60));
  
  try {
    console.log('\n[1/2] Consolidating Balance Hits...');
    const balanceCount = await consolidateBalanceHits();
    console.log(`Imported ${balanceCount} balance hits to PostgreSQL`);
    
    console.log('\n[2/2] Consolidating Target Addresses...');
    const addressCount = await consolidateTargetAddresses();
    console.log(`Imported ${addressCount} target addresses to PostgreSQL`);
    
    console.log('\n' + '='.repeat(60));
    console.log('CONSOLIDATION COMPLETE');
    console.log(`Total Balance Hits: ${balanceCount}`);
    console.log(`Total Target Addresses: ${addressCount}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('Consolidation failed:', error);
    process.exit(1);
  }
}

export { consolidateBalanceHits, consolidateTargetAddresses };

main().then(() => process.exit(0)).catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
