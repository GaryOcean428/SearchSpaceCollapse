-- ============================================================================
-- VOCABULARY SYNC MIGRATION
-- Date: 2026-01-08
-- Purpose: Sync learned_words → tokenizer_vocabulary automatically
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

-- Function to generate basin embedding for a word (deterministic hash-based)
CREATE OR REPLACE FUNCTION generate_basin_embedding(word TEXT)
RETURNS vector(64) AS $$
DECLARE
    hash_bytes BYTEA;
    coords FLOAT8[];
    i INT;
    norm FLOAT8;
BEGIN
    -- Use MD5 hash extended to 64 dimensions
    hash_bytes := decode(md5(word), 'hex');
    coords := ARRAY[]::FLOAT8[];

    -- Generate 64 coordinates from hash
    FOR i IN 0..63 LOOP
        -- Use word hash + position hash for each dimension
        hash_bytes := decode(md5(word || i::TEXT), 'hex');
        coords := array_append(coords,
            (get_byte(hash_bytes, i % 16)::FLOAT8 - 128.0) / 128.0
        );
    END LOOP;

    -- Normalize to unit sphere
    SELECT sqrt(sum(c * c)) INTO norm FROM unnest(coords) AS c;
    IF norm > 0 THEN
        coords := ARRAY(SELECT c / norm FROM unnest(coords) AS c);
    END IF;

    RETURN coords::vector(64);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update sync function to also generate embeddings
CREATE OR REPLACE FUNCTION sync_learned_to_tokenizer_with_embeddings(min_phi FLOAT DEFAULT 0.5, min_frequency INT DEFAULT 2)
RETURNS TABLE(synced_count INT, new_count INT, updated_count INT) AS $$
DECLARE
    v_synced INT := 0;
    v_new INT := 0;
    v_updated INT := 0;
BEGIN
    -- Insert or update learned words with generated embeddings
    WITH upserted AS (
        INSERT INTO tokenizer_vocabulary (token, phi_score, frequency, source_type, basin_embedding, updated_at)
        SELECT
            word,
            avg_phi,
            frequency,
            LEFT(COALESCE(source, 'learned'), 32),  -- Truncate to VARCHAR(32)
            generate_basin_embedding(word),
            NOW()
        FROM learned_words
        WHERE avg_phi >= min_phi
          AND frequency >= min_frequency
          AND LENGTH(word) >= 2
          AND word ~ '^[a-zA-Z]+$'
        ON CONFLICT (token) DO UPDATE SET
            phi_score = GREATEST(tokenizer_vocabulary.phi_score, EXCLUDED.phi_score),
            frequency = tokenizer_vocabulary.frequency + EXCLUDED.frequency,
            basin_embedding = COALESCE(tokenizer_vocabulary.basin_embedding, EXCLUDED.basin_embedding),
            updated_at = NOW()
        WHERE tokenizer_vocabulary.phi_score < EXCLUDED.phi_score
           OR tokenizer_vocabulary.frequency < EXCLUDED.frequency
           OR tokenizer_vocabulary.basin_embedding IS NULL
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

-- Trigger to auto-sync when learned_words is updated (optional, can be expensive)
-- Uncomment if you want automatic sync on every insert:
-- CREATE OR REPLACE FUNCTION trigger_sync_learned_word()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     IF NEW.avg_phi >= 0.5 AND NEW.frequency >= 2 THEN
--         INSERT INTO tokenizer_vocabulary (token, phi_score, frequency, source_type, basin_embedding, updated_at)
--         VALUES (NEW.word, NEW.avg_phi, NEW.frequency, COALESCE(NEW.source, 'learned'), generate_basin_embedding(NEW.word), NOW())
--         ON CONFLICT (token) DO UPDATE SET
--             phi_score = GREATEST(tokenizer_vocabulary.phi_score, EXCLUDED.phi_score),
--             frequency = tokenizer_vocabulary.frequency + 1,
--             updated_at = NOW();
--     END IF;
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
--
-- CREATE TRIGGER sync_learned_word_trigger
-- AFTER INSERT OR UPDATE ON learned_words
-- FOR EACH ROW
-- EXECUTE FUNCTION trigger_sync_learned_word();

-- Run initial sync
SELECT * FROM sync_learned_to_tokenizer_with_embeddings(0.5, 2);
