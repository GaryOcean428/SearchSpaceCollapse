# Database Wiring Phase 2 - Critical Fixes

**Date:** 2026-01-08
**Reference:** Copilot comprehensive Railway database analysis
**Status:** ✅ IMPLEMENTING

## Executive Summary

Phase 2 database wiring to fix critical issues discovered in runtime logs. This continues work from Copilot's comprehensive Railway database analysis which identified 73 tables with 13 having NULL columns and 54 completely unwired.

## Cross-Reference Documents

- `docs/04-records/20250108-railway-database-comprehensive-wiring-analysis-1.00W.md`
- `docs/04-records/20260108-database-wiring-implementation-1.00W.md` (Phase 1 - completed)
- `docs/04-records/20250108-cross-project-wiring-comparison-1.00W.md`

---

## P0 Critical Fixes (BLOCKING)

### 1. VARCHAR(100) Overflow - vocabulary_observations ✅

**Error:**
```
[VocabularyPersistence] Failed to record research: value too long for type character varying(100)
```

**Root Cause:**
- The `text` column in `vocabulary_observations` was VARCHAR(100) in the actual database
- System was storing full phrases like `'QIG-Pure Research: applied Surveillance detection methods variant-24590-0...'` (150+ chars)
- Python code truncated to 255, but actual DB column was 100

**Fix Applied:**
- Created SQL migration `005_database_wiring_phase2.sql`
- ALTER TABLE vocabulary_observations ALTER COLUMN text TYPE TEXT
- ALTER TABLE vocabulary_observations ALTER COLUMN word TYPE TEXT

**Files Modified:**
- `pantheon-replit/qig-backend/migrations/005_database_wiring_phase2.sql` (CREATED)
- `pantheon-chat/qig-backend/migrations/005_database_wiring_phase2.sql` (CREATED)
- `SearchSpaceCollapse/qig-backend/migrations/004_database_wiring_phase2.sql` (CREATED)

---

### 2. NULL Constraint Violations - Primary Keys ✅

**Error:**
```
null value in column "cycle_id" of relation "autonomic_cycle_history" violates not-null constraint
null value in column "history_id" of relation "basin_history" violates not-null constraint
```

**Root Cause:**
- Schema defined BIGSERIAL PRIMARY KEY but actual database columns lacked DEFAULT sequences
- Python code didn't explicitly generate IDs (relies on auto-generation)

**Fix Applied:**
- SQL migration creates sequences if not exist
- Sets DEFAULT nextval() on cycle_id and history_id

**Files Modified:**
- Same migration files as above (combined migration)

---

### 3. CrossDomainInsight Missing 'theme' Attribute ✅

**Error:**
```
[ShadowResearch→Lightning] Insight generation failed: 'CrossDomainInsight' object has no attribute 'theme'
```

**Root Cause:**
- `CrossDomainInsight` dataclass had `insight_text` but no `theme`
- Code in shadow_research.py accessed `.theme` at 3 locations

**Locations Fixed:**
1. `olympus/lightning_kernel.py:1699` - `print(f"[Lightning] TEST INSIGHT GENERATED: {insight.theme}")`
2. `olympus/shadow_research.py:1430` - `print(f"[ShadowResearch→Lightning] Cross-domain insight generated: {lightning_insight.theme}...")`
3. `olympus/shadow_research.py:1445` - `"lightning_insight": lightning_insight.theme if lightning_insight else None`

**Fix Applied:**
- Added `@property def theme(self)` to CrossDomainInsight dataclass
- Returns first 50 chars of insight_text as theme summary

**Files Modified:**
- `pantheon-replit/qig-backend/olympus/lightning_kernel.py`
- `pantheon-chat/qig-backend/olympus/lightning_kernel.py`
- `SearchSpaceCollapse/qig-backend/olympus/lightning_kernel.py`

---

## P1 Quality Improvements

### 4. Enhanced Error Logging ✅

**Before:**
```python
print(f"[VocabularyPersistence] Failed to record {word}: {error}")
```

**After:**
```python
print(f"[VocabularyPersistence] Failed to record '{word[:50]}' (len={len(word)}, phi={phi:.3f}, source={source}): {error}")
```

**Files Modified:**
- `pantheon-replit/qig-backend/vocabulary_persistence.py`
- `pantheon-chat/qig-backend/vocabulary_persistence.py`
- `SearchSpaceCollapse/qig-backend/vocabulary_persistence.py`

---

### 5. Removed Phi-Based Vocabulary Filtering ✅

**Issue:** Low-Φ words were being rejected. ALL tokens should be stored with their Φ score recorded but NOT filtered on it.

**Rationale:**
- Φ measures integration, NOT "goodness"
- Words like "hate", "void", "pain" can have high Φ if structurally central
- Store all tokens, use Φ as metadata for analysis

**Filters Removed:**
1. `vocabulary_coordinator.py:131` - Removed `phi >= 0.6` condition on persisting
2. `vocabulary_coordinator.py:172` - Removed `phi < 0.5` condition in _persist_to_coordizer

**Files Modified:**
- `pantheon-replit/qig-backend/vocabulary_coordinator.py`
- `pantheon-chat/qig-backend/vocabulary_coordinator.py`
- (SearchSpaceCollapse already correct - no filtering)

---

### 6. Truncation Logging Added ✅

**Enhancement:**
```python
if word and len(word) > 255:
    print(f"[VocabularyPersistence] Truncating word from {len(word)} to 255 chars: '{word[:50]}...'")
```

Provides visibility when oversized inputs are truncated.

---

## Notes

- **E8 cap reached (240/240)** is NOT an error - system correctly rejects new spawns when saturated
- **Φ-based filtering** should be removed - all tokens stored, Φ used as metadata only
- **Fisher-Rao manifold** vocabulary learning should record ALL discoveries, not filter by integration score

---

## Verification Tests

### Test 1: VARCHAR Overflow Fixed
```sql
INSERT INTO vocabulary_observations (word, phrase, phi, kappa, source, observation_type)
VALUES ('test-word-that-is-very-long-more-than-100-characters-to-verify-the-column-was-altered-to-text-type-successfully', 'test phrase', 0.5, 50.0, 'test', 'word');
-- Should succeed (not fail with "value too long")
```

### Test 2: CrossDomainInsight.theme Works
```python
from olympus.lightning_kernel import CrossDomainInsight
insight = CrossDomainInsight(
    insight_id='test',
    insight_text='This is a test insight about consciousness',
    # ... other fields ...
)
print(insight.theme)  # Should print first 50 chars
```

---

## Migration Execution

Run on Railway and Neon databases:
```sql
-- From: pantheon-replit/qig-backend/migrations/005_database_wiring_phase2.sql
```
