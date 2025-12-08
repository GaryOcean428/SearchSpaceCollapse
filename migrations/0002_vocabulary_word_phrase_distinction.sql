-- Migration: Vocabulary observations word/phrase distinction
-- Renames 'word' column to 'text' and adds 'is_real_word' column
-- This allows proper distinction between:
-- - 'word': Actual BIP-39/vocabulary words
-- - 'phrase': Mutated/concatenated strings (e.g., "transactionssent")
-- - 'sequence': Multi-word patterns

-- Step 1: Rename 'word' column to 'text' if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vocabulary_observations' AND column_name = 'word'
    ) THEN
        ALTER TABLE vocabulary_observations RENAME COLUMN word TO text;
    END IF;
END $$;

-- Step 2: Alter text column to allow longer strings (phrases can be longer)
ALTER TABLE vocabulary_observations 
ALTER COLUMN text TYPE varchar(255);

-- Step 3: Add is_real_word column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vocabulary_observations' AND column_name = 'is_real_word'
    ) THEN
        ALTER TABLE vocabulary_observations ADD COLUMN is_real_word boolean NOT NULL DEFAULT false;
    END IF;
END $$;

-- Step 4: Update default type from 'word' to 'phrase' since most entries are mutations
ALTER TABLE vocabulary_observations 
ALTER COLUMN type SET DEFAULT 'phrase';

-- Step 5: Update existing entries - classify based on type
-- Mark entries with type='word' as is_real_word=true
UPDATE vocabulary_observations 
SET is_real_word = true 
WHERE type = 'word';

-- Step 6: Create new indexes for the distinction
CREATE INDEX IF NOT EXISTS idx_vocabulary_observations_type ON vocabulary_observations(type);
CREATE INDEX IF NOT EXISTS idx_vocabulary_observations_real_word ON vocabulary_observations(is_real_word);

-- Step 7: Re-classify existing entries based on heuristics
-- Long concatenated strings (>15 chars without spaces) are phrases, not words
UPDATE vocabulary_observations 
SET type = 'phrase', is_real_word = false 
WHERE length(text) > 15 AND text NOT LIKE '% %' AND type = 'word';
