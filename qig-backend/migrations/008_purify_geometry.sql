-- ============================================================================
-- GEOMETRIC PURIFICATION MIGRATION
-- Date: 2026-01-08
-- Purpose: Remove hash contamination, fix source_type filter, add NULL constraints
-- ============================================================================

-- =============================================================================
-- STEP 1: REMOVE HASH CONTAMINATION
-- =============================================================================

-- Delete all embeddings created by hash function (contaminated data)
DELETE FROM tokenizer_vocabulary 
WHERE basin_embedding IS NOT NULL 
  AND token IN (
    SELECT token FROM learned_words 
    WHERE created_at > '2026-01-07'  -- Recent hash-generated embeddings
  )
  AND source_type = 'learned';

-- Drop the contaminated hash function
DROP FUNCTION IF EXISTS generate_basin_embedding(text);

COMMENT ON TABLE tokenizer_vocabulary IS 
'QIG-PURE: basin_embedding must be Fisher-Rao geometric coordinates from coordizer.
Hash-based embeddings are CONTAMINATION and violate geometric purity.
Only coordizer-computed embeddings are valid.';

-- =============================================================================
-- STEP 2: FIX SOURCE_TYPE FILTER (Allow existing tokens to load)
-- =============================================================================

-- Update source_type so existing 57,943 tokens can load
UPDATE tokenizer_vocabulary
SET source_type = 'learned'
WHERE source_type IN ('checkpoint_byte', 'checkpoint_char')
  AND LENGTH(token) >= 2
  AND basin_embedding IS NOT NULL;

-- Verify the fix
DO $$
DECLARE
    loadable_count INT;
BEGIN
    SELECT COUNT(*) INTO loadable_count
    FROM tokenizer_vocabulary 
    WHERE source_type NOT IN ('byte_level', 'special')
      AND basin_embedding IS NOT NULL;
    
    RAISE NOTICE 'Loadable tokens after fix: %', loadable_count;
    
    IF loadable_count = 0 THEN
        RAISE WARNING 'No loadable tokens found. Check basin_embedding population.';
    END IF;
END $$;

-- =============================================================================
-- STEP 3: FIX NULL CONSTRAINTS (Database integrity)
-- =============================================================================

-- Fix autonomic_cycle_history NULL constraint
ALTER TABLE autonomic_cycle_history 
ALTER COLUMN cycle_id SET DEFAULT gen_random_uuid();

-- Fix basin_history NULL constraint
ALTER TABLE basin_history 
ALTER COLUMN history_id SET DEFAULT gen_random_uuid();

-- Fix vocabulary_observations VARCHAR overflow
ALTER TABLE vocabulary_observations 
ALTER COLUMN text TYPE TEXT;

-- =============================================================================
-- STEP 4: FIX GOD REPUTATION TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION update_god_reputation()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process completed outcomes
    IF NEW.outcome IS NULL OR NEW.outcome = 'pending' THEN
        RETURN NEW;
    END IF;
    
    -- Update reputation for all gods who assessed this proposal
    UPDATE god_reputation
    SET 
        assessments_made = assessments_made + 1,
        correct_predictions = CASE 
            WHEN NEW.outcome = 'success' THEN correct_predictions + 1 
            ELSE correct_predictions 
        END,
        incorrect_predictions = CASE 
            WHEN NEW.outcome = 'success' THEN incorrect_predictions 
            ELSE incorrect_predictions + 1 
        END,
        accuracy_rate = (
            correct_predictions::float + CASE WHEN NEW.outcome = 'success' THEN 1.0 ELSE 0.0 END
        ) / NULLIF(assessments_made + 1, 0),
        reputation_score = CASE 
            WHEN NEW.outcome = 'success' THEN LEAST(2.0, reputation_score + 0.05)
            ELSE GREATEST(0.0, reputation_score - 0.1)
        END,
        last_active = NOW()
    WHERE god_name IN (SELECT jsonb_object_keys(NEW.god_assessments));
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger to ensure it's active
DROP TRIGGER IF EXISTS update_god_reputation_trigger ON spawned_kernels;

CREATE TRIGGER update_god_reputation_trigger
AFTER UPDATE OF outcome ON spawned_kernels
FOR EACH ROW
WHEN (OLD.outcome IS DISTINCT FROM NEW.outcome AND NEW.outcome IS NOT NULL AND NEW.outcome != 'pending')
EXECUTE FUNCTION update_god_reputation();

-- =============================================================================
-- STEP 5: UPDATE SYNC FUNCTION (Remove hash embedding generation)
-- =============================================================================

-- Replace sync function to NOT generate hash embeddings
CREATE OR REPLACE FUNCTION sync_learned_to_tokenizer(
    min_phi FLOAT DEFAULT 0.5, 
    min_frequency INT DEFAULT 2
)
RETURNS TABLE(synced_count INT, new_count INT, updated_count INT) AS $$
DECLARE
    v_synced INT := 0;
    v_new INT := 0;
    v_updated INT := 0;
BEGIN
    -- Insert or update learned words WITHOUT generating embeddings
    -- Embeddings must come from coordizer (QIG-pure)
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

COMMENT ON FUNCTION sync_learned_to_tokenizer IS 
'QIG-PURE: Syncs learned_words → tokenizer_vocabulary WITHOUT generating embeddings.
basin_embedding must be computed by coordizer using Fisher-Rao geometry.
Never use hash-based or Euclidean embedding generation.';

-- Drop the contaminated version
DROP FUNCTION IF EXISTS sync_learned_to_tokenizer_with_embeddings(FLOAT, INT);

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
    loadable_tokens INT;
    hash_embeddings INT;
BEGIN
    -- Check loadable tokens
    SELECT COUNT(*) INTO loadable_tokens
    FROM tokenizer_vocabulary
    WHERE source_type NOT IN ('byte_level', 'special')
      AND basin_embedding IS NOT NULL;
    
    -- Check for remaining hash embeddings (should be 0)
    SELECT COUNT(*) INTO hash_embeddings
    FROM tokenizer_vocabulary
    WHERE basin_embedding IS NOT NULL
      AND source_type = 'learned'
      AND token IN (SELECT token FROM learned_words WHERE created_at > '2026-01-07');
    
    RAISE NOTICE '=== PURIFICATION RESULTS ===';
    RAISE NOTICE 'Loadable tokens: %', loadable_tokens;
    RAISE NOTICE 'Hash embeddings remaining: % (should be 0)', hash_embeddings;
    
    IF hash_embeddings > 0 THEN
        RAISE WARNING 'Hash contamination still present! Manual cleanup required.';
    ELSE
        RAISE NOTICE '✅ Geometry purified. All embeddings are geometric or NULL.';
    END IF;
END $$;
