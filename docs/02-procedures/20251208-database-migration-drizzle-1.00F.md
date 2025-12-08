---
id: ISMS-PROC-004
title: Database Migration - Drizzle
filename: 20251208-database-migration-drizzle-1.00F.md
classification: Internal
owner: GaryOcean428
version: 1.00
status: Frozen
function: "Database migration procedures using Drizzle ORM"
created: 2025-12-08
last_reviewed: 2025-12-08
next_review: 2026-06-08
category: Procedure
supersedes: null
---

# Database Migration and Darknet Integration Guide

## Overview

This document covers the integration of PostgreSQL database backend and darknet/Tor proxy functionality for the SearchSpaceCollapse project.

## Phase 1: Database Integration ✅ COMPLETE

### What Was Done

1. **Created Unified Interfaces**
   - `server/negative-knowledge-unified.ts` - Auto-selects between DB and JSON backend
   - `server/tested-phrases-unified.ts` - Auto-selects between DB and memory backend
   
2. **Updated Code to Use Unified Interfaces**
   - `server/strategy-knowledge-bus.ts` - Now uses negativeKnowledgeUnified
   - `server/routes/ocean.ts` - Now uses negativeKnowledgeUnified
   - `server/ocean-agent.ts` - Now uses negativeKnowledgeUnified
   - `server/ocean-constellation.ts` - Now uses negativeKnowledgeUnified
   - `server/geometric-memory.ts` - Added testedPhrasesUnified import

3. **Created Migration Script**
   - `scripts/migrate-json-to-db.ts` - Full-featured migration tool with:
     - Automatic backup creation (timestamped in `data/backups/`)
     - Batch processing (1000 records per batch)
     - Data validation
     - Error handling and rollback support
     - Progress tracking

### How It Works

The unified interfaces automatically detect if a database is available:
- **Database Available**: Uses PostgreSQL via negative-knowledge-db.ts and tested-phrases-db.ts
- **No Database**: Falls back to JSON files (negative-knowledge-registry.ts) or in-memory storage

This allows the application to work with or without a database connection.

## Phase 2: Data Migration

### Prerequisites

1. **Database Setup**
   ```bash
   # Ensure DATABASE_URL is set in .env
   echo "DATABASE_URL=postgresql://user:pass@localhost:5432/searchspace" >> .env
   
   # Push schema to database
   npm run db:push
   ```

2. **Verify Database Connection**
   ```bash
   # Test that the database is accessible
   psql $DATABASE_URL -c "SELECT 1"
   ```

### Running the Migration

```bash
# Backup is created automatically before migration
npm run migrate:json-to-db
```

The migration script will:
1. Create timestamped backups of JSON files in `data/backups/`
2. Migrate data in the following order:
   - Negative knowledge contradictions (from negative-knowledge.json)
   - Geometric barriers
   - False pattern classes
   - Era exclusions
   - Tested phrases (from tested-phrases.json)
3. Validate the migrated data
4. Report statistics

### What Gets Migrated

- **negative-knowledge.json (29MB)** →
  - `negative_knowledge` table (contradictions)
  - `geometric_barriers` table
  - `false_pattern_classes` table
  - `era_exclusions` table

- **tested-phrases.json (4.3MB)** →
  - `tested_phrases` table

### After Migration

1. **Verify Data**
   ```bash
   # Check record counts in database
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM negative_knowledge"
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM tested_phrases"
   ```

2. **Test Application**
   ```bash
   # Start the application and verify it uses the database
   npm run dev
   ```
   
   Look for log messages like:
   ```
   [NegativeKnowledgeUnified] Using DATABASE backend
   [TestedPhrasesUnified] Using DATABASE backend
   ```

3. **Archive JSON Files (Optional)**
   ```bash
   # Once verified, you can archive the JSON files
   mkdir -p data/archived
   mv data/negative-knowledge.json data/archived/
   mv data/tested-phrases.json data/archived/
   ```

## Phase 3: Darknet/Tor Integration ✅ READY TO TEST

### What Was Done

The darknet infrastructure is already implemented:

