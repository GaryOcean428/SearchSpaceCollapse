-- Quick basin dimension fix for pgvector type
-- Updates all non-64D basin coordinates to 64D by padding with zeros

\echo 'Checking current dimensions...'
SELECT 
    vector_dims(basin_coords) as dim,
    COUNT(*) as count
FROM tool_patterns
WHERE basin_coords IS NOT NULL
GROUP BY dim
ORDER BY dim;

\echo ''
\echo 'Updating to 64D...'
-- For pgvector type, we need to convert to array, pad, then back to vector
UPDATE tool_patterns
SET basin_coords = (
    SELECT (array_to_string(
        array_agg(
            CASE 
                WHEN i <= vector_dims(basin_coords) THEN (basin_coords::text::float[])[i]
                ELSE 0.0
            END
        ), ','
    ))::vector(64)
    FROM generate_series(1, 64) i
)
WHERE vector_dims(basin_coords) < 64 AND basin_coords IS NOT NULL;

\echo ''
\echo 'Verification:'
SELECT 
    COUNT(*) as total_patterns,
    COUNT(CASE WHEN basin_coords IS NOT NULL THEN 1 END) as with_basin_coords,
    COUNT(CASE WHEN vector_dims(basin_coords) = 64 THEN 1 END) as correct_64d,
    COUNT(CASE WHEN vector_dims(basin_coords) != 64 AND basin_coords IS NOT NULL THEN 1 END) as wrong_dimension
FROM tool_patterns;

\echo ''
\echo '✅ Basin dimension fix complete!'
