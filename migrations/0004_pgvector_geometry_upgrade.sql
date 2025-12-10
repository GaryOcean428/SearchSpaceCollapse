-- ============================================================================
-- MANIFOLD_PROBES PGVECTOR UPGRADE
-- Adds geometry/complexity metadata and a vector similarity index for fast lookups.
-- Idempotent: guarded with IF NOT EXISTS checks where applicable.
-- ============================================================================

BEGIN;

-- Ensure pgvector is available for similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Geometry metadata columns (optional, default to line when absent)
ALTER TABLE manifold_probes
    ADD COLUMN IF NOT EXISTS geometry_class VARCHAR(20) DEFAULT 'line',
    ADD COLUMN IF NOT EXISTS complexity FLOAT8;

-- Secondary indexes for metadata filters
CREATE INDEX IF NOT EXISTS idx_manifold_probes_geometry_class ON manifold_probes(geometry_class);
CREATE INDEX IF NOT EXISTS idx_manifold_probes_complexity ON manifold_probes(complexity);

-- Vector similarity index (HNSW). Safe to run multiple times.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'manifold_probes_coordinates_hnsw'
    ) THEN
        EXECUTE 'CREATE INDEX manifold_probes_coordinates_hnsw
                 ON manifold_probes
                 USING hnsw (coordinates vector_cosine_ops)
                 WITH (m = 16, ef_construction = 64)';
    END IF;
END$$;

COMMIT;
