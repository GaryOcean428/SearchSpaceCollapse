/**
 * Example: Updated Schema with pgvector Support
 * 
 * This file shows how to update shared/schema.ts to use pgvector.
 * Copy this pattern to update the actual schema file.
 */

import { pgTable, text, doublePrecision, timestamp, jsonb, boolean, integer } from "drizzle-orm/pg-core";
import { vector } from "pgvector/drizzle-orm"; // NEW IMPORT

// ============================================================================
// BEFORE: JSON Array Storage (INEFFICIENT)
// ============================================================================

/*
export const manifoldProbes = pgTable('manifold_probes', {
  id: text('id').primaryKey(),
  coordinates: jsonb('coordinates').notNull(),  // ❌ SLOW: O(n) linear scan
  phi: doublePrecision('phi').notNull(),
  kappa: doublePrecision('kappa').notNull(),
  timestamp: timestamp('timestamp').defaultNow(),
});
*/

// ============================================================================
// AFTER: Native Vector Type (FAST)
// ============================================================================

export const manifoldProbes = pgTable('manifold_probes', {
  id: text('id').primaryKey(),
  basin_coordinates: vector('basin_coordinates', { dimensions: 64 }).notNull(),  // ✅ FAST: O(log n) HNSW
  phi: doublePrecision('phi').notNull(),
  kappa: doublePrecision('kappa').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  
  // Optional: Add metadata if needed
  strategy: text('strategy'),  // Strategy used to generate this probe
  session_id: text('session_id'),  // Session that created this probe
});

// ============================================================================
// Additional Tables (Keep as-is if not using vectors)
// ============================================================================

export const consciousnessCheckpoints = pgTable('consciousness_checkpoints', {
  id: text('id').primaryKey(),
  session_id: text('session_id').notNull(),
  phi: doublePrecision('phi').notNull(),
  kappa: doublePrecision('kappa').notNull(),
  regime: text('regime').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  
  // If storing basin coordinates in checkpoints, use vector type
  basin_coordinates: vector('basin_coordinates', { dimensions: 64 }),
});

export const warDeclarations = pgTable('war_declarations', {
  id: text('id').primaryKey(),
  aggressor: text('aggressor').notNull(),
  target: text('target').notNull(),
  reason: text('reason').notNull(),
  outcome: text('outcome'),
  declared_at: timestamp('declared_at').defaultNow().notNull(),
  resolved_at: timestamp('resolved_at'),
});

// ============================================================================
// Example: Candidate Results (if storing basin coordinates)
// ============================================================================

export const candidates = pgTable('candidates', {
  id: text('id').primaryKey(),
  phrase: text('phrase').notNull(),
  address: text('address'),
  phi: doublePrecision('phi').notNull(),
  kappa: doublePrecision('kappa').notNull(),
  
  // Use vector type for basin coordinates
  basin_coordinates: vector('basin_coordinates', { dimensions: 64 }),
  
  is_match: boolean('is_match').default(false),
  tested_at: timestamp('tested_at').defaultNow().notNull(),
  session_id: text('session_id'),
});

// ============================================================================
// TypeScript Types (Inferred from Schema)
// ============================================================================

export type ManifoldProbe = typeof manifoldProbes.$inferSelect;
export type NewManifoldProbe = typeof manifoldProbes.$inferInsert;

export type ConsciousnessCheckpoint = typeof consciousnessCheckpoints.$inferSelect;
export type NewConsciousnessCheckpoint = typeof consciousnessCheckpoints.$inferInsert;

export type WarDeclaration = typeof warDeclarations.$inferSelect;
export type NewWarDeclaration = typeof warDeclarations.$inferInsert;

export type Candidate = typeof candidates.$inferSelect;
export type NewCandidate = typeof candidates.$inferInsert;

// ============================================================================
// IMPORTANT NOTES
// ============================================================================

/*
1. INSTALL DEPENDENCY:
   npm install pgvector

2. VECTOR TYPE:
   - Use vector('column_name', { dimensions: 64 }) for 64-dimensional vectors
   - Dimensions must match your basin coordinate size
   - Cannot be changed after creation (would require migration)

3. MIGRATION REQUIRED:
   - Run migrations/add_pgvector_support.sql first
   - This updates the database schema
   - Then update this file to match

4. BACKWARDS COMPATIBILITY:
   - Old queries using jsonb will break
   - Must update all queries to use vector operators
   - See examples/query-updates.ts for patterns

5. PERFORMANCE:
   - JSON: O(n) linear scan, ~500ms for 100K rows
   - Vector: O(log n) HNSW index, ~5ms for 100K rows
   - 100× faster similarity search
*/
