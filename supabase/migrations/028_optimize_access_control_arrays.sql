-- Migration 028: Optimize access_control_policies table for array-based storage
-- Purpose: Add data integrity constraints, optimize indexing, and ensure proper storage of resource/action arrays

-- Add CHECK constraints to ensure arrays are non-empty
ALTER TABLE access_control_policies
ADD CONSTRAINT check_resources_not_empty CHECK (array_length(resources, 1) > 0),
ADD CONSTRAINT check_actions_not_empty CHECK (array_length(actions, 1) > 0);

-- Ensure description can be null but other fields cannot
ALTER TABLE access_control_policies
ALTER COLUMN farm_id SET NOT NULL,
ALTER COLUMN role_type SET NOT NULL,
ALTER COLUMN name SET NOT NULL,
ALTER COLUMN resources SET NOT NULL,
ALTER COLUMN actions SET NOT NULL,
ALTER COLUMN is_granted SET NOT NULL,
ALTER COLUMN created_at SET NOT NULL,
ALTER COLUMN updated_at SET NOT NULL;

-- Drop old indexes if they exist (in case migration 026/027 didn't clean them up)
DROP INDEX IF EXISTS idx_access_control_resources_gin;
DROP INDEX IF EXISTS idx_access_control_actions_gin;
DROP INDEX IF EXISTS idx_access_control_farm_role;
DROP INDEX IF EXISTS idx_access_control_farm_name;
DROP INDEX IF EXISTS idx_access_control_created_by;
DROP INDEX IF EXISTS idx_access_control_created_at;

-- Create optimized GIN indexes for array containment queries
-- These indexes enable fast queries like: WHERE resources @> ARRAY['animals']
CREATE INDEX idx_access_control_resources_gin ON access_control_policies USING GIN (resources);
CREATE INDEX idx_access_control_actions_gin ON access_control_policies USING GIN (actions);

-- Create composite index for common query patterns
-- Used for: SELECT * FROM access_control_policies WHERE farm_id = ? AND role_type = ?
CREATE INDEX idx_access_control_farm_role ON access_control_policies (farm_id, role_type);

-- Create index on farm_id + name for uniqueness checks
CREATE INDEX idx_access_control_farm_name ON access_control_policies (farm_id, name);

-- Add unique constraint: one policy name per farm + role_type
-- This prevents duplicate policy names for the same role
-- Drop first if it exists from previous migration
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'unique_farm_role_name'
    AND table_name = 'access_control_policies'
  ) THEN
    ALTER TABLE access_control_policies DROP CONSTRAINT unique_farm_role_name;
  END IF;
END $$;

ALTER TABLE access_control_policies
ADD CONSTRAINT unique_farm_role_name UNIQUE (farm_id, role_type, name);

-- Add index on created_by for audit purposes
CREATE INDEX idx_access_control_created_by ON access_control_policies (created_by);

-- Add index on created_at for temporal queries
CREATE INDEX idx_access_control_created_at ON access_control_policies (created_at DESC);

-- Verify data integrity: all existing records should have non-empty arrays
-- This will error if any records violate the constraint (which is good for seeing issues)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM access_control_policies
    WHERE array_length(resources, 1) IS NULL OR array_length(resources, 1) = 0
  ) THEN
    RAISE EXCEPTION 'Found access_control_policies records with empty resources array. Please review data.';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM access_control_policies
    WHERE array_length(actions, 1) IS NULL OR array_length(actions, 1) = 0
  ) THEN
    RAISE EXCEPTION 'Found access_control_policies records with empty actions array. Please review data.';
  END IF;
END $$;

-- Log completion
COMMENT ON TABLE access_control_policies IS 
  'Access control policies with array-based storage. 
   - resources: array of access_resource enum values (non-empty)
   - actions: array of access_action enum values (non-empty)
   - Each record represents permissions for a role on specific resources with specific actions
   - Multiple records can exist with same name/role but different resource/action combinations';
