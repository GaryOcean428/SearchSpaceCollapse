-- ============================================================================
-- STRUCTURED PASSPHRASE VOCABULARY SCHEMA
-- Separates base vocabulary from variations from attempts for clean tracking
-- ============================================================================

-- ============================================================================
-- PASSPHRASE VOCABULARY TABLE
-- Base items: words, names, numbers, symbols (clean, unmodified)
-- ============================================================================
CREATE TABLE IF NOT EXISTS passphrase_vocabulary (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'pv_' || gen_random_uuid()::text,

    -- The clean base item (lowercase, no variations)
    base_item VARCHAR(100) NOT NULL,

    -- Type classification
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN (
        'word',      -- Common English words
        'bip39',     -- BIP39 mnemonic words (subset of words)
        'name',      -- Personal names, place names
        'number',    -- Numeric strings (years, sequences)
        'symbol',    -- Special characters, punctuation patterns
        'phrase'     -- Multi-word phrases (kept as unit)
    )),

    -- Source of this vocabulary item
    source VARCHAR(50) NOT NULL DEFAULT 'manual' CHECK (source IN (
        'bip39_wordlist',   -- Official BIP39 2048 words
        'common_names',     -- Common first/last names database
        'english_dict',     -- English dictionary
        'user_defined',     -- User added custom items
        'learned',          -- Learned from high-phi attempts
        'manual'            -- Manually added
    )),

    -- Statistics
    frequency INTEGER DEFAULT 0,          -- How often used in attempts
    phi_sum FLOAT8 DEFAULT 0,             -- Sum of phi from all attempts
    phi_avg FLOAT8 GENERATED ALWAYS AS (CASE WHEN frequency > 0 THEN phi_sum / frequency ELSE 0 END) STORED,
    success_count INTEGER DEFAULT 0,      -- Times appeared in successful attempts
    near_miss_count INTEGER DEFAULT 0,    -- Times appeared in near-miss attempts

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Ensure uniqueness per type (same word can be both 'word' and 'name')
    CONSTRAINT unique_base_item_type UNIQUE (base_item, item_type)
);

-- Indexes for vocabulary lookup
CREATE INDEX IF NOT EXISTS idx_vocab_base_item ON passphrase_vocabulary(base_item);
CREATE INDEX IF NOT EXISTS idx_vocab_type ON passphrase_vocabulary(item_type);
CREATE INDEX IF NOT EXISTS idx_vocab_source ON passphrase_vocabulary(source);
CREATE INDEX IF NOT EXISTS idx_vocab_phi_avg ON passphrase_vocabulary(phi_avg DESC);
CREATE INDEX IF NOT EXISTS idx_vocab_frequency ON passphrase_vocabulary(frequency DESC);

-- ============================================================================
-- PASSPHRASE VARIATIONS TABLE
-- Tracks all variations applied to base vocabulary items
-- ============================================================================
CREATE TABLE IF NOT EXISTS passphrase_variations (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'var_' || gen_random_uuid()::text,

    -- Link to base vocabulary
    vocabulary_id VARCHAR(64) NOT NULL REFERENCES passphrase_vocabulary(id) ON DELETE CASCADE,

    -- The variation result
    variation_text VARCHAR(200) NOT NULL,

    -- Type of variation applied
    variation_type VARCHAR(30) NOT NULL CHECK (variation_type IN (
        'original',      -- No variation (base item as-is)
        'uppercase',     -- ALL CAPS
        'lowercase',     -- all lower
        'capitalize',    -- First Letter Cap
        'title_case',    -- Title Case For Each Word
        'l33t_basic',    -- Basic leet: a→4, e→3, i→1, o→0
        'l33t_advanced', -- Advanced leet: s→$, t→7, etc.
        'suffix_num',    -- Append number: word123
        'prefix_num',    -- Prepend number: 123word
        'suffix_year',   -- Append year: word2024
        'suffix_special',-- Append special char: word!
        'prefix_special',-- Prepend special char: !word
        'reversed',      -- Reversed: drow
        'doubled',       -- Doubled: wordword
        'abbreviated',   -- Abbreviated: wrd
        'phonetic',      -- Phonetic substitution: ph→f
        'keyboard_shift',-- Keyboard pattern shift
        'custom'         -- Custom/compound variation
    )),

    -- Rules applied (for reproducibility)
    rules_applied JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Example: {"l33t": {"a": "4", "e": "3"}, "case": "upper", "suffix": "123"}

    -- Statistics for this specific variation
    frequency INTEGER DEFAULT 0,
    phi_sum FLOAT8 DEFAULT 0,
    phi_avg FLOAT8 GENERATED ALWAYS AS (CASE WHEN frequency > 0 THEN phi_sum / frequency ELSE 0 END) STORED,
    success_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),

    -- Ensure uniqueness: same variation of same vocab item
    CONSTRAINT unique_variation UNIQUE (vocabulary_id, variation_text)
);

