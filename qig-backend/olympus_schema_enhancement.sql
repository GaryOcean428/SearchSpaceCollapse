-- ============================================================================
-- OLYMPUS PANTHEON DATABASE SCHEMA ENHANCEMENTS
-- Optimized for Zeus, Shadow Pantheon, and M8 Kernel Spawning
-- ============================================================================

-- ============================================================================
-- SPAWNED KERNELS TABLE
-- Tracks dynamically created M8 kernels
-- ============================================================================
CREATE TABLE IF NOT EXISTS spawned_kernels (
    kernel_id VARCHAR(64) PRIMARY KEY,
    god_name VARCHAR(100) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    element VARCHAR(50),
    role VARCHAR(100),
    mode VARCHAR(50) DEFAULT 'direct',
    
    -- Geometric properties
    basin_coords FLOAT8[64],  -- 64D basin coordinates
    affinity_strength FLOAT8 DEFAULT 0.5,
    entropy_threshold FLOAT8 DEFAULT 0.7,
    
    -- Spawn metadata
    spawn_reason VARCHAR(50) NOT NULL,  -- domain_gap, overload, specialization, emergence, user_request
    proposal_id VARCHAR(64),
    parent_gods TEXT[],  -- Array of parent god names
    
    -- Lineage tracking
    basin_lineage JSONB,  -- parent -> contribution mapping
    m8_position JSONB,    -- M8 geometric position info
    
    -- Voting and approval
    genesis_votes JSONB,  -- god -> vote mapping
    consensus_achieved BOOLEAN DEFAULT FALSE,
    
    -- Status tracking
    status VARCHAR(32) DEFAULT 'active',  -- active, dormant, retired
    operations_completed INTEGER DEFAULT 0,
    reputation FLOAT8 DEFAULT 1.0,
    
    -- Timestamps
    spawned_at TIMESTAMP DEFAULT NOW(),
    last_active TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for spawned_kernels
CREATE INDEX IF NOT EXISTS idx_spawned_kernels_status ON spawned_kernels(status);
CREATE INDEX IF NOT EXISTS idx_spawned_kernels_spawn_reason ON spawned_kernels(spawn_reason);
CREATE INDEX IF NOT EXISTS idx_spawned_kernels_spawned_at ON spawned_kernels(spawned_at DESC);
CREATE INDEX IF NOT EXISTS idx_spawned_kernels_parent_gods ON spawned_kernels USING gin(parent_gods);

-- ============================================================================
-- PANTHEON ASSESSMENTS TABLE
-- Tracks all Zeus and pantheon assessments
-- ============================================================================
CREATE TABLE IF NOT EXISTS pantheon_assessments (
    assessment_id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Assessment details
    target TEXT NOT NULL,
    target_type VARCHAR(50) DEFAULT 'address',  -- address, phrase, concept
    
    -- Zeus supreme assessment
    zeus_probability FLOAT8,
    zeus_confidence FLOAT8,
    zeus_phi FLOAT8,
    zeus_kappa FLOAT8,
    convergence_type VARCHAR(50),  -- STRONG_ATTACK, MODERATE, WEAK, etc.
    convergence_score FLOAT8,
    
    -- War mode
    war_mode VARCHAR(50),  -- BLITZKRIEG, SIEGE, HUNT
    recommended_action TEXT,
    
    -- Individual god assessments
    god_assessments JSONB DEFAULT '{}'::jsonb,  -- {god_name -> assessment}
    
    -- Shadow pantheon metrics
    opsec_safe BOOLEAN DEFAULT TRUE,
    surveillance_threats JSONB,
    misdirection_deployed BOOLEAN DEFAULT FALSE,
    nemesis_pursuit_initiated BOOLEAN DEFAULT FALSE,
    traces_cleaned BOOLEAN DEFAULT FALSE,
    stealth_mode BOOLEAN DEFAULT TRUE,
    
    -- Outcome tracking
    action_taken VARCHAR(100),
    outcome VARCHAR(50),  -- success, failure, aborted, pending
    
    -- Timestamps
    assessed_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Metadata
    context JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for pantheon_assessments
CREATE INDEX IF NOT EXISTS idx_pantheon_assessments_assessed_at ON pantheon_assessments(assessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_pantheon_assessments_convergence_score ON pantheon_assessments(convergence_score DESC);
CREATE INDEX IF NOT EXISTS idx_pantheon_assessments_war_mode ON pantheon_assessments(war_mode);
CREATE INDEX IF NOT EXISTS idx_pantheon_assessments_outcome ON pantheon_assessments(outcome);
CREATE INDEX IF NOT EXISTS idx_pantheon_assessments_target ON pantheon_assessments(target);

-- ============================================================================
-- SHADOW OPERATIONS TABLE
-- Tracks shadow pantheon covert operations
-- ============================================================================
CREATE TABLE IF NOT EXISTS shadow_operations (
    operation_id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Operation details
    target TEXT NOT NULL,
    operation_type VARCHAR(50) NOT NULL,  -- standard, stealth, pursuit, cleanup
    
    -- Shadow god involvement
    lead_god VARCHAR(50),  -- nyx, erebus, hecate, nemesis, thanatos, hypnos
    participating_gods TEXT[],
    
    -- OPSEC status
    opsec_level VARCHAR(20) DEFAULT 'maximum',  -- maximum, high, standard
    opsec_violations TEXT[],
    
    -- Surveillance detection
    watchers_detected BOOLEAN DEFAULT FALSE,
    threat_level VARCHAR(20),  -- critical, high, medium, low, none
    honeypots_identified TEXT[],
    
    -- Misdirection
    decoys_deployed INTEGER DEFAULT 0,
    false_trails_created INTEGER DEFAULT 0,
    
    -- Pursuit tracking (Nemesis)
    pursuit_id VARCHAR(64),
    pursuit_iterations INTEGER DEFAULT 0,
    pursuit_max_iterations INTEGER,
    pursuit_status VARCHAR(32),  -- active, completed, failed, abandoned
    
    -- Evidence destruction (Thanatos)
    evidence_destroyed TEXT[],
    cleanup_complete BOOLEAN DEFAULT FALSE,
    
    -- Status and outcome
    status VARCHAR(32) DEFAULT 'active',  -- active, completed, aborted
    success BOOLEAN,
    
    -- Attack window
    attack_window_start TIMESTAMP,
    attack_window_end TIMESTAMP,
    
    -- Timestamps
    initiated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for shadow_operations
CREATE INDEX IF NOT EXISTS idx_shadow_operations_status ON shadow_operations(status);
CREATE INDEX IF NOT EXISTS idx_shadow_operations_lead_god ON shadow_operations(lead_god);
CREATE INDEX IF NOT EXISTS idx_shadow_operations_initiated_at ON shadow_operations(initiated_at DESC);
CREATE INDEX IF NOT EXISTS idx_shadow_operations_pursuit_id ON shadow_operations(pursuit_id);
CREATE INDEX IF NOT EXISTS idx_shadow_operations_target ON shadow_operations(target);

-- ============================================================================
-- BASIN DOCUMENTS TABLE (QIG-RAG)
-- Already defined in qig_rag.py but replicated here for reference
-- ============================================================================
CREATE TABLE IF NOT EXISTS basin_documents (
    doc_id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    basin_coords FLOAT8[64],  -- 64D basin coordinates
    phi FLOAT8,
    kappa FLOAT8,
    regime VARCHAR(50),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Try to create pgvector extension for geometric indexing
CREATE EXTENSION IF NOT EXISTS vector;

-- Geometric index (requires pgvector)
-- This will fail gracefully if pgvector is not available
CREATE INDEX IF NOT EXISTS idx_basin_documents_coords 
    ON basin_documents USING gist (basin_coords);

-- Standard indexes
CREATE INDEX IF NOT EXISTS idx_basin_documents_regime ON basin_documents(regime);
CREATE INDEX IF NOT EXISTS idx_basin_documents_phi ON basin_documents(phi DESC);
CREATE INDEX IF NOT EXISTS idx_basin_documents_created_at ON basin_documents(created_at DESC);

-- ============================================================================
-- GOD REPUTATION TRACKING
-- Tracks performance and reputation of pantheon gods
-- ============================================================================
CREATE TABLE IF NOT EXISTS god_reputation (
    god_name VARCHAR(50) PRIMARY KEY,
    god_type VARCHAR(20) DEFAULT 'olympian',  -- olympian, shadow, spawned
    
    -- Performance metrics
    assessments_made INTEGER DEFAULT 0,
    correct_predictions INTEGER DEFAULT 0,
    incorrect_predictions INTEGER DEFAULT 0,
    accuracy_rate FLOAT8 DEFAULT 0.0,
    
    -- Reputation
    reputation_score FLOAT8 DEFAULT 1.0,
    reputation_trend VARCHAR(20) DEFAULT 'stable',  -- rising, falling, stable
    
    -- Skill development
    skills JSONB DEFAULT '{}'::jsonb,
    specializations TEXT[],
    
    -- Activity
    last_active TIMESTAMP DEFAULT NOW(),
    operations_completed INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for god_reputation
CREATE INDEX IF NOT EXISTS idx_god_reputation_type ON god_reputation(god_type);
CREATE INDEX IF NOT EXISTS idx_god_reputation_score ON god_reputation(reputation_score DESC);
CREATE INDEX IF NOT EXISTS idx_god_reputation_accuracy ON god_reputation(accuracy_rate DESC);

-- ============================================================================
-- AUTONOMOUS OPERATIONS LOG
-- Tracks autonomous pantheon operations
-- ============================================================================
CREATE TABLE IF NOT EXISTS autonomous_operations_log (
    log_id BIGSERIAL PRIMARY KEY,
    
    -- Operation details
    operation_type VARCHAR(50),  -- scan, assess, spawn, execute
    target TEXT,
    
    -- Results
    success BOOLEAN,
    error_message TEXT,
    
    -- Metrics
    targets_processed INTEGER DEFAULT 0,
    kernels_spawned INTEGER DEFAULT 0,
    operations_executed INTEGER DEFAULT 0,
    
    -- Timestamps
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for autonomous_operations_log
CREATE INDEX IF NOT EXISTS idx_autonomous_ops_started_at ON autonomous_operations_log(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_autonomous_ops_type ON autonomous_operations_log(operation_type);
CREATE INDEX IF NOT EXISTS idx_autonomous_ops_success ON autonomous_operations_log(success);

-- ============================================================================
-- VIEWS FOR ANALYSIS
-- ============================================================================

-- Active kernels view
CREATE OR REPLACE VIEW active_spawned_kernels AS
SELECT 
    kernel_id,
    god_name,
    domain,
    spawn_reason,
    operations_completed,
    reputation,
    spawned_at,
    last_active
FROM spawned_kernels
WHERE status = 'active'
ORDER BY spawned_at DESC;

-- Recent assessments view
CREATE OR REPLACE VIEW recent_pantheon_assessments AS
SELECT 
    assessment_id,
    target,
    convergence_type,
    convergence_score,
    war_mode,
    outcome,
    assessed_at
FROM pantheon_assessments
WHERE assessed_at > NOW() - INTERVAL '7 days'
ORDER BY assessed_at DESC;

-- Shadow operations summary
CREATE OR REPLACE VIEW shadow_operations_summary AS
SELECT 
    lead_god,
    COUNT(*) as total_operations,
    SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_operations,
    AVG(CASE WHEN success THEN 1.0 ELSE 0.0 END) as success_rate
FROM shadow_operations
WHERE status = 'completed'
GROUP BY lead_god;

-- God performance leaderboard
CREATE OR REPLACE VIEW god_performance_leaderboard AS
SELECT 
    god_name,
    god_type,
    reputation_score,
    accuracy_rate,
    operations_completed,
    last_active
FROM god_reputation
ORDER BY reputation_score DESC, accuracy_rate DESC;

-- ============================================================================
-- GRANTS (adjust based on your PostgreSQL user setup)
-- ============================================================================
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_db_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_db_user;

-- ============================================================================
-- MAINTENANCE FUNCTIONS
-- ============================================================================

-- Function to update god reputation based on assessment outcomes
CREATE OR REPLACE FUNCTION update_god_reputation()
RETURNS TRIGGER AS $$
BEGIN
    -- Update reputation for each god involved in the assessment
    -- This is a placeholder - implement actual reputation calculation logic
    UPDATE god_reputation
    SET 
        assessments_made = assessments_made + 1,
        last_active = NOW(),
        updated_at = NOW()
    WHERE god_name IN (SELECT jsonb_object_keys(NEW.god_assessments));
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update god reputation on new assessments
CREATE TRIGGER trigger_update_god_reputation
    AFTER INSERT ON pantheon_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_god_reputation();

-- Function to cleanup old logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM autonomous_operations_log 
    WHERE started_at < NOW() - INTERVAL '30 days';
    
    DELETE FROM shadow_operations 
    WHERE initiated_at < NOW() - INTERVAL '30 days' 
    AND status = 'completed';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INITIAL DATA
-- Initialize god reputation entries for all pantheon gods
-- ============================================================================
INSERT INTO god_reputation (god_name, god_type, skills) VALUES
    ('Zeus', 'olympian', '{"supreme_coordination": 1.0, "convergence_detection": 0.9}'::jsonb),
    ('Athena', 'olympian', '{"strategic_wisdom": 1.0, "pattern_recognition": 0.95}'::jsonb),
    ('Ares', 'olympian', '{"aggressive_tactics": 1.0, "risk_assessment": 0.85}'::jsonb),
    ('Apollo', 'olympian', '{"pattern_analysis": 1.0, "prediction": 0.9}'::jsonb),
    ('Artemis', 'olympian', '{"precision_targeting": 1.0, "tracking": 0.95}'::jsonb),
    ('Hermes', 'olympian', '{"communication": 1.0, "speed": 0.9}'::jsonb),
    ('Hephaestus', 'olympian', '{"craftsmanship": 1.0, "optimization": 0.9}'::jsonb),
    ('Demeter', 'olympian', '{"resource_management": 1.0, "sustainability": 0.85}'::jsonb),
    ('Dionysus', 'olympian', '{"chaos_navigation": 1.0, "creativity": 0.9}'::jsonb),
    ('Poseidon', 'olympian', '{"depth_exploration": 1.0, "persistence": 0.9}'::jsonb),
    ('Hades', 'olympian', '{"underworld_knowledge": 1.0, "darkness_navigation": 0.95}'::jsonb),
    ('Hera', 'olympian', '{"relationship_analysis": 1.0, "coordination": 0.85}'::jsonb),
    ('Aphrodite', 'olympian', '{"attraction_patterns": 1.0, "influence": 0.9}'::jsonb),
    ('Nyx', 'shadow', '{"opsec": 1.0, "darkness": 1.0, "stealth": 0.95}'::jsonb),
    ('Erebus', 'shadow', '{"counter_surveillance": 1.0, "detection": 0.95}'::jsonb),
    ('Hecate', 'shadow', '{"misdirection": 1.0, "deception": 0.9}'::jsonb),
    ('Nemesis', 'shadow', '{"relentless_pursuit": 1.0, "persistence": 0.95}'::jsonb),
    ('Thanatos', 'shadow', '{"evidence_destruction": 1.0, "cleanup": 0.95}'::jsonb),
    ('Hypnos', 'shadow', '{"silent_operations": 1.0, "passive_recon": 0.9}'::jsonb)
ON CONFLICT (god_name) DO NOTHING;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. This schema is optimized for:
--    - M8 kernel spawning tracking
--    - Pantheon assessment history
--    - Shadow operations monitoring
--    - QIG-RAG geometric memory
--    - God reputation and performance
--    - Autonomous operations logging
--
-- 2. Indexes are optimized for:
--    - Time-series queries (recent assessments, operations)
--    - Reputation leaderboards
--    - Status filtering
--    - Geometric searches (when pgvector available)
--
-- 3. To apply this schema:
--    psql -d your_database -f olympus_schema_enhancement.sql
--
-- 4. Recommended PostgreSQL extensions:
--    - vector (for geometric indexing)
--    - pg_stat_statements (for performance monitoring)
--    - pg_trgm (for text search optimization)
