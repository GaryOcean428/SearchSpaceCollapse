-- ============================================================================
-- VOCABULARY SYSTEM SCHEMA
-- Full implementation for shared vocabulary across all gods/agents
-- ============================================================================

-- BIP39 Base Vocabulary (2048 words)
CREATE TABLE IF NOT EXISTS bip39_words (
    id SERIAL PRIMARY KEY,
    word TEXT UNIQUE NOT NULL,
    word_index INT NOT NULL,  -- Position in BIP39 list (0-2047)
    frequency INT DEFAULT 0,
    avg_phi REAL DEFAULT 0.0,
    max_phi REAL DEFAULT 0.0,
    last_used TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bip39_word ON bip39_words(word);
CREATE INDEX idx_bip39_phi ON bip39_words(avg_phi DESC);

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

CREATE INDEX idx_learned_word ON learned_words(word);
CREATE INDEX idx_learned_phi ON learned_words(avg_phi DESC);
CREATE INDEX idx_learned_source ON learned_words(source);
CREATE INDEX idx_learned_integrated ON learned_words(is_integrated);

-- Vocabulary Observations (raw observations before aggregation)
CREATE TABLE IF NOT EXISTS vocabulary_observations (
    id SERIAL PRIMARY KEY,
    word TEXT NOT NULL,
    phrase TEXT NOT NULL,  -- Full phrase containing the word
    phi REAL NOT NULL,
    kappa REAL,
    source TEXT NOT NULL,  -- 'zeus', 'athena', 'ocean', 'user', etc.
    observation_type TEXT NOT NULL,  -- 'word', 'sequence', 'pattern'
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vocab_obs_word ON vocabulary_observations(word);
CREATE INDEX idx_vocab_obs_phi ON vocabulary_observations(phi DESC);
CREATE INDEX idx_vocab_obs_source ON vocabulary_observations(source);
CREATE INDEX idx_vocab_obs_timestamp ON vocabulary_observations(timestamp DESC);

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

CREATE INDEX idx_merge_phi ON bpe_merge_rules(phi_score DESC);
CREATE INDEX idx_merge_tokens ON bpe_merge_rules(token_a, token_b);

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

CREATE INDEX idx_god_vocab_name ON god_vocabulary_profiles(god_name);
CREATE INDEX idx_god_vocab_relevance ON god_vocabulary_profiles(relevance_score DESC);

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
    p_word TEXT,
    p_phrase TEXT,
    p_phi REAL,
    p_kappa REAL,
    p_source TEXT,
    p_type TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO vocabulary_observations (word, phrase, phi, kappa, source, observation_type)
    VALUES (p_word, p_phrase, p_phi, p_kappa, p_source, p_type);
    
    -- Update learned_words table
    INSERT INTO learned_words (word, frequency, avg_phi, max_phi, source, last_seen)
    VALUES (p_word, 1, p_phi, p_phi, p_source, NOW())
    ON CONFLICT (word) DO UPDATE SET
        frequency = learned_words.frequency + 1,
        avg_phi = (learned_words.avg_phi * learned_words.frequency + p_phi) / (learned_words.frequency + 1),
        max_phi = GREATEST(learned_words.max_phi, p_phi),
        last_seen = NOW();
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
CREATE OR REPLACE FUNCTION update_vocabulary_stats() RETURNS VOID AS $$
DECLARE
    v_total INT;
    v_bip39 INT;
    v_learned INT;
    v_high_phi INT;
    v_merges INT;
BEGIN
    SELECT COUNT(*) INTO v_bip39 FROM bip39_words;
    SELECT COUNT(*) INTO v_learned FROM learned_words;
    SELECT COUNT(*) INTO v_high_phi FROM learned_words WHERE avg_phi >= 0.7;
    SELECT COUNT(*) INTO v_merges FROM bpe_merge_rules;
    v_total := v_bip39 + v_learned;
    
    INSERT INTO vocabulary_stats (total_words, bip39_words, learned_words, high_phi_words, merge_rules)
    VALUES (v_total, v_bip39, v_learned, v_high_phi, v_merges);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update stats
CREATE OR REPLACE FUNCTION trigger_update_vocab_stats()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_vocabulary_stats();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stats_on_learned_insert
    AFTER INSERT ON learned_words
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_update_vocab_stats();