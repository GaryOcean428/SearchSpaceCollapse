# Examples Directory

This directory contains implementation examples and patterns for the Python migration and pgvector optimization.

## Files

### 1. `ocean-routes-with-proxy.ts`

**Purpose:** Shows how to update route handlers to use ocean-proxy

**Contains:**
- Complete examples of proxy-based route handlers
- Error handling patterns
- What to keep in TypeScript vs move to Python
- Ready-to-copy-paste code snippets

**Use when:** Updating `server/routes/ocean.ts` or similar files

**Key patterns:**
```typescript
// Import proxy
import { oceanProxy } from '../ocean-proxy';

// Use proxy methods
const result = await oceanProxy.assessHypothesis(phrase);

// Error handling
try {
  const result = await oceanProxy.method();
} catch (error) {
  if (error.message.includes('Cannot connect')) {
    return res.status(503).json({ error: 'Python backend unavailable' });
  }
}
```

### 2. `schema-with-pgvector.ts`

**Purpose:** Shows how to update Drizzle schema for pgvector

**Contains:**
- Before/after schema examples
- Vector type definitions
- TypeScript type inference
- Installation notes

**Use when:** Updating `shared/schema.ts`

**Key patterns:**
```typescript
import { vector } from 'pgvector/drizzle-orm';

export const manifoldProbes = pgTable('manifold_probes', {
  basin_coordinates: vector('basin_coordinates', { dimensions: 64 }).notNull(),
  phi: doublePrecision('phi').notNull(),
  kappa: doublePrecision('kappa').notNull(),
});
```

### 3. `query-updates-pgvector.ts`

**Purpose:** Shows how to update database queries for pgvector

**Contains:**
- 10+ complete query examples
- Nearest neighbor search
- Radius search
- Filtered queries
- Cluster analysis
- Distance operator usage

**Use when:** Updating `server/ocean/ocean-persistence.ts` or similar files

**Key patterns:**
```typescript
// Nearest neighbor
const probes = await db.select()
  .from(manifoldProbes)
  .orderBy(sql`basin_coordinates <-> ${center}::vector`)
  .limit(10);

// Radius search
const nearby = await db.select()
  .from(manifoldProbes)
  .where(sql`basin_coordinates <-> ${center}::vector < ${radius}`)
  .orderBy(sql`basin_coordinates <-> ${center}::vector`)
  .limit(100);

// With filters
const highPhi = await db.select()
  .from(manifoldProbes)
  .where(and(
    sql`basin_coordinates <-> ${center}::vector < 0.5`,
    gte(manifoldProbes.phi, 0.7)
  ))
  .orderBy(sql`basin_coordinates <-> ${center}::vector`)
  .limit(20);
```

## Distance Operators

pgvector provides three distance operators:

| Operator | Name | Best For | Range |
|----------|------|----------|-------|
| `<->` | Cosine distance | Normalized vectors (default) | [0, 2] |
| `<=>` | Euclidean distance | Non-normalized vectors | [0, ∞) |
| `<#>` | Inner product | Specific ML applications | [-∞, ∞) |

**For basin coordinates:** Use `<->` (cosine distance)

## Migration Workflow

### Phase 1: Ocean Proxy Integration

1. Read `ocean-routes-with-proxy.ts`
2. Update imports in route files
3. Replace `oceanAgent` calls with `oceanProxy` calls
4. Add error handling for backend unavailability
5. Test each endpoint

### Phase 2: pgvector Migration

1. Run database migration: `psql $DATABASE_URL < migrations/add_pgvector_support.sql`
2. Read `schema-with-pgvector.ts`
3. Install dependency: `npm install pgvector`
4. Update `shared/schema.ts`
5. Read `query-updates-pgvector.ts`
6. Update all database queries
7. Test performance with `scripts/benchmark-pgvector.ts`

### Phase 3: Verification

1. Run migration helper: `node scripts/migration-helper.js`
2. Fix any issues it identifies
3. Run tests: `npm test`
4. Deploy and monitor

## Quick Reference

### Search & Replace Patterns

**Ocean Agent → Ocean Proxy:**
```bash
# Find files
grep -r "from '../ocean-agent'" server/

# In each file, replace:
import { oceanAgent } from '../ocean-agent';
# with:
import { oceanProxy } from '../ocean-proxy';

# Replace method calls:
oceanAgent.assessHypothesis(...)
# with:
oceanProxy.assessHypothesis(...)
```

**JSON Arrays → pgvector:**
```bash
# Find files with coordinate queries
grep -r "coordinates.*jsonb" server/

# In each file, replace query pattern (see query-updates-pgvector.ts)
```

## Testing

### Test Ocean Proxy

```bash
# Start Python backend
cd qig-backend && python -m flask run -p 5001 &

# Start Node backend
npm run dev

# Test endpoint
curl -X POST http://localhost:5000/api/ocean/assess \
  -H "Content-Type: application/json" \
  -d '{"phrase":"test"}'
```

### Test pgvector

```bash
# Run benchmark
node scripts/benchmark-pgvector.ts

# Expected output:
# ✓ pgvector extension detected
# Test 1: Average < 10ms
# Test 2: Average < 20ms
# Test 3: Average < 30ms
```

## Performance Targets

### Ocean Proxy
- Health check: < 100ms
- Assessment: < 500ms
- Investigation start: < 1s

### pgvector Queries
- Nearest neighbor (k=10): < 10ms
- Radius search: < 20ms
- Filtered search: < 30ms

**With 100K probes:**
- Target: 5-10ms per query
- Acceptable: 10-50ms per query
- Investigate if: > 50ms per query

## Common Issues

### Ocean Proxy

**Issue:** "Cannot connect to Python backend"
- **Cause:** Python backend not running or wrong URL
- **Fix:** Start backend on port 5001 or set `PYTHON_BACKEND_URL`

**Issue:** "Python backend timeout"
- **Cause:** Backend overloaded or slow
- **Fix:** Increase timeout in OceanProxy constructor

### pgvector

**Issue:** "Extension not found"
- **Cause:** pgvector not installed
- **Fix:** Install pgvector system-wide, then run migration

**Issue:** "Slow queries (>100ms)"
- **Cause:** HNSW index not created or not analyzed
- **Fix:** Check index exists, run `ANALYZE manifold_probes`

**Issue:** "Type error with vector"
- **Cause:** Schema not updated
- **Fix:** Update `shared/schema.ts` with vector type

## Documentation

For complete documentation, see:
- `IMPLEMENTATION_GUIDE.md` - Step-by-step implementation
- `MIGRATION_CHECKLIST.md` - Task tracking
- `../server/ocean-proxy.ts` - Proxy implementation
- `../migrations/add_pgvector_support.sql` - Database migration

## Scripts

- `scripts/migration-helper.js` - Find files needing updates
- `scripts/benchmark-pgvector.ts` - Test performance

## Support

If you encounter issues:
1. Check this README
2. Review relevant example file
3. Read IMPLEMENTATION_GUIDE.md
4. Check MIGRATION_CHECKLIST.md
5. Review error messages carefully

---

**Last Updated:** 2025-12-10  
**Status:** Ready for use
