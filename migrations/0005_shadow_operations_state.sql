-- Migration: Add shadow_operations_state table for Shadow Pantheon persistence
-- This table stores operational state for all Shadow gods to prevent data loss on restart

CREATE TABLE IF NOT EXISTS shadow_operations_state (
    god_name VARCHAR(32) NOT NULL,
    state_type VARCHAR(32) NOT NULL,
    state_data JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (god_name, state_type)
);

CREATE INDEX IF NOT EXISTS idx_shadow_ops_state_god ON shadow_operations_state(god_name);
CREATE INDEX IF NOT EXISTS idx_shadow_ops_state_updated ON shadow_operations_state(updated_at);

COMMENT ON TABLE shadow_operations_state IS 'Persists in-memory state for Shadow Pantheon gods to survive restarts';
COMMENT ON COLUMN shadow_operations_state.god_name IS 'Name of the Shadow god (Nyx, Hecate, Erebus, Hypnos, Nemesis, ShadowPantheon)';
COMMENT ON COLUMN shadow_operations_state.state_type IS 'Type of state being stored (active_operations, opsec_violations, balance_cache, etc.)';
COMMENT ON COLUMN shadow_operations_state.state_data IS 'JSONB serialized state data (list or dict)';
