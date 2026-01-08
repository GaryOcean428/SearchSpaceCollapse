-- ============================================================================
-- DATABASE WIRING PHASE 2 MIGRATION
-- Date: 2026-01-08
-- Fixes: VARCHAR overflow, NULL constraints, primary key defaults
-- Reference: docs/04-records/20260108-database-wiring-phase2-1.00W.md
-- ============================================================================

-- 1. Fix vocabulary_observations text length (VARCHAR(100) -> TEXT)
-- Prevents: "value too long for type character varying(100)"
ALTER TABLE vocabulary_observations
ALTER COLUMN text TYPE TEXT;

-- 2. Fix vocabulary_observations word column if exists
ALTER TABLE vocabulary_observations
ALTER COLUMN word TYPE TEXT;

-- 3. Ensure autonomic_cycle_history cycle_id auto-generates
-- Prevents: "null value in column cycle_id violates not-null constraint"
DO $$
BEGIN
    -- Check if sequence exists, create if not
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'autonomic_cycle_history_cycle_id_seq') THEN
        CREATE SEQUENCE autonomic_cycle_history_cycle_id_seq;
    END IF;

    -- Set default
    ALTER TABLE autonomic_cycle_history
    ALTER COLUMN cycle_id SET DEFAULT nextval('autonomic_cycle_history_cycle_id_seq');
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'autonomic_cycle_history table does not exist, skipping';
    WHEN undefined_column THEN
        RAISE NOTICE 'cycle_id column does not exist, skipping';
END $$;

-- 4. Ensure basin_history history_id auto-generates
-- Prevents: "null value in column history_id violates not-null constraint"
DO $$
BEGIN
    -- Check if sequence exists, create if not
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'basin_history_history_id_seq') THEN
        CREATE SEQUENCE basin_history_history_id_seq;
    END IF;

    -- Set default
    ALTER TABLE basin_history
    ALTER COLUMN history_id SET DEFAULT nextval('basin_history_history_id_seq');
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'basin_history table does not exist, skipping';
    WHEN undefined_column THEN
        RAISE NOTICE 'history_id column does not exist, skipping';
END $$;

-- 5. Verify changes
SELECT
    table_name,
    column_name,
    data_type,
    character_maximum_length,
    column_default
FROM information_schema.columns
WHERE table_name IN ('vocabulary_observations', 'autonomic_cycle_history', 'basin_history')
  AND column_name IN ('text', 'word', 'cycle_id', 'history_id')
ORDER BY table_name, column_name;
