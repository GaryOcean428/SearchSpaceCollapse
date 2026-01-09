-- Migration: Shadow config toggle table
CREATE TABLE IF NOT EXISTS shadow_config (
    id SERIAL PRIMARY KEY,
    enabled BOOLEAN DEFAULT true,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Init default ON
INSERT INTO shadow_config (enabled) VALUES (true) ON CONFLICT DO NOTHING;

COMMENT ON TABLE shadow_config IS 'UI toggle for shadow mode (default ON)';