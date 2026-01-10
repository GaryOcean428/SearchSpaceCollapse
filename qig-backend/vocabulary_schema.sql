-- ============================================================================
-- VOCABULARY SYSTEM SCHEMA
-- Full implementation for shared vocabulary across all gods/agents
--
-- SHADOW PANTHEON MIGRATION (2026-01-10):
-- - bip39_words table DEPRECATED - vocabulary_observations is canonical
-- - Trigger on learned_words REMOVED to prevent bip39 dependency
-- ============================================================================

-- DEPRECATED: BIP39 Base Vocabulary (2048 words)
-- This table is no longer used. Vocabulary comes from vocabulary_observations.
-- Keeping schema for backward compatibility but not creating by default.
-- If you need this table, run the CREATE statement manually.
--
-- CREATE TABLE IF NOT EXISTS bip39_words (
--     id SERIAL PRIMARY KEY,
--     word TEXT UNIQUE NOT NULL,
--     word_index INT NOT NULL,  -- Position in BIP39 list (0-2047)
--     frequency INT DEFAULT 0,
--     avg_phi REAL DEFAULT 0.0,
--     max_phi REAL DEFAULT 0.0,
--     last_used TIMESTAMP DEFAULT NOW(),
--     created_at TIMESTAMP DEFAULT NOW()
-- );
-- CREATE INDEX IF NOT EXISTS idx_bip39_word ON bip39_words(word);
-- CREATE INDEX IF NOT EXISTS idx_bip39_phi ON bip39_words(avg_phi DESC);

-- Learned Vocabulary (grows on the fly)
CREATE TABLE IF NOT EXISTS learned_words (
    id SERIAL PRIMARY KEY,
    word TEXT UNIQUE NOT NULL,
    frequency INT DEFAULT 1,
    avg_phi REAL DEFAULT 0.0,
    max_phi REAL DEFAULT 0.0,
    source TEXT NOT NULL,  -- 'conversation', 'discovery', 'god_assessment'
    learned_from TEXT,  -- Optional: which god/agent learned it
    contexts TEXT[],  -- Sample phrases containing this word
    first_seen TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW(),
    is_integrated BOOLEAN DEFAULT FALSE  -- Whether word is integrated into tokenizer
);

-- Add is_integrated column if it doesn't exist (migration for existing tables)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'learned_words' AND column_name = 'is_integrated') THEN
        ALTER TABLE learned_words ADD COLUMN is_integrated BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_learned_word ON learned_words(word);
CREATE INDEX IF NOT EXISTS idx_learned_phi ON learned_words(avg_phi DESC);
CREATE INDEX IF NOT EXISTS idx_learned_source ON learned_words(source);
CREATE INDEX IF NOT EXISTS idx_learned_integrated ON learned_words(is_integrated);

