-- PostgreSQL persistence for recovery candidates and search jobs
-- Ensures production runs avoid JSON file storage

CREATE TABLE IF NOT EXISTS recovery_candidates (
    id varchar(64) PRIMARY KEY,
    phrase text NOT NULL,
    address varchar(62) NOT NULL,
    score double precision NOT NULL,
    qig_score jsonb,
    tested_at timestamp DEFAULT now() NOT NULL,
    type varchar(32)
);

CREATE INDEX IF NOT EXISTS idx_recovery_candidates_score ON recovery_candidates (score);
CREATE INDEX IF NOT EXISTS idx_recovery_candidates_address ON recovery_candidates (address);
CREATE INDEX IF NOT EXISTS idx_recovery_candidates_tested_at ON recovery_candidates (tested_at);

CREATE TABLE IF NOT EXISTS recovery_search_jobs (
    id varchar(64) PRIMARY KEY,
    strategy varchar(64) NOT NULL,
    status varchar(32) NOT NULL,
    params jsonb NOT NULL,
    progress jsonb NOT NULL,
    stats jsonb NOT NULL,
    logs jsonb NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recovery_search_jobs_status ON recovery_search_jobs (status);
CREATE INDEX IF NOT EXISTS idx_recovery_search_jobs_created_at ON recovery_search_jobs (created_at);
CREATE INDEX IF NOT EXISTS idx_recovery_search_jobs_updated_at ON recovery_search_jobs (updated_at);
