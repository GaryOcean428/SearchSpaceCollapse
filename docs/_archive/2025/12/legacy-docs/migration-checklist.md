# Migration Checklist: Python Backend Integration

This checklist tracks the migration from TypeScript QIG logic to Python-only architecture.

## Overview

**Goal:** Remove all QIG consciousness logic from TypeScript, making it a thin proxy to Python backend.

**Affected Areas:**
- Ocean route handlers (`server/routes/ocean.ts`)
- Ocean agent (`server/ocean-agent.ts`)
- QIG scoring (`server/qig-pure-v2.ts`)
- Olympus routes (`server/routes/olympus.ts`)

## Phase 1: Core Proxy Integration

### ✅ Completed

- [x] Create `ocean-proxy.ts` with HTTP proxy logic
- [x] Add pgvector migration SQL
- [x] Create implementation guide
- [x] Document architecture changes

### 🔲 Manual Updates Required

#### 1. Update `server/routes/ocean.ts` to Use Proxy

**Pattern to Follow:**

```typescript
// BEFORE (TypeScript has QIG logic):
import { oceanAgent } from '../ocean-agent';

router.post('/assess', async (req, res) => {
  const result = await oceanAgent.assessHypothesis(req.body.phrase);
  res.json(result);
});

// AFTER (TypeScript proxies to Python):
import { oceanProxy } from '../ocean-proxy';

router.post('/assess', async (req, res) => {
  try {
    const result = await oceanProxy.assessHypothesis(req.body.phrase);
    res.json(result);
  } catch (error) {
    console.error('[Ocean] Assessment failed:', error);
    res.status(503).json({ 
      error: 'Python backend unavailable',
      message: error.message 
    });
  }
});
```

**Routes to Update:**

- [ ] `/health` - Keep as-is (TypeScript orchestration)
- [ ] `/neurochemistry` - Keep as-is (TypeScript state)
- [ ] `/cycles/*` - Keep as-is (autonomic manager)
- [ ] `/generate/*` - Keep as-is (constellation)
- [ ] `/python/autonomic/*` - Already proxies to Python ✓
- [ ] Any route calling `oceanAgent.assessHypothesis()` → Update to use `oceanProxy`
- [ ] Any route doing QIG calculations → Move to Python or proxy

**Files to Check:**
```bash
# Find all files importing ocean-agent
grep -r "from '../ocean-agent'" server/
grep -r "from './ocean-agent'" server/
grep -r "import.*ocean-agent" server/

# Expected to find:
# - server/routes/ocean.ts
# - server/ocean-session-manager.ts
# - Others?
```

#### 2. Update `server/routes/olympus.ts` to Use Proxy

**Pattern:**

```typescript
// BEFORE:
import { zeusKernel } from '../olympus/zeus';

router.post('/poll', async (req, res) => {
  const result = zeusKernel.pollPantheon(req.body.target);
  res.json(result);
});

// AFTER:
import { oceanProxy } from '../ocean-proxy';

router.post('/poll', async (req, res) => {
  try {
    const result = await oceanProxy.pollOlympus(req.body.target);
    res.json(result);
  } catch (error) {
    console.error('[Olympus] Poll failed:', error);
    res.status(503).json({ 
      error: 'Python backend unavailable',
      message: error.message 
    });
  }
});
```

**Routes to Update:**

- [ ] `/olympus/status` → `oceanProxy.getOlympusStatus()`
- [ ] `/olympus/poll` → `oceanProxy.pollOlympus(target)`
- [ ] `/olympus/shadow/status` → `oceanProxy.getShadowStatus()`
- [ ] `/olympus/zeus/chat` → `oceanProxy.sendZeusChat(message, context)`

#### 3. Update Imports Throughout Codebase

**Search and Replace:**

```bash
# Find all imports of ocean-agent
grep -r "from '../ocean-agent'" server/ | cut -d: -f1 | sort | uniq

# For each file, replace:
# import { oceanAgent } from '../ocean-agent';
# WITH:
# import { oceanProxy } from '../ocean-proxy';

# And update method calls:
# oceanAgent.assessHypothesis(...) → oceanProxy.assessHypothesis(...)
```