-- Indexes for variation lookup
CREATE INDEX IF NOT EXISTS idx_var_vocab_id ON passphrase_variations(vocabulary_id);
CREATE INDEX IF NOT EXISTS idx_var_type ON passphrase_variations(variation_type);
CREATE INDEX IF NOT EXISTS idx_var_text ON passphrase_variations(variation_text);
CREATE INDEX IF NOT EXISTS idx_var_phi_avg ON passphrase_variations(phi_avg DESC);

-- ============================================================================
-- PASSPHRASE ATTEMPTS TABLE
-- Tracks full passphrase attempts with component breakdown
-- ============================================================================
CREATE TABLE IF NOT EXISTS passphrase_attempts (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'att_' || gen_random_uuid()::text,

    -- The full passphrase attempted
    attempt_text VARCHAR(500) NOT NULL,

    -- Component breakdown (array of variation IDs)
    components JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Example: ["var_abc123", "var_def456", "var_ghi789"]

    -- Structure pattern (describes the composition)
    structure_pattern VARCHAR(100) NOT NULL,
    -- Examples: "word+name+number", "bip39+bip39+bip39", "name+l33t_word+year"

    -- Detailed structure (for analysis)
    structure_detail JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Example: {"positions": [{"type": "name", "variation": "capitalize"}, ...]}

    -- Results
    phi FLOAT8,
    kappa FLOAT8,
    result VARCHAR(20) NOT NULL CHECK (result IN (
        'success',      -- Found the target
        'near_miss',    -- High phi, close to target
        'failure',      -- Low phi, not close
        'untested'      -- Generated but not yet tested
    )),

    -- Basin coordinates if measured
    basin_coords FLOAT8[64],

    -- Link to kernel that generated this
    kernel_id VARCHAR(64),
    god_name VARCHAR(50),

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    tested_at TIMESTAMP,

    -- Prevent duplicate attempts
    CONSTRAINT unique_attempt UNIQUE (attempt_text)
);

-- Indexes for attempt analysis
CREATE INDEX IF NOT EXISTS idx_att_result ON passphrase_attempts(result);
CREATE INDEX IF NOT EXISTS idx_att_phi ON passphrase_attempts(phi DESC);
CREATE INDEX IF NOT EXISTS idx_att_pattern ON passphrase_attempts(structure_pattern);
CREATE INDEX IF NOT EXISTS idx_att_kernel ON passphrase_attempts(kernel_id);
CREATE INDEX IF NOT EXISTS idx_att_created ON passphrase_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_att_components ON passphrase_attempts USING GIN (components);

