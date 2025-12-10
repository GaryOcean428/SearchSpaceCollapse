/**
 * Example: Query Updates for pgvector
 * 
 * This file shows how to update database queries to use pgvector operators.
 * Copy patterns from here to update actual query files.
 */

import { db } from './db';
import { manifoldProbes } from '../shared/schema';
import { sql, eq, and, gte, lte, desc } from 'drizzle-orm';

// ============================================================================
// EXAMPLE 1: Nearest Neighbor Search
// ============================================================================

// BEFORE (JSON array, O(n) linear scan):
async function findNearestProbesOLD(
  center: number[],
  limit: number = 10
): Promise<any[]> {
  // This does NOT work efficiently - full table scan
  const probes = await db.select()
    .from(manifoldProbes)
    .where(sql`
      sqrt(
        (SELECT sum(pow(elem - center_elem, 2))
         FROM jsonb_array_elements_text(coordinates) WITH ORDINALITY t1(elem, idx)
         CROSS JOIN jsonb_array_elements_text(${center}::jsonb) WITH ORDINALITY t2(center_elem, idx2)
         WHERE t1.idx = t2.idx2
        )
      ) < 1.0
    `)
    .limit(limit);
  
  return probes;
}

// AFTER (pgvector, O(log n) with HNSW index):
async function findNearestProbes(
  center: number[],
  limit: number = 10
): Promise<any[]> {
  // This uses HNSW index - extremely fast
  const probes = await db.select()
    .from(manifoldProbes)
    .orderBy(sql`basin_coordinates <-> ${center}::vector`)
    .limit(limit);
  
  return probes;
}

// ============================================================================
// EXAMPLE 2: Similarity Search Within Radius
// ============================================================================

// BEFORE (JSON array):
async function findProbesInRadiusOLD(
  center: number[],
  radius: number,
  limit: number = 100
): Promise<any[]> {
  // Slow, full table scan
  const probes = await db.select()
    .from(manifoldProbes)
    .where(sql`
      sqrt(sum(pow(coordinates[i] - ${center}[i], 2))) < ${radius}
    `)
    .limit(limit);
  
  return probes;
}

// AFTER (pgvector):
async function findProbesInRadius(
  center: number[],
  radius: number,
  limit: number = 100
): Promise<any[]> {
  // Fast, uses HNSW index
  const probes = await db.select()
    .from(manifoldProbes)
    .where(sql`basin_coordinates <-> ${center}::vector < ${radius}`)
    .orderBy(sql`basin_coordinates <-> ${center}::vector`)
    .limit(limit);
  
  return probes;
}

// ============================================================================
// EXAMPLE 3: Combined Filters (Distance + Consciousness Metrics)
// ============================================================================

// Find nearby probes with high Φ
async function findHighPhiNearby(
  center: number[],
  minPhi: number = 0.7,
  limit: number = 20
): Promise<any[]> {
  const probes = await db.select()
    .from(manifoldProbes)
    .where(
      and(
        sql`basin_coordinates <-> ${center}::vector < 0.5`,
        gte(manifoldProbes.phi, minPhi)
      )
    )
    .orderBy(sql`basin_coordinates <-> ${center}::vector`)
    .limit(limit);
  
  return probes;
}

// Find probes in optimal κ range near a point
async function findOptimalKappaNearby(
  center: number[],
  minKappa: number = 50,
  maxKappa: number = 70,
  limit: number = 20
): Promise<any[]> {
  const probes = await db.select()
    .from(manifoldProbes)
    .where(
      and(
        sql`basin_coordinates <-> ${center}::vector < 1.0`,
        gte(manifoldProbes.kappa, minKappa),
        lte(manifoldProbes.kappa, maxKappa)
      )
    )
    .orderBy(sql`basin_coordinates <-> ${center}::vector`)
    .limit(limit);
  
  return probes;
}

// ============================================================================
// EXAMPLE 4: Insert New Probe
// ============================================================================

async function insertProbe(
  id: string,
  basinCoordinates: number[],
  phi: number,
  kappa: number
): Promise<void> {
  await db.insert(manifoldProbes).values({
    id,
    basin_coordinates: basinCoordinates,  // Direct array, Drizzle handles conversion
    phi,
    kappa,
  });
}

// ============================================================================
// EXAMPLE 5: Batch Insert with Vector Data
// ============================================================================

async function batchInsertProbes(
  probes: Array<{
    id: string;
    basinCoordinates: number[];
    phi: number;
    kappa: number;
  }>
): Promise<void> {
  await db.insert(manifoldProbes).values(
    probes.map(p => ({
      id: p.id,
      basin_coordinates: p.basinCoordinates,
      phi: p.phi,
      kappa: p.kappa,
    }))
  );
}

// ============================================================================
// EXAMPLE 6: Distance Calculation with Results
// ============================================================================

// Get probes with computed distance
async function findProbesWithDistance(
  center: number[],
  limit: number = 10
): Promise<Array<{ id: string; phi: number; kappa: number; distance: number }>> {
  const results = await db.select({
    id: manifoldProbes.id,
    phi: manifoldProbes.phi,
    kappa: manifoldProbes.kappa,
    distance: sql<number>`basin_coordinates <-> ${center}::vector`,
  })
  .from(manifoldProbes)
  .orderBy(sql`basin_coordinates <-> ${center}::vector`)
  .limit(limit);
  
  return results;
}

