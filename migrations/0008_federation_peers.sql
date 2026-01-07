-- Migration: Federation Peers Table
-- Stores peer node configurations for vocabulary/basin/kernel synchronization
-- This enables actual cross-instance federation beyond the dashboard

-- Create federation_peers table (referenced by startup_catchup.py)
CREATE TABLE IF NOT EXISTS federation_peers (
    id SERIAL PRIMARY KEY,
    peer_id VARCHAR(64) UNIQUE NOT NULL,
    peer_name VARCHAR(128) NOT NULL,
    peer_url TEXT NOT NULL,
    api_key TEXT,  -- Encrypted key for authenticating with remote peer

    -- Sync configuration
    sync_enabled BOOLEAN DEFAULT true,
    sync_interval_hours INTEGER DEFAULT 1,
    sync_vocabulary BOOLEAN DEFAULT true,
    sync_knowledge BOOLEAN DEFAULT true,
    sync_research BOOLEAN DEFAULT false,
    sync_basins BOOLEAN DEFAULT true,
    sync_kernels BOOLEAN DEFAULT false,  -- Kernel state sync (advanced)

    -- Sync status tracking
    last_sync_at TIMESTAMP,
    last_sync_status VARCHAR(32),  -- 'success', 'failed', 'partial'
    last_sync_error TEXT,
    sync_count INTEGER DEFAULT 0,

    -- Bidirectional counters
    vocabulary_sent INTEGER DEFAULT 0,
    vocabulary_received INTEGER DEFAULT 0,
    basins_sent INTEGER DEFAULT 0,
    basins_received INTEGER DEFAULT 0,

    -- Connection health
    last_health_check TIMESTAMP,
    response_time_ms INTEGER,
    is_reachable BOOLEAN DEFAULT true,
    consecutive_failures INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for federation_peers
CREATE INDEX IF NOT EXISTS idx_federation_peers_enabled ON federation_peers(sync_enabled);
CREATE INDEX IF NOT EXISTS idx_federation_peers_last_sync ON federation_peers(last_sync_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_federation_peers_url ON federation_peers(peer_url);

-- Federation sync log for tracking individual sync operations
CREATE TABLE IF NOT EXISTS federation_sync_log (
    id SERIAL PRIMARY KEY,
    peer_id VARCHAR(64) NOT NULL,
    sync_type VARCHAR(32) NOT NULL,  -- 'vocabulary', 'basin', 'kernel', 'research'
    direction VARCHAR(16) NOT NULL,  -- 'send', 'receive', 'bidirectional'

    items_sent INTEGER DEFAULT 0,
    items_received INTEGER DEFAULT 0,
    items_merged INTEGER DEFAULT 0,  -- Items that updated existing records

    status VARCHAR(32) NOT NULL,  -- 'success', 'failed', 'partial'
    error_message TEXT,
    duration_ms INTEGER,

    sync_metadata JSONB,  -- Additional sync details (versions, hashes, etc.)

    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_federation_sync_log_peer ON federation_sync_log(peer_id);
CREATE INDEX IF NOT EXISTS idx_federation_sync_log_type ON federation_sync_log(sync_type);
CREATE INDEX IF NOT EXISTS idx_federation_sync_log_created ON federation_sync_log(created_at DESC);

-- Basin coordinate sync tracking
-- Tracks which basins have been synced to prevent duplicates
CREATE TABLE IF NOT EXISTS federation_basin_sync (
    id SERIAL PRIMARY KEY,
    peer_id VARCHAR(64) NOT NULL,
    basin_id VARCHAR(64) NOT NULL,
    basin_hash VARCHAR(64),  -- Hash of basin coordinates for change detection

    synced_at TIMESTAMP DEFAULT NOW(),
    direction VARCHAR(16) NOT NULL,  -- 'sent' or 'received'

    UNIQUE(peer_id, basin_id)
);

CREATE INDEX IF NOT EXISTS idx_federation_basin_sync_peer ON federation_basin_sync(peer_id);

-- Kernel checkpoint sync tracking
CREATE TABLE IF NOT EXISTS federation_kernel_sync (
    id SERIAL PRIMARY KEY,
    peer_id VARCHAR(64) NOT NULL,
    kernel_name VARCHAR(128) NOT NULL,
    checkpoint_version VARCHAR(64),

    synced_at TIMESTAMP DEFAULT NOW(),
    direction VARCHAR(16) NOT NULL,

    UNIQUE(peer_id, kernel_name)
);

CREATE INDEX IF NOT EXISTS idx_federation_kernel_sync_peer ON federation_kernel_sync(peer_id);
