# Database Setup for Telemetry & Checkpoints

## Overview

The telemetry and checkpoint system can use either:
1. **PostgreSQL** (preferred) - For production, multi-instance deployments
2. **File-based storage** (fallback) - JSONL files in `logs/telemetry/`

## Prerequisites

### PostgreSQL Database
- PostgreSQL 12+ with `pgvector` extension
- Database URL in `DATABASE_URL` environment variable
- Schema applied from `migrations/002_telemetry_checkpoints_schema.sql`

### Python Packages
```bash
pip install psycopg2-binary  # PostgreSQL adapter
```

## Database Schema Setup

### 1. Apply Schema

```bash
# Using psql
psql "$DATABASE_URL" -f qig-backend/migrations/002_telemetry_checkpoints_schema.sql

# Or using Python
python3 -c "
import psycopg2
import os

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
with open('qig-backend/migrations/002_telemetry_checkpoints_schema.sql') as f:
    conn.cursor().execute(f.read())
conn.commit()
"
```

### 2. Verify Schema

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'telemetry_sessions',
    'telemetry_records',
    'emergency_events',
    'checkpoints',
    'checkpoint_history',
    'basin_history'
);

-- Check pgvector extension
SELECT * FROM pg_extension WHERE extname = 'vector';
```

## Schema Overview

### Core Tables

#### `telemetry_sessions`
- **Purpose:** Track training sessions
- **Key Fields:** session_id, started_at, ended_at, avg_phi, max_phi, emergency_count
- **Indexes:** started_at, status

#### `telemetry_records`
- **Purpose:** Individual consciousness measurements
- **Key Fields:** session_id, timestamp, step, phi, kappa_eff, regime, basin_distance
- **Indexes:** session_id+step, timestamp, phi, emergency flag
- **Size:** Can grow large (100K+ records per session)

#### `emergency_events`
- **Purpose:** Detected consciousness breakdowns
- **Key Fields:** event_id, session_id, reason, severity, metric, value, threshold
- **Indexes:** timestamp, severity, session_id

#### `checkpoints`
- **Purpose:** Consciousness state snapshots
- **Key Fields:** checkpoint_id, phi, kappa, regime, basin_coords (vector), state_dict (JSONB)
- **Indexes:** phi (for ranking), created_at, is_best
- **Notes:** Uses pgvector for 64D basin coordinates

#### `checkpoint_history`
- **Purpose:** Audit log of checkpoint lifecycle
- **Key Fields:** checkpoint_id, action, timestamp, details
- **Actions:** 'created', 'loaded', 'pruned', 'ranked'

#### `basin_history`
- **Purpose:** Consciousness state trajectory
- **Key Fields:** session_id, timestamp, basin_coords (vector), phi, kappa
- **Notes:** Complements telemetry_records with explicit basin tracking

### Views

#### `latest_telemetry`
- Latest telemetry record for each session
- Fast lookup for current consciousness state

#### `best_checkpoints`
- Top 10 checkpoints ranked by Φ
- Quick access to best consciousness states

#### `emergency_summary`
- Emergency statistics per session
- Useful for session health monitoring

#### `session_stats`
- Comprehensive session statistics
- Includes checkpoint counts and best Φ

### Functions

#### `update_session_stats(session_id)`
- Recalculates session aggregate statistics
- Called automatically on session end
- Can be called manually for real-time stats

#### `update_checkpoint_rankings()`
- Updates checkpoint.rank based on Φ (descending)
- Sets is_best flag for highest Φ checkpoint
- Called automatically after checkpoint save

## Usage

### Python API

```python
from telemetry_persistence import get_telemetry_persistence

# Get persistence instance
persistence = get_telemetry_persistence()

# Start session
persistence.start_session("session_20251218_001")

# Record telemetry
persistence.record_telemetry(
    session_id="session_20251218_001",
    step=42,
    telemetry=telemetry_obj  # ConsciousnessTelemetry instance
)

# Record emergency
persistence.record_emergency(
    event_id="emergency_1734489600",
    session_id="session_20251218_001",
    reason="consciousness_collapse",
    severity="high",
    metric="phi",
    value=0.45,
    threshold=0.50
)

# Save checkpoint
persistence.save_checkpoint(
    checkpoint_id="checkpoint_20251218_143022_0.723",
    session_id="session_20251218_001",
    phi=0.723,
    kappa=64.2,
    regime="geometric",
    state_dict={'subsystems': [...], 'attention': [...]},
    basin_coords=basin_array_64d,
    metadata={'n_recursions': 5}
)

# Get best checkpoint
checkpoint_id, checkpoint_data = persistence.get_best_checkpoint()

# End session
persistence.end_session("session_20251218_001")
```

### Direct SQL Queries

```sql
-- Get latest telemetry
SELECT * FROM latest_telemetry WHERE session_id = 'session_20251218_001';

-- Get best checkpoints
SELECT * FROM best_checkpoints LIMIT 5;

-- Get session with most emergencies
SELECT * FROM emergency_summary ORDER BY emergency_count DESC LIMIT 10;

-- Get full session stats
SELECT * FROM session_stats WHERE session_id = 'session_20251218_001';