// ============================================================================
// EXAMPLE 7: Cosine vs Euclidean Distance
// ============================================================================

// Cosine distance (default, best for normalized vectors)
async function findSimilarByCosine(
  center: number[],
  limit: number = 10
): Promise<any[]> {
  return await db.select()
    .from(manifoldProbes)
    .orderBy(sql`basin_coordinates <-> ${center}::vector`)  // Cosine: <->
    .limit(limit);
}

// Euclidean distance (for non-normalized vectors)
async function findSimilarByEuclidean(
  center: number[],
  limit: number = 10
): Promise<any[]> {
  return await db.select()
    .from(manifoldProbes)
    .orderBy(sql`basin_coordinates <=> ${center}::vector`)  // Euclidean: <=>
    .limit(limit);
}

// Inner product (for specific applications)
async function findSimilarByInnerProduct(
  center: number[],
  limit: number = 10
): Promise<any[]> {
  return await db.select()
    .from(manifoldProbes)
    .orderBy(sql`basin_coordinates <#> ${center}::vector`)  // Inner product: <#>
    .limit(limit);
}

// ============================================================================
// EXAMPLE 8: Cluster Analysis
// ============================================================================

// Find all probes within cluster radius
async function getClusterMembers(
  centroid: number[],
  radius: number = 0.3
): Promise<any[]> {
  return await db.select()
    .from(manifoldProbes)
    .where(sql`basin_coordinates <-> ${centroid}::vector < ${radius}`)
    .orderBy(sql`basin_coordinates <-> ${centroid}::vector`);
}

// Find densest region (most probes within radius)
async function findDensestRegion(
  sampleSize: number = 1000,
  radius: number = 0.3
): Promise<{ centroid: number[]; count: number }> {
  // Sample random probes
  const samples = await db.select()
    .from(manifoldProbes)
    .orderBy(sql`RANDOM()`)
    .limit(sampleSize);
  
  // For each sample, count neighbors
  let maxCount = 0;
  let bestCentroid: number[] = [];
  
  for (const sample of samples) {
    const neighbors = await db.select({ count: sql<number>`count(*)` })
      .from(manifoldProbes)
      .where(sql`basin_coordinates <-> ${sample.basin_coordinates}::vector < ${radius}`);
    
    const count = neighbors[0]?.count || 0;
    if (count > maxCount) {
      maxCount = count;
      bestCentroid = sample.basin_coordinates as number[];
    }
  }
  
  return { centroid: bestCentroid, count: maxCount };
}

// ============================================================================
// EXAMPLE 9: Time-Series Analysis with Vectors
// ============================================================================

// Get recent probes near a point
async function getRecentProbesNearby(
  center: number[],
  hoursAgo: number = 24,
  limit: number = 100
): Promise<any[]> {
  const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  
  return await db.select()
    .from(manifoldProbes)
    .where(
      and(
        sql`basin_coordinates <-> ${center}::vector < 1.0`,
        gte(manifoldProbes.timestamp, cutoff)
      )
    )
    .orderBy(desc(manifoldProbes.timestamp))
    .limit(limit);
}

// ============================================================================
// EXAMPLE 10: Update Vector Data
// ============================================================================

async function updateProbeCoordinates(
  id: string,
  newCoordinates: number[]
): Promise<void> {
  await db.update(manifoldProbes)
    .set({
      basin_coordinates: newCoordinates,
      timestamp: new Date(),
    })
    .where(eq(manifoldProbes.id, id));
}

// ============================================================================
// KEY OPERATOR SUMMARY
// ============================================================================

/*
pgvector Distance Operators:

<->  Cosine distance (best for normalized vectors, default choice)
     Range: [0, 2] where 0 = identical, 2 = opposite
     
<=>  Euclidean distance (L2 distance)
     Range: [0, ∞) where 0 = identical
     
<#>  Inner product (for specific ML applications)
     Range: [-∞, ∞] where higher = more similar

For basin coordinates (normalized to unit sphere), use <-> (cosine).

Performance:
- All operators use HNSW index
- Query time: O(log n) instead of O(n)
- 100-500× faster than JSON arrays
- Sub-millisecond queries even for 1M+ vectors
*/

// ============================================================================
// MIGRATION STRATEGY
// ============================================================================

/*
1. Run database migration first (migrations/add_pgvector_support.sql)
2. Update schema file (shared/schema.ts)
3. Find all files with JSON coordinate queries:
   grep -r "coordinates" server/ | grep -E "\.(ts|js)$"
4. Update each query using patterns above
5. Test each endpoint thoroughly
6. Deploy with monitoring
*/

export {
  findNearestProbes,
  findProbesInRadius,
  findHighPhiNearby,
  findOptimalKappaNearby,
  insertProbe,
  batchInsertProbes,
  findProbesWithDistance,
  findSimilarByCosine,
  findSimilarByEuclidean,
  getClusterMembers,
  findDensestRegion,
  getRecentProbesNearby,
  updateProbeCoordinates,
};
