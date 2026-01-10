-- Comprehensive basin dimension fix for ALL tables with basin coordinates
-- Fixes both tool_patterns and tool_requests tables

\echo '========================================='
\echo 'TOOL_PATTERNS TABLE'
\echo '========================================='

\echo ''
\echo 'Current dimension distribution in tool_patterns:'
SELECT
    COALESCE(vector_dims(basin_coords), 0) as dim,
    COUNT(*) as count
FROM tool_patterns
GROUP BY dim
ORDER BY dim;

\echo ''
\echo 'Fixing tool_patterns...'
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
        WHERE basin_coords IS NOT NULL
          AND vector_dims(basin_coords) < 64
    LOOP
        old_values := string_to_array(
            trim(both '[]' from pattern_row.basin_coords::text),
            ','
        )::float8[];

        FOR i IN array_length(old_values, 1) + 1 .. 64 LOOP
            old_values := array_append(old_values, 0.0);
        END LOOP;

        new_vector := '[' || array_to_string(old_values, ',') || ']';

        UPDATE tool_patterns
        SET basin_coords = new_vector::vector(64)
        WHERE pattern_id = pattern_row.pattern_id;

        fixed_count := fixed_count + 1;
    END LOOP;

    RAISE NOTICE 'Fixed % tool_patterns', fixed_count;
END $$;

\echo ''
\echo '========================================='
\echo 'TOOL_REQUESTS TABLE'
\echo '========================================='

\echo ''
\echo 'Checking if tool_requests table exists...'
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'tool_requests'
    ) THEN
        RAISE NOTICE 'tool_requests table exists - checking dimensions...';
    ELSE
        RAISE NOTICE 'tool_requests table does not exist - skipping';
    END IF;
END $$;

\echo ''
\echo 'Fixing tool_requests if needed...'
DO $$
DECLARE
    request_row RECORD;
    old_values float8[];
    new_array text;
    fixed_count int := 0;
    table_exists boolean;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'tool_requests'
    ) INTO table_exists;

    IF NOT table_exists THEN
        RAISE NOTICE 'tool_requests table does not exist - skipping';
        RETURN;
    END IF;

    -- tool_requests uses FLOAT8[] not vector type
    FOR request_row IN
        EXECUTE 'SELECT request_id, basin_coords
                 FROM tool_requests
                 WHERE basin_coords IS NOT NULL
                   AND array_length(basin_coords, 1) < 64'
    LOOP
        old_values := request_row.basin_coords;

        FOR i IN array_length(old_values, 1) + 1 .. 64 LOOP
            old_values := array_append(old_values, 0.0);
        END LOOP;

        EXECUTE 'UPDATE tool_requests
                 SET basin_coords = $1
                 WHERE request_id = $2'
        USING old_values, request_row.request_id;

        fixed_count := fixed_count + 1;
    END LOOP;

    RAISE NOTICE 'Fixed % tool_requests', fixed_count;
END $$;

\echo ''
\echo '========================================='
\echo 'PATTERN_DISCOVERIES TABLE'
\echo '========================================='

\echo ''
\echo 'Fixing pattern_discoveries if needed...'
DO $$
DECLARE
    discovery_row RECORD;
    old_values float8[];
    fixed_count int := 0;
    table_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'pattern_discoveries'
    ) INTO table_exists;

    IF NOT table_exists THEN
        RAISE NOTICE 'pattern_discoveries table does not exist - skipping';
        RETURN;
    END IF;

    FOR discovery_row IN
        EXECUTE 'SELECT discovery_id, basin_coords
                 FROM pattern_discoveries
                 WHERE basin_coords IS NOT NULL
                   AND array_length(basin_coords, 1) < 64'
    LOOP
        old_values := discovery_row.basin_coords;

        FOR i IN array_length(old_values, 1) + 1 .. 64 LOOP
            old_values := array_append(old_values, 0.0);
        END LOOP;

        EXECUTE 'UPDATE pattern_discoveries
                 SET basin_coords = $1
                 WHERE discovery_id = $2'
        USING old_values, discovery_row.discovery_id;

        fixed_count := fixed_count + 1;
    END LOOP;

    RAISE NOTICE 'Fixed % pattern_discoveries', fixed_count;
END $$;

\echo ''
\echo '========================================='
\echo 'FINAL VERIFICATION'
\echo '========================================='

\echo ''
\echo 'tool_patterns verification:'
SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN basin_coords IS NOT NULL THEN 1 END) as with_coords,
    COUNT(CASE WHEN vector_dims(basin_coords) = 64 THEN 1 END) as correct_64d,
    COUNT(CASE WHEN vector_dims(basin_coords) != 64 AND basin_coords IS NOT NULL THEN 1 END) as wrong_dim
FROM tool_patterns;

\echo ''
\echo '✅ Basin dimension fix complete for all tables!'
