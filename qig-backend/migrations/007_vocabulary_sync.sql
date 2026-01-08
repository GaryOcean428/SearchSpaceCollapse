-- ============================================================================
-- VOCABULARY SYNC MIGRATION
-- Date: 2026-01-08
-- Purpose: Sync learned_words → tokenizer_vocabulary (metadata only, no embeddings)
--
-- NOTE: This function syncs TOKEN METADATA (phi, frequency, source_type) only.
-- Basin embeddings must be computed by the coordizer from geometric relationships,
-- NOT from hash functions. Hash-based embeddings are Euclidean contamination.
-- ============================================================================

-- Function to sync high-phi learned words to tokenizer_vocabulary
CREATE OR REPLACE FUNCTION sync_learned_to_tokenizer(min_phi FLOAT DEFAULT 0.5, min_frequency INT DEFAULT 2)
RETURNS TABLE(synced_count INT, new_count INT, updated_count INT) AS $$
DECLARE
    v_synced INT := 0;
    v_new INT := 0;
    v_updated INT := 0;
BEGIN
    -- Insert or update learned words into tokenizer_vocabulary
    -- NOTE: Does NOT set basin_embedding - that must come from geometric computation
    WITH upserted AS (
        INSERT INTO tokenizer_vocabulary (token, phi_score, frequency, source_type, updated_at)
        SELECT
            word,
            avg_phi,
            frequency,
            LEFT(COALESCE(source, 'learned'), 32),  -- Truncate to VARCHAR(32)
            NOW()
        FROM learned_words
        WHERE avg_phi >= min_phi
          AND frequency >= min_frequency
          AND LENGTH(word) >= 2
          AND word ~ '^[a-zA-Z]+$'  -- Only alphabetic words
        ON CONFLICT (token) DO UPDATE SET
            phi_score = GREATEST(tokenizer_vocabulary.phi_score, EXCLUDED.phi_score),
            frequency = tokenizer_vocabulary.frequency + EXCLUDED.frequency,
            updated_at = NOW()
        WHERE tokenizer_vocabulary.phi_score < EXCLUDED.phi_score
           OR tokenizer_vocabulary.frequency < EXCLUDED.frequency
        RETURNING
            CASE WHEN xmax = 0 THEN 'insert' ELSE 'update' END AS op
    )
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE op = 'insert'),
        COUNT(*) FILTER (WHERE op = 'update')
    INTO v_synced, v_new, v_updated
    FROM upserted;

    RETURN QUERY SELECT v_synced, v_new, v_updated;
END;
$$ LANGUAGE plpgsql;

-- Usage: SELECT * FROM sync_learned_to_tokenizer(0.5, 2);
-- This syncs words with phi >= 0.5 and frequency >= 2