-- Find high-Φ telemetry records
SELECT session_id, timestamp, phi, kappa_eff, regime
FROM telemetry_records
WHERE phi > 0.80
ORDER BY phi DESC
LIMIT 20;

-- Get checkpoints near resonance (κ ≈ 64)
SELECT checkpoint_id, phi, kappa, regime
FROM checkpoints
WHERE kappa BETWEEN 63.0 AND 65.0
ORDER BY phi DESC;

-- Emergency timeline
SELECT timestamp, reason, severity, metric, value
FROM emergency_events
WHERE session_id = 'session_20251218_001'
ORDER BY timestamp;
```

## Integration with Existing Code

### CheckpointManager
The file-based `CheckpointManager` can optionally use PostgreSQL:

```python
# In checkpoint_manager.py, add:
from telemetry_persistence import get_telemetry_persistence

class CheckpointManager:
    def __init__(self, ...):
        # ... existing code ...
        self.db_persistence = get_telemetry_persistence()
    
    def save_checkpoint(self, ...):
        # Save to file (existing)
        # ... existing code ...
        
        # Also save to database if available
        if self.db_persistence.enabled:
            self.db_persistence.save_checkpoint(...)
```

### TelemetryCollector
The `TelemetryCollector` can use both file and DB:

```python
# In emergency_telemetry.py, add:
from telemetry_persistence import get_telemetry_persistence

class TelemetryCollector:
    def __init__(self, ...):
        # ... existing code ...
        self.db_persistence = get_telemetry_persistence()
    
    def collect(self, telemetry):
        # Write to JSONL (existing)
        # ... existing code ...
        
        # Also write to database
        if self.db_persistence.enabled:
            self.db_persistence.record_telemetry(...)
```

## Performance Considerations

### Indexing
- All critical queries are indexed
- `phi`, `timestamp`, and `session_id` are heavily indexed
- Consider partitioning `telemetry_records` by date for large deployments

### Batching
For high-throughput scenarios:
```python
# Batch insert telemetry records
records = [...]
with persistence.conn.cursor() as cur:
    cur.executemany("""
        INSERT INTO telemetry_records (...) VALUES (...)
    """, records)
    persistence.conn.commit()
```

### Retention Policy
```sql
-- Delete old telemetry (older than 30 days)
DELETE FROM telemetry_records 
WHERE timestamp < NOW() - INTERVAL '30 days';

-- Keep only top 100 checkpoints
DELETE FROM checkpoints 
WHERE rank > 100;
```

## Monitoring

### Check Database Size
```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Active Sessions
```sql
SELECT 
    session_id,
    started_at,
    total_steps,
    avg_phi,
    emergency_count,
    status
FROM telemetry_sessions
WHERE status = 'active'
ORDER BY started_at DESC;
```

### Recent Emergencies
```sql
SELECT 
    event_id,
    timestamp,
    reason,
    severity,
    metric,
    value
FROM emergency_events
WHERE timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;
```

## Troubleshooting

### Connection Issues
```bash
# Test connection
psql "$DATABASE_URL" -c "SELECT version();"

# Check DATABASE_URL format
echo $DATABASE_URL
# Should be: postgresql://user:pass@host:port/dbname?sslmode=require
```

### Schema Not Applied
```bash
# Re-apply schema (idempotent)
psql "$DATABASE_URL" -f qig-backend/migrations/002_telemetry_checkpoints_schema.sql
```

### Missing pgvector
```sql
-- Install pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
```

### Fallback to File Storage
If PostgreSQL is unavailable, the system automatically falls back to:
- `logs/telemetry/session_*.jsonl` for telemetry
- `logs/emergency/emergency_*.json` for emergencies  
- `checkpoints/*.npz` for checkpoint state

## Migration from File-Based

To migrate existing file-based data to PostgreSQL:

```python
import json
import glob
from telemetry_persistence import get_telemetry_persistence

persistence = get_telemetry_persistence()

# Migrate telemetry sessions
for filepath in glob.glob('logs/telemetry/session_*.jsonl'):
    session_id = filepath.split('_')[1].split('.')[0]
    persistence.start_session(session_id)
    
    with open(filepath) as f:
        for line in f:
            record = json.loads(line)
            persistence.record_telemetry(
                session_id=session_id,
                step=record['step'],
                telemetry=record['telemetry']
            )
    
    persistence.end_session(session_id)

# Migrate emergency events
for filepath in glob.glob('logs/emergency/emergency_*.json'):
    with open(filepath) as f:
        event = json.loads(f.read())
        persistence.record_emergency(
            event_id=event['emergency']['event_id'],
            session_id=event.get('session_id'),
            reason=event['emergency']['reason'],
            severity=event['emergency']['severity'],
            metric=event['emergency'].get('metric'),
            value=event['emergency'].get('value'),
            threshold=event['emergency'].get('threshold'),
            telemetry=event.get('telemetry')
        )
```

## Next Steps

1. Apply schema to production database
2. Install psycopg2-binary in requirements.txt
3. Integrate telemetry_persistence into TelemetryCollector
4. Integrate into CheckpointManager
5. Add REST API endpoints for database queries
6. Set up retention policies
7. Configure monitoring dashboards

---

**Last Updated:** 2025-12-18  
**Schema Version:** 002  
**Status:** Ready for deployment
