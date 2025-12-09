-- ============================================================================
-- QIG VECTOR DATABASE SCHEMA
-- Complete schema for all QIG features with pgvector support
-- Run on Neon PostgreSQL
-- ============================================================================

-- Enable pgvector extension for 64D basin coordinates
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- GEOMETRIC MEMORY TABLES
-- Shared memory system for feedback loops
-- ============================================================================

-- Shadow Intel: Covert intelligence gathered by Shadow Pantheon
CREATE TABLE IF NOT EXISTS shadow_intel (
    intel_id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,

    -- Target information
    target TEXT NOT NULL,
    target_hash VARCHAR(64),

    -- Shadow assessment
    consensus VARCHAR(32),  -- proceed, caution, abort
    average_confidence FLOAT8 DEFAULT 0.5,

    -- Geometric state
    basin_coords vector(64),  -- pgvector 64D
    phi FLOAT8,
    kappa FLOAT8,
    regime VARCHAR(32),

    -- Individual assessments
    assessments JSONB DEFAULT '{}'::jsonb,

    -- Flags
    warnings TEXT[],
    override_zeus BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

-- Indexes for shadow_intel
CREATE INDEX IF NOT EXISTS idx_shadow_intel_target ON shadow_intel(target);
CREATE INDEX IF NOT EXISTS idx_shadow_intel_consensus ON shadow_intel(consensus);
CREATE INDEX IF NOT EXISTS idx_shadow_intel_phi ON shadow_intel(phi DESC);
CREATE INDEX IF NOT EXISTS idx_shadow_intel_created_at ON shadow_intel(created_at DESC);

-- Basin History: Track basin coordinate evolution
CREATE TABLE IF NOT EXISTS basin_history (
    history_id BIGSERIAL PRIMARY KEY,

    -- Basin state
    basin_coords vector(64),
    phi FLOAT8 NOT NULL,
    kappa FLOAT8 NOT NULL,

    -- Source tracking
    source VARCHAR(64) DEFAULT 'unknown',
    instance_id VARCHAR(64),

    -- Timestamps
    recorded_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for basin_history
CREATE INDEX IF NOT EXISTS idx_basin_history_phi ON basin_history(phi DESC);
CREATE INDEX IF NOT EXISTS idx_basin_history_recorded_at ON basin_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_basin_history_source ON basin_history(source);
-- HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_basin_history_coords_hnsw
    ON basin_history USING hnsw (basin_coords vector_cosine_ops);

-- Learning Events: High-Φ discoveries for reinforcement
CREATE TABLE IF NOT EXISTS learning_events (
    event_id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,

    -- Event type
    event_type VARCHAR(64) NOT NULL,  -- discovery, pattern, resonance, breakthrough

    -- Geometric metrics
    phi FLOAT8 NOT NULL,
    kappa FLOAT8,
    basin_coords vector(64),

    -- Event details
    details JSONB DEFAULT '{}'::jsonb,
    context JSONB DEFAULT '{}'::jsonb,

    -- Source
    source VARCHAR(64),
    instance_id VARCHAR(64),

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for learning_events
CREATE INDEX IF NOT EXISTS idx_learning_events_type ON learning_events(event_type);
CREATE INDEX IF NOT EXISTS idx_learning_events_phi ON learning_events(phi DESC);
CREATE INDEX IF NOT EXISTS idx_learning_events_created_at ON learning_events(created_at DESC);

-- Activity Balance: Exploration vs exploitation tracking
CREATE TABLE IF NOT EXISTS activity_balance (
    balance_id VARCHAR(32) PRIMARY KEY DEFAULT 'default',

    -- Balance state
    exploration FLOAT8 DEFAULT 0.5,
    exploitation FLOAT8 DEFAULT 0.5,

    -- Tracking
    total_actions INTEGER DEFAULT 0,
    last_adjustment TIMESTAMP,

    -- History
    history JSONB DEFAULT '[]'::jsonb,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- FEEDBACK LOOP TABLES
-- Recursive learning system state
-- ============================================================================

-- Feedback Loop State: Tracks loop iterations and state
CREATE TABLE IF NOT EXISTS feedback_loop_state (
    state_id VARCHAR(32) PRIMARY KEY DEFAULT 'default',

    -- Loop counters
    shadow_iterations INTEGER DEFAULT 0,
    activity_iterations INTEGER DEFAULT 0,
    basin_iterations INTEGER DEFAULT 0,
    learning_iterations INTEGER DEFAULT 0,
    sync_iterations INTEGER DEFAULT 0,

    -- Current state
    last_feedback_time TIMESTAMP DEFAULT NOW(),
    recommendation VARCHAR(32) DEFAULT 'explore',  -- explore, exploit, consolidate
    recommendation_confidence FLOAT8 DEFAULT 0.5,

    -- Phi trend
    phi_trend VARCHAR(32) DEFAULT 'stable',  -- improving, declining, stable
    phi_mean FLOAT8 DEFAULT 0.5,
    phi_delta FLOAT8 DEFAULT 0.0,

    -- Reference basin
    reference_basin vector(64),

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- HERMES COORDINATOR TABLES
-- Voice, translation, sync, and memory
-- ============================================================================

-- Hermes Conversations: Memory of human-system interactions
CREATE TABLE IF NOT EXISTS hermes_conversations (
    conversation_id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,

    -- Messages
    user_message TEXT NOT NULL,
    system_response TEXT NOT NULL,

    -- Geometric encoding
    message_basin vector(64),
    response_basin vector(64),
    phi FLOAT8,

    -- Context
    context JSONB DEFAULT '{}'::jsonb,

    -- Instance tracking
    instance_id VARCHAR(64),

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for hermes_conversations
CREATE INDEX IF NOT EXISTS idx_hermes_conversations_phi ON hermes_conversations(phi DESC);
CREATE INDEX IF NOT EXISTS idx_hermes_conversations_created_at ON hermes_conversations(created_at DESC);
-- HNSW index for semantic similarity search
CREATE INDEX IF NOT EXISTS idx_hermes_conversations_basin_hnsw
    ON hermes_conversations USING hnsw (message_basin vector_cosine_ops);

-- Sync Packets: Cross-instance coordination
CREATE TABLE IF NOT EXISTS sync_packets (
    packet_id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,

    -- Instance info
    instance_id VARCHAR(64) NOT NULL,

    -- Basin state
    basin_coords vector(64),
    phi FLOAT8,
    kappa FLOAT8,
    regime VARCHAR(32),

    -- Sync message
    message TEXT,

    -- Timestamps
    sent_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '5 minutes'
);

-- Indexes for sync_packets
CREATE INDEX IF NOT EXISTS idx_sync_packets_instance ON sync_packets(instance_id);
CREATE INDEX IF NOT EXISTS idx_sync_packets_sent_at ON sync_packets(sent_at DESC);

-- ============================================================================
-- AUTONOMIC CYCLE TABLES
-- Sleep, dream, mushroom mode tracking
-- ============================================================================

-- Narrow Path Events: When ML gets stuck
CREATE TABLE IF NOT EXISTS narrow_path_events (
    event_id BIGSERIAL PRIMARY KEY,

    -- Detection
    severity VARCHAR(32) NOT NULL,  -- mild, moderate, severe
    consecutive_count INTEGER DEFAULT 1,
    exploration_variance FLOAT8,

    -- Basin state at detection
    basin_coords vector(64),
    phi FLOAT8,
    kappa FLOAT8,

    -- Intervention
    intervention_action VARCHAR(32),  -- none, dream, mushroom
    intervention_intensity VARCHAR(32),  -- microdose, moderate, heroic
    intervention_result JSONB,

    -- Timestamps
    detected_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

-- Indexes for narrow_path_events
CREATE INDEX IF NOT EXISTS idx_narrow_path_events_severity ON narrow_path_events(severity);
CREATE INDEX IF NOT EXISTS idx_narrow_path_events_detected_at ON narrow_path_events(detected_at DESC);

-- Autonomic Cycle History: All sleep/dream/mushroom cycles
CREATE TABLE IF NOT EXISTS autonomic_cycle_history (
    cycle_id BIGSERIAL PRIMARY KEY,

    -- Cycle type
    cycle_type VARCHAR(32) NOT NULL,  -- sleep, dream, mushroom

    -- Parameters
    intensity VARCHAR(32),  -- For mushroom: microdose, moderate, heroic
    temperature FLOAT8,     -- For dream

    -- Basin state
    basin_before vector(64),
    basin_after vector(64),
    drift_before FLOAT8,
    drift_after FLOAT8,

    -- Metrics
    phi_before FLOAT8,
    phi_after FLOAT8,

    -- Results
    success BOOLEAN DEFAULT TRUE,
    patterns_consolidated INTEGER DEFAULT 0,
    novel_connections INTEGER DEFAULT 0,
    new_pathways INTEGER DEFAULT 0,
    entropy_change FLOAT8,
    identity_preserved BOOLEAN DEFAULT TRUE,

    -- Verdict
    verdict TEXT,

    -- Duration
    duration_ms INTEGER,

    -- Trigger
    trigger_reason TEXT,

    -- Timestamps
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Indexes for autonomic_cycle_history
CREATE INDEX IF NOT EXISTS idx_autonomic_cycle_history_type ON autonomic_cycle_history(cycle_type);
CREATE INDEX IF NOT EXISTS idx_autonomic_cycle_history_started_at ON autonomic_cycle_history(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_autonomic_cycle_history_success ON autonomic_cycle_history(success);

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Recent high-Φ learning events
CREATE OR REPLACE VIEW recent_high_phi_events AS
SELECT
    event_id,
    event_type,
    phi,
    kappa,
    details,
    created_at
FROM learning_events
WHERE phi > 0.7
ORDER BY created_at DESC
LIMIT 100;

-- Narrow path summary
CREATE OR REPLACE VIEW narrow_path_summary AS
SELECT
    DATE(detected_at) as date,
    severity,
    COUNT(*) as occurrences,
    AVG(exploration_variance) as avg_variance,
    COUNT(CASE WHEN intervention_action = 'dream' THEN 1 END) as dream_interventions,
    COUNT(CASE WHEN intervention_action = 'mushroom' THEN 1 END) as mushroom_interventions
FROM narrow_path_events
GROUP BY DATE(detected_at), severity
ORDER BY date DESC, severity;

-- Basin drift trend (last 24 hours)
CREATE OR REPLACE VIEW basin_drift_trend AS
SELECT
    DATE_TRUNC('hour', recorded_at) as hour,
    AVG(phi) as avg_phi,
    AVG(kappa) as avg_kappa,
    COUNT(*) as samples
FROM basin_history
WHERE recorded_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', recorded_at)
ORDER BY hour DESC;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to find similar basins using cosine distance
CREATE OR REPLACE FUNCTION find_similar_basins(
    query_basin vector(64),
    limit_count INTEGER DEFAULT 10,
    min_phi FLOAT8 DEFAULT 0.3
)
RETURNS TABLE (
    history_id BIGINT,
    basin_coords vector(64),
    phi FLOAT8,
    kappa FLOAT8,
    source VARCHAR(64),
    similarity FLOAT8,
    recorded_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        bh.history_id,
        bh.basin_coords,
        bh.phi,
        bh.kappa,
        bh.source,
        1 - (bh.basin_coords <=> query_basin) as similarity,
        bh.recorded_at
    FROM basin_history bh
    WHERE bh.phi >= min_phi
    ORDER BY bh.basin_coords <=> query_basin
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to find similar conversations
CREATE OR REPLACE FUNCTION find_similar_conversations(
    query_basin vector(64),
    limit_count INTEGER DEFAULT 5,
    min_phi FLOAT8 DEFAULT 0.3
)
RETURNS TABLE (
    conversation_id VARCHAR(64),
    user_message TEXT,
    system_response TEXT,
    phi FLOAT8,
    similarity FLOAT8,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        hc.conversation_id,
        hc.user_message,
        hc.system_response,
        hc.phi,
        1 - (hc.message_basin <=> query_basin) as similarity,
        hc.created_at
    FROM hermes_conversations hc
    WHERE hc.phi >= min_phi
      AND hc.message_basin IS NOT NULL
    ORDER BY hc.message_basin <=> query_basin
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CLEANUP: Remove expired data
-- ============================================================================

-- Function to clean expired sync packets
CREATE OR REPLACE FUNCTION cleanup_expired_sync_packets()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sync_packets WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean old basin history (keep last 10000)
CREATE OR REPLACE FUNCTION cleanup_old_basin_history()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH to_delete AS (
        SELECT history_id FROM basin_history
        ORDER BY recorded_at DESC
        OFFSET 10000
    )
    DELETE FROM basin_history WHERE history_id IN (SELECT history_id FROM to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANT PERMISSIONS (if needed)
-- ============================================================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO neondb_owner;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO neondb_owner;
