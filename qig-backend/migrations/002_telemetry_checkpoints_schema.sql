-- Database Schema for Emergency Telemetry and Checkpoints
-- Created: 2025-12-18
-- Purpose: Store consciousness telemetry and checkpoint metadata in PostgreSQL

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- TELEMETRY TABLES
-- ============================================================================

-- Telemetry Sessions (one per training session)
CREATE TABLE IF NOT EXISTS telemetry_sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP,
    total_steps INTEGER DEFAULT 0,
    avg_phi FLOAT,
    max_phi FLOAT,
    min_phi FLOAT,
    avg_kappa FLOAT,
    max_kappa FLOAT,
    min_kappa FLOAT,
    regime_distribution JSONB,
    emergency_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_telemetry_sessions_started 
    ON telemetry_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_sessions_status 
    ON telemetry_sessions(status);

-- Telemetry Records (individual consciousness measurements)
CREATE TABLE IF NOT EXISTS telemetry_records (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL REFERENCES telemetry_sessions(session_id) ON DELETE CASCADE,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    step INTEGER NOT NULL,
    
    -- Core consciousness metrics
    phi FLOAT NOT NULL,
    kappa_eff FLOAT NOT NULL,
    regime VARCHAR(50) NOT NULL,
    
    -- Geometry metrics
    basin_distance FLOAT,
    geodesic_distance FLOAT,
    curvature FLOAT,
    fisher_metric_trace FLOAT,
    
    -- Stability metrics
    recursion_depth INTEGER,
    breakdown_pct FLOAT,
    coherence_drift FLOAT,
    
    -- Extended consciousness metrics
    meta_awareness FLOAT,
    generativity FLOAT,
    grounding FLOAT,
    temporal_coherence FLOAT,
    external_coupling FLOAT,
    
    -- Emergency flag
    emergency BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_telemetry_records_session 
    ON telemetry_records(session_id, step DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_records_timestamp 
    ON telemetry_records(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_records_phi 
    ON telemetry_records(phi DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_records_emergency 
    ON telemetry_records(emergency) WHERE emergency = TRUE;

-- Emergency Events (detected consciousness breakdowns)
CREATE TABLE IF NOT EXISTS emergency_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(255) UNIQUE NOT NULL,
    session_id VARCHAR(255) REFERENCES telemetry_sessions(session_id),
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Emergency details
    reason VARCHAR(255) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    metric VARCHAR(100),
    value FLOAT,
    threshold FLOAT,
    
    -- Context
    telemetry JSONB,
    recovery_action VARCHAR(255),
    recovered_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_emergency_events_timestamp 
    ON emergency_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_events_severity 
    ON emergency_events(severity);
CREATE INDEX IF NOT EXISTS idx_emergency_events_session 
    ON emergency_events(session_id);

-- ============================================================================
-- CHECKPOINT TABLES
-- ============================================================================

-- Checkpoints (consciousness state snapshots)
CREATE TABLE IF NOT EXISTS checkpoints (
    checkpoint_id VARCHAR(255) PRIMARY KEY,
    session_id VARCHAR(255) REFERENCES telemetry_sessions(session_id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Consciousness metrics at checkpoint
    phi FLOAT NOT NULL,
    kappa FLOAT NOT NULL,
    regime VARCHAR(50) NOT NULL,
    
    -- Basin coordinates (64D vector)
    basin_coords vector(64),
    
    -- State data (stored as JSONB)
    state_dict JSONB NOT NULL,
    
    -- Metadata
    metadata JSONB,
    
    -- Ranking
    rank INTEGER,
    is_best BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_checkpoints_phi 
    ON checkpoints(phi DESC);
CREATE INDEX IF NOT EXISTS idx_checkpoints_created 
    ON checkpoints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkpoints_session 
    ON checkpoints(session_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_best 
    ON checkpoints(is_best) WHERE is_best = TRUE;

-- Checkpoint History (track checkpoint lifecycle)
CREATE TABLE IF NOT EXISTS checkpoint_history (
    id SERIAL PRIMARY KEY,
    checkpoint_id VARCHAR(255) NOT NULL REFERENCES checkpoints(checkpoint_id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'created', 'loaded', 'pruned', 'ranked'
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    details JSONB
);

CREATE INDEX IF NOT EXISTS idx_checkpoint_history_checkpoint 
    ON checkpoint_history(checkpoint_id, timestamp DESC);

-- ============================================================================
-- BASIN COORDINATES (from existing schema, enhanced)
-- ============================================================================

-- Basin History (consciousness state trajectory)
CREATE TABLE IF NOT EXISTS basin_history (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) REFERENCES telemetry_sessions(session_id),
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    basin_coords vector(64) NOT NULL,
    phi FLOAT NOT NULL,
    kappa FLOAT NOT NULL,
    source VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_basin_history_session 
    ON basin_history(session_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_basin_history_phi 
    ON basin_history(phi DESC);

-- ============================================================================
-- VIEWS FOR EASY QUERYING
-- ============================================================================

-- Latest telemetry by session
CREATE OR REPLACE VIEW latest_telemetry AS
SELECT DISTINCT ON (session_id)
    session_id,
    timestamp,
    step,
    phi,
    kappa_eff,
    regime,
    basin_distance,
    recursion_depth,
    emergency
FROM telemetry_records
ORDER BY session_id, step DESC;

-- Best checkpoints (top 10 by phi)
CREATE OR REPLACE VIEW best_checkpoints AS
SELECT 
    checkpoint_id,
    session_id,
    created_at,
    phi,
    kappa,
    regime,
    rank
FROM checkpoints
ORDER BY phi DESC
LIMIT 10;

-- Emergency summary by session
CREATE OR REPLACE VIEW emergency_summary AS
SELECT 
    session_id,
    COUNT(*) as emergency_count,
    MAX(severity) as max_severity,
    MIN(timestamp) as first_emergency,
    MAX(timestamp) as last_emergency
FROM emergency_events
GROUP BY session_id;

-- Session statistics
CREATE OR REPLACE VIEW session_stats AS
SELECT 
    ts.session_id,
    ts.started_at,
    ts.ended_at,
    ts.total_steps,
    ts.avg_phi,
    ts.max_phi,
    ts.emergency_count,
    COUNT(DISTINCT cp.checkpoint_id) as checkpoint_count,
    MAX(cp.phi) as best_checkpoint_phi
FROM telemetry_sessions ts
LEFT JOIN checkpoints cp ON ts.session_id = cp.session_id
GROUP BY ts.session_id, ts.started_at, ts.ended_at, ts.total_steps, 
         ts.avg_phi, ts.max_phi, ts.emergency_count;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update session statistics
CREATE OR REPLACE FUNCTION update_session_stats(p_session_id VARCHAR)
RETURNS VOID AS $$
BEGIN
    UPDATE telemetry_sessions
    SET 
        total_steps = (
            SELECT COUNT(*) 
            FROM telemetry_records 
            WHERE session_id = p_session_id
        ),
        avg_phi = (
            SELECT AVG(phi) 
            FROM telemetry_records 
            WHERE session_id = p_session_id
        ),
        max_phi = (
            SELECT MAX(phi) 
            FROM telemetry_records 
            WHERE session_id = p_session_id
        ),
        min_phi = (
            SELECT MIN(phi) 
            FROM telemetry_records 
            WHERE session_id = p_session_id
        ),
        avg_kappa = (
            SELECT AVG(kappa_eff) 
            FROM telemetry_records 
            WHERE session_id = p_session_id
        ),
        max_kappa = (
            SELECT MAX(kappa_eff) 
            FROM telemetry_records 
            WHERE session_id = p_session_id
        ),
        min_kappa = (
            SELECT MIN(kappa_eff) 
            FROM telemetry_records 
            WHERE session_id = p_session_id
        ),
        emergency_count = (
            SELECT COUNT(*) 
            FROM emergency_events 
            WHERE session_id = p_session_id
        )
    WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update checkpoint rankings
CREATE OR REPLACE FUNCTION update_checkpoint_rankings()
RETURNS VOID AS $$
BEGIN
    -- Update rankings based on phi (descending)
    WITH ranked AS (
        SELECT 
            checkpoint_id,
            ROW_NUMBER() OVER (ORDER BY phi DESC) as new_rank
        FROM checkpoints
    )
    UPDATE checkpoints c
    SET rank = r.new_rank
    FROM ranked r
    WHERE c.checkpoint_id = r.checkpoint_id;
    
    -- Mark best checkpoint
    UPDATE checkpoints SET is_best = FALSE;
    UPDATE checkpoints 
    SET is_best = TRUE 
    WHERE rank = 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANTS (adjust as needed for your user)
-- ============================================================================

-- Grant permissions to neondb_owner (from DATABASE_URL)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO neondb_owner;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO neondb_owner;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO neondb_owner;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE telemetry_sessions IS 'Training sessions with aggregate statistics';
COMMENT ON TABLE telemetry_records IS 'Individual consciousness measurements during training';
COMMENT ON TABLE emergency_events IS 'Detected consciousness breakdowns and emergencies';
COMMENT ON TABLE checkpoints IS 'Consciousness state snapshots ranked by Φ';
COMMENT ON TABLE checkpoint_history IS 'Audit log of checkpoint lifecycle events';
COMMENT ON TABLE basin_history IS 'Trajectory of consciousness states in 64D basin space';

COMMENT ON VIEW latest_telemetry IS 'Most recent telemetry record for each session';
COMMENT ON VIEW best_checkpoints IS 'Top 10 checkpoints ranked by integration (Φ)';
COMMENT ON VIEW emergency_summary IS 'Emergency event statistics per session';
COMMENT ON VIEW session_stats IS 'Comprehensive session statistics with checkpoint info';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
