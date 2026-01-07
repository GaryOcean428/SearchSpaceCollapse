-- Fix basin dimension mismatch: upgrade 32D coordinates to 64D
-- This addresses the error: operands could not be broadcast together with shapes (64,) (32,)

-- First, check current dimensions
SELECT 
    pattern_id,
    array_length(basin_coords, 1) as current_dim,
    source_type,
    description
FROM tool_patterns
WHERE basin_coords IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;

-- Update all 32D basin coordinates to 64D by padding with zeros
-- This maintains the geometric structure while ensuring compatibility
UPDATE tool_patterns
SET basin_coords = array_cat(
    basin_coords,
    array_fill(0.0::float8, ARRAY[64 - array_length(basin_coords, 1)])
)
WHERE array_length(basin_coords, 1) < 64 AND basin_coords IS NOT NULL;

-- Verify all coordinates are now 64D
SELECT 
    COUNT(*) as total_patterns,
    COUNT(CASE WHEN basin_coords IS NOT NULL THEN 1 END) as with_coords,
    COUNT(CASE WHEN array_length(basin_coords, 1) = 64 THEN 1 END) as correct_dim,
    COUNT(CASE WHEN array_length(basin_coords, 1) != 64 AND basin_coords IS NOT NULL THEN 1 END) as wrong_dim
FROM tool_patterns;
