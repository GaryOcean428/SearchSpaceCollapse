-- ============================================================================
-- DATABASE WIRING PHASE 3 MIGRATION
-- Date: 2026-01-08
-- Fixes: All remaining VARCHAR columns → TEXT
-- Reference: docs/04-records/20250108-railway-database-comprehensive-wiring-analysis-1.00W.md
-- ============================================================================

-- 1. Fix vocabulary_observations.type (VARCHAR(255) → TEXT)
ALTER TABLE vocabulary_observations ALTER COLUMN type TYPE TEXT;

-- 2. Fix vocabulary_observations.source_type if still VARCHAR
ALTER TABLE vocabulary_observations ALTER COLUMN source_type TYPE TEXT;

-- 3. Fix learned_words columns
ALTER TABLE learned_words ALTER COLUMN word TYPE TEXT;
ALTER TABLE learned_words ALTER COLUMN source TYPE TEXT;

-- 4. Verify all TEXT columns in vocabulary system
SELECT
    table_name,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name IN ('vocabulary_observations', 'learned_words')
  AND data_type LIKE '%char%'
ORDER BY table_name, column_name;
