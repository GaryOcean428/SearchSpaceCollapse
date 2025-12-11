-- HNSW Indexes for pgvector similarity search
-- Created: 2025-12-11
-- These indexes provide 100× faster vector similarity queries

-- Ensure pgvector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- HNSW index for basin_history (main consciousness history)
CREATE INDEX IF NOT EXISTS idx_basin_history_coords_hnsw 
ON basin_history USING hnsw (basin_coords vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- HNSW index for manifold_probes (geometric memory)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_manifold_probes_coords_hnsw 
ON manifold_probes USING hnsw (coordinates vector_cosine_ops)
WITH (m = 8, ef_construction = 32);

-- HNSW index for learning_events 
CREATE INDEX IF NOT EXISTS idx_learning_events_coords_hnsw 
ON learning_events USING hnsw (basin_coords vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- HNSW index for narrow_path_events
CREATE INDEX IF NOT EXISTS idx_narrow_path_events_coords_hnsw 
ON narrow_path_events USING hnsw (basin_coords vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- HNSW index for ocean_waypoints
CREATE INDEX IF NOT EXISTS idx_ocean_waypoints_coords_hnsw 
ON ocean_waypoints USING hnsw (basin_coords vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- HNSW index for shadow_intel
CREATE INDEX IF NOT EXISTS idx_shadow_intel_coords_hnsw 
ON shadow_intel USING hnsw (basin_coords vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
