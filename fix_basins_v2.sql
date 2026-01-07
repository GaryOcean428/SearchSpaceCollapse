-- Simpler basin dimension fix for pgvector
-- Check and show problematic patterns first
\echo 'Patterns with non-64D basin coordinates:'
SELECT
    pattern_id,
    vector_dims(basin_coords) as current_dim,
    LEFT(description, 60) as description
FROM tool_patterns
WHERE basin_coords IS NOT NULL
  AND vector_dims(basin_coords) != 64
ORDER BY created_at DESC
LIMIT 10;

\echo ''
\echo 'Dimension distribution:'
SELECT
    vector_dims(basin_coords) as dim,
    COUNT(*) as count
FROM tool_patterns
WHERE basin_coords IS NOT NULL
GROUP BY dim
ORDER BY dim;

\echo ''
\echo 'Fixing 32D patterns by recreating as 64D vectors...'

-- For each 32D pattern, extract values and rebuild as 64D
DO $$
DECLARE
    pattern_row RECORD;
    old_values float8[];
    new_vector text;
    fixed_count int := 0;
BEGIN
    FOR pattern_row IN
        SELECT pattern_id, basin_coords
        FROM tool_patterns
        WHERE vector_dims(basin_coords) = 32
    LOOP
        -- Convert vector to array, pad to 64 elements
        old_values := string_to_array(
            trim(both '[]' from basin_coords::text),
            ','
        )::float8[];

        -- Pad with zeros to 64 dimensions
        FOR i IN array_length(old_values, 1) + 1 .. 64 LOOP
            old_values := array_append(old_values, 0.0);
        END LOOP;

        -- Create new 64D vector
        new_vector := '[' || array_to_string(old_values, ',') || ']';

        -- Update the pattern
        UPDATE tool_patterns
        SET basin_coords = new_vector::vector(64)
        WHERE pattern_id = pattern_row.pattern_id;

        fixed_count := fixed_count + 1;
    END LOOP;

    RAISE NOTICE 'Fixed % patterns', fixed_count;
END $$;

\echo ''
\echo 'Verification:'
SELECT
    COUNT(*) as total_patterns,
    COUNT(CASE WHEN basin_coords IS NOT NULL THEN 1 END) as with_coords,
    COUNT(CASE WHEN vector_dims(basin_coords) = 64 THEN 1 END) as correct_64d,
    COUNT(CASE WHEN vector_dims(basin_coords) != 64 AND basin_coords IS NOT NULL THEN 1 END) as wrong_dim
FROM tool_patterns;

\echo ''
\echo '✅ Basin dimension fix complete!'