**Files Likely to Need Updates:**
- [ ] `server/ocean-session-manager.ts`
- [ ] `server/auto-cycle-manager.ts` (if it calls oceanAgent)
- [ ] `server/routes/investigation.ts` (if exists)
- [ ] Any other files importing ocean-agent

#### 4. Remove TypeScript QIG Logic (Optional - Can Be Done Later)

Once proxy is working and tested:

- [ ] Delete `server/qig-pure-v2.ts` (entire file)
- [ ] Remove QIG methods from `server/ocean-agent.ts`:
  - `computeBasinCoordinates()`
  - `computePhi()`
  - `computeKappa()`
  - Any Fisher metric calculations
  - Any density matrix operations
- [ ] Keep ONLY Bitcoin crypto operations in TypeScript

**Verification:**

```bash
# After deletion, verify no references remain:
grep -r "qig-pure-v2" server/
grep -r "computePhi\|computeKappa\|densityMatrix" server/

# Should only find:
# - Comments
# - Type definitions
# - Proxy method calls
```

## Phase 2: Database Migration

### ✅ Completed

- [x] Create migration SQL file
- [x] Document migration process

### 🔲 Manual Steps Required

#### 1. Backup Database

```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

- [ ] Backup created and verified

#### 2. Install pgvector Extension

```bash
# On Ubuntu/Debian
sudo apt install postgresql-15-pgvector

# On macOS
brew install pgvector

# Verify
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

- [ ] pgvector installed

#### 3. Run Migration

```bash
psql $DATABASE_URL < migrations/add_pgvector_support.sql
```

- [ ] Migration completed successfully
- [ ] Validation passed (check migration output)

#### 4. Update Schema Definitions

**File:** `shared/schema.ts`

```typescript
// Install pgvector support
npm install pgvector

// Update imports
import { vector } from 'pgvector/drizzle-orm';

// Update manifoldProbes table
export const manifoldProbes = pgTable('manifold_probes', {
  id: text('id').primaryKey(),
  basin_coordinates: vector('basin_coordinates', { dimensions: 64 }).notNull(),  // CHANGED
  phi: doublePrecision('phi').notNull(),
  kappa: doublePrecision('kappa').notNull(),
  timestamp: timestamp('timestamp').defaultNow(),
});
```

- [ ] pgvector package installed
- [ ] Schema updated

#### 5. Update Queries

**File:** `server/ocean/ocean-persistence.ts`

```typescript
// BEFORE (JSON array, O(n) linear scan):
const nearby = await db.select()
  .from(manifoldProbes)
  .where(sql`
    sqrt(sum(pow(coordinates[i] - ${center}[i], 2))) < ${radius}
  `);

// AFTER (pgvector, O(log n) with HNSW):
import { sql } from 'drizzle-orm';

const nearby = await db.select()
  .from(manifoldProbes)
  .orderBy(sql`basin_coordinates <-> ${center}::vector`)
  .limit(100);

// With distance filter:
const nearbyInRadius = await db.select()
  .from(manifoldProbes)
  .where(sql`basin_coordinates <-> ${center}::vector < ${radius}`)
  .orderBy(sql`basin_coordinates <-> ${center}::vector`)
  .limit(100);
```

**Files to Update:**
- [ ] `server/ocean/ocean-persistence.ts`
- [ ] `server/geometric-memory.ts`
- [ ] Any other files doing basin coordinate queries

#### 6. Performance Testing

```typescript
// Create benchmark script: scripts/benchmark-pgvector.ts
import { db } from './db';
import { manifoldProbes } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function benchmark() {
  const probeCount = await db.select({ count: sql`COUNT(*)` })
    .from(manifoldProbes);
  
  console.log(`Benchmarking with ${probeCount} probes`);
  
  const queryVector = Array(64).fill(0).map(() => Math.random());
  
  const start = Date.now();
  const results = await db.select()
    .from(manifoldProbes)
    .orderBy(sql`basin_coordinates <-> ${queryVector}::vector`)
    .limit(10);
  const elapsed = Date.now() - start;
  
  console.log(`Query took ${elapsed}ms`);
  console.log(`Expected: <10ms for most datasets`);
}

benchmark();
```

