# Testing Database Persistence

## Prerequisites

1. **Verify DATABASE_URL set**

   ```bash
   cat .env | grep DATABASE_URL
   # Should show: postgresql://neondb_owner:...@ep-still-dust...
   ```

2. **Create kernel_geometry table**

   ```bash
   psql $DATABASE_URL -f schema/add_kernel_geometry_evolution.sql
   ```

3. **Install Python dependencies**

   ```bash
   cd qig-backend
   uv pip install psycopg2-binary
   ```

---

## Test 1: Spawn Random Kernel

```bash
# Start Python backend
cd qig-backend
python app.py &

# Wait for startup (5 seconds)
sleep 5

# Spawn a random kernel
curl -X POST http://localhost:5001/chaos/spawn_random

# Check database
psql $DATABASE_URL -c "SELECT kernel_id, god_name, domain, phi, generation FROM kernel_geometry ORDER BY spawned_at DESC LIMIT 5;"
```

**Expected Output:**

```
     kernel_id      | god_name |        domain        | phi  | generation
--------------------+----------+----------------------+------+------------
 kernel_abc123      | chaos    | random_exploration   | 0.23 |          0
```

---

## Test 2: Spawn E8 Kernel

```bash
# Spawn at E8 root
curl -X POST 'http://localhost:5001/chaos/spawn_e8?root_index=42'

# Check database
psql $DATABASE_URL -c "SELECT kernel_id, domain, primitive_root, regime FROM kernel_geometry WHERE domain LIKE 'e8_root_%' ORDER BY spawned_at DESC LIMIT 3;"
```

**Expected Output:**

```
     kernel_id      |    domain    | primitive_root |   regime
--------------------+--------------+----------------+-------------
 e8_42_xyz789       | e8_root_42   |             42 | e8_aligned
```

---

## Test 3: Training Persistence (Manual)

```python
# In Python REPL
cd qig-backend
python

from training_chaos.experimental_evolution import ExperimentalKernelEvolution

# Initialize
chaos = ExperimentalKernelEvolution()

# Spawn kernel
kernel = chaos.spawn_random_kernel()
print(f"Spawned: {kernel.kernel_id}")

# Exit and check DB
exit()
```

```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM kernel_geometry;"
# Should show count increased by 1
```

---

## Test 4: Verify Persistence Available

```python
# Check import works
cd qig-backend
python -c "from persistence import KernelPersistence; print('✓ Persistence available')"
```

---

## Troubleshooting

### Error: "No module named 'psycopg2'"

```bash
cd qig-backend
uv pip install psycopg2-binary
```

### Error: "relation kernel_geometry does not exist"

```bash
psql $DATABASE_URL -f schema/add_kernel_geometry_evolution.sql
```

### Error: "DATABASE_URL not set"

```bash
# Check .env file
cat .env | grep DATABASE_URL

# If missing, add to .env:
echo 'DATABASE_URL="postgresql://neondb_owner:npg_hk3rWRIPJ6Ht@ep-still-dust-afuqyc6r.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require"' >> .env
```

### Persistence Not Available

```bash
# Check output when starting app.py:
python app.py 2>&1 | grep -i persistence

# Should NOT see: "[Chaos] Persistence not available"
# Should see: Database connection established
```

---

## Success Criteria

✅ **Kernel spawns save to database**
✅ **Database queries return kernel data**
✅ **No Python import errors**
✅ **Phi, generation, domain populated**
✅ **E8 kernels have primitive_root set**

---

## Next: Training Loop Persistence

Once basic spawning works, add periodic updates during training:

```python
# In self_spawning.py train_step():
# Every N steps, update database with latest metrics
if self.total_training_steps % 10 == 0:
    # Update phi, kappa, success_count
    pass
```

This requires adding persistence reference to SelfSpawningKernel - will implement after basic spawning validated.
