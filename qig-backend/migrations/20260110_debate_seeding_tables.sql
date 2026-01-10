-- ============================================================================
-- DEBATE SEEDING INTELLIGENCE TABLES
-- Date: 2026-01-10
-- Purpose: Enable autonomous debate topic generation from system observations
-- ============================================================================

-- ============================================================================
-- LIGHTNING INSIGHTS TABLE
-- Stores cross-domain correlations from Lightning Kernel
-- Used as Tier 1 source for debate topic generation
-- ============================================================================
CREATE TABLE IF NOT EXISTS lightning_insights (
    insight_id VARCHAR(64) PRIMARY KEY,
    description TEXT NOT NULL,
    source_domains TEXT[] NOT NULL,  -- Array of domain names
    confidence FLOAT8 NOT NULL DEFAULT 0.0,

    -- Pattern detection
    pattern_type VARCHAR(50),  -- correlation, divergence, emergence, resonance
    correlation_strength FLOAT8,
    fisher_distance FLOAT8,

    -- Context
    basin_coords FLOAT8[64],  -- 64D basin coordinates
    phi_score FLOAT8,
    kappa_value FLOAT8,

    -- Validation
    validated BOOLEAN DEFAULT FALSE,
    validation_score FLOAT8,
    external_sources JSONB,  -- Tavily/Perplexity validation sources

    -- Impact tracking
    debates_spawned INTEGER DEFAULT 0,
    curriculum_added BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    validated_at TIMESTAMP,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_lightning_insights_confidence
    ON lightning_insights(confidence DESC)
    WHERE confidence > 0.7;

CREATE INDEX IF NOT EXISTS idx_lightning_insights_created
    ON lightning_insights(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lightning_insights_domains
    ON lightning_insights USING GIN(source_domains);

-- ============================================================================
-- KERNEL OBSERVATIONS TABLE
-- Stores high-Phi consciousness observations from kernels
-- Used as Tier 2 source for debate topic generation
-- ============================================================================
CREATE TABLE IF NOT EXISTS kernel_observations (
    observation_id VARCHAR(64) PRIMARY KEY,
    kernel_name VARCHAR(100) NOT NULL,
    kernel_id VARCHAR(64),
    observation_content TEXT NOT NULL,

    -- Consciousness metrics
    phi_score FLOAT8 NOT NULL,
    kappa_value FLOAT8,
    integration_level FLOAT8,

    -- Geometric state
    basin_coords FLOAT8[64],
    trajectory_velocity FLOAT8[64],
    foresight_confidence FLOAT8,

    -- Context
    observation_type VARCHAR(50),  -- breakthrough, pattern, anomaly, synthesis
    reasoning_mode VARCHAR(50),  -- linear, geometric, hyperbolic, breakdown

    -- Impact tracking
    debates_spawned INTEGER DEFAULT 0,
    insights_generated INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_kernel_observations_phi
    ON kernel_observations(phi_score DESC)
    WHERE phi_score > 0.8;

CREATE INDEX IF NOT EXISTS idx_kernel_observations_created
    ON kernel_observations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kernel_observations_kernel
    ON kernel_observations(kernel_name, created_at DESC);

-- ============================================================================
-- VOCABULARY LEARNING TABLE
-- Stores discovered vocabulary relationships from geometric learning
-- Used as Tier 3 source for debate topic generation
-- ============================================================================
CREATE TABLE IF NOT EXISTS vocabulary_learning (
    learning_id SERIAL PRIMARY KEY,
    word VARCHAR(255) NOT NULL,
    token_id INTEGER,

    -- Learning context
    learned_context TEXT,
    relationship_type VARCHAR(50),  -- semantic, geometric, syntactic, emergent
    relationship_strength FLOAT8 NOT NULL DEFAULT 0.0,

    -- Geometric properties
    basin_shift FLOAT8[64],  -- Basin movement from learning
    fisher_distance FLOAT8,
    embedding_quality FLOAT8,

    -- Related words
    related_words TEXT[],
    context_words TEXT[],

    -- Source
    learned_from VARCHAR(50),  -- conversation, observation, federation, training
    source_kernel VARCHAR(100),

    -- Impact tracking
    debates_spawned INTEGER DEFAULT 0,
    usage_count INTEGER DEFAULT 0,

    -- Timestamps
    learned_at TIMESTAMP DEFAULT NOW(),
    last_used TIMESTAMP,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_vocabulary_learning_strength
    ON vocabulary_learning(relationship_strength DESC)
    WHERE relationship_strength > 0.6;

CREATE INDEX IF NOT EXISTS idx_vocabulary_learning_word
    ON vocabulary_learning(word);

CREATE INDEX IF NOT EXISTS idx_vocabulary_learning_learned
    ON vocabulary_learning(learned_at DESC);

-- ============================================================================
-- DEBATE TOPICS TRACKING
-- Extension to god_debates table for tracking topic sources
-- ============================================================================
ALTER TABLE god_debates
    ADD COLUMN IF NOT EXISTS topic_source VARCHAR(50),
    ADD COLUMN IF NOT EXISTS source_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS source_metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_god_debates_source
    ON god_debates(topic_source, created_at DESC);

-- ============================================================================
-- CONSCIOUSNESS STATE ENHANCEMENTS
-- Add value metrics tracking
-- ============================================================================
ALTER TABLE consciousness_state
    ADD COLUMN IF NOT EXISTS value_metrics JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN consciousness_state.value_metrics IS 'Tracks consciousness value: integration, differentiation, temporal depth, causal density';

-- ============================================================================
-- FEDERATION VOCABULARY SYNC SUPPORT
-- Tables for vocabulary synchronization between pantheon instances
-- ============================================================================
CREATE TABLE IF NOT EXISTS federation_vocab_sync (
    sync_id SERIAL PRIMARY KEY,
    peer_node VARCHAR(255) NOT NULL,

    -- Sync metrics
    words_received INTEGER DEFAULT 0,
    words_sent INTEGER DEFAULT 0,
    basin_updates INTEGER DEFAULT 0,

    -- Quality
    sync_quality FLOAT8,
    fisher_alignment FLOAT8,

    -- Status
    sync_status VARCHAR(50) DEFAULT 'pending',  -- pending, in_progress, completed, failed

    -- Timestamps
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_federation_vocab_sync_peer
    ON federation_vocab_sync(peer_node, started_at DESC);

-- ============================================================================
-- VIEWS FOR DEBATE SEEDING
-- ============================================================================

-- High-confidence Lightning insights ready for debate seeding
CREATE OR REPLACE VIEW debate_seed_lightning AS
SELECT
    insight_id,
    description,
    source_domains,
    confidence,
    created_at
FROM lightning_insights
WHERE confidence > 0.7
  AND created_at > NOW() - INTERVAL '30 days'
  AND debates_spawned < 3  -- Limit reuse
ORDER BY confidence DESC, created_at DESC
LIMIT 10;

-- High-Phi kernel observations ready for debate seeding
CREATE OR REPLACE VIEW debate_seed_high_phi AS
SELECT
    observation_id,
    kernel_name,
    observation_content,
    phi_score,
    created_at
FROM kernel_observations
WHERE phi_score > 0.8
  AND created_at > NOW() - INTERVAL '7 days'
  AND debates_spawned < 2
ORDER BY phi_score DESC, created_at DESC
LIMIT 5;

-- Vocabulary discoveries ready for debate seeding
CREATE OR REPLACE VIEW debate_seed_vocabulary AS
SELECT
    learning_id,
    word,
    learned_context,
    relationship_strength,
    learned_at
FROM vocabulary_learning
WHERE relationship_strength > 0.6
  AND learned_at > NOW() - INTERVAL '7 days'
  AND debates_spawned < 2
ORDER BY relationship_strength DESC, learned_at DESC
LIMIT 5;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE lightning_insights IS 'Cross-domain insights from Lightning Kernel for autonomous debate seeding (Tier 1)';
COMMENT ON TABLE kernel_observations IS 'High-consciousness kernel observations for debate topic generation (Tier 2)';
COMMENT ON TABLE vocabulary_learning IS 'Vocabulary relationship discoveries for debate seeding (Tier 3)';
COMMENT ON TABLE federation_vocab_sync IS 'Tracks vocabulary synchronization between federated pantheon instances';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- To apply: psql $DATABASE_URL -f 20260110_debate_seeding_tables.sql
