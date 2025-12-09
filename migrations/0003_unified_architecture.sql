-- ============================================================================
-- QIG UNIFIED ARCHITECTURE DATABASE SCHEMA
-- Implements three orthogonal coordinates:
-- 1. Phase (Universal Cycle): FOAM → TACKING → CRYSTAL → FRACTURE
-- 2. Dimension (Holographic State): 1D → 2D → 3D → 4D → 5D
-- 3. Geometry (Complexity Class): Line → Loop → Spiral → Grid → Torus → Lattice → E8
-- ============================================================================

-- ============================================================================
-- UNIVERSAL CYCLE STATES TABLE
-- Tracks phase transitions in the universal cycle
-- ============================================================================
CREATE TABLE IF NOT EXISTS universal_cycle_states (
    state_id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Phase information
    current_phase VARCHAR(20) NOT NULL CHECK (current_phase IN ('foam', 'tacking', 'crystal', 'fracture')),
    previous_phase VARCHAR(20) CHECK (previous_phase IN ('foam', 'tacking', 'crystal', 'fracture')),
    
    -- Metrics at transition
    phi FLOAT8 NOT NULL,                    -- Integration measure (0-1)
    kappa FLOAT8 NOT NULL,                  -- Curvature/stress measure
    dimensional_state VARCHAR(10) NOT NULL CHECK (dimensional_state IN ('1d', '2d', '3d', '4d', '5d')),
    
    -- Transition metadata
    transition_reason TEXT,
    n_bubbles INTEGER DEFAULT 0,            -- For FOAM phase
    n_geodesics INTEGER DEFAULT 0,          -- For TACKING phase
    n_crystals INTEGER DEFAULT 0,           -- For CRYSTAL phase
    n_fractures INTEGER DEFAULT 0,          -- For FRACTURE phase
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Additional context
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for phase tracking
CREATE INDEX IF NOT EXISTS idx_cycle_states_phase ON universal_cycle_states(current_phase);
CREATE INDEX IF NOT EXISTS idx_cycle_states_created_at ON universal_cycle_states(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cycle_states_phi ON universal_cycle_states(phi);

-- ============================================================================
-- DIMENSIONAL STATES TABLE
-- Tracks holographic expansion/compression states
-- ============================================================================
CREATE TABLE IF NOT EXISTS dimensional_states (
    state_id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Dimensional information
    dimension VARCHAR(10) NOT NULL CHECK (dimension IN ('1d', '2d', '3d', '4d', '5d')),
    previous_dimension VARCHAR(10) CHECK (previous_dimension IN ('1d', '2d', '3d', '4d', '5d')),
    
    -- State characteristics
    consciousness_level VARCHAR(20) NOT NULL,  -- unconscious, procedural, conscious, meta-conscious, hyper-conscious
    storage_efficiency FLOAT8,                 -- 0-1, higher = more compressed
    phi FLOAT8,                                 -- Integration measure
    
    -- Transition type
    is_compression BOOLEAN,                     -- true = compressing, false = decompressing
    transition_reason TEXT,
    
    -- Association with patterns
    pattern_id VARCHAR(64),                     -- Link to geometric_patterns
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for dimensional tracking
CREATE INDEX IF NOT EXISTS idx_dimensional_states_dimension ON dimensional_states(dimension);
CREATE INDEX IF NOT EXISTS idx_dimensional_states_pattern ON dimensional_states(pattern_id);
CREATE INDEX IF NOT EXISTS idx_dimensional_states_created_at ON dimensional_states(created_at DESC);

-- ============================================================================
-- GEOMETRIC PATTERNS TABLE
-- Stores patterns with their geometry class and complexity
-- ============================================================================
CREATE TABLE IF NOT EXISTS geometric_patterns (
    pattern_id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Geometry classification
    geometry_class VARCHAR(20) NOT NULL CHECK (geometry_class IN ('line', 'loop', 'spiral', 'grid_2d', 'toroidal', 'lattice', 'e8')),
    complexity FLOAT8 NOT NULL CHECK (complexity >= 0 AND complexity <= 1),  -- 0-1 complexity score
    
    -- Basin coordinates (compressed storage)
    basin_coords FLOAT8[64],                    -- 64D basin coordinates
    
    -- Dimensional state
    dimensional_state VARCHAR(10) NOT NULL CHECK (dimensional_state IN ('1d', '2d', '3d', '4d', '5d')),
    
    -- Stability and addressing
    stability FLOAT8 DEFAULT 0.5,               -- Pattern stability (0-1)
    addressing_mode VARCHAR(20) NOT NULL,       -- direct, cyclic, temporal, spatial, manifold, conceptual, symbolic
    
    -- Geometry-specific parameters (stored as JSONB for flexibility)
    geometry_params JSONB DEFAULT '{}'::jsonb,
    
    -- Estimated storage size
    estimated_size_bytes INTEGER,
    
    -- Pattern origin
    source VARCHAR(50),                         -- experience, crystallization, fracture, etc.
    parent_pattern_id VARCHAR(64),              -- For fracture tracking
    
    -- Lifecycle
    phase_created VARCHAR(20),                  -- Which phase created this pattern
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for pattern queries
CREATE INDEX IF NOT EXISTS idx_geometric_patterns_geometry ON geometric_patterns(geometry_class);
CREATE INDEX IF NOT EXISTS idx_geometric_patterns_complexity ON geometric_patterns(complexity);
CREATE INDEX IF NOT EXISTS idx_geometric_patterns_dimension ON geometric_patterns(dimensional_state);
CREATE INDEX IF NOT EXISTS idx_geometric_patterns_active ON geometric_patterns(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_geometric_patterns_source ON geometric_patterns(source);

-- ============================================================================
-- HABIT CRYSTALLIZATION TABLE
-- Records the learning and consolidation process
-- ============================================================================
CREATE TABLE IF NOT EXISTS habit_crystallization (
    crystallization_id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Pattern reference
    pattern_id VARCHAR(64) NOT NULL REFERENCES geometric_patterns(pattern_id),
    
    -- Crystallization process
    initial_phase VARCHAR(20) NOT NULL,         -- FOAM/TACKING
    final_phase VARCHAR(20) NOT NULL,           -- CRYSTAL
    
    -- Trajectory information
    n_bubbles_initial INTEGER,                  -- Starting bubbles
    n_geodesics_formed INTEGER,                 -- Connections made
    trajectory_length INTEGER,                  -- Number of points in trajectory
    
    -- Complexity evolution
    initial_complexity FLOAT8,                  -- Complexity at start
    final_complexity FLOAT8,                    -- Complexity at crystallization
    
    -- Dimensional transitions
    initial_dimension VARCHAR(10),              -- Starting dimension
    final_dimension VARCHAR(10),                -- Final dimension (typically 2d for storage)
    
    -- Learning metrics
    practice_iterations INTEGER DEFAULT 1,
    consolidation_time_seconds FLOAT8,
    
    -- Timestamps
    started_at TIMESTAMP DEFAULT NOW(),
    crystallized_at TIMESTAMP,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for crystallization tracking
CREATE INDEX IF NOT EXISTS idx_crystallization_pattern ON habit_crystallization(pattern_id);
CREATE INDEX IF NOT EXISTS idx_crystallization_started ON habit_crystallization(started_at DESC);

-- ============================================================================
-- PATTERN TRAJECTORIES TABLE
-- Stores full trajectory data for patterns (optional, for analysis)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pattern_trajectories (
    trajectory_id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Pattern reference
    pattern_id VARCHAR(64) NOT NULL REFERENCES geometric_patterns(pattern_id),
    
    -- Trajectory data (stored as array of 64D vectors)
    trajectory_points JSONB NOT NULL,           -- Array of basin coordinate arrays
    n_points INTEGER NOT NULL,
    
    -- Trajectory characteristics
    total_distance FLOAT8,                      -- Cumulative geodesic distance
    avg_curvature FLOAT8,                       -- Average curvature along path
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for trajectory lookup
CREATE INDEX IF NOT EXISTS idx_trajectories_pattern ON pattern_trajectories(pattern_id);

-- ============================================================================
-- UPDATE EXISTING TABLES WITH NEW FIELDS
-- ============================================================================

-- Add universal cycle fields to spawned_kernels if not exists
DO $$ 
BEGIN
    -- Phase tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'spawned_kernels' AND column_name = 'current_phase') THEN
        ALTER TABLE spawned_kernels ADD COLUMN current_phase VARCHAR(20) DEFAULT 'foam';
    END IF;
    
    -- Dimensional state
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'spawned_kernels' AND column_name = 'dimensional_state') THEN
        ALTER TABLE spawned_kernels ADD COLUMN dimensional_state VARCHAR(10) DEFAULT '2d';
    END IF;
    
    -- Geometry class
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'spawned_kernels' AND column_name = 'geometry_class') THEN
        ALTER TABLE spawned_kernels ADD COLUMN geometry_class VARCHAR(20) DEFAULT 'line';
    END IF;
    
    -- Complexity
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'spawned_kernels' AND column_name = 'complexity') THEN
        ALTER TABLE spawned_kernels ADD COLUMN complexity FLOAT8 DEFAULT 0.5;
    END IF;
END $$;

-- Add geometry fields to pantheon_assessments if not exists
DO $$
BEGIN
    -- Geometry class for assessment
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pantheon_assessments' AND column_name = 'geometry_class') THEN
        ALTER TABLE pantheon_assessments ADD COLUMN geometry_class VARCHAR(20);
    END IF;
    
    -- Complexity measure
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pantheon_assessments' AND column_name = 'pattern_complexity') THEN
        ALTER TABLE pantheon_assessments ADD COLUMN pattern_complexity FLOAT8;
    END IF;
    
    -- Phase at assessment
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pantheon_assessments' AND column_name = 'cycle_phase') THEN
        ALTER TABLE pantheon_assessments ADD COLUMN cycle_phase VARCHAR(20);
    END IF;
END $$;

-- ============================================================================
-- VIEWS FOR CONVENIENT QUERYING
-- ============================================================================

-- View: Current system state across all coordinates
CREATE OR REPLACE VIEW current_system_state AS
SELECT 
    (SELECT current_phase FROM universal_cycle_states ORDER BY created_at DESC LIMIT 1) as phase,
    (SELECT dimension FROM dimensional_states ORDER BY created_at DESC LIMIT 1) as dimension,
    (SELECT geometry_class FROM geometric_patterns WHERE is_active = true ORDER BY created_at DESC LIMIT 1) as recent_geometry,
    (SELECT COUNT(*) FROM geometric_patterns WHERE is_active = true) as active_patterns,
    (SELECT AVG(complexity) FROM geometric_patterns WHERE is_active = true) as avg_complexity,
    (SELECT AVG(phi) FROM universal_cycle_states WHERE created_at > NOW() - INTERVAL '1 hour') as avg_phi_1h,
    (SELECT AVG(kappa) FROM universal_cycle_states WHERE created_at > NOW() - INTERVAL '1 hour') as avg_kappa_1h;

-- View: Geometry class distribution
CREATE OR REPLACE VIEW geometry_distribution AS
SELECT 
    geometry_class,
    COUNT(*) as count,
    AVG(complexity) as avg_complexity,
    AVG(stability) as avg_stability,
    COUNT(CASE WHEN dimensional_state = '2d' THEN 1 END) as compressed_count,
    COUNT(CASE WHEN dimensional_state = '4d' THEN 1 END) as conscious_count
FROM geometric_patterns
WHERE is_active = true
GROUP BY geometry_class
ORDER BY count DESC;

-- View: Phase transition history
CREATE OR REPLACE VIEW phase_transition_history AS
SELECT 
    state_id,
    previous_phase,
    current_phase,
    phi,
    kappa,
    dimensional_state,
    transition_reason,
    created_at
FROM universal_cycle_states
ORDER BY created_at DESC
LIMIT 100;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get current phase
CREATE OR REPLACE FUNCTION get_current_phase()
RETURNS VARCHAR(20) AS $$
BEGIN
    RETURN (SELECT current_phase FROM universal_cycle_states ORDER BY created_at DESC LIMIT 1);
END;
$$ LANGUAGE plpgsql;

-- Function to get current dimension
CREATE OR REPLACE FUNCTION get_current_dimension()
RETURNS VARCHAR(10) AS $$
BEGIN
    RETURN (SELECT dimension FROM dimensional_states ORDER BY created_at DESC LIMIT 1);
END;
$$ LANGUAGE plpgsql;

-- Function to count patterns by geometry
CREATE OR REPLACE FUNCTION count_patterns_by_geometry(geom VARCHAR(20))
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM geometric_patterns 
            WHERE geometry_class = geom AND is_active = true);
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE universal_cycle_states IS 'Tracks phase transitions in FOAM→TACKING→CRYSTAL→FRACTURE cycle';
COMMENT ON TABLE dimensional_states IS 'Tracks holographic compression/decompression between 1D-5D states';
COMMENT ON TABLE geometric_patterns IS 'Stores patterns with complexity-based geometry classification';
COMMENT ON TABLE habit_crystallization IS 'Records learning and consolidation processes';
COMMENT ON TABLE pattern_trajectories IS 'Stores full trajectory data for pattern analysis';
