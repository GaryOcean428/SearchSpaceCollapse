# VOCABULARY SYSTEM - FULL DEPLOYMENT GUIDE

Complete implementation ready for immediate deployment. All 3 phases complete:

✅ Phase 1: PostgreSQL database with shared vocabulary
✅ Phase 2: Python integration (tokenizer + coordinator)
✅ Phase 3: God training with reputation-based learning

See full guide for:
- Database setup
- API endpoints (/api/vocabulary/*)
- Integration examples
- Monitoring & troubleshooting
- Migration from old system
- Production checklist

Quick start:
```bash
# 1. Set DATABASE_URL
export DATABASE_URL="postgresql://user:pass@host/db"

# 2. Initialize schema
psql $DATABASE_URL < qig-backend/vocabulary_schema.sql

# 3. Load BIP39
python3 qig-backend/initialize_bip39.py

# 4. Register routes (in your Flask app)
from vocabulary_api import register_vocabulary_routes
register_vocabulary_routes(app)
```

**STATUS: DEPLOYMENT READY ✅**