-- Migration: Add Vocabulary Integration Tables
-- Project: SearchSpaceCollapse (Bitcoin Recovery)
-- Date: 2026-01-11
-- Status: READY FOR REVIEW

-- ============================================================================
-- PART 1: Enhance learned_words table for integration tracking
-- ============================================================================

-- Add vocabulary integration tracking columns
-- NOTE: is_integrated already exists, just add the new ones
ALTER TABLE learned_words
ADD COLUMN IF NOT EXISTS integrated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS basin_coords vector(64),
ADD COLUMN IF NOT EXISTS last_used_in_generation TIMESTAMP;

-- Add critical index for pending integration queries (used every 5 min)
CREATE INDEX IF NOT EXISTS idx_learned_words_pending_integration
ON learned_words(avg_phi DESC, frequency DESC)
WHERE is_integrated = FALSE;

-- Add index for integrated words tracking
CREATE INDEX IF NOT EXISTS idx_learned_words_integrated_at
ON learned_words(integrated_at DESC)
WHERE integrated_at IS NOT NULL;

-- ============================================================================
-- PART 2: Create word_relationships table
-- ============================================================================

CREATE TABLE IF NOT EXISTS word_relationships (
    id SERIAL PRIMARY KEY,
    word_a TEXT NOT NULL,
    word_b TEXT NOT NULL,
    co_occurrence INT DEFAULT 1,
    fisher_distance REAL,
    avg_phi REAL DEFAULT 0.5,
    max_phi REAL DEFAULT 0.5,
    contexts TEXT[],
    first_seen TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW(),
    UNIQUE(word_a, word_b)
);

-- Critical index for context-based lookups during decode (used every generation)
CREATE INDEX IF NOT EXISTS idx_word_rel_word_a_phi
ON word_relationships(word_a, avg_phi DESC, co_occurrence DESC);

-- Index for high-phi relationships
CREATE INDEX IF NOT EXISTS idx_word_rel_high_phi
ON word_relationships(avg_phi DESC, co_occurrence DESC)
WHERE avg_phi >= 0.6;

COMMENT ON TABLE word_relationships IS
'Word co-occurrence relationships for coherence boosting during generation. Tracks which words frequently appear together with geometric (Φ) validation.';

-- ============================================================================
-- PART 3: Create god_vocabulary_profiles table
-- ============================================================================

CREATE TABLE IF NOT EXISTS god_vocabulary_profiles (
    id SERIAL PRIMARY KEY,
    god_name TEXT NOT NULL,
    word TEXT NOT NULL,
    relevance_score REAL NOT NULL,  -- 0.0 to 1.0 (Φ-based)
    usage_count INT DEFAULT 0,
    last_used TIMESTAMP DEFAULT NOW(),
    learned_from_phi REAL,
    basin_distance REAL,
    UNIQUE(god_name, word)
);

-- Critical index for per-god relevance queries (used every generation with caching)
CREATE INDEX IF NOT EXISTS idx_god_vocab_god_relevance
ON god_vocabulary_profiles(god_name, relevance_score DESC, usage_count DESC);

-- Index for high-relevance vocabulary only
CREATE INDEX IF NOT EXISTS idx_god_vocab_high_relevance
ON god_vocabulary_profiles(relevance_score DESC, usage_count DESC)
WHERE relevance_score >= 0.5;

COMMENT ON TABLE god_vocabulary_profiles IS
'Per-kernel domain-specific vocabulary. Each god (kernel) has specialized vocabulary biased via Fisher-Rao geometry during generation.';

-- ============================================================================
-- PART 4: Helper Functions for Vocabulary Integration
-- (Same as pantheon-chat - copy from previous migration)
-- ============================================================================

-- [COPY ALL HELPER FUNCTIONS FROM pantheon-chat migration]
-- get_pending_vocabulary_for_integration()
-- mark_vocabulary_integrated()
-- get_god_domain_vocabulary()
-- get_word_relationships()
-- record_word_cooccurrence()

-- ============================================================================
-- PART 5: Verification Queries
-- ============================================================================

-- Check migration success
DO $$
BEGIN
    RAISE NOTICE 'Checking vocabulary integration tables for SearchSpaceCollapse...';

    -- Check learned_words columns
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'learned_words' AND column_name = 'is_integrated'
    ) THEN
        RAISE NOTICE '✓ learned_words.is_integrated column exists';
    ELSE
        RAISE EXCEPTION '✗ learned_words.is_integrated column missing';
    END IF;

    -- Check word_relationships table
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'word_relationships'
    ) THEN
        RAISE NOTICE '✓ word_relationships table exists';
    ELSE
        RAISE EXCEPTION '✗ word_relationships table missing';
    END IF;

    -- Check god_vocabulary_profiles table
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'god_vocabulary_profiles'
    ) THEN
        RAISE NOTICE '✓ god_vocabulary_profiles table exists';
    ELSE
        RAISE EXCEPTION '✗ god_vocabulary_profiles table missing';
    END IF;

    RAISE NOTICE 'Migration verification complete!';
END $$;
