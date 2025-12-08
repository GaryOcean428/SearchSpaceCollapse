#!/usr/bin/env tsx
/**
 * JSON to PostgreSQL Migration Script
 * 
 * Migrates data from JSON files to database:
 * - negative-knowledge.json (29MB) → negative_knowledge table
 * - tested-phrases.json (4.3MB) → tested_phrases table
 * 
 * Usage:
 *   npm run migrate:json-to-db
 *   or
 *   tsx scripts/migrate-json-to-db.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { db } from '../server/db';
import { 
  negativeKnowledge, 
  geometricBarriers, 
  falsePatternClasses, 
  eraExclusions,
  testedPhrases,
  type InsertNegativeKnowledge,
  type InsertGeometricBarrier,
  type InsertFalsePatternClass,
  type InsertEraExclusion,
  type InsertTestedPhrase,
} from '../shared/schema';

const NEGATIVE_KNOWLEDGE_FILE = path.join(process.cwd(), 'data', 'negative-knowledge.json');
const TESTED_PHRASES_FILE = path.join(process.cwd(), 'data', 'tested-phrases.json');
const BACKUP_DIR = path.join(process.cwd(), 'data', 'backups');

interface MigrationStats {
  contradictions: { total: number; migrated: number; skipped: number; failed: number };
  barriers: { total: number; migrated: number; skipped: number; failed: number };
  falsePatterns: { total: number; migrated: number; skipped: number; failed: number };
  eraExclusions: { total: number; migrated: number; skipped: number; failed: number };
  testedPhrases: { total: number; migrated: number; skipped: number; failed: number };
}

const stats: MigrationStats = {
  contradictions: { total: 0, migrated: 0, skipped: 0, failed: 0 },
  barriers: { total: 0, migrated: 0, skipped: 0, failed: 0 },
  falsePatterns: { total: 0, migrated: 0, skipped: 0, failed: 0 },
  eraExclusions: { total: 0, migrated: 0, skipped: 0, failed: 0 },
  testedPhrases: { total: 0, migrated: 0, skipped: 0, failed: 0 },
};

async function backupFiles(): Promise<void> {
  console.log('\n📦 Creating backups...');
  
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  if (fs.existsSync(NEGATIVE_KNOWLEDGE_FILE)) {
    const backup = path.join(BACKUP_DIR, `negative-knowledge-${timestamp}.json`);
    fs.copyFileSync(NEGATIVE_KNOWLEDGE_FILE, backup);
    console.log(`✓ Backed up negative-knowledge.json → ${backup}`);
  }
  
  if (fs.existsSync(TESTED_PHRASES_FILE)) {
    const backup = path.join(BACKUP_DIR, `tested-phrases-${timestamp}.json`);
    fs.copyFileSync(TESTED_PHRASES_FILE, backup);
    console.log(`✓ Backed up tested-phrases.json → ${backup}`);
  }
}

async function migrateNegativeKnowledge(): Promise<void> {
  console.log('\n🔄 Migrating negative knowledge...');
  
  if (!fs.existsSync(NEGATIVE_KNOWLEDGE_FILE)) {
    console.log('⚠ negative-knowledge.json not found, skipping');
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(NEGATIVE_KNOWLEDGE_FILE, 'utf-8'));
  
  // Migrate contradictions
  if (data.contradictions) {
    const contradictionsMap = typeof data.contradictions === 'object' && !Array.isArray(data.contradictions)
      ? Object.entries(data.contradictions)
      : Array.isArray(data.contradictions) 
      ? data.contradictions.map((c: any) => [c.id, c])
      : [];
    
    stats.contradictions.total = contradictionsMap.length;
    console.log(`  Found ${stats.contradictions.total} contradictions`);
    
    for (const [id, contradiction] of contradictionsMap) {
      try {
        const c = contradiction as any;
        const record: InsertNegativeKnowledge = {
          id: c.id || id,
          type: c.type || 'proven_false',
          pattern: c.pattern || '',
          affectedGenerators: c.affectedGenerators || [],
          basinCenter: c.basinRegion?.center || [],
          basinRadius: c.basinRegion?.radius || 0,
          basinRepulsionStrength: c.basinRegion?.repulsionStrength || 0,
          evidence: c.evidence || [],
          hypothesesExcluded: c.hypothesesExcluded || 0,
          computeSaved: c.computeSaved || 0,
          confirmedCount: c.confirmedCount || 1,
          createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
        };
        
        await db!.insert(negativeKnowledge).values(record).onConflictDoNothing();
        stats.contradictions.migrated++;
      } catch (error) {
        console.error(`  ✗ Failed to migrate contradiction ${id}:`, error);
        stats.contradictions.failed++;
      }
    }
  }
  
  // Migrate barriers
  if (data.barriers) {
    const barriersMap = typeof data.barriers === 'object' && !Array.isArray(data.barriers)
      ? Object.entries(data.barriers)
      : Array.isArray(data.barriers)
      ? data.barriers.map((b: any) => [b.id, b])
      : [];
    
    stats.barriers.total = barriersMap.length;
    console.log(`  Found ${stats.barriers.total} barriers`);
    
    for (const [id, barrier] of barriersMap) {
      try {
        const b = barrier as any;
        const record: InsertGeometricBarrier = {
          id: b.id || id,
          center: b.center || [],
          radius: b.radius || 0,
          repulsionStrength: b.repulsionStrength || 0.5,
          reason: b.reason || 'Unknown',
          crossings: b.crossings || 1,
          detectedAt: b.detectedAt ? new Date(b.detectedAt) : new Date(),
        };
        
        await db!.insert(geometricBarriers).values(record).onConflictDoNothing();
        stats.barriers.migrated++;
      } catch (error) {
        console.error(`  ✗ Failed to migrate barrier ${id}:`, error);
        stats.barriers.failed++;
      }
    }
  }
  
  // Migrate false pattern classes
  if (data.falsePatternClasses) {
    const classesMap = typeof data.falsePatternClasses === 'object' && !Array.isArray(data.falsePatternClasses)
      ? Object.entries(data.falsePatternClasses)
      : [];
    
    stats.falsePatterns.total = classesMap.length;
    console.log(`  Found ${stats.falsePatterns.total} false pattern classes`);
    
    for (const [className, classData] of classesMap) {
      try {
        const c = classData as any;
        const record: InsertFalsePatternClass = {
          id: `fpc-${className.replace(/[^a-z0-9]/gi, '-')}`,
          className,
          examples: c.examples || [],
          count: c.count || 0,
          avgPhiAtFailure: c.avgPhiAtFailure || 0,
          lastUpdated: c.lastUpdated ? new Date(c.lastUpdated) : new Date(),
        };
        
        await db!.insert(falsePatternClasses).values(record).onConflictDoNothing();
        stats.falsePatterns.migrated++;
      } catch (error) {
        console.error(`  ✗ Failed to migrate false pattern class ${className}:`, error);
        stats.falsePatterns.failed++;
      }
    }
  }
  
  // Migrate era exclusions
  if (data.eraExclusions) {
    const erasMap = typeof data.eraExclusions === 'object' && !Array.isArray(data.eraExclusions)
      ? Object.entries(data.eraExclusions)
      : [];
    
    stats.eraExclusions.total = erasMap.length;
    console.log(`  Found ${stats.eraExclusions.total} era exclusions`);
    
    for (const [era, patterns] of erasMap) {
      try {
        const record: InsertEraExclusion = {
          id: `era-${era.replace(/[^a-z0-9]/gi, '-')}`,
          era,
          excludedPatterns: Array.isArray(patterns) ? patterns : [],
          reason: `Patterns excluded for era: ${era}`,
          createdAt: new Date(),
        };
        
        await db!.insert(eraExclusions).values(record).onConflictDoNothing();
        stats.eraExclusions.migrated++;
      } catch (error) {
        console.error(`  ✗ Failed to migrate era exclusion ${era}:`, error);
        stats.eraExclusions.failed++;
      }
    }
  }
  
  console.log(`  ✓ Migrated ${stats.contradictions.migrated}/${stats.contradictions.total} contradictions`);
  console.log(`  ✓ Migrated ${stats.barriers.migrated}/${stats.barriers.total} barriers`);
  console.log(`  ✓ Migrated ${stats.falsePatterns.migrated}/${stats.falsePatterns.total} false patterns`);
  console.log(`  ✓ Migrated ${stats.eraExclusions.migrated}/${stats.eraExclusions.total} era exclusions`);
}

async function migrateTestedPhrases(): Promise<void> {
  console.log('\n🔄 Migrating tested phrases...');
  
  if (!fs.existsSync(TESTED_PHRASES_FILE)) {
    console.log('⚠ tested-phrases.json not found, skipping');
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(TESTED_PHRASES_FILE, 'utf-8'));
  
  if (Array.isArray(data)) {
    stats.testedPhrases.total = data.length;
    console.log(`  Found ${stats.testedPhrases.total} tested phrases`);
    
    // Batch insert for better performance
    const BATCH_SIZE = 1000;
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      const records: InsertTestedPhrase[] = [];
      
      for (const phrase of batch) {
        try {
          const record: InsertTestedPhrase = {
            id: phrase.id || `phrase-${i}`,
            phrase: phrase.phrase || phrase.text || '',
            address: phrase.address || '',
            balanceSats: phrase.balanceSats || phrase.balance || 0,
            txCount: phrase.txCount || phrase.transactions || 0,
            phi: phrase.phi,
            kappa: phrase.kappa,
            regime: phrase.regime,
            testedAt: phrase.testedAt ? new Date(phrase.testedAt) : new Date(),
            retestCount: phrase.retestCount || 0,
          };
          
          records.push(record);
          stats.testedPhrases.migrated++;
        } catch (error) {
          console.error(`  ✗ Failed to prepare phrase for migration:`, error);
          stats.testedPhrases.failed++;
        }
      }
      
      try {
        await db!.insert(testedPhrases).values(records).onConflictDoNothing();
        console.log(`  ✓ Migrated batch ${i + 1}-${Math.min(i + BATCH_SIZE, data.length)}/${data.length}`);
      } catch (error) {
        console.error(`  ✗ Failed to insert batch:`, error);
        stats.testedPhrases.failed += records.length;
        stats.testedPhrases.migrated -= records.length;
      }
    }
  }
  
  console.log(`  ✓ Migrated ${stats.testedPhrases.migrated}/${stats.testedPhrases.total} tested phrases`);
}

async function validateMigration(): Promise<boolean> {
  console.log('\n🔍 Validating migration...');
  
  try {
    const [nkCount] = await db!.select({ count: negativeKnowledge.id }).from(negativeKnowledge);
    const [gbCount] = await db!.select({ count: geometricBarriers.id }).from(geometricBarriers);
    const [fpCount] = await db!.select({ count: falsePatternClasses.id }).from(falsePatternClasses);
    const [eeCount] = await db!.select({ count: eraExclusions.id }).from(eraExclusions);
    const [tpCount] = await db!.select({ count: testedPhrases.id }).from(testedPhrases);
    
    console.log('  Database counts:');
    console.log(`    Contradictions: ${Object.keys(nkCount).length}`);
    console.log(`    Barriers: ${Object.keys(gbCount).length}`);
    console.log(`    False patterns: ${Object.keys(fpCount).length}`);
    console.log(`    Era exclusions: ${Object.keys(eeCount).length}`);
    console.log(`    Tested phrases: ${Object.keys(tpCount).length}`);
    
    const totalMigrated = stats.contradictions.migrated + stats.barriers.migrated + 
                         stats.falsePatterns.migrated + stats.eraExclusions.migrated +
                         stats.testedPhrases.migrated;
    const totalFailed = stats.contradictions.failed + stats.barriers.failed + 
                       stats.falsePatterns.failed + stats.eraExclusions.failed +
                       stats.testedPhrases.failed;
    
    console.log(`\n  Migration summary:`);
    console.log(`    ✓ Successfully migrated: ${totalMigrated}`);
    console.log(`    ✗ Failed: ${totalFailed}`);
    
    return totalFailed === 0;
  } catch (error) {
    console.error('  ✗ Validation failed:', error);
    return false;
  }
}

async function main(): Promise<void> {
  console.log('🚀 JSON to PostgreSQL Migration');
  console.log('================================\n');
  
  if (!db) {
    console.error('❌ Database not available. Please configure DATABASE_URL in .env');
    process.exit(1);
  }
  
  try {
    // Backup files
    await backupFiles();
    
    // Migrate data
    await migrateNegativeKnowledge();
    await migrateTestedPhrases();
    
    // Validate
    const isValid = await validateMigration();
    
    if (isValid) {
      console.log('\n✅ Migration completed successfully!');
      console.log('\nNext steps:');
      console.log('  1. Verify the data in your database');
      console.log('  2. Update your application to use the new database modules');
      console.log('  3. Remove or archive the JSON files');
    } else {
      console.log('\n⚠️  Migration completed with some failures');
      console.log('  Check the logs above for details');
      console.log('  Backups are available in:', BACKUP_DIR);
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.log('  Backups are available in:', BACKUP_DIR);
    process.exit(1);
  }
}

main().catch(console.error);
