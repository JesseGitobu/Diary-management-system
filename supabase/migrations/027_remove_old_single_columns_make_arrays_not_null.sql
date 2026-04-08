-- Remove old single resource/action columns and make arrays NOT NULL
-- This completes the migration from single-column to array-based policies

-- Drop the old unique constraint that references old columns
ALTER TABLE public.access_control_policies
DROP CONSTRAINT IF EXISTS unique_farm_role_resource_action CASCADE;

-- Drop old indexes that reference the single columns
DROP INDEX IF EXISTS idx_access_control_resource;
DROP INDEX IF EXISTS idx_access_control_farm_role_resource;

-- Drop the old NOT NULL columns
ALTER TABLE public.access_control_policies
DROP COLUMN IF EXISTS resource CASCADE;

ALTER TABLE public.access_control_policies
DROP COLUMN IF EXISTS action CASCADE;

-- Make array columns NOT NULL (they should have values)
ALTER TABLE public.access_control_policies
ALTER COLUMN resources SET NOT NULL;

ALTER TABLE public.access_control_policies
ALTER COLUMN actions SET NOT NULL;

-- Note: unique_farm_role_resource_action_arrays already created in migration 026

-- Add composite index for efficient queries with arrays
CREATE INDEX IF NOT EXISTS idx_access_control_farm_role_resources_actions 
ON public.access_control_policies USING BTREE (farm_id, role_type)
INCLUDE (name, resources, actions, is_granted);

-- Add comment explaining the change
COMMENT ON TABLE public.access_control_policies IS 'Stores role-based access control policies with array-based resources and actions for efficient multi-resource, multi-action support';