-- Vocabulary Observations (raw observations before aggregation)
-- NOTE: This is the canonical schema. Column names align with Python code and SQL functions.
CREATE TABLE IF NOT EXISTS vocabulary_observations (
    id TEXT PRIMARY KEY DEFAULT ('vo_' || gen_random_uuid()::TEXT),
    text TEXT UNIQUE NOT NULL,  -- The word/token itself
    type TEXT DEFAULT 'word',  -- 'word', 'phrase', 'sequence', 'pattern'
    phrase_category TEXT DEFAULT 'unknown',  -- Category for phrases
    is_real_word BOOLEAN DEFAULT NULL,  -- NULL = needs validation, TRUE/FALSE = validated
    frequency INT DEFAULT 1,
    avg_phi REAL DEFAULT 0.5,
    max_phi REAL DEFAULT 0.5,
    efficiency_gain REAL DEFAULT 0.0,  -- Learning efficiency metric
    contexts TEXT[],  -- Sample phrases containing this word
    first_seen TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW(),
    is_integrated BOOLEAN DEFAULT FALSE,  -- Whether integrated into tokenizer
    integrated_at TIMESTAMP,
    basin_coords vector(64),  -- 64D basin coordinates (requires pgvector)
    source_type TEXT DEFAULT 'unknown',  -- 'kernel', 'zeus', 'athena', 'conversation', etc.
    cycle_number INT  -- Training cycle when observed
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_vocab_obs_text ON vocabulary_observations(text);
CREATE INDEX IF NOT EXISTS idx_vocab_obs_avg_phi ON vocabulary_observations(avg_phi DESC);
CREATE INDEX IF NOT EXISTS idx_vocab_obs_max_phi ON vocabulary_observations(max_phi DESC);
CREATE INDEX IF NOT EXISTS idx_vocab_obs_source ON vocabulary_observations(source_type);
CREATE INDEX IF NOT EXISTS idx_vocab_obs_last_seen ON vocabulary_observations(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_vocab_obs_is_real ON vocabulary_observations(is_real_word) WHERE is_real_word = TRUE;
CREATE INDEX IF NOT EXISTS idx_vocab_obs_integrated ON vocabulary_observations(is_integrated) WHERE is_integrated = TRUE;

-- BPE Merge Rules (learned patterns)
CREATE TABLE IF NOT EXISTS bpe_merge_rules (
    id SERIAL PRIMARY KEY,
    token_a TEXT NOT NULL,
    token_b TEXT NOT NULL,
    merged_token TEXT NOT NULL,
    phi_score REAL NOT NULL,
    frequency INT DEFAULT 1,
    learned_from TEXT,  -- Which god/agent learned this merge
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(token_a, token_b)
);

CREATE INDEX IF NOT EXISTS idx_merge_phi ON bpe_merge_rules(phi_score DESC);
CREATE INDEX IF NOT EXISTS idx_merge_tokens ON bpe_merge_rules(token_a, token_b);

-- God Vocabulary Profiles (each god's specialized vocabulary)
CREATE TABLE IF NOT EXISTS god_vocabulary_profiles (
    id SERIAL PRIMARY KEY,
    god_name TEXT NOT NULL,
    word TEXT NOT NULL,
    relevance_score REAL NOT NULL,  -- How relevant to this god's domain
    usage_count INT DEFAULT 0,
    last_used TIMESTAMP DEFAULT NOW(),
    UNIQUE(god_name, word)
);

CREATE INDEX IF NOT EXISTS idx_god_vocab_name ON god_vocabulary_profiles(god_name);
CREATE INDEX IF NOT EXISTS idx_god_vocab_relevance ON god_vocabulary_profiles(relevance_score DESC);

-- Vocabulary Stats (aggregate metrics)
CREATE TABLE IF NOT EXISTS vocabulary_stats (
    id SERIAL PRIMARY KEY,
    total_words INT NOT NULL,
    bip39_words INT NOT NULL,
    learned_words INT NOT NULL,
    high_phi_words INT NOT NULL,  -- Words with avg_phi >= 0.7
    merge_rules INT NOT NULL,
    last_updated TIMESTAMP DEFAULT NOW()
);

-- Insert initial BIP39 vocabulary
-- (To be populated by Python script)

-- Functions for vocabulary management

-- Function to record vocabulary observation
CREATE OR REPLACE FUNCTION record_vocab_observation(
    p_text TEXT,
    p_type TEXT DEFAULT 'word',
    p_phi REAL DEFAULT 0.0,
    p_source_type TEXT DEFAULT 'kernel',
    p_basin_coords vector DEFAULT NULL,
    p_contexts TEXT[] DEFAULT NULL,
    p_cycle_number INT DEFAULT NULL,
    p_is_real_word BOOLEAN DEFAULT NULL,
    p_phrase_category TEXT DEFAULT 'unknown'
) RETURNS VOID AS $$
DECLARE
    v_phi_safe REAL;
BEGIN
    -- Ensure phi is never 0 (causes max_phi to stay 0 forever)
    v_phi_safe := GREATEST(p_phi, 0.5);

    INSERT INTO vocabulary_observations (
        text, type, avg_phi, max_phi, source_type,
        basin_coords, contexts, cycle_number,
        is_real_word, phrase_category, frequency,
        first_seen, last_seen, is_integrated, integrated_at
    )
    VALUES (
        p_text, p_type, v_phi_safe, v_phi_safe, p_source_type,
        p_basin_coords, p_contexts, p_cycle_number,
        p_is_real_word, p_phrase_category, 1,
        NOW(), NOW(), (p_cycle_number IS NOT NULL),
        CASE WHEN p_cycle_number IS NOT NULL THEN NOW() ELSE NULL END
    )
    ON CONFLICT (text) DO UPDATE SET
        frequency = vocabulary_observations.frequency + 1,
        avg_phi = (vocabulary_observations.avg_phi * vocabulary_observations.frequency + v_phi_safe) / (vocabulary_observations.frequency + 1),
        max_phi = GREATEST(vocabulary_observations.max_phi, v_phi_safe),
        last_seen = NOW(),
        basin_coords = COALESCE(EXCLUDED.basin_coords, vocabulary_observations.basin_coords),
        contexts = COALESCE(EXCLUDED.contexts, vocabulary_observations.contexts),
        cycle_number = COALESCE(EXCLUDED.cycle_number, vocabulary_observations.cycle_number),
        is_real_word = COALESCE(EXCLUDED.is_real_word, vocabulary_observations.is_real_word),
        phrase_category = COALESCE(EXCLUDED.phrase_category, vocabulary_observations.phrase_category);

    -- Update learned_words table (if it exists - legacy table)
    INSERT INTO learned_words (word, frequency, avg_phi, max_phi, source, last_seen)
    VALUES (p_text, 1, v_phi_safe, v_phi_safe, p_source_type, NOW())
    ON CONFLICT (word) DO UPDATE SET
        frequency = learned_words.frequency + 1,
        avg_phi = (learned_words.avg_phi * learned_words.frequency + v_phi_safe) / (learned_words.frequency + 1),
        max_phi = GREATEST(learned_words.max_phi, v_phi_safe),
        last_seen = NOW();
EXCEPTION
    WHEN undefined_table THEN
        -- learned_words table doesn't exist, skip it
        NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to get high-Φ vocabulary
CREATE OR REPLACE FUNCTION get_high_phi_vocabulary(
    p_min_phi REAL DEFAULT 0.7,
    p_limit INT DEFAULT 100
) RETURNS TABLE (
    word TEXT,
    avg_phi REAL,
    frequency INT,
    source TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT l.word, l.avg_phi, l.frequency, l.source
    FROM learned_words l
    WHERE l.avg_phi >= p_min_phi
    ORDER BY l.avg_phi DESC, l.frequency DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to update vocabulary stats
-- Handles missing tables gracefully (bip39_words may not exist yet)
CREATE OR REPLACE FUNCTION update_vocabulary_stats() RETURNS VOID AS $$
DECLARE
    v_total INT;
    v_bip39 INT := 0;
    v_learned INT := 0;
    v_high_phi INT := 0;
    v_merges INT := 0;
BEGIN
    -- Check if bip39_words exists before querying
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bip39_words') THEN
        SELECT COUNT(*) INTO v_bip39 FROM bip39_words;
    END IF;

    -- Check if learned_words exists before querying
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'learned_words') THEN
        SELECT COUNT(*) INTO v_learned FROM learned_words;
        SELECT COUNT(*) INTO v_high_phi FROM learned_words WHERE avg_phi >= 0.7;
    END IF;

    -- Check if bpe_merge_rules exists before querying
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bpe_merge_rules') THEN
        SELECT COUNT(*) INTO v_merges FROM bpe_merge_rules;
    END IF;

    v_total := v_bip39 + v_learned;

    INSERT INTO vocabulary_stats (total_words, bip39_words, learned_words, high_phi_words, merge_rules)
    VALUES (v_total, v_bip39, v_learned, v_high_phi, v_merges);
EXCEPTION
    WHEN undefined_table THEN
        -- Stats table doesn't exist yet, skip
        NULL;
END;
$$ LANGUAGE plpgsql;

-- DEPRECATED: Trigger to auto-update stats
-- REMOVED: This trigger called update_vocabulary_stats() which referenced bip39_words.
-- Stats should be computed on-demand via API calls, not on every insert.
--
-- CREATE OR REPLACE FUNCTION trigger_update_vocab_stats()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     PERFORM update_vocabulary_stats();
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- Drop legacy trigger if exists (migration cleanup)
DROP TRIGGER IF EXISTS update_stats_on_learned_insert ON learned_words;
DROP FUNCTION IF EXISTS trigger_update_vocab_stats() CASCADE;

-- NOTE: If you need vocabulary stats, call update_vocabulary_stats() manually
-- or via the /api/debug/vocabulary-stats endpoint.
