-- Refactor access_control_policies table to use ARRAY columns for resources and actions
-- This allows storing multiple resources and actions in a single policy record

-- Drop existing unique constraint since we're changing to arrays
ALTER TABLE public.access_control_policies
DROP CONSTRAINT IF EXISTS unique_farm_role_resource_action CASCADE;

-- Drop existing indexes that won't work with arrays
DROP INDEX IF EXISTS idx_access_control_resource;
DROP INDEX IF EXISTS idx_access_control_farm_role_resource;

-- Add new columns with array types
ALTER TABLE public.access_control_policies
ADD COLUMN IF NOT EXISTS resources access_resource[] DEFAULT ARRAY['animals'::access_resource];

ALTER TABLE public.access_control_policies
ADD COLUMN IF NOT EXISTS actions access_action[] DEFAULT ARRAY['view'::access_action];

-- Create indexes for array column queries
CREATE INDEX IF NOT EXISTS idx_access_control_resources_gin ON public.access_control_policies
USING GIN (resources);

CREATE INDEX IF NOT EXISTS idx_access_control_actions_gin ON public.access_control_policies
USING GIN (actions);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_access_control_farm_role_arrays ON public.access_control_policies
USING BTREE (farm_id, role_type)
INCLUDE (resources, actions);

-- Add new unique constraint on farm_id, role_type, and array contents (using generated columns)
ALTER TABLE public.access_control_policies
ADD CONSTRAINT unique_farm_role_resource_action_arrays 
UNIQUE (farm_id, role_type, resources, actions);

-- Add comment explaining array structure
COMMENT ON COLUMN public.access_control_policies.resources IS 'Array of resources this policy grants access to (e.g., [animals, health, production])';
COMMENT ON COLUMN public.access_control_policies.actions IS 'Array of actions this policy grants (e.g., [view, create, edit])';

-- Add helper function to check if a single resource/action combination is granted
CREATE OR REPLACE FUNCTION check_access_policy(
  p_farm_id UUID,
  p_role_type USER_role,
  p_resource access_resource,
  p_action access_action
) RETURNS BOOLEAN AS $$
SELECT EXISTS (
  SELECT 1
  FROM public.access_control_policies
  WHERE farm_id = p_farm_id
    AND role_type = p_role_type
    AND p_resource = ANY(resources)
    AND p_action = ANY(actions)
    AND is_granted = TRUE
);
$$ LANGUAGE SQL STABLE;

-- Add helper function to get all policies for a role
CREATE OR REPLACE FUNCTION get_role_access_policies(
  p_farm_id UUID,
  p_role_type USER_role
) RETURNS TABLE (
  policy_id UUID,
  policy_name VARCHAR,
  policy_resources access_resource[],
  policy_actions access_action[],
  policy_description TEXT
) AS $$
SELECT 
  id,
  name,
  resources,
  actions,
  description
FROM public.access_control_policies
WHERE farm_id = p_farm_id
  AND role_type = p_role_type
  AND is_granted = TRUE
ORDER BY name;
$$ LANGUAGE SQL STABLE;
