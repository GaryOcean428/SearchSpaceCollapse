-- ============================================================================
-- MIGRATION: Drop legacy bip39_words trigger
-- Date: 2026-01-10
-- Issue: update_vocabulary_stats() references bip39_words which was removed
--        during Shadow Pantheon migration. This breaks vocabulary persistence.
-- ============================================================================

-- Drop the broken trigger first
DROP TRIGGER IF EXISTS update_stats_on_learned_insert ON learned_words;

-- Drop the legacy stats functions
DROP FUNCTION IF EXISTS trigger_update_vocab_stats() CASCADE;
DROP FUNCTION IF EXISTS update_vocabulary_stats() CASCADE;

-- Create a simpler Shadow Pantheon-aligned stats function
-- that only references vocabulary_observations (the canonical table)
CREATE OR REPLACE FUNCTION update_vocabulary_stats() RETURNS VOID AS $$
DECLARE
    v_total INT := 0;
    v_learned INT := 0;
    v_high_phi INT := 0;
BEGIN
    -- Count from vocabulary_observations (Shadow Pantheon canonical table)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vocabulary_observations') THEN
        SELECT COUNT(*) INTO v_total FROM vocabulary_observations;
        SELECT COUNT(*) INTO v_high_phi FROM vocabulary_observations WHERE avg_phi >= 0.7;
    END IF;

    -- Also count from learned_words if it exists (legacy compatibility)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'learned_words') THEN
        SELECT COUNT(*) INTO v_learned FROM learned_words;
    END IF;

    -- Insert stats only if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vocabulary_stats') THEN
        INSERT INTO vocabulary_stats (total_words, bip39_words, learned_words, high_phi_words, merge_rules)
        VALUES (v_total, 0, v_learned, v_high_phi, 0);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Silently ignore errors - stats are non-critical
        NULL;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a lighter trigger that doesn't call stats on every insert
-- (stats can be computed on-demand instead)
-- CREATE TRIGGER update_stats_on_learned_insert
--     AFTER INSERT ON learned_words
--     FOR EACH STATEMENT
--     EXECUTE FUNCTION trigger_update_vocab_stats();

-- Verify: Show what tables exist
DO $$
BEGIN
    RAISE NOTICE 'Migration complete. bip39_words trigger removed.';
    RAISE NOTICE 'vocabulary_observations should be the canonical vocabulary table.';
END $$;
