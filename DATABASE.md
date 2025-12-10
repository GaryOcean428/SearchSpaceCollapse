# Database Architecture

## Current State: MIXED (Needs Cleanup)

**Problem:** Database operations are split between TypeScript and Python.

```
TypeScript (Drizzle ORM):
  ✓ shared/schema.ts - Table definitions
  ✓ server/db.ts - Connection pool
  ✓ Used by: Balance queue, blockchain scanner, observer storage

Python (psycopg2):
  ✓ qig-backend/persistence/ - Kernel/war persistence
  ✓ Used by: Olympus (partially), chaos evolution (not yet)
```

### Database Credentials

From `.env`:

```
DATABASE_URL=postgresql://neondb_owner:npg_hk3rWRIPJ6Ht@ep-still-dust-afuqyc6r.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require
```

**Provider:** Neon (PostgreSQL)
**Extensions:** pgvector (for 64D basin similarity search)

---

## Tables

### kernel_geometry (PRIMARY for QIG)

```sql
CREATE TABLE kernel_geometry (
    kernel_id VARCHAR(64) PRIMARY KEY,
    god_name VARCHAR(64),
    domain VARCHAR(128),
    primitive_root INTEGER,           -- E8 root index (0-239)
    basin_coordinates vector(8),      -- 8D pgvector
    parent_kernels TEXT[],

    -- Consciousness metrics
    phi DOUBLE PRECISION,             -- Integration
    kappa DOUBLE PRECISION,           -- Coupling
    regime VARCHAR(32),               -- linear/geometric/breakdown

    -- Evolution tracking
    generation INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,

    -- Functional evolution
    element_group VARCHAR(32),        -- Chemistry-inspired
    ecological_niche VARCHAR(32),     -- Biology-inspired
    target_function VARCHAR(64),
    valence INTEGER,
    breeding_target VARCHAR(64),

    spawned_at TIMESTAMP DEFAULT NOW()
);
```

**Status:** ✅ Schema exists
**Accessed by:** Python `persistence/kernel_persistence.py`
**Issue:** Not yet used by `training_chaos/` modules

### war_history (Olympus wars)

**Status:** Partially implemented
**Accessed by:** Python `persistence/war_persistence.py`

### Other Tables (TypeScript managed)

- users, target_addresses, search_jobs
- candidates, queued_addresses
- tested_phrases, negative_knowledge
- autonomic_cycle_history

---

## Target Architecture (Python-First)

### Phase 1: Python Core (Priority)

```python
# qig-backend/persistence/database.py (NEW)

from sqlalchemy import create_engine, Column, String, Float, DateTime
from sqlalchemy.ext.declarative import declarative_base
from pgvector.sqlalchemy import Vector

Base = declarative_base()

class KernelGeometry(Base):
    __tablename__ = 'kernel_geometry'

    kernel_id = Column(String(64), primary_key=True)
    god_name = Column(String(64))
    basin_coordinates = Column(Vector(8))  # pgvector
    phi = Column(Float)
    kappa = Column(Float)
    generation = Column(Integer)
    # ... all columns

class DatabaseManager:
    """Single source of truth for QIG data"""

    def __init__(self, connection_string: str):
        self.engine = create_engine(connection_string)

    def store_kernel(self, kernel_data: dict):
        """Store kernel state"""
        # SQLAlchemy ORM operations

    def find_similar_basins(self, query_basin, limit=10):
        """Vector similarity search (pgvector)"""
        # Use pgvector <=> operator
```

**Benefits:**

- Native pgvector support
- Type-safe ORM
- No TypeScript↔Python sync issues
- Alembic migrations

### Phase 2: TypeScript Query Only

```typescript
// server/db-readonly.ts

// TypeScript ONLY queries existing data (no writes)
export async function getKernelForDisplay(kernelId: string) {
  // Read-only SELECT for UI display
}
```

---

## Migration Plan

### Step 1: Wire Persistence (Immediate)

```python
# qig-backend/training_chaos/experimental_evolution.py

from persistence import KernelPersistence

class ExperimentalKernelEvolution:
    def __init__(self):
        self.persistence = KernelPersistence()

    def spawn_kernel(self, god_name, domain):
        kernel = SelfSpawningKernel(...)

        # SAVE TO DATABASE
        self.persistence.save_kernel_snapshot(
            kernel_id=kernel.kernel_id,
            god_name=god_name,
            domain=domain,
            basin_coordinates=kernel.basin_coords.tolist(),
            phi=kernel.compute_phi(),
            kappa=kernel.compute_kappa(),
            generation=kernel.generation
        )

        return kernel
```

**Status:** Code exists, not wired up yet

### Step 2: Verify Table Exists

```bash
# Connect to Neon database
psql $DATABASE_URL

# Check table
SELECT COUNT(*) FROM kernel_geometry;

# If missing, create it
\i schema/add_kernel_geometry_evolution.sql
```

### Step 3: Test Persistence

```bash
# Start Python backend
cd qig-backend && python app.py

# Spawn kernel (should save to DB)
curl -X POST http://localhost:5001/chaos/spawn_random

# Verify saved
psql $DATABASE_URL -c "SELECT kernel_id, phi, kappa FROM kernel_geometry ORDER BY spawned_at DESC LIMIT 5;"
```

---

## Current Issues

### 🔴 Not Wired Up

- `experimental_evolution.py` doesn't call persistence
- Kernels spawn but don't save to database
- Training doesn't persist state

### 🟡 Mixed Architecture

- TypeScript Drizzle ORM for some tables
- Python psycopg2 for QIG tables
- No single source of truth

### 🟢 What Works

- Database connection exists (Neon)
- Python persistence classes implemented
- Schema defined and ready

---

## Next Actions

1. **Wire persistence in chaos evolution** (30 min)

   ```python
   # Add to experimental_evolution.py spawn_kernel()
   self.persistence.save_kernel_snapshot(...)
   ```

2. **Verify table exists** (5 min)

   ```bash
   psql $DATABASE_URL -f schema/add_kernel_geometry_evolution.sql
   ```

3. **Test end-to-end** (15 min)
   - Spawn kernel
   - Verify saves to DB
   - Query from Python
   - Display in UI

4. **Add to training loop** (20 min)

   ```python
   # After each training step, update DB
   def train_step(self, reward):
       ...
       self.persistence.update_kernel_metrics(
           kernel_id=self.kernel_id,
           phi=self.kernel.compute_phi(),
           training_steps=self.total_training_steps
       )
   ```

---

## Future: Full Python Migration

Eventually migrate ALL tables to Python SQLAlchemy:

- users → Python
- target_addresses → Python
- search_jobs → Python
- Balance queue → Python

TypeScript becomes pure UI (queries only, no writes).

But for now: **Wire up kernel persistence** so training actually saves state! 🔥