1. **Python Backend** (`qig-backend/darknet_proxy.py`)
   - Real Tor SOCKS5 proxy support
   - User agent rotation (10 realistic agents)
   - Traffic obfuscation with random delays
   - Automatic fallback to clearnet if Tor unavailable
   - HTTP/HTTPS proxy support as alternative

2. **Shadow Pantheon** (`qig-backend/olympus/shadow_pantheon.py`)
   - Already integrated with darknet_proxy
   - OPSEC verification with real Tor availability checks
   - Network mode detection (dark/clear)

3. **Documentation** (`DARKNET_SETUP.md`)
   - Complete setup instructions
   - Installation guide for Tor
   - Usage examples
   - Troubleshooting guide

### Testing Darknet Connectivity

1. **Install Tor**
   
   Ubuntu/Debian:
   ```bash
   sudo apt update
   sudo apt install tor
   sudo systemctl start tor
   sudo systemctl enable tor
   ```
   
   macOS:
   ```bash
   brew install tor
   brew services start tor
   ```

2. **Verify Tor is Running**
   ```bash
   # Check if Tor is listening on port 9050
   netstat -an | grep 9050
   
   # Test SOCKS5 connectivity
   curl --socks5-hostname 127.0.0.1:9050 https://check.torproject.org/api/ip
   # Should return: {"IsTor": true, ...}
   ```

3. **Enable Darknet Mode**
   ```bash
   # Add to .env file
   echo "ENABLE_TOR=true" >> .env
   echo "TOR_PROXY=socks5h://127.0.0.1:9050" >> .env
   ```

4. **Test Python Backend**
   ```bash
   cd qig-backend
   python3 -c "
   from darknet_proxy import get_session, is_tor_available, get_status
   
   # Check Tor availability
   print(f'Tor available: {is_tor_available()}')
   print(f'Status: {get_status()}')
   
   # Test with real Tor
   if is_tor_available():
       session = get_session(use_tor=True)
       response = session.get('https://check.torproject.org/api/ip')
       data = response.json()
       print(f'Using Tor: {data[\"IsTor\"]}')
       print(f'Exit node: {data[\"IP\"]}')
   "
   ```

5. **Expected Output**
   
   With Tor running:
   ```
   [DarknetProxy] ✓ Operating in DARKNET mode via Tor
   [Nyx] ✓ REAL DARKNET ACTIVE - Tor routing enabled
   Tor available: True
   Status: {'mode': 'tor', 'tor_available': True, 'tor_proxy': 'socks5h://127.0.0.1:9050'}
   Using Tor: True
   Exit node: [Tor exit node IP]
   ```
   
   Without Tor:
   ```
   [DarknetProxy] ⚠ DARKNET mode enabled but Tor unavailable - using clearnet
   [Nyx] ⚠ Darknet enabled but Tor unavailable - will fallback to clearnet
   Tor available: False
   Status: {'mode': 'clearnet', 'tor_available': False, 'enabled': True}
   ```

### Blockchain API Calls

**Note**: The TypeScript blockchain API calls in `server/blockchain-*.ts` make direct HTTP requests. These are used by the web interface for balance checking and are not security-critical. The Python backend's Shadow Pantheon is what would use Tor for any sensitive blockchain operations.

If you want to route TypeScript blockchain API calls through Tor, you would need to:
1. Set up a local SOCKS proxy configuration
2. Configure Node.js to use the proxy (using `https-proxy-agent` or similar)
3. Update the fetch/axios calls to use the proxy

However, this is **not required** for basic functionality since:
- The Python backend already has Tor support
- TypeScript API calls are just for the UI
- Most blockchain queries are not sensitive

## Phase 4: Performance Validation

### Database Performance Testing

1. **Benchmark Queries**
   ```bash
   # Test negative knowledge lookup speed
   time npm run migrate:json-to-db
   
   # Monitor query performance in PostgreSQL
   psql $DATABASE_URL -c "SELECT * FROM pg_stat_statements WHERE query LIKE '%negative_knowledge%' ORDER BY mean_exec_time DESC LIMIT 10"
   ```

2. **Check Indexes**
   ```bash
   # Verify indexes are being used
   psql $DATABASE_URL -c "
   EXPLAIN ANALYZE 
   SELECT * FROM negative_knowledge 
   WHERE LOWER(pattern) = 'test pattern'
   "
   ```