-- ============================================================================
-- PASSPHRASE PATTERNS TABLE
-- Tracks successful structure patterns for learning
-- ============================================================================
CREATE TABLE IF NOT EXISTS passphrase_patterns (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'pat_' || gen_random_uuid()::text,

    -- Pattern definition
    pattern VARCHAR(100) NOT NULL UNIQUE,
    -- Example: "word+name+number", "bip39+bip39+bip39+bip39"

    -- Pattern components
    component_count INTEGER NOT NULL,
    component_types JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Example: ["word", "name", "number"]

    -- Statistics
    attempt_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    near_miss_count INTEGER DEFAULT 0,
    success_rate FLOAT8 GENERATED ALWAYS AS (
        CASE WHEN attempt_count > 0 THEN success_count::FLOAT8 / attempt_count ELSE 0 END
    ) STORED,

    -- Phi statistics
    phi_sum FLOAT8 DEFAULT 0,
    phi_avg FLOAT8 GENERATED ALWAYS AS (CASE WHEN attempt_count > 0 THEN phi_sum / attempt_count ELSE 0 END) STORED,
    phi_max FLOAT8 DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for pattern analysis
CREATE INDEX IF NOT EXISTS idx_pat_success_rate ON passphrase_patterns(success_rate DESC);
CREATE INDEX IF NOT EXISTS idx_pat_phi_avg ON passphrase_patterns(phi_avg DESC);
CREATE INDEX IF NOT EXISTS idx_pat_attempt_count ON passphrase_patterns(attempt_count DESC);

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View: Top performing vocabulary items
CREATE OR REPLACE VIEW v_top_vocabulary AS
SELECT
    v.id,
    v.base_item,
    v.item_type,
    v.source,
    v.frequency,
    v.phi_avg,
    v.success_count,
    v.near_miss_count,
    (SELECT COUNT(*) FROM passphrase_variations pv WHERE pv.vocabulary_id = v.id) as variation_count
FROM passphrase_vocabulary v
WHERE v.frequency > 0
ORDER BY v.phi_avg DESC, v.success_count DESC;

-- View: Top performing variations
CREATE OR REPLACE VIEW v_top_variations AS
SELECT
    pv.id,
    pv.variation_text,
    pv.variation_type,
    v.base_item,
    v.item_type,
    pv.frequency,
    pv.phi_avg,
    pv.success_count
FROM passphrase_variations pv
JOIN passphrase_vocabulary v ON pv.vocabulary_id = v.id
WHERE pv.frequency > 0
ORDER BY pv.phi_avg DESC, pv.success_count DESC;

-- View: Pattern effectiveness
CREATE OR REPLACE VIEW v_pattern_effectiveness AS
SELECT
    pattern,
    component_count,
    component_types,
    attempt_count,
    success_count,
    near_miss_count,
    success_rate,
    phi_avg,
    phi_max
FROM passphrase_patterns
WHERE attempt_count > 0
ORDER BY success_rate DESC, phi_avg DESC;

-- ============================================================================
-- TRIGGER: Auto-update timestamps
-- ============================================================================
CREATE OR REPLACE FUNCTION update_passphrase_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vocab_updated
    BEFORE UPDATE ON passphrase_vocabulary
    FOR EACH ROW
    EXECUTE FUNCTION update_passphrase_timestamp();

CREATE TRIGGER trg_patterns_updated
    BEFORE UPDATE ON passphrase_patterns
    FOR EACH ROW
    EXECUTE FUNCTION update_passphrase_timestamp();

-- ============================================================================
-- SEED: Initial BIP39 vocabulary (first 100 words as sample)
-- Full list should be loaded via PassphraseVocabularyManager
-- ============================================================================
INSERT INTO passphrase_vocabulary (base_item, item_type, source) VALUES
    ('abandon', 'bip39', 'bip39_wordlist'),
    ('ability', 'bip39', 'bip39_wordlist'),
    ('able', 'bip39', 'bip39_wordlist'),
    ('about', 'bip39', 'bip39_wordlist'),
    ('above', 'bip39', 'bip39_wordlist'),
    ('absent', 'bip39', 'bip39_wordlist'),
    ('absorb', 'bip39', 'bip39_wordlist'),
    ('abstract', 'bip39', 'bip39_wordlist'),
    ('absurd', 'bip39', 'bip39_wordlist'),
    ('abuse', 'bip39', 'bip39_wordlist')
ON CONFLICT (base_item, item_type) DO NOTHING;

-- Common names seed
INSERT INTO passphrase_vocabulary (base_item, item_type, source) VALUES
    ('james', 'name', 'common_names'),
    ('john', 'name', 'common_names'),
    ('robert', 'name', 'common_names'),
    ('michael', 'name', 'common_names'),
    ('david', 'name', 'common_names'),
    ('mary', 'name', 'common_names'),
    ('patricia', 'name', 'common_names'),
    ('jennifer', 'name', 'common_names'),
    ('elizabeth', 'name', 'common_names'),
    ('linda', 'name', 'common_names'),
    ('braden', 'name', 'user_defined')
ON CONFLICT (base_item, item_type) DO NOTHING;

-- Common years/numbers seed
INSERT INTO passphrase_vocabulary (base_item, item_type, source) VALUES
    ('2024', 'number', 'manual'),
    ('2023', 'number', 'manual'),
    ('2022', 'number', 'manual'),
    ('123', 'number', 'manual'),
    ('1234', 'number', 'manual'),
    ('0000', 'number', 'manual'),
    ('1', 'number', 'manual'),
    ('42', 'number', 'manual')
ON CONFLICT (base_item, item_type) DO NOTHING;

-- Common symbols seed
INSERT INTO passphrase_vocabulary (base_item, item_type, source) VALUES
    ('!', 'symbol', 'manual'),
    ('@', 'symbol', 'manual'),
    ('#', 'symbol', 'manual'),
    ('$', 'symbol', 'manual'),
    ('!@#', 'symbol', 'manual'),
    ('...', 'symbol', 'manual')
ON CONFLICT (base_item, item_type) DO NOTHING;

COMMENT ON TABLE passphrase_vocabulary IS 'Clean base vocabulary items (words, names, numbers) for passphrase generation';
COMMENT ON TABLE passphrase_variations IS 'All variations (l33t, caps, etc.) of vocabulary items';
COMMENT ON TABLE passphrase_attempts IS 'Full passphrases attempted with component breakdown';
COMMENT ON TABLE passphrase_patterns IS 'Structure patterns with success statistics';
