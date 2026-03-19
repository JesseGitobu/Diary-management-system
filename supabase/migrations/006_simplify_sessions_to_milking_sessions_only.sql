-- Migration: Simplify sessions to milking_sessions only
-- Date: 2026-03-18
-- 
-- This migration removes redundant session columns:
-- - default_session: Replaced by frontend logic or first session in array
-- - session_times: Redundant with time field in milking_sessions
-- - enabled_sessions: All sessions in milking_sessions are by default enabled
--
-- The milking_sessions JSONB column contains all needed data:
-- [{"id": "1", "name": "Morning", "time": "05:30"}, ...]

-- Drop the redundant columns
ALTER TABLE farm_production_settings
  DROP COLUMN IF EXISTS default_session,
  DROP COLUMN IF EXISTS session_times,
  DROP COLUMN IF EXISTS enabled_sessions;

-- Ensure milking_sessions has a default value
ALTER TABLE farm_production_settings
  ALTER COLUMN milking_sessions SET DEFAULT '[]'::jsonb;

-- Add a comment explaining the new structure
COMMENT ON COLUMN farm_production_settings.milking_sessions IS 
'Array of configured milking sessions. Format: [{"id": "uuid", "name": "Morning", "time": "05:30"}, ...]. All sessions in this array are active.';