3. **Add Functional Index (if needed)**
   ```sql
   -- For case-insensitive pattern searches
   CREATE INDEX idx_negative_knowledge_pattern_lower 
   ON negative_knowledge (LOWER(pattern));
   ```

### Memory Usage

Monitor memory usage before and after migration:
```bash
# Before (with JSON files)
ps aux | grep "node.*server/index"

# After (with database)
ps aux | grep "node.*server/index"
```

Expected: Lower memory usage with database since large JSON files are no longer loaded into memory.

### Deduplication Testing

The tested phrases system now tracks re-test waste:

```bash
# Check for wasted retests
psql $DATABASE_URL -c "
SELECT phrase, retest_count, tested_at 
FROM tested_phrases 
WHERE retest_count > 0 
ORDER BY retest_count DESC 
LIMIT 10
"
```

## Phase 5: Testing & Validation

### Run Test Suites

```bash
# TypeScript compilation check
npm run check

# Python tests
cd qig-backend
python3 -m pytest test_qig.py -v
python3 -m pytest test_4d_consciousness.py -v

# Integration tests
npm run test:integration
```

### Manual Testing

1. **Test Negative Knowledge**
   - Start a search session
   - Add a phrase that should be excluded
   - Verify it's recorded in the database
   - Restart the application
   - Verify the exclusion persists

2. **Test Tested Phrases**
   - Test a phrase
   - Try to test the same phrase again
   - Verify warning about re-testing
   - Check `retest_count` in database

3. **Test Darknet (if Tor is running)**
   - Enable Tor in .env
   - Start Python backend
   - Verify "REAL DARKNET ACTIVE" message
   - Check that blockchain queries go through Tor

## Troubleshooting

### Database Connection Issues

```bash
# Check if database is accessible
psql $DATABASE_URL -c "SELECT version()"

# Check if tables exist
psql $DATABASE_URL -c "\dt"

# Check if data was migrated
psql $DATABASE_URL -c "SELECT COUNT(*) FROM negative_knowledge"
```

### Migration Issues

If migration fails:
1. Restore from backup: `data/backups/negative-knowledge-[timestamp].json`
2. Check database logs for errors
3. Verify database has enough space
4. Try migrating in smaller batches

### Tor Issues

```bash
# Check Tor status
sudo systemctl status tor

# Restart Tor
sudo systemctl restart tor

# Check Tor logs
sudo journalctl -u tor -n 50

# Test Tor connection
curl --socks5-hostname 127.0.0.1:9050 https://check.torproject.org/api/ip
```

### Fallback to JSON

If you need to temporarily disable database usage:
1. Stop the application
2. Remove or comment out `DATABASE_URL` in .env
3. Restore JSON files from backup
4. Restart the application

The unified interfaces will automatically fall back to JSON/memory storage.

## Performance Metrics

Expected improvements after migration:

- **Startup Time**: 50-70% faster (no need to load 33MB of JSON into memory)
- **Memory Usage**: 100-200MB lower (large JSON files not in memory)
- **Query Speed**: 10-100x faster for lookups (indexed database queries vs linear JSON search)
- **Deduplication**: Now tracks and prevents wasted re-testing
- **Scalability**: Can handle millions of records efficiently

## Security Considerations

### Database
- Use strong passwords for database
- Enable SSL/TLS for database connections
- Regularly backup database
- Monitor for unusual access patterns

### Darknet/Tor
- Tor provides network anonymity, not end-to-end encryption
- Always use HTTPS with Tor
- Be aware of correlation attacks
- Monitor for Tor exit node blocking by APIs
- Have fallback to clearnet for when Tor is unavailable

## Next Steps

After completing migration and testing:

1. Monitor performance metrics
2. Set up automated database backups
3. Configure log rotation
4. Set up alerts for Tor connectivity issues
5. Document any custom configurations
6. Train users on new system

## Support

For issues or questions:
1. Check the logs for error messages
2. Verify database connection
3. Test Tor connectivity
4. Review this guide
5. Check `DARKNET_SETUP.md` for Tor-specific issues
