-- Migration: Defaults for null columns

-- agent_activity
ALTER TABLE agent_activity ALTER COLUMN agent_id SET DEFAULT 'unknown';
ALTER TABLE agent_activity ALTER COLUMN source_url SET DEFAULT '';
ALTER TABLE agent_activity ALTER COLUMN search_query SET DEFAULT '';
ALTER TABLE agent_activity ALTER COLUMN provider SET DEFAULT 'internal';
ALTER TABLE agent_activity ALTER COLUMN phi SET DEFAULT 0.5;
ALTER TABLE agent_activity ALTER COLUMN metadata SET DEFAULT '{}';

-- vocabulary_observations
ALTER TABLE vocabulary_observations ALTER COLUMN cycle_number SET DEFAULT 0;
ALTER TABLE vocabulary_observations ALTER COLUMN basin_coords SET DEFAULT NULL;
ALTER TABLE vocabulary_observations ALTER COLUMN contexts SET DEFAULT '{}';
ALTER TABLE vocabulary_observations ALTER COLUMN is_integrated SET DEFAULT false;
ALTER TABLE vocabulary_observations ALTER COLUMN phrase_category SET DEFAULT 'unknown';

-- chaos_events
ALTER TABLE chaos_events ALTER COLUMN phi SET DEFAULT 0.5;
ALTER TABLE chaos_events ALTER COLUMN phi_before SET DEFAULT 0.5;
ALTER TABLE chaos_events ALTER COLUMN phi_after SET DEFAULT 0.5;
ALTER TABLE chaos_events ALTER COLUMN success SET DEFAULT false;
ALTER TABLE chaos_events ALTER COLUMN outcome SET DEFAULT 'unknown';
ALTER TABLE chaos_events ALTER COLUMN event_data SET DEFAULT '{}';

COMMENT ON COLUMN agent_activity.agent_id IS 'Default unknown if not provided';