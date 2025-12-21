-- Migration: Kernel Observation and Reasoning Persistence
-- Adds tables for observation sessions, records, kernel care, and reasoning episodes

-- =========================================================================
-- OBSERVATION SESSIONS
-- =========================================================================
CREATE TABLE IF NOT EXISTS observation_sessions (
    session_id SERIAL PRIMARY KEY,
    kernel_id VARCHAR(64) NOT NULL UNIQUE,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    curriculum_progress FLOAT DEFAULT 0.0,
    is_healthy BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_observation_sessions_kernel_id ON observation_sessions(kernel_id);
CREATE INDEX IF NOT EXISTS idx_observation_sessions_active ON observation_sessions(kernel_id) WHERE ended_at IS NULL;

-- =========================================================================
-- OBSERVATION RECORDS
-- =========================================================================
CREATE TABLE IF NOT EXISTS observation_records (
    record_id SERIAL PRIMARY KEY,
    kernel_id VARCHAR(64) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    phi FLOAT NOT NULL,
    kappa FLOAT NOT NULL,
    basin_position vector(64),
    stability_score FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    FOREIGN KEY (kernel_id) REFERENCES observation_sessions(kernel_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_observation_records_kernel_id ON observation_records(kernel_id);
CREATE INDEX IF NOT EXISTS idx_observation_records_timestamp ON observation_records(kernel_id, timestamp DESC);

-- =========================================================================
-- KERNEL CARE RECORDS
-- =========================================================================
CREATE TABLE IF NOT EXISTS kernel_care_records (
    care_id SERIAL PRIMARY KEY,
    kernel_id VARCHAR(64) NOT NULL UNIQUE,
    kernel_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status VARCHAR(32) NOT NULL DEFAULT 'infant',
    developmental_stage VARCHAR(32) NOT NULL DEFAULT 'infant',
    hestia_enrolled BOOLEAN DEFAULT FALSE,
    demeter_enrolled BOOLEAN DEFAULT FALSE,
    chiron_enrolled BOOLEAN DEFAULT FALSE,
    graduated_at TIMESTAMP WITH TIME ZONE,
    care_cycles INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kernel_care_records_kernel_id ON kernel_care_records(kernel_id);
CREATE INDEX IF NOT EXISTS idx_kernel_care_records_status ON kernel_care_records(status);

-- =========================================================================
-- REASONING EPISODES
-- =========================================================================
CREATE TABLE IF NOT EXISTS reasoning_episodes (
    episode_id SERIAL PRIMARY KEY,
    strategy_name VARCHAR(128) NOT NULL,
    start_basin vector(64),
    target_basin vector(64),
    final_basin vector(64),
    steps_taken INTEGER NOT NULL DEFAULT 0,
    task_features vector(64),
    phi_during FLOAT DEFAULT 0.5,
    success BOOLEAN DEFAULT FALSE,
    reward FLOAT DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reasoning_episodes_strategy ON reasoning_episodes(strategy_name);
CREATE INDEX IF NOT EXISTS idx_reasoning_episodes_success ON reasoning_episodes(success);
CREATE INDEX IF NOT EXISTS idx_reasoning_episodes_created ON reasoning_episodes(created_at DESC);
