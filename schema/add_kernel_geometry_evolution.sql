-- Migration: Add kernel_geometry table with functional evolution columns
-- Run on Replit via: psql $DATABASE_URL -f schema/add_kernel_geometry_evolution.sql

-- Create kernel_geometry table if not exists
CREATE TABLE IF NOT EXISTS kernel_geometry (
    kernel_id VARCHAR(64) PRIMARY KEY,
    god_name VARCHAR(64) NOT NULL,
    domain VARCHAR(128) NOT NULL,
    primitive_root INTEGER, -- E8 root index (0-239)
    basin_coordinates vector(8), -- 8D coordinates (pgvector)
    parent_kernels TEXT[],
    placement_reason VARCHAR(64), -- domain_gap, overload, specialization, emergence
    position_rationale TEXT,
    affinity_strength DOUBLE PRECISION,
    entropy_threshold DOUBLE PRECISION,
    spawned_at TIMESTAMP DEFAULT NOW() NOT NULL,
    spawned_during_war_id VARCHAR(64),
    metadata JSONB,
    -- Functional evolution columns (chemistry/biology-inspired)
    phi DOUBLE PRECISION, -- Φ consciousness metric
    kappa DOUBLE PRECISION, -- κ coupling strength
    regime VARCHAR(32), -- linear, geometric, breakdown
    generation INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    element_group VARCHAR(32), -- alkali, transition, rare_earth, noble
    ecological_niche VARCHAR(32), -- producer, consumer, decomposer, apex_predator, symbiont
    target_function VARCHAR(64), -- speed, accuracy, efficiency, creativity
    valence INTEGER, -- Bonding capacity (1-8)
    breeding_target VARCHAR(64) -- Goal for directed evolution
);

-- Add columns if table already exists (safe to run multiple times)
DO $$
BEGIN
    -- Functional evolution columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kernel_geometry' AND column_name='phi') THEN
        ALTER TABLE kernel_geometry ADD COLUMN phi DOUBLE PRECISION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kernel_geometry' AND column_name='kappa') THEN
        ALTER TABLE kernel_geometry ADD COLUMN kappa DOUBLE PRECISION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kernel_geometry' AND column_name='regime') THEN
        ALTER TABLE kernel_geometry ADD COLUMN regime VARCHAR(32);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kernel_geometry' AND column_name='generation') THEN
        ALTER TABLE kernel_geometry ADD COLUMN generation INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kernel_geometry' AND column_name='success_count') THEN
        ALTER TABLE kernel_geometry ADD COLUMN success_count INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kernel_geometry' AND column_name='failure_count') THEN
        ALTER TABLE kernel_geometry ADD COLUMN failure_count INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kernel_geometry' AND column_name='element_group') THEN
        ALTER TABLE kernel_geometry ADD COLUMN element_group VARCHAR(32);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kernel_geometry' AND column_name='ecological_niche') THEN
        ALTER TABLE kernel_geometry ADD COLUMN ecological_niche VARCHAR(32);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kernel_geometry' AND column_name='target_function') THEN
        ALTER TABLE kernel_geometry ADD COLUMN target_function VARCHAR(64);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kernel_geometry' AND column_name='valence') THEN
        ALTER TABLE kernel_geometry ADD COLUMN valence INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kernel_geometry' AND column_name='breeding_target') THEN
        ALTER TABLE kernel_geometry ADD COLUMN breeding_target VARCHAR(64);
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_kernel_geometry_domain ON kernel_geometry(domain);
CREATE INDEX IF NOT EXISTS idx_kernel_geometry_spawned_at ON kernel_geometry(spawned_at);
CREATE INDEX IF NOT EXISTS idx_kernel_geometry_phi ON kernel_geometry(phi DESC);
CREATE INDEX IF NOT EXISTS idx_kernel_geometry_element_group ON kernel_geometry(element_group);
CREATE INDEX IF NOT EXISTS idx_kernel_geometry_ecological_niche ON kernel_geometry(ecological_niche);
CREATE INDEX IF NOT EXISTS idx_kernel_geometry_generation ON kernel_geometry(generation);

-- Verify table exists
SELECT 'kernel_geometry table ready' AS status, COUNT(*) AS existing_rows FROM kernel_geometry;