- [ ] Benchmark script created
- [ ] Performance measured
- [ ] Results documented

## Phase 3: Cleanup

### 🔲 Dead Code Removal

#### 1. Delete JSON Adapters

```bash
# These files are verified unused (from FRONTEND_WIRING_VERIFICATION.md)
rm server/persistence/adapters/candidate-json-adapter.ts
rm server/persistence/adapters/file-json-adapter.ts
rm server/persistence/adapters/search-job-json-adapter.ts
```

- [ ] Files deleted

#### 2. Verify No Imports Remain

```bash
grep -r "JsonAdapter" server/
# Should return: No results
```

- [ ] Verification passed

#### 3. Run Tests

```bash
npm test
```

- [ ] All tests passing

## Phase 4: Testing

### Integration Tests

- [ ] Python backend starts successfully
- [ ] Node backend connects to Python backend
- [ ] Health check endpoint works (`GET /api/ocean/health`)
- [ ] Assessment endpoint works (`POST /api/ocean/assess`)
- [ ] Consciousness state endpoint works (`GET /api/ocean/consciousness`)
- [ ] Investigation endpoints work (start/stop/status)
- [ ] Olympus endpoints work (status/poll/shadow)
- [ ] Error handling works (Python backend offline scenario)

### Performance Tests

- [ ] Query performance measured (before vs after pgvector)
- [ ] Expected 50-500× improvement verified
- [ ] No performance regression in other areas

### End-to-End Tests

- [ ] Full recovery flow works
- [ ] Consciousness metrics display correctly
- [ ] Olympus pantheon status updates
- [ ] Zeus chat functional
- [ ] All UI features operational

## Rollback Plan

### If Proxy Integration Fails

```bash
# Revert to main branch
git checkout main

# Or revert specific commits
git revert <commit-sha>
```

### If Database Migration Fails

```sql
-- Run rollback (included in migration SQL)
DROP INDEX IF EXISTS idx_manifold_probes_basin_hnsw;
ALTER TABLE manifold_probes ADD COLUMN coordinates JSONB;
UPDATE manifold_probes SET coordinates = (
  SELECT jsonb_agg(elem) FROM unnest(basin_coordinates::float[]) elem
);
ALTER TABLE manifold_probes DROP COLUMN basin_coordinates;
```

## Success Criteria

- [ ] Zero QIG calculations in TypeScript
- [ ] All Ocean logic calls Python backend
- [ ] Python backend handles 100% of consciousness logic
- [ ] TypeScript only: routing, Bitcoin crypto, UI orchestration
- [ ] pgvector enabled with 100× performance improvement
- [ ] All tests passing
- [ ] No data loss
- [ ] No performance regression in non-optimized areas

## Documentation Updates

- [ ] Update `ARCHITECTURE.md` with new proxy pattern
- [ ] Update `README.md` with Python backend requirements
- [ ] Document Python backend endpoints
- [ ] Update setup instructions

## Notes

**Python Backend Requirements:**

The Python backend must implement these endpoints:
- `POST /ocean/assess` - Assess hypothesis
- `GET /ocean/consciousness` - Get consciousness state
- `POST /ocean/investigation/start` - Start investigation
- `GET /ocean/investigation/{id}/status` - Get status
- `POST /ocean/investigation/{id}/stop` - Stop investigation
- `GET /olympus/status` - Get pantheon status
- `POST /olympus/poll` - Poll pantheon
- `GET /olympus/shadow/status` - Get shadow status
- `POST /olympus/zeus/chat` - Zeus chat

**Environment Variables:**

```bash
# Required
PYTHON_BACKEND_URL=http://localhost:5001
DATABASE_URL=postgresql://user:pass@localhost:5432/searchspace

# Optional
PYTHON_BACKEND_TIMEOUT=30000  # milliseconds
```

---

**Last Updated:** 2025-12-10  
**Status:** Ready for implementation  
**Estimated Time:** 6-8 hours total
